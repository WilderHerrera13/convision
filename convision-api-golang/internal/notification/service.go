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

// Emit creates an in-app notification addressed to a single recipient user. It is the
// reusable entry point other features call to notify a user (best-effort by the caller).
func (s *Service) Emit(db *gorm.DB, userID uint, kind domain.NotificationKind, title, body, actionURL string) error {
	n := &domain.AdminUserNotification{
		UserID:    userID,
		Title:     title,
		Body:      body,
		Kind:      kind,
		ActionURL: actionURL,
	}
	if err := s.repo.Create(db, n); err != nil {
		s.logger.Error("failed to emit notification", zap.Uint("user_id", userID), zap.String("title", title), zap.Error(err))
		return err
	}
	s.logger.Info("notification emitted", zap.Uint("user_id", userID), zap.String("kind", string(kind)))
	return nil
}

// List returns paginated notifications for the caller (f.UserID must be set).
func (s *Service) List(db *gorm.DB, f domain.NotificationFilter) (*ListOutput, error) {
	f.Clamp()
	data, total, err := s.repo.List(db, f)
	if err != nil {
		return nil, err
	}
	return &ListOutput{Data: data, Total: total, Page: f.Page, PerPage: f.PerPage}, nil
}

// Summary returns unread/total/archived counts for the caller.
func (s *Service) Summary(db *gorm.DB, userID uint) (*domain.NotificationSummary, error) {
	return s.repo.Summary(db, userID)
}

// GetByID returns a single notification owned by the caller.
func (s *Service) GetByID(db *gorm.DB, id uint, userID uint) (*domain.AdminUserNotification, error) {
	return s.repo.GetByID(db, id, userID)
}

// MarkAsRead marks a notification owned by the caller as read.
func (s *Service) MarkAsRead(db *gorm.DB, id uint, userID uint) (*domain.AdminUserNotification, error) {
	if err := s.repo.MarkAsRead(db, id, userID); err != nil {
		return nil, err
	}
	return s.repo.GetByID(db, id, userID)
}

// MarkAsUnread marks a notification owned by the caller as unread.
func (s *Service) MarkAsUnread(db *gorm.DB, id uint, userID uint) (*domain.AdminUserNotification, error) {
	if err := s.repo.MarkAsUnread(db, id, userID); err != nil {
		return nil, err
	}
	return s.repo.GetByID(db, id, userID)
}

// Archive archives a notification owned by the caller.
func (s *Service) Archive(db *gorm.DB, id uint, userID uint) (*domain.AdminUserNotification, error) {
	if err := s.repo.Archive(db, id, userID); err != nil {
		return nil, err
	}
	return s.repo.GetByID(db, id, userID)
}

// Unarchive unarchives a notification owned by the caller.
func (s *Service) Unarchive(db *gorm.DB, id uint, userID uint) (*domain.AdminUserNotification, error) {
	if err := s.repo.Unarchive(db, id, userID); err != nil {
		return nil, err
	}
	return s.repo.GetByID(db, id, userID)
}

// ReadAll marks all of the caller's notifications as read.
func (s *Service) ReadAll(db *gorm.DB, userID uint) error {
	return s.repo.ReadAll(db, userID)
}

// Delete deletes a notification owned by the caller.
func (s *Service) Delete(db *gorm.DB, id uint, userID uint) error {
	return s.repo.Delete(db, id, userID)
}
