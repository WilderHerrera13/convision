package cashclose

import (
	"sort"
	"strings"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/platform/clock"
)

// ReportMethod is a payment method with its canonical key and Spanish display label.
type ReportMethod struct {
	Key   string `json:"key"`
	Label string `json:"label"`
}

// reportMethods lists the payment methods in the order they appear in the export,
// mirroring the reference reconciliation workbook. Labels match the frontend
// PAYMENT_METHOD_LABELS so the Excel and the UI stay consistent.
var reportMethods = []ReportMethod{
	{Key: "efectivo", Label: "Efectivo"},
	{Key: "voucher", Label: "Voucher"},
	{Key: "bancolombia", Label: "Bancolombia"},
	{Key: "daviplata", Label: "Daviplata"},
	{Key: "nequi", Label: "Nequi"},
	{Key: "addi", Label: "Addi"},
	{Key: "sistecredito", Label: "Sistecredito"},
	{Key: "anticipo", Label: "Anticipo"},
	{Key: "bono", Label: "Bono"},
	{Key: "pago_sistecredito", Label: "Pago Sistecredito"},
}

// ReportPaymentTotal aggregates one payment method across the whole period.
type ReportPaymentTotal struct {
	Key       string  `json:"key"`
	Label     string  `json:"label"`
	Declared  float64 `json:"declared"`
	Actual    float64 `json:"actual"`
	Variance  float64 `json:"variance"`
	HasActual bool    `json:"has_actual"`
}

// ReportAdvisorRow is one advisor's per-method reconciliation across the period.
type ReportAdvisorRow struct {
	UserID        uint               `json:"user_id"`
	UserName      string             `json:"user_name"`
	Sede          string             `json:"sede"`
	ClosesCount   int                `json:"closes_count"`
	Declared      map[string]float64 `json:"declared"`
	Actual        map[string]float64 `json:"actual"`
	TotalDeclared float64            `json:"total_declared"`
	TotalActual   float64            `json:"total_actual"`
	Variance      float64            `json:"variance"`
	HasActual     bool               `json:"has_actual"`
}

// ReportCloseRow is one cash-close record in the detail sheet.
type ReportCloseRow struct {
	ID            uint    `json:"id"`
	CloseDate     string  `json:"close_date"`
	// CreatedAt is the wall-clock instant the close record was created, formatted
	// "2006-01-02 15:04" in the clinic timezone. Comparing it against CloseDate
	// reveals closes registered on a different day than they claim to cover.
	CreatedAt     string  `json:"created_at"`
	UserName      string  `json:"user_name"`
	Sede          string  `json:"sede"`
	Status        string  `json:"status"`
	TotalDeclared float64 `json:"total_declared"`
	TotalActual   float64 `json:"total_actual"`
	Variance      float64 `json:"variance"`
	HasActual     bool    `json:"has_actual"`
	AdvisorNotes  string  `json:"advisor_notes"`
	AdminNotes    string  `json:"admin_notes"`
}

// ReportDenominationRow is one bill/coin denomination line within a close's cash count.
type ReportDenominationRow struct {
	CloseDate    string  `json:"close_date"`
	UserName     string  `json:"user_name"`
	Sede         string  `json:"sede"`
	Denomination int     `json:"denomination"`
	Quantity     int     `json:"quantity"`
	Subtotal     float64 `json:"subtotal"`
}

// ReportDailyRow aggregates all closes for a single calendar day.
type ReportDailyRow struct {
	Date          string  `json:"date"`
	ClosesCount   int     `json:"closes_count"`
	TotalDeclared float64 `json:"total_declared"`
	TotalActual   float64 `json:"total_actual"`
	Variance      float64 `json:"variance"`
}

// ReconciliationReport is the full dataset backing the cash-close Excel export.
type ReconciliationReport struct {
	DateFrom   string    `json:"date_from"`
	DateTo     string    `json:"date_to"`
	BranchName string    `json:"branch_name"`
	GeneratedAt time.Time `json:"generated_at"`

	// KPIs
	TotalCloses     int     `json:"total_closes"`
	AdvisorsCount   int     `json:"advisors_count"`
	TotalDeclared   float64 `json:"total_declared"`
	TotalActual     float64 `json:"total_actual"`
	NetVariance     float64 `json:"net_variance"`
	ApprovedCount   int     `json:"approved_count"`
	SubmittedCount  int     `json:"submitted_count"`
	DraftCount      int     `json:"draft_count"`
	ReconciledCount int     `json:"reconciled_count"`

	Methods       []ReportMethod          `json:"methods"`
	PaymentTotals []ReportPaymentTotal    `json:"payment_totals"`
	Advisors      []ReportAdvisorRow      `json:"advisors"`
	Closes        []ReportCloseRow        `json:"closes"`
	Denominations []ReportDenominationRow `json:"denominations"`
	Daily         []ReportDailyRow        `json:"daily"`
}

