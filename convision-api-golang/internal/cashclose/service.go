package cashclose

import (
	"fmt"
	"math"
	"strings"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// Service handles cash register close read use-cases.
type Service struct {
	repo   domain.CashRegisterCloseRepository
	logger *zap.Logger
}

var allowedPaymentMethods = map[string]struct{}{
	"efectivo":          {},
	"voucher":           {},
	"bancolombia":       {},
	"daviplata":         {},
	"nequi":             {},
	"addi":              {},
	"sistecredito":      {},
	"anticipo":          {},
	"bono":              {},
	"pago_sistecredito": {},
}

var allowedDenominations = map[int]struct{}{
	100000: {},
	50000:  {},
	20000:  {},
	10000:  {},
	5000:   {},
	2000:   {},
	1000:   {},
	500:    {},
	200:    {},
	100:    {},
	50:     {},
}

// NewService creates a new cash register close service.
func NewService(repo domain.CashRegisterCloseRepository, logger *zap.Logger) *Service {
	return &Service{repo: repo, logger: logger}
}

// ListOutput wraps a paginated cash register close response.
type ListOutput struct {
	Data        []*domain.CashRegisterClose `json:"data"`
	Total       int64                       `json:"total"`
	CurrentPage int                         `json:"current_page"`
	PerPage     int                         `json:"per_page"`
	LastPage    int                         `json:"last_page"`
}

type PaymentMethodInput struct {
	Name          string  `json:"name" binding:"required"`
	CountedAmount float64 `json:"counted_amount" binding:"required,min=0"`
}

type DenominationInput struct {
	Denomination int `json:"denomination" binding:"required"`
	Quantity     int `json:"quantity" binding:"required,min=0"`
}

type CreateInput struct {
	BranchID       uint                 `json:"branch_id"`
	CloseDate      string               `json:"close_date" binding:"required"`
	PaymentMethods []PaymentMethodInput `json:"payment_methods" binding:"required"`
	Denominations  []DenominationInput  `json:"denominations"`
	AdvisorNotes   *string              `json:"advisor_notes"`
}

type UpdateInput struct {
	CloseDate      *string               `json:"close_date"`
	PaymentMethods *[]PaymentMethodInput `json:"payment_methods"`
	Denominations  *[]DenominationInput  `json:"denominations"`
	AdvisorNotes   *string               `json:"advisor_notes"`
}

type ApproveInput struct {
	AdminNotes *string `json:"admin_notes"`
}

type AdminActualPaymentInput struct {
	Name         string  `json:"name" binding:"required"`
	ActualAmount float64 `json:"actual_amount" binding:"required,min=0"`
}

type PutAdminActualsInput struct {
	ActualPaymentMethods []AdminActualPaymentInput `json:"actual_payment_methods" binding:"required"`
}

// List returns cash register closes scoped by role.
func (s *Service) List(db *gorm.DB, filters map[string]any, page, perPage int, role domain.Role, userID uint) (*ListOutput, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 15
	}
	if filters == nil {
		filters = map[string]any{}
	}

	if role != domain.RoleAdmin {
		filters["user_id"] = userID
	}

	data, total, err := s.repo.List(db, filters, page, perPage)
	if err != nil {
		return nil, err
	}

	lastPage := 1
	if total > 0 {
		lastPage = int(math.Ceil(float64(total) / float64(perPage)))
	}

	s.logger.Debug("listed cash register closes", zap.Int("count", len(data)), zap.Int64("total", total), zap.String("role", string(role)))

	return &ListOutput{
		Data:        data,
		Total:       total,
		CurrentPage: page,
		PerPage:     perPage,
		LastPage:    lastPage,
	}, nil
}

// GetByID returns one close and enforces role-based visibility.
func (s *Service) GetByID(db *gorm.DB, id uint, role domain.Role, userID uint) (*domain.CashRegisterClose, error) {
	item, err := s.repo.GetByID(db, id)
	if err != nil {
		return nil, err
	}

	if role != domain.RoleAdmin && item.UserID != userID {
		return nil, &domain.ErrUnauthorized{Action: "view cash register close"}
	}

	return item, nil
}

