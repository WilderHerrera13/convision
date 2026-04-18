package v1

import (
	"encoding/json"
	"math"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/convision/api/internal/domain"
	dailyactivitysvc "github.com/convision/api/internal/dailyactivity"
	notesvc "github.com/convision/api/internal/note"
	notificationsvc "github.com/convision/api/internal/notification"
	mysqlplatform "github.com/convision/api/internal/platform/storage/mysql"
	jwtauth "github.com/convision/api/internal/platform/auth"
)

// DailyActivityNestedInput is the nested structure expected by the frontend.
type DailyActivityNestedInput struct {
	ReportDate      string      `json:"report_date" binding:"required"`
	Shift           string      `json:"shift"       binding:"required,oneof=morning afternoon full"`
	CustomerAttention map[string]int `json:"customer_attention"`
	Operations      map[string]interface{} `json:"operations"`
	SocialMedia     map[string]interface{} `json:"social_media"`
	Observations    string      `json:"observations"`
}

// DailyActivityNestedResponse is the nested structure returned to the frontend.
type DailyActivityNestedResponse struct {
	ID              uint        `json:"id"`
	ReportDate      string      `json:"report_date"`
	Shift           string      `json:"shift"`
	CustomerAttention map[string]interface{} `json:"customer_attention"`
	Operations      map[string]interface{} `json:"operations"`
	SocialMedia     map[string]interface{} `json:"social_media"`
	Recepciones     map[string]interface{} `json:"recepciones_dinero,omitempty"`
	Observations    string      `json:"observations"`
	CreatedAt       string      `json:"created_at"`
	UpdatedAt       string      `json:"updated_at"`
	User            interface{} `json:"user,omitempty"`
}

