package notification

import (
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// Service handles admin notification use-cases.
type Service struct {
	repo   domain.NotificationRepository
	logger *zap.Logger
}

// NewService creates a new notification Service.
func NewService(repo domain.NotificationRepository, logger *zap.Logger) *Service {
	return &Service{repo: repo, logger: logger}
}

// ListOutput is the paginated list response.
type ListOutput struct {
	Data    []*domain.AdminUserNotification `json:"data"`
	Total   int64                           `json:"total"`
	Page    int                             `json:"page"`
	PerPage int                             `json:"per_page"`
}

// List returns paginated notifications.
func (s *Service) List(db *gorm.DB, filters map[string]any, page, perPage int) (*ListOutput, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 15
	}
	data, total, err := s.repo.List(db, filters, page, perPage)
	if err != nil {
		return nil, err
	}
	return &ListOutput{Data: data, Total: total, Page: page, PerPage: perPage}, nil
}

// Summary returns unread/total/archived counts.
func (s *Service) Summary(db *gorm.DB) (*domain.NotificationSummary, error) {
	return s.repo.Summary(db)
}

// GetByID returns a single notification.
func (s *Service) GetByID(db *gorm.DB, id uint) (*domain.AdminUserNotification, error) {
	return s.repo.GetByID(db, id)
}

// MarkAsRead marks a notification as read.
func (s *Service) MarkAsRead(db *gorm.DB, id uint) (*domain.AdminUserNotification, error) {
	if err := s.repo.MarkAsRead(db, id); err != nil {
		return nil, err
	}
	return s.repo.GetByID(db, id)
}

// MarkAsUnread marks a notification as unread.
func (s *Service) MarkAsUnread(db *gorm.DB, id uint) (*domain.AdminUserNotification, error) {
	if err := s.repo.MarkAsUnread(db, id); err != nil {
		return nil, err
	}
	return s.repo.GetByID(db, id)
}

// Archive archives a notification.
func (s *Service) Archive(db *gorm.DB, id uint) (*domain.AdminUserNotification, error) {
	if err := s.repo.Archive(db, id); err != nil {
		return nil, err
	}
	return s.repo.GetByID(db, id)
}

// Unarchive unarchives a notification.
func (s *Service) Unarchive(db *gorm.DB, id uint) (*domain.AdminUserNotification, error) {
	if err := s.repo.Unarchive(db, id); err != nil {
		return nil, err
	}
	return s.repo.GetByID(db, id)
}

// ReadAll marks all notifications as read.
func (s *Service) ReadAll(db *gorm.DB) error {
	return s.repo.ReadAll(db)
}

// Delete deletes a notification.
func (s *Service) Delete(db *gorm.DB, id uint) error {
	return s.repo.Delete(db, id)
}