// statusLabel maps an internal status to its Spanish display label.
func statusLabel(status domain.CashRegisterCloseStatus) string {
	switch status {
	case domain.CashRegisterCloseStatusApproved:
		return "Aprobado"
	case domain.CashRegisterCloseStatusSubmitted:
		return "Enviado"
	case domain.CashRegisterCloseStatusDraft:
		return "Borrador"
	default:
		return string(status)
	}
}

// ReconciliationReportData builds the full reconciliation dataset for a date range.
//
// The date range defaults to the last 14 days (matching the Consolidated view)
// when dateFrom/dateTo are empty. branchID 0 means all branches; userID 0 means
// all advisors (pass a specific ID to scope the report to one advisor, e.g. from
// the per-advisor calendar). branchNameMap resolves branch IDs to their names for
// the Sede column. generatedAt is passed in by the caller (handlers stamp
// time.Now) so the function stays deterministic and testable.
func (s *Service) ReconciliationReportData(
	db *gorm.DB,
	branchID uint,
	userID uint,
	branchNameMap map[uint]string,
	dateFrom, dateTo string,
	generatedAt time.Time,
) (*ReconciliationReport, error) {
	from, to, err := resolveReportRange(dateFrom, dateTo)
	if err != nil {
		return nil, err
	}

	closes, err := s.repo.ListDetailedByDateRange(db, branchID, from, to)
	if err != nil {
		return nil, err
	}

	// Keep only closes created by cash-close advisor roles (admin, receptionist),
	// consistent with the Consolidated view (QA-CCA-V3-001). When userID is set,
	// scope to that single advisor.
	advisorCloses := make([]*domain.CashRegisterClose, 0, len(closes))
	for _, c := range closes {
		if !isCashCloseAdvisorRole(c.User) {
			continue
		}
		if userID > 0 && c.UserID != userID {
			continue
		}
		advisorCloses = append(advisorCloses, c)
	}
	closes = advisorCloses

	branchName := "Todas las sucursales"
	if branchID > 0 {
		if name, ok := branchNameMap[branchID]; ok && strings.TrimSpace(name) != "" {
			branchName = name
		}
	}

	report := &ReconciliationReport{
		DateFrom:    from,
		DateTo:      to,
		BranchName:  branchName,
		GeneratedAt: generatedAt,
		Methods:     reportMethods,
	}

	// Per-method period totals.
	methodDeclared := map[string]float64{}
	methodActual := map[string]float64{}
	methodHasActual := map[string]bool{}

	// Per-advisor aggregation (insertion order preserved).
	type advisorAgg struct {
		row      *ReportAdvisorRow
		latest   time.Time
		branchID uint
	}
	byUser := map[uint]*advisorAgg{}
	order := []uint{}

	// Per-day aggregation.
	dailyMap := map[string]*ReportDailyRow{}
	dayOrder := []string{}

	for _, c := range closes {
		userName := advisorName(c.User)
		sede := branchNameMap[c.BranchID]
		closeDate := ""
		if c.CloseDate != nil {
			closeDate = c.CloseDate.UTC().Format("2006-01-02")
		}
		hasActual := c.AdminActualsRecordedAt != nil

		declared := c.TotalCounted
		var actual, variance float64
		if hasActual {
			actual = c.TotalActualAmount
			variance = round2(actual - declared)
		}

		// KPI counters.
		report.TotalCloses++
		report.TotalDeclared += declared
		if hasActual {
			report.TotalActual += actual
			report.NetVariance += variance
			report.ReconciledCount++
		} else {
			report.TotalActual += declared // proxy when not yet reconciled (QA-CC-001)
		}
		switch c.Status {
		case domain.CashRegisterCloseStatusApproved:
			report.ApprovedCount++
		case domain.CashRegisterCloseStatusSubmitted:
			report.SubmittedCount++
		case domain.CashRegisterCloseStatusDraft:
			report.DraftCount++
		}

		// Per-method declared amounts.
		declaredByMethod := map[string]float64{}
		for _, p := range c.Payments {
			key := strings.ToLower(strings.TrimSpace(p.PaymentMethodName))
			declaredByMethod[key] += p.CountedAmount
			methodDeclared[key] += p.CountedAmount
		}
		// Per-method actual amounts.
		actualByMethod := map[string]float64{}
		for _, p := range c.ActualPayments {
			key := strings.ToLower(strings.TrimSpace(p.PaymentMethodName))
			actualByMethod[key] += p.ActualAmount
			methodActual[key] += p.ActualAmount
			methodHasActual[key] = true
		}

		// Advisor aggregation.
		agg, ok := byUser[c.UserID]
		if !ok {
			agg = &advisorAgg{row: &ReportAdvisorRow{
				UserID:   c.UserID,
				UserName: userName,
				Declared: map[string]float64{},
				Actual:   map[string]float64{},
			}}
			byUser[c.UserID] = agg
			order = append(order, c.UserID)
		}
		agg.row.ClosesCount++
		agg.row.TotalDeclared += declared
		for k, v := range declaredByMethod {
			agg.row.Declared[k] += v
		}
		for k, v := range actualByMethod {
			agg.row.Actual[k] += v
		}
		if hasActual {
			agg.row.TotalActual += actual
			agg.row.Variance += variance
			agg.row.HasActual = true
		} else {
			agg.row.TotalActual += declared
		}
		if c.CloseDate != nil && c.CloseDate.After(agg.latest) {
			agg.latest = *c.CloseDate
			agg.branchID = c.BranchID
		}

		// Close detail row.
		report.Closes = append(report.Closes, ReportCloseRow{
			ID:            c.ID,
			CloseDate:     closeDate,
			CreatedAt:     c.CreatedAt.In(clock.Location()).Format("2006-01-02 15:04"),
			UserName:      userName,
			Sede:          sede,
			Status:        statusLabel(c.Status),
			TotalDeclared: round2(declared),
			TotalActual:   round2(actual),
			Variance:      round2(variance),
			HasActual:     hasActual,
			AdvisorNotes:  c.AdvisorNotes,
			AdminNotes:    c.AdminNotes,
		})

		// Denomination rows (cash count).
		for _, d := range c.Denominations {
			if d.Quantity == 0 {
				continue
			}
			report.Denominations = append(report.Denominations, ReportDenominationRow{
				CloseDate:    closeDate,
				UserName:     userName,
				Sede:         sede,
				Denomination: d.Denomination,
				Quantity:     d.Quantity,
				Subtotal:     round2(d.Subtotal),
			})
		}

		// Daily aggregation.
		if closeDate != "" {
			day, ok := dailyMap[closeDate]
			if !ok {
				day = &ReportDailyRow{Date: closeDate}
				dailyMap[closeDate] = day
				dayOrder = append(dayOrder, closeDate)
			}
			day.ClosesCount++
			day.TotalDeclared = round2(day.TotalDeclared + declared)
			if hasActual {
				day.TotalActual = round2(day.TotalActual + actual)
				day.Variance = round2(day.Variance + variance)
			} else {
				day.TotalActual = round2(day.TotalActual + declared)
			}
		}
	}

	// Finalize advisor rows (fill Sede from latest close, round totals).
	report.Advisors = make([]ReportAdvisorRow, 0, len(order))
	for _, uid := range order {
		agg := byUser[uid]
		agg.row.Sede = branchNameMap[agg.branchID]
		agg.row.TotalDeclared = round2(agg.row.TotalDeclared)
		agg.row.TotalActual = round2(agg.row.TotalActual)
		agg.row.Variance = round2(agg.row.Variance)
		report.Advisors = append(report.Advisors, *agg.row)
	}
	report.AdvisorsCount = len(report.Advisors)

	// Per-method totals in canonical order.
	report.PaymentTotals = make([]ReportPaymentTotal, 0, len(reportMethods))
	for _, m := range reportMethods {
		report.PaymentTotals = append(report.PaymentTotals, ReportPaymentTotal{
			Key:       m.Key,
			Label:     m.Label,
			Declared:  round2(methodDeclared[m.Key]),
			Actual:    round2(methodActual[m.Key]),
			Variance:  round2(methodActual[m.Key] - methodDeclared[m.Key]),
			HasActual: methodHasActual[m.Key],
		})
	}

	// Daily rows sorted by date ascending.
	sort.Strings(dayOrder)
	report.Daily = make([]ReportDailyRow, 0, len(dayOrder))
	for _, d := range dayOrder {
		report.Daily = append(report.Daily, *dailyMap[d])
	}

	report.TotalDeclared = round2(report.TotalDeclared)
	report.TotalActual = round2(report.TotalActual)
	report.NetVariance = round2(report.NetVariance)

	s.logger.Debug("built cash close reconciliation report",
		zap.Int("closes", report.TotalCloses),
		zap.Int("advisors", report.AdvisorsCount),
	)

	return report, nil
}

