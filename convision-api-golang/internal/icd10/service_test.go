package icd10_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap/zaptest"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/icd10"
	"github.com/convision/api/internal/testutil/mocks"
)

func TestList_Success(t *testing.T) {
	repo := new(mocks.MockIcd10CodeRepository)
	logger := zaptest.NewLogger(t)
	svc := icd10.NewService(repo, logger)

	expected := []*domain.Icd10Code{
		{ID: 1, Code: "H520", Description: "Hipermetropía"},
		{ID: 2, Code: "H521", Description: "Miopía"},
	}
	repo.On("List", mock.Anything, mock.AnythingOfType("domain.Icd10CodeFilter")).
		Return(expected, int64(2), nil)

	out, err := svc.List(nil, domain.Icd10CodeFilter{Search: "H52"})

	assert.NoError(t, err)
	assert.Equal(t, int64(2), out.Total)
	assert.Len(t, out.Data, 2)
}

func TestValidateCode_EmptyCode_Passes(t *testing.T) {
	repo := new(mocks.MockIcd10CodeRepository)
	logger := zaptest.NewLogger(t)
	svc := icd10.NewService(repo, logger)

	err := svc.ValidateCode(nil, "")

	assert.NoError(t, err)
	repo.AssertNotCalled(t, "GetByCode", mock.Anything, mock.Anything)
}

func TestValidateCode_ExistingCode_Passes(t *testing.T) {
	repo := new(mocks.MockIcd10CodeRepository)
	logger := zaptest.NewLogger(t)
	svc := icd10.NewService(repo, logger)

	repo.On("GetByCode", mock.Anything, "H520").Return(&domain.Icd10Code{Code: "H520"}, nil)

	err := svc.ValidateCode(nil, "H520")

	assert.NoError(t, err)
}

func TestValidateCode_UnknownCode_ReturnsValidationError(t *testing.T) {
	repo := new(mocks.MockIcd10CodeRepository)
	logger := zaptest.NewLogger(t)
	svc := icd10.NewService(repo, logger)

	repo.On("GetByCode", mock.Anything, "FAKE1").Return(nil, &domain.ErrNotFound{Resource: "icd10_code"})

	err := svc.ValidateCode(nil, "FAKE1")

	var validationErr *domain.ErrValidation
	assert.ErrorAs(t, err, &validationErr)
}
