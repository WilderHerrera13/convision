package expense

import (
	"math"
	"time"

	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
)

// Service handles expense use-cases.
type Service struct {
	repo   domain.ExpenseRepository
	logger *zap.Logger
}

// NewService creates a new expense Service.
func NewService(repo domain.ExpenseRepository, logger *zap.Logger) *Service {
	return &Service{repo: repo, logger: logger}
}

// CreateInput holds validated fields for creating an expense.
type CreateInput struct {
	SupplierID      *uint   `json:"supplier_id"`
	InvoiceNumber   string  `json:"invoice_number" binding:"required,max=255"`
	Concept         string  `json:"concept"        binding:"required,max=255"`
	Description     string  `json:"description"`
	ExpenseDate     string  `json:"expense_date"   binding:"required"`
	Amount          float64 `json:"amount"         binding:"required,min=0.01"`
	PaymentAmount   float64 `json:"payment_amount"`
	TaxExcluded     bool    `json:"tax_excluded"`
	PaymentMethodID *uint   `json:"payment_method_id"`
	Reference       string  `json:"reference"`
	Notes           string  `json:"notes"`
}

// UpdateInput holds fields for updating an expense.
type UpdateInput struct {
	SupplierID      *uint    `json:"supplier_id"`
	InvoiceNumber   string   `json:"invoice_number"`
	Concept         string   `json:"concept"`
	Description     string   `json:"description"`
	ExpenseDate     string   `json:"expense_date"`
	Amount          *float64 `json:"amount"`
	PaymentAmount   *float64 `json:"payment_amount"`
	TaxExcluded     *bool    `json:"tax_excluded"`
	PaymentMethodID *uint    `json:"payment_method_id"`
	Reference       string   `json:"reference"`
	Notes           string   `json:"notes"`
}

// StatsOutput holds expense summary statistics.
type StatsOutput struct {
	TotalExpenses float64 `json:"total_expenses"`
	Paid          float64 `json:"paid"`
	Pending       float64 `json:"pending"`
	Count         int64   `json:"count"`
}

// ListOutput wraps a page of expenses with pagination metadata.
type ListOutput struct {
	Data        []*domain.Expense `json:"data"`
	Total       int64             `json:"total"`
	CurrentPage int               `json:"current_page"`
	PerPage     int               `json:"per_page"`
	LastPage    int               `json:"last_page"`
}

// GetByID returns a single expense or ErrNotFound.
func (s *Service) GetByID(id uint) (*domain.Expense, error) {
	return s.repo.GetByID(id)
}

// GetStats returns aggregate expense statistics.
func (s *Service) GetStats() (*StatsOutput, error) {
	data, total, err := s.repo.List(map[string]any{}, 1, 10000)
	if err != nil {
		return nil, err
	}
	out := &StatsOutput{Count: total}
	for _, e := range data {
		out.TotalExpenses += e.Amount
		if e.Status == "paid" {
			out.Paid += e.Amount
		} else {
			out.Pending += e.Amount
		}
	}
	return out, nil
}

// List returns a paginated list of expenses.
func (s *Service) List(filters map[string]any, page, perPage int) (*ListOutput, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 15
	}
	data, total, err := s.repo.List(filters, page, perPage)
	if err != nil {
		return nil, err
	}
	lastPage := 1
	if total > 0 {
		lastPage = int(math.Ceil(float64(total) / float64(perPage)))
	}
	return &ListOutput{Data: data, Total: total, CurrentPage: page, PerPage: perPage, LastPage: lastPage}, nil
}

// Create creates a new expense.
func (s *Service) Create(input CreateInput, createdByUserID *uint) (*domain.Expense, error) {
	var expenseDate *time.Time
	if input.ExpenseDate != "" {
		t, err := time.Parse("2006-01-02", input.ExpenseDate)
		if err != nil {
			return nil, &domain.ErrValidation{Field: "expense_date", Message: "invalid date format, use YYYY-MM-DD"}
		}
		expenseDate = &t
	}

	paymentAmount := input.PaymentAmount
	balance := input.Amount - paymentAmount

	status := "pending"
	if paymentAmount >= input.Amount {
		status = "paid"
		balance = 0
	} else if paymentAmount > 0 {
		status = "partial"
	}

	e := &domain.Expense{
		SupplierID:      input.SupplierID,
		InvoiceNumber:   input.InvoiceNumber,
		Concept:         input.Concept,
		Description:     input.Description,
		ExpenseDate:     expenseDate,
		Amount:          input.Amount,
		PaymentAmount:   paymentAmount,
		Balance:         balance,
		Status:          status,
		TaxExcluded:     input.TaxExcluded,
		PaymentMethodID: input.PaymentMethodID,
		Reference:       input.Reference,
		Notes:           input.Notes,
		CreatedByUserID: createdByUserID,
	}

	if err := s.repo.Create(e); err != nil {
		return nil, err
	}
	s.logger.Info("expense created", zap.Uint("id", e.ID), zap.String("concept", e.Concept))
	return s.repo.GetByID(e.ID)
}

// Update updates an expense.
func (s *Service) Update(id uint, input UpdateInput) (*domain.Expense, error) {
	e, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if input.SupplierID != nil {
		e.SupplierID = input.SupplierID
	}
	if input.InvoiceNumber != "" {
		e.InvoiceNumber = input.InvoiceNumber
	}
	if input.Concept != "" {
		e.Concept = input.Concept
	}
	if input.Description != "" {
		e.Description = input.Description
	}
	if input.ExpenseDate != "" {
		t, err := time.Parse("2006-01-02", input.ExpenseDate)
		if err != nil {
			return nil, &domain.ErrValidation{Field: "expense_date", Message: "invalid date format"}
		}
		e.ExpenseDate = &t
	}
	if input.Amount != nil {
		e.Amount = *input.Amount
	}
	if input.PaymentAmount != nil {
		e.PaymentAmount = *input.PaymentAmount
	}
	if input.TaxExcluded != nil {
		e.TaxExcluded = *input.TaxExcluded
	}
	if input.PaymentMethodID != nil {
		e.PaymentMethodID = input.PaymentMethodID
	}
	if input.Reference != "" {
		e.Reference = input.Reference
	}
	if input.Notes != "" {
		e.Notes = input.Notes
	}

	// Recalculate balance and status
	e.Balance = e.Amount - e.PaymentAmount
	if e.PaymentAmount >= e.Amount {
		e.Status = "paid"
		e.Balance = 0
	} else if e.PaymentAmount > 0 {
		e.Status = "partial"
	} else {
		e.Status = "pending"
	}

	if err := s.repo.Update(e); err != nil {
		return nil, err
	}
	return s.repo.GetByID(id)
}

// Delete removes an expense.
func (s *Service) Delete(id uint) error {
	if _, err := s.repo.GetByID(id); err != nil {
		return err
	}
	return s.repo.Delete(id)
}
