package v1

import (
	"bytes"
	"fmt"
	"image"
	"image/draw"
	"image/png"
	"math"
	"strings"

	"github.com/boombuler/barcode"
	"github.com/boombuler/barcode/code128"
	"github.com/jung-kurt/gofpdf"
	qrcode "github.com/skip2/go-qrcode"

	"github.com/convision/api/internal/domain"
)

// formatCOP renders a currency amount the way the frontend does (es-CO):
// "$ 1.234.567" with dot thousand separators; cents only when non-zero.
func formatCOP(v float64) string {
	neg := v < 0
	if neg {
		v = -v
	}
	cents := int64(math.Round(v*100)) % 100
	whole := int64(math.Round(v*100)) / 100

	s := fmt.Sprintf("%d", whole)
	var b strings.Builder
	pre := len(s) % 3
	if pre > 0 {
		b.WriteString(s[:pre])
		if len(s) > pre {
			b.WriteString(".")
		}
	}
	for i := pre; i < len(s); i += 3 {
		b.WriteString(s[i : i+3])
		if i+3 < len(s) {
			b.WriteString(".")
		}
	}
	out := "$ " + b.String()
	if cents != 0 {
		out += fmt.Sprintf(",%02d", cents)
	}
	if neg {
		out = "- " + out
	}
	return out
}

// paymentStatusLabel maps a sale payment_status to the Spanish label shown on the receipt.
func paymentStatusLabel(status string) string {
	switch status {
	case "paid":
		return "PAGADO"
	case "partial":
		return "ABONO PARCIAL"
	default:
		return "PENDIENTE"
	}
}

