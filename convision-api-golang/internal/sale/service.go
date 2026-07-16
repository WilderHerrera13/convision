package sale

import (
	"context"
	"fmt"
	"math"
	"strconv"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/invoicingclient"
	"github.com/convision/api/internal/platform/clock"
	"github.com/convision/api/internal/promotion"
)

// ivaRate is the single VAT (IVA) rate applied across the app.
const ivaRate = 0.19

// Service handles sale use-cases.
type Service struct {
	db                 *gorm.DB
	saleRepo           domain.SaleRepository
	adjRepo            domain.SaleLensPriceAdjustmentRepository
	partialPaymentRepo domain.PartialPaymentRepository
	productRepo        domain.ProductRepository
	labOrderRepo       domain.LaboratoryOrderRepository
	labRepo            domain.LaboratoryRepository
	appointmentRepo    domain.AppointmentRepository
	branchRepo         domain.BranchRepository
	itemRepo           domain.InventoryItemRepository
	movementRepo       domain.StockMovementRepository
	prescriptionRepo   domain.PrescriptionRepository
	// clinicalRecordRepo is the primary source of truth for the signed optical
	// formula (ClinicalPrescription). prescriptionRepo (the legacy Prescription
	// model, table appointment_prescriptions) is kept only as a fallback for
	// appointments that never went through the active clinical-record flow —
	// see createLabOrderIfNeeded. Do not remove prescriptionRepo: the legacy
	// /api/v1/prescriptions CRUD and PrescriptionForm.tsx still depend on it.
	clinicalRecordRepo domain.ClinicalRecordRepository
	userRepo           domain.UserRepository
	promotionRepo      domain.PromotionRepository
	patientRepo        domain.PatientRepository
	invoicing          *invoicingclient.Client
	logger             *zap.Logger
}

