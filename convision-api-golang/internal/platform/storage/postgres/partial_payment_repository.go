package postgres

import (
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// PartialPaymentRepository implements domain.PartialPaymentRepository.
type PartialPaymentRepository struct{}

// NewPartialPaymentRepository creates a new PartialPaymentRepository.
func NewPartialPaymentRepository() *PartialPaymentRepository {
	return &PartialPaymentRepository{}
}

func (r *PartialPaymentRepository) Create(db *gorm.DB, payment *domain.PartialPayment) error {
	return db.Create(payment).Error
}

func (r *PartialPaymentRepository) GetBySaleID(db *gorm.DB, saleID uint) ([]*domain.PartialPayment, error) {
	var payments []*domain.PartialPayment
	err := db.
		Preload("PaymentMethod").
		Where("sale_id = ?", saleID).
		Order("created_at desc").
		Find(&payments).Error
	return payments, err
}

func (r *PartialPaymentRepository) Delete(db *gorm.DB, saleID, paymentID uint) error {
	result := db.Where("id = ? AND sale_id = ?", paymentID, saleID).Delete(&domain.PartialPayment{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return &domain.ErrNotFound{Resource: "partial_payment"}
	}
	return nil
}
