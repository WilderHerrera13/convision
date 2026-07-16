// Package excel provides a small, reusable helper for building styled .xlsx
// workbooks for data exports across the API.
//
// Callers describe each worksheet declaratively — a list of typed columns plus
// rows of values — and the Builder takes care of styling (header band, banded
// number formats, column widths, frozen header) and streaming the result to a
// byte slice ready to be returned over HTTP.
//
// It is intentionally generic: any feature that needs an Excel export (cash
// close reconciliation, payroll, cash transfers, …) should reuse this package
// rather than talk to github.com/xuri/excelize directly. See the cash close
// reconciliation report (internal/cashclose) for a full example, and
// DEVELOPMENT_GUIDE.md §"Excel exports" for the end-to-end recipe.
package excel

import (
	"strings"

	"github.com/xuri/excelize/v2"
)

// CellFormat controls how a column's values are rendered in the spreadsheet.
type CellFormat int

const (
	// FormatText renders values as-is, left-aligned. Zero value / default.
	FormatText CellFormat = iota
	// FormatInt renders integers with a thousands separator (1,234).
	FormatInt
	// FormatMoney renders Colombian pesos with a thousands separator ($1,234,000).
	FormatMoney
	// FormatMoneySigned is like FormatMoney but shows negatives in red — use it
	// for variance / difference columns (sobra / falta).
	FormatMoneySigned
	// FormatDate renders a time.Time as yyyy-mm-dd.
	FormatDate
	// FormatPercent renders a fraction (0.0-1.0) as a percentage (12.3%).
	FormatPercent
)

// Cell overrides the column format for a single value. Use it when one column
// mixes value types — e.g. a two-column key/value summary sheet where some rows
// hold text and others hold money. In a normal row, pass raw values (string,
// float64, int, time.Time, …) and the column's own Format applies.
type Cell struct {
	Value  any
	Format CellFormat
}

// Column describes a single column in a sheet.
type Column struct {
	Header string
	// Width is the column width in Excel units. When 0, a width is derived from
	// the header length.
	Width float64
	// Format controls the number/date rendering of the column's data cells.
	Format CellFormat
}

// Sheet is a declarative worksheet definition.
type Sheet struct {
	// Name is the tab name. It is sanitized (invalid characters removed),
	// truncated to Excel's 31-character limit and de-duplicated automatically.
	Name string
	// Title, when set, renders a bold title row merged across all columns.
	Title string
	// Subtitle, when set, renders a muted subtitle row under the title.
	Subtitle string
	// Columns defines the table header and per-column formatting.
	Columns []Column
	// Rows holds the data. Each inner slice is one row; element i is placed in
	// column i. Rows shorter than Columns leave trailing cells blank; longer
	// rows are truncated. nil elements render as empty cells.
	Rows [][]any
	// Total, when non-empty, renders a bold totals row beneath the data using
	// each column's number format.
	Total []any
}

// Builder accumulates sheets and renders them to a single workbook.
type Builder struct {
	sheets []Sheet
}

// New creates an empty workbook builder.
func New() *Builder { return &Builder{} }

// AddSheet appends a sheet definition. Returns the builder for chaining.
func (b *Builder) AddSheet(s Sheet) *Builder {
	b.sheets = append(b.sheets, s)
	return b
}

