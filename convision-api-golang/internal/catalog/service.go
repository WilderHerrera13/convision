package catalog

import (
	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
)

// Service handles all catalog use-cases (brands, lens types, materials, etc.).
type Service struct {
	brandRepo         domain.BrandRepository
	lensTypeRepo      domain.LensTypeRepository
	materialRepo      domain.MaterialRepository
	lensClassRepo     domain.LensClassRepository
	treatmentRepo     domain.TreatmentRepository
	photochromicRepo  domain.PhotochromicRepository
	paymentMethodRepo domain.PaymentMethodRepository
	logger            *zap.Logger
}

// NewService creates a new catalog Service.
func NewService(
	brandRepo domain.BrandRepository,
	lensTypeRepo domain.LensTypeRepository,
	materialRepo domain.MaterialRepository,
	lensClassRepo domain.LensClassRepository,
	treatmentRepo domain.TreatmentRepository,
	photochromicRepo domain.PhotochromicRepository,
	paymentMethodRepo domain.PaymentMethodRepository,
	logger *zap.Logger,
) *Service {
	return &Service{
		brandRepo:         brandRepo,
		lensTypeRepo:      lensTypeRepo,
		materialRepo:      materialRepo,
		lensClassRepo:     lensClassRepo,
		treatmentRepo:     treatmentRepo,
		photochromicRepo:  photochromicRepo,
		paymentMethodRepo: paymentMethodRepo,
		logger:            logger,
	}
}

// --- Shared pagination helpers ---

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

// ---------- Brand ----------

// BrandInput holds validated fields for create/update.
type BrandInput struct {
	Name        string  `json:"name"        binding:"required,max=100"`
	Description *string `json:"description"`
}

// BrandListOutput is the paginated brand response.
type BrandListOutput struct {
	CurrentPage int              `json:"current_page"`
	Data        []*domain.Brand  `json:"data"`
	LastPage    int              `json:"last_page"`
	PerPage     int              `json:"per_page"`
	Total       int64            `json:"total"`
}

func (s *Service) ListBrands(page, perPage int) (*BrandListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.brandRepo.List(page, perPage)
	if err != nil {
		return nil, err
	}
	return &BrandListOutput{
		CurrentPage: page,
		Data:        data,
		LastPage:    calcLastPage(total, perPage),
		PerPage:     perPage,
		Total:       total,
	}, nil
}

func (s *Service) GetBrand(id uint) (*domain.Brand, error) {
	return s.brandRepo.GetByID(id)
}

func (s *Service) CreateBrand(input BrandInput) (*domain.Brand, error) {
	e := &domain.Brand{Name: input.Name, Description: input.Description}
	if err := s.brandRepo.Create(e); err != nil {
		return nil, err
	}
	return e, nil
}

func (s *Service) UpdateBrand(id uint, input BrandInput) (*domain.Brand, error) {
	e, err := s.brandRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	e.Name = input.Name
	e.Description = input.Description
	if err := s.brandRepo.Update(e); err != nil {
		return nil, err
	}
	return s.brandRepo.GetByID(id)
}

func (s *Service) DeleteBrand(id uint) error {
	if _, err := s.brandRepo.GetByID(id); err != nil {
		return err
	}
	return s.brandRepo.Delete(id)
}

// ---------- LensType ----------

type LensTypeInput struct {
	Name        string  `json:"name"        binding:"required,max=255"`
	Description *string `json:"description"`
}

type LensTypeListOutput struct {
	CurrentPage int               `json:"current_page"`
	Data        []*domain.LensType `json:"data"`
	LastPage    int               `json:"last_page"`
	PerPage     int               `json:"per_page"`
	Total       int64             `json:"total"`
}

func (s *Service) ListLensTypes(page, perPage int) (*LensTypeListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.lensTypeRepo.List(page, perPage)
	if err != nil {
		return nil, err
	}
	return &LensTypeListOutput{
		CurrentPage: page, Data: data,
		LastPage: calcLastPage(total, perPage), PerPage: perPage, Total: total,
	}, nil
}

func (s *Service) GetLensType(id uint) (*domain.LensType, error) {
	return s.lensTypeRepo.GetByID(id)
}

func (s *Service) CreateLensType(input LensTypeInput) (*domain.LensType, error) {
	e := &domain.LensType{Name: input.Name, Description: input.Description}
	if err := s.lensTypeRepo.Create(e); err != nil {
		return nil, err
	}
	return e, nil
}

func (s *Service) UpdateLensType(id uint, input LensTypeInput) (*domain.LensType, error) {
	e, err := s.lensTypeRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	e.Name = input.Name
	e.Description = input.Description
	if err := s.lensTypeRepo.Update(e); err != nil {
		return nil, err
	}
	return s.lensTypeRepo.GetByID(id)
}

func (s *Service) DeleteLensType(id uint) error {
	if _, err := s.lensTypeRepo.GetByID(id); err != nil {
		return err
	}
	return s.lensTypeRepo.Delete(id)
}

