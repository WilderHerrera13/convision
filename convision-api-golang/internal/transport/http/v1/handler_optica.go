package v1

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/convision/api/internal/domain"
	opticasvc "github.com/convision/api/internal/optica"
)

// OpticaResource is the JSON shape returned for every optica response.
type OpticaResource struct {
	ID         uint   `json:"id"`
	Slug       string `json:"slug"`
	Name       string `json:"name"`
	Plan       string `json:"plan"`
	IsActive   bool   `json:"is_active"`
	SchemaName string `json:"schema_name"`
	CreatedAt  string `json:"created_at"`
}

func toOpticaResource(o *domain.Optica) OpticaResource {
	return OpticaResource{
		ID:         o.ID,
		Slug:       o.Slug,
		Name:       o.Name,
		Plan:       o.Plan,
		IsActive:   o.IsActive,
		SchemaName: o.SchemaName,
		CreatedAt:  o.CreatedAt.UTC().Format(timeFormat) + "Z",
	}
}

// ListOpticas godoc
// GET /api/v1/super-admin/opticas
func (h *Handler) ListOpticas(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))

	opticas, total, err := h.optica.List(page, perPage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "internal server error"})
		return
	}

	data := make([]OpticaResource, len(opticas))
	for i, o := range opticas {
		data[i] = toOpticaResource(o)
	}
	c.JSON(http.StatusOK, gin.H{
		"data":         data,
		"total":        total,
		"current_page": page,
		"per_page":     perPage,
	})
}

// CreateOptica godoc
// POST /api/v1/super-admin/opticas
func (h *Handler) CreateOptica(c *gin.Context) {
	var input opticasvc.CreateOpticaInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}

	optica, err := h.optica.Create(input)
	if err != nil {
		var reserved *domain.ErrReservedSlug
		if errors.As(err, &reserved) {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"message": reserved.Error()})
			return
		}
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, toOpticaResource(optica))
}

// GetOptica godoc
// GET /api/v1/super-admin/opticas/:id
func (h *Handler) GetOptica(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	o, err := h.optica.GetByID(id)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, toOpticaResource(o))
}

// UpdateOptica godoc
// PATCH /api/v1/super-admin/opticas/:id
func (h *Handler) UpdateOptica(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}
	var input opticasvc.UpdateOpticaInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	o, err := h.optica.Update(id, input)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, toOpticaResource(o))
}
