package product

import (
	"errors"

	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
)

// Service handles product use-cases.
type Service struct {
	repo         domain.ProductRepository
	discountRepo domain.DiscountRepository
	logger       *zap.Logger
}

// NewService creates a new product Service.
func NewService(repo domain.ProductRepository, discountRepo domain.DiscountRepository, logger *zap.Logger) *Service {
	return &Service{repo: repo, discountRepo: discountRepo, logger: logger}
}

// --- Pagination helpers ---

func calcLastPage(total int64, perPage int) int {
	if total == 0 {
		return 1
	}
	lp := int(total) / perPage
	if int(total)%perPage != 0 {
		lp++
	}
	return lp
}

func clampPage(page, perPage int) (int, int) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 15
	}
	return page, perPage
}

// --- DTOs ---

// CreateInput holds validated fields for creating a product.
type CreateInput struct {
	InternalCode      string  `json:"internal_code"`
	Identifier        string  `json:"identifier"          binding:"omitempty"`
	Description       string  `json:"description"`
	Cost              float64 `json:"cost"`
	Price             float64 `json:"price"               binding:"required"`
	ProductCategoryID *uint   `json:"product_category_id"`
	BrandID           *uint   `json:"brand_id"`
	SupplierID        *uint   `json:"supplier_id"`
	Status            string  `json:"status"`
}

// UpdateInput holds validated fields for updating a product.
type UpdateInput struct {
	InternalCode      string  `json:"internal_code"`
	Identifier        string  `json:"identifier"`
	Description       string  `json:"description"`
	Cost              float64 `json:"cost"`
	Price             float64 `json:"price"`
	ProductCategoryID *uint   `json:"product_category_id"`
	BrandID           *uint   `json:"brand_id"`
	SupplierID        *uint   `json:"supplier_id"`
	Status            string  `json:"status"`
}

// ListOutput is the paginated product response.
type ListOutput struct {
	CurrentPage int               `json:"current_page"`
	Data        []*domain.Product `json:"data"`
	LastPage    int               `json:"last_page"`
	PerPage     int               `json:"per_page"`
	Total       int64             `json:"total"`
}

// StockOutput holds stock information for a product.
type StockOutput struct {
	ProductID     uint  `json:"product_id"`
	TotalQuantity int64 `json:"total_quantity"`
}

// DiscountInfoOutput holds discount information for a product.
type DiscountInfoOutput struct {
	HasDiscounts       bool    `json:"has_discounts"`
	BestDiscountPct    float64 `json:"best_discount_percentage"`
	DiscountedPrice    float64 `json:"discounted_price"`
	OriginalPrice      float64 `json:"original_price"`
}

// PriceOutput holds calculated price information.
type PriceOutput struct {
	OriginalPrice      float64 `json:"original_price"`
	DiscountedPrice    float64 `json:"discounted_price"`
	DiscountPercentage float64 `json:"discount_percentage"`
	HasDiscount        bool    `json:"has_discount"`
}

// BulkStatusInput holds fields for bulk status update.
type BulkStatusInput struct {
	IDs    []uint `json:"product_ids" binding:"required"`
	Status string `json:"status" binding:"required"`
}

// --- Methods ---

func (s *Service) List(filters map[string]any, page, perPage int) (*ListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.repo.List(filters, page, perPage)
	if err != nil {
		return nil, err
	}
	return &ListOutput{
		CurrentPage: page,
		Data:        data,
		LastPage:    calcLastPage(total, perPage),
		PerPage:     perPage,
		Total:       total,
	}, nil
}

func (s *Service) GetByID(id uint) (*domain.Product, error) {
	return s.repo.GetByID(id)
}