// ---------- Material ----------

type MaterialInput struct {
	Name        string  `json:"name"        binding:"required,max=255"`
	Description *string `json:"description"`
}

type MaterialListOutput struct {
	CurrentPage int                `json:"current_page"`
	Data        []*domain.Material `json:"data"`
	LastPage    int                `json:"last_page"`
	PerPage     int                `json:"per_page"`
	Total       int64              `json:"total"`
}

func (s *Service) ListMaterials(page, perPage int) (*MaterialListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.materialRepo.List(page, perPage)
	if err != nil {
		return nil, err
	}
	return &MaterialListOutput{
		CurrentPage: page, Data: data,
		LastPage: calcLastPage(total, perPage), PerPage: perPage, Total: total,
	}, nil
}

func (s *Service) GetMaterial(id uint) (*domain.Material, error) {
	return s.materialRepo.GetByID(id)
}

func (s *Service) CreateMaterial(input MaterialInput) (*domain.Material, error) {
	e := &domain.Material{Name: input.Name, Description: input.Description}
	if err := s.materialRepo.Create(e); err != nil {
		return nil, err
	}
	return e, nil
}

func (s *Service) UpdateMaterial(id uint, input MaterialInput) (*domain.Material, error) {
	e, err := s.materialRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	e.Name = input.Name
	e.Description = input.Description
	if err := s.materialRepo.Update(e); err != nil {
		return nil, err
	}
	return s.materialRepo.GetByID(id)
}

func (s *Service) DeleteMaterial(id uint) error {
	if _, err := s.materialRepo.GetByID(id); err != nil {
		return err
	}
	return s.materialRepo.Delete(id)
}

// ---------- LensClass ----------

type LensClassInput struct {
	Name        string  `json:"name"        binding:"required,max=255"`
	Description *string `json:"description"`
}

type LensClassListOutput struct {
	CurrentPage int                 `json:"current_page"`
	Data        []*domain.LensClass `json:"data"`
	LastPage    int                 `json:"last_page"`
	PerPage     int                 `json:"per_page"`
	Total       int64               `json:"total"`
}

func (s *Service) ListLensClasses(page, perPage int) (*LensClassListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.lensClassRepo.List(page, perPage)
	if err != nil {
		return nil, err
	}
	return &LensClassListOutput{
		CurrentPage: page, Data: data,
		LastPage: calcLastPage(total, perPage), PerPage: perPage, Total: total,
	}, nil
}

func (s *Service) GetLensClass(id uint) (*domain.LensClass, error) {
	return s.lensClassRepo.GetByID(id)
}

func (s *Service) CreateLensClass(input LensClassInput) (*domain.LensClass, error) {
	e := &domain.LensClass{Name: input.Name, Description: input.Description}
	if err := s.lensClassRepo.Create(e); err != nil {
		return nil, err
	}
	return e, nil
}

func (s *Service) UpdateLensClass(id uint, input LensClassInput) (*domain.LensClass, error) {
	e, err := s.lensClassRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	e.Name = input.Name
	e.Description = input.Description
	if err := s.lensClassRepo.Update(e); err != nil {
		return nil, err
	}
	return s.lensClassRepo.GetByID(id)
}

func (s *Service) DeleteLensClass(id uint) error {
	if _, err := s.lensClassRepo.GetByID(id); err != nil {
		return err
	}
	return s.lensClassRepo.Delete(id)
}

// ---------- Treatment ----------

type TreatmentInput struct {
	Name        string  `json:"name"        binding:"required,max=255"`
	Description *string `json:"description"`
}

type TreatmentListOutput struct {
	CurrentPage int                  `json:"current_page"`
	Data        []*domain.Treatment  `json:"data"`
	LastPage    int                  `json:"last_page"`
	PerPage     int                  `json:"per_page"`
	Total       int64                `json:"total"`
}

func (s *Service) ListTreatments(page, perPage int) (*TreatmentListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.treatmentRepo.List(page, perPage)
	if err != nil {
		return nil, err
	}
	return &TreatmentListOutput{
		CurrentPage: page, Data: data,
		LastPage: calcLastPage(total, perPage), PerPage: perPage, Total: total,
	}, nil
}

func (s *Service) GetTreatment(id uint) (*domain.Treatment, error) {
	return s.treatmentRepo.GetByID(id)
}

func (s *Service) CreateTreatment(input TreatmentInput) (*domain.Treatment, error) {
	e := &domain.Treatment{Name: input.Name, Description: input.Description}
	if err := s.treatmentRepo.Create(e); err != nil {
		return nil, err
	}
	return e, nil
}

func (s *Service) UpdateTreatment(id uint, input TreatmentInput) (*domain.Treatment, error) {
	e, err := s.treatmentRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	e.Name = input.Name
	e.Description = input.Description
	if err := s.treatmentRepo.Update(e); err != nil {
		return nil, err
	}
	return s.treatmentRepo.GetByID(id)
}

