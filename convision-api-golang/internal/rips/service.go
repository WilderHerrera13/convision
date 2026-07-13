// Package rips builds the RIPS (Registro Individual de Prestación de
// Servicios de Salud, Resolución 2275/2023) JSON transaction from a signed
// ClinicalRecord and stores it, ready to be linked to a real Factura
// Electrónica de Venta (FEV) once convision-invoicing-api is operational.
//
// See docs/GAP_ANALYSIS_HISTORIA_CLINICA_JARVIS.md section 07 for the
// regulatory background and the Jarvis antipatterns this package
// deliberately avoids (fabricated patient data, hardcoded
// causaMotivoAtencion/finalidadTecnologiaSalud, diagnosis filtered to
// CIE-10 "Z" codes only).
package rips

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
	platformrips "github.com/convision/api/internal/platform/rips"
)

// Fixed catalog values used across every Consulta this package builds.
// These are not fabricated per-record — they are the correct constant
// values for Convision's actual business scope (an optometry practice
// operating in Colombia), verified against the official reference tables
// (see schema.go doc comment for sources):
const (
	countryColombia  = "170" // CodPaisResidencia / CodPaisOrigen — table País (ISO 3166-1)
	zonaUrbana       = "01"  // CodZonaTerritorialResidencia — table ZonaVersion2
	grupoConsultaExt = "01"  // GrupoServicios — "Consulta externa"
	modalidadIntramu = "01"  // ModalidadGrupoServicioTecSal — "Intramural"
	conceptoNoAplica = "05"  // ConceptoRecaudo — "No aplica"

	cupsConsultaPrimeraVez = "890207" // Consulta de primera vez por optometría
	cupsConsultaControl    = "890307" // Consulta de control o seguimiento por optometría

	finalidadDiagnostico = "15" // RIPSFinalidadConsultaVersion2 — primera vez, se establece el problema
	finalidadTratamiento = "16" // RIPSFinalidadConsultaVersion2 — control con fórmula ya definida

	// causaEnfermedadGeneral is the correct causaMotivoAtencion for routine/
	// elective optometry care (RIPSCausaExternaVersion2 = 38). Unlike
	// Jarvis's blanket hardcode across a multi-specialty IPS (where trauma/
	// accident causes legitimately apply to other services), this value is
	// genuinely always correct for Convision's scope today: an optics-only
	// practice has no accident/emergency/violence-related encounter types.
	// If Convision ever adds a structured "reason type" to Anamnesis, this
	// should become a real derivation instead of a constant.
	causaEnfermedadGeneral = "38"

	// professionalDocTypeDefault: Convision's User model has no document-type
	// field (only a free-text Identification number) — CC is overwhelmingly
	// the real-world case for a Colombian-licensed optometrist. Documented
	// simplification, not a fabricated document number.
	professionalDocTypeDefault = "CC"
)

// ConnectionFactory opens a short-lived, schema-scoped *gorm.DB (plus a
// cleanup func to release it) for a given tenant schema name. Mirrors
// bulkimport.Service's ConnectionFactory — both need a DB handle that
// outlives a single HTTP request/transaction. The concrete implementation
// (postgresplatform.NewSchemaConnection) is injected from main.go so this
// package never imports internal/platform/storage/postgres directly.
type ConnectionFactory func(schemaName string) (*gorm.DB, func(), error)

// Service builds and stores RIPS records from signed clinical encounters.
type Service struct {
	clinicalRecordRepo domain.ClinicalRecordRepository
	patientRepo        domain.PatientRepository
	userRepo           domain.UserRepository
	icd10Repo          domain.Icd10CodeRepository
	repo               domain.RipsRecordRepository
	transmitter        *platformrips.Transmitter
	connFactory        ConnectionFactory
	logger             *zap.Logger
}

// NewService creates a new rips Service.
func NewService(
	clinicalRecordRepo domain.ClinicalRecordRepository,
	patientRepo domain.PatientRepository,
	userRepo domain.UserRepository,
	icd10Repo domain.Icd10CodeRepository,
	repo domain.RipsRecordRepository,
	transmitter *platformrips.Transmitter,
	connFactory ConnectionFactory,
	logger *zap.Logger,
) *Service {
	return &Service{
		clinicalRecordRepo: clinicalRecordRepo,
		patientRepo:        patientRepo,
		userRepo:           userRepo,
		icd10Repo:          icd10Repo,
		repo:               repo,
		transmitter:        transmitter,
		connFactory:        connFactory,
		logger:             logger,
	}
}

