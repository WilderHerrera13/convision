package excel

import "github.com/xuri/excelize/v2"

// styleSet holds every reusable cell style for one workbook. Styles are created
// once per workbook and referenced by ID when rendering cells.
type styleSet struct {
	title    int
	subtitle int
	header   int
	body     map[CellFormat]int
	total    map[CellFormat]int
}

// Accounting-style money formats mirror how the finance team formats their own
// reconciliation workbooks: thousands separators, right-aligned, negatives with
// a leading minus, and — most importantly for readability — zeros rendered as a
// dash ("-") instead of "$0"/"0" cluttering a sparse grid.
const (
	// moneyAccounting: positive; negative; zero-as-dash; text.
	moneyAccounting = `_-* #,##0_-;-* #,##0_-;_-* "-"??_-;_-@_-`
	// moneySignedAccounting: same, but negatives in red for variance columns.
	moneySignedAccounting = `_-* #,##0_-;[Red]-* #,##0_-;_-* "-"??_-;_-@_-`
)

// customNumFmt returns the Excel number-format string for a CellFormat, or ""
// when the format needs no custom pattern (plain text).
func customNumFmt(format CellFormat) string {
	switch format {
	case FormatInt:
		return "#,##0"
	case FormatMoney:
		return moneyAccounting
	case FormatMoneySigned:
		return moneySignedAccounting
	case FormatDate:
		return "dd/mm/yyyy"
	case FormatPercent:
		return "0.0%"
	default:
		return ""
	}
}

// horizontalAlign returns the preferred horizontal alignment per format.
func horizontalAlign(format CellFormat) string {
	switch format {
	case FormatInt, FormatMoney, FormatMoneySigned, FormatPercent:
		return "right"
	case FormatDate:
		return "center"
	default:
		return "left"
	}
}

const (
	headerFill  = "#1F3A5F" // dark slate blue
	headerText  = "#FFFFFF"
	borderColor = "#D0D5DD"
	totalFill   = "#EEF2F6"
	subtitleTxt = "#667085"
)

var allFormats = []CellFormat{
	FormatText, FormatInt, FormatMoney, FormatMoneySigned, FormatDate, FormatPercent,
}

func thinBorder() []excelize.Border {
	return []excelize.Border{
		{Type: "left", Color: borderColor, Style: 1},
		{Type: "top", Color: borderColor, Style: 1},
		{Type: "bottom", Color: borderColor, Style: 1},
		{Type: "right", Color: borderColor, Style: 1},
	}
}

// buildStyles registers every style used by the renderer against the given file.
func buildStyles(f *excelize.File) (*styleSet, error) {
	st := &styleSet{
		body:  make(map[CellFormat]int, len(allFormats)),
		total: make(map[CellFormat]int, len(allFormats)),
	}

	var err error
	if st.title, err = f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 15, Color: headerFill},
		Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center"},
	}); err != nil {
		return nil, err
	}

	if st.subtitle, err = f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 11, Color: subtitleTxt},
		Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center"},
	}); err != nil {
		return nil, err
	}

	if st.header, err = f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: headerText, Size: 11},
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{headerFill}},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border:    thinBorder(),
	}); err != nil {
		return nil, err
	}

	for _, format := range allFormats {
		numFmt := customNumFmt(format)
		align := horizontalAlign(format)

		bodyStyle := &excelize.Style{
			Alignment: &excelize.Alignment{Horizontal: align, Vertical: "center"},
			Border:    thinBorder(),
		}
		if numFmt != "" {
			bodyStyle.CustomNumFmt = &numFmt
		}
		if st.body[format], err = f.NewStyle(bodyStyle); err != nil {
			return nil, err
		}

		totalStyle := &excelize.Style{
			Font:      &excelize.Font{Bold: true},
			Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{totalFill}},
			Alignment: &excelize.Alignment{Horizontal: align, Vertical: "center"},
			Border:    thinBorder(),
		}
		if numFmt != "" {
			totalStyle.CustomNumFmt = &numFmt
		}
		if st.total[format], err = f.NewStyle(totalStyle); err != nil {
			return nil, err
		}
	}

	return st, nil
}