// flattenDailyActivityInput converts nested frontend structure to flat service input.
func flattenDailyActivityInput(nested DailyActivityNestedInput) dailyactivitysvc.CreateInput {
	flat := dailyactivitysvc.CreateInput{
		ReportDate:   nested.ReportDate,
		Shift:        nested.Shift,
		Observations: nested.Observations,
	}
	
	// Flatten customer_attention
	if nested.CustomerAttention != nil {
		flat.PreguntasHombre = getIntVal(nested.CustomerAttention, "preguntas_hombre", "questions_men")
		flat.PreguntasMujeres = getIntVal(nested.CustomerAttention, "preguntas_mujeres", "questions_women")
		flat.PreguntasNinos = getIntVal(nested.CustomerAttention, "preguntas_ninos", "questions_children")
		flat.CotizacionesHombre = getIntVal(nested.CustomerAttention, "cotizaciones_hombre", "quotes_men")
		flat.CotizacionesMujeres = getIntVal(nested.CustomerAttention, "cotizaciones_mujeres", "quotes_women")
		flat.CotizacionesNinos = getIntVal(nested.CustomerAttention, "cotizaciones_ninos", "quotes_children")
		flat.ConsultasEfectivasHombre = getIntVal(nested.CustomerAttention, "consultas_efectivas_hombre", "effective_consultations_men")
		flat.ConsultasEfectivasMujeres = getIntVal(nested.CustomerAttention, "consultas_efectivas_mujeres", "effective_consultations_women")
		flat.ConsultasEfectivasNinos = getIntVal(nested.CustomerAttention, "consultas_efectivas_ninos", "effective_consultations_children")
		flat.ConsultaVentaFormula = getIntVal(nested.CustomerAttention, "consulta_venta_formula", "formula_sale_consultations_men")
		flat.ConsultasNoEfectivas = getIntVal(nested.CustomerAttention, "consultas_no_efectivas", "non_effective_consultations_men")
	}
	
	// Flatten operations
	if nested.Operations != nil {
		flat.BonosEntregados = getIntFromMap(nested.Operations, "bonos_entregados")
		flat.BonosRedimidos = getIntFromMap(nested.Operations, "bonos_redimidos")
		flat.SistecreditosRealizados = getIntFromMap(nested.Operations, "sistecreditos_realizados")
		flat.AddiRealizados = getIntFromMap(nested.Operations, "addi_realizados")
		flat.ControlSeguimiento = getIntFromMap(nested.Operations, "control_seguimiento")
		flat.SeguimientoGarantias = getIntFromMap(nested.Operations, "seguimiento_garantias")
		flat.Ordenes = getIntFromMap(nested.Operations, "ordenes")
		flat.PlanSepare = getIntFromMap(nested.Operations, "plan_separe")
		flat.OtrasVentas = getIntFromMap(nested.Operations, "otras_ventas")
		flat.Entregas = getIntFromMap(nested.Operations, "entregas")
		flat.SistecreditosAbonos = getIntFromMap(nested.Operations, "sistecreditos_abonos")
		flat.ValorOrdenes = getFloatFromMap(nested.Operations, "valor_ordenes")
	}
	
	// Flatten social_media (support both publicaciones_fb and publicaciones_facebook)
	if nested.SocialMedia != nil {
		flat.PublicacionesFacebook = getIntFromMapAlt(nested.SocialMedia, "publicaciones_facebook", "publicaciones_fb")
		flat.PublicacionesInstagram = getIntFromMapAlt(nested.SocialMedia, "publicaciones_instagram", "publicaciones_ig")
		flat.PublicacionesWhatsapp = getIntFromMapAlt(nested.SocialMedia, "publicaciones_whatsapp", "publicaciones_wa")
		flat.PublicacionesCompartidasFB = getIntFromMap(nested.SocialMedia, "publicaciones_compartidas_fb")
		flat.TiktokRealizados = getIntFromMapAlt(nested.SocialMedia, "tiktok_realizados", "tiktoks")
		flat.BonosRegaloEnviados = getIntFromMap(nested.SocialMedia, "bonos_regalo_enviados")
		flat.BonosFidelizacionEnviados = getIntFromMap(nested.SocialMedia, "bonos_fidelizacion_enviados")
		flat.MensajesFacebook = getIntFromMap(nested.SocialMedia, "mensajes_facebook")
		flat.MensajesInstagram = getIntFromMap(nested.SocialMedia, "mensajes_instagram")
		flat.MensajesWhatsapp = getIntFromMap(nested.SocialMedia, "mensajes_whatsapp")
		flat.EntregasRealizadas = getIntFromMap(nested.SocialMedia, "entregas_realizadas")
		flat.EtiquetasClientes = getIntFromMap(nested.SocialMedia, "etiquetas_clientes")
		flat.CotizacionesTrabajo = getIntFromMap(nested.SocialMedia, "cotizaciones_trabajo")
		flat.OrdenesTrabajo = getIntFromMap(nested.SocialMedia, "ordenes_trabajo")
	}
	
	return flat
}