func (s *Service) Create(db *gorm.DB, input CreateInput, userID uint) (*domain.CashRegisterClose, error) {
	closeDate, err := parseAndValidateCloseDate(input.CloseDate)
	if err != nil {
		return nil, err
	}

	payments, totalCounted, err := validateAndMapPayments(input.PaymentMethods, true)
	if err != nil {
		return nil, err
	}

	denoms, err := validateAndMapDenominations(input.Denominations)
	if err != nil {
		return nil, err
	}

	notes := sanitizeOptionalText(input.AdvisorNotes, 2000)

	// UPSERT logic: check for an existing close for this (user_id, close_date).
	existing, lookupErr := s.repo.GetByUserAndDate(db, userID, input.CloseDate)
	if lookupErr == nil {
		// A record already exists for this user+date.
		switch existing.Status {
		case domain.CashRegisterCloseStatusSubmitted, domain.CashRegisterCloseStatusApproved:
			return nil, &domain.ErrConflict{Resource: "cash_register_close", Field: "Ya existe un cierre para esta fecha en estado " + string(existing.Status) + ". No se puede crear otro."}
		default:
			// Status is draft — update the existing draft in place and return it.
			existing.TotalCounted = totalCounted
			existing.AdvisorNotes = notes
			if err := s.repo.Update(db, existing, &payments, &denoms); err != nil {
				return nil, err
			}
			s.logger.Info("cash register close draft reused (upsert)", zap.Uint("id", existing.ID), zap.Uint("user_id", userID))
			return s.repo.GetByID(db, existing.ID)
		}
	}

	// No existing close — create a new one.
	item := &domain.CashRegisterClose{
		BranchID:     input.BranchID,
		UserID:       userID,
		CloseDate:    closeDate,
		Status:       domain.CashRegisterCloseStatusDraft,
		TotalCounted: totalCounted,
		AdvisorNotes: notes,
	}

	if err := s.repo.Create(db, item, payments, denoms); err != nil {
		return nil, err
	}

	s.logger.Info("cash register close created", zap.Uint("id", item.ID), zap.Uint("user_id", userID))
	return s.repo.GetByID(db, item.ID)
}

func (s *Service) Update(db *gorm.DB, id uint, input UpdateInput, role domain.Role, userID uint) (*domain.CashRegisterClose, error) {
	item, err := s.repo.GetByID(db, id)
	if err != nil {
		return nil, err
	}

	if !canAccessClose(role, userID, item.UserID) {
		return nil, &domain.ErrUnauthorized{Action: "update cash register close"}
	}
	if item.Status != domain.CashRegisterCloseStatusDraft {
		return nil, &domain.ErrValidation{Field: "status", Message: "solo se pueden editar cierres en estado borrador"}
	}

	var mappedPayments *[]domain.CashRegisterClosePayment
	if input.PaymentMethods != nil {
		payments, totalCounted, err := validateAndMapPayments(*input.PaymentMethods, false)
		if err != nil {
			return nil, err
		}
		mappedPayments = &payments
		item.TotalCounted = totalCounted
	}

	var mappedDenoms *[]domain.CashCountDenomination
	if input.Denominations != nil {
		denoms, err := validateAndMapDenominations(*input.Denominations)
		if err != nil {
			return nil, err
		}
		mappedDenoms = &denoms
	}

	if input.CloseDate != nil {
		closeDate, err := parseAndValidateCloseDate(*input.CloseDate)
		if err != nil {
			return nil, err
		}
		item.CloseDate = closeDate
	}

	if input.AdvisorNotes != nil {
		item.AdvisorNotes = sanitizeOptionalText(input.AdvisorNotes, 2000)
	}

	if err := s.repo.Update(db, item, mappedPayments, mappedDenoms); err != nil {
		return nil, err
	}

	s.logger.Info("cash register close updated", zap.Uint("id", item.ID))
	return s.repo.GetByID(db, item.ID)
}

func (s *Service) Submit(db *gorm.DB, id uint, role domain.Role, userID uint) (*domain.CashRegisterClose, error) {
	item, err := s.repo.GetByID(db, id)
	if err != nil {
		return nil, err
	}

	if !canAccessClose(role, userID, item.UserID) {
		return nil, &domain.ErrUnauthorized{Action: "submit cash register close"}
	}
	if item.Status != domain.CashRegisterCloseStatusDraft {
		return nil, &domain.ErrValidation{Field: "status", Message: "solo se pueden enviar cierres en estado borrador"}
	}

	totalPayment := 0.0
	for _, p := range item.Payments {
		totalPayment += p.CountedAmount
	}
	totalDenoms := 0.0
	for _, d := range item.Denominations {
		totalDenoms += d.Subtotal
	}
	if totalPayment <= 0 && totalDenoms <= 0 {
		return nil, &domain.ErrValidation{Field: "submit", Message: "no se puede enviar un cierre sin montos"}
	}

	item.TotalCounted = totalPayment
	item.Status = domain.CashRegisterCloseStatusSubmitted
	if err := s.repo.Update(db, item, nil, nil); err != nil {
		return nil, err
	}

	s.logger.Info("cash register close submitted", zap.Uint("id", item.ID))
	return s.repo.GetByID(db, item.ID)
}

func (s *Service) Approve(db *gorm.DB, id uint, adminID uint, input ApproveInput) (*domain.CashRegisterClose, error) {
	item, err := s.repo.GetByID(db, id)
	if err != nil {
		return nil, err
	}
	if item.Status != domain.CashRegisterCloseStatusSubmitted {
		return nil, &domain.ErrValidation{Field: "status", Message: "solo se pueden aprobar cierres en estado enviado"}
	}

	now := time.Now().UTC()
	item.Status = domain.CashRegisterCloseStatusApproved
	item.ApprovedBy = &adminID
	item.ApprovedAt = &now
	item.AdminNotes = sanitizeOptionalText(input.AdminNotes, 1000)

	if err := s.repo.Update(db, item, nil, nil); err != nil {
		return nil, err
	}

	s.logger.Info("cash register close approved", zap.Uint("id", item.ID), zap.Uint("admin_id", adminID))
	return s.repo.GetByID(db, item.ID)
}

