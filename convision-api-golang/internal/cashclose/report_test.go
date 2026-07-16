package cashclose_test

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/convision/api/internal/cashclose"
	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/testutil/mocks"
)

func ptrTime(t time.Time) *time.Time { return &t }

func buildReportCloses() []*domain.CashRegisterClose {
	d512 := time.Date(2026, 5, 12, 0, 0, 0, 0, time.UTC)
	d513 := time.Date(2026, 5, 13, 0, 0, 0, 0, time.UTC)
	recordedAt := time.Date(2026, 5, 14, 10, 0, 0, 0, time.UTC)

	return []*domain.CashRegisterClose{
		{ // reconciled, approved
			ID: 1, UserID: 1, BranchID: 4, CloseDate: ptrTime(d512),
			Status: domain.CashRegisterCloseStatusApproved,
			TotalCounted: 1000, TotalActualAmount: 1200, AdminActualsRecordedAt: &recordedAt,
			User: &domain.User{ID: 1, Name: "Ana", LastName: "Gomez", RoleType: domain.RoleReceptionist},
			Payments: []domain.CashRegisterClosePayment{
				{PaymentMethodName: "efectivo", CountedAmount: 600},
				{PaymentMethodName: "nequi", CountedAmount: 400},
			},
			ActualPayments: []domain.CashRegisterCloseActualPayment{
				{PaymentMethodName: "efectivo", ActualAmount: 700},
				{PaymentMethodName: "nequi", ActualAmount: 500},
			},
			Denominations: []domain.CashCountDenomination{
				{Denomination: 50000, Quantity: 2, Subtotal: 100000},
				{Denomination: 20000, Quantity: 0, Subtotal: 0}, // zero-qty rows are skipped
			},
		},
		{ // not reconciled, submitted
			ID: 2, UserID: 1, BranchID: 4, CloseDate: ptrTime(d513),
			Status: domain.CashRegisterCloseStatusSubmitted,
			TotalCounted: 500,
			User: &domain.User{ID: 1, Name: "Ana", LastName: "Gomez", RoleType: domain.RoleReceptionist},
			Payments: []domain.CashRegisterClosePayment{
				{PaymentMethodName: "efectivo", CountedAmount: 500},
			},
		},
		{ // draft, admin advisor
			ID: 3, UserID: 2, BranchID: 4, CloseDate: ptrTime(d512),
			Status: domain.CashRegisterCloseStatusDraft,
			TotalCounted: 300,
			User: &domain.User{ID: 2, Name: "Beto", LastName: "Ruiz", RoleType: domain.RoleAdmin},
			Payments: []domain.CashRegisterClosePayment{
				{PaymentMethodName: "bancolombia", CountedAmount: 300},
			},
		},
		{ // specialist — must be excluded from advisor reconciliation
			ID: 4, UserID: 3, BranchID: 4, CloseDate: ptrTime(d512),
			Status: domain.CashRegisterCloseStatusSubmitted,
			TotalCounted: 9999,
			User: &domain.User{ID: 3, Name: "Caro", LastName: "Diaz", RoleType: domain.RoleSpecialist},
			Payments: []domain.CashRegisterClosePayment{
				{PaymentMethodName: "efectivo", CountedAmount: 9999},
			},
		},
	}
}

