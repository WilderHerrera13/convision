package cash

import (
	"fmt"
	"math"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// Service handles cash transfer use-cases.
type Service struct {
	repo   domain.CashTransferRepository
	logger *zap.Logger
}

// NewService creates a new cash Service.
func NewService(repo domain.CashTransferRepository, logger *zap.Logger) *Service {
	return &Service{repo: repo, logger: logger}
}

// CreateInput holds validated fields for creating a cash transfer.
type CreateInput struct {
	OriginType             string  `json:"origin_type"              binding:"required"`
	OriginDescription      string  `json:"origin_description"       binding:"required"`
	DestinationType        string  `json:"destination_type"         binding:"required"`
	DestinationDescription string  `json:"destination_description"  binding:"required"`
	Amount                 float64 `json:"amount"                   binding:"required,min=0.01"`
	Reason                 string  `json:"reason"                   binding:"required"`
	Notes                  string  `json:"notes"`
}

// UpdateInput holds fields for updating a cash transfer.
type UpdateInput struct {
	OriginType             string   `json:"origin_type"`
	OriginDescription      string   `json:"origin_description"`
	DestinationType        string   `json:"destination_type"`
	DestinationDescription string   `json:"destination_description"`
	Amount                 *float64 `json:"amount"`
	Reason                 string   `json:"reason"`
	Notes                  string   `json:"notes"`
}

// ApproveInput holds data for approving a cash transfer.
type ApproveInput struct {
	Notes string `json:"notes"`
}

// CancelInput holds data for cancelling a cash transfer.
type CancelInput struct {
	Notes string `json:"notes"`
}

// StatsOutput holds cash transfer statistics.
type StatsOutput struct {
	Pending     int64   `json:"pending"`
	Approved    int64   `json:"approved"`
	Cancelled   int64   `json:"cancelled"`
	TotalAmount float64 `json:"total_amount"`
}

// ListOutput wraps a page of cash transfers.
type ListOutput struct {
	Data        []*domain.CashTransfer `json:"data"`
	Total       int64                  `json:"total"`
	CurrentPage int                    `json:"current_page"`
	PerPage     int                    `json:"per_page"`
	LastPage    int                    `json:"last_page"`
}

// GetByID returns a single cash transfer.
func (s *Service) GetByID(db *gorm.DB, id uint) (*domain.CashTransfer, error) {
	return s.repo.GetByID(db, id)
}

// GetStats returns aggregate statistics.
func (s *Service) GetStats(db *gorm.DB) (*StatsOutput, error) {
	data, _, err := s.repo.List(db, map[string]any{}, 1, 10000)
	if err != nil {
		return nil, err
	}
	out := &StatsOutput{}
	for _, t := range data {
		switch t.Status {
		case "pending":
			out.Pending++
		case "approved":
			out.Approved++
		case "cancelled":
			out.Cancelled++
		}
		out.TotalAmount += t.Amount
	}
	return out, nil
}

// List returns a paginated list.
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
	lastPage := 1
	if total > 0 {
		lastPage = int(math.Ceil(float64(total) / float64(perPage)))
	}
	return &ListOutput{Data: data, Total: total, CurrentPage: page, PerPage: perPage, LastPage: lastPage}, nil
}

// Create creates a new cash transfer.
func (s *Service) Create(db *gorm.DB, input CreateInput, createdByUserID *uint) (*domain.CashTransfer, error) {
	_, total, _ := s.repo.List(db, map[string]any{}, 1, 1)
	transferNum := fmt.Sprintf("CT-%04d", total+1)
	now := time.Now()

	t := &domain.CashTransfer{
		TransferNumber:         transferNum,
		OriginType:             input.OriginType,
		OriginDescription:      input.OriginDescription,
		DestinationType:        input.DestinationType,
		DestinationDescription: input.DestinationDescription,
		Type:                   domain.CashTransferTypeInternal,
		FromAccount:            input.OriginType + ": " + input.OriginDescription,
		ToAccount:              input.DestinationType + ": " + input.DestinationDescription,
		Amount:                 input.Amount,
		TransferDate:           &now,
		Concept:                input.Reason,
		Description:            input.Notes,
		Status:                 "pending",
		CreatedByUserID:        createdByUserID,
	}

	if err := s.repo.Create(db, t); err != nil {
		return nil, err
	}
	s.logger.Info("cash transfer created", zap.Uint("id", t.ID))
	return s.repo.GetByID(db, t.ID)
}

// Update updates a cash transfer.
func (s *Service) Update(db *gorm.DB, id uint, input UpdateInput) (*domain.CashTransfer, error) {
	t, err := s.repo.GetByID(db, id)
	if err != nil {
		return nil, err
	}
	if input.Amount != nil {
		t.Amount = *input.Amount
	}
	if input.Reason != "" {
		t.Concept = input.Reason
	}
	if input.Notes != "" {
		t.Description = input.Notes
	}
	if err := s.repo.Update(db, t); err != nil {
		return nil, err
	}
	return s.repo.GetByID(db, t.ID)
}

// Approve approves a cash transfer.
func (s *Service) Approve(db *gorm.DB, id uint, approvedByUserID *uint, input ApproveInput) (*domain.CashTransfer, error) {
	t, err := s.repo.GetByID(db, id)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	t.Status = "approved"
	t.ApprovedByUserID = approvedByUserID
	t.ApprovedAt = &now
	if input.Notes != "" {
		t.Notes = input.Notes
	}
	if err := s.repo.Update(db, t); err != nil {
		return nil, err
	}
	return s.repo.GetByID(db, t.ID)
}

// Cancel cancels a cash transfer.
func (s *Service) Cancel(db *gorm.DB, id uint, input CancelInput) (*domain.CashTransfer, error) {
	t, err := s.repo.GetByID(db, id)
	if err != nil {
		return nil, err
	}
	t.Status = "cancelled"
	if input.Notes != "" {
		t.Notes = input.Notes
	}
	if err := s.repo.Update(db, t); err != nil {
		return nil, err
	}
	return s.repo.GetByID(db, t.ID)
}

// Delete removes a cash transfer.
func (s *Service) Delete(db *gorm.DB, id uint) error {
	if _, err := s.repo.GetByID(db, id); err != nil {
		return err
	}
	return s.repo.Delete(db, id)
}
