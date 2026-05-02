package mocks

import (
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var _ domain.ExpenseRepository = (*MockExpenseRepository)(nil)
var _ domain.PayrollRepository = (*MockPayrollRepository)(nil)
var _ domain.ServiceOrderRepository = (*MockServiceOrderRepository)(nil)

type MockExpenseRepository struct {
	mock.Mock
}

func (m *MockExpenseRepository) GetByID(db *gorm.DB, id uint) (*domain.Expense, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Expense), args.Error(1)
}

func (m *MockExpenseRepository) Create(db *gorm.DB, e *domain.Expense) error {
	return m.Called(db, e).Error(0)
}

func (m *MockExpenseRepository) Update(db *gorm.DB, e *domain.Expense) error {
	return m.Called(db, e).Error(0)
}

func (m *MockExpenseRepository) Delete(db *gorm.DB, id uint) error {
	return m.Called(db, id).Error(0)
}

func (m *MockExpenseRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.Expense, int64, error) {
	args := m.Called(db, filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Expense), args.Get(1).(int64), args.Error(2)
}

type MockPayrollRepository struct {
	mock.Mock
}

func (m *MockPayrollRepository) GetByID(db *gorm.DB, id uint) (*domain.Payroll, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Payroll), args.Error(1)
}

func (m *MockPayrollRepository) Create(db *gorm.DB, p *domain.Payroll) error {
	return m.Called(db, p).Error(0)
}

func (m *MockPayrollRepository) Update(db *gorm.DB, p *domain.Payroll) error {
	return m.Called(db, p).Error(0)
}

func (m *MockPayrollRepository) Delete(db *gorm.DB, id uint) error {
	return m.Called(db, id).Error(0)
}

func (m *MockPayrollRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.Payroll, int64, error) {
	args := m.Called(db, filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Payroll), args.Get(1).(int64), args.Error(2)
}

type MockServiceOrderRepository struct {
	mock.Mock
}

func (m *MockServiceOrderRepository) GetByID(db *gorm.DB, id uint) (*domain.ServiceOrder, error) {
	args := m.Called(db, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ServiceOrder), args.Error(1)
}

func (m *MockServiceOrderRepository) Create(db *gorm.DB, s *domain.ServiceOrder) error {
	return m.Called(db, s).Error(0)
}

func (m *MockServiceOrderRepository) Update(db *gorm.DB, s *domain.ServiceOrder) error {
	return m.Called(db, s).Error(0)
}

func (m *MockServiceOrderRepository) Delete(db *gorm.DB, id uint) error {
	return m.Called(db, id).Error(0)
}

func (m *MockServiceOrderRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.ServiceOrder, int64, error) {
	args := m.Called(db, filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.ServiceOrder), args.Get(1).(int64), args.Error(2)
}
