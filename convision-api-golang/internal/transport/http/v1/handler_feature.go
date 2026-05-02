package v1

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/convision/api/internal/domain"
)

// FeatureFlagResource is the JSON shape for a single feature flag.
type FeatureFlagResource struct {
	FeatureKey string `json:"feature_key"`
	IsEnabled  bool   `json:"is_enabled"`
}

// ListOpticaFeatures godoc
// GET /api/v1/super-admin/opticas/:id/features
func (h *Handler) ListOpticaFeatures(c *gin.Context) {
	opticaID, err := parseID(c, "id")
	if err != nil {
		return
	}
	features, err := h.featureFlag.List(opticaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "internal server error"})
		return
	}
	data := make([]FeatureFlagResource, len(features))
	for i, f := range features {
		data[i] = FeatureFlagResource{FeatureKey: f.FeatureKey, IsEnabled: f.IsEnabled}
	}
	c.JSON(http.StatusOK, gin.H{"features": data})
}

// BulkUpdateOpticaFeatures godoc
// PUT /api/v1/super-admin/opticas/:id/features
func (h *Handler) BulkUpdateOpticaFeatures(c *gin.Context) {
	opticaID, err := parseID(c, "id")
	if err != nil {
		return
	}
	var body struct {
		Features []domain.FeatureToggle `json:"features" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	if err := h.featureFlag.BulkUpdate(opticaID, body.Features); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Banderas actualizadas correctamente"})
}

// ToggleOpticaFeature godoc
// PATCH /api/v1/super-admin/opticas/:id/features/:key
func (h *Handler) ToggleOpticaFeature(c *gin.Context) {
	opticaID, err := parseID(c, "id")
	if err != nil {
		return
	}
	featureKey := c.Param("key")
	var body struct {
		IsEnabled bool `json:"is_enabled"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
		return
	}
	if err := h.featureFlag.Toggle(opticaID, featureKey, body.IsEnabled); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Bandera actualizada"})
}

// ListFeatureKeys godoc
// GET /api/v1/super-admin/feature-keys
func (h *Handler) ListFeatureKeys(c *gin.Context) {
	keys := h.featureFlag.AllKeys()
	c.JSON(http.StatusOK, gin.H{"feature_keys": keys})
}
