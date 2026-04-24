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
		r.db.Where("laboratory_order_id IN ?", orderIDs).Delete(&domain.LaboratoryOrderEvidence{})
		r.db.Where("laboratory_order_id IN ?", orderIDs).Delete(&domain.LaboratoryOrderStatusEntry{})
		r.db.Where("laboratory_id = ?", id).Delete(&domain.LaboratoryOrder{})
	}
	return r.db.Delete(&domain.Laboratory{}, id).Error
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
		Preload("StatusHistory").
		Preload("StatusHistory.User").
		Preload("Evidence").
		Preload("Evidence.User")
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
		"drawer_number":             o.DrawerNumber,
	}).Error
}

func (r *LaboratoryOrderRepository) Delete(id uint) error {
	r.db.Where("laboratory_order_id = ?", id).Delete(&domain.LaboratoryOrderEvidence{})
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
	if v, ok := filters["search"]; ok {
		q = q.Where("laboratory_orders.order_number ILIKE ?", "%"+fmt.Sprint(v)+"%")
	}
	if _, ok := filters["overdue"]; ok {
		q = q.Where("laboratory_orders.estimated_completion_date IS NOT NULL").
			Where("laboratory_orders.estimated_completion_date < NOW()").
			Where("laboratory_orders.status NOT IN ?", []string{"delivered", "cancelled"})
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

func (r *LaboratoryOrderRepository) AddEvidence(e *domain.LaboratoryOrderEvidence) error {
	return r.db.Create(e).Error
}

func (r *LaboratoryOrderRepository) GetEvidence(orderID uint, transitionType string) ([]*domain.LaboratoryOrderEvidence, error) {
	var rows []*domain.LaboratoryOrderEvidence
	q := r.db.Where("laboratory_order_id = ?", orderID).Preload("User").Order("id DESC")
	if transitionType != "" {
		q = q.Where("transition_type = ?", transitionType)
	}
	if err := q.Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *LaboratoryOrderRepository) Stats() (map[string]int64, error) {
	statuses := []domain.LaboratoryOrderStatusValue{
		domain.LaboratoryOrderStatusPending,
		domain.LaboratoryOrderStatusInProcess,
		domain.LaboratoryOrderStatusSentToLab,
		domain.LaboratoryOrderStatusInTransit,
		domain.LaboratoryOrderStatusInQuality,
		domain.LaboratoryOrderStatusReadyForDelivery,
		domain.LaboratoryOrderStatusPortfolio,
		domain.LaboratoryOrderStatusDelivered,
		domain.LaboratoryOrderStatusCancelled,
	}

	result := map[string]int64{}
	for _, s := range statuses {
		var count int64
		r.db.Model(&domain.LaboratoryOrder{}).Where("status = ?", s).Count(&count)
		result[string(s)] = count
	}

	var totalCount int64
	r.db.Model(&domain.LaboratoryOrder{}).Count(&totalCount)
	result["total"] = totalCount

	var overdueCount int64
	r.db.Model(&domain.LaboratoryOrder{}).
		Where("estimated_completion_date IS NOT NULL").
		Where("estimated_completion_date < NOW()").
		Where("status NOT IN ?", []string{"delivered", "cancelled"}).
		Count(&overdueCount)
	result["overdue"] = overdueCount

	return result, nil
}