// ListOutput is the paginated response for the admin RIPS list endpoint.
type ListOutput struct {
	Data    []*domain.RipsRecord `json:"data"`
	Total   int64                `json:"total"`
	Page    int                  `json:"page"`
	PerPage int                  `json:"per_page"`
}

// List returns RIPS records for the admin view (payload column intentionally omitted — see repository).
func (s *Service) List(db *gorm.DB, f domain.RipsRecordFilter) (*ListOutput, error) {
	f.Clamp()
	data, total, err := s.repo.List(db, f)
	if err != nil {
		return nil, err
	}
	return &ListOutput{Data: data, Total: total, Page: f.Page, PerPage: f.PerPage}, nil
}

// GetByID returns a single RIPS record (including the full payload).
func (s *Service) GetByID(db *gorm.DB, id uint) (*domain.RipsRecord, error) {
	return s.repo.GetByID(db, id)
}

// BuildForAppointment builds (or returns the existing) RIPS record for the
// signed clinical record tied to appointmentID. Idempotent: calling it twice
// for the same appointment returns the already-built record rather than
// duplicating it.
func (s *Service) BuildForAppointment(db *gorm.DB, appointmentID uint) (*domain.RipsRecord, error) {
	record, err := s.clinicalRecordRepo.GetByAppointmentID(db, appointmentID)
	if err != nil {
		return nil, err
	}
	if record.Status != "signed" {
		return nil, &domain.ErrValidation{Field: "clinical_record", Message: "RIPS solo puede construirse a partir de una historia clínica firmada"}
	}
	if record.Diagnosis == nil {
		return nil, &domain.ErrValidation{Field: "diagnosis", Message: "la historia clínica no tiene diagnóstico registrado"}
	}

	if existing, err := s.repo.GetByClinicalRecordID(db, record.ID); err == nil && existing != nil {
		return existing, nil
	}

	patient, err := s.patientRepo.GetByID(db, record.PatientID)
	if err != nil {
		return nil, err
	}

	// Re-validate the diagnosis code against the real catalog at build time
	// (defense in depth — clinicalrecord.Service already validates on save,
	// but the catalog could theoretically change between save and build).
	if _, err := s.icd10Repo.GetByCode(db, record.Diagnosis.PrimaryCode); err != nil {
		var notFound *domain.ErrNotFound
		if errors.As(err, &notFound) {
			return nil, &domain.ErrValidation{Field: "primary_code", Message: "el código CIE-10 del diagnóstico ya no existe en el catálogo: " + record.Diagnosis.PrimaryCode}
		}
		return nil, err
	}

	usuario, err := s.buildUsuario(db, patient, record)
	if err != nil {
		return nil, err
	}

	txn := Transaction{
		NumDocumentoIdObligado: providerNIT(),
		NumFactura:             nil, // linked later via AttachInvoice, once a real FEV exists
		TipoNota:               nil,
		NumNota:                nil,
		Usuarios:               []Usuario{usuario},
	}

	payloadBytes, err := json.Marshal(txn)
	if err != nil {
		return nil, fmt.Errorf("rips: failed to marshal transaction: %w", err)
	}

	ripsRecord := &domain.RipsRecord{
		ClinicalRecordID: record.ID,
		AppointmentID:    appointmentID,
		PatientID:        record.PatientID,
		Payload:          string(payloadBytes),
		Status:           domain.RipsStatusPendingInvoice,
		TransmissionMode: s.transmitter.Mode(),
	}
	if err := s.repo.Create(db, ripsRecord); err != nil {
		return nil, err
	}

	s.logger.Info("rips record built from signed clinical record",
		zap.Uint("clinical_record_id", record.ID),
		zap.Uint("appointment_id", appointmentID),
		zap.Uint("patient_id", record.PatientID),
		zap.String("primary_diagnosis", record.Diagnosis.PrimaryCode),
	)
	return ripsRecord, nil
}

