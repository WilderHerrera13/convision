package bulkimport

import (
	"strings"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var doctorImportColumns = []string{
	"Documento", "Nombre", "Apellido", "Correo", "Telefono",
}

type doctorImporter struct {
	repo   domain.UserRepository
	logger *zap.Logger
}

func newDoctorImporter(repo domain.UserRepository, logger *zap.Logger) Importer {
	return &doctorImporter{repo: repo, logger: logger}
}

func (i *doctorImporter) Columns() []string { return doctorImportColumns }

func (i *doctorImporter) ProcessRow(db *gorm.DB, rowNum int, data map[string]string) RecordResult {
	rec := RecordResult{Row: rowNum, Data: data}

	identification := strings.TrimSpace(data["documento"])
	if identification == "" {
		rec.Status = RecordStatusError
		rec.Reason = "campo Documento vacío"
		return rec
	}

	firstName := strings.TrimSpace(data["nombre"])
	if firstName == "" {
		rec.Status = RecordStatusError
		rec.Reason = "campo Nombre vacío"
		return rec
	}

	email := strings.ToLower(strings.TrimSpace(data["correo"]))
	if email == "" {
		rec.Status = RecordStatusError
		rec.Reason = "campo Correo vacío (requerido para acceso al sistema)"
		return rec
	}

	if _, err := i.repo.GetByEmail(db, email); err == nil {
		rec.Status = RecordStatusSkipped
		rec.Reason = "especialista ya existe (correo duplicado)"
		return rec
	}

	lastName := toTitleCase(strings.TrimSpace(data["apellido"]))
	firstName = toTitleCase(firstName)
	if lastName == "" {
		firstName, lastName = splitName(firstName)
	}

	u := &domain.User{
		Name:           firstName,
		LastName:       lastName,
		Email:          email,
		Identification: identification,
		Phone:          strings.TrimSpace(data["telefono"]),
		Role:           domain.RoleSpecialist,
		Active:         true,
		Password:       defaultTempPassword(),
	}

	if err := i.repo.Create(db, u); err != nil {
		i.logger.Warn("bulk import: failed to create specialist",
			zap.Int("row", rowNum),
			zap.String("email", email),
			zap.Error(err),
		)
		rec.Status = RecordStatusError
		rec.Reason = "error al crear especialista: " + err.Error()
		return rec
	}

	rec.Status = RecordStatusCreated
	return rec
}
