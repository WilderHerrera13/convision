package v1

import (
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	cashclosesvc "github.com/convision/api/internal/cashclose"
	"github.com/convision/api/internal/platform/excel"
	branchmw "github.com/convision/api/internal/transport/http/v1/middleware"
)

const xlsxContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

// respondExcel streams an .xlsx byte slice as a file download. Reusable by any
// future export endpoint — pass the workbook bytes and a base file name (without
// extension). The name is sanitized and RFC 5987-encoded for the header.
func respondExcel(c *gin.Context, filename string, data []byte) {
	safe := filename
	if safe == "" {
		safe = "export"
	}
	c.Header("Content-Type", xlsxContentType)
	c.Header("Content-Disposition", fmt.Sprintf(
		`attachment; filename="%s.xlsx"; filename*=UTF-8''%s.xlsx`,
		safe, url.PathEscape(safe),
	))
	c.Header("Content-Length", fmt.Sprintf("%d", len(data)))
	c.Data(http.StatusOK, xlsxContentType, data)
}

// ExportCashRegisterCloses godoc
// GET /api/v1/cash-register-closes-export?date_from=&date_to=&branch_id=
//
// Streams a multi-sheet Excel reconciliation report for the given date range and
// branch (branch_id=0 or omitted = all branches). Admin-only (cash_close:view).
func (h *Handler) ExportCashRegisterCloses(c *gin.Context) {
	branchID := branchmw.BranchIDFromCtx(c)
	if override := resolveBranchOverride(c); override != nil {
		if *override == 0 {
			branchID = 0
		} else {
			branchID = *override
		}
	}

	db := tenantDBFromCtx(c)

	branchNameMap := make(map[uint]string)
	if branchID > 0 {
		if b, err := h.branchRepo.GetByID(db, branchID); err == nil {
			branchNameMap[branchID] = b.Name
		}
	} else if branches, err := h.branchRepo.ListAll(db); err == nil {
		for _, b := range branches {
			branchNameMap[b.ID] = b.Name
		}
	}

	var userID uint
	if raw := c.Query("user_id"); raw != "" {
		if parsed, perr := strconv.ParseUint(raw, 10, 32); perr == nil {
			userID = uint(parsed)
		}
	}

	report, err := h.cashClose.ReconciliationReportData(
		db, branchID, userID, branchNameMap,
		c.Query("date_from"), c.Query("date_to"),
		time.Now().UTC(),
	)
	if err != nil {
		respondError(c, err)
		return
	}

	data, err := buildCashCloseWorkbook(report)
	if err != nil {
		respondError(c, err)
		return
	}

	filename := fmt.Sprintf("cierre-de-caja_%s_a_%s", report.DateFrom, report.DateTo)
	respondExcel(c, filename, data)
}

// buildCashCloseWorkbook renders the reconciliation report into a styled workbook.
func buildCashCloseWorkbook(r *cashclosesvc.ReconciliationReport) ([]byte, error) {
	b := excel.New()
	addSummarySheet(b, r)
	addByAdvisorSheet(b, r)
	addByPaymentMethodSheet(b, r)
	addClosesSheet(b, r)
	addDenominationsSheet(b, r)
	addDailySheet(b, r)
	return b.Bytes()
}

// addSummarySheet renders the period + KPI overview as a key/value table.
func addSummarySheet(b *excel.Builder, r *cashclosesvc.ReconciliationReport) {
	money := func(v float64) excel.Cell { return excel.Cell{Value: v, Format: excel.FormatMoney} }
	count := func(v int) excel.Cell { return excel.Cell{Value: v, Format: excel.FormatInt} }

	rows := [][]any{
		{"Periodo", fmt.Sprintf("%s a %s", dmY(r.DateFrom), dmY(r.DateTo))},
		{"Sucursal", r.BranchName},
		{"Generado", r.GeneratedAt.Format("2006-01-02 15:04") + " UTC"},
		{"", ""},
		{"Total de cierres", count(r.TotalCloses)},
		{"Asesores", count(r.AdvisorsCount)},
		{"Cierres aprobados", count(r.ApprovedCount)},
		{"Cierres enviados", count(r.SubmittedCount)},
		{"Cierres en borrador", count(r.DraftCount)},
		{"Cierres conciliados", count(r.ReconciledCount)},
		{"", ""},
		{"Total declarado", money(r.TotalDeclared)},
		{"Total real (conciliado)", money(r.TotalActual)},
		{"Variación neta (sobra/falta)", excel.Cell{Value: r.NetVariance, Format: excel.FormatMoneySigned}},
	}

	b.AddSheet(excel.Sheet{
		Name:     "Resumen",
		Title:    "Cierre de Caja — Reporte de Conciliación",
		Subtitle: fmt.Sprintf("%s · %s a %s", r.BranchName, r.DateFrom, r.DateTo),
		Columns: []excel.Column{
			{Header: "Concepto", Width: 32, Format: excel.FormatText},
			{Header: "Valor", Width: 30, Format: excel.FormatText},
		},
		Rows: rows,
	})
}

