package product

import (
	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
)

// CategoryService handles product category use-cases.
type CategoryService struct {
	repo   domain.ProductCategoryRepository
	logger *zap.Logger
}

// NewCategoryService creates a new CategoryService.
func NewCategoryService(repo domain.ProductCategoryRepository, logger *zap.Logger) *CategoryService {
	return &CategoryService{repo: repo, logger: logger}
}

// --- DTOs ---

// CategoryCreateInput holds validated fields for creating a product category.
type CategoryCreateInput struct {
	Name        string   `json:"name"        binding:"required"`
	Slug        string   `json:"slug"        binding:"required"`
	Description string   `json:"description"`
	Icon        string   `json:"icon"`
	IsActive    bool     `json:"is_active"`
}

// CategoryUpdateInput holds validated fields for updating a product category.
type CategoryUpdateInput struct {
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
	IsActive    bool   `json:"is_active"`
}

// CategoryListOutput is the paginated category response.
type CategoryListOutput struct {
	CurrentPage int                       `json:"current_page"`
	Data        []*domain.ProductCategory `json:"data"`
	LastPage    int                       `json:"last_page"`
	PerPage     int                       `json:"per_page"`
	Total       int64                     `json:"total"`
}

// --- Methods ---

func (s *CategoryService) List(filters map[string]any, page, perPage int) (*CategoryListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.repo.List(filters, page, perPage)
	if err != nil {
		return nil, err
	}
	return &CategoryListOutput{
		CurrentPage: page,
		Data:        data,
		LastPage:    calcLastPage(total, perPage),
		PerPage:     perPage,
		Total:       total,
	}, nil
}

func (s *CategoryService) GetByID(id uint) (*domain.ProductCategory, error) {
	return s.repo.GetByID(id)
}

func (s *CategoryService) Create(input CategoryCreateInput) (*domain.ProductCategory, error) {
	c := &domain.ProductCategory{
		Name:        input.Name,
		Slug:        input.Slug,
		Description: input.Description,
		Icon:        input.Icon,
		IsActive:    input.IsActive,
	}
	if err := s.repo.Create(c); err != nil {
		return nil, err
	}
	return s.repo.GetByID(c.ID)
}

func (s *CategoryService) Update(id uint, input CategoryUpdateInput) (*domain.ProductCategory, error) {
	c, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if input.Name != "" {
		c.Name = input.Name
	}
	if input.Slug != "" {
		c.Slug = input.Slug
	}
	c.Description = input.Description
	c.Icon = input.Icon
	c.IsActive = input.IsActive

	if err := s.repo.Update(c); err != nil {
		return nil, err
	}
	return s.repo.GetByID(id)
}

func (s *CategoryService) Delete(id uint) error {
	if _, err := s.repo.GetByID(id); err != nil {
		return err
	}
	return s.repo.Delete(id)
}
