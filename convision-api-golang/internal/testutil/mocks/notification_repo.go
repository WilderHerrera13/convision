package mocks

import (
	"github.com/stretchr/testify/mock"

	"github.com/convision/api/internal/domain"
)

var _ domain.NotificationRepository = (*MockNotificationRepository)(nil)

type MockNotificationRepository struct {
	mock.Mock
}

func (m *MockNotificationRepository) GetByID(id uint) (*domain.AdminUserNotification, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.AdminUserNotification), args.Error(1)
}

func (m *MockNotificationRepository) GetUnreadByUserID(userID uint) ([]*domain.AdminUserNotification, error) {
	args := m.Called(userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.AdminUserNotification), args.Error(1)
}

func (m *MockNotificationRepository) Create(n *domain.AdminUserNotification) error {
	return m.Called(n).Error(0)
}

func (m *MockNotificationRepository) MarkAsRead(id uint) error {
	return m.Called(id).Error(0)
}

func (m *MockNotificationRepository) MarkAsUnread(id uint) error {
	return m.Called(id).Error(0)
}

func (m *MockNotificationRepository) Archive(id uint) error {
	return m.Called(id).Error(0)
}

func (m *MockNotificationRepository) Unarchive(id uint) error {
	return m.Called(id).Error(0)
}

func (m *MockNotificationRepository) ReadAll() error {
	return m.Called().Error(0)
}

func (m *MockNotificationRepository) Summary() (*domain.NotificationSummary, error) {
	args := m.Called()
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.NotificationSummary), args.Error(1)
}

func (m *MockNotificationRepository) Delete(id uint) error {
	return m.Called(id).Error(0)
}

func (m *MockNotificationRepository) List(filters map[string]any, page, perPage int) ([]*domain.AdminUserNotification, int64, error) {
	args := m.Called(filters, page, perPage)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.AdminUserNotification), args.Get(1).(int64), args.Error(2)
}