// addByAdvisorSheet renders per-advisor declared amounts by payment method plus
// declared/real/difference totals (the reference "Base" sheet).
func addByAdvisorSheet(b *excel.Builder, r *cashclosesvc.ReconciliationReport) {
	cols := []excel.Column{
		{Header: "Asesor", Width: 28, Format: excel.FormatText},
		{Header: "Sede", Width: 22, Format: excel.FormatText},
		{Header: "# Cierres", Width: 10, Format: excel.FormatInt},
	}
	for _, m := range r.Methods {
		cols = append(cols, excel.Column{Header: m.Label, Width: 14, Format: excel.FormatMoney})
	}
	cols = append(cols,
		excel.Column{Header: "Total Declarado", Width: 16, Format: excel.FormatMoney},
		excel.Column{Header: "Total Real", Width: 16, Format: excel.FormatMoney},
		excel.Column{Header: "Diferencia", Width: 16, Format: excel.FormatMoneySigned},
	)

	rows := make([][]any, 0, len(r.Advisors))
	for _, a := range r.Advisors {
		row := []any{a.UserName, a.Sede, a.ClosesCount}
		for _, m := range r.Methods {
			row = append(row, a.Declared[m.Key])
		}
		row = append(row, a.TotalDeclared, a.TotalActual, a.Variance)
		rows = append(rows, row)
	}

	// Totals row.
	total := []any{"TOTAL", "", r.TotalCloses}
	for _, pt := range r.PaymentTotals {
		total = append(total, pt.Declared)
	}
	total = append(total, r.TotalDeclared, r.TotalActual, r.NetVariance)

	b.AddSheet(excel.Sheet{
		Name:    "Por Asesor",
		Columns: cols,
		Rows:    rows,
		Total:   total,
	})
}

// addByPaymentMethodSheet renders declared/real/difference totals per method.
func addByPaymentMethodSheet(b *excel.Builder, r *cashclosesvc.ReconciliationReport) {
	rows := make([][]any, 0, len(r.PaymentTotals))
	for _, pt := range r.PaymentTotals {
		rows = append(rows, []any{pt.Label, pt.Declared, pt.Actual, pt.Variance})
	}

	b.AddSheet(excel.Sheet{
		Name: "Por Forma de Pago",
		Columns: []excel.Column{
			{Header: "Forma de Pago", Width: 22, Format: excel.FormatText},
			{Header: "Declarado", Width: 18, Format: excel.FormatMoney},
			{Header: "Real", Width: 18, Format: excel.FormatMoney},
			{Header: "Diferencia", Width: 18, Format: excel.FormatMoneySigned},
		},
		Rows: rows,
		Total: []any{
			"TOTAL", r.TotalDeclared, r.TotalActual, r.NetVariance,
		},
	})
}