func TestReconciliationReportData_Aggregates(t *testing.T) {
	repo := &mocks.MockCashRegisterCloseRepository{}
	repo.On("ListDetailedByDateRange", mock.Anything, uint(0), "2026-05-01", "2026-05-31").
		Return(buildReportCloses(), nil)

	svc := newCashCloseSvc(repo)
	branchNames := map[uint]string{4: "Villavicencio"}
	gen := time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC)

	r, err := svc.ReconciliationReportData(nil, 0, 0, branchNames, "2026-05-01", "2026-05-31", gen)
	require.NoError(t, err)

	// KPIs — the specialist close (id 4) is excluded.
	assert.Equal(t, 3, r.TotalCloses)
	assert.Equal(t, 2, r.AdvisorsCount)
	assert.Equal(t, "Todas las sucursales", r.BranchName)
	assert.Equal(t, 1800.0, r.TotalDeclared)
	assert.Equal(t, 2000.0, r.TotalActual) // 1200 reconciled + 500 + 300 proxies
	assert.Equal(t, 200.0, r.NetVariance)  // only close 1 reconciled: 1200-1000
	assert.Equal(t, 1, r.ApprovedCount)
	assert.Equal(t, 1, r.SubmittedCount)
	assert.Equal(t, 1, r.DraftCount)
	assert.Equal(t, 1, r.ReconciledCount)

	// Per-method totals.
	totals := map[string]cashclose.ReportPaymentTotal{}
	for _, pt := range r.PaymentTotals {
		totals[pt.Key] = pt
	}
	assert.Equal(t, 1100.0, totals["efectivo"].Declared) // 600 + 500
	assert.Equal(t, 700.0, totals["efectivo"].Actual)
	assert.Equal(t, -400.0, totals["efectivo"].Variance)
	assert.Equal(t, 400.0, totals["nequi"].Declared)
	assert.Equal(t, 500.0, totals["nequi"].Actual)
	assert.Equal(t, 300.0, totals["bancolombia"].Declared)
	assert.Equal(t, 0.0, totals["bancolombia"].Actual)
	assert.Len(t, r.PaymentTotals, 10) // canonical ordered method list

	// Advisors.
	require.Len(t, r.Advisors, 2)
	ana := r.Advisors[0]
	assert.Equal(t, "Ana Gomez", ana.UserName)
	assert.Equal(t, "Villavicencio", ana.Sede)
	assert.Equal(t, 2, ana.ClosesCount)
	assert.Equal(t, 1100.0, ana.Declared["efectivo"])
	assert.Equal(t, 400.0, ana.Declared["nequi"])
	assert.Equal(t, 1500.0, ana.TotalDeclared)
	assert.Equal(t, 1700.0, ana.TotalActual) // 1200 reconciled + 500 proxy
	assert.Equal(t, 200.0, ana.Variance)

	// Closes detail (3 rows, specialist excluded).
	assert.Len(t, r.Closes, 3)

	// Denominations — only the qty>0 row survives.
	require.Len(t, r.Denominations, 1)
	assert.Equal(t, 50000, r.Denominations[0].Denomination)
	assert.Equal(t, 2, r.Denominations[0].Quantity)
	assert.Equal(t, 100000.0, r.Denominations[0].Subtotal)

	// Daily rollup sorted ascending.
	require.Len(t, r.Daily, 2)
	assert.Equal(t, "2026-05-12", r.Daily[0].Date)
	assert.Equal(t, 2, r.Daily[0].ClosesCount) // close 1 + close 3
	assert.Equal(t, 1300.0, r.Daily[0].TotalDeclared)
	assert.Equal(t, 1500.0, r.Daily[0].TotalActual) // 1200 reconciled + 300 proxy
	assert.Equal(t, 200.0, r.Daily[0].Variance)
	assert.Equal(t, "2026-05-13", r.Daily[1].Date)

	assert.Equal(t, gen, r.GeneratedAt)
	repo.AssertExpectations(t)
}

func TestReconciliationReportData_BranchName(t *testing.T) {
	repo := &mocks.MockCashRegisterCloseRepository{}
	repo.On("ListDetailedByDateRange", mock.Anything, uint(4), "2026-05-01", "2026-05-31").
		Return([]*domain.CashRegisterClose{}, nil)

	svc := newCashCloseSvc(repo)
	r, err := svc.ReconciliationReportData(nil, 4, 0, map[uint]string{4: "Acacias"}, "2026-05-01", "2026-05-31", time.Now().UTC())
	require.NoError(t, err)
	assert.Equal(t, "Acacias", r.BranchName)
	assert.Equal(t, 0, r.TotalCloses)
	assert.Len(t, r.PaymentTotals, 10)
}

func TestReconciliationReportData_ScopedToAdvisor(t *testing.T) {
	repo := &mocks.MockCashRegisterCloseRepository{}
	repo.On("ListDetailedByDateRange", mock.Anything, uint(0), "2026-05-01", "2026-05-31").
		Return(buildReportCloses(), nil)

	svc := newCashCloseSvc(repo)
	// Scope to advisor 1 (Ana) — Beto (id 2) and the specialist (id 3) drop out.
	r, err := svc.ReconciliationReportData(nil, 0, 1, map[uint]string{4: "Villavicencio"}, "2026-05-01", "2026-05-31", time.Now().UTC())
	require.NoError(t, err)
	assert.Equal(t, 2, r.TotalCloses)
	require.Len(t, r.Advisors, 1)
	assert.Equal(t, "Ana Gomez", r.Advisors[0].UserName)
	assert.Equal(t, 1500.0, r.TotalDeclared)
}

func TestReconciliationReportData_InvalidDate(t *testing.T) {
	repo := &mocks.MockCashRegisterCloseRepository{}
	svc := newCashCloseSvc(repo)
	_, err := svc.ReconciliationReportData(nil, 0, 0, nil, "not-a-date", "", time.Now().UTC())
	require.Error(t, err)
	var valErr *domain.ErrValidation
	assert.ErrorAs(t, err, &valErr)
}
