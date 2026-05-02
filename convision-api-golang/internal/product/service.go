package product

import (
	"errors"

	"go.uber.org/zap"
	"gorm.io/gorm"

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
	InternalCode      string   `json:"internal_code"`
	Identifier        string   `json:"identifier"          binding:"omitempty"`
	Name              string   `json:"name"`
	Description       string   `json:"description"`
	Cost              float64  `json:"cost"`
	Price             *float64 `json:"price"`
	SalePrice         *float64 `json:"sale_price"`
	ProductCategoryID *uint    `json:"product_category_id"`
	CategoryID        *uint    `json:"category_id"`
	BrandID           *uint    `json:"brand_id"`
	SupplierID        *uint    `json:"supplier_id"`
	Status            string   `json:"status"`
}

// UpdateInput holds validated fields for updating a product.
type UpdateInput struct {
	InternalCode      string   `json:"internal_code"`
	Identifier        string   `json:"identifier"`
	Name              string   `json:"name"`
	Description       string   `json:"description"`
	Cost              *float64 `json:"cost"`
	Price             *float64 `json:"price"`
	SalePrice         *float64 `json:"sale_price"`
	ProductCategoryID *uint    `json:"product_category_id"`
	CategoryID        *uint    `json:"category_id"`
	BrandID           *uint    `json:"brand_id"`
	SupplierID        *uint    `json:"supplier_id"`
	Status            string   `json:"status"`
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
	HasDiscounts    bool    `json:"has_discounts"`
	BestDiscountPct float64 `json:"best_discount_percentage"`
	DiscountedPrice float64 `json:"discounted_price"`
	OriginalPrice   float64 `json:"original_price"`
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

func (s *Service) List(db *gorm.DB, filters map[string]any, page, perPage int) (*ListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.repo.List(db, filters, page, perPage)
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

func (s *Service) GetByID(db *gorm.DB, id uint) (*domain.Product, error) {
	return s.repo.GetByID(db, id)
}

func (s *Service) Create(db *gorm.DB, input CreateInput) (*domain.Product, error) {
	status := domain.ProductStatus(input.Status)
	if status == "" {
		status = domain.ProductStatusEnabled
	}

	price := 0.0
	if input.Price != nil {
		price = *input.Price
	}
	if input.SalePrice != nil {
		price = *input.SalePrice
	}
	if price <= 0 {
		return nil, &domain.ErrValidation{Field: "price", Message: "is required"}
	}

	description := input.Description
	if description == "" {
		description = input.Name
	}

	categoryID := input.ProductCategoryID
	if categoryID == nil {
		categoryID = input.CategoryID
	}

	p := &domain.Product{
		InternalCode:      input.InternalCode,
		Identifier:        input.Identifier,
		Description:       description,
		Cost:              input.Cost,
		Price:             price,
		ProductCategoryID: categoryID,
		BrandID:           input.BrandID,
		SupplierID:        input.SupplierID,
		Status:            status,
	}
	if err := s.repo.Create(db, p); err != nil {
		return nil, err
	}
	return s.repo.GetByID(db, p.ID)
}

func (s *Service) Update(db *gorm.DB, id uint, input UpdateInput) (*domain.Product, error) {
	p, err := s.repo.GetByID(db, id)
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
	if input.Name != "" && input.Description == "" {
		p.Description = input.Name
	}
	if input.Price != nil {
		p.Price = *input.Price
	}
	if input.SalePrice != nil {
		p.Price = *input.SalePrice
	}
	if input.Cost != nil {
		p.Cost = *input.Cost
	}
	if input.ProductCategoryID != nil {
		p.ProductCategoryID = input.ProductCategoryID
	}
	if input.CategoryID != nil {
		p.ProductCategoryID = input.CategoryID
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

	if err := s.repo.Update(db, p); err != nil {
		return nil, err
	}
	return s.repo.GetByID(db, id)
}

func (s *Service) Delete(db *gorm.DB, id uint) error {
	if _, err := s.repo.GetByID(db, id); err != nil {
		return err
	}
	// Block deletion when the product has inventory stock.
	stock, err := s.repo.StockByProduct(db, id)
	if err != nil {
		return err
	}
	for _, entry := range stock {
		if entry.Quantity > 0 {
			return &domain.ErrValidation{
				Field:   "product_id",
				Message: "no se puede eliminar el producto porque tiene existencias en inventario",
			}
		}
	}
	// Block deletion when the product has active approved discounts.
	activeDiscounts, err := s.discountRepo.GetActiveForProduct(db, id)
	if err != nil {
		return err
	}
	if len(activeDiscounts) > 0 {
		return &domain.ErrValidation{
			Field:   "product_id",
			Message: "no se puede eliminar el producto porque tiene descuentos activos",
		}
	}
	return s.repo.Delete(db, id)
}

func (s *Service) Search(db *gorm.DB, query, category string, page, perPage int) (*ListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.repo.Search(db, query, category, page, perPage)
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

func (s *Service) BulkUpdateStatus(db *gorm.DB, ids []uint, status string) (int64, error) {
	if status != string(domain.ProductStatusEnabled) && status != string(domain.ProductStatusDisabled) {
		return 0, &domain.ErrValidation{Field: "status", Message: "must be 'enabled' or 'disabled'"}
	}
	return s.repo.BulkUpdateStatus(db, ids, status)
}

// ListByCategoryOutput is the paginated response for category-scoped product listing.
type ListByCategoryOutput struct {
	CurrentPage int               `json:"current_page"`
	Data        []*domain.Product `json:"data"`
	LastPage    int               `json:"last_page"`
	PerPage     int               `json:"per_page"`
	Total       int64             `json:"total"`
}

func (s *Service) ListByCategory(db *gorm.DB, slug string, filters map[string]any, page, perPage int) (*ListByCategoryOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.repo.ListByCategory(db, slug, filters, page, perPage)
	if err != nil {
		return nil, err
	}
	return &ListByCategoryOutput{
		CurrentPage: page,
		Data:        data,
		LastPage:    calcLastPage(total, perPage),
		PerPage:     perPage,
		Total:       total,
	}, nil
}

func (s *Service) ListByPrescription(db *gorm.DB, f domain.PrescriptionFilter) ([]*domain.Product, error) {
	return s.repo.ListByPrescription(db, f)
}

func (s *Service) GetProductStock(db *gorm.DB, id uint) ([]*domain.ProductStockByWarehouse, error) {
	if _, err := s.repo.GetByID(db, id); err != nil {
		return nil, err
	}
	return s.repo.StockByProduct(db, id)
}

func (s *Service) GetDiscountInfo(db *gorm.DB, productID uint, patientID *uint) (*DiscountInfoOutput, error) {
	p, err := s.repo.GetByID(db, productID)
	if err != nil {
		return nil, err
	}

	best, err := s.discountRepo.GetBestForProduct(db, productID, patientID)
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

// LensCatalogListOutput is the paginated lens catalog response.
type LensCatalogListOutput struct {
	CurrentPage int               `json:"current_page"`
	Data        []*domain.Product `json:"data"`
	LastPage    int               `json:"last_page"`
	PerPage     int               `json:"per_page"`
	Total       int64             `json:"total"`
}

// ListLensCatalog returns paginated products with product_type = 'lens'.
func (s *Service) ListLensCatalog(db *gorm.DB, filters map[string]any, page, perPage int) (*LensCatalogListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.repo.ListLensCatalog(db, filters, page, perPage)
	if err != nil {
		return nil, err
	}
	return &LensCatalogListOutput{
		CurrentPage: page,
		Data:        data,
		LastPage:    calcLastPage(total, perPage),
		PerPage:     perPage,
		Total:       total,
	}, nil
}

func (s *Service) HasActiveDiscounts(db *gorm.DB, productID uint) bool {
	_, err := s.discountRepo.GetBestForProduct(db, productID, nil)
	return err == nil
}

func (s *Service) CalculatePrice(db *gorm.DB, productID uint, patientID *uint) (*PriceOutput, error) {
	p, err := s.repo.GetByID(db, productID)
	if err != nil {
		return nil, err
	}

	best, err := s.discountRepo.GetBestForProduct(db, productID, patientID)
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