func (s *Service) ReturnToDraft(db *gorm.DB, id uint, input ApproveInput) (*domain.CashRegisterClose, error) {
	item, err := s.repo.GetByID(db, id)
	if err != nil {
		return nil, err
	}
	if item.Status != domain.CashRegisterCloseStatusSubmitted {
		return nil, &domain.ErrValidation{Field: "status", Message: "solo se pueden devolver cierres en estado enviado"}
	}

	item.Status = domain.CashRegisterCloseStatusDraft
	item.AdminNotes = sanitizeOptionalText(input.AdminNotes, 1000)
	if err := s.repo.Update(db, item, nil, nil); err != nil {
		return nil, err
	}

	s.logger.Info("cash register close returned to draft", zap.Uint("id", item.ID))
	return s.repo.GetByID(db, item.ID)
}

func (s *Service) PutAdminActuals(db *gorm.DB, id uint, input PutAdminActualsInput) (*domain.CashRegisterClose, error) {
	if len(input.ActualPaymentMethods) != len(allowedPaymentMethods) {
		return nil, &domain.ErrValidation{Field: "actual_payment_methods", Message: fmt.Sprintf("debe enviar exactamente %d medios de pago", len(allowedPaymentMethods))}
	}

	seen := map[string]struct{}{}
	mapped := make([]domain.CashRegisterCloseActualPayment, 0, len(input.ActualPaymentMethods))
	for _, row := range input.ActualPaymentMethods {
		name := strings.TrimSpace(strings.ToLower(row.Name))
		if _, ok := allowedPaymentMethods[name]; !ok {
			return nil, &domain.ErrValidation{Field: "actual_payment_methods.name", Message: "medio de pago no permitido"}
		}
		if _, exists := seen[name]; exists {
			return nil, &domain.ErrValidation{Field: "actual_payment_methods", Message: "no se permiten medios de pago duplicados"}
		}
		seen[name] = struct{}{}
		if row.ActualAmount < 0 {
			return nil, &domain.ErrValidation{Field: "actual_payment_methods.actual_amount", Message: "debe ser mayor o igual a 0"}
		}
		mapped = append(mapped, domain.CashRegisterCloseActualPayment{
			PaymentMethodName: name,
			ActualAmount:      row.ActualAmount,
		})
	}

	if _, err := s.repo.GetByID(db, id); err != nil {
		return nil, err
	}
	if err := s.repo.SyncActualPayments(db, id, mapped); err != nil {
		return nil, err
	}

	s.logger.Info("cash register close admin actuals synced", zap.Uint("id", id))
	return s.repo.GetByID(db, id)
}

// Delete removes a cash register close. Only admins or the owner can delete draft closes.
func (s *Service) Delete(db *gorm.DB, id uint, role domain.Role, userID uint) error {
	item, err := s.repo.GetByID(db, id)
	if err != nil {
		return err
	}

	if role != domain.RoleAdmin && item.UserID != userID {
		return &domain.ErrUnauthorized{Action: "delete cash register close"}
	}
	if item.Status != domain.CashRegisterCloseStatusDraft {
		return &domain.ErrValidation{Field: "status", Message: "solo se pueden eliminar cierres en estado borrador"}
	}

	if err := s.repo.Delete(db, id); err != nil {
		return err
	}

	s.logger.Info("cash register close deleted", zap.Uint("id", id))
	return nil
}

// -------------------------------------------------------------------
// AdvisorsPending — mirrors Laravel's CashRegisterCloseController::advisorsPending
// -------------------------------------------------------------------

// AdvisorCloseItem is the minimal close shape returned inside each advisor card.
type AdvisorCloseItem struct {
	ID        uint    `json:"id"`
	CloseDate string  `json:"close_date"`
	Status    string  `json:"status"`
	Total     float64 `json:"total_counted"`
}

// AdvisorPendingRow represents the aggregated summary for one advisor.
type AdvisorPendingRow struct {
	UserID              uint               `json:"user_id"`
	UserName            string             `json:"user_name"`
	PendingCount        int                `json:"pending_count"`
	CloseDates          []string           `json:"close_dates"`
	TotalToday          float64            `json:"total_today"`
	TotalYesterday      *float64           `json:"total_yesterday"`
	AccumulatedVariance *float64           `json:"accumulated_variance"`
	LatestStatus        string             `json:"latest_status"`
	Closes              []AdvisorCloseItem `json:"closes"`
}

// AdvisorsPendingOutput is the full response body.
type AdvisorsPendingOutput struct {
	Data []AdvisorPendingRow `json:"data"`
}

