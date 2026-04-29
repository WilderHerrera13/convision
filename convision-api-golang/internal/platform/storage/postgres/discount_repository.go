package postgres

import (
	"errors"
	"strconv"
	"time"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var discountFilterAllowlist = map[string]bool{
	"status":     true,
	"product_id": true,
	"patient_id": true,
	"user_id":    true,
	"is_global":  true,
}

// DiscountRepository is the PostgreSQL-backed implementation of domain.DiscountRepository.
type DiscountRepository struct {
	db *gorm.DB
}

// NewDiscountRepository creates a new DiscountRepository.
func NewDiscountRepository(db *gorm.DB) *DiscountRepository {
	return &DiscountRepository{db: db}
}

func (r *DiscountRepository) withRelations(q *gorm.DB) *gorm.DB {
	return q.
		Preload("User").
		Preload("Approver").
		Preload("Product").
		Preload("Patient")
}

func (r *DiscountRepository) GetByID(id uint) (*domain.DiscountRequest, error) {
	var d domain.DiscountRequest
	err := r.withRelations(r.db).Where("discount_requests.deleted_at IS NULL").First(&d, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "discount_request"}
		}
		return nil, err
	}
	return &d, nil
}

func (r *DiscountRepository) GetActiveForProduct(productID uint) ([]*domain.DiscountRequest, error) {
	var discounts []*domain.DiscountRequest
	now := time.Now()
	err := r.withRelations(r.db).
		Where("discount_requests.deleted_at IS NULL").
		Where("product_id = ? AND status = ? AND (expiry_date IS NULL OR expiry_date >= ?)",
			productID, domain.DiscountRequestStatusApproved, now).
		Order("discount_percentage desc").
		Find(&discounts).Error
	return discounts, err
}

func (r *DiscountRepository) GetActiveForProductWithPatient(productID uint, patientID *uint) ([]*domain.DiscountRequest, error) {
	now := time.Now()

	q := r.withRelations(r.db).
		Where("discount_requests.deleted_at IS NULL").
		Where("status = ? AND (expiry_date IS NULL OR expiry_date >= ?)", domain.DiscountRequestStatusApproved, now).
		Where("product_id = ?", productID)

	if patientID != nil {
		pid := strconv.FormatUint(uint64(*patientID), 10)
		q = q.Where("patient_id = ? OR is_global = true", *patientID).
			Order("CASE WHEN patient_id = " + pid + " THEN 0 ELSE 1 END, discount_percentage desc")
	} else {
		q = q.Where("is_global = true").
			Order("discount_percentage desc")
	}

	var discounts []*domain.DiscountRequest
	err := q.Find(&discounts).Error
	if err != nil {
		return nil, err
	}

	if patientID != nil && hasPatientSpecific(discounts, *patientID) {
		var patientOnly []*domain.DiscountRequest
		for _, d := range discounts {
			if d.PatientID != nil && *d.PatientID == *patientID {
				patientOnly = append(patientOnly, d)
			}
		}
		return patientOnly, nil
	}

	return discounts, nil
}

func hasPatientSpecific(discounts []*domain.DiscountRequest, patientID uint) bool {
	for _, d := range discounts {
		if d.PatientID != nil && *d.PatientID == patientID {
			return true
		}
	}
	return false
}

func (r *DiscountRepository) GetBestForProduct(productID uint, patientID *uint) (*domain.DiscountRequest, error) {
	var d domain.DiscountRequest
	now := time.Now()

	q := r.db.
		Where("discount_requests.deleted_at IS NULL").
		Where("status = ? AND (expiry_date IS NULL OR expiry_date >= ?)", domain.DiscountRequestStatusApproved, now).
		Where("product_id = ?", productID)

	if patientID != nil {
		pid := strconv.FormatUint(uint64(*patientID), 10)
		q = q.Where("patient_id = ? OR patient_id IS NULL OR is_global = true", *patientID).
			Order("CASE WHEN patient_id = " + pid + " THEN 0 ELSE 1 END, discount_percentage desc")
	} else {
		q = q.Where("patient_id IS NULL").
			Order("discount_percentage desc")
	}

	err := q.First(&d).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "discount_request"}
		}
		return nil, err
	}
	return &d, nil
}

func (r *DiscountRepository) Create(d *domain.DiscountRequest) error {
	return r.db.Create(d).Error
}

func (r *DiscountRepository) Update(d *domain.DiscountRequest) error {
	return r.db.Model(d).Updates(map[string]any{
		"product_id":          d.ProductID,
		"patient_id":          d.PatientID,
		"status":              d.Status,
		"discount_percentage": d.DiscountPercentage,
		"original_price":      d.OriginalPrice,
		"discounted_price":    d.DiscountedPrice,
		"reason":              d.Reason,
		"rejection_reason":    d.RejectionReason,
		"approval_notes":      d.ApprovalNotes,
		"approved_by":         d.ApprovedBy,
		"approved_at":         d.ApprovedAt,
		"expiry_date":         d.ExpiryDate,
		"is_global":           d.IsGlobal,
	}).Error
}

func (r *DiscountRepository) Delete(id uint) error {
	now := time.Now()
	return r.db.Model(&domain.DiscountRequest{}).Where("id = ?", id).Update("deleted_at", now).Error
}

func (r *DiscountRepository) List(filters map[string]any, page, perPage int) ([]*domain.DiscountRequest, int64, error) {
	var discounts []*domain.DiscountRequest
	var total int64

	q := r.db.Model(&domain.DiscountRequest{}).Where("discount_requests.deleted_at IS NULL")
	for field, value := range filters {
		if !discountFilterAllowlist[field] {
			continue
		}
		q = q.Where("discount_requests."+field+" = ?", value)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	err := r.withRelations(q).
		Offset(offset).
		Limit(perPage).
		Order("discount_requests.id desc").
		Find(&discounts).Error
	if err != nil {
		return nil, 0, err
	}

	return discounts, total, nil
}
