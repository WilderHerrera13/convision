package v1

import (
	"bytes"
	"fmt"
	"strings"

	"github.com/jung-kurt/gofpdf"
	qrcode "github.com/skip2/go-qrcode"

	"github.com/convision/api/internal/domain"
)

func pdfDash(v string) string {
	if strings.TrimSpace(v) == "" {
		return "—"
	}
	return v
}

func buildLabOrderPDF(order *domain.LaboratoryOrder) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(10, 10, 10)
	pdf.AddPage()
	pdf.SetAutoPageBreak(true, 15)

	pageW, _ := pdf.GetPageSize()
	contentW := pageW - 20

	accentBlue := [3]int{37, 99, 235}
	lightBlue := [3]int{239, 246, 255}
	darkText := [3]int{18, 18, 21}
	mutedText := [3]int{125, 125, 135}
	borderGray := [3]int{229, 229, 233}
	white := [3]int{255, 255, 255}

	setRGB := func(r, g, b int) {
		pdf.SetTextColor(r, g, b)
	}
	setFillRGB := func(r, g, b int) {
		pdf.SetFillColor(r, g, b)
	}
	setDrawRGB := func(r, g, b int) {
		pdf.SetDrawColor(r, g, b)
	}

	// ── Top accent bar ──────────────────────────────────────────────
	setFillRGB(accentBlue[0], accentBlue[1], accentBlue[2])
	pdf.Rect(10, 10, contentW, 2, "F")

	// ── Header ──────────────────────────────────────────────────────
	setFillRGB(white[0], white[1], white[2])
	pdf.Rect(10, 12, contentW, 28, "F")

	// Logo text (since we don't have an embedded image)
	pdf.SetXY(12, 14)
	pdf.SetFont("Helvetica", "B", 11)
	setRGB(accentBlue[0], accentBlue[1], accentBlue[2])
	pdf.CellFormat(40, 6, "OPTICA", "", 0, "L", false, 0, "")
	pdf.SetXY(12, 20)
	pdf.SetFont("Helvetica", "B", 11)
	pdf.CellFormat(40, 6, "CONVISION", "", 0, "L", false, 0, "")

	// Center: title + order number
	pdf.SetXY(60, 13)
	pdf.SetFont("Helvetica", "", 7)
	setRGB(mutedText[0], mutedText[1], mutedText[2])
	pdf.CellFormat(80, 5, "ORDEN DE LABORATORIO", "", 0, "C", false, 0, "")
	pdf.SetXY(60, 17)
	pdf.SetFont("Helvetica", "B", 18)
	setRGB(darkText[0], darkText[1], darkText[2])
	pdf.CellFormat(80, 12, fmt.Sprintf("N\u00B0 %s", order.OrderNumber), "", 0, "C", false, 0, "")
	pdf.SetXY(60, 30)
	pdf.SetFont("Helvetica", "", 7)
	setRGB(mutedText[0], mutedText[1], mutedText[2])
	saleRef := ""
	if order.SaleID != nil {
		saleRef = fmt.Sprintf("%d", *order.SaleID)
	}
	pdf.CellFormat(80, 5, fmt.Sprintf("Pedido N\u00B0: %s", pdfDash(saleRef)), "", 0, "C", false, 0, "")

	// Right clinic card
	cardX := float64(145)
	cardW := float64(55)
	setFillRGB(lightBlue[0], lightBlue[1], lightBlue[2])
	setDrawRGB(borderGray[0], borderGray[1], borderGray[2])
	pdf.Rect(cardX, 12, cardW, 28, "FD")
	setFillRGB(accentBlue[0], accentBlue[1], accentBlue[2])
	pdf.Rect(cardX, 12, 2, 28, "F")

	lineH := float64(4.2)
	startY := 13.5
	labelX := cardX + 3
	valueX := cardX + 14

	clinicLines := []struct{ label, value string }{
		{"Optica", "CONVISION"},
		{"Sede", pdfDash(order.Branch)},
	}
	for i, cl := range clinicLines {
		y := startY + float64(i)*lineH
		pdf.SetXY(labelX, y)
		pdf.SetFont("Helvetica", "", 5.5)
		setRGB(mutedText[0], mutedText[1], mutedText[2])
		pdf.CellFormat(10, lineH, cl.label, "", 0, "L", false, 0, "")
		pdf.SetXY(valueX, y)
		pdf.SetFont("Helvetica", "B", 5.5)
		setRGB(darkText[0], darkText[1], darkText[2])
		pdf.CellFormat(cardW-14, lineH, cl.value, "", 0, "L", false, 0, "")
	}

	// ORIGINAL badge
	setFillRGB(239, 246, 255)
	pdf.Rect(148, 12, 24, 7, "F")
	pdf.SetXY(148, 12)
	pdf.SetFont("Helvetica", "B", 6)
	setRGB(accentBlue[0], accentBlue[1], accentBlue[2])
	pdf.CellFormat(24, 7, "ORIGINAL", "", 0, "C", false, 0, "")

	// ── Divider ─────────────────────────────────────────────────────
	y := 42.0
	setDrawRGB(borderGray[0], borderGray[1], borderGray[2])
	pdf.SetLineWidth(0.3)
	pdf.Line(10, y, 10+contentW, y)
	y += 2

	// ── Info row ────────────────────────────────────────────────────
	setFillRGB(250, 250, 251)
	pdf.Rect(10, y, contentW, 20, "FD")
	setFillRGB(accentBlue[0], accentBlue[1], accentBlue[2])
	pdf.Rect(10, y, 2, 20, "F")
	pdf.Line(10+contentW/2, y, 10+contentW/2, y+20)

	patientName := ""
	patientDoc := ""
	if order.Patient != nil {
		patientName = strings.TrimSpace(order.Patient.FirstName + " " + order.Patient.LastName)
		patientDoc = order.Patient.Identification
	}

	labName := ""
	labPhone := ""
	if order.Laboratory != nil {
		labName = order.Laboratory.Name
		labPhone = order.Laboratory.Phone
	}

	createdAt := order.CreatedAt.Format("02/01/2006 15:04")
	estDelivery := ""
	if order.EstimatedCompletionDate != nil {
		estDelivery = "  Entrega: " + order.EstimatedCompletionDate.Format("02/01/2006")
	}

	leftLines := []struct{ label, value string }{
		{"Paciente:", patientName},
		{"Documento:", pdfDash(patientDoc)},
		{"Vendedor:", pdfDash(order.SellerName)},
	}
	rightLines := []struct{ label, value string }{
		{"Proveedor:", labName},
		{"Tel. Prov.:", labPhone},
		{"Fecha crea.:", createdAt + estDelivery},
	}

	for i, l := range leftLines {
		iy := y + 2.5 + float64(i)*5.5
		pdf.SetXY(13, iy)
		pdf.SetFont("Helvetica", "", 6)
		setRGB(mutedText[0], mutedText[1], mutedText[2])
		pdf.CellFormat(20, 5, l.label, "", 0, "L", false, 0, "")
		pdf.SetXY(34, iy)
		pdf.SetFont("Helvetica", "B", 6.5)
		setRGB(darkText[0], darkText[1], darkText[2])
		pdf.CellFormat(60, 5, l.value, "", 0, "L", false, 0, "")
	}
	midX := 10 + contentW/2 + 2
	for i, l := range rightLines {
		iy := y + 2.5 + float64(i)*5.5
		pdf.SetXY(midX, iy)
		pdf.SetFont("Helvetica", "", 6)
		setRGB(mutedText[0], mutedText[1], mutedText[2])
		pdf.CellFormat(20, 5, l.label, "", 0, "L", false, 0, "")
		pdf.SetXY(midX+21, iy)
		pdf.SetFont("Helvetica", "B", 6.5)
		setRGB(darkText[0], darkText[1], darkText[2])
		pdf.CellFormat(70, 5, l.value, "", 0, "L", false, 0, "")
	}
	y += 22

	// ── RX Section header ────────────────────────────────────────────
	setFillRGB(accentBlue[0], accentBlue[1], accentBlue[2])
	pdf.Rect(10, y, contentW, 7, "F")
	pdf.SetXY(13, y)
	pdf.SetFont("Helvetica", "B", 7)
	setRGB(white[0], white[1], white[2])
	pdf.CellFormat(contentW-3, 7, "PRESCRIPCI\u00D3N \u00D3PTICA \u2014 F\u00D3RMULA RX Y PRISMA", "", 0, "L", false, 0, "")
	y += 7

	// RX table columns
	rxCols := []struct {
		label string
		w     float64
	}{
		{"", 12},
		{"Esfera", 17},
		{"Cilindro", 17},
		{"Eje", 14},
		{"Adicion", 16},
		{"DP", 13},
		{"AF", 13},
		{"\u00D8", 13},
		{"Curva B", 16},
		{"Poder", 15},
		{"Prisma H", 16},
		{"Prisma V", 16},
	}

	// Table header row
	setFillRGB(240, 244, 255)
	pdf.Rect(10, y, contentW, 7, "F")
	x := 10.0
	for _, col := range rxCols {
		pdf.SetXY(x, y)
		pdf.SetFont("Helvetica", "B", 6)
		setRGB(darkText[0], darkText[1], darkText[2])
		setDrawRGB(borderGray[0], borderGray[1], borderGray[2])
		pdf.CellFormat(col.w, 7, col.label, "R", 0, "C", false, 0, "")
		x += col.w
	}
	y += 7

	rxToRow := func(rx *domain.RxEye) [11]string {
		if rx == nil {
			return [11]string{"—", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—"}
		}
		return [11]string{
			pdfDash(rx.Sphere),
			pdfDash(rx.Cylinder),
			pdfDash(rx.Axis),
			pdfDash(rx.Addition),
			pdfDash(rx.DP),
			pdfDash(rx.AF),
			pdfDash(rx.Diameter),
			pdfDash(rx.BaseCurve),
			pdfDash(rx.Power),
			pdfDash(rx.PrismH),
			pdfDash(rx.PrismV),
		}
	}

	rxRows := []struct {
		eye  string
		vals [11]string
	}{
		{"OD", rxToRow(order.RxOD)},
		{"OI", rxToRow(order.RxOI)},
	}

	for ri, row := range rxRows {
		bg := white
		if ri%2 == 1 {
			bg = [3]int{248, 249, 255}
		}
		setFillRGB(bg[0], bg[1], bg[2])
		pdf.Rect(10, y, contentW, 8, "FD")
		x = 10.0
		// Eye label
		pdf.SetXY(x, y)
		pdf.SetFont("Helvetica", "B", 7)
		setRGB(accentBlue[0], accentBlue[1], accentBlue[2])
		pdf.CellFormat(rxCols[0].w, 8, row.eye, "R", 0, "C", false, 0, "")
		x += rxCols[0].w
		// Value cells
		for ci, val := range row.vals {
			pdf.SetXY(x, y)
			pdf.SetFont("Helvetica", "", 6.5)
			setRGB(darkText[0], darkText[1], darkText[2])
			pdf.CellFormat(rxCols[ci+1].w, 8, val, "R", 0, "C", false, 0, "")
			x += rxCols[ci+1].w
		}
		y += 8
	}
	y += 3

	// ── Lenses + Frame specs ──────────────────────────────────────────
	halfW := contentW / 2

	// Left: Lenses
	setFillRGB(accentBlue[0], accentBlue[1], accentBlue[2])
	pdf.Rect(10, y, halfW-1, 7, "F")
	pdf.SetXY(13, y)
	pdf.SetFont("Helvetica", "B", 7)
	setRGB(white[0], white[1], white[2])
	pdf.CellFormat(halfW-3, 7, "LENTES PRESCRITOS", "", 0, "L", false, 0, "")

	// Right: Frame specs
	pdf.Rect(10+halfW+1, y, halfW-1, 7, "F")
	pdf.SetXY(13+halfW+1, y)
	pdf.CellFormat(halfW-3, 7, "ESPECIFICACIONES DE MONTURA", "", 0, "L", false, 0, "")
	y += 7

	// Lenses content
	lensH := 22.0
	setFillRGB(250, 250, 251)
	setDrawRGB(borderGray[0], borderGray[1], borderGray[2])
	pdf.Rect(10, y, halfW-1, lensH, "FD")

	lensOD := pdfDash(order.LensOD)
	lensOI := pdfDash(order.LensOI)
	pdf.SetXY(13, y+2)
	pdf.SetFont("Helvetica", "B", 7)
	setRGB(accentBlue[0], accentBlue[1], accentBlue[2])
	pdf.CellFormat(8, 5, "OD", "", 0, "L", false, 0, "")
	pdf.SetXY(22, y+2)
	pdf.SetFont("Helvetica", "", 6.5)
	setRGB(darkText[0], darkText[1], darkText[2])
	pdf.MultiCell(halfW-13, 5, lensOD, "", "L", false)

	pdf.SetXY(13, y+11)
	pdf.SetFont("Helvetica", "B", 7)
	setRGB(accentBlue[0], accentBlue[1], accentBlue[2])
	pdf.CellFormat(8, 5, "OI", "", 0, "L", false, 0, "")
	pdf.SetXY(22, y+11)
	pdf.SetFont("Helvetica", "", 6.5)
	setRGB(darkText[0], darkText[1], darkText[2])
	pdf.MultiCell(halfW-13, 5, lensOI, "", "L", false)

	// Frame specs content
	pdf.Rect(10+halfW+1, y, halfW-1, lensH, "FD")

	fs := order.FrameSpecs
	frameLines := [][2]string{
		{"Montura:", ""},
		{"Tipo:", ""},
		{"Gen.:", ""},
		{"Color:", ""},
		{"Horiz.:", ""},
		{"Puente:", ""},
		{"Vert.:", ""},
		{"\u00C1ng.pant:", ""},
		{"Dist.Mec:", ""},
		{"\u00C1ng.panor:", ""},
		{"\u00D8 Efect.:", ""},
	}
	if fs != nil {
		frameLines[0][1] = pdfDash(fs.Name)
		frameLines[1][1] = pdfDash(fs.Type)
		frameLines[2][1] = pdfDash(fs.Gender)
		frameLines[3][1] = pdfDash(fs.Color)
		frameLines[4][1] = pdfDash(fs.Horizontal)
		frameLines[5][1] = pdfDash(fs.Bridge)
		frameLines[6][1] = pdfDash(fs.Vertical)
		frameLines[7][1] = pdfDash(fs.PantoscopicAngle)
		frameLines[8][1] = pdfDash(fs.MechanicalDistance)
		frameLines[9][1] = pdfDash(fs.PanoramicAngle)
		frameLines[10][1] = pdfDash(fs.EffectiveDiameter)
	} else {
		for i := range frameLines {
			frameLines[i][1] = "—"
		}
	}

	colsPerRow := 2
	fxBase := 10 + halfW + 3
	fyBase := y + 1.5
	fLineH := 3.8
	itemW := (halfW - 4) / float64(colsPerRow)
	for i, fl := range frameLines {
		col := i % colsPerRow
		row := i / colsPerRow
		fx := fxBase + float64(col)*itemW
		fy := fyBase + float64(row)*fLineH
		pdf.SetXY(fx, fy)
		pdf.SetFont("Helvetica", "", 5.5)
		setRGB(mutedText[0], mutedText[1], mutedText[2])
		pdf.CellFormat(12, fLineH, fl[0], "", 0, "L", false, 0, "")
		pdf.SetXY(fx+12, fy)
		pdf.SetFont("Helvetica", "B", 5.5)
		setRGB(darkText[0], darkText[1], darkText[2])
		pdf.CellFormat(itemW-12, fLineH, fl[1], "", 0, "L", false, 0, "")
	}

	y += lensH + 3

	// ── Special instructions ─────────────────────────────────────────
	setFillRGB(accentBlue[0], accentBlue[1], accentBlue[2])
	pdf.Rect(10, y, contentW, 7, "F")
	pdf.SetXY(13, y)
	pdf.SetFont("Helvetica", "B", 7)
	setRGB(white[0], white[1], white[2])
	pdf.CellFormat(contentW-3, 7, "OBSERVACIONES E INSTRUCCIONES ESPECIALES", "", 0, "L", false, 0, "")
	y += 7

	instrText := order.SpecialInstructions
	if instrText == "" {
		instrText = order.Notes
	}
	if instrText == "" {
		instrText = "Sin observaciones adicionales."
	}

	setFillRGB(250, 250, 251)
	setDrawRGB(borderGray[0], borderGray[1], borderGray[2])
	pdf.Rect(10, y, contentW, 18, "FD")
	pdf.SetXY(13, y+2)
	pdf.SetFont("Helvetica", "", 7)
	setRGB(darkText[0], darkText[1], darkText[2])
	pdf.MultiCell(contentW-6, 4.5, instrText, "", "L", false)
	y += 21

	// ── Signatures ───────────────────────────────────────────────────
	setDrawRGB(borderGray[0], borderGray[1], borderGray[2])
	pdf.SetFont("Helvetica", "", 5.5)
	setRGB(mutedText[0], mutedText[1], mutedText[2])
	sigW := contentW / 3
	sigs := []string{"Firma Responsable \u00D3ptica", "Firma Laboratorio", "Firma Cliente / Acudiente"}
	for i, sig := range sigs {
		sx := 10 + float64(i)*sigW
		pdf.Line(sx+5, y+10, sx+sigW-5, y+10)
		pdf.SetXY(sx, y+11)
		pdf.CellFormat(sigW, 5, sig, "", 0, "C", false, 0, "")
	}
	y += 18

	// ── Footer ───────────────────────────────────────────────────────
	setFillRGB(darkText[0], darkText[1], darkText[2])
	pdf.Rect(10, y, contentW, 22, "F")

	// QR code
	qrContent := fmt.Sprintf("Orden:%s|Paciente:%s|Lab:%s|Fecha:%s",
		order.OrderNumber, patientName, labName, order.CreatedAt.Format("2006-01-02"))
	qrBytes, qrErr := qrcode.Encode(qrContent, qrcode.Medium, 80)
	if qrErr == nil {
		imgOpts := gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: true}
		pdf.RegisterImageOptionsReader("qr", imgOpts, bytes.NewReader(qrBytes))
		pdf.ImageOptions("qr", 12, y+2, 18, 18, false, imgOpts, 0, "")
	}

	// Footer text
	pdf.SetXY(32, y+4)
	pdf.SetFont("Helvetica", "B", 9)
	setRGB(white[0], white[1], white[2])
	pdf.CellFormat(50, 6, "CONVISION", "", 0, "L", false, 0, "")
	pdf.SetXY(32, y+10)
	pdf.SetFont("Helvetica", "", 6.5)
	setRGB(200, 200, 210)
	pdf.CellFormat(50, 5, "Software de Gesti\u00F3n \u00D3ptica", "", 0, "L", false, 0, "")

	// Order number as barcode substitute
	pdf.SetXY(10+contentW/2-30, y+7)
	pdf.SetFont("Helvetica", "B", 9)
	setRGB(white[0], white[1], white[2])
	pdf.CellFormat(60, 8, order.OrderNumber, "1", 0, "C", false, 0, "")

	// Legal note
	pdf.SetXY(10+contentW/2+35, y+3)
	pdf.SetFont("Helvetica", "", 5.5)
	setRGB(200, 200, 210)
	pdf.MultiCell(55, 4, "Documento generado digitalmente — No requiere firma manual cuando lleva sello digital", "", "L", false)

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
