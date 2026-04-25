package v1

import (
	"bytes"
	"encoding/json"
	"io"
	"math"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/convision/api/internal/domain"
	dailyactivitysvc "github.com/convision/api/internal/dailyactivity"
	notesvc "github.com/convision/api/internal/note"
	notificationsvc "github.com/convision/api/internal/notification"
	postgresplatform "github.com/convision/api/internal/platform/storage/postgres"
	jwtauth "github.com/convision/api/internal/platform/auth"
)

// DailyActivityNestedInput is the nested structure accepted from the frontend.
// report_date and shift are no longer required; the backend sets today and 'full' automatically.
type DailyActivityNestedInput struct {
	CustomerAttention map[string]int         `json:"customer_attention"`
	Operations        map[string]interface{} `json:"operations"`
	SocialMedia       map[string]interface{} `json:"social_media"`
	Observations      string                 `json:"observations"`
}

// DailyActivityNestedResponse is the nested structure returned to the frontend.
type DailyActivityNestedResponse struct {
	ID                uint                   `json:"id"`
	ReportDate        string                 `json:"report_date"`
	Status            string                 `json:"status"`
	CustomerAttention map[string]interface{} `json:"customer_attention"`
	Operations        map[string]interface{} `json:"operations"`
	SocialMedia       map[string]interface{} `json:"social_media"`
	MoneyReceiptsData map[string]interface{} `json:"recepciones_dinero,omitempty"`
	Observations      string                 `json:"observations"`
	CreatedAt         string                 `json:"created_at"`
	UpdatedAt         string                 `json:"updated_at"`
	User              interface{}            `json:"user,omitempty"`
}

