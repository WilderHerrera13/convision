package purchase

import (
	"fmt"
	"math"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// Service handles purchase use-cases.
type Service struct {
	repo   domain.PurchaseRepository
	logger *zap.Logger
}

// NewService creates a new purchase Service.
func NewService(repo domain.PurchaseRepository, logger *zap.Logger) *Service {
	return &Service{repo: repo, logger: logger}
}

// CreateItemInput is a purchase line item for creation.
type CreateItemInput struct {
	ProductID          *uint   `json:"product_id"`
	ProductCode        string  `json:"product_code"`
	ProductDescription string  `json:"product_description" binding:"required"`
	Quantity           float64 `json:"quantity"            binding:"required,min=0.01"`
	UnitPrice          float64 `json:"unit_price"          binding:"required,min=0"`
	Subtotal           float64 `json:"subtotal"            binding:"required,min=0"`
	TaxRate            float64 `json:"tax_rate"`
	TaxAmount          float64 `json:"tax_amount"`
	Total              float64 `json:"total"               binding:"required,min=0"`
	Notes              string  `json:"notes"`
}

// CreateInput holds validated fields for creating a purchase.
type CreateInput struct {
	SupplierID      uint              `json:"supplier_id"    binding:"required"`
	PurchaseDate    string            `json:"purchase_date"  binding:"required"`
	InvoiceNumber   string            `json:"invoice_number" binding:"required,max=255"`
	Concept         string            `json:"concept"        binding:"required,max=255"`
	Subtotal        float64           `json:"subtotal"       binding:"required,min=0"`
	TaxAmount       float64           `json:"tax_amount"`
	RetentionAmount float64           `json:"retention_amount"`
	TotalAmount     float64           `json:"total_amount"   binding:"required,min=0"`
	TaxExcluded     bool              `json:"tax_excluded"`
	InvoiceFile     string            `json:"invoice_file"`
	Notes           string            `json:"notes"`
	PaymentDueDate  string            `json:"payment_due_date"`
	Items           []CreateItemInput `json:"items" binding:"required,min=1,dive"`
}

// UpdateInput holds fields for updating a purchase.
type UpdateInput struct {
	SupplierID      *uint             `json:"supplier_id"`
	PurchaseDate    string            `json:"purchase_date"`
	InvoiceNumber   string            `json:"invoice_number"`
	Concept         string            `json:"concept"`
	Subtotal        *float64          `json:"subtotal"`
	TaxAmount       *float64          `json:"tax_amount"`
	RetentionAmount *float64          `json:"retention_amount"`
	TotalAmount     *float64          `json:"total_amount"`
	TaxExcluded     *bool             `json:"tax_excluded"`
	Notes           string            `json:"notes"`
	PaymentDueDate  string            `json:"payment_due_date"`
	Items           []CreateItemInput `json:"items"`
}

// ListOutput wraps a page of purchases with pagination metadata.
type ListOutput struct {
	Data        []*domain.Purchase `json:"data"`
	Total       int64              `json:"total"`
	CurrentPage int                `json:"current_page"`
	PerPage     int                `json:"per_page"`
	LastPage    int                `json:"last_page"`
}

// GetByID returns a single purchase or ErrNotFound.
func (s *Service) GetByID(db *gorm.DB, id uint) (*domain.Purchase, error) {
	return s.repo.GetByID(db, id)
}

// List returns a paginated list of purchases.
func (s *Service) List(db *gorm.DB, filters map[string]any, page, perPage int) (*ListOutput, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 15
	}
	data, total, err := s.repo.List(db, filters, page, perPage)
	if err != nil {
		return nil, err
	}
	lastPage := 1
	if total > 0 {
		lastPage = int(math.Ceil(float64(total) / float64(perPage)))
	}
	return &ListOutput{Data: data, Total: total, CurrentPage: page, PerPage: perPage, LastPage: lastPage}, nil
}

