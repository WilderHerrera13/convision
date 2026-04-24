package postgres

import (
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var saleFilterAllowlist = map[string]bool{
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

// todayStatsResult holds the extended data needed for the Today metric cards.
type todayStatsResult struct {
	TotalSales      int64   `db:"total_sales"`
	TotalRevenue    float64 `db:"total_revenue"`
	TotalDiscount   float64 `db:"total_discount"`
	TotalCollected  float64 `db:"total_collected"`
	TotalPending    float64 `db:"total_pending"`
	CountPaid       int64   `db:"count_paid"`
	CountPartial    int64   `db:"count_partial"`
	CountPending    int64   `db:"count_pending"`
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
	var result todayStatsResult
	err := r.db.Model(&domain.Sale{}).
		Where("status != ? AND DATE(created_at) = CURRENT_DATE", string(domain.SaleStatusCancelled)).
		Select(`
			COUNT(*) AS total_sales,
			COALESCE(SUM(total), 0) AS total_revenue,
			COALESCE(SUM(discount), 0) AS total_discount,
			COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END), 0) AS total_collected,
			COALESCE(SUM(CASE WHEN payment_status IN ('pending', 'partial') THEN balance ELSE 0 END), 0) AS total_pending,
			COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) AS count_paid,
			COUNT(CASE WHEN payment_status = 'partial' THEN 1 END) AS count_partial,
			COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) AS count_pending
		`).
		Scan(&result).Error
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"total_sales":     result.TotalSales,
		"total_revenue":   result.TotalRevenue,
		"total_discount":  result.TotalDiscount,
		"total_collected": result.TotalCollected,
		"total_pending":   result.TotalPending,
		"count_paid":      result.CountPaid,
		"count_partial":   result.CountPartial,
		"count_pending":   result.CountPending,
	}, nil
}
