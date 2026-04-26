package v1

import (
	"bytes"
	"fmt"
	"image/png"
	"strings"

	"github.com/boombuler/barcode"
	"github.com/boombuler/barcode/code128"
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

	navyDark   := [3]int{26, 51, 102}
	navyMid    := [3]int{26, 75, 142}
	brightBlue := [3]int{58, 113, 247}
	lightBlue  := [3]int{232, 239, 247}
	darkText   := [3]int{17, 24, 36}
	bodyText   := [3]int{45, 55, 72}
	mutedText  := [3]int{138, 148, 166}
	borderGray := [3]int{221, 226, 234}
	cardBg     := [3]int{248, 249, 251}
	tableBg    := [3]int{239, 242, 247}
	white      := [3]int{255, 255, 255}
	footerBg   := [3]int{15, 15, 18}
	logoBlue   := [3]int{54, 63, 128}

	setRGB  := func(c [3]int) { pdf.SetTextColor(c[0], c[1], c[2]) }
	setFill := func(c [3]int) { pdf.SetFillColor(c[0], c[1], c[2]) }
	setDraw := func(c [3]int) { pdf.SetDrawColor(c[0], c[1], c[2]) }

	patientName := ""
	patientDoc := ""
	if order.Patient != nil {
		patientName = strings.TrimSpace(order.Patient.FirstName + " " + order.Patient.LastName)
		patientDoc = order.Patient.Identification
	}
	labName, labPhone := "", ""
	if order.Laboratory != nil {
		labName = order.Laboratory.Name
		labPhone = order.Laboratory.Phone
	}
	saleRef := ""
	if order.SaleID != nil {
		saleRef = fmt.Sprintf("%d", *order.SaleID)
	}
	createdAt := order.CreatedAt.Format("02/01/2006 15:04")
	if order.EstimatedCompletionDate != nil {
		createdAt += "    Entrega: " + order.EstimatedCompletionDate.Format("02/01/2006")
	}

	// ── Top accent bar ──────────────────────────────────────────────
	setFill(navyDark)
	pdf.Rect(10, 10, contentW, 1, "F")

	// ── Header ──────────────────────────────────────────────────────
	setFill(white)
	pdf.Rect(10, 11, contentW, 26, "F")

	// Logo
	pdf.SetXY(12, 14.5)
	pdf.SetFont("Helvetica", "B", 10)
	setRGB(logoBlue)
	pdf.CellFormat(38, 5, "ÓPTICA", "", 0, "L", false, 0, "")
	pdf.SetXY(12, 20)
	pdf.CellFormat(38, 5, "CONVISIÓN", "", 0, "L", false, 0, "")

	// Clinic card (right side)
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
		{"Sede", pdfDash(order.Branch)},
	} {
		ly := 14.0 + float64(i)*5.0
		pdf.SetXY(cardX+2.5, ly)
		pdf.SetFont("Helvetica", "B", 5.5)
		setRGB(navyMid)
		pdf.CellFormat(13, 4.5, cl[0], "", 0, "L", false, 0, "")
		pdf.SetXY(cardX+16, ly)
		pdf.SetFont("Helvetica", "", 5.5)
		setRGB(bodyText)
		pdf.CellFormat(cardW-17, 4.5, cl[1], "", 0, "L", false, 0, "")
	}

	// ORIGINAL badge (pill in top-right of clinic card)
	badgeX := cardX + cardW - 21
	setFill(navyMid)
	pdf.RoundedRect(badgeX, 13, 20, 5.5, 2.5, "1234", "F")
	pdf.SetXY(badgeX, 13)
	pdf.SetFont("Helvetica", "B", 5.5)
	setRGB(white)
	pdf.CellFormat(20, 5.5, "ORIGINAL", "", 0, "C", false, 0, "")

	// Title block (between logo and clinic card)
	titleX := 50.0
	titleW := cardX - titleX - 2
	pdf.SetXY(titleX, 14.5)
	pdf.SetFont("Helvetica", "", 6)
	setRGB(mutedText)
	pdf.CellFormat(titleW, 4, "ORDEN DE LABORATORIO", "", 0, "C", false, 0, "")
	pdf.SetXY(titleX, 18.5)
	pdf.SetFont("Helvetica", "B", 17)
	setRGB(navyMid)
	pdf.CellFormat(titleW, 11, fmt.Sprintf("N° %s", order.OrderNumber), "", 0, "C", false, 0, "")
	pdf.SetXY(titleX-6, 30)
	pdf.SetFont("Helvetica", "", 6)
	setRGB(mutedText)
	pdf.CellFormat(titleW+12, 4, fmt.Sprintf("Pedido N°: %s", pdfDash(saleRef)), "", 0, "C", false, 0, "")

	y := 37.0

	// ── Header divider ──────────────────────────────────────────────
	setDraw(borderGray)
	pdf.SetLineWidth(0.2)
	pdf.Line(10, y, 10+contentW, y)
	y += 1.5

	// ── Info card ───────────────────────────────────────────────────
	infoH := 17.0
	setFill(cardBg)
	setDraw(borderGray)
	pdf.RoundedRect(10, y, contentW, infoH, 1.5, "1234", "FD")
	setFill(navyMid)
	pdf.Rect(10, y, 1, infoH, "F")
	splitX := 10 + contentW*0.54
	pdf.Rect(splitX, y, 1, infoH, "F")

	lLines := [][2]string{
		{"Paciente:", patientName},
		{"Documento:", pdfDash(patientDoc)},
		{"Vendedor:", pdfDash(order.SellerName)},
	}
	rLines := [][2]string{
		{"Proveedor:", labName},
		{"Tel. Prov.:", pdfDash(labPhone)},
		{"Fecha crea.:", createdAt},
	}
	ilh := 5.0
	lbW := 22.0
	for i, l := range lLines {
		iy := y + 2 + float64(i)*ilh
		pdf.SetXY(13, iy)
		pdf.SetFont("Helvetica", "", 5.8)
		setRGB(mutedText)
		pdf.CellFormat(lbW, ilh, l[0], "", 0, "L", false, 0, "")
		pdf.SetXY(13+lbW, iy)
		pdf.SetFont("Helvetica", "B", 6)
		setRGB(darkText)
		pdf.CellFormat(contentW*0.54-lbW-5, ilh, l[1], "", 0, "L", false, 0, "")
	}
	midX := splitX + 3
	rlbW := 24.0
	for i, l := range rLines {
		iy := y + 2 + float64(i)*ilh
		pdf.SetXY(midX, iy)
		pdf.SetFont("Helvetica", "", 5.8)
		setRGB(mutedText)
		pdf.CellFormat(rlbW, ilh, l[0], "", 0, "L", false, 0, "")
		pdf.SetXY(midX+rlbW, iy)
		pdf.SetFont("Helvetica", "B", 6)
		setRGB(darkText)
		pdf.CellFormat(contentW*0.46-rlbW-5, ilh, l[1], "", 0, "L", false, 0, "")
	}
	y += infoH + 1.5

	// ── RX section header ────────────────────────────────────────────
	setFill(brightBlue)
	pdf.RoundedRect(10, y, contentW, 6.5, 1.5, "1234", "F")
	pdf.SetXY(13, y+0.8)
	pdf.SetFont("Helvetica", "B", 7)
	setRGB(white)
	pdf.CellFormat(contentW-3, 6.5, "PRESCRIPCIÓN ÓPTICA — FÓRMULA RX Y PRISMA", "", 0, "L", false, 0, "")
	y += 6.5

	// RX table: column widths proportional to Figma (738px content → 190mm)
	rxCols := []struct {
		label string
		w     float64
	}{
		{"", 8},
		{"Esfera", 15},
		{"Cilindro", 15},
		{"Eje", 12},
		{"Adición", 13},
		{"DP", 10},
		{"AF", 10},
		{"Ø", 10},
		{"Curva B", 14},
		{"Poder", 14},
		{"", 16},
		{"", 16},
		{"", 16},
		{"", 21},
	}
	thH := 6.2
	rwH := 7.2

	setFill(tableBg)
	setDraw(borderGray)
	pdf.SetLineWidth(0.2)
	pdf.Rect(10, y, contentW, thH, "FD")

	prismaStart := 10.0
	for _, c := range rxCols[:10] {
		prismaStart += c.w
	}
	prismaW := contentW - (prismaStart - 10)
	setFill(brightBlue)
	pdf.Rect(prismaStart, y, prismaW, thH, "F")

	cx := 10.0 + rxCols[0].w
	for _, col := range rxCols[1:10] {
		pdf.SetXY(cx, y)
		pdf.SetFont("Helvetica", "B", 5.8)
		setRGB(navyMid)
		pdf.CellFormat(col.w, thH, col.label, "", 0, "C", false, 0, "")
		cx += col.w
	}
	pdf.SetXY(prismaStart, y)
	pdf.SetFont("Helvetica", "B", 6)
	setRGB(white)
	pdf.CellFormat(prismaW, thH, "PRISMA", "", 0, "C", false, 0, "")

	setDraw(borderGray)
	divX := 10.0
	for _, c := range rxCols {
		divX += c.w
		if divX < 10+contentW-0.1 {
			pdf.Line(divX, y, divX, y+thH+rwH*2)
		}
	}
	y += thH

	rxToRow := func(rx *domain.RxEye) [13]string {
		if rx == nil {
			return [13]string{"—", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—"}
		}
		return [13]string{
			pdfDash(rx.Sphere), pdfDash(rx.Cylinder), pdfDash(rx.Axis),
			pdfDash(rx.Addition), pdfDash(rx.DP), pdfDash(rx.AF),
			pdfDash(rx.Diameter), pdfDash(rx.BaseCurve), pdfDash(rx.Power),
			pdfDash(rx.PrismH), pdfDash(rx.PrismV), "—", "—",
		}
	}

	for ri, eye := range []struct {
		label string
		rx    *domain.RxEye
	}{
		{"OD", order.RxOD},
		{"OI", order.RxOI},
	} {
		rowBg := white
		if ri%2 == 1 {
			rowBg = cardBg
		}
		setFill(rowBg)
		pdf.Rect(10, y, contentW, rwH, "F")
		setFill(lightBlue)
		pdf.Rect(10, y, rxCols[0].w, rwH, "F")
		pdf.SetXY(10, y)
		pdf.SetFont("Helvetica", "B", 7.5)
		setRGB(navyMid)
		pdf.CellFormat(rxCols[0].w, rwH, eye.label, "", 0, "C", false, 0, "")
		vals := rxToRow(eye.rx)
		vx := 10.0 + rxCols[0].w
		for vi, val := range vals {
			pdf.SetXY(vx, y)
			pdf.SetFont("Helvetica", "", 6.5)
			setRGB(bodyText)
			pdf.CellFormat(rxCols[vi+1].w, rwH, val, "", 0, "C", false, 0, "")
			vx += rxCols[vi+1].w
		}
		if ri == 0 {
			setDraw(borderGray)
			pdf.Line(10, y+rwH, 10+contentW, y+rwH)
		}
		y += rwH
	}
	y += 3

	// ── Lenses + Frame specs (Figma ratio 488:250) ────────────────────
	lensW := contentW * 488 / 738
	frameW := contentW - lensW

	setFill(brightBlue)
	pdf.RoundedRect(10, y, lensW, 6.5, 1.5, "1234", "F")
	pdf.SetXY(13, y+0.8)
	pdf.SetFont("Helvetica", "B", 7)
	setRGB(white)
	pdf.CellFormat(lensW-3, 6.5, "LENTES PRESCRITOS", "", 0, "L", false, 0, "")

	pdf.RoundedRect(10+lensW, y, frameW, 6.5, 1.5, "1234", "F")
	pdf.SetXY(10+lensW+3, y+0.8)
	pdf.CellFormat(frameW-3, 6.5, "ESPECIFICACIONES DE MONTURA", "", 0, "L", false, 0, "")
	y += 6.5

	sectH := 26.0
	halfH := sectH / 2

	// Lens panel
	setFill(cardBg)
	setDraw(borderGray)
	pdf.Rect(10, y, lensW, halfH, "FD")
	setFill(white)
	pdf.Rect(10, y+halfH, lensW, halfH, "FD")
	setDraw(borderGray)
	pdf.Line(10, y+halfH, 10+lensW, y+halfH)

	for _, row := range []struct {
		label string
		text  string
		off   float64
	}{
		{"OD", pdfDash(order.LensOD), 2.5},
		{"OI", pdfDash(order.LensOI), halfH + 2.5},
	} {
		pdf.SetXY(12, y+row.off)
		pdf.SetFont("Helvetica", "B", 7.5)
		setRGB(navyMid)
		pdf.CellFormat(8, 5, row.label, "", 0, "L", false, 0, "")
		pdf.SetXY(21, y+row.off)
		pdf.SetFont("Helvetica", "", 7)
		setRGB(darkText)
		pdf.MultiCell(lensW-12, 4.5, row.text, "", "L", false)
	}

	// Frame specs panel
	setFill(white)
	setDraw(borderGray)
	pdf.Rect(10+lensW, y, frameW, sectH, "FD")

	fs := order.FrameSpecs
	fsName := "—"
	if fs != nil && strings.TrimSpace(fs.Name) != "" {
		fsName = fs.Name
	}
	setFill(lightBlue)
	pdf.Rect(10+lensW, y, frameW, 5.5, "F")
	pdf.SetXY(10+lensW, y)
	pdf.SetFont("Helvetica", "B", 6.5)
	setRGB(navyMid)
	pdf.CellFormat(frameW, 5.5, fsName, "", 0, "C", false, 0, "")

	type fsRowT struct{ l1, v1, l2, v2 string }
	var fsRows []fsRowT
	if fs != nil {
		fsRows = []fsRowT{
			{pdfDash(fs.Type), "", pdfDash(fs.Gender), ""},
			{"Color:", pdfDash(fs.Color), "Horizontal:", pdfDash(fs.Horizontal)},
			{"Puente:", pdfDash(fs.Bridge), "Vertical:", pdfDash(fs.Vertical)},
			{"Áng. pant:", pdfDash(fs.PantoscopicAngle), "Dist Mec:", pdfDash(fs.MechanicalDistance)},
			{"Áng. panor:", pdfDash(fs.PanoramicAngle), "Ø Efectivo:", pdfDash(fs.EffectiveDiameter)},
		}
	} else {
		fsRows = []fsRowT{
			{"—", "", "—", ""},
			{"Color:", "—", "Horizontal:", "—"},
			{"Puente:", "—", "Vertical:", "—"},
			{"Áng. pant:", "—", "Dist Mec:", "—"},
			{"Áng. panor:", "—", "Ø Efectivo:", "—"},
		}
	}

	fBase := 10 + lensW
	fRowH := (sectH - 5.5) / float64(len(fsRows))
	halfFW := frameW / 2
	fLabelW := 16.0

	// Row 0: Type left / Gender right (bold, no labels)
	fr0y := y + 5.5 + fRowH*0.2
	pdf.SetXY(fBase+2, fr0y)
	pdf.SetFont("Helvetica", "B", 6)
	setRGB(bodyText)
	pdf.CellFormat(halfFW-2, fRowH, fsRows[0].l1, "", 0, "L", false, 0, "")
	pdf.SetXY(fBase+halfFW, fr0y)
	pdf.CellFormat(halfFW-2, fRowH, fsRows[0].l2, "", 0, "R", false, 0, "")

	// Rows 1-4: label/value pairs in 2 columns
	for i, row := range fsRows[1:] {
		fy := y + 5.5 + fRowH*float64(i+1) + fRowH*0.1
		pdf.SetXY(fBase+2, fy)
		pdf.SetFont("Helvetica", "", 5.8)
		setRGB(mutedText)
		pdf.CellFormat(fLabelW, fRowH, row.l1, "", 0, "L", false, 0, "")
		pdf.SetXY(fBase+2+fLabelW, fy)
		pdf.SetFont("Helvetica", "B", 5.8)
		setRGB(darkText)
		pdf.CellFormat(halfFW-fLabelW-2, fRowH, row.v1, "", 0, "L", false, 0, "")
		pdf.SetXY(fBase+halfFW, fy)
		pdf.SetFont("Helvetica", "", 5.8)
		setRGB(mutedText)
		pdf.CellFormat(fLabelW, fRowH, row.l2, "", 0, "L", false, 0, "")
		pdf.SetXY(fBase+halfFW+fLabelW, fy)
		pdf.SetFont("Helvetica", "B", 5.8)
		setRGB(darkText)
		pdf.CellFormat(halfFW-fLabelW-2, fRowH, row.v2, "", 0, "L", false, 0, "")
	}
	y += sectH + 1.5

	// ── Observations section ─────────────────────────────────────────
	setFill(brightBlue)
	pdf.RoundedRect(10, y, contentW, 6.5, 1.5, "1234", "F")
	pdf.SetXY(13, y+0.8)
	pdf.SetFont("Helvetica", "B", 7)
	setRGB(white)
	pdf.CellFormat(contentW-3, 6.5, "OBSERVACIONES E INSTRUCCIONES ESPECIALES", "", 0, "L", false, 0, "")
	y += 6.5

	instrText := order.SpecialInstructions
	if instrText == "" {
		instrText = order.Notes
	}
	if instrText == "" {
		instrText = "Sin observaciones adicionales."
	}
	setFill(white)
	setDraw(borderGray)
	pdf.Rect(10, y, contentW, 16, "FD")
	pdf.SetXY(13, y+2.5)
	pdf.SetFont("Helvetica", "", 7)
	setRGB(bodyText)
	pdf.MultiCell(contentW-6, 4.5, instrText, "", "L", false)
	y += 19

	// ── Signatures ───────────────────────────────────────────────────
	setDraw(borderGray)
	pdf.SetLineWidth(0.2)
	pdf.Line(10, y, 10+contentW, y)
	y += 3
	pdf.SetXY(10, y)
	pdf.SetFont("Helvetica", "B", 5.5)
	setRGB(mutedText)
	pdf.CellFormat(contentW, 5, "AUTORIZACIONES Y CONFORMIDAD", "", 0, "L", false, 0, "")
	y += 8

	sigW := contentW / 3
	for i, sig := range []string{
		"Firma Responsable Óptica",
		"Firma Laboratorio",
		"Firma Cliente / Acudiente",
	} {
		sx := 10 + float64(i)*sigW
		setDraw(borderGray)
		pdf.Line(sx+5, y, sx+sigW-5, y)
		pdf.SetXY(sx, y+1.5)
		pdf.SetFont("Helvetica", "", 6)
		setRGB(mutedText)
		pdf.CellFormat(sigW, 5, sig, "", 0, "C", false, 0, "")
	}
	y += 10

	// ── Footer ───────────────────────────────────────────────────────
	setFill(footerBg)
	pdf.Rect(10, y, contentW, 24, "F")
	setFill(brightBlue)
	pdf.Rect(10, y+20, contentW, 4, "F")

	// QR code
	qrContent := fmt.Sprintf("Orden:%s|Paciente:%s|Lab:%s|Fecha:%s",
		order.OrderNumber, patientName, labName, order.CreatedAt.Format("2006-01-02"))
	if qrBytes, err := qrcode.Encode(qrContent, qrcode.Medium, 64); err == nil {
		imgOpts := gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: true}
		pdf.RegisterImageOptionsReader("qr", imgOpts, bytes.NewReader(qrBytes))
		pdf.ImageOptions("qr", 13, y+2, 14, 14, false, imgOpts, 0, "")
	}

	// CONVISION label
	pdf.SetXY(29, y+3)
	pdf.SetFont("Helvetica", "B", 9)
	setRGB(white)
	pdf.CellFormat(50, 5, "CONVISION", "", 0, "L", false, 0, "")
	pdf.SetXY(29, y+9)
	pdf.SetFont("Helvetica", "", 6)
	pdf.SetTextColor(128, 128, 143)
	pdf.CellFormat(50, 5, "Software de Gestión Óptica", "", 0, "L", false, 0, "")

	// Barcode (Code128, real scannable barcode)
	bcX := 10 + contentW/2 - 30.0
	setFill(white)
	pdf.RoundedRect(bcX, y+2, 60, 16, 1.5, "1234", "F")
	if bc, err := code128.Encode(order.OrderNumber); err == nil {
		if scaled, err := barcode.Scale(bc, 220, 50); err == nil {
			var bcBuf bytes.Buffer
			if png.Encode(&bcBuf, scaled) == nil {
				opts := gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: false}
				pdf.RegisterImageOptionsReader("barcode", opts, &bcBuf)
				pdf.ImageOptions("barcode", bcX+2, y+3, 56, 9, false, opts, 0, "")
			}
		}
	}
	pdf.SetXY(bcX, y+13)
	pdf.SetFont("Helvetica", "", 5.5)
	pdf.SetTextColor(footerBg[0], footerBg[1], footerBg[2])
	pdf.CellFormat(60, 4, order.OrderNumber, "", 0, "C", false, 0, "")

	// Legal note
	pdf.SetXY(10+contentW*0.67, y+3)
	pdf.SetFont("Helvetica", "", 5.5)
	pdf.SetTextColor(128, 128, 143)
	pdf.MultiCell(contentW*0.33-2, 3.5, "Documento generado digitalmente — No requiere firma manual cuando lleva sello digital", "", "R", false)

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