func (s *Service) Create(input CreateInput) (*domain.Product, error) {
	status := domain.ProductStatus(input.Status)
	if status == "" {
		status = domain.ProductStatusEnabled
	}

	p := &domain.Product{
		InternalCode:      input.InternalCode,
		Identifier:        input.Identifier,
		Description:       input.Description,
		Cost:              input.Cost,
		Price:             input.Price,
		ProductCategoryID: input.ProductCategoryID,
		BrandID:           input.BrandID,
		SupplierID:        input.SupplierID,
		Status:            status,
	}
	if err := s.repo.Create(p); err != nil {
		return nil, err
	}
	return s.repo.GetByID(p.ID)
}

func (s *Service) Update(id uint, input UpdateInput) (*domain.Product, error) {
	p, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}

	if input.Identifier != "" {
		p.Identifier = input.Identifier
	}
	if input.InternalCode != "" {
		p.InternalCode = input.InternalCode
	}
	if input.Description != "" {
		p.Description = input.Description
	}
	if input.Price != 0 {
		p.Price = input.Price
	}
	if input.Cost != 0 {
		p.Cost = input.Cost
	}
	if input.ProductCategoryID != nil {
		p.ProductCategoryID = input.ProductCategoryID
	}
	if input.BrandID != nil {
		p.BrandID = input.BrandID
	}
	if input.SupplierID != nil {
		p.SupplierID = input.SupplierID
	}
	if input.Status != "" {
		p.Status = domain.ProductStatus(input.Status)
	}

	if err := s.repo.Update(p); err != nil {
		return nil, err
	}
	return s.repo.GetByID(id)
}

func (s *Service) Delete(id uint) error {
	if _, err := s.repo.GetByID(id); err != nil {
		return err
	}
	return s.repo.Delete(id)
}

func (s *Service) Search(query, category string, page, perPage int) (*ListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.repo.Search(query, category, page, perPage)
	if err != nil {
		return nil, err
	}
	return &ListOutput{
		CurrentPage: page,
		Data:        data,
		LastPage:    calcLastPage(total, perPage),
		PerPage:     perPage,
		Total:       total,
	}, nil
}

func (s *Service) BulkUpdateStatus(ids []uint, status string) (int64, error) {
	if status != string(domain.ProductStatusEnabled) && status != string(domain.ProductStatusDisabled) {
		return 0, &domain.ErrValidation{Field: "status", Message: "must be 'enabled' or 'disabled'"}
	}
	return s.repo.BulkUpdateStatus(ids, status)
}

func (s *Service) GetDiscountInfo(productID uint, patientID *uint) (*DiscountInfoOutput, error) {
	p, err := s.repo.GetByID(productID)
	if err != nil {
		return nil, err
	}

	best, err := s.discountRepo.GetBestForProduct(productID, patientID)
	if err != nil {
		var notFound *domain.ErrNotFound
		if errors.As(err, &notFound) {
			return &DiscountInfoOutput{
				HasDiscounts:    false,
				OriginalPrice:   p.Price,
				DiscountedPrice: p.Price,
			}, nil
		}
		return nil, err
	}

	discounted := p.Price * (1 - best.DiscountPercentage/100)
	return &DiscountInfoOutput{
		HasDiscounts:    true,
		BestDiscountPct: best.DiscountPercentage,
		OriginalPrice:   p.Price,
		DiscountedPrice: discounted,
	}, nil
}

func (s *Service) CalculatePrice(productID uint, patientID *uint) (*PriceOutput, error) {
	p, err := s.repo.GetByID(productID)
	if err != nil {
		return nil, err
	}

	best, err := s.discountRepo.GetBestForProduct(productID, patientID)
	if err != nil {
		var notFound *domain.ErrNotFound
		if errors.As(err, &notFound) {
			return &PriceOutput{
				OriginalPrice:      p.Price,
				DiscountedPrice:    p.Price,
				DiscountPercentage: 0,
				HasDiscount:        false,
			}, nil
		}
		return nil, err
	}

	discounted := p.Price * (1 - best.DiscountPercentage/100)
	return &PriceOutput{
		OriginalPrice:      p.Price,
		DiscountedPrice:    discounted,
		DiscountPercentage: best.DiscountPercentage,
		HasDiscount:        true,
	}, nil
}
