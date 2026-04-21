package postgres

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var expenseFilterAllowlist = map[string]string{
	"supplier_id":       "=",
	"status":            "=",
	"payment_method_id": "=",
}

// ExpenseRepository is the PostgreSQL-backed implementation of domain.ExpenseRepository.
type ExpenseRepository struct {
	db *gorm.DB
}

// NewExpenseRepository creates a new ExpenseRepository.
func NewExpenseRepository(db *gorm.DB) *ExpenseRepository {
	return &ExpenseRepository{db: db}
}

func (r *ExpenseRepository) withRelations(q *gorm.DB) *gorm.DB {
	return q.
		Preload("Supplier").
		Preload("PaymentMethod").
		Preload("CreatedByUser")
}

func (r *ExpenseRepository) GetByID(id uint) (*domain.Expense, error) {
	var e domain.Expense
	err := r.withRelations(r.db).First(&e, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "expense"}
		}
		return nil, err
	}
	return &e, nil
}

func (r *ExpenseRepository) Create(e *domain.Expense) error {
	return r.db.Create(e).Error
}

func (r *ExpenseRepository) Update(e *domain.Expense) error {
	return r.db.Model(e).Updates(map[string]any{
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

func (r *ExpenseRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Expense{}, id).Error
}

func (r *ExpenseRepository) List(filters map[string]any, page, perPage int) ([]*domain.Expense, int64, error) {
	var expenses []*domain.Expense
	var total int64

	q := r.db.Model(&domain.Expense{})
	for field, value := range filters {
		op, allowed := expenseFilterAllowlist[field]
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
		Order("expenses.id DESC").
		Limit(perPage).Offset(offset).
		Find(&expenses).Error

	return expenses, total, err
}
