package bulkimport

import (
	"fmt"
	"strings"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

const ImportTypeScheduledAppointments ImportType = "scheduled-appointments"

var scheduledAppointmentsColumns = []string{
	"FechaConsulta", "Documento", "Cliente", "celular", "correo",
	"fechaNacimiento", "Sede", "Idusuario", "Usuario", "CreadoPor", "CreadoPorNombre",
}

type scheduledAppointmentsImporter struct {
	patientRepo     domain.PatientRepository
	userRepo        domain.UserRepository
	appointmentRepo domain.AppointmentRepository
	logger          *zap.Logger
}

func newScheduledAppointmentsImporter(
	patientRepo domain.PatientRepository,
	userRepo domain.UserRepository,
	appointmentRepo domain.AppointmentRepository,
	logger *zap.Logger,
) Importer {
	return &scheduledAppointmentsImporter{
		patientRepo:     patientRepo,
		userRepo:        userRepo,
		appointmentRepo: appointmentRepo,
		logger:          logger,
	}
}

func (i *scheduledAppointmentsImporter) Columns() []string { return scheduledAppointmentsColumns }

func (i *scheduledAppointmentsImporter) ProcessRow(db *gorm.DB, rowNum int, data map[string]string) RecordResult {
	rec := RecordResult{Row: rowNum, Data: data}

	appointmentDate := parseDate(strings.TrimSpace(data["fechaconsulta"]))
	if appointmentDate == nil {
		rec.Status = RecordStatusError
		rec.Reason = "campo FechaConsulta inválido o vacío"
		return rec
	}

	identification := strings.TrimSpace(data["documento"])
	if identification == "" {
		rec.Status = RecordStatusError
		rec.Reason = "campo Documento vacío"
		return rec
	}

	patient, err := i.findOrCreatePatient(db, rowNum, identification, data)
	if err != nil {
		rec.Status = RecordStatusError
		rec.Reason = "error al procesar paciente: " + err.Error()
		return rec
	}

	specialistID := i.findOrCreateSpecialist(db, rowNum, data)
	receptionistID := i.findOrCreateReceptionist(db, rowNum, data)

	exists, err := i.appointmentRepo.ExistsByPatientAndDate(db, patient.ID, specialistID, *appointmentDate)
	if err == nil && exists {
		rec.Status = RecordStatusSkipped
		rec.Reason = "consulta duplicada (mismo paciente, especialista y día)"
		return rec
	}

	appt := &domain.Appointment{
		PatientID:    patient.ID,
		SpecialistID: specialistID,
		TakenByID:    receptionistID,
		ScheduledAt:  appointmentDate,
		Status:       domain.AppointmentStatusCompleted,
	}

	if err := i.appointmentRepo.Create(db, appt); err != nil {
		i.logger.Warn("bulk import scheduled-appointments: failed to create appointment",
			zap.Int("row", rowNum),
			zap.String("identification", identification),
			zap.Error(err),
		)
		rec.Status = RecordStatusError
		rec.Reason = "error al crear consulta: " + err.Error()
		return rec
	}

	rec.Status = RecordStatusCreated
	return rec
}

func (i *scheduledAppointmentsImporter) findOrCreatePatient(db *gorm.DB, rowNum int, identification string, data map[string]string) (*domain.Patient, error) {
	if p, err := i.patientRepo.GetByIdentification(db, identification); err == nil {
		return p, nil
	}

	firstName, lastName := splitName(toTitleCase(strings.TrimSpace(data["cliente"])))
	p := &domain.Patient{
		FirstName:      firstName,
		LastName:       lastName,
		Identification: identification,
		Phone:          strings.TrimSpace(data["celular"]),
		Email:          strings.ToLower(strings.TrimSpace(data["correo"])),
		Gender:         "other",
		Status:         "active",
	}
	if raw := strings.TrimSpace(data["fechanacimiento"]); raw != "" {
		if t := parseDate(raw); t != nil {
			p.BirthDate = t
		}
	}

	if err := i.patientRepo.Create(db, p); err != nil {
		return nil, fmt.Errorf("fila %d: %w", rowNum, err)
	}
	return p, nil
}

// cleanDocumento strips Colombian thousands-separator dots from a document string.
// "1.140.882.895" → "1140882895"
func cleanDocumento(s string) string {
	return strings.ReplaceAll(strings.TrimSpace(s), ".", "")
}

func (i *scheduledAppointmentsImporter) findOrCreateSpecialist(db *gorm.DB, rowNum int, data map[string]string) *uint {
	doc := cleanDocumento(data["idusuario"])
	// "1" is the placeholder for "Usuario Externo" — no real specialist
	if doc == "" || doc == "1" {
		return nil
	}
	fullName := strings.TrimSpace(data["usuario"])
	u, err := i.findOrCreateUserByIdentification(db, rowNum, doc, fullName, domain.RoleSpecialist)
	if err != nil {
		i.logger.Warn("bulk import: could not resolve specialist",
			zap.Int("row", rowNum), zap.String("doc", doc), zap.Error(err))
		return nil
	}
	id := u.ID
	return &id
}

func (i *scheduledAppointmentsImporter) findOrCreateReceptionist(db *gorm.DB, rowNum int, data map[string]string) *uint {
	doc := cleanDocumento(data["creadopor"])
	if doc == "" {
		return nil
	}
	fullName := strings.TrimSpace(data["creadopornombre"])
	u, err := i.findOrCreateUserByIdentification(db, rowNum, doc, fullName, domain.RoleReceptionist)
	if err != nil {
		i.logger.Warn("bulk import: could not resolve receptionist",
			zap.Int("row", rowNum), zap.String("doc", doc), zap.Error(err))
		return nil
	}
	id := u.ID
	return &id
}

func (i *scheduledAppointmentsImporter) findOrCreateUserByIdentification(
	db *gorm.DB,
	rowNum int,
	identification string,
	fullName string,
	role domain.Role,
) (*domain.User, error) {
	users, _, err := i.userRepo.List(db, map[string]any{"identification": identification}, 1, 1)
	if err == nil && len(users) > 0 {
		return users[0], nil
	}

	firstName, lastName := splitName(toTitleCase(fullName))
	u := &domain.User{
		Name:           firstName,
		LastName:       lastName,
		Identification: identification,
		Email:          strings.ToLower(identification + "@placeholder.convision"),
		Password:       defaultTempPassword(),
		Role:           role,
		Active:         true,
		Phone:          "",
	}
	if err := i.userRepo.Create(db, u); err != nil {
		// Race: another row may have just created this user — retry lookup
		users2, _, err2 := i.userRepo.List(db, map[string]any{"identification": identification}, 1, 1)
		if err2 == nil && len(users2) > 0 {
			return users2[0], nil
		}
		return nil, fmt.Errorf("fila %d: %w", rowNum, err)
	}
	return u, nil
}
