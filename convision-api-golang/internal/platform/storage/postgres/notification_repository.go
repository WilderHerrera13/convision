package postgres

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// NotificationRepository implements domain.NotificationRepository using GORM/PostgreSQL.
type NotificationRepository struct{}

// NewNotificationRepository creates a new NotificationRepository.
func NewNotificationRepository() *NotificationRepository {
	return &NotificationRepository{}
}

func (r *NotificationRepository) GetByID(db *gorm.DB, id uint, userID uint) (*domain.AdminUserNotification, error) {
	var n domain.AdminUserNotification
	err := db.Where("user_id = ?", userID).First(&n, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "notification"}
	}
	return &n, err
}

func (r *NotificationRepository) GetUnreadByUserID(db *gorm.DB, userID uint) ([]*domain.AdminUserNotification, error) {
	var records []*domain.AdminUserNotification
	err := db.Where("user_id = ? AND read_at IS NULL AND archived_at IS NULL", userID).Find(&records).Error
	return records, err
}

func (r *NotificationRepository) Create(db *gorm.DB, n *domain.AdminUserNotification) error {
	return db.Create(n).Error
}

func (r *NotificationRepository) MarkAsRead(db *gorm.DB, id uint, userID uint) error {
	now := time.Now()
	return db.Model(&domain.AdminUserNotification{}).Where("id = ? AND user_id = ?", id, userID).Update("read_at", now).Error
}

func (r *NotificationRepository) MarkAsUnread(db *gorm.DB, id uint, userID uint) error {
	return db.Model(&domain.AdminUserNotification{}).Where("id = ? AND user_id = ?", id, userID).Update("read_at", nil).Error
}

func (r *NotificationRepository) Archive(db *gorm.DB, id uint, userID uint) error {
	now := time.Now()
	return db.Model(&domain.AdminUserNotification{}).Where("id = ? AND user_id = ?", id, userID).Update("archived_at", now).Error
}

func (r *NotificationRepository) Unarchive(db *gorm.DB, id uint, userID uint) error {
	return db.Model(&domain.AdminUserNotification{}).Where("id = ? AND user_id = ?", id, userID).Update("archived_at", nil).Error
}

func (r *NotificationRepository) ReadAll(db *gorm.DB, userID uint) error {
	now := time.Now()
	return db.Model(&domain.AdminUserNotification{}).Where("user_id = ? AND read_at IS NULL", userID).Update("read_at", now).Error
}

func (r *NotificationRepository) Summary(db *gorm.DB, userID uint) (*domain.NotificationSummary, error) {
	var total, unread, archived int64
	db.Model(&domain.AdminUserNotification{}).Where("user_id = ?", userID).Count(&total)
	db.Model(&domain.AdminUserNotification{}).Where("user_id = ? AND read_at IS NULL AND archived_at IS NULL", userID).Count(&unread)
	db.Model(&domain.AdminUserNotification{}).Where("user_id = ? AND archived_at IS NOT NULL", userID).Count(&archived)
	return &domain.NotificationSummary{Unread: unread, Total: total, Archived: archived}, nil
}

func (r *NotificationRepository) Delete(db *gorm.DB, id uint, userID uint) error {
	return db.Where("user_id = ?", userID).Delete(&domain.AdminUserNotification{}, id).Error
}

func (r *NotificationRepository) List(db *gorm.DB, f domain.NotificationFilter) ([]*domain.AdminUserNotification, int64, error) {
	f.Clamp()
	var records []*domain.AdminUserNotification
	var total int64

	q := db.Model(&domain.AdminUserNotification{})
	if f.UserID != nil {
		q = q.Where("user_id = ?", *f.UserID)
	}

	switch {
	case f.Archived != nil && *f.Archived:
		q = q.Where("archived_at IS NOT NULL")
	case f.Unread != nil && *f.Unread:
		q = q.Where("read_at IS NULL AND archived_at IS NULL")
	default:
		q = q.Where("archived_at IS NULL")
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := q.Order("created_at DESC").Offset(f.Offset()).Limit(f.PerPage).Find(&records).Error
	return records, total, err
}