// BuildForAppointmentAsync builds the RIPS record in a background goroutine,
// mirroring sale.Service's fire-and-forget invoice emission
// (go s.emitInvoiceAsync(...)) — signing a clinical record must never fail
// or block on RIPS construction.
//
// It deliberately does NOT accept the handler's request-scoped *gorm.DB:
// TenantSchema (internal/transport/http/v1/middleware/tenant_schema.go) runs
// every request inside a transaction (`globalDB.Begin()` + `SET LOCAL
// search_path`) that is committed the moment the HTTP handler returns —
// reusing that handle from a goroutine that outlives the request fails with
// "sql: transaction has already been committed or rolled back". Instead this
// takes the tenant schema name and opens its own short-lived schema-scoped
// connection via connFactory (mirrors bulkimport.Service's ConnectionFactory
// pattern), which the caller supplies from main.go
// (postgresplatform.NewSchemaConnection).
func (s *Service) BuildForAppointmentAsync(schemaName string, appointmentID uint) {
	go func() {
		if s.connFactory == nil {
			s.logger.Warn("rips: no connection factory configured, skipping async build",
				zap.Uint("appointment_id", appointmentID))
			return
		}
		db, cleanup, err := s.connFactory(schemaName)
		if err != nil {
			s.logger.Warn("rips: failed to open schema-scoped connection for async build",
				zap.Uint("appointment_id", appointmentID),
				zap.String("schema", schemaName),
				zap.Error(err))
			return
		}
		defer cleanup()

		if _, err := s.BuildForAppointment(db, appointmentID); err != nil {
			s.logger.Warn("rips: failed to build record after clinical record signed",
				zap.Uint("appointment_id", appointmentID),
				zap.Error(err))
		}
	}()
}

// AttachInvoice links a real invoice number to a RIPS record once
// convision-invoicing-api has issued a Factura Electrónica de Venta, and
// attempts transmission per the configured mode.
func (s *Service) AttachInvoice(db *gorm.DB, ripsRecordID uint, invoiceNumber string) (*domain.RipsRecord, error) {
	rec, err := s.repo.GetByID(db, ripsRecordID)
	if err != nil {
		return nil, err
	}
	rec.InvoiceNumber = &invoiceNumber

	// Patch numFactura into the stored payload so it reflects the real invoice.
	var txn Transaction
	if err := json.Unmarshal([]byte(rec.Payload), &txn); err != nil {
		return nil, fmt.Errorf("rips: failed to unmarshal stored payload: %w", err)
	}
	txn.NumFactura = &invoiceNumber
	patched, err := json.Marshal(txn)
	if err != nil {
		return nil, fmt.Errorf("rips: failed to re-marshal transaction: %w", err)
	}
	rec.Payload = string(patched)
	rec.Status = domain.RipsStatusPendingTransmission

	result, sendErr := s.transmitter.Send(invoiceNumber, patched)
	now := time.Now()
	if sendErr != nil {
		rec.Status = domain.RipsStatusError
		rec.ErrorMessage = sendErr.Error()
	} else if result.Status == "simulated_ok" {
		rec.Status = domain.RipsStatusSent
		rec.TransmittedAt = &now
		rec.ErrorMessage = ""
	}

	if err := s.repo.Update(db, rec); err != nil {
		return nil, err
	}
	return rec, nil
}

func (s *Service) buildUsuario(db *gorm.DB, patient *domain.Patient, record *domain.ClinicalRecord) (Usuario, error) {
	docType, docNumber, err := patientDocument(patient)
	if err != nil {
		return Usuario{}, err
	}

	if patient.BirthDate == nil {
		return Usuario{}, &domain.ErrValidation{Field: "birth_date", Message: "el paciente no tiene fecha de nacimiento registrada, requerida para RIPS"}
	}

	municipio := ""
	if patient.City != nil {
		municipio = patient.City.Code
	}
	if municipio == "" {
		return Usuario{}, &domain.ErrValidation{Field: "city", Message: "el paciente no tiene ciudad de residencia registrada (código DIVIPOLA requerido para RIPS)"}
	}

	isFirstVisit, err := s.isFirstSignedVisit(db, patient.ID, record.ID)
	if err != nil {
		return Usuario{}, err
	}

	consulta, err := s.buildConsulta(db, record, isFirstVisit)
	if err != nil {
		return Usuario{}, err
	}

	servicios := emptyArrays()
	servicios.Consultas = []Consulta{consulta}

	return Usuario{
		TipoDocumentoIdentificacion:  docType,
		NumDocumentoIdentificacion:   docNumber,
		TipoUsuario:                  deriveTipoUsuario(patient),
		FechaNacimiento:              patient.BirthDate.Format("2006-01-02"),
		CodSexo:                      deriveCodSexo(patient),
		CodPaisResidencia:            countryColombia,
		CodMunicipioResidencia:       municipio,
		CodZonaTerritorialResidencia: zonaUrbana,
		Incapacidad:                  "NO",
		Consecutivo:                  1,
		CodPaisOrigen:                countryColombia,
		Servicios:                    servicios,
	}, nil
}

