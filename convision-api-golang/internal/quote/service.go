package quote

import (
	"fmt"
	"time"

	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
)

// Service handles quote use-cases.
type Service struct {
	quoteRepo domain.QuoteRepository
	saleRepo  domain.SaleRepository
	logger    *zap.Logger
}

// NewService creates a new quote Service.
func NewService(
	quoteRepo domain.QuoteRepository,
	saleRepo domain.SaleRepository,
	logger *zap.Logger,
) *Service {
	return &Service{
		quoteRepo: quoteRepo,
		saleRepo:  saleRepo,
		logger:    logger,
	}
}

// --- DTOs ---

// ItemInput defines a single line item for create/update.
type ItemInput struct {
	ProductID          *uint   `json:"product_id"`
	Name               string  `json:"name"     binding:"required"`
	Description        string  `json:"description"`
	Quantity           int     `json:"quantity" binding:"required,min=1"`
	Price              float64 `json:"price"    binding:"required,min=0"`
	DiscountPercentage float64 `json:"discount_percentage"`
	OriginalPrice      float64 `json:"original_price"`
	Notes              string  `json:"notes"`
}

// CreateInput holds the validated data for creating a quote.
type CreateInput struct {
	PatientID      uint        `json:"patient_id"      binding:"required"`
	ExpirationDate string      `json:"expiration_date"`
	Notes          string      `json:"notes"`
	TaxPercentage  float64     `json:"tax_percentage"`
	DiscountAmount float64     `json:"discount_amount"`
	Items          []ItemInput `json:"items"           binding:"required,min=1"`
}

// UpdateInput holds the validated data for updating a quote.
type UpdateInput struct {
	PatientID      uint        `json:"patient_id"`
	ExpirationDate string      `json:"expiration_date"`
	Notes          string      `json:"notes"`
	TaxPercentage  float64     `json:"tax_percentage"`
	DiscountAmount float64     `json:"discount_amount"`
	Items          []ItemInput `json:"items"`
}

// StatusInput holds the new status for a quote.
type StatusInput struct {
	Status string `json:"status" binding:"required,oneof=draft sent accepted rejected expired converted"`
}

// PaymentInput used when converting a quote to a sale.
type PaymentInput struct {
	PaymentMethodID uint      `json:"payment_method_id" binding:"required"`
	Amount          float64   `json:"amount"            binding:"required,min=0.01"`
	ReferenceNumber string    `json:"reference_number"`
	PaymentDate     time.Time `json:"payment_date"      binding:"required"`
	Notes           string    `json:"notes"`
}

// ConvertInput holds payments for converting a quote to a sale.
type ConvertInput struct {
	Payments []PaymentInput `json:"payments"`
}

// ListOutput is the paginated quote response.
type ListOutput struct {
	CurrentPage int             `json:"current_page"`
	Data        []*domain.Quote `json:"data"`
	LastPage    int             `json:"last_page"`
	PerPage     int             `json:"per_page"`
	Total       int64           `json:"total"`
}

// --- Helpers ---

func calcLastPage(total int64, perPage int) int {
	if total == 0 {
		return 1
	}
	lp := int(total) / perPage
	if int(total)%perPage != 0 {
		lp++
	}
	return lp
}

func clampPage(page, perPage int) (int, int) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 15
	}
	return page, perPage
}

func calcTotals(items []ItemInput, taxPct, discountAmount float64) (subtotal, taxAmount, total float64) {
	for _, it := range items {
		lineTotal := it.Price * float64(it.Quantity)
		if it.DiscountPercentage > 0 {
			lineTotal -= lineTotal * (it.DiscountPercentage / 100)
		}
		subtotal += lineTotal
	}
	taxAmount = subtotal * (taxPct / 100)
	total = subtotal + taxAmount - discountAmount
	if total < 0 {
		total = 0
	}
	return
}

func buildItems(items []ItemInput) []domain.QuoteItem {
	out := make([]domain.QuoteItem, len(items))
	for i, it := range items {
		lineTotal := it.Price * float64(it.Quantity)
		if it.DiscountPercentage > 0 {
			lineTotal -= lineTotal * (it.DiscountPercentage / 100)
		}
		out[i] = domain.QuoteItem{
			ProductID:          it.ProductID,
			Name:               it.Name,
			Description:        it.Description,
			Quantity:           it.Quantity,
			Price:              it.Price,
			OriginalPrice:      it.OriginalPrice,
			DiscountPercentage: it.DiscountPercentage,
			Total:              lineTotal,
			Notes:              it.Notes,
		}
	}
	return out
}

// --- Service methods ---

// List returns a paginated list of quotes.
func (s *Service) List(filters map[string]any, page, perPage int) (*ListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.quoteRepo.List(filters, page, perPage)
	if err != nil {
		return nil, err
	}
	return &ListOutput{
		CurrentPage: page,
		Data:        data,
		LastPage:    calcLastPage(total, perPage),
		PerPage:     perPage,
		Total:       total,
	}, nil
}

// GetByID returns a single quote by ID.
func (s *Service) GetByID(id uint) (*domain.Quote, error) {
	return s.quoteRepo.GetByID(id)
}

