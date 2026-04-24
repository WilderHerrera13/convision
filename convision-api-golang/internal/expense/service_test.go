package expense_test

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/expense"
	"github.com/convision/api/internal/testutil/mocks"
)

func newExpenseSvc(repo *mocks.MockExpenseRepository) *expense.Service {
	return expense.NewService(repo, zap.NewNop())
}

func TestCreate_Success(t *testing.T) {
	repo := &mocks.MockExpenseRepository{}
	repo.On("Create", mock.Anything).Return(nil)
	repo.On("GetByID", uint(0)).Return(&domain.Expense{ID: 1, Concept: "Office supplies", Status: "pending"}, nil)

	svc := newExpenseSvc(repo)
	e, err := svc.Create(expense.CreateInput{
		InvoiceNumber: "INV-001",
		Concept:       "Office supplies",
		ExpenseDate:   "2026-04-24",
		Amount:        100.0,
	}, nil)

	require.NoError(t, err)
	assert.Equal(t, "Office supplies", e.Concept)
	repo.AssertExpectations(t)
}

func TestCreate_RepoError(t *testing.T) {
	repo := &mocks.MockExpenseRepository{}
	repo.On("Create", mock.Anything).Return(errors.New("db error"))

	_, err := newExpenseSvc(repo).Create(expense.CreateInput{
		InvoiceNumber: "INV-002",
		Concept:       "Rent",
		ExpenseDate:   "2026-04-24",
		Amount:        500.0,
	}, nil)

	require.Error(t, err)
	repo.AssertExpectations(t)
}

func TestCreate_InvalidDate(t *testing.T) {
	repo := &mocks.MockExpenseRepository{}

	_, err := newExpenseSvc(repo).Create(expense.CreateInput{
		InvoiceNumber: "INV-003",
		Concept:       "Rent",
		ExpenseDate:   "not-a-date",
		Amount:        500.0,
	}, nil)

	require.Error(t, err)
	var valErr *domain.ErrValidation
	assert.True(t, errors.As(err, &valErr))
	assert.Equal(t, "expense_date", valErr.Field)
}

func TestGetByID_NotFound(t *testing.T) {
	repo := &mocks.MockExpenseRepository{}
	repo.On("GetByID", uint(99)).Return(nil, &domain.ErrNotFound{Resource: "expense"})

	_, err := newExpenseSvc(repo).GetByID(99)

	require.Error(t, err)
	var notFound *domain.ErrNotFound
	assert.True(t, errors.As(err, &notFound))
	repo.AssertExpectations(t)
}

func TestGetStats_ReturnsAggregation(t *testing.T) {
	repo := &mocks.MockExpenseRepository{}
	repo.On("List", map[string]any{}, 1, 10000).Return(
		[]*domain.Expense{
			{Amount: 100.0, Status: "paid"},
			{Amount: 200.0, Status: "pending"},
			{Amount: 50.0, Status: "paid"},
		},
		int64(3),
		nil,
	)

	stats, err := newExpenseSvc(repo).GetStats()

	require.NoError(t, err)
	assert.Equal(t, int64(3), stats.Count)
	assert.Equal(t, 350.0, stats.TotalExpenses)
	assert.Equal(t, 150.0, stats.Paid)
	assert.Equal(t, 200.0, stats.Pending)
	repo.AssertExpectations(t)
}

func TestList_Paginated(t *testing.T) {
	repo := &mocks.MockExpenseRepository{}
	repo.On("List", map[string]any{}, 1, 15).Return(
		[]*domain.Expense{{ID: 1}, {ID: 2}},
		int64(2),
		nil,
	)

	out, err := newExpenseSvc(repo).List(map[string]any{}, 1, 15)

	require.NoError(t, err)
	assert.Len(t, out.Data, 2)
	assert.Equal(t, int64(2), out.Total)
	repo.AssertExpectations(t)
}

func TestDelete_NotFound(t *testing.T) {
	repo := &mocks.MockExpenseRepository{}
	repo.On("GetByID", uint(99)).Return(nil, &domain.ErrNotFound{Resource: "expense"})

	err := newExpenseSvc(repo).Delete(99)

	require.Error(t, err)
	var notFound *domain.ErrNotFound
	assert.True(t, errors.As(err, &notFound))
	repo.AssertExpectations(t)
}
