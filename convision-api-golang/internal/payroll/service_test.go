package payroll_test

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/payroll"
	"github.com/convision/api/internal/testutil/mocks"
)

func newPayrollSvc(repo *mocks.MockPayrollRepository) *payroll.Service {
	return payroll.NewService(repo, zap.NewNop())
}

func TestCreate_NetSalaryCalculated(t *testing.T) {
	repo := &mocks.MockPayrollRepository{}
	repo.On("Create", mock.Anything).Return(nil)
	repo.On("GetByID", uint(0)).Return(&domain.Payroll{
		ID:        1,
		NetSalary: 1800.0,
		Status:    "pending",
	}, nil)

	p, err := newPayrollSvc(repo).Create(payroll.CreateInput{
		EmployeeName:           "John Doe",
		EmployeeIdentification: "12345",
		EmployeePosition:       "Technician",
		PayPeriodStart:         "2026-04-01",
		PayPeriodEnd:           "2026-04-30",
		BaseSalary:             2000.0,
		HealthDeduction:        100.0,
		TaxDeduction:           100.0,
	}, nil)

	require.NoError(t, err)
	assert.Equal(t, "pending", p.Status)
	repo.AssertExpectations(t)
}

func TestCreate_RepoError(t *testing.T) {
	repo := &mocks.MockPayrollRepository{}
	repo.On("Create", mock.Anything).Return(errors.New("db error"))

	_, err := newPayrollSvc(repo).Create(payroll.CreateInput{
		EmployeeName:           "Jane Doe",
		EmployeeIdentification: "67890",
		EmployeePosition:       "Manager",
		PayPeriodStart:         "2026-04-01",
		PayPeriodEnd:           "2026-04-30",
		BaseSalary:             3000.0,
	}, nil)

	require.Error(t, err)
	repo.AssertExpectations(t)
}

func TestGetByID_NotFound(t *testing.T) {
	repo := &mocks.MockPayrollRepository{}
	repo.On("GetByID", uint(99)).Return(nil, &domain.ErrNotFound{Resource: "payroll"})

	_, err := newPayrollSvc(repo).GetByID(99)

	require.Error(t, err)
	var notFound *domain.ErrNotFound
	assert.True(t, errors.As(err, &notFound))
	repo.AssertExpectations(t)
}

func TestGetStats_AggregatesByStatus(t *testing.T) {
	repo := &mocks.MockPayrollRepository{}
	repo.On("List", map[string]any{}, 1, 10000).Return(
		[]*domain.Payroll{
			{NetSalary: 1800.0, Status: "paid"},
			{NetSalary: 2000.0, Status: "pending"},
		},
		int64(2),
		nil,
	)

	stats, err := newPayrollSvc(repo).GetStats()

	require.NoError(t, err)
	assert.Equal(t, int64(2), stats.TotalPayrolls)
	assert.Equal(t, 3800.0, stats.TotalNetSalary)
	assert.Equal(t, int64(1), stats.PaidCount)
	assert.Equal(t, int64(1), stats.PendingCount)
	repo.AssertExpectations(t)
}

func TestDelete_NotFound(t *testing.T) {
	repo := &mocks.MockPayrollRepository{}
	repo.On("GetByID", uint(99)).Return(nil, &domain.ErrNotFound{Resource: "payroll"})

	err := newPayrollSvc(repo).Delete(99)

	require.Error(t, err)
	var notFound *domain.ErrNotFound
	assert.True(t, errors.As(err, &notFound))
	repo.AssertExpectations(t)
}