// Bytes renders every sheet and returns the .xlsx file as a byte slice.
func (b *Builder) Bytes() ([]byte, error) {
	f := excelize.NewFile()
	defer func() { _ = f.Close() }()

	styles, err := buildStyles(f)
	if err != nil {
		return nil, err
	}

	if len(b.sheets) == 0 {
		// Produce a valid (empty) workbook rather than erroring.
		buf, err := f.WriteToBuffer()
		if err != nil {
			return nil, err
		}
		return buf.Bytes(), nil
	}

	used := map[string]struct{}{}
	for i, s := range b.sheets {
		name := uniqueSheetName(s.Name, i, used)
		if i == 0 {
			if err := f.SetSheetName("Sheet1", name); err != nil {
				return nil, err
			}
		} else if _, err := f.NewSheet(name); err != nil {
			return nil, err
		}
		if err := renderSheet(f, name, s, styles); err != nil {
			return nil, err
		}
	}

	f.SetActiveSheet(0)
	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func renderSheet(f *excelize.File, sheet string, s Sheet, st *styleSet) error {
	nCols := len(s.Columns)
	if nCols == 0 {
		return nil
	}

	row := 1
	if s.Title != "" {
		if err := mergedBanner(f, sheet, row, nCols, s.Title, st.title, 26); err != nil {
			return err
		}
		row++
	}
	if s.Subtitle != "" {
		if err := mergedBanner(f, sheet, row, nCols, s.Subtitle, st.subtitle, 18); err != nil {
			return err
		}
		row++
	}
	if s.Title != "" || s.Subtitle != "" {
		row++ // blank spacer row
	}

	headerRow := row
	for c, col := range s.Columns {
		cell, _ := excelize.CoordinatesToCellName(c+1, headerRow)
		if err := f.SetCellValue(sheet, cell, col.Header); err != nil {
			return err
		}
	}
	start, _ := excelize.CoordinatesToCellName(1, headerRow)
	end, _ := excelize.CoordinatesToCellName(nCols, headerRow)
	if err := f.SetCellStyle(sheet, start, end, st.header); err != nil {
		return err
	}
	_ = f.SetRowHeight(sheet, headerRow, 22)
	row++

	for _, r := range s.Rows {
		if err := writeRow(f, sheet, row, s.Columns, r, st.body); err != nil {
			return err
		}
		row++
	}

	if len(s.Total) > 0 {
		if err := writeRow(f, sheet, row, s.Columns, s.Total, st.total); err != nil {
			return err
		}
		row++
	}

	for c, col := range s.Columns {
		name, _ := excelize.ColumnNumberToName(c + 1)
		w := col.Width
		if w <= 0 {
			w = autoWidth(col.Header)
		}
		if err := f.SetColWidth(sheet, name, name, w); err != nil {
			return err
		}
	}

	// Freeze everything above the first data row so headers stay visible.
	topLeft, _ := excelize.CoordinatesToCellName(1, headerRow+1)
	return f.SetPanes(sheet, &excelize.Panes{
		Freeze:      true,
		YSplit:      headerRow,
		TopLeftCell: topLeft,
		ActivePane:  "bottomLeft",
	})
}

// writeRow writes one row of values using the per-format style map. A value of
// type Cell overrides the column's format for that single cell.
func writeRow(f *excelize.File, sheet string, row int, cols []Column, values []any, styleByFormat map[CellFormat]int) error {
	for c, col := range cols {
		cell, _ := excelize.CoordinatesToCellName(c+1, row)
		format := col.Format
		var value any
		if c < len(values) {
			value = values[c]
		}
		if override, ok := value.(Cell); ok {
			format = override.Format
			value = override.Value
		}
		if value != nil {
			if err := f.SetCellValue(sheet, cell, value); err != nil {
				return err
			}
		}
		if styleID, ok := styleByFormat[format]; ok {
			if err := f.SetCellStyle(sheet, cell, cell, styleID); err != nil {
				return err
			}
		}
	}
	return nil
}

func mergedBanner(f *excelize.File, sheet string, row, nCols int, text string, style int, height float64) error {
	start, _ := excelize.CoordinatesToCellName(1, row)
	end, _ := excelize.CoordinatesToCellName(nCols, row)
	if err := f.SetCellValue(sheet, start, text); err != nil {
		return err
	}
	if nCols > 1 {
		if err := f.MergeCell(sheet, start, end); err != nil {
			return err
		}
	}
	if err := f.SetCellStyle(sheet, start, end, style); err != nil {
		return err
	}
	_ = f.SetRowHeight(sheet, row, height)
	return nil
}

// autoWidth derives a reasonable column width from the header length.
func autoWidth(header string) float64 {
	w := float64(len([]rune(header)))*1.15 + 4
	if w < 12 {
		w = 12
	}
	if w > 42 {
		w = 42
	}
	return w
}

// uniqueSheetName sanitizes and de-duplicates a sheet name within Excel's rules.
func uniqueSheetName(name string, index int, used map[string]struct{}) string {
	cleaned := sanitizeSheetName(name)
	if cleaned == "" {
		cleaned = "Hoja"
	}
	candidate := truncateRunes(cleaned, 31)
	for i := 2; ; i++ {
		key := strings.ToLower(candidate)
		if _, exists := used[key]; !exists {
			used[key] = struct{}{}
			return candidate
		}
		suffix := " (" + itoa(i) + ")"
		candidate = truncateRunes(cleaned, 31-len(suffix)) + suffix
	}
}

// sanitizeSheetName strips characters Excel forbids in worksheet names.
func sanitizeSheetName(name string) string {
	replacer := strings.NewReplacer(
		"[", "", "]", "", ":", " ", "*", "", "?", "", "/", "-", "\\", "-",
	)
	return strings.TrimSpace(replacer.Replace(name))
}

func truncateRunes(s string, max int) string {
	if max <= 0 {
		return ""
	}
	r := []rune(s)
	if len(r) <= max {
		return s
	}
	return strings.TrimSpace(string(r[:max]))
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var digits []byte
	for n > 0 {
		digits = append([]byte{byte('0' + n%10)}, digits...)
		n /= 10
	}
	if neg {
		digits = append([]byte{'-'}, digits...)
	}
	return string(digits)
}
