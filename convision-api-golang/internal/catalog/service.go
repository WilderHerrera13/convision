package catalog

import (
	"go.uber.org/zap"
	"gorm.io/gorm"

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
	CurrentPage int             `json:"current_page"`
	Data        []*domain.Brand `json:"data"`
	LastPage    int             `json:"last_page"`
	PerPage     int             `json:"per_page"`
	Total       int64           `json:"total"`
}

func (s *Service) ListBrands(db *gorm.DB, page, perPage int) (*BrandListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.brandRepo.List(db, page, perPage)
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

func (s *Service) GetBrand(db *gorm.DB, id uint) (*domain.Brand, error) {
	return s.brandRepo.GetByID(db, id)
}

func (s *Service) CreateBrand(db *gorm.DB, input BrandInput) (*domain.Brand, error) {
	e := &domain.Brand{Name: input.Name, Description: input.Description}
	if err := s.brandRepo.Create(db, e); err != nil {
		return nil, err
	}
	return e, nil
}

func (s *Service) UpdateBrand(db *gorm.DB, id uint, input BrandInput) (*domain.Brand, error) {
	e, err := s.brandRepo.GetByID(db, id)
	if err != nil {
		return nil, err
	}
	e.Name = input.Name
	e.Description = input.Description
	if err := s.brandRepo.Update(db, e); err != nil {
		return nil, err
	}
	return s.brandRepo.GetByID(db, id)
}

func (s *Service) DeleteBrand(db *gorm.DB, id uint) error {
	if _, err := s.brandRepo.GetByID(db, id); err != nil {
		return err
	}
	return s.brandRepo.Delete(db, id)
}

// ---------- LensType ----------

type LensTypeInput struct {
	Name        string  `json:"name"        binding:"required,max=255"`
	Description *string `json:"description"`
}

type LensTypeListOutput struct {
	CurrentPage int                `json:"current_page"`
	Data        []*domain.LensType `json:"data"`
	LastPage    int                `json:"last_page"`
	PerPage     int                `json:"per_page"`
	Total       int64              `json:"total"`
}

func (s *Service) ListLensTypes(db *gorm.DB, page, perPage int) (*LensTypeListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.lensTypeRepo.List(db, page, perPage)
	if err != nil {
		return nil, err
	}
	return &LensTypeListOutput{
		CurrentPage: page, Data: data,
		LastPage: calcLastPage(total, perPage), PerPage: perPage, Total: total,
	}, nil
}

func (s *Service) GetLensType(db *gorm.DB, id uint) (*domain.LensType, error) {
	return s.lensTypeRepo.GetByID(db, id)
}

func (s *Service) CreateLensType(db *gorm.DB, input LensTypeInput) (*domain.LensType, error) {
	e := &domain.LensType{Name: input.Name, Description: input.Description}
	if err := s.lensTypeRepo.Create(db, e); err != nil {
		return nil, err
	}
	return e, nil
}

func (s *Service) UpdateLensType(db *gorm.DB, id uint, input LensTypeInput) (*domain.LensType, error) {
	e, err := s.lensTypeRepo.GetByID(db, id)
	if err != nil {
		return nil, err
	}
	e.Name = input.Name
	e.Description = input.Description
	if err := s.lensTypeRepo.Update(db, e); err != nil {
		return nil, err
	}
	return s.lensTypeRepo.GetByID(db, id)
}

func (s *Service) DeleteLensType(db *gorm.DB, id uint) error {
	if _, err := s.lensTypeRepo.GetByID(db, id); err != nil {
		return err
	}
	return s.lensTypeRepo.Delete(db, id)
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

func (s *Service) ListMaterials(db *gorm.DB, page, perPage int) (*MaterialListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.materialRepo.List(db, page, perPage)
	if err != nil {
		return nil, err
	}
	return &MaterialListOutput{
		CurrentPage: page, Data: data,
		LastPage: calcLastPage(total, perPage), PerPage: perPage, Total: total,
	}, nil
}

func (s *Service) GetMaterial(db *gorm.DB, id uint) (*domain.Material, error) {
	return s.materialRepo.GetByID(db, id)
}

func (s *Service) CreateMaterial(db *gorm.DB, input MaterialInput) (*domain.Material, error) {
	e := &domain.Material{Name: input.Name, Description: input.Description}
	if err := s.materialRepo.Create(db, e); err != nil {
		return nil, err
	}
	return e, nil
}

func (s *Service) UpdateMaterial(db *gorm.DB, id uint, input MaterialInput) (*domain.Material, error) {
	e, err := s.materialRepo.GetByID(db, id)
	if err != nil {
		return nil, err
	}
	e.Name = input.Name
	e.Description = input.Description
	if err := s.materialRepo.Update(db, e); err != nil {
		return nil, err
	}
	return s.materialRepo.GetByID(db, id)
}

func (s *Service) DeleteMaterial(db *gorm.DB, id uint) error {
	if _, err := s.materialRepo.GetByID(db, id); err != nil {
		return err
	}
	return s.materialRepo.Delete(db, id)
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

func (s *Service) ListLensClasses(db *gorm.DB, page, perPage int) (*LensClassListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.lensClassRepo.List(db, page, perPage)
	if err != nil {
		return nil, err
	}
	return &LensClassListOutput{
		CurrentPage: page, Data: data,
		LastPage: calcLastPage(total, perPage), PerPage: perPage, Total: total,
	}, nil
}

func (s *Service) GetLensClass(db *gorm.DB, id uint) (*domain.LensClass, error) {
	return s.lensClassRepo.GetByID(db, id)
}

func (s *Service) CreateLensClass(db *gorm.DB, input LensClassInput) (*domain.LensClass, error) {
	e := &domain.LensClass{Name: input.Name, Description: input.Description}
	if err := s.lensClassRepo.Create(db, e); err != nil {
		return nil, err
	}
	return e, nil
}

func (s *Service) UpdateLensClass(db *gorm.DB, id uint, input LensClassInput) (*domain.LensClass, error) {
	e, err := s.lensClassRepo.GetByID(db, id)
	if err != nil {
		return nil, err
	}
	e.Name = input.Name
	e.Description = input.Description
	if err := s.lensClassRepo.Update(db, e); err != nil {
		return nil, err
	}
	return s.lensClassRepo.GetByID(db, id)
}

func (s *Service) DeleteLensClass(db *gorm.DB, id uint) error {
	if _, err := s.lensClassRepo.GetByID(db, id); err != nil {
		return err
	}
	return s.lensClassRepo.Delete(db, id)
}

// ---------- Treatment ----------

type TreatmentInput struct {
	Name        string  `json:"name"        binding:"required,max=255"`
	Description *string `json:"description"`
}

type TreatmentListOutput struct {
	CurrentPage int                 `json:"current_page"`
	Data        []*domain.Treatment `json:"data"`
	LastPage    int                 `json:"last_page"`
	PerPage     int                 `json:"per_page"`
	Total       int64               `json:"total"`
}

func (s *Service) ListTreatments(db *gorm.DB, page, perPage int) (*TreatmentListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.treatmentRepo.List(db, page, perPage)
	if err != nil {
		return nil, err
	}
	return &TreatmentListOutput{
		CurrentPage: page, Data: data,
		LastPage: calcLastPage(total, perPage), PerPage: perPage, Total: total,
	}, nil
}

func (s *Service) GetTreatment(db *gorm.DB, id uint) (*domain.Treatment, error) {
	return s.treatmentRepo.GetByID(db, id)
}

func (s *Service) CreateTreatment(db *gorm.DB, input TreatmentInput) (*domain.Treatment, error) {
	e := &domain.Treatment{Name: input.Name, Description: input.Description}
	if err := s.treatmentRepo.Create(db, e); err != nil {
		return nil, err
	}
	return e, nil
}

func (s *Service) UpdateTreatment(db *gorm.DB, id uint, input TreatmentInput) (*domain.Treatment, error) {
	e, err := s.treatmentRepo.GetByID(db, id)
	if err != nil {
		return nil, err
	}
	e.Name = input.Name
	e.Description = input.Description
	if err := s.treatmentRepo.Update(db, e); err != nil {
		return nil, err
	}
	return s.treatmentRepo.GetByID(db, id)
}

func (s *Service) DeleteTreatment(db *gorm.DB, id uint) error {
	if _, err := s.treatmentRepo.GetByID(db, id); err != nil {
		return err
	}
	return s.treatmentRepo.Delete(db, id)
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

func (s *Service) ListPhotochromics(db *gorm.DB, page, perPage int) (*PhotochromicListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.photochromicRepo.List(db, page, perPage)
	if err != nil {
		return nil, err
	}
	return &PhotochromicListOutput{
		CurrentPage: page, Data: data,
		LastPage: calcLastPage(total, perPage), PerPage: perPage, Total: total,
	}, nil
}

func (s *Service) GetPhotochromic(db *gorm.DB, id uint) (*domain.Photochromic, error) {
	return s.photochromicRepo.GetByID(db, id)
}

func (s *Service) CreatePhotochromic(db *gorm.DB, input PhotochromicInput) (*domain.Photochromic, error) {
	e := &domain.Photochromic{Name: input.Name, Description: input.Description}
	if err := s.photochromicRepo.Create(db, e); err != nil {
		return nil, err
	}
	return e, nil
}

func (s *Service) UpdatePhotochromic(db *gorm.DB, id uint, input PhotochromicInput) (*domain.Photochromic, error) {
	e, err := s.photochromicRepo.GetByID(db, id)
	if err != nil {
		return nil, err
	}
	e.Name = input.Name
	e.Description = input.Description
	if err := s.photochromicRepo.Update(db, e); err != nil {
		return nil, err
	}
	return s.photochromicRepo.GetByID(db, id)
}

func (s *Service) DeletePhotochromic(db *gorm.DB, id uint) error {
	if _, err := s.photochromicRepo.GetByID(db, id); err != nil {
		return err
	}
	return s.photochromicRepo.Delete(db, id)
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

func (s *Service) ListPaymentMethods(db *gorm.DB, page, perPage int) (*PaymentMethodListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.paymentMethodRepo.List(db, page, perPage)
	if err != nil {
		return nil, err
	}
	return &PaymentMethodListOutput{
		CurrentPage: page, Data: data,
		LastPage: calcLastPage(total, perPage), PerPage: perPage, Total: total,
	}, nil
}

// ListActivePaymentMethods returns all active payment methods (no pagination, matches Laravel).
func (s *Service) ListActivePaymentMethods(db *gorm.DB) ([]*domain.PaymentMethod, error) {
	return s.paymentMethodRepo.ListActive(db)
}

func (s *Service) GetPaymentMethod(db *gorm.DB, id uint) (*domain.PaymentMethod, error) {
	return s.paymentMethodRepo.GetByID(db, id)
}

func (s *Service) CreatePaymentMethod(db *gorm.DB, input PaymentMethodInput) (*domain.PaymentMethod, error) {
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
	if err := s.paymentMethodRepo.Create(db, e); err != nil {
		return nil, err
	}
	return e, nil
}

func (s *Service) UpdatePaymentMethod(db *gorm.DB, id uint, input PaymentMethodInput) (*domain.PaymentMethod, error) {
	e, err := s.paymentMethodRepo.GetByID(db, id)
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
	if err := s.paymentMethodRepo.Update(db, e); err != nil {
		return nil, err
	}
	return s.paymentMethodRepo.GetByID(db, id)
}

func (s *Service) DeletePaymentMethod(db *gorm.DB, id uint) error {
	if _, err := s.paymentMethodRepo.GetByID(db, id); err != nil {
		return err
	}
	return s.paymentMethodRepo.Delete(db, id)
}