// Create creates a new purchase with items.
func (s *Service) Create(db *gorm.DB, input CreateInput, createdByUserID *uint) (*domain.Purchase, error) {
	var purchaseDate *time.Time
	if input.PurchaseDate != "" {
		t, err := time.Parse("2006-01-02", input.PurchaseDate)
		if err != nil {
			return nil, &domain.ErrValidation{Field: "purchase_date", Message: "invalid date format, use YYYY-MM-DD"}
		}
		purchaseDate = &t
	}

	var paymentDueDate *time.Time
	if input.PaymentDueDate != "" {
		t, err := time.Parse("2006-01-02", input.PaymentDueDate)
		if err != nil {
			return nil, &domain.ErrValidation{Field: "payment_due_date", Message: "invalid date format, use YYYY-MM-DD"}
		}
		paymentDueDate = &t
	}

	items := make([]domain.PurchaseItem, len(input.Items))
	for i, it := range input.Items {
		items[i] = domain.PurchaseItem{
			ProductID:          it.ProductID,
			ProductCode:        it.ProductCode,
			ProductDescription: it.ProductDescription,
			Quantity:           it.Quantity,
			UnitPrice:          it.UnitPrice,
			Subtotal:           it.Subtotal,
			TaxRate:            it.TaxRate,
			TaxAmount:          it.TaxAmount,
			Total:              it.Total,
			Notes:              it.Notes,
		}
	}

	p := &domain.Purchase{
		SupplierID:      input.SupplierID,
		PurchaseDate:    purchaseDate,
		InvoiceNumber:   input.InvoiceNumber,
		Concept:         input.Concept,
		Subtotal:        input.Subtotal,
		TaxAmount:       input.TaxAmount,
		RetentionAmount: input.RetentionAmount,
		TotalAmount:     input.TotalAmount,
		Balance:         input.TotalAmount,
		PaymentStatus:   "pending",
		Status:          "pending",
		TaxExcluded:     input.TaxExcluded,
		InvoiceFile:     input.InvoiceFile,
		Notes:           input.Notes,
		PaymentDueDate:  paymentDueDate,
		CreatedByUserID: createdByUserID,
		Items:           items,
	}

	if err := s.repo.Create(db, p); err != nil {
		return nil, err
	}

	s.logger.Info("purchase created", zap.Uint("id", p.ID), zap.String("invoice", p.InvoiceNumber))
	return s.repo.GetByID(db, p.ID)
}

// Update updates a purchase.
func (s *Service) Update(db *gorm.DB, id uint, input UpdateInput) (*domain.Purchase, error) {
	p, err := s.repo.GetByID(db, id)
	if err != nil {
		return nil, err
	}
	if input.SupplierID != nil {
		p.SupplierID = *input.SupplierID
	}
	if input.PurchaseDate != "" {
		t, err := time.Parse("2006-01-02", input.PurchaseDate)
		if err != nil {
			return nil, &domain.ErrValidation{Field: "purchase_date", Message: "invalid date format"}
		}
		p.PurchaseDate = &t
	}
	if input.InvoiceNumber != "" {
		p.InvoiceNumber = input.InvoiceNumber
	}
	if input.Concept != "" {
		p.Concept = input.Concept
	}
	if input.Subtotal != nil {
		p.Subtotal = *input.Subtotal
	}
	if input.TaxAmount != nil {
		p.TaxAmount = *input.TaxAmount
	}
	if input.RetentionAmount != nil {
		p.RetentionAmount = *input.RetentionAmount
	}
	if input.TotalAmount != nil {
		p.TotalAmount = *input.TotalAmount
	}
	if input.TaxExcluded != nil {
		p.TaxExcluded = *input.TaxExcluded
	}
	if input.Notes != "" {
		p.Notes = input.Notes
	}
	if input.PaymentDueDate != "" {
		t, err := time.Parse("2006-01-02", input.PaymentDueDate)
		if err != nil {
			return nil, &domain.ErrValidation{Field: "payment_due_date", Message: "invalid date format"}
		}
		p.PaymentDueDate = &t
	}

	if err := s.repo.Update(db, p); err != nil {
		return nil, err
	}
	return s.repo.GetByID(db, id)
}

// Delete removes a purchase.
func (s *Service) Delete(db *gorm.DB, id uint) error {
	if _, err := s.repo.GetByID(db, id); err != nil {
		return err
	}
	return s.repo.Delete(db, id)
}

// Receive marks a purchase as received.
func (s *Service) Receive(db *gorm.DB, id uint) (*domain.Purchase, error) {
	p, err := s.repo.GetByID(db, id)
	if err != nil {
		return nil, err
	}
	p.Status = "received"
	if err := s.repo.Update(db, p); err != nil {
		return nil, err
	}
	s.logger.Info("purchase received", zap.Uint("id", p.ID))
	return s.repo.GetByID(db, id)
}

// GeneratePurchaseNumber generates a sequential purchase number like PUR-0001.
func GeneratePurchaseNumber(id uint) string {
	return fmt.Sprintf("PUR-%04d", id)
}
