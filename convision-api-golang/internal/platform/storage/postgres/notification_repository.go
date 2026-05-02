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

func (r *NotificationRepository) GetByID(db *gorm.DB, id uint) (*domain.AdminUserNotification, error) {
	var n domain.AdminUserNotification
	err := db.First(&n, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "notification"}
	}
	return &n, err
}

func (r *NotificationRepository) GetUnreadByUserID(db *gorm.DB, userID uint) ([]*domain.AdminUserNotification, error) {
	var records []*domain.AdminUserNotification
	err := db.Where("read_at IS NULL AND archived_at IS NULL").Find(&records).Error
	return records, err
}

func (r *NotificationRepository) Create(db *gorm.DB, n *domain.AdminUserNotification) error {
	return db.Create(n).Error
}

func (r *NotificationRepository) MarkAsRead(db *gorm.DB, id uint) error {
	now := time.Now()
	return db.Model(&domain.AdminUserNotification{}).Where("id = ?", id).Update("read_at", now).Error
}

func (r *NotificationRepository) MarkAsUnread(db *gorm.DB, id uint) error {
	return db.Model(&domain.AdminUserNotification{}).Where("id = ?", id).Update("read_at", nil).Error
}

func (r *NotificationRepository) Archive(db *gorm.DB, id uint) error {
	now := time.Now()
	return db.Model(&domain.AdminUserNotification{}).Where("id = ?", id).Update("archived_at", now).Error
}

func (r *NotificationRepository) Unarchive(db *gorm.DB, id uint) error {
	return db.Model(&domain.AdminUserNotification{}).Where("id = ?", id).Update("archived_at", nil).Error
}

func (r *NotificationRepository) ReadAll(db *gorm.DB) error {
	now := time.Now()
	return db.Model(&domain.AdminUserNotification{}).Where("read_at IS NULL").Update("read_at", now).Error
}

func (r *NotificationRepository) Summary(db *gorm.DB) (*domain.NotificationSummary, error) {
	var total, unread, archived int64
	db.Model(&domain.AdminUserNotification{}).Count(&total)
	db.Model(&domain.AdminUserNotification{}).Where("read_at IS NULL AND archived_at IS NULL").Count(&unread)
	db.Model(&domain.AdminUserNotification{}).Where("archived_at IS NOT NULL").Count(&archived)
	return &domain.NotificationSummary{Unread: unread, Total: total, Archived: archived}, nil
}

func (r *NotificationRepository) Delete(db *gorm.DB, id uint) error {
	return db.Delete(&domain.AdminUserNotification{}, id).Error
}

func (r *NotificationRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.AdminUserNotification, int64, error) {
	var records []*domain.AdminUserNotification
	var total int64

	q := db.Model(&domain.AdminUserNotification{})

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