// flattenDailyActivityInput converts nested frontend structure to flat service input.
func flattenDailyActivityInput(nested DailyActivityNestedInput) dailyactivitysvc.CreateInput {
	flat := dailyactivitysvc.CreateInput{
		Observations: nested.Observations,
	}
	
	// Flatten customer_attention
	if nested.CustomerAttention != nil {
		flat.InquiriesMale = getIntVal(nested.CustomerAttention, "preguntas_hombre", "questions_men")
		flat.InquiriesFemale = getIntVal(nested.CustomerAttention, "preguntas_mujeres", "questions_women")
		flat.InquiriesChildren = getIntVal(nested.CustomerAttention, "preguntas_ninos", "questions_children")
		flat.QuotesMale = getIntVal(nested.CustomerAttention, "cotizaciones_hombre", "quotes_men")
		flat.QuotesFemale = getIntVal(nested.CustomerAttention, "cotizaciones_mujeres", "quotes_women")
		flat.QuotesChildren = getIntVal(nested.CustomerAttention, "cotizaciones_ninos", "quotes_children")
		flat.EffectiveConsultationsMale = getIntVal(nested.CustomerAttention, "consultas_efectivas_hombre", "effective_consultations_men")
		flat.EffectiveConsultationsFemale = getIntVal(nested.CustomerAttention, "consultas_efectivas_mujeres", "effective_consultations_women")
		flat.EffectiveConsultationsChildren = getIntVal(nested.CustomerAttention, "consultas_efectivas_ninos", "effective_consultations_children")
		flat.FormulaConsultations = getIntVal(nested.CustomerAttention, "consulta_venta_formula", "formula_sale_consultations_men")
		flat.NonEffectiveConsultations = getIntVal(nested.CustomerAttention, "consultas_no_efectivas", "non_effective_consultations_men")
	}
	
	// Flatten operations
	if nested.Operations != nil {
		flat.BonusesDelivered = getIntFromMap(nested.Operations, "bonos_entregados")
		flat.BonusesRedeemed = getIntFromMap(nested.Operations, "bonos_redimidos")
		flat.SistecreditsDone = getIntFromMap(nested.Operations, "sistecreditos_realizados")
		flat.AddiDone = getIntFromMap(nested.Operations, "addi_realizados")
		flat.FollowUpControl = getIntFromMap(nested.Operations, "control_seguimiento")
		flat.WarrantyFollowUp = getIntFromMap(nested.Operations, "seguimiento_garantias")
		flat.Orders = getIntFromMap(nested.Operations, "ordenes")
		flat.LayawayPlan = getIntFromMap(nested.Operations, "plan_separe")
		flat.OtherSales = getIntFromMap(nested.Operations, "otras_ventas")
		flat.Deliveries = getIntFromMap(nested.Operations, "entregas")
		flat.SistecreditsPayments = getIntFromMap(nested.Operations, "sistecreditos_abonos")
		flat.OrdersValue = getFloatFromMap(nested.Operations, "valor_ordenes")
	}
	
	// Flatten social_media (support both publicaciones_fb and publicaciones_facebook)
	if nested.SocialMedia != nil {
		flat.FacebookPosts = getIntFromMapAlt(nested.SocialMedia, "publicaciones_facebook", "publicaciones_fb")
		flat.InstagramPosts = getIntFromMapAlt(nested.SocialMedia, "publicaciones_instagram", "publicaciones_ig")
		flat.WhatsappPosts = getIntFromMapAlt(nested.SocialMedia, "publicaciones_whatsapp", "publicaciones_wa")
		flat.FacebookSharedPosts = getIntFromMap(nested.SocialMedia, "publicaciones_compartidas_fb")
		flat.TiktokVideos = getIntFromMapAlt(nested.SocialMedia, "tiktok_realizados", "tiktoks")
		flat.GiftBonusesSent = getIntFromMap(nested.SocialMedia, "bonos_regalo_enviados")
		flat.LoyaltyBonusesSent = getIntFromMap(nested.SocialMedia, "bonos_fidelizacion_enviados")
		flat.FacebookMessages = getIntFromMap(nested.SocialMedia, "mensajes_facebook")
		flat.InstagramMessages = getIntFromMap(nested.SocialMedia, "mensajes_instagram")
		flat.WhatsappMessages = getIntFromMap(nested.SocialMedia, "mensajes_whatsapp")
		flat.DeliveriesCompleted = getIntFromMap(nested.SocialMedia, "entregas_realizadas")
		flat.CustomerTags = getIntFromMap(nested.SocialMedia, "etiquetas_clientes")
		flat.WorkQuotes = getIntFromMap(nested.SocialMedia, "cotizaciones_trabajo")
		flat.WorkOrders = getIntFromMap(nested.SocialMedia, "ordenes_trabajo")
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
		ID:           r.ID,
		ReportDate:   reportDate,
		Status:       string(r.Status),
		Observations: r.Observations,
		CreatedAt:    r.CreatedAt.UTC().Format(timeFormat) + "Z",
		UpdatedAt:    r.UpdatedAt.UTC().Format(timeFormat) + "Z",
		CustomerAttention: map[string]interface{}{
			"preguntas_hombre": r.InquiriesMale,
			"preguntas_mujeres": r.InquiriesFemale,
			"preguntas_ninos": r.InquiriesChildren,
			"cotizaciones_hombre": r.QuotesMale,
			"cotizaciones_mujeres": r.QuotesFemale,
			"cotizaciones_ninos": r.QuotesChildren,
			"consultas_efectivas_hombre": r.EffectiveConsultationsMale,
			"consultas_efectivas_mujeres": r.EffectiveConsultationsFemale,
			"consultas_efectivas_ninos": r.EffectiveConsultationsChildren,
			"consulta_venta_formula": r.FormulaConsultations,
			"consultas_no_efectivas": r.NonEffectiveConsultations,
		},
		Operations: map[string]interface{}{
			"bonos_entregados": r.BonusesDelivered,
			"bonos_redimidos": r.BonusesRedeemed,
			"sistecreditos_realizados": r.SistecreditsDone,
			"addi_realizados": r.AddiDone,
			"control_seguimiento": r.FollowUpControl,
			"seguimiento_garantias": r.WarrantyFollowUp,
			"ordenes": r.Orders,
			"plan_separe": r.LayawayPlan,
			"otras_ventas": r.OtherSales,
			"entregas": r.Deliveries,
			"sistecreditos_abonos": r.SistecreditsPayments,
			"valor_ordenes": r.OrdersValue,
		},
		SocialMedia: map[string]interface{}{
			"publicaciones_fb": r.FacebookPosts,
			"publicaciones_ig": r.InstagramPosts,
			"publicaciones_wa": r.WhatsappPosts,
			"publicaciones_compartidas_fb": r.FacebookSharedPosts,
			"tiktoks": r.TiktokVideos,
			"bonos_regalo": r.GiftBonusesSent,
			"bonos_fidelizacion": r.LoyaltyBonusesSent,
			"mensajes_fb": r.FacebookMessages,
			"mensajes_ig": r.InstagramMessages,
			"mensajes_wa": r.WhatsappMessages,
			"entregas_realizadas": r.DeliveriesCompleted,
			"etiquetas_clientes": r.CustomerTags,
			"cotizaciones_trabajo": r.WorkQuotes,
			"ordenes_trabajo": r.WorkOrders,
		},
	}
	
	if len(r.MoneyReceipts) > 0 {
		var dinero map[string]interface{}
		_ = json.Unmarshal(r.MoneyReceipts, &dinero)
		res.MoneyReceiptsData = dinero
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

func intFromAny(v interface{}) int {
	switch n := v.(type) {
	case int:
		return n
	case int32:
		return int(n)
	case int64:
		return int(n)
	case float64:
		return int(n)
	default:
		return 0
	}
}

func dailyActivityResponseWithLegacyAliases(nested DailyActivityNestedResponse) gin.H {
	response := toMap(nested)
	response["atencion"] = gin.H{
		"preguntas": gin.H{
			"hombre":  intFromAny(nested.CustomerAttention["preguntas_hombre"]),
			"mujeres": intFromAny(nested.CustomerAttention["preguntas_mujeres"]),
			"ninos":   intFromAny(nested.CustomerAttention["preguntas_ninos"]),
		},
		"cotizaciones": gin.H{
			"hombre":  intFromAny(nested.CustomerAttention["cotizaciones_hombre"]),
			"mujeres": intFromAny(nested.CustomerAttention["cotizaciones_mujeres"]),
			"ninos":   intFromAny(nested.CustomerAttention["cotizaciones_ninos"]),
		},
		"consultas_efectivas": gin.H{
			"hombre":  intFromAny(nested.CustomerAttention["consultas_efectivas_hombre"]),
			"mujeres": intFromAny(nested.CustomerAttention["consultas_efectivas_mujeres"]),
			"ninos":   intFromAny(nested.CustomerAttention["consultas_efectivas_ninos"]),
		},
		"consulta_venta_formula": intFromAny(nested.CustomerAttention["consulta_venta_formula"]),
		"consultas_no_efectivas": intFromAny(nested.CustomerAttention["consultas_no_efectivas"]),
	}
	response["operaciones"] = gin.H{
		"bonos_entregados":        intFromAny(nested.Operations["bonos_entregados"]),
		"bonos_redimidos":         intFromAny(nested.Operations["bonos_redimidos"]),
		"sistecreditos_realizados": intFromAny(nested.Operations["sistecreditos_realizados"]),
		"addi_realizados":         intFromAny(nested.Operations["addi_realizados"]),
		"control_seguimiento":     intFromAny(nested.Operations["control_seguimiento"]),
		"seguimiento_garantias":   intFromAny(nested.Operations["seguimiento_garantias"]),
		"ordenes":                 intFromAny(nested.Operations["ordenes"]),
		"plan_separe":             intFromAny(nested.Operations["plan_separe"]),
		"otras_ventas":            intFromAny(nested.Operations["otras_ventas"]),
		"entregas":                intFromAny(nested.Operations["entregas"]),
		"sistecreditos_abonos":    intFromAny(nested.Operations["sistecreditos_abonos"]),
		"valor_ordenes":           nested.Operations["valor_ordenes"],
	}
	response["redes_sociales"] = gin.H{
		"publicaciones_facebook":         intFromAny(nested.SocialMedia["publicaciones_fb"]),
		"publicaciones_instagram":        intFromAny(nested.SocialMedia["publicaciones_ig"]),
		"publicaciones_whatsapp":         intFromAny(nested.SocialMedia["publicaciones_wa"]),
		"publicaciones_compartidas_fb":   intFromAny(nested.SocialMedia["publicaciones_compartidas_fb"]),
		"tiktok_realizados":              intFromAny(nested.SocialMedia["tiktoks"]),
		"bonos_regalo_enviados":          intFromAny(nested.SocialMedia["bonos_regalo"]),
		"bonos_fidelizacion_enviados":    intFromAny(nested.SocialMedia["bonos_fidelizacion"]),
		"mensajes_facebook":              intFromAny(nested.SocialMedia["mensajes_fb"]),
		"mensajes_instagram":             intFromAny(nested.SocialMedia["mensajes_ig"]),
		"mensajes_whatsapp":              intFromAny(nested.SocialMedia["mensajes_wa"]),
		"entregas_realizadas":            intFromAny(nested.SocialMedia["entregas_realizadas"]),
		"etiquetas_clientes":             intFromAny(nested.SocialMedia["etiquetas_clientes"]),
		"cotizaciones_trabajo":           intFromAny(nested.SocialMedia["cotizaciones_trabajo"]),
		"ordenes_trabajo":                intFromAny(nested.SocialMedia["ordenes_trabajo"]),
	}
	return response
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
	c.JSON(http.StatusOK, gin.H{"data": n})
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
	c.JSON(http.StatusOK, gin.H{"data": n})
}

func (h *Handler) MarkAllNotificationsRead(c *gin.Context) {
	summary, err := h.notification.Summary()
	if err != nil {
		summary = &domain.NotificationSummary{}
	}

	if err := h.notification.ReadAll(); err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"updated": summary.Unread,
		},
	})
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
	c.JSON(http.StatusOK, gin.H{"data": n})
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
	c.JSON(http.StatusOK, gin.H{"data": n})
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
	if userID := c.Query("user_id"); userID != "" && ok && claims.Role == "admin" {
		filters["user_id"] = userID
	}
	if dateFrom := c.Query("date_from"); dateFrom != "" {
		filters["date_from"] = dateFrom
	}
	if dateTo := c.Query("date_to"); dateTo != "" {
		filters["date_to"] = dateTo
	}
	if status := c.Query("status"); status != "" {
		filters["status"] = status
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

	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "error leyendo cuerpo de la solicitud"})
		return
	}

	var nestedInput DailyActivityNestedInput
	if jsonErr := json.Unmarshal(bodyBytes, &nestedInput); jsonErr == nil && nestedInput.CustomerAttention != nil {
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

	c.Request.Body = io.NopCloser(bytes.NewReader(bodyBytes))
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

	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "error leyendo cuerpo de la solicitud"})
		return
	}

	var nestedInput DailyActivityNestedInput
	if jsonErr := json.Unmarshal(bodyBytes, &nestedInput); jsonErr == nil && nestedInput.CustomerAttention != nil {
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

	c.Request.Body = io.NopCloser(bytes.NewReader(bodyBytes))
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

func (h *Handler) CloseReport(c *gin.Context) {
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
	report, err := h.dailyActivity.Close(uint(id), uint(claims.UserID), claims.Role == "admin")
	if err != nil {
		respondError(c, err)
		return
	}
	nested := nestDailyActivityResponse(report)
	c.JSON(http.StatusOK, nested)
}

func (h *Handler) ReopenReport(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid id"})
		return
	}
	report, err := h.dailyActivity.Reopen(uint(id))
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
	c.JSON(http.StatusOK, dailyActivityResponseWithLegacyAliases(nested))
}

// ensure service type references compile
var _ *notificationsvc.Service
var _ *notesvc.Service
var _ *dailyactivitysvc.Service
var _ *postgresplatform.DashboardRepository
