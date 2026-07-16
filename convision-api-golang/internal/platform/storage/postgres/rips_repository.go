package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// RipsRecordRepository is the PostgreSQL-backed implementation of domain.RipsRecordRepository.
type RipsRecordRepository struct{}

// NewRipsRecordRepository creates a new RipsRecordRepository.
func NewRipsRecordRepository() *RipsRecordRepository {
	return &RipsRecordRepository{}
}

func (r *RipsRecordRepository) GetByID(db *gorm.DB, id uint) (*domain.RipsRecord, error) {
	var rec domain.RipsRecord
	err := db.First(&rec, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "rips_record"}
		}
		return nil, err
	}
	return &rec, nil
}

func (r *RipsRecordRepository) GetByClinicalRecordID(db *gorm.DB, clinicalRecordID uint) (*domain.RipsRecord, error) {
	var rec domain.RipsRecord
	err := db.Where("clinical_record_id = ?", clinicalRecordID).First(&rec).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "rips_record"}
		}
		return nil, err
	}
	return &rec, nil
}

func (r *RipsRecordRepository) Create(db *gorm.DB, rec *domain.RipsRecord) error {
	return db.Create(rec).Error
}

func (r *RipsRecordRepository) Update(db *gorm.DB, rec *domain.RipsRecord) error {
	return db.Model(rec).Updates(map[string]any{
		"invoice_number":    rec.InvoiceNumber,
		"payload":           rec.Payload,
		"status":            rec.Status,
		"transmission_mode": rec.TransmissionMode,
		"transmitted_at":    rec.TransmittedAt,
		"error_message":     rec.ErrorMessage,
	}).Error
}

func (r *RipsRecordRepository) List(db *gorm.DB, f domain.RipsRecordFilter) ([]*domain.RipsRecord, int64, error) {
	f.Clamp()
	var items []*domain.RipsRecord
	var total int64

	q := db.Model(&domain.RipsRecord{})
	if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}
	if f.PatientID != nil {
		q = q.Where("patient_id = ?", *f.PatientID)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := q.
		Select("id, clinical_record_id, appointment_id, patient_id, invoice_number, status, transmission_mode, transmitted_at, error_message, created_at, updated_at").
		Offset(f.Offset()).
		Limit(f.PerPage).
		Order("id desc").
		Find(&items).Error
	if err != nil {
		return nil, 0, err
	}
	return items, total, nil
}
