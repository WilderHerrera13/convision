package postgres

import (
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// SaleRepository is the PostgreSQL-backed implementation of domain.SaleRepository.
type SaleRepository struct{}

// NewSaleRepository creates a new SaleRepository.
func NewSaleRepository() *SaleRepository {
	return &SaleRepository{}
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

func (r *SaleRepository) GetByID(db *gorm.DB, id uint) (*domain.Sale, error) {
	var s domain.Sale
	err := r.withRelations(db).First(&s, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "sale"}
		}
		return nil, err
	}
	return &s, nil
}

func (r *SaleRepository) GetBySaleNumber(db *gorm.DB, number string) (*domain.Sale, error) {
	var s domain.Sale
	err := r.withRelations(db).Where("sale_number = ?", number).First(&s).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "sale"}
		}
		return nil, err
	}
	return &s, nil
}

func (r *SaleRepository) Create(db *gorm.DB, s *domain.Sale) error {
	// Use a temporary unique placeholder to satisfy NOT NULL + uniqueIndex
	s.SaleNumber = fmt.Sprintf("TEMP-%d", time.Now().UnixNano())
	if err := db.Create(s).Error; err != nil {
		return err
	}
	// Now set the real number using the generated ID
	s.SaleNumber = fmt.Sprintf("VTA-%04d", s.ID)
	return db.Model(s).Update("sale_number", s.SaleNumber).Error
}

func (r *SaleRepository) Update(db *gorm.DB, s *domain.Sale) error {
	return db.Model(s).Updates(map[string]any{
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

func (r *SaleRepository) Delete(db *gorm.DB, id uint) error {
	return db.Delete(&domain.Sale{}, id).Error
}

func (r *SaleRepository) List(db *gorm.DB, f domain.SaleFilter) ([]*domain.Sale, int64, error) {
	f.Clamp()
	var sales []*domain.Sale
	var total int64

	q := db.Model(&domain.Sale{})
	if f.BranchID != nil {
		q = q.Where("sales.branch_id = ?", *f.BranchID)
	}
	if f.PatientID != nil {
		q = q.Where("sales.patient_id = ?", *f.PatientID)
	}
	if f.Status != "" {
		q = q.Where("sales.status = ?", f.Status)
	}
	if f.PaymentStatus != "" {
		q = q.Where("sales.payment_status = ?", f.PaymentStatus)
	}
	if f.UserID != nil {
		q = q.Where("sales.created_by = ?", *f.UserID)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := r.withRelations(q).
		Offset(f.Offset()).
		Limit(f.PerPage).
		Order("sales.id desc").
		Find(&sales).Error
	if err != nil {
		return nil, 0, err
	}

	return sales, total, nil
}

func (r *SaleRepository) AddPayment(db *gorm.DB, payment *domain.SalePayment) error {
	return db.Create(payment).Error
}

func (r *SaleRepository) RemovePayment(db *gorm.DB, saleID, paymentID uint) error {
	result := db.Where("id = ? AND sale_id = ?", paymentID, saleID).Delete(&domain.SalePayment{})
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

func (r *SaleRepository) GetStats(db *gorm.DB) (map[string]any, error) {
	var result saleStatsResult
	err := db.Model(&domain.Sale{}).
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

func (r *SaleRepository) GetTodayStats(db *gorm.DB) (map[string]any, error) {
	var result saleStatsResult
	err := db.Model(&domain.Sale{}).
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
