package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// ServiceOrderRepository implements domain.ServiceOrderRepository using GORM/PostgreSQL.
type ServiceOrderRepository struct{}

// NewServiceOrderRepository creates a new ServiceOrderRepository.
func NewServiceOrderRepository() *ServiceOrderRepository {
	return &ServiceOrderRepository{}
}

func (r *ServiceOrderRepository) GetByID(db *gorm.DB, id uint) (*domain.ServiceOrder, error) {
	var o domain.ServiceOrder
	err := db.Preload("Supplier").Preload("CreatedByUser").
		First(&o, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "service_order"}
	}
	return &o, err
}

func (r *ServiceOrderRepository) Create(db *gorm.DB, o *domain.ServiceOrder) error {
	return db.Create(o).Error
}

func (r *ServiceOrderRepository) Update(db *gorm.DB, o *domain.ServiceOrder) error {
	return db.Model(o).Updates(map[string]any{
		"supplier_id":             o.SupplierID,
		"customer_name":           o.CustomerName,
		"customer_phone":          o.CustomerPhone,
		"customer_email":          o.CustomerEmail,
		"service_type":            o.ServiceType,
		"description":             o.Description,
		"estimated_cost":          o.EstimatedCost,
		"final_cost":              o.FinalCost,
		"estimated_delivery_date": o.EstimatedDeliveryDate,
		"actual_delivery_date":    o.ActualDeliveryDate,
		"priority":                o.Priority,
		"status":                  o.Status,
		"notes":                   o.Notes,
		"observations":            o.Observations,
	}).Error
}

func (r *ServiceOrderRepository) Delete(db *gorm.DB, id uint) error {
	return db.Delete(&domain.ServiceOrder{}, id).Error
}

func (r *ServiceOrderRepository) List(db *gorm.DB, f domain.ServiceOrderFilter) ([]*domain.ServiceOrder, int64, error) {
	f.Clamp()
	var records []*domain.ServiceOrder
	var total int64

	q := db.Model(&domain.ServiceOrder{})
	if f.PatientID != nil {
		q = q.Where("patient_id = ?", *f.PatientID)
	}
	if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}
	if f.ServiceTypeID != nil {
		q = q.Where("service_type_id = ?", *f.ServiceTypeID)
	}
	if f.UserID != nil {
		q = q.Where("created_by_user_id = ?", *f.UserID)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := q.Select("id, order_number, supplier_id, customer_name, customer_phone, service_type, status, priority, estimated_cost, final_cost, created_at, updated_at").
		Order("created_at DESC").Offset(f.Offset()).Limit(f.PerPage).Find(&records).Error
	return records, total, err
}
