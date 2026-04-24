package clinic_test

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/convision/api/internal/clinic"
	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/testutil/mocks"
)

func newClinicSvc(
	histories *mocks.MockClinicalHistoryRepository,
	evolutions *mocks.MockClinicalEvolutionRepository,
	patients *mocks.MockPatientRepository,
) *clinic.Service {
	return clinic.NewService(histories, evolutions, patients, zap.NewNop())
}

func TestCreate_NewPatient(t *testing.T) {
	histories := &mocks.MockClinicalHistoryRepository{}
	evolutions := &mocks.MockClinicalEvolutionRepository{}
	patients := &mocks.MockPatientRepository{}

	patients.On("GetByID", uint(1)).Return(&domain.Patient{ID: 1}, nil)
	histories.On("Create", mock.Anything).Return(nil)
	histories.On("GetByID", uint(0)).Return(&domain.ClinicalHistory{ID: 1, PatientID: 1}, nil)

	svc := newClinicSvc(histories, evolutions, patients)
	h, err := svc.Create(clinic.CreateInput{PatientID: 1})

	require.NoError(t, err)
	assert.NotNil(t, h)
	patients.AssertExpectations(t)
	histories.AssertExpectations(t)
}

func TestCreate_PatientNotFound(t *testing.T) {
	histories := &mocks.MockClinicalHistoryRepository{}
	evolutions := &mocks.MockClinicalEvolutionRepository{}
	patients := &mocks.MockPatientRepository{}

	patients.On("GetByID", uint(99)).Return(nil, &domain.ErrNotFound{Resource: "patient"})

	_, err := newClinicSvc(histories, evolutions, patients).Create(clinic.CreateInput{PatientID: 99})

	require.Error(t, err)
	var notFound *domain.ErrNotFound
	assert.True(t, errors.As(err, &notFound))
	patients.AssertExpectations(t)
}

func TestGetByPatientIDSingle_NotFound(t *testing.T) {
	histories := &mocks.MockClinicalHistoryRepository{}
	evolutions := &mocks.MockClinicalEvolutionRepository{}
	patients := &mocks.MockPatientRepository{}

	histories.On("GetSingleByPatientID", uint(5)).Return(nil, &domain.ErrNotFound{Resource: "clinical_history"})

	_, err := newClinicSvc(histories, evolutions, patients).GetByPatientIDSingle(5)

	require.Error(t, err)
	var notFound *domain.ErrNotFound
	assert.True(t, errors.As(err, &notFound))
	histories.AssertExpectations(t)
}

func TestCreateEvolution_Success(t *testing.T) {
	histories := &mocks.MockClinicalHistoryRepository{}
	evolutions := &mocks.MockClinicalEvolutionRepository{}
	patients := &mocks.MockPatientRepository{}

	histories.On("GetByID", uint(1)).Return(&domain.ClinicalHistory{ID: 1}, nil)
	evolutions.On("Create", mock.Anything).Return(nil)
	evolutions.On("GetByID", uint(0)).Return(&domain.ClinicalEvolution{ID: 1, ClinicalHistoryID: 1}, nil)

	svc := newClinicSvc(histories, evolutions, patients)
	e, err := svc.CreateEvolution(clinic.CreateEvolutionInput{ClinicalHistoryID: 1})

	require.NoError(t, err)
	assert.NotNil(t, e)
	histories.AssertExpectations(t)
	evolutions.AssertExpectations(t)
}

func TestDeleteEvolution_NotFound(t *testing.T) {
	histories := &mocks.MockClinicalHistoryRepository{}
	evolutions := &mocks.MockClinicalEvolutionRepository{}
	patients := &mocks.MockPatientRepository{}

	evolutions.On("GetByID", uint(99)).Return(nil, &domain.ErrNotFound{Resource: "clinical_evolution"})

	err := newClinicSvc(histories, evolutions, patients).DeleteEvolution(99)

	require.Error(t, err)
	var notFound *domain.ErrNotFound
	assert.True(t, errors.As(err, &notFound))
	evolutions.AssertExpectations(t)
}