// resolveReportRange validates and defaults the date range to the last 14 days.
func resolveReportRange(dateFrom, dateTo string) (string, string, error) {
	now := time.Now().UTC()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)

	to := today
	if strings.TrimSpace(dateTo) != "" {
		parsed, err := time.ParseInLocation("2006-01-02", dateTo, time.UTC)
		if err != nil {
			return "", "", &domain.ErrValidation{Field: "date_to", Message: "formato inválido (YYYY-MM-DD)"}
		}
		to = parsed
	}

	from := to.AddDate(0, 0, -13)
	if strings.TrimSpace(dateFrom) != "" {
		parsed, err := time.ParseInLocation("2006-01-02", dateFrom, time.UTC)
		if err != nil {
			return "", "", &domain.ErrValidation{Field: "date_from", Message: "formato inválido (YYYY-MM-DD)"}
		}
		from = parsed
	}

	if from.After(to) {
		from, to = to, from
	}
	return from.Format("2006-01-02"), to.Format("2006-01-02"), nil
}

// advisorName builds a display name from a user, falling back to "Sin nombre".
func advisorName(u *domain.User) string {
	if u == nil {
		return "Sin nombre"
	}
	name := strings.TrimSpace(u.Name + " " + u.LastName)
	if name == "" {
		return "Sin nombre"
	}
	return name
}