// Create creates a new quote and generates its number after insertion.
func (s *Service) Create(input CreateInput, userID uint) (*domain.Quote, error) {
	subtotal, taxAmount, total := calcTotals(input.Items, input.TaxPercentage, input.DiscountAmount)

	var expDate *time.Time
	if input.ExpirationDate != "" {
		t, err := time.Parse("2006-01-02", input.ExpirationDate)
		if err != nil {
			return nil, &domain.ErrValidation{Field: "expiration_date", Message: "formato debe ser YYYY-MM-DD"}
		}
		expDate = &t
	}

	q := &domain.Quote{
		PatientID:      input.PatientID,
		ExpirationDate: expDate,
		Notes:          input.Notes,
		Subtotal:       subtotal,
		TaxAmount:      taxAmount,
		DiscountAmount: input.DiscountAmount,
		Total:          total,
		Status:         domain.QuoteStatusPending,
		CreatedBy:      &userID,
		Items:          buildItems(input.Items),
	}

	if err := s.quoteRepo.Create(q); err != nil {
		return nil, err
	}

	s.logger.Info("quote created", zap.Uint("id", q.ID), zap.String("quote_number", q.QuoteNumber))
	return s.quoteRepo.GetByID(q.ID)
}

// Update updates an existing quote.
func (s *Service) Update(id uint, input UpdateInput) (*domain.Quote, error) {
	q, err := s.quoteRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	if input.PatientID != 0 {
		q.PatientID = input.PatientID
	}
	if input.ExpirationDate != "" {
		t, err := time.Parse("2006-01-02", input.ExpirationDate)
		if err == nil {
			q.ExpirationDate = &t
		}
	}
	q.Notes = input.Notes
	q.DiscountAmount = input.DiscountAmount

	if len(input.Items) > 0 {
		subtotal, taxAmount, total := calcTotals(input.Items, input.TaxPercentage, input.DiscountAmount)
		q.Subtotal = subtotal
		q.TaxAmount = taxAmount
		q.Total = total
		q.Items = buildItems(input.Items)
		for i := range q.Items {
			q.Items[i].QuoteID = q.ID
		}
	}

	if err := s.quoteRepo.Update(q); err != nil {
		return nil, err
	}
	return s.quoteRepo.GetByID(q.ID)
}

// Delete soft-deletes a quote.
func (s *Service) Delete(id uint) error {
	if _, err := s.quoteRepo.GetByID(id); err != nil {
		return err
	}
	return s.quoteRepo.Delete(id)
}

// UpdateStatus changes the status of a quote.
func (s *Service) UpdateStatus(id uint, status string) (*domain.Quote, error) {
	q, err := s.quoteRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	q.Status = domain.QuoteStatus(status)
	if err := s.quoteRepo.Update(q); err != nil {
		return nil, err
	}
	return s.quoteRepo.GetByID(q.ID)
}

// ConvertToSale converts an approved quote into a sale.
func (s *Service) ConvertToSale(id uint, userID uint, input ConvertInput) (*domain.Sale, error) {
	q, err := s.quoteRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	// Build sale items from quote items
	saleItems := make([]domain.SaleItem, len(q.Items))
	for i, qi := range q.Items {
		saleItems[i] = domain.SaleItem{
			LensID:   qi.ProductID,
			Quantity: qi.Quantity,
			Price:    qi.Price,
			Total:    qi.Total,
			Notes:    qi.Notes,
		}
	}

	// Calculate payment totals
	var amountPaid float64
	payments := make([]domain.SalePayment, len(input.Payments))
	for i, p := range input.Payments {
		pmID := p.PaymentMethodID
		pd := p.PaymentDate
		payments[i] = domain.SalePayment{
			PaymentMethodID: &pmID,
			Amount:          p.Amount,
			ReferenceNumber: p.ReferenceNumber,
			PaymentDate:     &pd,
			Notes:           p.Notes,
			CreatedBy:       &userID,
		}
		amountPaid += p.Amount
	}

	paymentStatus := "pending"
	if amountPaid >= q.Total {
		paymentStatus = "paid"
	} else if amountPaid > 0 {
		paymentStatus = "partial"
	}

	sale := &domain.Sale{
		PatientID:     q.PatientID,
		Subtotal:      q.Subtotal,
		Tax:           q.TaxAmount,
		Discount:      q.DiscountAmount,
		Total:         q.Total,
		AmountPaid:    amountPaid,
		Balance:       q.Total - amountPaid,
		Status:        domain.SaleStatusPending,
		PaymentStatus: paymentStatus,
		Notes:         q.Notes,
		CreatedBy:     &userID,
		Items:         saleItems,
		Payments:      payments,
	}

	if err := s.saleRepo.Create(sale); err != nil {
		return nil, err
	}

	// Mark quote as converted
	q.Status = domain.QuoteStatusConverted
	_ = s.quoteRepo.Update(q)

	s.logger.Info("quote converted to sale",
		zap.Uint("quote_id", q.ID),
		zap.Uint("sale_id", sale.ID),
	)
	return s.saleRepo.GetByID(sale.ID)
}

// GeneratePdfToken generates a PDF access token for a quote.
func (s *Service) GeneratePdfToken(id uint) (map[string]any, error) {
	q, err := s.quoteRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	token := fmt.Sprintf("%x-%d", q.ID, time.Now().UnixNano())
	return map[string]any{
		"pdf_token":     token,
		"guest_pdf_url": fmt.Sprintf("/api/v1/quotes/%d/pdf?token=%s", q.ID, token),
	}, nil
}
