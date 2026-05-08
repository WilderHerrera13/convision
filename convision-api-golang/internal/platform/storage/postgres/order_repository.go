package postgres

import (
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// OrderRepository is the PostgreSQL-backed implementation of domain.OrderRepository.
type OrderRepository struct{}

// NewOrderRepository creates a new OrderRepository.
func NewOrderRepository() *OrderRepository {
	return &OrderRepository{}
}

func (r *OrderRepository) withRelations(q *gorm.DB) *gorm.DB {
	return q.
		Preload("Patient").
		Preload("Laboratory").
		Preload("CreatedByUser").
		Preload("Items").
		Preload("Items.Product")
}

func (r *OrderRepository) GetByID(db *gorm.DB, id uint) (*domain.Order, error) {
	var o domain.Order
	err := r.withRelations(db).First(&o, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "order"}
		}
		return nil, err
	}
	return &o, nil
}

func (r *OrderRepository) GetByOrderNumber(db *gorm.DB, number string) (*domain.Order, error) {
	var o domain.Order
	err := r.withRelations(db).Where("order_number = ?", number).First(&o).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "order"}
		}
		return nil, err
	}
	return &o, nil
}

func (r *OrderRepository) Create(db *gorm.DB, o *domain.Order) error {
	o.OrderNumber = fmt.Sprintf("TEMP-%d", time.Now().UnixNano())
	if err := db.Create(o).Error; err != nil {
		return err
	}
	o.OrderNumber = fmt.Sprintf("ORD-%04d", o.ID)
	return db.Model(o).Update("order_number", o.OrderNumber).Error
}

func (r *OrderRepository) Update(db *gorm.DB, o *domain.Order) error {
	return db.Model(o).Updates(map[string]any{
		"patient_id":           o.PatientID,
		"appointment_id":       o.AppointmentID,
		"laboratory_id":        o.LaboratoryID,
		"subtotal":             o.Subtotal,
		"tax":                  o.Tax,
		"total":                o.Total,
		"status":               o.Status,
		"payment_status":       o.PaymentStatus,
		"notes":                o.Notes,
		"pdf_token":            o.PdfToken,
		"laboratory_pdf_token": o.LaboratoryPdfToken,
	}).Error
}

func (r *OrderRepository) Delete(db *gorm.DB, id uint) error {
	// Delete child items first to avoid FK constraint
	if err := db.Where("order_id = ?", id).Delete(&domain.OrderItem{}).Error; err != nil {
		return err
	}
	return db.Delete(&domain.Order{}, id).Error
}

func (r *OrderRepository) List(db *gorm.DB, f domain.OrderFilter) ([]*domain.Order, int64, error) {
	f.Clamp()
	var orders []*domain.Order
	var total int64

	q := db.Model(&domain.Order{})
	if f.PatientID != nil {
		q = q.Where("orders.patient_id = ?", *f.PatientID)
	}
	if f.Status != "" {
		q = q.Where("orders.status = ?", f.Status)
	}
	if f.PaymentStatus != "" {
		q = q.Where("orders.payment_status = ?", f.PaymentStatus)
	}
	if f.LaboratoryID != nil {
		q = q.Where("orders.laboratory_id = ?", *f.LaboratoryID)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := r.withRelations(q).
		Select("orders.*").
		Order("orders.id DESC").
		Limit(f.PerPage).
		Offset(f.Offset()).
		Find(&orders).Error

	return orders, total, err
}
