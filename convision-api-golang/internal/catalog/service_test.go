package catalog_test

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/convision/api/internal/catalog"
	"github.com/convision/api/internal/domain"
)

// mockBrandRepo is an inline function-field mock for domain.BrandRepository.
type mockBrandRepo struct {
	getByIDFn func(id uint) (*domain.Brand, error)
	createFn  func(e *domain.Brand) error
	updateFn  func(e *domain.Brand) error
	deleteFn  func(id uint) error
	listFn    func(page, perPage int) ([]*domain.Brand, int64, error)
}

func (m *mockBrandRepo) GetByID(id uint) (*domain.Brand, error) {
	if m.getByIDFn != nil {
		return m.getByIDFn(id)
	}
	return nil, nil
}

func (m *mockBrandRepo) Create(e *domain.Brand) error {
	if m.createFn != nil {
		return m.createFn(e)
	}
	return nil
}

func (m *mockBrandRepo) Update(e *domain.Brand) error {
	if m.updateFn != nil {
		return m.updateFn(e)
	}
	return nil
}

func (m *mockBrandRepo) Delete(id uint) error {
	if m.deleteFn != nil {
		return m.deleteFn(id)
	}
	return nil
}

func (m *mockBrandRepo) List(page, perPage int) ([]*domain.Brand, int64, error) {
	if m.listFn != nil {
		return m.listFn(page, perPage)
	}
	return []*domain.Brand{}, 0, nil
}

// nullRepo implements all other catalog repositories with nil returns so we can pass them
// without panicking when only Brand methods are exercised.
type nullLensTypeRepo struct{}

func (n *nullLensTypeRepo) GetByID(id uint) (*domain.LensType, error)                    { return nil, nil }
func (n *nullLensTypeRepo) Create(e *domain.LensType) error                              { return nil }
func (n *nullLensTypeRepo) Update(e *domain.LensType) error                              { return nil }
func (n *nullLensTypeRepo) Delete(id uint) error                                         { return nil }
func (n *nullLensTypeRepo) List(page, perPage int) ([]*domain.LensType, int64, error)    { return nil, 0, nil }

type nullMaterialRepo struct{}

func (n *nullMaterialRepo) GetByID(id uint) (*domain.Material, error)                 { return nil, nil }
func (n *nullMaterialRepo) Create(e *domain.Material) error                           { return nil }
func (n *nullMaterialRepo) Update(e *domain.Material) error                           { return nil }
func (n *nullMaterialRepo) Delete(id uint) error                                      { return nil }
func (n *nullMaterialRepo) List(page, perPage int) ([]*domain.Material, int64, error) { return nil, 0, nil }

type nullLensClassRepo struct{}

func (n *nullLensClassRepo) GetByID(id uint) (*domain.LensClass, error)                 { return nil, nil }
func (n *nullLensClassRepo) Create(e *domain.LensClass) error                           { return nil }
func (n *nullLensClassRepo) Update(e *domain.LensClass) error                           { return nil }
func (n *nullLensClassRepo) Delete(id uint) error                                       { return nil }
func (n *nullLensClassRepo) List(page, perPage int) ([]*domain.LensClass, int64, error) { return nil, 0, nil }

type nullTreatmentRepo struct{}

func (n *nullTreatmentRepo) GetByID(id uint) (*domain.Treatment, error)                  { return nil, nil }
func (n *nullTreatmentRepo) Create(e *domain.Treatment) error                            { return nil }
func (n *nullTreatmentRepo) Update(e *domain.Treatment) error                            { return nil }
func (n *nullTreatmentRepo) Delete(id uint) error                                        { return nil }
func (n *nullTreatmentRepo) List(page, perPage int) ([]*domain.Treatment, int64, error)  { return nil, 0, nil }

type nullPhotochromicRepo struct{}

func (n *nullPhotochromicRepo) GetByID(id uint) (*domain.Photochromic, error)                  { return nil, nil }
func (n *nullPhotochromicRepo) Create(e *domain.Photochromic) error                            { return nil }
func (n *nullPhotochromicRepo) Update(e *domain.Photochromic) error                            { return nil }
func (n *nullPhotochromicRepo) Delete(id uint) error                                           { return nil }
func (n *nullPhotochromicRepo) List(page, perPage int) ([]*domain.Photochromic, int64, error)  { return nil, 0, nil }

type nullPaymentMethodRepo struct{}

func (n *nullPaymentMethodRepo) GetByID(id uint) (*domain.PaymentMethod, error)                   { return nil, nil }
func (n *nullPaymentMethodRepo) Create(e *domain.PaymentMethod) error                             { return nil }
func (n *nullPaymentMethodRepo) Update(e *domain.PaymentMethod) error                             { return nil }
func (n *nullPaymentMethodRepo) Delete(id uint) error                                             { return nil }
func (n *nullPaymentMethodRepo) List(page, perPage int) ([]*domain.PaymentMethod, int64, error)   { return nil, 0, nil }
func (n *nullPaymentMethodRepo) ListActive() ([]*domain.PaymentMethod, error)                     { return nil, nil }

func newCatalogSvc(brandRepo domain.BrandRepository) *catalog.Service {
	return catalog.NewService(
		brandRepo,
		&nullLensTypeRepo{},
		&nullMaterialRepo{},
		&nullLensClassRepo{},
		&nullTreatmentRepo{},
		&nullPhotochromicRepo{},
		&nullPaymentMethodRepo{},
		zap.NewNop(),
	)
}

func TestCreateBrand_Success(t *testing.T) {
	brand := &domain.Brand{ID: 1, Name: "Acme"}
	repo := &mockBrandRepo{
		createFn: func(e *domain.Brand) error {
			e.ID = 1
			return nil
		},
	}

	svc := newCatalogSvc(repo)
	b, err := svc.CreateBrand(catalog.BrandInput{Name: "Acme"})

	require.NoError(t, err)
	assert.NotNil(t, b)
	_ = brand
}

func TestCreateBrand_RepoError(t *testing.T) {
	repo := &mockBrandRepo{
		createFn: func(e *domain.Brand) error {
			return errors.New("db error")
		},
	}

	_, err := newCatalogSvc(repo).CreateBrand(catalog.BrandInput{Name: "Fail"})

	require.Error(t, err)
}

func TestGetBrand_NotFound(t *testing.T) {
	repo := &mockBrandRepo{
		getByIDFn: func(id uint) (*domain.Brand, error) {
			return nil, &domain.ErrNotFound{Resource: "brand"}
		},
	}

	_, err := newCatalogSvc(repo).GetBrand(99)

	require.Error(t, err)
	var notFound *domain.ErrNotFound
	assert.True(t, errors.As(err, &notFound))
}

func TestDeleteBrand_NotFound(t *testing.T) {
	repo := &mockBrandRepo{
		getByIDFn: func(id uint) (*domain.Brand, error) {
			return nil, &domain.ErrNotFound{Resource: "brand"}
		},
	}

	err := newCatalogSvc(repo).DeleteBrand(99)

	require.Error(t, err)
	var notFound *domain.ErrNotFound
	assert.True(t, errors.As(err, &notFound))
}