// addClosesSheet renders the per-close detail list.
func addClosesSheet(b *excel.Builder, r *cashclosesvc.ReconciliationReport) {
	rows := make([][]any, 0, len(r.Closes))
	for _, c := range r.Closes {
		// Reconciled closes show real/difference figures; not-yet-reconciled
		// closes leave those cells blank so a real "-" zero is never mistaken
		// for "pending reconciliation".
		var realVal, diffVal any
		if c.HasActual {
			realVal = c.TotalActual
			diffVal = c.Variance
		}
		rows = append(rows, []any{
			dmY(c.CloseDate), dmYTime(c.CreatedAt), c.UserName, c.Sede, c.Status,
			c.TotalDeclared,
			excel.Cell{Value: realVal, Format: cellFormatFor(c.HasActual, excel.FormatMoney)},
			excel.Cell{Value: diffVal, Format: cellFormatFor(c.HasActual, excel.FormatMoneySigned)},
			c.AdvisorNotes, c.AdminNotes,
		})
	}

	b.AddSheet(excel.Sheet{
		Name: "Cierres",
		Columns: []excel.Column{
			{Header: "Fecha", Width: 12, Format: excel.FormatText},
			{Header: "Registrado", Width: 18, Format: excel.FormatText},
			{Header: "Asesor", Width: 28, Format: excel.FormatText},
			{Header: "Sede", Width: 22, Format: excel.FormatText},
			{Header: "Estado", Width: 12, Format: excel.FormatText},
			{Header: "Declarado", Width: 16, Format: excel.FormatMoney},
			{Header: "Real", Width: 16, Format: excel.FormatMoney},
			{Header: "Diferencia", Width: 16, Format: excel.FormatMoneySigned},
			{Header: "Notas Asesor", Width: 32, Format: excel.FormatText},
			{Header: "Notas Admin", Width: 32, Format: excel.FormatText},
		},
		Rows: rows,
	})
}

// addDenominationsSheet renders the cash denomination count per close.
func addDenominationsSheet(b *excel.Builder, r *cashclosesvc.ReconciliationReport) {
	rows := make([][]any, 0, len(r.Denominations))
	for _, d := range r.Denominations {
		rows = append(rows, []any{
			dmY(d.CloseDate), d.UserName, d.Sede, d.Denomination, d.Quantity, d.Subtotal,
		})
	}

	b.AddSheet(excel.Sheet{
		Name: "Denominaciones",
		Columns: []excel.Column{
			{Header: "Fecha", Width: 12, Format: excel.FormatText},
			{Header: "Asesor", Width: 28, Format: excel.FormatText},
			{Header: "Sede", Width: 22, Format: excel.FormatText},
			{Header: "Denominación", Width: 16, Format: excel.FormatMoney},
			{Header: "Cantidad", Width: 12, Format: excel.FormatInt},
			{Header: "Subtotal", Width: 16, Format: excel.FormatMoney},
		},
		Rows: rows,
	})
}

// addDailySheet renders per-day totals (the reference "Hoja5" pivot).
func addDailySheet(b *excel.Builder, r *cashclosesvc.ReconciliationReport) {
	rows := make([][]any, 0, len(r.Daily))
	for _, d := range r.Daily {
		rows = append(rows, []any{dmY(d.Date), d.ClosesCount, d.TotalDeclared, d.TotalActual, d.Variance})
	}

	b.AddSheet(excel.Sheet{
		Name: "Resumen Diario",
		Columns: []excel.Column{
			{Header: "Fecha", Width: 14, Format: excel.FormatText},
			{Header: "# Cierres", Width: 10, Format: excel.FormatInt},
			{Header: "Declarado", Width: 18, Format: excel.FormatMoney},
			{Header: "Real", Width: 18, Format: excel.FormatMoney},
			{Header: "Diferencia", Width: 18, Format: excel.FormatMoneySigned},
		},
		Rows: rows,
		Total: []any{
			"TOTAL", r.TotalCloses, r.TotalDeclared, r.TotalActual, r.NetVariance,
		},
	})
}

// cellFormatFor returns the given money format when reconciled, or plain text
// (for the "—" placeholder) when there are no admin actuals yet.
func cellFormatFor(hasActual bool, format excel.CellFormat) excel.CellFormat {
	if hasActual {
		return format
	}
	return excel.FormatText
}

// dmY reformats a "2006-01-02" date string to "02/01/2006" (Colombian display).
// Non-date strings are returned unchanged.
func dmY(iso string) string {
	t, err := time.Parse("2006-01-02", iso)
	if err != nil {
		return iso
	}
	return t.Format("02/01/2006")
}

// dmYTime reformats a "2006-01-02 15:04" datetime string to "02/01/2006 15:04".
// Non-matching strings are returned unchanged.
func dmYTime(iso string) string {
	t, err := time.Parse("2006-01-02 15:04", iso)
	if err != nil {
		return iso
	}
	return t.Format("02/01/2006 15:04")
}
