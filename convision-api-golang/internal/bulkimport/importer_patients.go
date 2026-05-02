package bulkimport

import (
	"strings"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var patientImportColumns = []string{
	"Documento", "Paciente", "Telefono", "Correo", "FechaNacimiento",
}

type patientImporter struct {
	repo   domain.PatientRepository
	logger *zap.Logger
}

func newPatientImporter(repo domain.PatientRepository, logger *zap.Logger) Importer {
	return &patientImporter{repo: repo, logger: logger}
}

func (i *patientImporter) Columns() []string { return patientImportColumns }

func (i *patientImporter) ProcessRow(db *gorm.DB, rowNum int, data map[string]string) RecordResult {
	rec := RecordResult{Row: rowNum, Data: data}

	identification := strings.TrimSpace(data["documento"])
	if identification == "" {
		rec.Status = RecordStatusError
		rec.Reason = "campo Documento vacío"
		return rec
	}

	fullName := strings.TrimSpace(data["paciente"])
	if fullName == "" {
		rec.Status = RecordStatusError
		rec.Reason = "campo Paciente vacío"
		return rec
	}

	if _, err := i.repo.GetByIdentification(db, identification); err == nil {
		rec.Status = RecordStatusSkipped
		rec.Reason = "paciente ya existe (Documento duplicado)"
		return rec
	}

	firstName, lastName := splitName(toTitleCase(fullName))
	p := &domain.Patient{
		FirstName:      firstName,
		LastName:       lastName,
		Identification: identification,
		Phone:          strings.TrimSpace(data["telefono"]),
		Email:          strings.ToLower(strings.TrimSpace(data["correo"])),
		Gender:         "other",
		Status:         "active",
	}
	if raw := strings.TrimSpace(data["fechanacimiento"]); raw != "" {
		if t := parseDate(raw); t != nil {
			p.BirthDate = t
		}
	}

	if err := i.repo.Create(db, p); err != nil {
		i.logger.Warn("bulk import: failed to create patient",
			zap.Int("row", rowNum),
			zap.String("identification", identification),
			zap.Error(err),
		)
		rec.Status = RecordStatusError
		rec.Reason = "error al crear paciente: " + err.Error()
		return rec
	}

	rec.Status = RecordStatusCreated
	return rec
}
