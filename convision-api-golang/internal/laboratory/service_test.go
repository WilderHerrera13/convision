package laboratory_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/laboratory"
	"github.com/convision/api/internal/testutil/mocks"
)

func newLabSvc(labRepo *mocks.MockLaboratoryRepository, orderRepo *mocks.MockLaboratoryOrderRepository) *laboratory.Service {
	return laboratory.NewService(labRepo, orderRepo, &mocks.MockLaboratoryOrderCallRepository{}, &mocks.MockLaboratoryOrderEvidenceRepository{}, &mocks.MockSaleRepository{}, zap.NewNop())
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
