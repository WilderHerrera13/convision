package domain

import (
	"time"

	"gorm.io/gorm"
)

// NotificationKind enumerates the categories of admin notifications.
type NotificationKind string

const (
	NotificationKindSystem      NotificationKind = "system"
	NotificationKindOperational NotificationKind = "operational"
	NotificationKindMessage     NotificationKind = "message"
)

// AdminUserNotification represents an in-app notification sent to an admin user.
type AdminUserNotification struct {
	ID         uint             `json:"id"          gorm:"primaryKey;autoIncrement"`
	UserID     uint             `json:"user_id"     gorm:"not null;index"`
	Title      string           `json:"title"       gorm:"not null"`
	Body       string           `json:"body"        gorm:"type:text"`
	Kind       NotificationKind `json:"kind"        gorm:"type:varchar(20);not null;default:'system'"`
	ActionURL  string           `json:"action_url"`
	ReadAt     *time.Time       `json:"read_at"`
	ArchivedAt *time.Time       `json:"archived_at"`
	CreatedAt  time.Time        `json:"created_at"`
	UpdatedAt  time.Time        `json:"updated_at"`

	User *User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// NotificationSummary holds aggregate counts for admin notifications.
type NotificationSummary struct {
	Unread   int64 `json:"unread"`
	Total    int64 `json:"total"`
	Archived int64 `json:"archived"`
}

// NotificationRepository defines persistence operations for AdminUserNotification.
type NotificationRepository interface {
	GetByID(db *gorm.DB, id uint) (*AdminUserNotification, error)
	GetUnreadByUserID(db *gorm.DB, userID uint) ([]*AdminUserNotification, error)
	Create(db *gorm.DB, n *AdminUserNotification) error
	MarkAsRead(db *gorm.DB, id uint) error
	MarkAsUnread(db *gorm.DB, id uint) error
	Archive(db *gorm.DB, id uint) error
	Unarchive(db *gorm.DB, id uint) error
	ReadAll(db *gorm.DB) error
	Summary(db *gorm.DB) (*NotificationSummary, error)
	Delete(db *gorm.DB, id uint) error
	List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*AdminUserNotification, int64, error)
}
