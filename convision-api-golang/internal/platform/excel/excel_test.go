package excel_test

import (
	"bytes"
	"testing"

	"github.com/xuri/excelize/v2"

	"github.com/convision/api/internal/platform/excel"
)

func TestBuilder_ProducesValidWorkbook(t *testing.T) {
	data, err := excel.New().
		AddSheet(excel.Sheet{
			Name:     "Resumen",
			Title:    "Reporte",
			Subtitle: "Periodo de prueba",
			Columns: []excel.Column{
				{Header: "Concepto", Format: excel.FormatText},
				{Header: "Valor", Format: excel.FormatText},
			},
			Rows: [][]any{
				{"Total", excel.Cell{Value: 1500.0, Format: excel.FormatMoney}},
				{"Cierres", excel.Cell{Value: 3, Format: excel.FormatInt}},
			},
		}).
		AddSheet(excel.Sheet{
			Name: "Detalle",
			Columns: []excel.Column{
				{Header: "Asesor", Format: excel.FormatText},
				{Header: "Declarado", Format: excel.FormatMoney},
				{Header: "Diferencia", Format: excel.FormatMoneySigned},
			},
			Rows: [][]any{
				{"Ana", 1000.0, -50.0},
				{"Beto", 500.0, 0.0},
			},
			Total: []any{"TOTAL", 1500.0, -50.0},
		}).
		Bytes()
	if err != nil {
		t.Fatalf("Bytes() error: %v", err)
	}
	if len(data) == 0 {
		t.Fatal("expected non-empty workbook")
	}

	// .xlsx files are ZIP archives — verify the PK magic header.
	if !bytes.HasPrefix(data, []byte("PK")) {
		t.Fatalf("expected ZIP (PK) header, got %v", data[:2])
	}

	f, err := excelize.OpenReader(bytes.NewReader(data))
	if err != nil {
		t.Fatalf("re-open error: %v", err)
	}
	defer func() { _ = f.Close() }()

	sheets := f.GetSheetList()
	if len(sheets) != 2 {
		t.Fatalf("expected 2 sheets, got %d: %v", len(sheets), sheets)
	}
	if sheets[0] != "Resumen" || sheets[1] != "Detalle" {
		t.Fatalf("unexpected sheet names: %v", sheets)
	}

	// Title lands on row 1, header after title+subtitle+spacer (row 4), data at row 5.
	title, _ := f.GetCellValue("Resumen", "A1")
	if title != "Reporte" {
		t.Fatalf("expected title 'Reporte', got %q", title)
	}
	header, _ := f.GetCellValue("Resumen", "A4")
	if header != "Concepto" {
		t.Fatalf("expected header 'Concepto' at A4, got %q", header)
	}
	total, _ := f.GetCellValue("Resumen", "A5")
	if total != "Total" {
		t.Fatalf("expected 'Total' at A5, got %q", total)
	}

	// Detalle has no title: header at row 1, data from row 2, total row after.
	h, _ := f.GetCellValue("Detalle", "A1")
	if h != "Asesor" {
		t.Fatalf("expected header 'Asesor' at Detalle!A1, got %q", h)
	}
	tot, _ := f.GetCellValue("Detalle", "A4")
	if tot != "TOTAL" {
		t.Fatalf("expected 'TOTAL' at Detalle!A4, got %q", tot)
	}
}

func TestBuilder_SanitizesAndDedupesSheetNames(t *testing.T) {
	data, err := excel.New().
		AddSheet(excel.Sheet{Name: "A/B:C", Columns: []excel.Column{{Header: "X"}}}).
		AddSheet(excel.Sheet{Name: "Report", Columns: []excel.Column{{Header: "X"}}}).
		AddSheet(excel.Sheet{Name: "Report", Columns: []excel.Column{{Header: "X"}}}).
		Bytes()
	if err != nil {
		t.Fatalf("Bytes() error: %v", err)
	}

	f, _ := excelize.OpenReader(bytes.NewReader(data))
	defer func() { _ = f.Close() }()
	sheets := f.GetSheetList()

	// Forbidden characters removed/replaced; duplicate suffixed.
	if sheets[0] != "A-B C" {
		t.Fatalf("expected sanitized 'A-B C', got %q", sheets[0])
	}
	if sheets[1] != "Report" || sheets[2] != "Report (2)" {
		t.Fatalf("expected dedupe 'Report' + 'Report (2)', got %v", sheets)
	}
}

func TestBuilder_EmptyWorkbook(t *testing.T) {
	data, err := excel.New().Bytes()
	if err != nil {
		t.Fatalf("Bytes() error: %v", err)
	}
	if !bytes.HasPrefix(data, []byte("PK")) {
		t.Fatal("expected valid (empty) workbook")
	}
}