// nestDailyActivityResponse converts flat domain model to nested frontend structure.
func nestDailyActivityResponse(r *domain.DailyActivityReport) DailyActivityNestedResponse {
	reportDate := ""
	if r.ReportDate != nil {
		reportDate = r.ReportDate.Format("2006-01-02")
	}
	
	res := DailyActivityNestedResponse{
		ID:         r.ID,
		ReportDate: reportDate,
		Shift:      string(r.Shift),
		Observations: r.Observations,
		CreatedAt:   r.CreatedAt.UTC().Format(timeFormat) + "Z",
		UpdatedAt:   r.UpdatedAt.UTC().Format(timeFormat) + "Z",
		CustomerAttention: map[string]interface{}{
			"preguntas_hombre": r.PreguntasHombre,
			"preguntas_mujeres": r.PreguntasMujeres,
			"preguntas_ninos": r.PreguntasNinos,
			"cotizaciones_hombre": r.CotizacionesHombre,
			"cotizaciones_mujeres": r.CotizacionesMujeres,
			"cotizaciones_ninos": r.CotizacionesNinos,
			"consultas_efectivas_hombre": r.ConsultasEfectivasHombre,
			"consultas_efectivas_mujeres": r.ConsultasEfectivasMujeres,
			"consultas_efectivas_ninos": r.ConsultasEfectivasNinos,
			"consulta_venta_formula": r.ConsultaVentaFormula,
			"consultas_no_efectivas": r.ConsultasNoEfectivas,
		},
		Operations: map[string]interface{}{
			"bonos_entregados": r.BonosEntregados,
			"bonos_redimidos": r.BonosRedimidos,
			"sistecreditos_realizados": r.SistecreditosRealizados,
			"addi_realizados": r.AddiRealizados,
			"control_seguimiento": r.ControlSeguimiento,
			"seguimiento_garantias": r.SeguimientoGarantias,
			"ordenes": r.Ordenes,
			"plan_separe": r.PlanSepare,
			"otras_ventas": r.OtrasVentas,
			"entregas": r.Entregas,
			"sistecreditos_abonos": r.SistecreditosAbonos,
			"valor_ordenes": r.ValorOrdenes,
		},
		SocialMedia: map[string]interface{}{
			"publicaciones_fb": r.PublicacionesFacebook,
			"publicaciones_ig": r.PublicacionesInstagram,
			"publicaciones_wa": r.PublicacionesWhatsapp,
			"publicaciones_compartidas_fb": r.PublicacionesCompartidasFB,
			"tiktoks": r.TiktokRealizados,
			"bonos_regalo": r.BonosRegaloEnviados,
			"bonos_fidelizacion": r.BonosFidelizacionEnviados,
			"mensajes_fb": r.MensajesFacebook,
			"mensajes_ig": r.MensajesInstagram,
			"mensajes_wa": r.MensajesWhatsapp,
			"entregas_realizadas": r.EntregasRealizadas,
			"etiquetas_clientes": r.EtiquetasClientes,
			"cotizaciones_trabajo": r.CotizacionesTrabajo,
			"ordenes_trabajo": r.OrdenesTrabajo,
		},
	}
	
	if len(r.RecepcionesDinero) > 0 {
		var dinero map[string]interface{}
		_ = json.Unmarshal(r.RecepcionesDinero, &dinero)
		res.Recepciones = dinero
	}
	
	if r.User != nil {
		res.User = map[string]interface{}{
			"id": r.User.ID,
			"name": r.User.Name,
		}
	}
	
	return res
}

// Helper functions to extract values from nested maps
func getIntVal(m map[string]int, keys ...string) int {
	for _, k := range keys {
		if v, ok := m[k]; ok {
			return v
		}
	}
	return 0
}

func getIntFromMap(m map[string]interface{}, key string) int {
	if v, ok := m[key]; ok {
		switch val := v.(type) {
		case float64:
			return int(val)
		case int:
			return val
		}
	}
	return 0
}

func getIntFromMapAlt(m map[string]interface{}, keys ...string) int {
	for _, k := range keys {
		if v, ok := m[k]; ok {
			switch val := v.(type) {
			case float64:
				return int(val)
			case int:
				return val
			}
		}
	}
	return 0
}

func getFloatFromMap(m map[string]interface{}, key string) float64 {
	if v, ok := m[key]; ok {
		switch val := v.(type) {
		case float64:
			return val
		case int:
			return float64(val)
		}
	}
	return 0
}

// ---------- Dashboard ----------

func (h *Handler) GetDashboardSummary(c *gin.Context) {
	summary, err := h.dashboard.Summary()
	if err != nil {
		respondError(c, err)
		return
	}
	
	// Flatten metrics for frontend compatibility
	flattened := gin.H{
		"metrics": gin.H{
			"monthly_sales":        summary.Metrics.MonthlySales.Total,
			"monthly_sales_change": nil,
			"monthly_patients":     summary.Metrics.MonthlyPatients.Count,
			"monthly_patients_change": nil,
			"lab_orders_total":     summary.Metrics.LabOrders.Total,
			"lab_orders_pending":   summary.Metrics.LabOrders.Pending,
			"pending_balance":      summary.Metrics.PendingBalance.Total,
			"pending_balance_count": 0,
		},
		"weekly_sales":  summary.WeeklySales,
		"recent_orders": summary.RecentOrders,
	}
	c.JSON(http.StatusOK, flattened)
}

