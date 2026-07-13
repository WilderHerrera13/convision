// Package icd10 provides the real ICD-10 (CIE-10) diagnosis catalog used to
// back the clinical-form diagnosis search and to validate Diagnosis codes
// (docs/GAP_ANALYSIS_HISTORIA_CLINICA_JARVIS.md, section 03/08).
package icd10

import (
	"errors"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// Service handles ICD-10 catalog use-cases.
type Service struct {
	repo   domain.Icd10CodeRepository
	logger *zap.Logger
}

// NewService creates a new icd10 Service.
func NewService(repo domain.Icd10CodeRepository, logger *zap.Logger) *Service {
	return &Service{repo: repo, logger: logger}
}

// ListOutput is the paginated response for a catalog search.
type ListOutput struct {
	Data    []*domain.Icd10Code `json:"data"`
	Total   int64               `json:"total"`
	Page    int                 `json:"page"`
	PerPage int                 `json:"per_page"`
}

// List searches the active ICD-10 catalog by code prefix or description substring.
func (s *Service) List(db *gorm.DB, f domain.Icd10CodeFilter) (*ListOutput, error) {
	f.Clamp()
	data, total, err := s.repo.List(db, f)
	if err != nil {
		return nil, err
	}
	return &ListOutput{Data: data, Total: total, Page: f.Page, PerPage: f.PerPage}, nil
}

// ValidateCode confirms code exists and is active in the real catalog.
// Returns *domain.ErrValidation when the code is missing/inactive — callers
// (e.g. clinicalrecord.Service.UpsertDiagnosis) use this to reject free-text
// values that never made it into the catalog.
func (s *Service) ValidateCode(db *gorm.DB, code string) error {
	if code == "" {
		return nil
	}
	if _, err := s.repo.GetByCode(db, code); err != nil {
		var notFound *domain.ErrNotFound
		if errors.As(err, &notFound) {
			return &domain.ErrValidation{Field: "primary_code", Message: "código CIE-10 no encontrado en el catálogo: " + code}
		}
		return err
	}
	return nil
}
