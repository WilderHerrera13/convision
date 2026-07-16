package v1

import (
	"bytes"
	"os"
	"testing"
	"time"

	"github.com/xuri/excelize/v2"

	cashclosesvc "github.com/convision/api/internal/cashclose"
)

func sampleReport() *cashclosesvc.ReconciliationReport {
	return &cashclosesvc.ReconciliationReport{
		DateFrom:   "2026-05-12",
		DateTo:     "2026-06-02",
		BranchName: "Todas las sucursales",
		GeneratedAt: time.Date(2026, 6, 3, 8, 0, 0, 0, time.UTC),
		TotalCloses: 2, AdvisorsCount: 2,
		TotalDeclared: 1500, TotalActual: 1700, NetVariance: 200,
		ApprovedCount: 1, SubmittedCount: 1, ReconciledCount: 1,
		Methods: []cashclosesvc.ReportMethod{
			{Key: "efectivo", Label: "Efectivo"},
			{Key: "nequi", Label: "Nequi"},
		},
		PaymentTotals: []cashclosesvc.ReportPaymentTotal{
			{Key: "efectivo", Label: "Efectivo", Declared: 1100, Actual: 700, Variance: -400, HasActual: true},
			{Key: "nequi", Label: "Nequi", Declared: 400, Actual: 500, Variance: 100, HasActual: true},
		},
		Advisors: []cashclosesvc.ReportAdvisorRow{
			{UserID: 1, UserName: "Ana Gomez", Sede: "Villavicencio", ClosesCount: 2,
				Declared: map[string]float64{"efectivo": 1100, "nequi": 400},
				TotalDeclared: 1500, TotalActual: 1700, Variance: 200, HasActual: true},
		},
		Closes: []cashclosesvc.ReportCloseRow{
			{ID: 1, CloseDate: "2026-05-12", CreatedAt: "2026-05-12 18:45", UserName: "Ana Gomez", Sede: "Villavicencio",
				Status: "Aprobado", TotalDeclared: 1000, TotalActual: 1200, Variance: 200, HasActual: true},
			{ID: 2, CloseDate: "2026-05-13", CreatedAt: "2026-05-14 09:10", UserName: "Ana Gomez", Sede: "Villavicencio",
				Status: "Enviado", TotalDeclared: 500, HasActual: false},
		},
		Denominations: []cashclosesvc.ReportDenominationRow{
			{CloseDate: "2026-05-12", UserName: "Ana Gomez", Sede: "Villavicencio", Denomination: 50000, Quantity: 2, Subtotal: 100000},
		},
		Daily: []cashclosesvc.ReportDailyRow{
			{Date: "2026-05-12", ClosesCount: 1, TotalDeclared: 1000, TotalActual: 1200, Variance: 200},
			{Date: "2026-05-13", ClosesCount: 1, TotalDeclared: 500, TotalActual: 500, Variance: 0},
		},
	}
}

func TestBuildCashCloseWorkbook(t *testing.T) {
	data, err := buildCashCloseWorkbook(sampleReport())
	if err != nil {
		t.Fatalf("buildCashCloseWorkbook error: %v", err)
	}
	if len(data) == 0 {
		t.Fatal("expected non-empty workbook")
	}

	// Write out for manual inspection when EXPORT_SMOKE_OUT is set.
	if out := os.Getenv("EXPORT_SMOKE_OUT"); out != "" {
		if err := os.WriteFile(out, data, 0o644); err != nil {
			t.Fatalf("write file: %v", err)
		}
		t.Logf("wrote sample workbook to %s", out)
	}

	f, err := excelize.OpenReader(bytes.NewReader(data))
	if err != nil {
		t.Fatalf("re-open: %v", err)
	}
	defer func() { _ = f.Close() }()

	want := []string{"Resumen", "Por Asesor", "Por Forma de Pago", "Cierres", "Denominaciones", "Resumen Diario"}
	got := f.GetSheetList()
	if len(got) != len(want) {
		t.Fatalf("expected %d sheets, got %d: %v", len(want), len(got), got)
	}
	for i, name := range want {
		if got[i] != name {
			t.Fatalf("sheet %d: expected %q, got %q", i, name, got[i])
		}
	}

	// "Por Forma de Pago": header row 1, Efectivo row 2, total row after 2 methods.
	label, _ := f.GetCellValue("Por Forma de Pago", "A2")
	if label != "Efectivo" {
		t.Fatalf("expected 'Efectivo' at Por Forma de Pago!A2, got %q", label)
	}
	totalLabel, _ := f.GetCellValue("Por Forma de Pago", "A4")
	if totalLabel != "TOTAL" {
		t.Fatalf("expected 'TOTAL' at Por Forma de Pago!A4, got %q", totalLabel)
	}

	// Unreconciled close leaves the Real column blank (no admin actuals yet).
	realCell, _ := f.GetCellValue("Cierres", "G3")
	if realCell != "" {
		t.Fatalf("expected blank Real cell for unreconciled close, got %q", realCell)
	}

	// Dates render in dd/mm/yyyy.
	dateCell, _ := f.GetCellValue("Cierres", "A2")
	if dateCell != "12/05/2026" {
		t.Fatalf("expected date '12/05/2026', got %q", dateCell)
	}

	// Creation timestamp renders in dd/mm/yyyy hh:mm next to the close date.
	createdCell, _ := f.GetCellValue("Cierres", "B3")
	if createdCell != "14/05/2026 09:10" {
		t.Fatalf("expected created timestamp '14/05/2026 09:10', got %q", createdCell)
	}
}
