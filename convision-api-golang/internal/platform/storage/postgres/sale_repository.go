package postgres

import (
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var saleFilterAllowlist = map[string]bool{
	"branch_id":      true,
	"patient_id":     true,
	"status":         true,
	"payment_status": true,
	"created_by":     true,
	"order_id":       true,
}

// SaleRepository is the PostgreSQL-backed implementation of domain.SaleRepository.
type SaleRepository struct {
	db *gorm.DB
}

// NewSaleRepository creates a new SaleRepository.
func NewSaleRepository(db *gorm.DB) *SaleRepository {
	return &SaleRepository{db: db}
}

func (r *SaleRepository) withRelations(q *gorm.DB) *gorm.DB {
	return q.
		Preload("Patient").
		Preload("CreatedByUser").
		Preload("Items").
		Preload("Items.Product").
		Preload("Payments").
		Preload("Payments.PaymentMethod").
		Preload("LensPriceAdjustments")
}

func (r *SaleRepository) GetByID(id uint) (*domain.Sale, error) {
	var s domain.Sale
	err := r.withRelations(r.db).First(&s, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "sale"}
		}
		return nil, err
	}
	return &s, nil
}

func (r *SaleRepository) GetBySaleNumber(number string) (*domain.Sale, error) {
	var s domain.Sale
	err := r.withRelations(r.db).Where("sale_number = ?", number).First(&s).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "sale"}
		}
		return nil, err
	}
	return &s, nil
}

func (r *SaleRepository) Create(s *domain.Sale) error {
	// Use a temporary unique placeholder to satisfy NOT NULL + uniqueIndex
	s.SaleNumber = fmt.Sprintf("TEMP-%d", time.Now().UnixNano())
	if err := r.db.Create(s).Error; err != nil {
		return err
	}
	// Now set the real number using the generated ID
	s.SaleNumber = fmt.Sprintf("VTA-%04d", s.ID)
	return r.db.Model(s).Update("sale_number", s.SaleNumber).Error
}

func (r *SaleRepository) Update(s *domain.Sale) error {
	return r.db.Model(s).Updates(map[string]any{
		"patient_id":     s.PatientID,
		"order_id":       s.OrderID,
		"appointment_id": s.AppointmentID,
		"subtotal":       s.Subtotal,
		"tax":            s.Tax,
		"discount":       s.Discount,
		"total":          s.Total,
		"amount_paid":    s.AmountPaid,
		"balance":        s.Balance,
		"status":         s.Status,
		"payment_status": s.PaymentStatus,
		"notes":          s.Notes,
	}).Error
}

func (r *SaleRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Sale{}, id).Error
}

func (r *SaleRepository) List(filters map[string]any, page, perPage int) ([]*domain.Sale, int64, error) {
	var sales []*domain.Sale
	var total int64

	q := r.db.Model(&domain.Sale{})
	for field, value := range filters {
		if field == "branch_id" {
			q = q.Where("sales.branch_id = ?", value)
			continue
		}
		if !saleFilterAllowlist[field] {
			continue
		}
		q = q.Where("sales."+field+" = ?", value)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	err := r.withRelations(q).
		Offset(offset).
		Limit(perPage).
		Order("sales.id desc").
		Find(&sales).Error
	if err != nil {
		return nil, 0, err
	}

	return sales, total, nil
}

func (r *SaleRepository) AddPayment(payment *domain.SalePayment) error {
	return r.db.Create(payment).Error
}

func (r *SaleRepository) RemovePayment(saleID, paymentID uint) error {
	result := r.db.Where("id = ? AND sale_id = ?", paymentID, saleID).Delete(&domain.SalePayment{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return &domain.ErrNotFound{Resource: "payment"}
	}
	return nil
}

type saleStatsResult struct {
	TotalSales    int64   `json:"total_sales"`
	TotalRevenue  float64 `json:"total_revenue"`
	TotalDiscount float64 `json:"total_discount"`
}

func (r *SaleRepository) GetStats() (map[string]any, error) {
	var result saleStatsResult
	err := r.db.Model(&domain.Sale{}).
		Where("status != ?", string(domain.SaleStatusCancelled)).
		Select("COUNT(*) as total_sales, COALESCE(SUM(total), 0) as total_revenue, COALESCE(SUM(discount), 0) as total_discount").
		Scan(&result).Error
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"total_sales":    result.TotalSales,
		"total_revenue":  result.TotalRevenue,
		"total_discount": result.TotalDiscount,
	}, nil
}

func (r *SaleRepository) GetTodayStats() (map[string]any, error) {
	var result saleStatsResult
	err := r.db.Model(&domain.Sale{}).
		Where("status != ? AND DATE(created_at) = CURRENT_DATE", string(domain.SaleStatusCancelled)).
		Select("COUNT(*) as total_sales, COALESCE(SUM(total), 0) as total_revenue, COALESCE(SUM(discount), 0) as total_discount").
		Scan(&result).Error
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"total_sales":    result.TotalSales,
		"total_revenue":  result.TotalRevenue,
		"total_discount": result.TotalDiscount,
	}, nil
}