// AdvisorsPending fetches all draft/submitted closes and groups them per advisor.
// Only one DB round-trip is performed (+ one preload query for users).
func (s *Service) AdvisorsPending(db *gorm.DB, branchID uint) (*AdvisorsPendingOutput, error) {
	statuses := []domain.CashRegisterCloseStatus{
		domain.CashRegisterCloseStatusDraft,
		domain.CashRegisterCloseStatusSubmitted,
	}
	closes, err := s.repo.ListByStatuses(db, statuses, branchID)
	if err != nil {
		return nil, err
	}

	// Group by user_id preserving insertion order (already sorted by close_date DESC).
	order := []uint{}
	byUser := map[uint][]*domain.CashRegisterClose{}
	for _, c := range closes {
		if _, exists := byUser[c.UserID]; !exists {
			order = append(order, c.UserID)
		}
		byUser[c.UserID] = append(byUser[c.UserID], c)
	}

	rows := make([]AdvisorPendingRow, 0, len(order))
	for _, uid := range order {
		userCloses := byUser[uid]
		latest := userCloses[0]

		// Build user name
		userName := "Sin nombre"
		if latest.User != nil {
			parts := strings.TrimSpace(latest.User.Name + " " + latest.User.LastName)
			if parts != "" {
				userName = parts
			}
		}

		// Second most recent close (for "yesterday" total)
		var totalYesterday *float64
		if len(userCloses) > 1 {
			v := userCloses[1].TotalCounted
			totalYesterday = &v
		}

		// Accumulated variance — only computed when at least one close has admin actuals recorded.
		var accumulatedVariance *float64
		hasVariance := false
		var variance float64
		for _, c := range userCloses {
			if c.AdminActualsRecordedAt != nil {
				hasVariance = true
				variance += c.TotalActualAmount - c.TotalCounted
			}
		}
		if hasVariance {
			accumulatedVariance = &variance
		}

		// Close dates list
		closeDates := make([]string, 0, len(userCloses))
		for _, c := range userCloses {
			if c.CloseDate != nil {
				closeDates = append(closeDates, c.CloseDate.UTC().Format("2006-01-02"))
			}
		}

		// Inline closes array
		items := make([]AdvisorCloseItem, 0, len(userCloses))
		for _, c := range userCloses {
			cd := ""
			if c.CloseDate != nil {
				cd = c.CloseDate.UTC().Format("2006-01-02")
			}
			items = append(items, AdvisorCloseItem{
				ID:        c.ID,
				CloseDate: cd,
				Status:    string(c.Status),
				Total:     c.TotalCounted,
			})
		}

		rows = append(rows, AdvisorPendingRow{
			UserID:              uid,
			UserName:            userName,
			PendingCount:        len(userCloses),
			CloseDates:          closeDates,
			TotalToday:          latest.TotalCounted,
			TotalYesterday:      totalYesterday,
			AccumulatedVariance: accumulatedVariance,
			LatestStatus:        string(latest.Status),
			Closes:              items,
		})
	}

	return &AdvisorsPendingOutput{Data: rows}, nil
}

type CalendarClosePayment struct {
	Name          string  `json:"name"`
	CountedAmount float64 `json:"counted_amount"`
}

type CalendarCloseDenomination struct {
	Denomination int     `json:"denomination"`
	Quantity     int     `json:"quantity"`
	Subtotal     float64 `json:"subtotal"`
}

type CalendarClose struct {
	ID                uint                        `json:"id"`
	Status            string                      `json:"status"`
	TotalCounted      float64                     `json:"total_counted"`
	TotalActualAmount *float64                    `json:"total_actual_amount"`
	CashCounted       float64                     `json:"cash_counted"`
	Variance          *float64                    `json:"variance"`
	AdvisorNotes      *string                     `json:"advisor_notes"`
	AdminNotes        *string                     `json:"admin_notes"`
	ApprovedAt        *string                     `json:"approved_at"`
	SubmittedAt       *string                     `json:"submitted_at"`
	PaymentMethods    []CalendarClosePayment      `json:"payment_methods"`
	Denominations     []CalendarCloseDenomination `json:"denominations"`
}

type CalendarDay struct {
	Date      string         `json:"date"`
	DayNumber string         `json:"day_number"`
	DayName   string         `json:"day_name"`
	MonthName string         `json:"month_name"`
	IsToday   bool           `json:"is_today"`
	Close     *CalendarClose `json:"close"`
}

type CalendarApprovedDay struct {
	ID                uint     `json:"id"`
	Index             int      `json:"index"`
	CloseDate         string   `json:"close_date"`
	TotalCounted      float64  `json:"total_counted"`
	TotalActualAmount *float64 `json:"total_actual_amount"`
	Variance          *float64 `json:"variance"`
}

type CalendarSummary struct {
	ApprovedCount         int                   `json:"approved_count"`
	PendingCount          int                   `json:"pending_count"`
	ApprovedTotal         float64               `json:"approved_total"`
	ApprovedActualTotal   *float64              `json:"approved_actual_total"`
	ApprovedVarianceTotal *float64              `json:"approved_variance_total"`
	ApprovedDays          []CalendarApprovedDay `json:"approved_days"`
}

type CalendarOutput struct {
	DateFrom string          `json:"date_from"`
	DateTo   string          `json:"date_to"`
	Days     []CalendarDay   `json:"days"`
	Summary  CalendarSummary `json:"summary"`
}

// -------------------------------------------------------------------
// Consolidated — admin aggregated view across all advisors for a date range
// -------------------------------------------------------------------