func (s *Service) DeleteTreatment(id uint) error {
	if _, err := s.treatmentRepo.GetByID(id); err != nil {
		return err
	}
	return s.treatmentRepo.Delete(id)
}

// ---------- Photochromic ----------

type PhotochromicInput struct {
	Name        string  `json:"name"        binding:"required,max=255"`
	Description *string `json:"description"`
}

type PhotochromicListOutput struct {
	CurrentPage int                    `json:"current_page"`
	Data        []*domain.Photochromic `json:"data"`
	LastPage    int                    `json:"last_page"`
	PerPage     int                    `json:"per_page"`
	Total       int64                  `json:"total"`
}

func (s *Service) ListPhotochromics(page, perPage int) (*PhotochromicListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.photochromicRepo.List(page, perPage)
	if err != nil {
		return nil, err
	}
	return &PhotochromicListOutput{
		CurrentPage: page, Data: data,
		LastPage: calcLastPage(total, perPage), PerPage: perPage, Total: total,
	}, nil
}

func (s *Service) GetPhotochromic(id uint) (*domain.Photochromic, error) {
	return s.photochromicRepo.GetByID(id)
}

func (s *Service) CreatePhotochromic(input PhotochromicInput) (*domain.Photochromic, error) {
	e := &domain.Photochromic{Name: input.Name, Description: input.Description}
	if err := s.photochromicRepo.Create(e); err != nil {
		return nil, err
	}
	return e, nil
}

func (s *Service) UpdatePhotochromic(id uint, input PhotochromicInput) (*domain.Photochromic, error) {
	e, err := s.photochromicRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	e.Name = input.Name
	e.Description = input.Description
	if err := s.photochromicRepo.Update(e); err != nil {
		return nil, err
	}
	return s.photochromicRepo.GetByID(id)
}

func (s *Service) DeletePhotochromic(id uint) error {
	if _, err := s.photochromicRepo.GetByID(id); err != nil {
		return err
	}
	return s.photochromicRepo.Delete(id)
}

// ---------- PaymentMethod ----------

type PaymentMethodInput struct {
	Name              string  `json:"name"               binding:"required,max=255"`
	Code              string  `json:"code"               binding:"required,max=50"`
	Description       *string `json:"description"`
	Icon              *string `json:"icon"`
	IsActive          *bool   `json:"is_active"`
	RequiresReference *bool   `json:"requires_reference"`
}

type PaymentMethodListOutput struct {
	CurrentPage int                     `json:"current_page"`
	Data        []*domain.PaymentMethod `json:"data"`
	LastPage    int                     `json:"last_page"`
	PerPage     int                     `json:"per_page"`
	Total       int64                   `json:"total"`
}

func (s *Service) ListPaymentMethods(page, perPage int) (*PaymentMethodListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.paymentMethodRepo.List(page, perPage)
	if err != nil {
		return nil, err
	}
	return &PaymentMethodListOutput{
		CurrentPage: page, Data: data,
		LastPage: calcLastPage(total, perPage), PerPage: perPage, Total: total,
	}, nil
}

// ListActivePaymentMethods returns all active payment methods (no pagination, matches Laravel).
func (s *Service) ListActivePaymentMethods() ([]*domain.PaymentMethod, error) {
	return s.paymentMethodRepo.ListActive()
}

func (s *Service) GetPaymentMethod(id uint) (*domain.PaymentMethod, error) {
	return s.paymentMethodRepo.GetByID(id)
}

func (s *Service) CreatePaymentMethod(input PaymentMethodInput) (*domain.PaymentMethod, error) {
	isActive := true
	if input.IsActive != nil {
		isActive = *input.IsActive
	}
	requiresRef := false
	if input.RequiresReference != nil {
		requiresRef = *input.RequiresReference
	}
	e := &domain.PaymentMethod{
		Name: input.Name, Code: input.Code,
		Description: input.Description, Icon: input.Icon,
		IsActive: isActive, RequiresReference: requiresRef,
	}
	if err := s.paymentMethodRepo.Create(e); err != nil {
		return nil, err
	}
	return e, nil
}

func (s *Service) UpdatePaymentMethod(id uint, input PaymentMethodInput) (*domain.PaymentMethod, error) {
	e, err := s.paymentMethodRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if input.Name != "" {
		e.Name = input.Name
	}
	if input.Code != "" {
		e.Code = input.Code
	}
	e.Description = input.Description
	e.Icon = input.Icon
	if input.IsActive != nil {
		e.IsActive = *input.IsActive
	}
	if input.RequiresReference != nil {
		e.RequiresReference = *input.RequiresReference
	}
	if err := s.paymentMethodRepo.Update(e); err != nil {
		return nil, err
	}
	return s.paymentMethodRepo.GetByID(id)
}

func (s *Service) DeletePaymentMethod(id uint) error {
	if _, err := s.paymentMethodRepo.GetByID(id); err != nil {
		return err
	}
	return s.paymentMethodRepo.Delete(id)
}
