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

// NotificationFilter holds query parameters for listing user notifications.
// UserID is injected server-side from the JWT claims so a caller only ever sees
// notifications addressed to them.
type NotificationFilter struct {
	Pagination
	UserID   *uint `form:"-"`
	Archived *bool `form:"archived"`
	Unread   *bool `form:"unread"`
}

// NotificationRepository defines persistence operations for AdminUserNotification.
// Mutations and reads that resolve a single recipient take userID and scope/verify
// ownership so one user can never read or mutate another user's notifications.
type NotificationRepository interface {
	GetByID(db *gorm.DB, id uint, userID uint) (*AdminUserNotification, error)
	GetUnreadByUserID(db *gorm.DB, userID uint) ([]*AdminUserNotification, error)
	Create(db *gorm.DB, n *AdminUserNotification) error
	MarkAsRead(db *gorm.DB, id uint, userID uint) error
	MarkAsUnread(db *gorm.DB, id uint, userID uint) error
	Archive(db *gorm.DB, id uint, userID uint) error
	Unarchive(db *gorm.DB, id uint, userID uint) error
	ReadAll(db *gorm.DB, userID uint) error
	Summary(db *gorm.DB, userID uint) (*NotificationSummary, error)
	Delete(db *gorm.DB, id uint, userID uint) error
	List(db *gorm.DB, f NotificationFilter) ([]*AdminUserNotification, int64, error)
}