type ConsolidatedKPIs struct {
	TotalCloses    int     `json:"total_closes"`
	TotalDeclared  float64 `json:"total_declared"`
	TotalCounted   float64 `json:"total_counted"`
	NetVariance    float64 `json:"net_variance"`
	VariancePct    float64 `json:"variance_pct"`
	AdvisorsCount  int     `json:"advisors_count"`
	DaysInPeriod   int     `json:"days_in_period"`
}

type ConsolidatedBreakdown struct {
	ApprovedCount   int     `json:"approved_count"`
	ApprovedTotal   float64 `json:"approved_total"`
	ApprovedPct     float64 `json:"approved_pct"`
	PendingCount    int     `json:"pending_count"`
	PendingTotal    float64 `json:"pending_total"`
	WithVarianceCount int   `json:"with_variance_count"`
	NetVariance     float64 `json:"net_variance"`
}

type ConsolidatedAdvisorRow struct {
	UserID         uint    `json:"user_id"`
	UserName       string  `json:"user_name"`
	Initials       string  `json:"initials"`
	Sede           string  `json:"sede"`
	ClosesCount    int     `json:"closes_count"`
	TotalDeclared  float64 `json:"total_declared"`
	TotalCounted   float64 `json:"total_counted"`
	Variance       float64 `json:"variance"`
	SobraFalta     float64 `json:"sobra_falta"`
	LatestStatus   string  `json:"latest_status"`
	HasReconciled  bool    `json:"has_reconciled"`
}

type ConsolidatedReconRow struct {
	ID             uint    `json:"id"`
	CloseDate      string  `json:"close_date"`
	UserID         uint    `json:"user_id"`
	UserName       string  `json:"user_name"`
	TotalDeclared  float64 `json:"total_declared"`
	TotalCounted   float64 `json:"total_counted"`
	Variance       float64 `json:"variance"`
	SobraFalta     float64 `json:"sobra_falta"`
	Status         string  `json:"status"`
}

type ConsolidatedTotals struct {
	ClosesCount   int     `json:"closes_count"`
	TotalDeclared float64 `json:"total_declared"`
	TotalCounted  float64 `json:"total_counted"`
	Variance      float64 `json:"variance"`
	SobraFalta    float64 `json:"sobra_falta"`
}

type ConsolidatedOutput struct {
	DateFrom      string                   `json:"date_from"`
	DateTo        string                   `json:"date_to"`
	KPIs          ConsolidatedKPIs         `json:"kpis"`
	Breakdown     ConsolidatedBreakdown    `json:"breakdown"`
	Advisors      []ConsolidatedAdvisorRow `json:"advisors"`
	Totals        ConsolidatedTotals       `json:"totals"`
	Reconciliation []ConsolidatedReconRow  `json:"reconciliation"`
}

func computeInitials(name string) string {
	parts := strings.Fields(strings.TrimSpace(name))
	if len(parts) == 0 {
		return "--"
	}
	if len(parts) == 1 {
		r := []rune(parts[0])
		if len(r) >= 2 {
			return strings.ToUpper(string(r[:2]))
		}
		return strings.ToUpper(string(r))
	}
	first := []rune(parts[0])
	last := []rune(parts[len(parts)-1])
	if len(first) == 0 || len(last) == 0 {
		return "--"
	}
	return strings.ToUpper(string(first[0]) + string(last[0]))
}