func (s *Service) buildConsulta(db *gorm.DB, record *domain.ClinicalRecord, isFirstVisit bool) (Consulta, error) {
	diag := record.Diagnosis

	provider := strings.TrimSpace(os.Getenv("RIPS_PROVIDER_CODE"))
	if provider == "" {
		return Consulta{}, &domain.ErrValidation{Field: "rips_provider_code", Message: "RIPS_PROVIDER_CODE no está configurado (código de habilitación REPS + sede, requerido en codPrestador)"}
	}

	specialistDocType := professionalDocTypeDefault
	specialistDocNumber := ""
	if s.userRepo != nil {
		if specialist, err := s.userRepo.GetByID(db, record.SpecialistID); err == nil && specialist != nil {
			specialistDocNumber = specialist.Identification
		}
	}

	codConsulta := cupsConsultaControl
	finalidad := finalidadTratamiento
	if isFirstVisit {
		codConsulta = cupsConsultaPrimeraVez
		finalidad = finalidadDiagnostico
	}

	var related1, related2, related3 *string
	if diag.Related1Code != "" {
		related1 = &diag.Related1Code
	}
	if diag.Related2Code != "" {
		related2 = &diag.Related2Code
	}
	if diag.Related3Code != "" {
		related3 = &diag.Related3Code
	}

	return Consulta{
		CodPrestador:                     provider,
		FechaInicioAtencion:              record.UpdatedAt.Format("2006-01-02 15:04"),
		NumAutorizacion:                  nil,
		CodConsulta:                      codConsulta,
		ModalidadGrupoServicioTecSal:     modalidadIntramu,
		GrupoServicios:                   grupoConsultaExt,
		CodServicio:                      provider,
		FinalidadTecnologiaSalud:         finalidad,
		CausaMotivoAtencion:              causaEnfermedadGeneral,
		CodDiagnosticoPrincipal:          diag.PrimaryCode,
		CodDiagnosticoRelacionado1:       related1,
		CodDiagnosticoRelacionado2:       related2,
		CodDiagnosticoRelacionado3:       related3,
		TipoDiagnosticoPrincipal:         deriveTipoDiagnostico(diag.DiagnosisType),
		TipoDocIdentificacionProfesional: specialistDocType,
		NumDocIdentificacionProfesional:  specialistDocNumber,
		VrServicio:                       0,
		ConceptoRecaudo:                  conceptoNoAplica,
		ValorPagoModerador:               0,
		NumFEVPagoModerador:              nil,
		Consecutivo:                      1,
	}, nil
}

// isFirstSignedVisit reports whether recordID is the earliest signed
// ClinicalRecord on file for the patient — used to derive
// finalidadTecnologiaSalud/codConsulta from real history instead of a
// hardcoded value.
func (s *Service) isFirstSignedVisit(db *gorm.DB, patientID, recordID uint) (bool, error) {
	records, _, err := s.clinicalRecordRepo.ListSignedByPatientID(db, patientID, 1, 2)
	if err != nil {
		return false, err
	}
	if len(records) <= 1 {
		return true, nil
	}
	// records are newest-first; the current one being first-visit means it's
	// the ONLY signed record — if there is any other signed record besides
	// this one, it's a follow-up.
	for _, r := range records {
		if r.ID != recordID {
			return false, nil
		}
	}
	return true, nil
}

