package mysql

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// NotificationRepository implements domain.NotificationRepository using GORM/PostgreSQL.
type NotificationRepository struct {
	db *gorm.DB
}

// NewNotificationRepository creates a new NotificationRepository.
func NewNotificationRepository(db *gorm.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

func (r *NotificationRepository) GetByID(id uint) (*domain.AdminUserNotification, error) {
	var n domain.AdminUserNotification
	err := r.db.First(&n, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "notification"}
	}
	return &n, err
}

func (r *NotificationRepository) GetUnreadByUserID(userID uint) ([]*domain.AdminUserNotification, error) {
	var records []*domain.AdminUserNotification
	err := r.db.Where("read_at IS NULL AND archived_at IS NULL").Find(&records).Error
	return records, err
}

func (r *NotificationRepository) Create(n *domain.AdminUserNotification) error {
	return r.db.Create(n).Error
}

func (r *NotificationRepository) MarkAsRead(id uint) error {
	now := time.Now()
	return r.db.Model(&domain.AdminUserNotification{}).Where("id = ?", id).Update("read_at", now).Error
}

func (r *NotificationRepository) MarkAsUnread(id uint) error {
	return r.db.Model(&domain.AdminUserNotification{}).Where("id = ?", id).Update("read_at", nil).Error
}

func (r *NotificationRepository) Archive(id uint) error {
	now := time.Now()
	return r.db.Model(&domain.AdminUserNotification{}).Where("id = ?", id).Update("archived_at", now).Error
}

func (r *NotificationRepository) Unarchive(id uint) error {
	return r.db.Model(&domain.AdminUserNotification{}).Where("id = ?", id).Update("archived_at", nil).Error
}

func (r *NotificationRepository) ReadAll() error {
	now := time.Now()
	return r.db.Model(&domain.AdminUserNotification{}).Where("read_at IS NULL").Update("read_at", now).Error
}

func (r *NotificationRepository) Summary() (*domain.NotificationSummary, error) {
	var total, unread, archived int64
	r.db.Model(&domain.AdminUserNotification{}).Count(&total)
	r.db.Model(&domain.AdminUserNotification{}).Where("read_at IS NULL AND archived_at IS NULL").Count(&unread)
	r.db.Model(&domain.AdminUserNotification{}).Where("archived_at IS NOT NULL").Count(&archived)
	return &domain.NotificationSummary{Unread: unread, Total: total, Archived: archived}, nil
}

func (r *NotificationRepository) Delete(id uint) error {
	return r.db.Delete(&domain.AdminUserNotification{}, id).Error
}

func (r *NotificationRepository) List(filters map[string]any, page, perPage int) ([]*domain.AdminUserNotification, int64, error) {
	var records []*domain.AdminUserNotification
	var total int64

	q := r.db.Model(&domain.AdminUserNotification{})

	if archived, ok := filters["archived"]; ok && archived == "1" {
		q = q.Where("archived_at IS NOT NULL")
	} else if unread, ok := filters["unread"]; ok && unread == "1" {
		q = q.Where("read_at IS NULL AND archived_at IS NULL")
	} else {
		q = q.Where("archived_at IS NULL")
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * perPage
	err := q.Order("created_at DESC").Offset(offset).Limit(perPage).Find(&records).Error
	return records, total, err
}