// ---------- Notifications ----------

func (h *Handler) GetNotificationSummary(c *gin.Context) {
	s, err := h.notification.Summary()
	if err != nil {
		respondError(c, err)
		return
	}
	// Map field names: Unread -> unread, Total -> inbox, Archived -> archived
	response := gin.H{
		"data": gin.H{
			"unread":   s.Unread,
			"inbox":    s.Total,
			"archived": s.Archived,
		},
	}
	c.JSON(http.StatusOK, response)
}

func (h *Handler) ListNotifications(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))
	filters := map[string]any{}
	if archived := c.Query("archived"); archived != "" {
		filters["archived"] = archived
	}
	if unread := c.Query("unread"); unread != "" {
		filters["unread"] = unread
	}
	out, err := h.notification.List(filters, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	
	// Get summary for counts
	summary, err := h.notification.Summary()
	if err != nil {
		summary = &domain.NotificationSummary{Unread: 0, Total: 0, Archived: 0}
	}
	
	// Calculate last_page
	lastPage := 1
	if out.Total > 0 {
		lastPage = int(math.Ceil(float64(out.Total) / float64(perPage)))
	}
	
	// Build response with counts and meta
	response := gin.H{
		"data": out.Data,
		"counts": gin.H{
			"all":      out.Total,
			"unread":   summary.Unread,
			"archived": summary.Archived,
		},
		"meta": gin.H{
			"current_page": page,
			"last_page":    lastPage,
			"per_page":     perPage,
			"total":        out.Total,
		},
	}
	c.JSON(http.StatusOK, response)
}

func (h *Handler) MarkNotificationRead(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	n, err := h.notification.MarkAsRead(uint(id))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, n)
}

func (h *Handler) MarkNotificationUnread(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	n, err := h.notification.MarkAsUnread(uint(id))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, n)
}

func (h *Handler) MarkAllNotificationsRead(c *gin.Context) {
	if err := h.notification.ReadAll(); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Todas las notificaciones han sido marcadas como leídas."})
}

func (h *Handler) ArchiveNotification(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	n, err := h.notification.Archive(uint(id))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, n)
}

func (h *Handler) UnarchiveNotification(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	n, err := h.notification.Unarchive(uint(id))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, n)
}

func (h *Handler) DeleteNotification(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	if err := h.notification.Delete(uint(id)); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// ---------- Notes ----------

func (h *Handler) ListNotes(c *gin.Context) {
	resourceType := c.Param("type")
	resourceID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))
	out, err := h.note.List(resourceType, uint(resourceID), page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) CreateNote(c *gin.Context) {
	resourceType := c.Param("type")
	resourceID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	var input notesvc.CreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "no autenticado"})
		return
	}
	n, err := h.note.Create(resourceType, uint(resourceID), input, uint(claims.UserID))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, n)
}

// ---------- Daily Activity Reports ----------

func (h *Handler) ListDailyActivityReports(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))
	filters := map[string]any{}
	claims, ok := jwtauth.GetClaims(c)
	if ok && claims.Role != "admin" {
		filters["user_id"] = claims.UserID
	}
	if shift := c.Query("shift"); shift != "" {
		filters["shift"] = shift
	}
	out, err := h.dailyActivity.List(filters, page, perPage)
	if err != nil {
		respondError(c, err)
		return
	}
	
	// Convert to nested response structure
	nestedData := make([]DailyActivityNestedResponse, len(out.Data))
	for i, r := range out.Data {
		nestedData[i] = nestDailyActivityResponse(r)
	}
	
	c.JSON(http.StatusOK, gin.H{
		"data":          nestedData,
		"total":         out.Total,
		"current_page":  out.Page,
		"last_page":     (out.Total + int64(out.PerPage) - 1) / int64(out.PerPage),
		"per_page":      out.PerPage,
	})
}

