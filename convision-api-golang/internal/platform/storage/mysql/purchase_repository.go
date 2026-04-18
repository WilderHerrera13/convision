package mysql

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var purchaseFilterAllowlist = map[string]string{
	"supplier_id":    "=",
	"payment_status": "=",
}

// PurchaseRepository is the PostgreSQL-backed implementation of domain.PurchaseRepository.
type PurchaseRepository struct {
	db *gorm.DB
}

// NewPurchaseRepository creates a new PurchaseRepository.
func NewPurchaseRepository(db *gorm.DB) *PurchaseRepository {
	return &PurchaseRepository{db: db}
}

func (r *PurchaseRepository) withRelations(q *gorm.DB) *gorm.DB {
	return q.
		Preload("Supplier").
		Preload("Items").
		Preload("Payments").
		Preload("CreatedByUser")
}

func (r *PurchaseRepository) GetByID(id uint) (*domain.Purchase, error) {
	var p domain.Purchase
	err := r.withRelations(r.db).First(&p, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "purchase"}
		}
		return nil, err
	}
	return &p, nil
}

func (r *PurchaseRepository) Create(p *domain.Purchase) error {
	return r.db.Create(p).Error
}

func (r *PurchaseRepository) Update(p *domain.Purchase) error {
	return r.db.Model(p).Updates(map[string]any{
		"supplier_id":      p.SupplierID,
		"purchase_date":    p.PurchaseDate,
		"invoice_number":   p.InvoiceNumber,
		"concept":          p.Concept,
		"subtotal":         p.Subtotal,
		"tax_amount":       p.TaxAmount,
		"retention_amount": p.RetentionAmount,
		"total_amount":     p.TotalAmount,
		"payment_status":   p.PaymentStatus,
		"tax_excluded":     p.TaxExcluded,
		"notes":            p.Notes,
		"payment_due_date": p.PaymentDueDate,
	}).Error
}

func (r *PurchaseRepository) Delete(id uint) error {
	// Delete items and payments first
	r.db.Where("purchase_id = ?", id).Delete(&domain.PurchaseItem{})
	r.db.Where("purchase_id = ?", id).Delete(&domain.PurchasePayment{})
	return r.db.Delete(&domain.Purchase{}, id).Error
}

func (r *PurchaseRepository) List(filters map[string]any, page, perPage int) ([]*domain.Purchase, int64, error) {
	var purchases []*domain.Purchase
	var total int64

	q := r.db.Model(&domain.Purchase{})
	for field, value := range filters {
		op, allowed := purchaseFilterAllowlist[field]
		if !allowed {
			continue
		}
		if op == "=" {
			q = q.Where(field+" = ?", value)
		}
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	err := r.withRelations(q).
		Order("purchases.id DESC").
		Limit(perPage).Offset(offset).
		Find(&purchases).Error

	return purchases, total, err
}
