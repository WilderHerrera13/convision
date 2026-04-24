package mocks

import (
	"github.com/stretchr/testify/mock"

	"github.com/convision/api/internal/domain"
)

var _ domain.ExpenseRepository = (*MockExpenseRepository)(nil)
var _ domain.PayrollRepository = (*MockPayrollRepository)(nil)
var _ domain.ServiceOrderRepository = (*MockServiceOrderRepository)(nil)

type MockExpenseRepository struct {
	mock.Mock
}

func (m *MockExpenseRepository) GetByID(id uint) (*domain.Expense, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Expense), args.Error(1)
}

func (m *MockExpenseRepository) Create(e *domain.Expense) error {
	return m.Called(e).Error(0)
}

func (m *MockExpenseRepository) Update(e *domain.Expense) error {
	return m.Called(e).Error(0)
}

func (m *MockExpenseRepository) Delete(id uint) error {
	return m.Called(id).Error(0)
}

func (m *MockExpenseRepository) List(filters map[string]any, page, perPage int) ([]*domain.Expense, int64, error) {
	args := m.Called(filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Expense), args.Get(1).(int64), args.Error(2)
}

type MockPayrollRepository struct {
	mock.Mock
}

func (m *MockPayrollRepository) GetByID(id uint) (*domain.Payroll, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Payroll), args.Error(1)
}

func (m *MockPayrollRepository) Create(p *domain.Payroll) error {
	return m.Called(p).Error(0)
}

func (m *MockPayrollRepository) Update(p *domain.Payroll) error {
	return m.Called(p).Error(0)
}

func (m *MockPayrollRepository) Delete(id uint) error {
	return m.Called(id).Error(0)
}

func (m *MockPayrollRepository) List(filters map[string]any, page, perPage int) ([]*domain.Payroll, int64, error) {
	args := m.Called(filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Payroll), args.Get(1).(int64), args.Error(2)
}

type MockServiceOrderRepository struct {
	mock.Mock
}

func (m *MockServiceOrderRepository) GetByID(id uint) (*domain.ServiceOrder, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ServiceOrder), args.Error(1)
}

func (m *MockServiceOrderRepository) Create(s *domain.ServiceOrder) error {
	return m.Called(s).Error(0)
}

func (m *MockServiceOrderRepository) Update(s *domain.ServiceOrder) error {
	return m.Called(s).Error(0)
}

func (m *MockServiceOrderRepository) Delete(id uint) error {
	return m.Called(id).Error(0)
}

func (m *MockServiceOrderRepository) List(filters map[string]any, page, perPage int) ([]*domain.ServiceOrder, int64, error) {
	args := m.Called(filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.ServiceOrder), args.Get(1).(int64), args.Error(2)
}
