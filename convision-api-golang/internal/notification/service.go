package notification

import (
	"go.uber.org/zap"

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
func (s *Service) List(filters map[string]any, page, perPage int) (*ListOutput, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 15
	}
	data, total, err := s.repo.List(filters, page, perPage)
	if err != nil {
		return nil, err
	}
	return &ListOutput{Data: data, Total: total, Page: page, PerPage: perPage}, nil
}

// Summary returns unread/total/archived counts.
func (s *Service) Summary() (*domain.NotificationSummary, error) {
	return s.repo.Summary()
}

// GetByID returns a single notification.
func (s *Service) GetByID(id uint) (*domain.AdminUserNotification, error) {
	return s.repo.GetByID(id)
}

// MarkAsRead marks a notification as read.
func (s *Service) MarkAsRead(id uint) (*domain.AdminUserNotification, error) {
	if err := s.repo.MarkAsRead(id); err != nil {
		return nil, err
	}
	return s.repo.GetByID(id)
}

// MarkAsUnread marks a notification as unread.
func (s *Service) MarkAsUnread(id uint) (*domain.AdminUserNotification, error) {
	if err := s.repo.MarkAsUnread(id); err != nil {
		return nil, err
	}
	return s.repo.GetByID(id)
}

// Archive archives a notification.
func (s *Service) Archive(id uint) (*domain.AdminUserNotification, error) {
	if err := s.repo.Archive(id); err != nil {
		return nil, err
	}
	return s.repo.GetByID(id)
}

// Unarchive unarchives a notification.
func (s *Service) Unarchive(id uint) (*domain.AdminUserNotification, error) {
	if err := s.repo.Unarchive(id); err != nil {
		return nil, err
	}
	return s.repo.GetByID(id)
}

// ReadAll marks all notifications as read.
func (s *Service) ReadAll() error {
	return s.repo.ReadAll()
}

// Delete deletes a notification.
func (s *Service) Delete(id uint) error {
	return s.repo.Delete(id)
}