// Consolidated returns the admin aggregated view for cash register closes within a date range.
// branchNameMap maps branch IDs to their names, used to populate the Sede field per advisor.
func (s *Service) Consolidated(db *gorm.DB, branchID uint, branchNameMap map[uint]string, dateFrom, dateTo string) (*ConsolidatedOutput, error) {
	now := time.Now().UTC()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)

	to := today
	if strings.TrimSpace(dateTo) != "" {
		parsed, err := time.ParseInLocation("2006-01-02", dateTo, time.UTC)
		if err != nil {
			return nil, &domain.ErrValidation{Field: "date_to", Message: "formato inválido (YYYY-MM-DD)"}
		}
		to = parsed
	}

	from := to.AddDate(0, 0, -13)
	if strings.TrimSpace(dateFrom) != "" {
		parsed, err := time.ParseInLocation("2006-01-02", dateFrom, time.UTC)
		if err != nil {
			return nil, &domain.ErrValidation{Field: "date_from", Message: "formato inválido (YYYY-MM-DD)"}
		}
		from = parsed
	}

	if from.After(to) {
		from, to = to, from
	}

	fromStr := from.Format("2006-01-02")
	toStr := to.Format("2006-01-02")
	daysInPeriod := int(to.Sub(from).Hours()/24) + 1

	filters := map[string]any{
		"date_from": fromStr,
		"date_to":   toStr,
	}
	if branchID > 0 {
		filters["branch_id"] = branchID
	}

	closes, _, err := s.repo.List(db, filters, 1, 10000)
	if err != nil {
		return nil, err
	}

	type advisorAgg struct {
		userID       uint
		userName     string
		closesCount  int
		totalDecl    float64
		totalCount   float64
		variance     float64
		latestDate   time.Time
		latestStatus string
		hasRecon     bool
		branchID     uint
	}

	byUser := map[uint]*advisorAgg{}
	order := []uint{}

	totalDeclared := 0.0
	totalCounted := 0.0
	netVariance := 0.0
	reconDeclared := 0.0 // declared sum only for reconciled closes (QA-CC-002)
	approvedCount := 0
	approvedTotal := 0.0
	pendingCount := 0
	pendingTotal := 0.0
	withVarianceCount := 0

	recon := make([]ConsolidatedReconRow, 0)

	for _, c := range closes {
		userName := "Sin nombre"
		if c.User != nil {
			n := strings.TrimSpace(c.User.Name + " " + c.User.LastName)
			if n != "" {
				userName = n
			}
		}

		declared := c.TotalCounted
		var counted float64
		var variance float64
		hasRecon := c.AdminActualsRecordedAt != nil
		if hasRecon {
			counted = c.TotalActualAmount
			variance = round2(counted - declared)
		}

		totalDeclared += declared
		if hasRecon {
			totalCounted += counted
			netVariance += variance
			reconDeclared += declared // QA-CC-002: track declared for reconciled closes only
			if variance != 0 {
				withVarianceCount++
			}
		} else {
			totalCounted += declared // QA-CC-001: use advisor-declared as proxy when no actuals yet
		}

		switch c.Status {
		case domain.CashRegisterCloseStatusApproved:
			approvedCount++
			approvedTotal += declared
		case domain.CashRegisterCloseStatusSubmitted:
			pendingCount++
			pendingTotal += declared
		}

		agg, ok := byUser[c.UserID]
		if !ok {
			agg = &advisorAgg{
				userID:   c.UserID,
				userName: userName,
			}
			byUser[c.UserID] = agg
			order = append(order, c.UserID)
		}
		agg.closesCount++
		agg.totalDecl += declared
		if hasRecon {
			agg.totalCount += counted
			agg.variance += variance
			agg.hasRecon = true
		}
		if c.CloseDate != nil && c.CloseDate.After(agg.latestDate) {
			agg.latestDate = *c.CloseDate
			agg.latestStatus = string(c.Status)
			agg.branchID = c.BranchID
		}

		if hasRecon && variance != 0 {
			closeDate := ""
			if c.CloseDate != nil {
				closeDate = c.CloseDate.UTC().Format("2006-01-02")
			}
			recon = append(recon, ConsolidatedReconRow{
				ID:            c.ID,
				CloseDate:     closeDate,
				UserID:        c.UserID,
				UserName:      userName,
				TotalDeclared: round2(declared),
				TotalCounted:  round2(counted),
				Variance:      variance,
				SobraFalta:    variance,
				Status:        string(c.Status),
			})
		}
	}

	advisors := make([]ConsolidatedAdvisorRow, 0, len(order))
	for _, uid := range order {
		a := byUser[uid]
		if !a.hasRecon {
			a.totalCount = a.totalDecl
		}
		advisorBranchName := ""
		if branchNameMap != nil {
			if name, ok := branchNameMap[a.branchID]; ok {
				advisorBranchName = name
			}
		}
		advisors = append(advisors, ConsolidatedAdvisorRow{
			UserID:        a.userID,
			UserName:      a.userName,
			Initials:      computeInitials(a.userName),
			Sede:          advisorBranchName,
			ClosesCount:   a.closesCount,
			TotalDeclared: round2(a.totalDecl),
			TotalCounted:  round2(a.totalCount),
			Variance:      round2(a.variance),
			SobraFalta:    round2(a.variance),
			LatestStatus:  a.latestStatus,
			HasReconciled: a.hasRecon,
		})
	}

	pct := 0.0
	if reconDeclared > 0 {
		pct = round2((netVariance / reconDeclared) * 100) // QA-CC-002: denominator = reconciled declared
	}
	approvedPct := 0.0
	if len(closes) > 0 {
		approvedPct = round2((float64(approvedCount) / float64(len(closes))) * 100)
	}

	totalsCounted := totalCounted // QA-CC-001: with option-c, non-reconciled closes use declared as counted

	return &ConsolidatedOutput{
		DateFrom: fromStr,
		DateTo:   toStr,
		KPIs: ConsolidatedKPIs{
			TotalCloses:   len(closes),
			TotalDeclared: round2(totalDeclared),
			TotalCounted:  round2(totalsCounted),
			NetVariance:   round2(netVariance),
			VariancePct:   pct,
			AdvisorsCount: len(advisors),
			DaysInPeriod:  daysInPeriod,
		},
		Breakdown: ConsolidatedBreakdown{
			ApprovedCount:     approvedCount,
			ApprovedTotal:     round2(approvedTotal),
			ApprovedPct:       approvedPct,
			PendingCount:      pendingCount,
			PendingTotal:      round2(pendingTotal),
			WithVarianceCount: withVarianceCount,
			NetVariance:       round2(netVariance),
		},
		Advisors: advisors,
		Totals: ConsolidatedTotals{
			ClosesCount:   len(closes),
			TotalDeclared: round2(totalDeclared),
			TotalCounted:  round2(totalsCounted),
			Variance:      round2(netVariance),
			SobraFalta:    round2(netVariance),
		},
		Reconciliation: recon,
	}, nil
}

