package v1

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/convision/api/internal/bulkimport"
	"github.com/convision/api/internal/domain"
	jwtauth "github.com/convision/api/internal/platform/auth"
)

const maxUploadSize = 10 << 20 // 10 MB

// BulkImport godoc
// POST /api/v1/bulk-import
func (h *Handler) BulkImport(c *gin.Context) {
	typeStr := c.PostForm("type")
	if typeStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Se requiere el campo 'type' (patients | doctors | scheduled-appointments)",
			"types":   h.bulkImport.RegisteredTypes(),
		})
		return
	}
	h.processBulkImport(c, bulkimport.ImportType(typeStr))
}

// BulkImportPatients godoc
// POST /api/v1/bulk-import/patients
func (h *Handler) BulkImportPatients(c *gin.Context) {
	h.processBulkImport(c, bulkimport.ImportTypePatients)
}

// BulkImportDoctors godoc
// POST /api/v1/bulk-import/doctors
func (h *Handler) BulkImportDoctors(c *gin.Context) {
	h.processBulkImport(c, bulkimport.ImportTypeDoctors)
}

// BulkImportScheduledAppointments godoc
// POST /api/v1/bulk-import/scheduled-appointments
func (h *Handler) BulkImportScheduledAppointments(c *gin.Context) {
	h.processBulkImport(c, bulkimport.ImportTypeScheduledAppointments)
}

// BulkImportHistory godoc
// GET /api/v1/bulk-import/history?type=&page=&per_page=
func (h *Handler) BulkImportHistory(c *gin.Context) {
	importType := c.Query("type")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "50"))
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 50
	}

	logs, total, err := h.bulkImportLog.List(importType, page, perPage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Error al obtener el historial"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":     logs,
		"total":    total,
		"page":     page,
		"per_page": perPage,
	})
}

func (h *Handler) processBulkImport(c *gin.Context, importType bulkimport.ImportType) {
	if err := c.Request.ParseMultipartForm(maxUploadSize); err != nil {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"message": "El archivo supera el límite de 10 MB"})
		return
	}

	fh, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Se requiere el campo 'file' con el archivo Excel"})
		return
	}

	name := fh.Filename
	if len(name) < 5 {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": "Nombre de archivo inválido"})
		return
	}
	ext := name[len(name)-5:]
	if ext != ".xlsx" && name[len(name)-4:] != ".xls" {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": "Solo se aceptan archivos .xlsx o .xls"})
		return
	}

	result, err := h.bulkImport.ProcessExcel(fh, importType)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	var processedBy *uint
	if claims, ok := jwtauth.GetClaims(c); ok {
		id := claims.UserID
		processedBy = &id
	}

	entry := &domain.BulkImportLog{
		ImportType:  string(importType),
		FileName:    fh.Filename,
		TotalRows:   result.TotalRows,
		Created:     result.Created,
		Skipped:     result.Skipped,
		Errors:      result.Errors,
		ProcessedBy: processedBy,
		ProcessedAt: time.Now().UTC(),
	}
	_ = h.bulkImportLog.Create(entry)

	c.JSON(http.StatusOK, result)
}
