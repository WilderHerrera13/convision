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
	"branch":        true,
}

// LaboratoryRepository is the PostgreSQL-backed implementation of domain.LaboratoryRepository.
type LaboratoryRepository struct{}

func NewLaboratoryRepository() *LaboratoryRepository {
	return &LaboratoryRepository{}
}

func (r *LaboratoryRepository) GetByID(db *gorm.DB, id uint) (*domain.Laboratory, error) {
	var l domain.Laboratory
	err := db.First(&l, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "laboratory"}
		}
		return nil, err
	}
	return &l, nil
}

func (r *LaboratoryRepository) Create(db *gorm.DB, l *domain.Laboratory) error {
	return db.Create(l).Error
}

func (r *LaboratoryRepository) Update(db *gorm.DB, l *domain.Laboratory) error {
	return db.Model(l).Updates(map[string]any{
		"name":           l.Name,
		"contact_person": l.ContactPerson,
		"email":          l.Email,
		"phone":          l.Phone,
		"address":        l.Address,
		"status":         l.Status,
		"notes":          l.Notes,
	}).Error
}

func (r *LaboratoryRepository) Delete(db *gorm.DB, id uint) error {
	// Delete associated lab orders and their status history first
	var orderIDs []uint
	db.Model(&domain.LaboratoryOrder{}).Where("laboratory_id = ?", id).Pluck("id", &orderIDs)
	if len(orderIDs) > 0 {
		db.Where("laboratory_order_id IN ?", orderIDs).Delete(&domain.LaboratoryOrderStatusEntry{})
		db.Where("laboratory_id = ?", id).Delete(&domain.LaboratoryOrder{})
	}
	return db.Delete(&domain.Laboratory{}, id).Error
}

func (r *LaboratoryRepository) GetFirstActive(db *gorm.DB) (*domain.Laboratory, error) {
	var l domain.Laboratory
	err := db.Where("status = ?", "active").Order("id ASC").First(&l).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "laboratory"}
		}
		return nil, err
	}
	return &l, nil
}

func (r *LaboratoryRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.Laboratory, int64, error) {
	var labs []*domain.Laboratory
	var total int64

	q := db.Model(&domain.Laboratory{})
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
type LaboratoryOrderRepository struct{}

func NewLaboratoryOrderRepository() *LaboratoryOrderRepository {
	return &LaboratoryOrderRepository{}
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

func (r *LaboratoryOrderRepository) GetBySaleID(db *gorm.DB, saleID uint) (*domain.LaboratoryOrder, error) {
	var o domain.LaboratoryOrder
	err := r.withRelations(db).Where("sale_id = ?", saleID).First(&o).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &o, nil
}

func (r *LaboratoryOrderRepository) GetByID(db *gorm.DB, id uint) (*domain.LaboratoryOrder, error) {
	var o domain.LaboratoryOrder
	err := r.withRelations(db).First(&o, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "laboratory_order"}
		}
		return nil, err
	}
	return &o, nil
}

func (r *LaboratoryOrderRepository) GetByOrderNumber(db *gorm.DB, number string) (*domain.LaboratoryOrder, error) {
	var o domain.LaboratoryOrder
	err := r.withRelations(db).Where("order_number = ?", number).First(&o).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "laboratory_order"}
		}
		return nil, err
	}
	return &o, nil
}

func (r *LaboratoryOrderRepository) Create(db *gorm.DB, o *domain.LaboratoryOrder) error {
	o.OrderNumber = fmt.Sprintf("TEMP-%d", time.Now().UnixNano())
	if err := db.Create(o).Error; err != nil {
		return err
	}
	o.OrderNumber = fmt.Sprintf("LAB-%04d", o.ID)
	return db.Model(o).Update("order_number", o.OrderNumber).Error
}

func (r *LaboratoryOrderRepository) Update(db *gorm.DB, o *domain.LaboratoryOrder) error {
	return db.Model(o).Updates(map[string]any{
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

func (r *LaboratoryOrderRepository) Delete(db *gorm.DB, id uint) error {
	// Delete status history first to avoid FK constraint
	db.Where("laboratory_order_id = ?", id).Delete(&domain.LaboratoryOrderStatusEntry{})
	return db.Delete(&domain.LaboratoryOrder{}, id).Error
}

func (r *LaboratoryOrderRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.LaboratoryOrder, int64, error) {
	var orders []*domain.LaboratoryOrder
	var total int64

	q := db.Model(&domain.LaboratoryOrder{})
	for k, v := range filters {
		if laboratoryOrderFilterAllowlist[k] {
			q = q.Where(k+" = ?", v)
		}
	}

	if search, ok := filters["_search"].(string); ok && search != "" {
		q = q.Where(
			"laboratory_orders.order_number ILIKE ? OR laboratory_orders.patient_id IN (SELECT id FROM patients WHERE CONCAT(first_name, ' ', last_name) ILIKE ?)",
			"%"+search+"%", "%"+search+"%",
		)
	}

	if assignedUID, ok := filters["_assigned_uid"].(string); ok && assignedUID != "" {
		uidTag := fmt.Sprintf("%%[uid:%s]%%", assignedUID)
		q = q.Where(
			"laboratory_orders.id IN (SELECT laboratory_order_id FROM laboratory_order_statuses WHERE status = 'in_quality' AND notes LIKE ?)",
			uidTag,
		)
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

func (r *LaboratoryOrderRepository) AddStatusEntry(db *gorm.DB, entry *domain.LaboratoryOrderStatusEntry) error {
	return db.Create(entry).Error
}

func (r *LaboratoryOrderRepository) Stats(db *gorm.DB) (map[string]int64, error) {
	statuses := []domain.LaboratoryOrderStatusValue{
		domain.LaboratoryOrderStatusPending,
		domain.LaboratoryOrderStatusInProcess,
		domain.LaboratoryOrderStatusSentToLab,
		domain.LaboratoryOrderStatusInTransit,
		domain.LaboratoryOrderStatusReceivedFromLab,
		domain.LaboratoryOrderStatusInQuality,
		domain.LaboratoryOrderStatusReadyForDelivery,
		domain.LaboratoryOrderStatusDelivered,
		domain.LaboratoryOrderStatusCancelled,
		domain.LaboratoryOrderStatusPortfolio,
	}

	result := map[string]int64{}
	for _, s := range statuses {
		var count int64
		db.Model(&domain.LaboratoryOrder{}).Where("status = ?", s).Count(&count)
		result[string(s)] = count
	}
	return result, nil
}

// LaboratoryOrderEvidenceRepository is the PostgreSQL-backed implementation of domain.LaboratoryOrderEvidenceRepository.
type LaboratoryOrderEvidenceRepository struct{}

func NewLaboratoryOrderEvidenceRepository() *LaboratoryOrderEvidenceRepository {
	return &LaboratoryOrderEvidenceRepository{}
}

func (r *LaboratoryOrderEvidenceRepository) Create(db *gorm.DB, e *domain.LaboratoryOrderEvidence) error {
	return db.Create(e).Error
}

func (r *LaboratoryOrderEvidenceRepository) ListByOrderID(db *gorm.DB, orderID uint, transitionType string) ([]*domain.LaboratoryOrderEvidence, error) {
	var items []*domain.LaboratoryOrderEvidence
	q := db.Preload("User").Where("laboratory_order_id = ?", orderID)
	if transitionType != "" {
		q = q.Where("transition_type = ?", transitionType)
	}
	err := q.Order("id DESC").Find(&items).Error
	return items, err
}
