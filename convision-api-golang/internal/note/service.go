package note

import (
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// noteableTypeMap maps URL type segments to notable_type DB values.
var noteableTypeMap = map[string]string{
	"lenses":       "products",
	"appointments": "appointments",
}

// Service handles polymorphic note use-cases.
type Service struct {
	repo   domain.NoteRepository
	logger *zap.Logger
}

// NewService creates a new note Service.
func NewService(repo domain.NoteRepository, logger *zap.Logger) *Service {
	return &Service{repo: repo, logger: logger}
}

// CreateInput holds fields for creating a note.
type CreateInput struct {
	Content string `json:"content" binding:"required"`
}

// ListOutput is the paginated list response.
type ListOutput struct {
	Data    []*domain.Note `json:"data"`
	Total   int64          `json:"total"`
	Page    int            `json:"page"`
	PerPage int            `json:"per_page"`
}

// List returns paginated notes for a noteable resource.
func (s *Service) List(db *gorm.DB, urlType string, resourceID uint, page, perPage int) (*ListOutput, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 15
	}
	noteableType, ok := noteableTypeMap[urlType]
	if !ok {
		return nil, &domain.ErrValidation{Message: "tipo de recurso no soportado: " + urlType}
	}
	data, total, err := s.repo.List(db, noteableType, resourceID, page, perPage)
	if err != nil {
		return nil, err
	}
	return &ListOutput{Data: data, Total: total, Page: page, PerPage: perPage}, nil
}

// Create creates a new note.
func (s *Service) Create(db *gorm.DB, urlType string, resourceID uint, input CreateInput, userID uint) (*domain.Note, error) {
	noteableType, ok := noteableTypeMap[urlType]
	if !ok {
		return nil, &domain.ErrValidation{Message: "tipo de recurso no soportado: " + urlType}
	}
	n := &domain.Note{
		Content:      input.Content,
		UserID:       userID,
		NoteableType: noteableType,
		NoteableID:   resourceID,
	}
	if err := s.repo.Create(db, n); err != nil {
		return nil, err
	}
	return n, nil
}
