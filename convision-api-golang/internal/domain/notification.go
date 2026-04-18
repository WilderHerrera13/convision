package domain

import "time"

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
	GetByID(id uint) (*AdminUserNotification, error)
	GetUnreadByUserID(userID uint) ([]*AdminUserNotification, error)
	Create(n *AdminUserNotification) error
	MarkAsRead(id uint) error
	MarkAsUnread(id uint) error
	Archive(id uint) error
	Unarchive(id uint) error
	ReadAll() error
	Summary() (*NotificationSummary, error)
	Delete(id uint) error
	List(filters map[string]any, page, perPage int) ([]*AdminUserNotification, int64, error)
}
