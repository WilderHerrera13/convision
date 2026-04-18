package v1

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	dailyactivitysvc "github.com/convision/api/internal/dailyactivity"
	notesvc "github.com/convision/api/internal/note"
	notificationsvc "github.com/convision/api/internal/notification"
	mysqlplatform "github.com/convision/api/internal/platform/storage/mysql"
	jwtauth "github.com/convision/api/internal/platform/auth"
)

// ---------- Dashboard ----------

func (h *Handler) GetDashboardSummary(c *gin.Context) {
	summary, err := h.dashboard.Summary()
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, summary)
}

// ---------- Notifications ----------

func (h *Handler) GetNotificationSummary(c *gin.Context) {
	s, err := h.notification.Summary()
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, s)
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
	c.JSON(http.StatusOK, out)
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
	c.JSON(http.StatusOK, out)
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
	c.JSON(http.StatusOK, report)
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
	c.JSON(http.StatusCreated, report)
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
	c.JSON(http.StatusOK, report)
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
	c.JSON(http.StatusOK, report)
}

// ensure service type references compile
var _ *notificationsvc.Service
var _ *notesvc.Service
var _ *dailyactivitysvc.Service
var _ *mysqlplatform.DashboardRepository