// NewService creates a new sale Service.
func NewService(
	db *gorm.DB,
	saleRepo domain.SaleRepository,
	adjRepo domain.SaleLensPriceAdjustmentRepository,
	partialPaymentRepo domain.PartialPaymentRepository,
	productRepo domain.ProductRepository,
	labOrderRepo domain.LaboratoryOrderRepository,
	labRepo domain.LaboratoryRepository,
	appointmentRepo domain.AppointmentRepository,
	branchRepo domain.BranchRepository,
	itemRepo domain.InventoryItemRepository,
	movementRepo domain.StockMovementRepository,
	prescriptionRepo domain.PrescriptionRepository,
	clinicalRecordRepo domain.ClinicalRecordRepository,
	userRepo domain.UserRepository,
	promotionRepo domain.PromotionRepository,
	patientRepo domain.PatientRepository,
	logger *zap.Logger,
) *Service {
	return &Service{
		db:                 db,
		saleRepo:           saleRepo,
		adjRepo:            adjRepo,
		partialPaymentRepo: partialPaymentRepo,
		productRepo:        productRepo,
		labOrderRepo:       labOrderRepo,
		labRepo:            labRepo,
		appointmentRepo:    appointmentRepo,
		branchRepo:         branchRepo,
		itemRepo:           itemRepo,
		movementRepo:       movementRepo,
		prescriptionRepo:   prescriptionRepo,
		clinicalRecordRepo: clinicalRecordRepo,
		userRepo:           userRepo,
		promotionRepo:      promotionRepo,
		patientRepo:        patientRepo,
		invoicing:          invoicingclient.NewFromEnv(),
		logger:             logger,
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

func derivePaymentStatus(amountPaid, total float64) string {
	if amountPaid <= 0 {
		return "pending"
	}
	if amountPaid >= total {
		return "paid"
	}
	return "partial"
}

// --- Service methods ---

// List returns a paginated list of sales.
func (s *Service) List(f domain.SaleFilter) (*ListOutput, error) {
	f.Clamp()
	data, total, err := s.saleRepo.List(s.db, f)
	if err != nil {
		return nil, err
	}
	return &ListOutput{
		CurrentPage: f.Page,
		Data:        data,
		LastPage:    calcLastPage(total, f.PerPage),
		PerPage:     f.PerPage,
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
			if t, err := clock.ParseDate(p.PaymentDate); err == nil {
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

	// Server-authoritative marketing promotions: independently recompute every
	// applicable promotion from the catalog (conflict resolution included). When any
	// apply, their combined amount reduces the taxable base before IVA and the totals
	// are recomputed from server figures — the client-sent totals are never trusted
	// for promotions. Sales without matching promotions keep their existing
	// (client-provided) totals unchanged. promotion_id records the largest single
	// promotion as the representative campaign for reporting.
	var promotionID *uint
	var promotionDiscount float64
	if applied := s.applicablePromotions(input); len(applied) > 0 {
		var repID uint
		var repAmount float64
		for _, a := range applied {
			promotionDiscount += a.Amount
			if a.Amount > repAmount {
				repAmount = a.Amount
				repID = a.ID
			}
		}
		promotionDiscount = round2(promotionDiscount)
		promotionID = &repID

		taxable := subtotal - discount - promotionDiscount
		if taxable < 0 {
			taxable = 0
		}
		tax := round2(taxable * ivaRate)
		input.Subtotal = subtotal
		input.Discount = discount
		input.Tax = tax
		input.Total = round2(taxable + tax)
	}

	paymentStatus := derivePaymentStatus(amountPaid, input.Total)
	balance := input.Total - amountPaid

	sale := &domain.Sale{
		BranchID:          input.BranchID,
		PatientID:         input.PatientID,
		OrderID:           input.OrderID,
		AppointmentID:     input.AppointmentID,
		Subtotal:          input.Subtotal,
		Tax:               input.Tax,
		Discount:          input.Discount,
		PromotionID:       promotionID,
		PromotionDiscount: promotionDiscount,
		Total:             input.Total,
		AmountPaid:        amountPaid,
		Balance:           balance,
		Status:            domain.SaleStatusPending,
		PaymentStatus:     paymentStatus,
		Notes:             input.Notes,
		CreatedBy:         &userID,
		Items:             items,
		Payments:          payments,
	}

	if err := s.saleRepo.Create(s.db, sale); err != nil {
		return nil, err
	}

	s.logger.Info("sale created", zap.Uint("id", sale.ID), zap.String("sale_number", sale.SaleNumber))

	s.deductStock(context.Background(), sale.ID, sale.BranchID, sale.Items, userID)

	s.createLabOrderIfNeeded(sale, input.Items, input.LaboratoryID, userID)
	s.updateOrderPaymentStatus(sale)
	s.updateAppointmentBilling(sale)

	created, err := s.saleRepo.GetByID(s.db, sale.ID)
	if err != nil {
		return nil, err
	}

	go s.emitInvoiceAsync(context.Background(), created)

	return created, nil
}

// applicablePromotions re-runs the promotion engine server-side for a sale being
// created, resolving each line's category/brand from the catalog and the patient's
// birth date, so applied promotions cannot be forged by the client. Returns every
// promotion the conflict-resolution engine grants (empty when none apply).
func (s *Service) applicablePromotions(input CreateInput) []promotion.AppliedPromotion {
	if s.promotionRepo == nil {
		return nil
	}
	now := time.Now()
	candidates, err := s.promotionRepo.ListActiveAt(s.db, now)
	if err != nil || len(candidates) == 0 {
		return nil
	}

	items := make([]promotion.EvaluateItemInput, 0, len(input.Items))
	for _, it := range input.Items {
		ei := promotion.EvaluateItemInput{
			ProductID:    it.ProductID,
			LensID:       it.LensID,
			ProductType:  it.ProductType,
			Quantity:     it.Quantity,
			Price:        it.Price,
			LineDiscount: it.Discount,
		}
		pid := it.ProductID
		if pid == nil {
			pid = it.LensID
		}
		if pid != nil {
			if prod, perr := s.productRepo.GetByID(s.db, *pid); perr == nil && prod != nil {
				ei.ProductCategoryID = prod.ProductCategoryID
				ei.BrandID = prod.BrandID
				if ei.ProductType == "" {
					ei.ProductType = string(prod.ProductType)
				}
			}
		}
		items = append(items, ei)
	}

	var birth *string
	if input.PatientID != 0 && s.patientRepo != nil {
		if p, perr := s.patientRepo.GetByID(s.db, input.PatientID); perr == nil && p != nil && p.BirthDate != nil {
			b := p.BirthDate.Format("2006-01-02")
			birth = &b
		}
	}

	return promotion.EvaluateCart(items, birth, now, candidates)
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
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

// Delete soft-deletes a sale. If the sale hasn't already been cancelled, it
// runs the same protective steps as Cancel — reverting consumed stock and
// emitting a Nota Crédito for any DIAN invoice already issued — so a deleted
// sale never leaves stale inventory or an unreconciled invoice behind.
func (s *Service) Delete(id uint) error {
	sale, err := s.saleRepo.GetByID(s.db, id)
	if err != nil {
		return err
	}

	if sale.Status != domain.SaleStatusCancelled {
		s.revertStock(context.Background(), sale.ID, sale.BranchID, sale.Items)
		if sale.InvoicingID != "" && sale.CreditNoteID == "" {
			go s.emitCreditNoteAsync(context.Background(), sale)
		}
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
		if t, err := clock.ParseDate(input.PaymentDate); err == nil {
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
	sale.PaymentStatus = derivePaymentStatus(sale.AmountPaid, sale.Total)
	_ = s.saleRepo.Update(s.db, sale)

	// A sale created unpaid (e.g. quoted then paid later) only reaches
	// PaymentStatus "paid" here, never inside Create — so its linked
	// appointment must be marked billed here too, or it never leaves the
	// receptionist's sales queue (docs/GAP_ANALYSIS_HISTORIA_CLINICA_JARVIS.md,
	// section 05 P0#3).
	s.updateAppointmentBilling(sale)

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
	sale.PaymentStatus = derivePaymentStatus(sale.AmountPaid, sale.Total)
	if err := s.saleRepo.Update(s.db, sale); err != nil {
		return nil, err
	}

	return s.saleRepo.GetByID(s.db, saleID)
}

// AddPartialPayment adds an installment (abono) to an existing sale's balance
// and recalculates payment_status, mirroring AddPayment.
func (s *Service) AddPartialPayment(saleID uint, input AddPaymentInput, userID uint) (*domain.Sale, error) {
	sale, err := s.saleRepo.GetByID(s.db, saleID)
	if err != nil {
		return nil, err
	}

	pmID := input.PaymentMethodID
	now := time.Now()
	pd := now
	if input.PaymentDate != "" {
		if t, err := clock.ParseDate(input.PaymentDate); err == nil {
			pd = t
		}
	}
	payment := &domain.PartialPayment{
		SaleID:          saleID,
		PaymentMethodID: &pmID,
		Amount:          input.Amount,
		ReferenceNumber: input.ReferenceNumber,
		PaymentDate:     &pd,
		Notes:           input.Notes,
		CreatedBy:       &userID,
	}

	if err := s.partialPaymentRepo.Create(s.db, payment); err != nil {
		return nil, err
	}

	sale.AmountPaid += input.Amount
	sale.Balance = sale.Total - sale.AmountPaid
	if sale.Balance < 0 {
		sale.Balance = 0
	}
	sale.PaymentStatus = derivePaymentStatus(sale.AmountPaid, sale.Total)
	_ = s.saleRepo.Update(s.db, sale)

	s.logger.Info("partial payment added to sale",
		zap.Uint("sale_id", saleID),
		zap.Float64("amount", input.Amount),
	)
	return s.saleRepo.GetByID(s.db, saleID)
}

// GetPartialPayments returns all installments (abonos) recorded against a sale.
func (s *Service) GetPartialPayments(saleID uint) ([]*domain.PartialPayment, error) {
	if _, err := s.saleRepo.GetByID(s.db, saleID); err != nil {
		return nil, err
	}
	return s.partialPaymentRepo.GetBySaleID(s.db, saleID)
}

// RemovePartialPayment removes an installment (abono) from a sale and
// recalculates payment_status, mirroring RemovePayment.
func (s *Service) RemovePartialPayment(saleID, paymentID uint) (*domain.Sale, error) {
	sale, err := s.saleRepo.GetByID(s.db, saleID)
	if err != nil {
		return nil, err
	}

	var removedAmount float64
	for _, p := range sale.PartialPayments {
		if p.ID == paymentID {
			removedAmount = p.Amount
			break
		}
	}

	if err := s.partialPaymentRepo.Delete(s.db, saleID, paymentID); err != nil {
		return nil, err
	}

	sale.AmountPaid -= removedAmount
	if sale.AmountPaid < 0 {
		sale.AmountPaid = 0
	}
	sale.Balance = sale.Total - sale.AmountPaid
	sale.PaymentStatus = derivePaymentStatus(sale.AmountPaid, sale.Total)
	if err := s.saleRepo.Update(s.db, sale); err != nil {
		return nil, err
	}

	return s.saleRepo.GetByID(s.db, saleID)
}

// Cancel changes a sale's status to cancelled, reverting consumed stock and
// zeroing the outstanding balance — a cancelled sale never shows an amount
// still owed. If money had already been collected, payment_status flips to
// "refunded" (a status the schema already reserves for this case) so the
// sale record and the Nota Crédito emitted below agree on the sale being void.
func (s *Service) Cancel(id uint) (*domain.Sale, error) {
	sale, err := s.saleRepo.GetByID(s.db, id)
	if err != nil {
		return nil, err
	}
	if sale.Status == domain.SaleStatusCancelled {
		return sale, nil
	}

	s.revertStock(context.Background(), sale.ID, sale.BranchID, sale.Items)

	sale.Status = domain.SaleStatusCancelled
	sale.Balance = 0
	if sale.AmountPaid > 0 {
		sale.PaymentStatus = "refunded"
	}
	if err := s.saleRepo.Update(s.db, sale); err != nil {
		return nil, err
	}

	updated, err := s.saleRepo.GetByID(s.db, id)
	if err != nil {
		return nil, err
	}

	go s.emitCreditNoteAsync(context.Background(), updated)

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

// deductStock reduces InventoryItem.Quantity for each SaleItem where Product.TracksStock=true
// and records a StockMovement of type "exit". Resolution order for the source warehouse:
//  1. branch.DefaultWarehouseID (Modelo A — preferred when configured).
//  2. Any InventoryItem belonging to the sale's branch (fallback so a missing
//     default_warehouse_id setting does not silently drop deductions).
//
// Best-effort: logs warnings, never blocks the sale.
func (s *Service) deductStock(ctx context.Context, saleID uint, branchID uint, items []domain.SaleItem, userID uint) {
	var defaultWarehouseID *uint
	if branch, err := s.branchRepo.GetByID(s.db, branchID); err != nil {
		s.logger.Warn("deductStock: branch not found, falling back to branch_id filter",
			zap.Uint("branch_id", branchID),
			zap.Uint("sale_id", saleID),
			zap.Error(err),
		)
	} else {
		defaultWarehouseID = branch.DefaultWarehouseID
	}

	for _, item := range items {
		if item.ProductID == nil {
			continue
		}

		product, err := s.productRepo.GetByID(s.db, *item.ProductID)
		if err != nil {
			s.logger.Warn("deductStock: product not found",
				zap.Uint("product_id", *item.ProductID),
				zap.Uint("sale_id", saleID),
				zap.Error(err),
			)
			continue
		}
		if !product.TracksStock {
			continue
		}

		invItem, sourceWarehouseID, found := s.findStockSource(*item.ProductID, branchID, defaultWarehouseID)
		if !found {
			s.logger.Warn("deductStock: no inventory item found in branch, skipping",
				zap.Uint("product_id", *item.ProductID),
				zap.Uint("branch_id", branchID),
				zap.Uint("sale_id", saleID),
			)
			continue
		}

		requested := item.Quantity
		available := invItem.Quantity

		var deducted int
		switch {
		case available <= 0:
			s.logger.Warn("deductStock: zero stock, sale proceeds without deduction",
				zap.Uint("product_id", *item.ProductID),
				zap.Uint("warehouse_id", sourceWarehouseID),
				zap.Int("requested", requested),
				zap.Uint("sale_id", saleID),
			)
			continue
		case available < requested:
			s.logger.Warn("deductStock: insufficient stock, deducting available only",
				zap.Uint("product_id", *item.ProductID),
				zap.Uint("warehouse_id", sourceWarehouseID),
				zap.Int("available", available),
				zap.Int("requested", requested),
				zap.Uint("sale_id", saleID),
			)
			deducted = available
		default:
			deducted = requested
		}

		productID := *item.ProductID
		quantityBefore := invItem.Quantity
		quantityAfter := quantityBefore - deducted
		refType := domain.ReferenceTypeSale
		saleIDCopy := saleID
		userIDCopy := userID

		txErr := s.db.Transaction(func(tx *gorm.DB) error {
			invItem.Quantity = quantityAfter
			if err := s.itemRepo.Update(tx, &invItem); err != nil {
				return err
			}
			movement := &domain.StockMovement{
				ProductID:      productID,
				WarehouseID:    sourceWarehouseID,
				MovementType:   domain.MovementTypeExit,
				ReferenceType:  &refType,
				ReferenceID:    &saleIDCopy,
				QuantityBefore: quantityBefore,
				QuantityDelta:  -deducted,
				QuantityAfter:  quantityAfter,
				PerformedBy:    &userIDCopy,
				Notes:          "",
			}
			return s.movementRepo.Create(tx, movement)
		})
		if txErr != nil {
			s.logger.Warn("deductStock: failed to record stock deduction in kardex",
				zap.Uint("product_id", *item.ProductID),
				zap.Uint("sale_id", saleID),
				zap.Error(txErr),
			)
		}
	}
}

// findStockSource resolves which InventoryItem to deduct stock from for a sale line.
// It first tries the branch's default warehouse (when configured); if no item is found
// there, it falls back to any InventoryItem in the same branch. Returns the picked
// item, its warehouse_id, and a boolean indicating whether a source was found.
func (s *Service) findStockSource(productID, branchID uint, defaultWarehouseID *uint) (domain.InventoryItem, uint, bool) {
	if defaultWarehouseID != nil {
		pid := productID
		invItems, _, err := s.itemRepo.List(s.db, domain.InventoryItemFilter{
			Pagination:  domain.Pagination{Page: 1, PerPage: 1},
			ProductID:   &pid,
			WarehouseID: defaultWarehouseID,
		})
		if err == nil && len(invItems) > 0 {
			return *invItems[0], *defaultWarehouseID, true
		}
	}

	pid := productID
	bid := branchID
	invItems, _, err := s.itemRepo.List(s.db, domain.InventoryItemFilter{
		Pagination: domain.Pagination{Page: 1, PerPage: 1},
		ProductID:  &pid,
		BranchID:   &bid,
	})
	if err != nil || len(invItems) == 0 {
		return domain.InventoryItem{}, 0, false
	}
	return *invItems[0], invItems[0].WarehouseID, true
}

// revertStock restores InventoryItem.Quantity for each SaleItem where Product.TracksStock=true
// by looking up the original exit movement and writing an adjustment_add movement. Best-effort.
func (s *Service) revertStock(ctx context.Context, saleID uint, branchID uint, items []domain.SaleItem) {
	for _, item := range items {
		if item.ProductID == nil {
			continue
		}

		product, err := s.productRepo.GetByID(s.db, *item.ProductID)
		if err != nil {
			s.logger.Warn("revertStock: product not found",
				zap.Uint("product_id", *item.ProductID),
				zap.Uint("sale_id", saleID),
				zap.Error(err),
			)
			continue
		}
		if !product.TracksStock {
			continue
		}

		origMovement, err := s.movementRepo.FindBySaleAndProduct(s.db, saleID, *item.ProductID)
		if err != nil {
			s.logger.Warn("revertStock: no original exit movement found, skipping",
				zap.Uint("product_id", *item.ProductID),
				zap.Uint("sale_id", saleID),
			)
			continue
		}

		restoredQty := -origMovement.QuantityDelta
		if restoredQty <= 0 {
			continue
		}

		pid := *item.ProductID
		whid := origMovement.WarehouseID
		invItems, _, err := s.itemRepo.List(s.db, domain.InventoryItemFilter{
			Pagination:  domain.Pagination{Page: 1, PerPage: 1},
			ProductID:   &pid,
			WarehouseID: &whid,
		})
		if err != nil || len(invItems) == 0 {
			s.logger.Warn("revertStock: inventory item not found in original warehouse, cannot restore",
				zap.Uint("product_id", *item.ProductID),
				zap.Uint("warehouse_id", origMovement.WarehouseID),
				zap.Uint("sale_id", saleID),
			)
			continue
		}

		invItem := *invItems[0]
		productID := *item.ProductID
		quantityBefore := invItem.Quantity
		quantityAfter := quantityBefore + restoredQty
		warehouseID := invItem.WarehouseID
		refType := domain.ReferenceTypeSale
		saleIDCopy := saleID
		restoredCopy := restoredQty

		txErr := s.db.Transaction(func(tx *gorm.DB) error {
			invItem.Quantity = quantityAfter
			if err := s.itemRepo.Update(tx, &invItem); err != nil {
				return err
			}
			movement := &domain.StockMovement{
				ProductID:      productID,
				WarehouseID:    warehouseID,
				MovementType:   domain.MovementTypeAdjustmentAdd,
				ReferenceType:  &refType,
				ReferenceID:    &saleIDCopy,
				QuantityBefore: quantityBefore,
				QuantityDelta:  restoredCopy,
				QuantityAfter:  quantityAfter,
				Notes:          "stock reversal due to sale cancellation",
			}
			return s.movementRepo.Create(tx, movement)
		})
		if txErr != nil {
			s.logger.Warn("revertStock: failed to record stock reversal",
				zap.Uint("product_id", *item.ProductID),
				zap.Uint("sale_id", saleID),
				zap.Error(txErr),
			)
		}
	}
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

	created, err := s.adjRepo.GetByID(s.db, adj.ID)
	if err != nil {
		return nil, err
	}

	// The adjustment raises the price the patient owes above what the sale was
	// originally created for, so Total/Balance must grow by the same amount —
	// otherwise the sale keeps understating what's actually pending while the
	// Nota Débito emitted below tells DIAN the price went up.
	sale, err := s.saleRepo.GetByID(s.db, saleID)
	if err == nil {
		sale.Total += adj.AdjustmentAmount
		sale.Balance += adj.AdjustmentAmount
		sale.PaymentStatus = derivePaymentStatus(sale.AmountPaid, sale.Total)
		_ = s.saleRepo.Update(s.db, sale)
		go s.emitDebitNoteAsync(context.Background(), sale, created)
	}

	return created, nil
}

// DeleteLensPriceAdjustment removes a lens price adjustment, reverting the
// Total/Balance increase it applied in CreateLensPriceAdjustment.
func (s *Service) DeleteLensPriceAdjustment(saleID, adjID uint) error {
	adj, err := s.adjRepo.GetByID(s.db, adjID)
	if err != nil {
		return err
	}
	if adj.SaleID != saleID {
		return &domain.ErrNotFound{Resource: "lens_price_adjustment"}
	}

	if err := s.adjRepo.Delete(s.db, adjID); err != nil {
		return err
	}

	sale, err := s.saleRepo.GetByID(s.db, saleID)
	if err == nil {
		sale.Total -= adj.AdjustmentAmount
		sale.Balance -= adj.AdjustmentAmount
		if sale.Balance < 0 {
			sale.Balance = 0
		}
		sale.PaymentStatus = derivePaymentStatus(sale.AmountPaid, sale.Total)
		_ = s.saleRepo.Update(s.db, sale)
	}

	return nil
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

// RetryInvoicing re-attempts full DIAN invoice emission for a sale whose
// first attempt failed outright (invoicing_status=error, no invoicing_id was
// ever assigned). The existing contingency-retry endpoint can't reach these
// sales because it requires an invoicing_id to already exist. Runs
// synchronously (unlike the fire-and-forget emitInvoiceAsync calls elsewhere)
// so a manual retry gets an immediate, actionable result.
func (s *Service) RetryInvoicing(id uint) (*domain.Sale, error) {
	sale, err := s.saleRepo.GetByID(s.db, id)
	if err != nil {
		return nil, err
	}
	if sale.InvoicingID != "" {
		return nil, &domain.ErrValidation{
			Field:   "invoicing_status",
			Message: "sale already has an emitted invoice; use the contingency retry endpoint instead",
		}
	}

	s.emitInvoiceAsync(context.Background(), sale)

	return s.saleRepo.GetByID(s.db, id)
}

// emitInvoiceAsync sends the sale to the invoicing API and stores the result.
// Runs in a goroutine — never blocks the sale response.
func (s *Service) emitInvoiceAsync(ctx context.Context, sale *domain.Sale) {
	if !s.invoicing.IsEnabled() {
		return
	}

	patient, err := s.patientRepo.GetByID(s.db, sale.PatientID)
	if err != nil {
		s.logger.Warn("invoicing: patient not found",
			zap.Uint("sale_id", sale.ID), zap.Error(err))
		return
	}

	lines := make([]invoicingclient.LineRequest, 0, len(sale.Items))
	for _, item := range sale.Items {
		qty := float64(item.Quantity)
		if qty == 0 {
			qty = 1
		}
		unitPrice := item.Price
		discountRate := 0.0
		if unitPrice > 0 && item.Discount > 0 {
			discountRate = (item.Discount / (unitPrice * qty)) * 100
		}
		desc := item.Description
		if desc == "" {
			desc = item.Name
		}
		if desc == "" && item.ProductID != nil {
			if prod, perr := s.productRepo.GetByID(s.db, *item.ProductID); perr == nil && prod != nil {
				desc = prod.Description
			}
		}
		if desc == "" {
			desc = fmt.Sprintf("Item #%d", item.ID)
		}
		lines = append(lines, invoicingclient.LineRequest{
			Description:  desc,
			Quantity:     qty,
			UnitPrice:    unitPrice,
			DiscountRate: discountRate,
			IVATreatment: ivaTreatmentForSale(sale),
		})
	}

	if len(lines) == 0 {
		return
	}

	docType := "CC"
	docNumber := patient.Identification
	if patient.IdentificationType != nil {
		docType = patient.IdentificationType.Code
	}
	if docNumber == "" {
		docNumber = fmt.Sprintf("%d", patient.ID)
	}

	req := invoicingclient.EmitRequest{
		ExternalRef:  sale.SaleNumber,
		DocumentType: "FV",
		Recipient: invoicingclient.RecipientRequest{
			DocType:   docType,
			DocNumber: docNumber,
			Name:      patient.FullName(),
			Email:     patient.Email,
		},
		Lines:            lines,
		PaymentMeansCode: paymentMeansCode(sale.Payments),
		Notes:            sale.Notes,
	}

	inv, err := s.invoicing.EmitInvoice(ctx, req)
	if err != nil {
		s.logger.Warn("invoicing: emit failed — sale proceeds",
			zap.Uint("sale_id", sale.ID), zap.Error(err))
		sale.InvoicingStatus = "error"
	} else if inv != nil {
		sale.InvoicingID = fmt.Sprintf("%d", inv.ID)
		sale.InvoicingStatus = inv.DIANStatus
		s.logger.Info("invoicing: invoice emitted",
			zap.Uint("sale_id", sale.ID),
			zap.String("invoice_number", inv.Number),
			zap.String("dian_status", inv.DIANStatus))
	}

	_ = s.saleRepo.Update(s.db, sale)
}

// emitCreditNoteAsync emits a Nota Crédito (NC) for a cancelled sale, referencing the original FV.
// Best-effort: errors are logged but never propagate to the caller.
func (s *Service) emitCreditNoteAsync(ctx context.Context, sale *domain.Sale) {
	if !s.invoicing.IsEnabled() {
		return
	}
	if sale.InvoicingID == "" {
		return
	}

	patient, err := s.patientRepo.GetByID(s.db, sale.PatientID)
	if err != nil {
		s.logger.Warn("invoicing: NC — patient not found",
			zap.Uint("sale_id", sale.ID), zap.Error(err))
		return
	}

	lines := make([]invoicingclient.LineRequest, 0, len(sale.Items))
	for _, item := range sale.Items {
		qty := float64(item.Quantity)
		if qty == 0 {
			qty = 1
		}
		unitPrice := item.Price
		discountRate := 0.0
		if unitPrice > 0 && item.Discount > 0 {
			discountRate = (item.Discount / (unitPrice * qty)) * 100
		}
		desc := item.Description
		if desc == "" {
			desc = item.Name
		}
		if desc == "" && item.ProductID != nil {
			if prod, perr := s.productRepo.GetByID(s.db, *item.ProductID); perr == nil && prod != nil {
				desc = prod.Description
			}
		}
		if desc == "" {
			desc = fmt.Sprintf("Item #%d", item.ID)
		}
		lines = append(lines, invoicingclient.LineRequest{
			Description:  desc,
			Quantity:     qty,
			UnitPrice:    unitPrice,
			DiscountRate: discountRate,
			IVATreatment: ivaTreatmentForSale(sale),
		})
	}

	if len(lines) == 0 {
		return
	}

	docType := "CC"
	docNumber := patient.Identification
	if patient.IdentificationType != nil {
		docType = patient.IdentificationType.Code
	}
	if docNumber == "" {
		docNumber = fmt.Sprintf("%d", patient.ID)
	}

	req := invoicingclient.EmitRequest{
		ExternalRef:  fmt.Sprintf("NC-%s", sale.SaleNumber),
		DocumentType: "NC",
		Recipient: invoicingclient.RecipientRequest{
			DocType:   docType,
			DocNumber: docNumber,
			Name:      patient.FullName(),
			Email:     patient.Email,
		},
		Lines: lines,
		Notes: fmt.Sprintf("Anulación venta %s", sale.SaleNumber),
	}

	inv, err := s.invoicing.EmitCreditNote(ctx, s.invoicing.IssuerID(), sale.InvoicingID, req)
	if err != nil {
		s.logger.Warn("invoicing: NC emit failed",
			zap.Uint("sale_id", sale.ID), zap.Error(err))
		sale.CreditNoteStatus = "error"
	} else if inv != nil {
		sale.CreditNoteID = fmt.Sprintf("%d", inv.ID)
		sale.CreditNoteStatus = inv.DIANStatus
		s.logger.Info("invoicing: NC emitted",
			zap.Uint("sale_id", sale.ID),
			zap.String("credit_note_number", inv.Number),
			zap.String("dian_status", inv.DIANStatus))
	}

	_ = s.saleRepo.Update(s.db, sale)
}

// emitDebitNoteAsync emits a Nota Débito (ND) for a price adjustment on a completed sale.
// Best-effort: errors are logged but never propagate to the caller.
func (s *Service) emitDebitNoteAsync(ctx context.Context, sale *domain.Sale, adj *domain.SaleLensPriceAdjustment) {
	if !s.invoicing.IsEnabled() {
		return
	}
	if sale.InvoicingID == "" {
		return
	}
	if adj.AdjustmentAmount <= 0 {
		return
	}

	patient, err := s.patientRepo.GetByID(s.db, sale.PatientID)
	if err != nil {
		s.logger.Warn("invoicing: ND — patient not found",
			zap.Uint("sale_id", sale.ID), zap.Error(err))
		return
	}

	docType := "CC"
	docNumber := patient.Identification
	if patient.IdentificationType != nil {
		docType = patient.IdentificationType.Code
	}
	if docNumber == "" {
		docNumber = fmt.Sprintf("%d", patient.ID)
	}

	req := invoicingclient.EmitRequest{
		ExternalRef:  fmt.Sprintf("ND-%s-adj%d", sale.SaleNumber, adj.ID),
		DocumentType: "ND",
		Recipient: invoicingclient.RecipientRequest{
			DocType:   docType,
			DocNumber: docNumber,
			Name:      patient.FullName(),
			Email:     patient.Email,
		},
		Lines: []invoicingclient.LineRequest{
			{
				Description:  fmt.Sprintf("Ajuste de precio — %s", adj.Reason),
				Quantity:     1,
				UnitPrice:    adj.AdjustmentAmount,
				IVATreatment: ivaTreatmentForSale(sale),
			},
		},
		Notes: fmt.Sprintf("Ajuste precio venta %s", sale.SaleNumber),
	}

	inv, err := s.invoicing.EmitDebitNote(ctx, s.invoicing.IssuerID(), sale.InvoicingID, req)
	if err != nil {
		s.logger.Warn("invoicing: ND emit failed",
			zap.Uint("sale_id", sale.ID), zap.Error(err))
		adj.DebitNoteStatus = "error"
	} else if inv != nil {
		adj.DebitNoteID = fmt.Sprintf("%d", inv.ID)
		adj.DebitNoteStatus = inv.DIANStatus
		s.logger.Info("invoicing: ND emitted",
			zap.Uint("sale_id", sale.ID),
			zap.String("debit_note_number", inv.Number),
			zap.String("dian_status", inv.DIANStatus))
	}

	_ = s.adjRepo.Update(s.db, adj)
}

// ivaTreatmentForSale derives the DIAN IVA treatment from the tax actually charged
// on the sale, so the electronic invoice always matches what was collected from the
// patient — never a hardcoded classification that can drift out of sync with the
// real total. Convision charges a single IVA rate (ivaRate, 19%) per sale rather
// than per line, so the treatment is uniform across all lines of a given emission.
func ivaTreatmentForSale(sale *domain.Sale) string {
	if sale.Tax > 0 {
		return "gravado_19"
	}
	return "excluido"
}

// paymentMeansCode returns the DIAN payment means code from the first sale payment.
// 10 = cash, 20 = credit card, 42 = transfer, 1 = instrument not defined.
func paymentMeansCode(payments []domain.SalePayment) string {
	if len(payments) == 0 {
		return "1"
	}
	return "10"
}

func (s *Service) createLabOrderIfNeeded(sale *domain.Sale, items []ItemInput, labID *uint, userID uint) {
	hasLens := false
	var lensItem *ItemInput
	var frameItem *ItemInput
	for i := range items {
		it := &items[i]
		if it.LensID != nil || it.ProductType == "lens" {
			hasLens = true
			if lensItem == nil {
				lensItem = it
			}
		} else if it.ProductType == "frame" {
			if frameItem == nil {
				frameItem = it
			}
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
		if lab, err := s.labRepo.GetFirstActive(s.db); err == nil {
			resolvedLabID = &lab.ID
		} else {
			s.logger.Warn("no active laboratory configured; lab order will be created unassigned",
				zap.Uint("sale_id", sale.ID))
		}
	}

	lo := &domain.LaboratoryOrder{
		SaleID:       &sale.ID,
		LaboratoryID: resolvedLabID,
		PatientID:    &sale.PatientID,
		Status:       domain.LaboratoryOrderStatusPending,
		Priority:     "normal",
		CreatedBy:    &userID,
	}

	now := time.Now()
	lo.SaleDate = &now

	if s.branchRepo != nil && sale.BranchID > 0 {
		if br, err := s.branchRepo.GetByID(s.db, sale.BranchID); err == nil && br != nil {
			if br.City != "" {
				lo.Branch = fmt.Sprintf("%s — %s", br.Name, br.City)
			} else {
				lo.Branch = br.Name
			}
		}
	}

	if s.userRepo != nil {
		if seller, err := s.userRepo.GetByID(s.db, userID); err == nil && seller != nil {
			lo.SellerName = seller.Name
		}
	}

	if lensItem != nil {
		desc := lensItem.Description
		if desc == "" {
			desc = lensItem.Name
		}
		lo.LensOD = desc
		lo.LensOI = desc
	}
	if frameItem != nil {
		fs := &domain.FrameSpecs{Name: frameItem.Description}
		if fs.Name == "" {
			fs.Name = frameItem.Name
		}
		lo.FrameSpecs = fs
	}

	if sale.AppointmentID != nil {
		s.populateRxFromAppointment(lo, *sale.AppointmentID)
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
		Notes:             "Orden creada automáticamente desde la venta",
		UserID:            &userID,
	})
	s.logger.Info("lab order created from sale",
		zap.Uint("sale_id", sale.ID),
		zap.Uint("lab_order_id", lo.ID))
}

// populateRxFromAppointment fills lo.RxOD/RxOI (and SpecialInstructions when
// available) from the clinical formula tied to appointmentID.
//
// Source-of-truth decision (docs/GAP_ANALYSIS_HISTORIA_CLINICA_JARVIS.md,
// section 04/09, P0 #1): the signed ClinicalPrescription — reached through
// ClinicalRecordRepository, part of the active clinical-record flow
// (internal/clinicalrecord) that the specialist actually fills and signs
// today — is the primary source. The legacy domain.Prescription (table
// appointment_prescriptions, internal/prescription) is kept only as a
// fallback for appointments that never went through the new clinical-record
// flow; it is NOT removed because it still has live consumers (the
// /api/v1/prescriptions CRUD, PrescriptionForm.tsx and PrescriptionCreate.tsx
// in convision-front — confirmed by repo-wide grep before this change).
func (s *Service) populateRxFromAppointment(lo *domain.LaboratoryOrder, appointmentID uint) {
	if s.clinicalRecordRepo != nil {
		if rec, err := s.clinicalRecordRepo.GetByAppointmentID(s.db, appointmentID); err == nil && rec != nil {
			if p := rec.ClinicalPrescription; p != nil && p.SignedAt != nil {
				lo.RxOD = &domain.RxEye{
					Sphere:   formatDiopter(p.SphOd),
					Cylinder: formatDiopter(p.CylOd),
					Axis:     formatAxis(p.AxisOd),
					Addition: formatDiopter(p.AddOd),
					DP:       formatMillimeters(p.DpOd),
				}
				lo.RxOI = &domain.RxEye{
					Sphere:   formatDiopter(p.SphOi),
					Cylinder: formatDiopter(p.CylOi),
					Axis:     formatAxis(p.AxisOi),
					Addition: formatDiopter(p.AddOi),
					DP:       formatMillimeters(p.DpOi),
				}
				s.logger.Info("lab order formula sourced from signed clinical prescription",
					zap.Uint("appointment_id", appointmentID),
					zap.Uint("clinical_record_id", rec.ID))
				return
			}
		}
	}

	// Fallback: legacy Prescription model (appointment_prescriptions) — only
	// reached when no signed ClinicalPrescription exists for this appointment.
	if s.prescriptionRepo == nil {
		return
	}
	rx, err := s.prescriptionRepo.GetByAppointmentID(s.db, appointmentID)
	if err != nil || rx == nil {
		return
	}
	lo.RxOD = &domain.RxEye{
		Sphere:   rx.RightSphere,
		Cylinder: rx.RightCylinder,
		Axis:     rx.RightAxis,
		Addition: rx.RightAddition,
		DP:       rx.RightDistanceP,
	}
	lo.RxOI = &domain.RxEye{
		Sphere:   rx.LeftSphere,
		Cylinder: rx.LeftCylinder,
		Axis:     rx.LeftAxis,
		Addition: rx.LeftAddition,
		DP:       rx.LeftDistanceP,
	}
	if rx.Recommendation != "" {
		lo.SpecialInstructions = rx.Recommendation
	}
	s.logger.Warn("lab order formula sourced from legacy prescription model — no signed clinical prescription found",
		zap.Uint("appointment_id", appointmentID))
}

// formatDiopter renders an optional diopter value (sphere/cylinder/addition)
// with an explicit sign, matching the notation optometrists use on paper
// formulas (e.g. "+1.25", "-0.50").
func formatDiopter(v *float64) string {
	if v == nil {
		return ""
	}
	return fmt.Sprintf("%+.2f", *v)
}

// formatAxis renders an optional axis value (0-180 degrees) as a plain integer string.
func formatAxis(v *int) string {
	if v == nil {
		return ""
	}
	return strconv.Itoa(*v)
}

// formatMillimeters renders an optional millimeter value (e.g. pupillary distance) with one decimal.
func formatMillimeters(v *float64) string {
	if v == nil {
		return ""
	}
	return fmt.Sprintf("%.1f", *v)
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
