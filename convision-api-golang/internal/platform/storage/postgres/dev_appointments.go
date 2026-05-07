package postgres

import (
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

func EnsureLocalDevAppointments(db *gorm.DB, logger *zap.Logger) error {
	var specialists []domain.User
	if err := db.Where("role_type = ?", domain.RoleSpecialist).Find(&specialists).Error; err != nil {
		return err
	}
	if len(specialists) == 0 {
		logger.Warn("no specialists found, skipping dev appointments seed")
		return nil
	}

	var branch domain.Branch
	if err := db.First(&branch).Error; err != nil {
		logger.Warn("no branch found, skipping dev appointments seed")
		return nil
	}

	var patients []domain.Patient
	if err := db.Limit(10).Find(&patients).Error; err != nil {
		return err
	}
	if len(patients) == 0 {
		patient := domain.Patient{
			FirstName:      "Paciente",
			LastName:       "Demo",
			Identification: "999999999",
			Phone:          "3000000000",
		}
		if err := db.Create(&patient).Error; err != nil {
			return err
		}
		patients = append(patients, patient)
		logger.Info("created demo patient", zap.Uint("patient_id", patient.ID))
	}

	now := time.Now()
	consultationTypes := []domain.ConsultationType{
		domain.ConsultationTypeEffective,
		domain.ConsultationTypeFormulaSale,
		domain.ConsultationTypeIneffective,
		domain.ConsultationTypeFollowUp,
		domain.ConsultationTypeWarrantyFollowUp,
	}

	var existingCount int64
	if err := db.Model(&domain.Appointment{}).
		Where("consultation_type IS NOT NULL AND consultation_type != ''").
		Count(&existingCount).Error; err != nil {
		return err
	}
	if existingCount > 0 {
		logger.Info("dev appointments with consultation_type already exist, skipping", zap.Int64("count", existingCount))
		return nil
	}

	var appointments []domain.Appointment
	for i, specialist := range specialists {
		for j, ct := range consultationTypes {
			daysBack := (i*len(consultationTypes) + j) % 14
			apptDate := now.AddDate(0, 0, -daysBack)
			patient := patients[(i+j)%len(patients)]

			appointments = append(appointments, domain.Appointment{
				BranchID:         branch.ID,
				PatientID:        patient.ID,
				SpecialistID:     &specialist.ID,
				TakenByID:        &specialist.ID,
				AppointmentDate:  &apptDate,
				ScheduledAt:      &apptDate,
				AppointmentTime:  "10:00",
				Duration:         30,
				Status:           domain.AppointmentStatusCompleted,
				ConsultationType: string(ct),
				ReportNotes:      "Reporte generado automáticamente para pruebas",
				CreatedAt:        apptDate,
				UpdatedAt:        apptDate,
			})
		}
	}

	if err := db.Create(&appointments).Error; err != nil {
		return err
	}

	logger.Info("seeded dev appointments with consultation types",
		zap.Int("specialists", len(specialists)),
		zap.Int("appointments", len(appointments)),
	)
	return nil
}
