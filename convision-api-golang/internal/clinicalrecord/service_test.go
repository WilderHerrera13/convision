package clinicalrecord_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap/zaptest"

	"github.com/convision/api/internal/clinicalrecord"
	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/testutil/mocks"
)

func TestUpsertDiagnosis_ValidPrimaryCode_Succeeds(t *testing.T) {
	recordRepo := new(mocks.MockClinicalRecordRepository)
	icd10Repo := new(mocks.MockIcd10CodeRepository)
	logger := zaptest.NewLogger(t)
	svc := clinicalrecord.NewService(recordRepo, icd10Repo, logger)

	icd10Repo.On("GetByCode", mock.Anything, "H520").Return(&domain.Icd10Code{Code: "H520"}, nil)
	recordRepo.On("UpsertDiagnosis", mock.Anything, uint(1), uint(2), mock.AnythingOfType("*domain.Diagnosis")).Return(nil)

	err := svc.UpsertDiagnosis(nil, 1, 2, clinicalrecord.DiagnosisInput{
		PrimaryCode:        "H520",
		PrimaryDescription: "Hipermetropía",
		DiagnosisType:      1,
	})

	assert.NoError(t, err)
	recordRepo.AssertCalled(t, "UpsertDiagnosis", mock.Anything, uint(1), uint(2), mock.AnythingOfType("*domain.Diagnosis"))
}

func TestUpsertDiagnosis_UnknownPrimaryCode_RejectedBeforePersisting(t *testing.T) {
	recordRepo := new(mocks.MockClinicalRecordRepository)
	icd10Repo := new(mocks.MockIcd10CodeRepository)
	logger := zaptest.NewLogger(t)
	svc := clinicalrecord.NewService(recordRepo, icd10Repo, logger)

	icd10Repo.On("GetByCode", mock.Anything, "FAKE1").Return(nil, &domain.ErrNotFound{Resource: "icd10_code"})

	err := svc.UpsertDiagnosis(nil, 1, 2, clinicalrecord.DiagnosisInput{
		PrimaryCode:        "FAKE1",
		PrimaryDescription: "Código inventado",
		DiagnosisType:      1,
	})

	var validationErr *domain.ErrValidation
	assert.ErrorAs(t, err, &validationErr)
	recordRepo.AssertNotCalled(t, "UpsertDiagnosis", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
}

func TestUpsertDiagnosis_UnknownRelatedCode_RejectedBeforePersisting(t *testing.T) {
	recordRepo := new(mocks.MockClinicalRecordRepository)
	icd10Repo := new(mocks.MockIcd10CodeRepository)
	logger := zaptest.NewLogger(t)
	svc := clinicalrecord.NewService(recordRepo, icd10Repo, logger)

	icd10Repo.On("GetByCode", mock.Anything, "H520").Return(&domain.Icd10Code{Code: "H520"}, nil)
	icd10Repo.On("GetByCode", mock.Anything, "BADCODE").Return(nil, &domain.ErrNotFound{Resource: "icd10_code"})

	err := svc.UpsertDiagnosis(nil, 1, 2, clinicalrecord.DiagnosisInput{
		PrimaryCode:        "H520",
		PrimaryDescription: "Hipermetropía",
		DiagnosisType:      1,
		Related1Code:       "BADCODE",
		Related1Desc:       "Inválido",
	})

	var validationErr *domain.ErrValidation
	assert.ErrorAs(t, err, &validationErr)
	recordRepo.AssertNotCalled(t, "UpsertDiagnosis", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
}

func TestUpsertDiagnosis_EmptyRelatedCodes_AreOptionalAndSkipped(t *testing.T) {
	recordRepo := new(mocks.MockClinicalRecordRepository)
	icd10Repo := new(mocks.MockIcd10CodeRepository)
	logger := zaptest.NewLogger(t)
	svc := clinicalrecord.NewService(recordRepo, icd10Repo, logger)

	icd10Repo.On("GetByCode", mock.Anything, "H400").Return(&domain.Icd10Code{Code: "H400"}, nil)
	recordRepo.On("UpsertDiagnosis", mock.Anything, uint(5), uint(9), mock.AnythingOfType("*domain.Diagnosis")).Return(nil)

	err := svc.UpsertDiagnosis(nil, 5, 9, clinicalrecord.DiagnosisInput{
		PrimaryCode:        "H400",
		PrimaryDescription: "Sospecha de glaucoma",
		DiagnosisType:      1,
	})

	assert.NoError(t, err)
	icd10Repo.AssertNumberOfCalls(t, "GetByCode", 1)
}
