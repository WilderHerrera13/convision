package sale

import (
	"fmt"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// Service handles sale use-cases.
type Service struct {
	db              *gorm.DB
	saleRepo        domain.SaleRepository
	adjRepo         domain.SaleLensPriceAdjustmentRepository
	productRepo     domain.ProductRepository
	labOrderRepo    domain.LaboratoryOrderRepository
	labRepo         domain.LaboratoryRepository
	appointmentRepo domain.AppointmentRepository
	logger          *zap.Logger
}

// NewService creates a new sale Service.
func NewService(
	db *gorm.DB,
	saleRepo domain.SaleRepository,
	adjRepo domain.SaleLensPriceAdjustmentRepository,
	productRepo domain.ProductRepository,
	labOrderRepo domain.LaboratoryOrderRepository,
	labRepo domain.LaboratoryRepository,
	appointmentRepo domain.AppointmentRepository,
	logger *zap.Logger,
) *Service {
	return &Service{
		db:              db,
		saleRepo:        saleRepo,
		adjRepo:         adjRepo,
		productRepo:     productRepo,
		labOrderRepo:    labOrderRepo,
		labRepo:         labRepo,
		appointmentRepo: appointmentRepo,
		logger:          logger,
	}
}

// --- DTOs ---

// PaymentInput represents a payment to apply to a sale.
type PaymentInput struct {
	PaymentMethodID uint    `json:"payment_method_id" binding:"required"`
	Amount          float64 `json:"amount"            binding:"required,min=0.01"`
	ReferenceNumber string  `json:"reference_number"`
	PaymentDate     string  `json:"payment_date"`
	Notes           string  `json:"notes"`
}

// ItemInput represents a generic sale line item.
type ItemInput struct {
	LensID      *uint   `json:"lens_id"`
	ProductID   *uint   `json:"product_id"`
	ProductType string  `json:"product_type"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Quantity    int     `json:"quantity"`
	Price       float64 `json:"price"`
	Discount    float64 `json:"discount"`
	Total       float64 `json:"total"`
	Notes       string  `json:"notes"`
}

// CreateInput holds the validated data for creating a sale.
type CreateInput struct {
	BranchID      uint           `json:"branch_id"`
	PatientID     uint           `json:"patient_id"     binding:"required"`
	OrderID       *uint          `json:"order_id"`
	AppointmentID *uint          `json:"appointment_id"`
	LaboratoryID  *uint          `json:"laboratory_id"`
	Subtotal      float64        `json:"subtotal"       binding:"min=0"`
	Tax           float64        `json:"tax"            binding:"min=0"`
	Discount      float64        `json:"discount"       binding:"min=0"`
	Total         float64        `json:"total"          binding:"min=0"`
	Notes         string         `json:"notes"`
	Payments      []PaymentInput `json:"payments"`
	Items         []ItemInput    `json:"items"`
}

// UpdateInput holds the validated data for updating a sale.
type UpdateInput struct {
	PatientID     uint    `json:"patient_id"`
	Subtotal      float64 `json:"subtotal"`
	Tax           float64 `json:"tax"`
	Discount      float64 `json:"discount"`
	Total         float64 `json:"total"`
	Notes         string  `json:"notes"`
	Status        string  `json:"status"`
	PaymentStatus string  `json:"payment_status"`
}

// AddPaymentInput holds data for adding a payment to an existing sale.
type AddPaymentInput struct {
	PaymentMethodID uint    `json:"payment_method_id" binding:"required"`
	Amount          float64 `json:"amount"            binding:"required,min=0.01"`
	ReferenceNumber string  `json:"reference_number"`
	PaymentDate     string  `json:"payment_date"`
	Notes           string  `json:"notes"`
}

// LensPriceAdjInput holds data for creating a lens price adjustment.
type LensPriceAdjInput struct {
	LensID        uint    `json:"lens_id"         binding:"required"`
	AdjustedPrice float64 `json:"adjusted_price"  binding:"required,min=0"`
	Reason        string  `json:"reason"`
}

// ListOutput is the paginated sale response.
type ListOutput struct {
	CurrentPage int            `json:"current_page"`
	Data        []*domain.Sale `json:"data"`
	LastPage    int            `json:"last_page"`
	PerPage     int            `json:"per_page"`
	Total       int64          `json:"total"`
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

func derivePaymentStatus(amountPaid, total float64, hasPayments bool) string {
	if !hasPayments {
		return "pending"
	}
	if amountPaid >= total {
		return "paid"
	}
	return "partial"
}

// --- Service methods ---

// List returns a paginated list of sales.
func (s *Service) List(filters map[string]any, page, perPage int) (*ListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.saleRepo.List(s.db, filters, page, perPage)
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

// GetByID returns a single sale by ID.
func (s *Service) GetByID(id uint) (*domain.Sale, error) {
	return s.saleRepo.GetByID(s.db, id)
}

// Create creates a new sale with optional initial payments.
func (s *Service) Create(input CreateInput, userID uint) (*domain.Sale, error) {
	now := time.Now()
	var amountPaid float64
	payments := make([]domain.SalePayment, len(input.Payments))
	for i, p := range input.Payments {
		pmID := p.PaymentMethodID
		pd := now
		if p.PaymentDate != "" {
			if t, err := time.Parse("2006-01-02", p.PaymentDate); err == nil {
				pd = t
			}
		}
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

	// Auto-calculate totals from items if not provided.
	var subtotal, discount float64
	items := make([]domain.SaleItem, len(input.Items))
	for i, it := range input.Items {
		qty := it.Quantity
		if qty == 0 {
			qty = 1
		}
		itemTotal := it.Total
		if itemTotal == 0 {
			itemTotal = it.Price*float64(qty) - it.Discount
		}
		items[i] = domain.SaleItem{
			LensID:      it.LensID,
			ProductID:   it.ProductID,
			ProductType: it.ProductType,
			Name:        it.Name,
			Description: it.Description,
			Quantity:    qty,
			Price:       it.Price,
			Discount:    it.Discount,
			Total:       itemTotal,
			Notes:       it.Notes,
		}
		subtotal += it.Price * float64(qty)
		discount += it.Discount
	}
	if input.Subtotal == 0 {
		input.Subtotal = subtotal
	}
	if input.Discount == 0 && discount > 0 {
		input.Discount = discount
	}
	taxPct := input.Tax
	if input.Total == 0 {
		taxAmt := (input.Subtotal - input.Discount) * taxPct / 100
		input.Total = input.Subtotal - input.Discount + taxAmt
		input.Tax = taxAmt
	}

	paymentStatus := derivePaymentStatus(amountPaid, input.Total, len(payments) > 0)
	balance := input.Total - amountPaid

	sale := &domain.Sale{
		BranchID:      input.BranchID,
		PatientID:     input.PatientID,
		OrderID:       input.OrderID,
		AppointmentID: input.AppointmentID,
		Subtotal:      input.Subtotal,
		Tax:           input.Tax,
		Discount:      input.Discount,
		Total:         input.Total,
		AmountPaid:    amountPaid,
		Balance:       balance,
		Status:        domain.SaleStatusPending,
		PaymentStatus: paymentStatus,
		Notes:         input.Notes,
		CreatedBy:     &userID,
		Items:         items,
		Payments:      payments,
	}

	if err := s.saleRepo.Create(s.db, sale); err != nil {
		return nil, err
	}

	s.logger.Info("sale created", zap.Uint("id", sale.ID), zap.String("sale_number", sale.SaleNumber))

	s.createLabOrderIfNeeded(sale, input.Items, input.LaboratoryID, userID)
	s.updateOrderPaymentStatus(sale)
	s.updateAppointmentBilling(sale)

	return s.saleRepo.GetByID(s.db, sale.ID)
}

// Update updates an existing sale's fields.
func (s *Service) Update(id uint, input UpdateInput) (*domain.Sale, error) {
	sale, err := s.saleRepo.GetByID(s.db, id)
	if err != nil {
		return nil, err
	}

	if input.PatientID != 0 {
		sale.PatientID = input.PatientID
	}
	if input.Subtotal != 0 {
		sale.Subtotal = input.Subtotal
	}
	if input.Tax != 0 {
		sale.Tax = input.Tax
	}
	if input.Discount != 0 {
		sale.Discount = input.Discount
	}
	if input.Total != 0 {
		sale.Total = input.Total
	}
	if input.Notes != "" {
		sale.Notes = input.Notes
	}
	if input.Status != "" {
		sale.Status = domain.SaleStatus(input.Status)
	}
	if input.PaymentStatus != "" {
		sale.PaymentStatus = input.PaymentStatus
	}

	if err := s.saleRepo.Update(s.db, sale); err != nil {
		return nil, err
	}
	return s.saleRepo.GetByID(s.db, sale.ID)
}

// Delete soft-deletes a sale.
func (s *Service) Delete(id uint) error {
	if _, err := s.saleRepo.GetByID(s.db, id); err != nil {
		return err
	}
	return s.saleRepo.Delete(s.db, id)
}

// AddPayment adds a payment to an existing sale and recalculates payment_status.
func (s *Service) AddPayment(saleID uint, input AddPaymentInput, userID uint) (*domain.Sale, error) {
	sale, err := s.saleRepo.GetByID(s.db, saleID)
	if err != nil {
		return nil, err
	}

	pmID := input.PaymentMethodID
	now := time.Now()
	pd := now
	if input.PaymentDate != "" {
		if t, err := time.Parse("2006-01-02", input.PaymentDate); err == nil {
			pd = t
		}
	}
	payment := &domain.SalePayment{
		SaleID:          saleID,
		PaymentMethodID: &pmID,
		Amount:          input.Amount,
		ReferenceNumber: input.ReferenceNumber,
		PaymentDate:     &pd,
		Notes:           input.Notes,
		CreatedBy:       &userID,
	}

	if err := s.saleRepo.AddPayment(s.db, payment); err != nil {
		return nil, err
	}

	// Recalculate amounts
	sale.AmountPaid += input.Amount
	sale.Balance = sale.Total - sale.AmountPaid
	if sale.Balance < 0 {
		sale.Balance = 0
	}
	sale.PaymentStatus = derivePaymentStatus(sale.AmountPaid, sale.Total, true)
	_ = s.saleRepo.Update(s.db, sale)

	s.logger.Info("payment added to sale",
		zap.Uint("sale_id", saleID),
		zap.Float64("amount", input.Amount),
	)
	return s.saleRepo.GetByID(s.db, saleID)
}

// RemovePayment removes a payment from a sale and recalculates payment_status.
func (s *Service) RemovePayment(saleID, paymentID uint) (*domain.Sale, error) {
	sale, err := s.saleRepo.GetByID(s.db, saleID)
	if err != nil {
		return nil, err
	}

	// Find the payment amount before removal
	var removedAmount float64
	for _, p := range sale.Payments {
		if p.ID == paymentID {
			removedAmount = p.Amount
			break
		}
	}

	if err := s.saleRepo.RemovePayment(s.db, saleID, paymentID); err != nil {
		return nil, err
	}

	// Recalculate
	sale.AmountPaid -= removedAmount
	if sale.AmountPaid < 0 {
		sale.AmountPaid = 0
	}
	sale.Balance = sale.Total - sale.AmountPaid

	refreshed, err := s.saleRepo.GetByID(s.db, saleID)
	if err != nil {
		return nil, err
	}
	refreshed.PaymentStatus = derivePaymentStatus(refreshed.AmountPaid, refreshed.Total, len(refreshed.Payments) > 0)
	_ = s.saleRepo.Update(s.db, refreshed)

	return s.saleRepo.GetByID(s.db, saleID)
}

// Cancel changes a sale's status to cancelled.
func (s *Service) Cancel(id uint) (*domain.Sale, error) {
	sale, err := s.saleRepo.GetByID(s.db, id)
	if err != nil {
		return nil, err
	}
	sale.Status = domain.SaleStatusCancelled
	if err := s.saleRepo.Update(s.db, sale); err != nil {
		return nil, err
	}
	return s.saleRepo.GetByID(s.db, id)
}

// GetStats returns aggregate sale statistics.
func (s *Service) GetStats() (map[string]any, error) {
	return s.saleRepo.GetStats(s.db)
}

// GetTodayStats returns today's aggregate sale statistics.
func (s *Service) GetTodayStats() (map[string]any, error) {
	return s.saleRepo.GetTodayStats(s.db)
}

// GetLensPriceAdjustments returns all lens price adjustments for a sale.
func (s *Service) GetLensPriceAdjustments(saleID uint) ([]*domain.SaleLensPriceAdjustment, error) {
	if _, err := s.saleRepo.GetByID(s.db, saleID); err != nil {
		return nil, err
	}
	return s.adjRepo.GetBySaleID(s.db, saleID)
}

// CreateLensPriceAdjustment creates a lens price adjustment for a sale item.
// It validates that adjusted_price > lens.price.
func (s *Service) CreateLensPriceAdjustment(saleID uint, input LensPriceAdjInput, userID uint) (*domain.SaleLensPriceAdjustment, error) {
	if _, err := s.saleRepo.GetByID(s.db, saleID); err != nil {
		return nil, err
	}

	lens, err := s.productRepo.GetByID(s.db, input.LensID)
	if err != nil {
		return nil, err
	}

	if input.AdjustedPrice <= lens.Price {
		return nil, &domain.ErrValidation{
			Field:   "adjusted_price",
			Message: fmt.Sprintf("must be greater than lens base price (%.2f)", lens.Price),
		}
	}

	lensID := input.LensID
	adj := &domain.SaleLensPriceAdjustment{
		SaleID:           saleID,
		LensID:           &lensID,
		BasePrice:        lens.Price,
		AdjustedPrice:    input.AdjustedPrice,
		AdjustmentAmount: input.AdjustedPrice - lens.Price,
		Reason:           input.Reason,
		AdjustedBy:       &userID,
	}

	if err := s.adjRepo.Create(s.db, adj); err != nil {
		return nil, err
	}
	return s.adjRepo.GetByID(s.db, adj.ID)
}

// DeleteLensPriceAdjustment removes a lens price adjustment.
func (s *Service) DeleteLensPriceAdjustment(saleID, adjID uint) error {
	adj, err := s.adjRepo.GetByID(s.db, adjID)
	if err != nil {
		return err
	}
	if adj.SaleID != saleID {
		return &domain.ErrNotFound{Resource: "lens_price_adjustment"}
	}
	return s.adjRepo.Delete(s.db, adjID)
}

// GetAdjustedPrice returns price info for a specific lens in a sale.
func (s *Service) GetAdjustedPrice(saleID, lensID uint) (map[string]any, error) {
	lens, err := s.productRepo.GetByID(s.db, lensID)
	if err != nil {
		return nil, err
	}

	adj, err := s.adjRepo.GetBySaleLens(s.db, saleID, lensID)
	if err != nil {
		// No adjustment found — return base price
		return map[string]any{
			"original_price":    lens.Price,
			"adjusted_price":    lens.Price,
			"adjustment_amount": 0.0,
			"has_adjustment":    false,
		}, nil
	}

	return map[string]any{
		"original_price":    adj.BasePrice,
		"adjusted_price":    adj.AdjustedPrice,
		"adjustment_amount": adj.AdjustmentAmount,
		"has_adjustment":    true,
	}, nil
}

// GeneratePdfToken generates a PDF access token for a sale.
func (s *Service) GeneratePdfToken(id uint) (map[string]any, error) {
	sale, err := s.saleRepo.GetByID(s.db, id)
	if err != nil {
		return nil, err
	}
	token := fmt.Sprintf("%x-%d", sale.ID, time.Now().UnixNano())
	return map[string]any{
		"pdf_token":     token,
		"guest_pdf_url": fmt.Sprintf("/api/v1/sales/%d/pdf?token=%s", sale.ID, token),
	}, nil
}

func (s *Service) createLabOrderIfNeeded(sale *domain.Sale, items []ItemInput, labID *uint, userID uint) {
	hasLens := false
	for _, it := range items {
		if it.LensID != nil || it.ProductType == "lens" {
			hasLens = true
			break
		}
	}
	if !hasLens {
		return
	}

	existing, _ := s.labOrderRepo.GetBySaleID(s.db, sale.ID)
	if existing != nil {
		return
	}

	resolvedLabID := labID
	if resolvedLabID == nil {
		lab, err := s.labRepo.GetFirstActive(s.db)
		if err != nil {
			s.logger.Warn("no active laboratory found, skipping lab order creation",
				zap.Uint("sale_id", sale.ID))
			return
		}
		resolvedLabID = &lab.ID
	}

	lo := &domain.LaboratoryOrder{
		SaleID:       &sale.ID,
		LaboratoryID: resolvedLabID,
		PatientID:    &sale.PatientID,
		Status:       domain.LaboratoryOrderStatusPending,
		Priority:     "normal",
		CreatedBy:    &userID,
	}
	if err := s.labOrderRepo.Create(s.db, lo); err != nil {
		s.logger.Warn("failed to create lab order from sale",
			zap.Uint("sale_id", sale.ID),
			zap.Error(err))
		return
	}
	_ = s.labOrderRepo.AddStatusEntry(s.db, &domain.LaboratoryOrderStatusEntry{
		LaboratoryOrderID: lo.ID,
		Status:            string(domain.LaboratoryOrderStatusPending),
		Notes:             "Order created automatically from sale",
		UserID:            &userID,
	})
	s.logger.Info("lab order created from sale",
		zap.Uint("sale_id", sale.ID),
		zap.Uint("lab_order_id", lo.ID))
}

func (s *Service) updateOrderPaymentStatus(sale *domain.Sale) {
	if sale.OrderID == nil {
		return
	}
	s.logger.Info("order payment status sync skipped: order repo not injected in sale service",
		zap.Uint("sale_id", sale.ID),
		zap.Uint("order_id", *sale.OrderID))
}

func (s *Service) updateAppointmentBilling(sale *domain.Sale) {
	if sale.AppointmentID == nil {
		return
	}
	appt, err := s.appointmentRepo.GetByID(s.db, *sale.AppointmentID)
	if err != nil {
		s.logger.Warn("appointment not found for billing update",
			zap.Uint("sale_id", sale.ID),
			zap.Uint("appointment_id", *sale.AppointmentID))
		return
	}

	saleID := sale.ID
	appt.SaleID = &saleID

	if sale.PaymentStatus == "paid" {
		now := time.Now()
		appt.IsBilled = true
		appt.BilledAt = &now
	} else {
		appt.IsBilled = false
	}

	if err := s.appointmentRepo.Update(s.db, appt); err != nil {
		s.logger.Warn("failed to update appointment billing status",
			zap.Uint("sale_id", sale.ID),
			zap.Uint("appointment_id", *sale.AppointmentID),
			zap.Error(err))
	}
}
