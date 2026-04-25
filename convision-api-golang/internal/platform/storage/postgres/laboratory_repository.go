package postgres

import (
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var laboratoryFilterAllowlist = map[string]bool{
	"status": true,
}

var laboratoryOrderFilterAllowlist = map[string]bool{
	"patient_id":    true,
	"laboratory_id": true,
	"status":        true,
	"priority":      true,
	"created_by":    true,
	"order_id":      true,
	"sale_id":       true,
}

// LaboratoryRepository is the PostgreSQL-backed implementation of domain.LaboratoryRepository.
type LaboratoryRepository struct {
	db *gorm.DB
}

func NewLaboratoryRepository(db *gorm.DB) *LaboratoryRepository {
	return &LaboratoryRepository{db: db}
}

func (r *LaboratoryRepository) GetByID(id uint) (*domain.Laboratory, error) {
	var l domain.Laboratory
	err := r.db.First(&l, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "laboratory"}
		}
		return nil, err
	}
	return &l, nil
}

func (r *LaboratoryRepository) Create(l *domain.Laboratory) error {
	return r.db.Create(l).Error
}

func (r *LaboratoryRepository) Update(l *domain.Laboratory) error {
	return r.db.Model(l).Updates(map[string]any{
		"name":           l.Name,
		"contact_person": l.ContactPerson,
		"email":          l.Email,
		"phone":          l.Phone,
		"address":        l.Address,
		"status":         l.Status,
		"notes":          l.Notes,
	}).Error
}

func (r *LaboratoryRepository) Delete(id uint) error {
	// Delete associated lab orders and their status history first
	var orderIDs []uint
	r.db.Model(&domain.LaboratoryOrder{}).Where("laboratory_id = ?", id).Pluck("id", &orderIDs)
	if len(orderIDs) > 0 {
		r.db.Where("laboratory_order_id IN ?", orderIDs).Delete(&domain.LaboratoryOrderStatusEntry{})
		r.db.Where("laboratory_id = ?", id).Delete(&domain.LaboratoryOrder{})
	}
	return r.db.Delete(&domain.Laboratory{}, id).Error
}

func (r *LaboratoryRepository) GetFirstActive() (*domain.Laboratory, error) {
	var l domain.Laboratory
	err := r.db.Where("status = ?", "active").Order("id ASC").First(&l).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "laboratory"}
		}
		return nil, err
	}
	return &l, nil
}

func (r *LaboratoryRepository) List(filters map[string]any, page, perPage int) ([]*domain.Laboratory, int64, error) {
	var labs []*domain.Laboratory
	var total int64

	q := r.db.Model(&domain.Laboratory{})
	for k, v := range filters {
		if laboratoryFilterAllowlist[k] {
			q = q.Where(k+" = ?", v)
		}
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	err := q.Select("laboratories.*").Order("laboratories.id DESC").
		Limit(perPage).Offset(offset).Find(&labs).Error

	return labs, total, err
}

// LaboratoryOrderRepository is the PostgreSQL-backed implementation of domain.LaboratoryOrderRepository.
type LaboratoryOrderRepository struct {
	db *gorm.DB
}

func NewLaboratoryOrderRepository(db *gorm.DB) *LaboratoryOrderRepository {
	return &LaboratoryOrderRepository{db: db}
}

func (r *LaboratoryOrderRepository) withRelations(q *gorm.DB) *gorm.DB {
	return q.
		Preload("Laboratory").
		Preload("Patient").
		Preload("CreatedByUser").
		Preload("StatusHistory", func(db *gorm.DB) *gorm.DB {
			return db.Order("laboratory_order_statuses.id ASC")
		}).
		Preload("StatusHistory.User").
		Preload("Sale")
}

func (r *LaboratoryOrderRepository) GetBySaleID(saleID uint) (*domain.LaboratoryOrder, error) {
	var o domain.LaboratoryOrder
	err := r.withRelations(r.db).Where("sale_id = ?", saleID).First(&o).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &o, nil
}

func (r *LaboratoryOrderRepository) GetByID(id uint) (*domain.LaboratoryOrder, error) {
	var o domain.LaboratoryOrder
	err := r.withRelations(r.db).First(&o, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "laboratory_order"}
		}
		return nil, err
	}
	return &o, nil
}

func (r *LaboratoryOrderRepository) GetByOrderNumber(number string) (*domain.LaboratoryOrder, error) {
	var o domain.LaboratoryOrder
	err := r.withRelations(r.db).Where("order_number = ?", number).First(&o).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "laboratory_order"}
		}
		return nil, err
	}
	return &o, nil
}

func (r *LaboratoryOrderRepository) Create(o *domain.LaboratoryOrder) error {
	o.OrderNumber = fmt.Sprintf("TEMP-%d", time.Now().UnixNano())
	if err := r.db.Create(o).Error; err != nil {
		return err
	}
	o.OrderNumber = fmt.Sprintf("LAB-%04d", o.ID)
	return r.db.Model(o).Update("order_number", o.OrderNumber).Error
}

func (r *LaboratoryOrderRepository) Update(o *domain.LaboratoryOrder) error {
	return r.db.Model(o).Updates(map[string]any{
		"order_id":                  o.OrderID,
		"sale_id":                   o.SaleID,
		"laboratory_id":             o.LaboratoryID,
		"patient_id":                o.PatientID,
		"status":                    o.Status,
		"priority":                  o.Priority,
		"estimated_completion_date": o.EstimatedCompletionDate,
		"completion_date":           o.CompletionDate,
		"notes":                     o.Notes,
	}).Error
}

func (r *LaboratoryOrderRepository) Delete(id uint) error {
	// Delete status history first to avoid FK constraint
	r.db.Where("laboratory_order_id = ?", id).Delete(&domain.LaboratoryOrderStatusEntry{})
	return r.db.Delete(&domain.LaboratoryOrder{}, id).Error
}

func (r *LaboratoryOrderRepository) List(filters map[string]any, page, perPage int) ([]*domain.LaboratoryOrder, int64, error) {
	var orders []*domain.LaboratoryOrder
	var total int64

	q := r.db.Model(&domain.LaboratoryOrder{})
	for k, v := range filters {
		if laboratoryOrderFilterAllowlist[k] {
			q = q.Where(k+" = ?", v)
		}
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	err := r.withRelations(q).
		Select("laboratory_orders.*").
		Order("laboratory_orders.id DESC").
		Limit(perPage).
		Offset(offset).
		Find(&orders).Error

	return orders, total, err
}

func (r *LaboratoryOrderRepository) AddStatusEntry(entry *domain.LaboratoryOrderStatusEntry) error {
	return r.db.Create(entry).Error
}

func (r *LaboratoryOrderRepository) Stats() (map[string]int64, error) {
	statuses := []domain.LaboratoryOrderStatusValue{
		domain.LaboratoryOrderStatusPending,
		domain.LaboratoryOrderStatusInProcess,
		domain.LaboratoryOrderStatusSentToLab,
		domain.LaboratoryOrderStatusReadyForDelivery,
		domain.LaboratoryOrderStatusDelivered,
		domain.LaboratoryOrderStatusCancelled,
	}

	result := map[string]int64{}
	for _, s := range statuses {
		var count int64
		r.db.Model(&domain.LaboratoryOrder{}).Where("status = ?", s).Count(&count)
		result[string(s)] = count
	}
	return result, nil
}
