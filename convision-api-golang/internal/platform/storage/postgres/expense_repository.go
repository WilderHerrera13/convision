package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// ExpenseRepository is the PostgreSQL-backed implementation of domain.ExpenseRepository.
type ExpenseRepository struct{}

// NewExpenseRepository creates a new ExpenseRepository.
func NewExpenseRepository() *ExpenseRepository {
	return &ExpenseRepository{}
}

func (r *ExpenseRepository) withRelations(q *gorm.DB) *gorm.DB {
	return q.
		Preload("Supplier").
		Preload("PaymentMethod").
		Preload("CreatedByUser")
}

func (r *ExpenseRepository) GetByID(db *gorm.DB, id uint) (*domain.Expense, error) {
	var e domain.Expense
	err := r.withRelations(db).First(&e, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "expense"}
		}
		return nil, err
	}
	return &e, nil
}

func (r *ExpenseRepository) Create(db *gorm.DB, e *domain.Expense) error {
	return db.Create(e).Error
}

func (r *ExpenseRepository) Update(db *gorm.DB, e *domain.Expense) error {
	return db.Model(e).Updates(map[string]any{
		"supplier_id":       e.SupplierID,
		"invoice_number":    e.InvoiceNumber,
		"concept":           e.Concept,
		"description":       e.Description,
		"expense_date":      e.ExpenseDate,
		"amount":            e.Amount,
		"payment_amount":    e.PaymentAmount,
		"balance":           e.Balance,
		"status":            e.Status,
		"tax_excluded":      e.TaxExcluded,
		"payment_method_id": e.PaymentMethodID,
		"reference":         e.Reference,
		"notes":             e.Notes,
	}).Error
}

func (r *ExpenseRepository) Delete(db *gorm.DB, id uint) error {
	return db.Delete(&domain.Expense{}, id).Error
}

func (r *ExpenseRepository) List(db *gorm.DB, f domain.ExpenseFilter) ([]*domain.Expense, int64, error) {
	f.Clamp()
	var expenses []*domain.Expense
	var total int64

	q := db.Model(&domain.Expense{})
	if f.SupplierID != nil {
		q = q.Where("supplier_id = ?", *f.SupplierID)
	}
	if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}
	if f.PaymentMethodID != nil {
		q = q.Where("payment_method_id = ?", *f.PaymentMethodID)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := r.withRelations(q).
		Order("expenses.id DESC").
		Limit(f.PerPage).Offset(f.Offset()).
		Find(&expenses).Error

	return expenses, total, err
}
