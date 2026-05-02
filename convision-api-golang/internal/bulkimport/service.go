package bulkimport

import (
	"fmt"
	"mime/multipart"
	"strings"
	"time"
	"unicode"

	"github.com/xuri/excelize/v2"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// ImportType identifies which entity type is being imported.
type ImportType string

const (
	ImportTypePatients   ImportType = "patients"
	ImportTypeDoctors    ImportType = "doctors"
	ImportTypeStaffUsers ImportType = "staff-users"
	// ImportTypeScheduledAppointments is declared in importer_scheduled_appointments.go
)

// RecordStatus describes the outcome of processing one row.
type RecordStatus string

const (
	RecordStatusCreated RecordStatus = "created"
	RecordStatusSkipped RecordStatus = "skipped"
	RecordStatusError   RecordStatus = "error"
)

// RecordResult holds the processing result for a single Excel row.
type RecordResult struct {
	Row    int               `json:"row"`
	Status RecordStatus      `json:"status"`
	Data   map[string]string `json:"data"`
	Reason string            `json:"reason,omitempty"`
}

// ImportResult is the summary returned after processing an upload.
type ImportResult struct {
	ImportType ImportType     `json:"import_type"`
	TotalRows  int            `json:"total_rows"`
	Created    int            `json:"created"`
	Skipped    int            `json:"skipped"`
	Errors     int            `json:"errors"`
	Records    []RecordResult `json:"records"`
}

// Service processes bulk Excel imports by delegating to the registered Importer
// for each ImportType. To support a new type: implement Importer and register
// it in NewService — no other changes are required.
type Service struct {
	registry Registry
	logger   *zap.Logger
}

// NewService creates a Service with all built-in importers pre-registered.
func NewService(
	patientRepo domain.PatientRepository,
	userRepo domain.UserRepository,
	branchRepo domain.BranchRepository,
	appointmentRepo domain.AppointmentRepository,
	productRepo domain.ProductRepository,
	lensTypeRepo domain.LensTypeRepository,
	brandRepo domain.BrandRepository,
	materialRepo domain.MaterialRepository,
	lensClassRepo domain.LensClassRepository,
	treatmentRepo domain.TreatmentRepository,
	photochromicRepo domain.PhotochromicRepository,
	supplierRepo domain.SupplierRepository,
	logger *zap.Logger,
) *Service {
	return &Service{
		registry: Registry{
			ImportTypePatients:              newPatientImporter(patientRepo, logger),
			ImportTypeDoctors:               newDoctorImporter(userRepo, logger),
			ImportTypeStaffUsers:            newStaffUserImporter(userRepo, branchRepo, logger),
			ImportTypeScheduledAppointments: newScheduledAppointmentsImporter(patientRepo, userRepo, appointmentRepo, logger),
			ImportTypeLenses:                newLensImporter(productRepo, lensTypeRepo, brandRepo, materialRepo, lensClassRepo, treatmentRepo, photochromicRepo, supplierRepo, logger),
		},
		logger: logger,
	}
}

// ProcessExcel parses the uploaded file and processes each row with the
// Importer registered for importType.
func (s *Service) ProcessExcel(db *gorm.DB, fh *multipart.FileHeader, importType ImportType) (*ImportResult, error) {
	importer, ok := s.registry[importType]
	if !ok {
		return nil, fmt.Errorf("tipo de importación desconocido: %q", importType)
	}

	src, err := fh.Open()
	if err != nil {
		return nil, fmt.Errorf("no se pudo abrir el archivo: %w", err)
	}
	defer src.Close()

	f, err := excelize.OpenReader(src)
	if err != nil {
		return nil, fmt.Errorf("archivo Excel inválido: %w", err)
	}
	defer f.Close()

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, fmt.Errorf("el archivo no contiene hojas")
	}

	rows, err := f.GetRows(sheets[0])
	if err != nil {
		return nil, fmt.Errorf("no se pudieron leer las filas: %w", err)
	}
	if len(rows) < 2 {
		return nil, fmt.Errorf("el archivo no contiene datos (solo encabezados o vacío)")
	}

	headers := normalizeHeaders(rows[0])
	result := &ImportResult{ImportType: importType}
	dataRows := rows[1:]
	result.TotalRows = len(dataRows)

	for i, row := range dataRows {
		rowNum := i + 2
		rowData := mapRowToHeaders(headers, row)

		sp := fmt.Sprintf("sp_row_%d", rowNum)
		db.Exec("SAVEPOINT " + sp)
		rec := importer.ProcessRow(db, rowNum, rowData)
		if rec.Status == RecordStatusError {
			db.Exec("ROLLBACK TO SAVEPOINT " + sp)
		} else {
			db.Exec("RELEASE SAVEPOINT " + sp)
		}

		result.Records = append(result.Records, rec)
		switch rec.Status {
		case RecordStatusCreated:
			result.Created++
		case RecordStatusSkipped:
			result.Skipped++
		case RecordStatusError:
			result.Errors++
		}
	}

	s.logger.Info("bulk import completed",
		zap.String("type", string(importType)),
		zap.Int("total", result.TotalRows),
		zap.Int("created", result.Created),
		zap.Int("skipped", result.Skipped),
		zap.Int("errors", result.Errors),
	)

	return result, nil
}

// RegisteredTypes returns all import types registered in this service.
func (s *Service) RegisteredTypes() []ImportType {
	types := make([]ImportType, 0, len(s.registry))
	for k := range s.registry {
		types = append(types, k)
	}
	return types
}

// normalizeHeaders lowercases all header names for case-insensitive matching.
func normalizeHeaders(row []string) []string {
	out := make([]string, len(row))
	for i, h := range row {
		out[i] = strings.ToLower(strings.TrimSpace(h))
	}
	return out
}

// mapRowToHeaders builds a map[normalizedHeader]value for a data row.
func mapRowToHeaders(headers []string, row []string) map[string]string {
	m := make(map[string]string, len(headers))
	for i, h := range headers {
		if i < len(row) {
			m[h] = row[i]
		} else {
			m[h] = ""
		}
	}
	return m
}

// splitName splits "FIRSTNAME LASTNAME..." into (firstName, lastName).
func splitName(full string) (string, string) {
	parts := strings.Fields(full)
	if len(parts) == 0 {
		return full, ""
	}
	if len(parts) == 1 {
		return parts[0], ""
	}
	mid := len(parts) / 2
	return strings.Join(parts[:mid], " "), strings.Join(parts[mid:], " ")
}

// toTitleCase converts each word to Title Case using Unicode-aware casing.
func toTitleCase(s string) string {
	words := strings.Fields(s)
	for i, w := range words {
		r := []rune(w)
		if len(r) == 0 {
			continue
		}
		for j, ch := range r {
			if j == 0 {
				r[j] = unicode.ToUpper(ch)
			} else {
				r[j] = unicode.ToLower(ch)
			}
		}
		words[i] = string(r)
	}
	return strings.Join(words, " ")
}

// parseDate tries to parse DD/MM/YYYY or YYYY-MM-DD or DD-MM-YYYY.
func parseDate(s string) *time.Time {
	formats := []string{"02/01/2006", "2006-01-02", "02-01-2006"}
	for _, f := range formats {
		if t, err := time.Parse(f, s); err == nil {
			return &t
		}
	}
	return nil
}

// defaultTempPassword returns a bcrypt hash of a fixed temp password.
func defaultTempPassword() string {
	return "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
}