func (s *Service) CalendarForAdvisor(db *gorm.DB, userID uint, branchID uint, dateFrom, dateTo string) (*CalendarOutput, error) {
	if userID == 0 {
		return nil, &domain.ErrValidation{Field: "user_id", Message: "es requerido"}
	}

	now := time.Now().UTC()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)

	to := today
	if strings.TrimSpace(dateTo) != "" {
		parsed, err := time.ParseInLocation("2006-01-02", dateTo, time.UTC)
		if err != nil {
			return nil, &domain.ErrValidation{Field: "date_to", Message: "formato inválido (YYYY-MM-DD)"}
		}
		to = parsed
	}

	from := to.AddDate(0, 0, -13)
	if strings.TrimSpace(dateFrom) != "" {
		parsed, err := time.ParseInLocation("2006-01-02", dateFrom, time.UTC)
		if err != nil {
			return nil, &domain.ErrValidation{Field: "date_from", Message: "formato inválido (YYYY-MM-DD)"}
		}
		from = parsed
	}

	if from.After(to) {
		from, to = to, from
	}

	fromStr := from.Format("2006-01-02")
	toStr := to.Format("2006-01-02")
	closes, err := s.repo.ListByUserAndDateRange(db, userID, branchID, fromStr, toStr)
	if err != nil {
		return nil, err
	}

	byDate := map[string]*domain.CashRegisterClose{}
	for _, c := range closes {
		if c.CloseDate == nil {
			continue
		}
		byDate[c.CloseDate.UTC().Format("2006-01-02")] = c
	}

	days := make([]CalendarDay, 0)
	for d := from; !d.After(to); d = d.AddDate(0, 0, 1) {
		key := d.Format("2006-01-02")
		dayClose := byDate[key]
		days = append(days, CalendarDay{
			Date:      key,
			DayNumber: d.Format("02"),
			DayName:   spanishDayName(d.Weekday()),
			MonthName: spanishMonthName(d.Month()),
			IsToday:   d.Equal(today),
			Close:     formatCloseForCalendar(dayClose),
		})
	}

	approvedDays := make([]CalendarApprovedDay, 0)
	pendingCount := 0
	approvedTotal := 0.0
	actuals := make([]float64, 0)
	variances := make([]float64, 0)
	index := 1

	for _, c := range closes {
		if c.Status == domain.CashRegisterCloseStatusSubmitted {
			pendingCount++
		}
		if c.Status != domain.CashRegisterCloseStatusApproved {
			continue
		}

		approvedTotal += c.TotalCounted
		var actualPtr *float64
		var variancePtr *float64
		if c.AdminActualsRecordedAt != nil {
			actual := c.TotalActualAmount
			variance := round2(c.TotalCounted - c.TotalActualAmount)
			actualPtr = &actual
			variancePtr = &variance
			actuals = append(actuals, actual)
			variances = append(variances, variance)
		}

		closeDate := ""
		if c.CloseDate != nil {
			closeDate = c.CloseDate.UTC().Format("2006-01-02")
		}

		approvedDays = append(approvedDays, CalendarApprovedDay{
			ID:                c.ID,
			Index:             index,
			CloseDate:         closeDate,
			TotalCounted:      c.TotalCounted,
			TotalActualAmount: actualPtr,
			Variance:          variancePtr,
		})
		index++
	}

	var approvedActualTotal *float64
	if len(actuals) > 0 {
		sum := 0.0
		for _, v := range actuals {
			sum += v
		}
		r := round2(sum)
		approvedActualTotal = &r
	}

	var approvedVarianceTotal *float64
	if len(variances) > 0 {
		sum := 0.0
		for _, v := range variances {
			sum += v
		}
		r := round2(sum)
		approvedVarianceTotal = &r
	}

	return &CalendarOutput{
		DateFrom: fromStr,
		DateTo:   toStr,
		Days:     days,
		Summary: CalendarSummary{
			ApprovedCount:         len(approvedDays),
			PendingCount:          pendingCount,
			ApprovedTotal:         round2(approvedTotal),
			ApprovedActualTotal:   approvedActualTotal,
			ApprovedVarianceTotal: approvedVarianceTotal,
			ApprovedDays:          approvedDays,
		},
	}, nil
}

func validateAndMapPayments(rows []PaymentMethodInput, required bool) ([]domain.CashRegisterClosePayment, float64, error) {
	if required && len(rows) == 0 {
		return nil, 0, &domain.ErrValidation{Field: "payment_methods", Message: "es requerido"}
	}

	seen := map[string]struct{}{}
	mapped := make([]domain.CashRegisterClosePayment, 0, len(rows))
	total := 0.0
	for _, row := range rows {
		name := strings.TrimSpace(strings.ToLower(row.Name))
		if _, ok := allowedPaymentMethods[name]; !ok {
			return nil, 0, &domain.ErrValidation{Field: "payment_methods.name", Message: "medio de pago no permitido"}
		}
		if _, exists := seen[name]; exists {
			return nil, 0, &domain.ErrValidation{Field: "payment_methods", Message: "no se permiten medios de pago duplicados"}
		}
		seen[name] = struct{}{}
		if row.CountedAmount < 0 {
			return nil, 0, &domain.ErrValidation{Field: "payment_methods.counted_amount", Message: "debe ser mayor o igual a 0"}
		}
		total += row.CountedAmount
		mapped = append(mapped, domain.CashRegisterClosePayment{
			PaymentMethodName: name,
			CountedAmount:     row.CountedAmount,
		})
	}
	return mapped, total, nil
}