func (h *Handler) GetDailyActivityReport(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	report, err := h.dailyActivity.GetByID(uint(id))
	if err != nil {
		respondError(c, err)
		return
	}
	claims, ok := jwtauth.GetClaims(c)
	if ok && claims.Role != "admin" && report.UserID != uint(claims.UserID) {
		c.JSON(http.StatusForbidden, gin.H{"message": "no autorizado"})
		return
	}
	
	// Return nested structure
	nested := nestDailyActivityResponse(report)
	c.JSON(http.StatusOK, nested)
}

func (h *Handler) CreateDailyActivityReport(c *gin.Context) {
	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "no autenticado"})
		return
	}
	if claims.Role == "admin" {
		c.JSON(http.StatusForbidden, gin.H{"message": "los administradores no pueden crear informes de actividad"})
		return
	}
	
	// Try to parse nested structure first
	var nestedInput DailyActivityNestedInput
	if err := c.ShouldBindJSON(&nestedInput); err == nil && nestedInput.CustomerAttention != nil {
		// Nested structure from frontend
		input := flattenDailyActivityInput(nestedInput)
		report, err := h.dailyActivity.Create(input, uint(claims.UserID))
		if err != nil {
			respondError(c, err)
			return
		}
		nested := nestDailyActivityResponse(report)
		c.JSON(http.StatusCreated, nested)
		return
	}
	
	// Fallback to flat structure
	var input dailyactivitysvc.CreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	report, err := h.dailyActivity.Create(input, uint(claims.UserID))
	if err != nil {
		respondError(c, err)
		return
	}
	nested := nestDailyActivityResponse(report)
	c.JSON(http.StatusCreated, nested)
}

func (h *Handler) UpdateDailyActivityReport(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "no autenticado"})
		return
	}
	if claims.Role == "admin" {
		c.JSON(http.StatusForbidden, gin.H{"message": "los administradores no pueden editar informes de actividad"})
		return
	}
	
	// Try to parse nested structure first
	var nestedInput DailyActivityNestedInput
	if err := c.ShouldBindJSON(&nestedInput); err == nil && nestedInput.CustomerAttention != nil {
		// Nested structure from frontend
		input := flattenDailyActivityInput(nestedInput)
		report, err := h.dailyActivity.Update(uint(id), input, uint(claims.UserID), claims.Role == "admin")
		if err != nil {
			respondError(c, err)
			return
		}
		nested := nestDailyActivityResponse(report)
		c.JSON(http.StatusOK, nested)
		return
	}
	
	// Fallback to flat structure
	var input dailyactivitysvc.UpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	report, err := h.dailyActivity.Update(uint(id), input, uint(claims.UserID), claims.Role == "admin")
	if err != nil {
		respondError(c, err)
		return
	}
	nested := nestDailyActivityResponse(report)
	c.JSON(http.StatusOK, nested)
}

func (h *Handler) QuickAttentionDailyActivity(c *gin.Context) {
	claims, ok := jwtauth.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "no autenticado"})
		return
	}
	if claims.Role == "admin" {
		c.JSON(http.StatusForbidden, gin.H{"message": "los administradores no pueden usar atención rápida"})
		return
	}
	var input dailyactivitysvc.QuickAttentionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	report, err := h.dailyActivity.QuickAttention(input, uint(claims.UserID))
	if err != nil {
		respondError(c, err)
		return
	}
	nested := nestDailyActivityResponse(report)
	c.JSON(http.StatusOK, nested)
}

// ensure service type references compile
var _ *notificationsvc.Service
var _ *notesvc.Service
var _ *dailyactivitysvc.Service
var _ *mysqlplatform.DashboardRepository