// buildSalePDF renders the customer-facing sale receipt. Visual language mirrors
// buildLabOrderPDF (navy/blue palette, cards, QR + barcode footer).
func buildSalePDF(sale *domain.Sale, branchName, promotionName string) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(10, 10, 10)
	pdf.AddPage()
	pdf.SetAutoPageBreak(true, 15)
	tr := pdf.UnicodeTranslatorFromDescriptor("")

	pageW, _ := pdf.GetPageSize()
	contentW := pageW - 20

	navyDark := [3]int{26, 51, 102}
	navyMid := [3]int{26, 75, 142}
	brightBlue := [3]int{58, 113, 247}
	lightBlue := [3]int{232, 239, 247}
	darkText := [3]int{17, 24, 36}
	bodyText := [3]int{45, 55, 72}
	mutedText := [3]int{138, 148, 166}
	borderGray := [3]int{221, 226, 234}
	cardBg := [3]int{248, 249, 251}
	tableBg := [3]int{239, 242, 247}
	white := [3]int{255, 255, 255}
	green := [3]int{15, 143, 100}
	red := [3]int{175, 41, 38}
	footerBg := [3]int{15, 15, 18}
	logoBlue := [3]int{54, 63, 128}

	setRGB := func(c [3]int) { pdf.SetTextColor(c[0], c[1], c[2]) }
	setFill := func(c [3]int) { pdf.SetFillColor(c[0], c[1], c[2]) }
	setDraw := func(c [3]int) { pdf.SetDrawColor(c[0], c[1], c[2]) }

	patientName, patientDoc, patientPhone := "", "", ""
	if sale.Patient != nil {
		patientName = strings.TrimSpace(sale.Patient.FirstName + " " + sale.Patient.LastName)
		patientDoc = sale.Patient.Identification
		patientPhone = sale.Patient.Phone
	}
	sellerName := ""
	if sale.CreatedByUser != nil {
		sellerName = strings.TrimSpace(sale.CreatedByUser.Name + " " + sale.CreatedByUser.LastName)
	}
	saleDate := sale.CreatedAt.Format("02/01/2006 15:04")

	// ── Top accent bar + header ─────────────────────────────────────
	setFill(navyDark)
	pdf.Rect(10, 10, contentW, 1, "F")
	setFill(white)
	pdf.Rect(10, 11, contentW, 26, "F")

	pdf.SetXY(12, 14.5)
	pdf.SetFont("Helvetica", "B", 10)
	setRGB(logoBlue)
	pdf.CellFormat(38, 5, tr("ÓPTICA"), "", 0, "L", false, 0, "")
	pdf.SetXY(12, 20)
	pdf.CellFormat(38, 5, tr("CONVISIÓN"), "", 0, "L", false, 0, "")

	cardW := 64.0
	cardX := 10 + contentW - cardW
	setFill(lightBlue)
	setDraw([3]int{197, 214, 237})
	pdf.SetLineWidth(0.2)
	pdf.RoundedRect(cardX, 12, cardW, 25, 1.5, "1234", "FD")
	setFill(navyMid)
	pdf.Rect(cardX, 12, 1, 25, "F")

	for i, cl := range [][2]string{
		{"Óptica", "CONVISION"},
		{"Sede", pdfDash(branchName)},
		{"Fecha", saleDate},
	} {
		ly := 14.0 + float64(i)*5.0
		pdf.SetXY(cardX+2.5, ly)
		pdf.SetFont("Helvetica", "B", 5.5)
		setRGB(navyMid)
		pdf.CellFormat(13, 4.5, tr(cl[0]), "", 0, "L", false, 0, "")
		pdf.SetXY(cardX+16, ly)
		pdf.SetFont("Helvetica", "", 5.5)
		setRGB(bodyText)
		pdf.CellFormat(cardW-17, 4.5, tr(cl[1]), "", 0, "L", false, 0, "")
	}

	badgeX := cardX + cardW - 21
	setFill(navyMid)
	pdf.RoundedRect(badgeX, 13, 20, 5.5, 2.5, "1234", "F")
	pdf.SetXY(badgeX, 13)
	pdf.SetFont("Helvetica", "B", 5.5)
	setRGB(white)
	pdf.CellFormat(20, 5.5, "ORIGINAL", "", 0, "C", false, 0, "")

	titleX := 50.0
	titleW := cardX - titleX - 2
	pdf.SetXY(titleX, 14.5)
	pdf.SetFont("Helvetica", "", 6)
	setRGB(mutedText)
	pdf.CellFormat(titleW, 4, "COMPROBANTE DE VENTA", "", 0, "C", false, 0, "")
	pdf.SetXY(titleX, 18.5)
	pdf.SetFont("Helvetica", "B", 17)
	setRGB(navyMid)
	pdf.CellFormat(titleW, 11, tr(fmt.Sprintf("N° %s", sale.SaleNumber)), "", 0, "C", false, 0, "")
	pdf.SetXY(titleX-6, 30)
	pdf.SetFont("Helvetica", "", 6)
	setRGB(mutedText)
	pdf.CellFormat(titleW+12, 4, tr(fmt.Sprintf("Estado de pago: %s", paymentStatusLabel(sale.PaymentStatus))), "", 0, "C", false, 0, "")

	y := 37.0
	setDraw(borderGray)
	pdf.SetLineWidth(0.2)
	pdf.Line(10, y, 10+contentW, y)
	y += 1.5

	// ── Info card: patient | sale meta ──────────────────────────────
	infoH := 17.0
	setFill(cardBg)
	setDraw(borderGray)
	pdf.RoundedRect(10, y, contentW, infoH, 1.5, "1234", "FD")
	setFill(navyMid)
	pdf.Rect(10, y, 1, infoH, "F")
	splitX := 10 + contentW*0.54
	pdf.Rect(splitX, y, 1, infoH, "F")

	lLines := [][2]string{
		{"Cliente:", pdfDash(patientName)},
		{"Documento:", pdfDash(patientDoc)},
		{"Teléfono:", pdfDash(patientPhone)},
	}
	rLines := [][2]string{
		{"Vendedor:", pdfDash(sellerName)},
		{"Fecha venta:", saleDate},
		{"Comprobante:", sale.SaleNumber},
	}
	ilh := 5.0
	lbW := 22.0
	for i, l := range lLines {
		iy := y + 2 + float64(i)*ilh
		pdf.SetXY(13, iy)
		pdf.SetFont("Helvetica", "", 5.8)
		setRGB(mutedText)
		pdf.CellFormat(lbW, ilh, tr(l[0]), "", 0, "L", false, 0, "")
		pdf.SetXY(13+lbW, iy)
		pdf.SetFont("Helvetica", "B", 6)
		setRGB(darkText)
		pdf.CellFormat(contentW*0.54-lbW-5, ilh, tr(l[1]), "", 0, "L", false, 0, "")
	}
	midX := splitX + 3
	rlbW := 24.0
	for i, l := range rLines {
		iy := y + 2 + float64(i)*ilh
		pdf.SetXY(midX, iy)
		pdf.SetFont("Helvetica", "", 5.8)
		setRGB(mutedText)
		pdf.CellFormat(rlbW, ilh, tr(l[0]), "", 0, "L", false, 0, "")
		pdf.SetXY(midX+rlbW, iy)
		pdf.SetFont("Helvetica", "B", 6)
		setRGB(darkText)
		pdf.CellFormat(contentW*0.46-rlbW-5, ilh, tr(l[1]), "", 0, "L", false, 0, "")
	}
	y += infoH + 3

	// ── Items table ─────────────────────────────────────────────────
	setFill(brightBlue)
	pdf.RoundedRect(10, y, contentW, 6.5, 1.5, "1234", "F")
	pdf.SetXY(13, y+0.8)
	pdf.SetFont("Helvetica", "B", 7)
	setRGB(white)
	pdf.CellFormat(contentW-3, 6.5, "DETALLE DE PRODUCTOS", "", 0, "L", false, 0, "")
	y += 6.5

	cols := []struct {
		label string
		w     float64
		align string
	}{
		{"#", 8, "C"},
		{"Descripción", contentW - 8 - 14 - 30 - 26 - 30, "L"},
		{"Cant.", 14, "C"},
		{"Precio unit.", 30, "R"},
		{"Desc.", 26, "R"},
		{"Total", 30, "R"},
	}
	thH := 6.2
	setFill(tableBg)
	setDraw(borderGray)
	pdf.Rect(10, y, contentW, thH, "FD")
	cx := 10.0
	for _, col := range cols {
		pdf.SetXY(cx+1, y)
		pdf.SetFont("Helvetica", "B", 5.8)
		setRGB(navyMid)
		pdf.CellFormat(col.w-2, thH, tr(col.label), "", 0, col.align, false, 0, "")
		cx += col.w
	}
	y += thH

	rwH := 7.0
	for i, it := range sale.Items {
		rowBg := white
		if i%2 == 1 {
			rowBg = cardBg
		}
		setFill(rowBg)
		pdf.Rect(10, y, contentW, rwH, "F")

		// The checkout payload doesn't send item names, so resolve the
		// description from the preloaded catalog product when absent.
		desc := it.Name
		if desc == "" {
			desc = it.Description
		}
		if desc == "" && it.Product != nil {
			desc = it.Product.Description
			if it.Product.InternalCode != "" {
				desc = it.Product.InternalCode + " — " + desc
			}
		}
		if desc == "" {
			desc = "Producto"
		}
		if len([]rune(desc)) > 58 {
			desc = string([]rune(desc)[:57]) + "…"
		}
		discTxt := "—"
		if it.Discount > 0 {
			discTxt = "- " + formatCOP(it.Discount)
		}
		vals := []string{
			fmt.Sprintf("%d", i+1),
			desc,
			fmt.Sprintf("%d", it.Quantity),
			formatCOP(it.Price),
			discTxt,
			formatCOP(it.Total),
		}
		cx = 10.0
		for vi, col := range cols {
			pdf.SetXY(cx+1, y)
			style := ""
			color := bodyText
			if vi == 1 {
				style = "B"
				color = darkText
			}
			if vi == 4 && it.Discount > 0 {
				color = red
			}
			pdf.SetFont("Helvetica", style, 6.3)
			setRGB(color)
			pdf.CellFormat(col.w-2, rwH, tr(vals[vi]), "", 0, col.align, false, 0, "")
			cx += col.w
		}
		setDraw(borderGray)
		pdf.Line(10, y+rwH, 10+contentW, y+rwH)
		y += rwH
	}
	setDraw(borderGray)
	pdf.Rect(10, y-rwH*float64(len(sale.Items))-thH, contentW, thH+rwH*float64(len(sale.Items)), "D")
	y += 3

	// ── Totals card (right) + payments (left) ───────────────────────
	totW := 78.0
	totX := 10 + contentW - totW

	type totRow struct {
		label string
		value string
		color [3]int
		bold  bool
	}
	rows := []totRow{{"Subtotal", formatCOP(sale.Subtotal), bodyText, false}}
	if sale.Discount > 0 {
		rows = append(rows, totRow{"Descuento", "- " + formatCOP(sale.Discount), red, false})
	}
	if sale.PromotionDiscount > 0 {
		label := "Promoción"
		if promotionName != "" {
			label = "Promoción · " + promotionName
		}
		if len([]rune(label)) > 34 {
			label = string([]rune(label)[:33]) + "…"
		}
		rows = append(rows, totRow{label, "- " + formatCOP(sale.PromotionDiscount), green, false})
	}
	rows = append(rows, totRow{"IVA (19%)", formatCOP(sale.Tax), bodyText, false})

	totRowH := 5.6
	totH := totRowH*float64(len(rows)) + 9.5
	setFill(cardBg)
	setDraw(borderGray)
	pdf.RoundedRect(totX, y, totW, totH, 1.5, "1234", "FD")
	for i, r := range rows {
		ry := y + 2 + float64(i)*totRowH
		pdf.SetXY(totX+3, ry)
		pdf.SetFont("Helvetica", "", 6.2)
		setRGB(r.color)
		pdf.CellFormat(totW*0.62-3, totRowH, tr(r.label), "", 0, "L", false, 0, "")
		pdf.SetXY(totX+totW*0.62, ry)
		pdf.SetFont("Helvetica", "B", 6.2)
		pdf.CellFormat(totW*0.38-3, totRowH, tr(r.value), "", 0, "R", false, 0, "")
	}
	tly := y + 2 + float64(len(rows))*totRowH + 0.5
	setDraw(borderGray)
	pdf.Line(totX+2, tly, totX+totW-2, tly)
	pdf.SetXY(totX+3, tly+1)
	pdf.SetFont("Helvetica", "B", 8.5)
	setRGB(darkText)
	pdf.CellFormat(totW*0.45-3, 6, "TOTAL", "", 0, "L", false, 0, "")
	pdf.SetXY(totX+totW*0.45, tly+1)
	setRGB(navyMid)
	pdf.CellFormat(totW*0.55-3, 6, tr(formatCOP(sale.Total)), "", 0, "R", false, 0, "")

	// Payments (left column, aligned with totals card)
	payW := contentW - totW - 6
	pdf.SetXY(10, y)
	pdf.SetFont("Helvetica", "B", 6.5)
	setRGB(navyMid)
	pdf.CellFormat(payW, 5, "FORMAS DE PAGO", "", 0, "L", false, 0, "")
	py := y + 6
	if len(sale.Payments) == 0 {
		pdf.SetXY(10, py)
		pdf.SetFont("Helvetica", "", 6)
		setRGB(mutedText)
		pdf.CellFormat(payW, 5, "Sin pagos registrados", "", 0, "L", false, 0, "")
		py += 5
	}
	for _, p := range sale.Payments {
		method := "Pago"
		if p.PaymentMethod != nil && p.PaymentMethod.Name != "" {
			method = p.PaymentMethod.Name
		}
		ref := ""
		if strings.TrimSpace(p.ReferenceNumber) != "" {
			ref = " · Ref: " + p.ReferenceNumber
		}
		when := ""
		if p.PaymentDate != nil {
			when = " · " + p.PaymentDate.Format("02/01/2006")
		}
		pdf.SetXY(10, py)
		pdf.SetFont("Helvetica", "", 6.2)
		setRGB(bodyText)
		pdf.CellFormat(payW*0.68, 5, tr(method+ref+when), "", 0, "L", false, 0, "")
		pdf.SetFont("Helvetica", "B", 6.2)
		setRGB(darkText)
		pdf.CellFormat(payW*0.32, 5, tr(formatCOP(p.Amount)), "", 0, "R", false, 0, "")
		py += 5
	}
	py += 1
	setDraw(borderGray)
	pdf.Line(10, py, 10+payW, py)
	py += 1.5
	pdf.SetXY(10, py)
	pdf.SetFont("Helvetica", "", 6.2)
	setRGB(bodyText)
	pdf.CellFormat(payW*0.68, 5, "Pagado", "", 0, "L", false, 0, "")
	pdf.SetFont("Helvetica", "B", 6.2)
	setRGB(green)
	pdf.CellFormat(payW*0.32, 5, tr(formatCOP(sale.AmountPaid)), "", 0, "R", false, 0, "")
	py += 5
	pdf.SetXY(10, py)
	pdf.SetFont("Helvetica", "", 6.2)
	setRGB(bodyText)
	pdf.CellFormat(payW*0.68, 5, "Saldo pendiente", "", 0, "L", false, 0, "")
	pdf.SetFont("Helvetica", "B", 6.2)
	if sale.Balance > 0 {
		setRGB(red)
	} else {
		setRGB(green)
	}
	pdf.CellFormat(payW*0.32, 5, tr(formatCOP(sale.Balance)), "", 0, "R", false, 0, "")
	py += 6

	if py > y+totH {
		y = py + 3
	} else {
		y = y + totH + 3
	}

	// ── Notes ────────────────────────────────────────────────────────
	if strings.TrimSpace(sale.Notes) != "" {
		pdf.SetXY(10, y)
		pdf.SetFont("Helvetica", "B", 6)
		setRGB(mutedText)
		pdf.CellFormat(contentW, 4.5, "OBSERVACIONES", "", 0, "L", false, 0, "")
		y += 5
		pdf.SetXY(10, y)
		pdf.SetFont("Helvetica", "", 6.5)
		setRGB(bodyText)
		pdf.MultiCell(contentW, 4, tr(sale.Notes), "", "L", false)
		y = pdf.GetY() + 3
	}

	// ── Footer ───────────────────────────────────────────────────────
	if y < 240 {
		y = 240.0
	}
	setFill(footerBg)
	pdf.Rect(10, y, contentW, 24, "F")
	setFill(brightBlue)
	pdf.Rect(10, y+20, contentW, 4, "F")

	qrContent := fmt.Sprintf("Venta:%s|Cliente:%s|Total:%s|Fecha:%s",
		sale.SaleNumber, patientName, formatCOP(sale.Total), sale.CreatedAt.Format("2006-01-02"))
	if qrBytes, err := qrcode.Encode(qrContent, qrcode.Medium, 64); err == nil {
		imgOpts := gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: true}
		pdf.RegisterImageOptionsReader("qr-sale", imgOpts, bytes.NewReader(qrBytes))
		pdf.ImageOptions("qr-sale", 13, y+2, 14, 14, false, imgOpts, 0, "")
	}

	pdf.SetXY(29, y+3)
	pdf.SetFont("Helvetica", "B", 9)
	setRGB(white)
	pdf.CellFormat(50, 5, "CONVISION", "", 0, "L", false, 0, "")
	pdf.SetXY(29, y+9)
	pdf.SetFont("Helvetica", "", 6)
	pdf.SetTextColor(128, 128, 143)
	pdf.CellFormat(50, 5, tr("Software de Gestión Óptica"), "", 0, "L", false, 0, "")

	bcX := 10 + contentW/2 - 30.0
	setFill(white)
	pdf.RoundedRect(bcX, y+2, 60, 16, 1.5, "1234", "F")
	if bc, err := code128.Encode(sale.SaleNumber); err == nil {
		if scaled, err := barcode.Scale(bc, 220, 50); err == nil {
			// Re-draw into an 8-bit grayscale canvas: the scaler yields a 16-bit
			// image whose PNG encoding gofpdf cannot embed.
			gray := image.NewGray(scaled.Bounds())
			draw.Draw(gray, scaled.Bounds(), scaled, scaled.Bounds().Min, draw.Src)
			var bcBuf bytes.Buffer
			if png.Encode(&bcBuf, gray) == nil {
				opts := gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: false}
				pdf.RegisterImageOptionsReader("barcode-sale", opts, &bcBuf)
				pdf.ImageOptions("barcode-sale", bcX+2, y+3, 56, 9, false, opts, 0, "")
			}
		}
	}
	pdf.SetXY(bcX, y+13)
	pdf.SetFont("Helvetica", "", 5.5)
	pdf.SetTextColor(footerBg[0], footerBg[1], footerBg[2])
	pdf.CellFormat(60, 4, sale.SaleNumber, "", 0, "C", false, 0, "")

	pdf.SetXY(10+contentW*0.67, y+3)
	pdf.SetFont("Helvetica", "", 5.5)
	pdf.SetTextColor(128, 128, 143)
	pdf.MultiCell(contentW*0.33-2, 3.5, tr("Documento generado digitalmente — Gracias por su compra"), "", "R", false)

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