func validateAndMapDenominations(rows []DenominationInput) ([]domain.CashCountDenomination, error) {
	if rows == nil {
		return []domain.CashCountDenomination{}, nil
	}
	mapped := make([]domain.CashCountDenomination, 0, len(rows))
	for _, row := range rows {
		if _, ok := allowedDenominations[row.Denomination]; !ok {
			return nil, &domain.ErrValidation{Field: "denominations.denomination", Message: "denominación no permitida"}
		}
		if row.Quantity < 0 {
			return nil, &domain.ErrValidation{Field: "denominations.quantity", Message: "debe ser mayor o igual a 0"}
		}
		subtotal := float64(row.Denomination * row.Quantity)
		mapped = append(mapped, domain.CashCountDenomination{
			Denomination: row.Denomination,
			Quantity:     row.Quantity,
			Subtotal:     subtotal,
		})
	}
	return mapped, nil
}

func parseAndValidateCloseDate(s string) (*time.Time, error) {
	parsed, err := time.ParseInLocation("2006-01-02", strings.TrimSpace(s), time.UTC)
	if err != nil {
		return nil, &domain.ErrValidation{Field: "close_date", Message: "formato inválido (YYYY-MM-DD)"}
	}
	today := time.Now().UTC()
	today = time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, time.UTC)
	if parsed.After(today) {
		return nil, &domain.ErrValidation{Field: "close_date", Message: "no puede ser futura"}
	}
	return &parsed, nil
}

func sanitizeOptionalText(v *string, max int) string {
	if v == nil {
		return ""
	}
	trimmed := strings.TrimSpace(*v)
	if trimmed == "" {
		return ""
	}
	r := []rune(trimmed)
	if len(r) > max {
		return string(r[:max])
	}
	return trimmed
}

func canAccessClose(role domain.Role, actorID, ownerID uint) bool {
	if role == domain.RoleAdmin {
		return true
	}
	return actorID == ownerID
}

func formatCloseForCalendar(c *domain.CashRegisterClose) *CalendarClose {
	if c == nil {
		return nil
	}

	cashCounted := 0.0
	denoms := make([]CalendarCloseDenomination, 0, len(c.Denominations))
	for _, d := range c.Denominations {
		cashCounted += d.Subtotal
		denoms = append(denoms, CalendarCloseDenomination{
			Denomination: d.Denomination,
			Quantity:     d.Quantity,
			Subtotal:     d.Subtotal,
		})
	}

	payments := make([]CalendarClosePayment, 0, len(c.Payments))
	for _, p := range c.Payments {
		payments = append(payments, CalendarClosePayment{
			Name:          p.PaymentMethodName,
			CountedAmount: p.CountedAmount,
		})
	}

	var actualPtr *float64
	var variancePtr *float64
	if c.AdminActualsRecordedAt != nil {
		actual := c.TotalActualAmount
		variance := round2(c.TotalCounted - c.TotalActualAmount)
		actualPtr = &actual
		variancePtr = &variance
	}

	var approvedAt *string
	if c.ApprovedAt != nil {
		s := c.ApprovedAt.UTC().Format(time.RFC3339)
		approvedAt = &s
	}
	submittedAt := c.UpdatedAt.UTC().Format(time.RFC3339)

	advisorNotes := stringPtrOrNil(c.AdvisorNotes)
	adminNotes := stringPtrOrNil(c.AdminNotes)

	return &CalendarClose{
		ID:                c.ID,
		Status:            string(c.Status),
		TotalCounted:      c.TotalCounted,
		TotalActualAmount: actualPtr,
		CashCounted:       cashCounted,
		Variance:          variancePtr,
		AdvisorNotes:      advisorNotes,
		AdminNotes:        adminNotes,
		ApprovedAt:        approvedAt,
		SubmittedAt:       &submittedAt,
		PaymentMethods:    payments,
		Denominations:     denoms,
	}
}

func stringPtrOrNil(s string) *string {
	t := strings.TrimSpace(s)
	if t == "" {
		return nil
	}
	return &t
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}

func spanishDayName(w time.Weekday) string {
	switch w {
	case time.Monday:
		return "Lun"
	case time.Tuesday:
		return "Mar"
	case time.Wednesday:
		return "Mie"
	case time.Thursday:
		return "Jue"
	case time.Friday:
		return "Vie"
	case time.Saturday:
		return "Sab"
	default:
		return "Dom"
	}
}

func spanishMonthName(m time.Month) string {
	switch m {
	case time.January:
		return "Ene"
	case time.February:
		return "Feb"
	case time.March:
		return "Mar"
	case time.April:
		return "Abr"
	case time.May:
		return "May"
	case time.June:
		return "Jun"
	case time.July:
		return "Jul"
	case time.August:
		return "Ago"
	case time.September:
		return "Sep"
	case time.October:
		return "Oct"
	case time.November:
		return "Nov"
	default:
		return "Dic"
	}
}
