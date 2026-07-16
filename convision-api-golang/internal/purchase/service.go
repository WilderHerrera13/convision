package purchase

import (
	"context"
	"fmt"
	"math"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/invoicingclient"
	"github.com/convision/api/internal/platform/clock"
)

// Service handles purchase use-cases.
type Service struct {
	repo      domain.PurchaseRepository
	invoicing *invoicingclient.Client
	logger    *zap.Logger
}

// NewService creates a new purchase Service.
func NewService(repo domain.PurchaseRepository, invoicing *invoicingclient.Client, logger *zap.Logger) *Service {
	return &Service{repo: repo, invoicing: invoicing, logger: logger}
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
func (s *Service) List(db *gorm.DB, f domain.PurchaseFilter) (*ListOutput, error) {
	f.Clamp()
	data, total, err := s.repo.List(db, f)
	if err != nil {
		return nil, err
	}
	lastPage := 1
	if total > 0 {
		lastPage = int(math.Ceil(float64(total) / float64(f.PerPage)))
	}
	return &ListOutput{Data: data, Total: total, CurrentPage: f.Page, PerPage: f.PerPage, LastPage: lastPage}, nil
}

// Create creates a new purchase with items.
func (s *Service) Create(db *gorm.DB, input CreateInput, createdByUserID *uint) (*domain.Purchase, error) {
	var purchaseDate *time.Time
	if input.PurchaseDate != "" {
		t, err := clock.ParseDate(input.PurchaseDate)
		if err != nil {
			return nil, &domain.ErrValidation{Field: "purchase_date", Message: "invalid date format, use YYYY-MM-DD"}
		}
		purchaseDate = &t
	}

	var paymentDueDate *time.Time
	if input.PaymentDueDate != "" {
		t, err := clock.ParseDate(input.PaymentDueDate)
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

	created, err := s.repo.GetByID(db, p.ID)
	if err != nil {
		return nil, err
	}

	if needsDocumentoSoporte(created) {
		go s.emitDocumentoSoporteAsync(context.Background(), db, created)
	}

	return created, nil
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
		t, err := clock.ParseDate(input.PurchaseDate)
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
		t, err := clock.ParseDate(input.PaymentDueDate)
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

// needsDocumentoSoporte returns true when the supplier is a non-obligated taxpayer
// who cannot issue their own electronic invoice, requiring the buyer to emit a DS.
// Colombian suppliers on simplified regime or marked as non-obligated fall in this category.
func needsDocumentoSoporte(p *domain.Purchase) bool {
	if p.Supplier == nil {
		return false
	}
	r := p.Supplier.RegimeType
	return r == "simplified" || r == "no_obligated" || r == "no-obligated"
}

// emitDocumentoSoporteAsync emits a Documento Soporte (DS) for a purchase from a
// non-obligated supplier. Best-effort: errors are logged but never block purchase creation.
func (s *Service) emitDocumentoSoporteAsync(ctx context.Context, db *gorm.DB, p *domain.Purchase) {
	if !s.invoicing.IsEnabled() {
		return
	}
	if p.Supplier == nil {
		return
	}

	lines := make([]invoicingclient.LineRequest, 0, len(p.Items))
	for _, item := range p.Items {
		ivaTreatment := "gravado_19"
		if p.TaxExcluded {
			ivaTreatment = "excluido"
		}
		lines = append(lines, invoicingclient.LineRequest{
			ProductCode:  item.ProductCode,
			Description:  item.ProductDescription,
			Quantity:     item.Quantity,
			UnitPrice:    item.UnitPrice,
			IVATreatment: ivaTreatment,
		})
	}

	if len(lines) == 0 {
		return
	}

	supplierNIT := p.Supplier.NIT
	if supplierNIT == "" {
		supplierNIT = fmt.Sprintf("%d", p.SupplierID)
	}

	req := invoicingclient.EmitRequest{
		ExternalRef:  p.InvoiceNumber,
		DocumentType: "DS",
		Recipient: invoicingclient.RecipientRequest{
			DocType:   "NIT",
			DocNumber: supplierNIT,
			Name:      p.Supplier.Name,
		},
		Lines: lines,
		Notes: p.Notes,
	}

	inv, err := s.invoicing.EmitInvoice(ctx, req)
	if err != nil {
		s.logger.Warn("invoicing: DS emit failed",
			zap.Uint("purchase_id", p.ID), zap.Error(err))
		p.InvoicingStatus = "error"
	} else if inv != nil {
		p.InvoicingID = fmt.Sprintf("%d", inv.ID)
		p.InvoicingStatus = inv.DIANStatus
		s.logger.Info("invoicing: DS emitted",
			zap.Uint("purchase_id", p.ID),
			zap.String("ds_number", inv.Number),
			zap.String("dian_status", inv.DIANStatus))
	}

	_ = s.repo.Update(db, p)
}
