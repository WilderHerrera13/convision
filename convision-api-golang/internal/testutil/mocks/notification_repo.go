package mocks

import (
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var _ domain.NotificationRepository = (*MockNotificationRepository)(nil)

type MockNotificationRepository struct {
	mock.Mock
}

func (m *MockNotificationRepository) GetByID(db *gorm.DB, id uint, userID uint) (*domain.AdminUserNotification, error) {
	args := m.Called(db, id, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.AdminUserNotification), args.Error(1)
}

func (m *MockNotificationRepository) GetUnreadByUserID(db *gorm.DB, userID uint) ([]*domain.AdminUserNotification, error) {
	args := m.Called(db, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.AdminUserNotification), args.Error(1)
}

func (m *MockNotificationRepository) Create(db *gorm.DB, n *domain.AdminUserNotification) error {
	return m.Called(db, n).Error(0)
}

func (m *MockNotificationRepository) MarkAsRead(db *gorm.DB, id uint, userID uint) error {
	return m.Called(db, id, userID).Error(0)
}

func (m *MockNotificationRepository) MarkAsUnread(db *gorm.DB, id uint, userID uint) error {
	return m.Called(db, id, userID).Error(0)
}

func (m *MockNotificationRepository) Archive(db *gorm.DB, id uint, userID uint) error {
	return m.Called(db, id, userID).Error(0)
}

func (m *MockNotificationRepository) Unarchive(db *gorm.DB, id uint, userID uint) error {
	return m.Called(db, id, userID).Error(0)
}

func (m *MockNotificationRepository) ReadAll(db *gorm.DB, userID uint) error {
	return m.Called(db, userID).Error(0)
}

func (m *MockNotificationRepository) Summary(db *gorm.DB, userID uint) (*domain.NotificationSummary, error) {
	args := m.Called(db, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.NotificationSummary), args.Error(1)
}

func (m *MockNotificationRepository) Delete(db *gorm.DB, id uint, userID uint) error {
	return m.Called(db, id, userID).Error(0)
}

func (m *MockNotificationRepository) List(db *gorm.DB, f domain.NotificationFilter) ([]*domain.AdminUserNotification, int64, error) {
	args := m.Called(db, f)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.AdminUserNotification), args.Get(1).(int64), args.Error(2)
}
