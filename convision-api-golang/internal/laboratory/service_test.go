package laboratory_test

import (
	"context"
	"io"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/laboratory"
	"github.com/convision/api/internal/testutil/mocks"
)

// mockStorage implements filestore.Storage for testing.
type mockStorage struct {
	storeFn func(ctx context.Context, key string, r io.Reader, size int64, contentType string) (string, error)
}

func (m *mockStorage) Store(ctx context.Context, key string, r io.Reader, size int64, contentType string) (string, error) {
	if m.storeFn != nil {
		return m.storeFn(ctx, key, r, size, contentType)
	}
	return "https://storage.test/file.jpg", nil
}

func newLabSvc(labRepo *mocks.MockLaboratoryRepository, orderRepo *mocks.MockLaboratoryOrderRepository) *laboratory.Service {
	return laboratory.NewService(labRepo, orderRepo, zap.NewNop())
}

func TestCreateLab_Success(t *testing.T) {
	labRepo := &mocks.MockLaboratoryRepository{}
	labRepo.On("Create", mock.Anything).Return(nil)
	labRepo.On("GetByID", uint(0)).Return(&domain.Laboratory{ID: 0, Name: "Lab A"}, nil)

	svc := newLabSvc(labRepo, &mocks.MockLaboratoryOrderRepository{})
	lab, err := svc.CreateLab(laboratory.CreateLabInput{Name: "Lab A"})

	require.NoError(t, err)
	assert.NotNil(t, lab)
	labRepo.AssertExpectations(t)
}

func TestGetLab_NotFound(t *testing.T) {
	labRepo := &mocks.MockLaboratoryRepository{}
	labRepo.On("GetByID", uint(99)).Return(nil, &domain.ErrNotFound{Resource: "laboratory"})

	_, err := newLabSvc(labRepo, &mocks.MockLaboratoryOrderRepository{}).GetLab(99)
	require.Error(t, err)
	labRepo.AssertExpectations(t)
}

func TestCreateOrder_GeneratesStatusEntry(t *testing.T) {
	orderRepo := &mocks.MockLaboratoryOrderRepository{}
	orderRepo.On("Create", mock.Anything).Return(nil)
	orderRepo.On("AddStatusEntry", mock.Anything).Return(nil)
	orderRepo.On("GetByID", uint(0)).Return(&domain.LaboratoryOrder{ID: 1}, nil)

	svc := newLabSvc(&mocks.MockLaboratoryRepository{}, orderRepo)
	o, err := svc.CreateOrder(laboratory.CreateOrderInput{LaboratoryID: 1, PatientID: 2}, 1)

	require.NoError(t, err)
	assert.NotNil(t, o)
	orderRepo.AssertCalled(t, "AddStatusEntry", mock.Anything)
	orderRepo.AssertExpectations(t)
}

func TestUpdateOrderStatus_ValidTransition(t *testing.T) {
	orderRepo := &mocks.MockLaboratoryOrderRepository{}
	orderRepo.On("GetByID", uint(1)).Return(&domain.LaboratoryOrder{ID: 1, Status: "pending"}, nil).Once()
	orderRepo.On("Update", mock.Anything).Return(nil)
	orderRepo.On("AddStatusEntry", mock.Anything).Return(nil)
	orderRepo.On("GetByID", uint(1)).Return(&domain.LaboratoryOrder{ID: 1, Status: "sent_to_lab"}, nil).Once()

	svc := newLabSvc(&mocks.MockLaboratoryRepository{}, orderRepo)
	o, err := svc.UpdateOrderStatus(1, laboratory.UpdateOrderStatusInput{Status: "sent_to_lab"}, 1)

	require.NoError(t, err)
	assert.NotNil(t, o)
	orderRepo.AssertExpectations(t)
}

func TestUploadEvidence_Success(t *testing.T) {
	orderRepo := &mocks.MockLaboratoryOrderRepository{}
	orderRepo.On("GetByID", uint(1)).Return(&domain.LaboratoryOrder{ID: 1}, nil)
	orderRepo.On("GetEvidence", uint(1), "sent_to_lab").Return([]*domain.LaboratoryOrderEvidence{}, nil)
	orderRepo.On("AddEvidence", mock.Anything).Return(nil)

	storage := &mockStorage{}
	svc := newLabSvc(&mocks.MockLaboratoryRepository{}, orderRepo)
	e, err := svc.UploadEvidence(
		context.Background(), 1, "sent_to_lab",
		strings.NewReader("fake-image"), 10, "image/jpeg", "photo.jpg", 1, storage,
	)

	require.NoError(t, err)
	assert.NotNil(t, e)
	orderRepo.AssertExpectations(t)
}

// TestUploadEvidence_ExceedsCapOf4 verifies that uploading a 5th evidence image for a transition is rejected.
func TestUploadEvidence_ExceedsCapOf4(t *testing.T) {
	orderRepo := &mocks.MockLaboratoryOrderRepository{}
	orderRepo.On("GetByID", uint(1)).Return(&domain.LaboratoryOrder{ID: 1}, nil)
	orderRepo.On("GetEvidence", uint(1), "sent_to_lab").Return(
		[]*domain.LaboratoryOrderEvidence{{}, {}, {}, {}},
		nil,
	)

	svc := newLabSvc(&mocks.MockLaboratoryRepository{}, orderRepo)
	_, err := svc.UploadEvidence(
		context.Background(), 1, "sent_to_lab",
		strings.NewReader("fake-image"), 10, "image/jpeg", "photo.jpg", 1, &mockStorage{},
	)

	require.Error(t, err)
	var valErr *domain.ErrValidation
	assert.True(t, assert.ErrorAs(t, err, &valErr))
	assert.Equal(t, "evidence", valErr.Field)
	orderRepo.AssertExpectations(t)
}

func TestUploadEvidence_InvalidContentType(t *testing.T) {
	orderRepo := &mocks.MockLaboratoryOrderRepository{}
	orderRepo.On("GetByID", uint(1)).Return(&domain.LaboratoryOrder{ID: 1}, nil)
	orderRepo.On("GetEvidence", uint(1), "sent_to_lab").Return([]*domain.LaboratoryOrderEvidence{}, nil)

	svc := newLabSvc(&mocks.MockLaboratoryRepository{}, orderRepo)
	_, err := svc.UploadEvidence(
		context.Background(), 1, "sent_to_lab",
		strings.NewReader("data"), 10, "application/pdf", "doc.pdf", 1, &mockStorage{},
	)

	require.Error(t, err)
	var valErr *domain.ErrValidation
	assert.True(t, assert.ErrorAs(t, err, &valErr))
	assert.Equal(t, "file", valErr.Field)
}