// patientDocument validates and returns the patient's document type/number
// against the real TipoIdPISIS catalog — returns an error instead of
// fabricating a value when data is missing or unrecognized (the Jarvis
// antipattern this deliberately avoids).
func patientDocument(patient *domain.Patient) (docType string, docNumber string, err error) {
	if patient.Identification == "" {
		return "", "", &domain.ErrValidation{Field: "identification", Message: "el paciente no tiene número de documento registrado"}
	}
	if patient.IdentificationType == nil || patient.IdentificationType.Code == "" {
		return "", "", &domain.ErrValidation{Field: "identification_type", Message: "el paciente no tiene tipo de documento registrado"}
	}
	code, err := mapIdentificationTypeToTipoIdPISIS(patient.IdentificationType.Code)
	if err != nil {
		return "", "", err
	}
	return code, patient.Identification, nil
}

// mapIdentificationTypeToTipoIdPISIS translates Convision's IdentificationType
// catalog (internal/domain/lookup.go, seeded with descriptive slugs such as
// "cedula_ciudadania") to the official TipoIdPISIS abbreviations RIPS expects
// (CC, TI, CE...). Also accepts the abbreviation directly, in case a given
// tenant's catalog is already seeded that way. Returns a validation error —
// never a fabricated code — for anything unrecognized.
func mapIdentificationTypeToTipoIdPISIS(rawCode string) (string, error) {
	normalized := strings.ToLower(strings.TrimSpace(rawCode))
	switch normalized {
	case "cedula_ciudadania", "cc":
		return "CC", nil
	case "tarjeta_identidad", "ti":
		return "TI", nil
	case "cedula_extranjeria", "ce":
		return "CE", nil
	case "pasaporte", "pa":
		return "PA", nil
	case "registro_civil", "rc":
		return "RC", nil
	case "nit", "ni":
		return "NI", nil
	case "pep", "pe":
		return "PE", nil
	}
	// Already-uppercase official abbreviation, not covered by the slugs above
	// (e.g. tenants that seed the catalog with the abbreviation directly).
	upper := strings.ToUpper(normalized)
	switch upper {
	case "CD", "CN", "NV", "AS", "MS", "SC", "PT", "DE", "SI":
		return upper, nil
	}
	return "", &domain.ErrValidation{Field: "identification_type", Message: "tipo de documento no reconocido por el catálogo TipoIdPISIS: " + rawCode}
}

// deriveTipoUsuario maps Convision's AffiliationType to RIPSTipoUsuarioVersion2.
// Defaults to "12" (Particular) — Convision's core business is private-pay
// optics, and that value is correct whenever no EPS/ARL affiliation is on file.
func deriveTipoUsuario(patient *domain.Patient) string {
	if patient.AffiliationType == nil {
		return "12"
	}
	switch strings.ToLower(strings.TrimSpace(patient.AffiliationType.Code)) {
	case "contributivo", "cotizante":
		return "01"
	case "beneficiario":
		return "02"
	case "subsidiado":
		return "04"
	case "particular":
		return "12"
	default:
		return "12"
	}
}

// deriveCodSexo maps Patient.Gender to the RIPS "Sexo" catalog.
//
// AMBIGUITY FLAGGED (see docs/GAP_ANALYSIS_HISTORIA_CLINICA_JARVIS.md,
// "Estado de implementación"): the live SISPRO reference table returns
// H/M/I (Hombre/Mujer/Indeterminado), while the MinSalud lineamientos prose
// describes M/F/I (Masculino/Femenino/Indeterminado) via an "Extra_III"
// column. This function uses M/F/I. Before a real transmission, confirm
// against the Mecanismo Único de Validación (MUV) which encoding is
// actually accepted.
func deriveCodSexo(patient *domain.Patient) string {
	switch strings.ToLower(strings.TrimSpace(patient.Gender)) {
	case "male", "m", "masculino":
		return "M"
	case "female", "f", "femenino":
		return "F"
	default:
		return "I"
	}
}

// deriveTipoDiagnostico maps Convision's Diagnosis.DiagnosisType (1/2/3) to
// RIPSTipoDiagnosticoPrincipalVersion2 — a direct, already-aligned mapping.
func deriveTipoDiagnostico(diagnosisType int) string {
	switch diagnosisType {
	case 2:
		return "02"
	case 3:
		return "03"
	default:
		return "01"
	}
}

// providerNIT returns the reporting provider's NIT (numDocumentoIdObligado).
// Configurable via env — never hardcoded per clinic.
func providerNIT() string {
	return strings.TrimSpace(os.Getenv("RIPS_PROVIDER_NIT"))
}
