package serviceorder

import (
	"fmt"
	"math"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// Service handles service order use-cases.
type Service struct {
	repo   domain.ServiceOrderRepository
	logger *zap.Logger
}

// NewService creates a new service order Service.
func NewService(repo domain.ServiceOrderRepository, logger *zap.Logger) *Service {
	return &Service{repo: repo, logger: logger}
}

// CreateInput holds validated fields for creating a service order.
type CreateInput struct {
	SupplierID         *uint   `json:"supplier_id"`
	CustomerName       string  `json:"customer_name"         binding:"required,max=255"`
	CustomerPhone      string  `json:"customer_phone"        binding:"required,max=100"`
	CustomerEmail      string  `json:"customer_email"`
	ServiceType        string  `json:"service_type"          binding:"required,max=150"`
	ProblemDescription string  `json:"problem_description"   binding:"required"`
	EstimatedCost      float64 `json:"estimated_cost"`
	Deadline           string  `json:"deadline"`
	Priority           string  `json:"priority"              binding:"required,oneof=low medium high"`
	Notes              string  `json:"notes"`
}

// UpdateInput holds fields for updating a service order.
type UpdateInput struct {
	SupplierID         *uint    `json:"supplier_id"`
	CustomerName       string   `json:"customer_name"`
	CustomerPhone      string   `json:"customer_phone"`
	CustomerEmail      string   `json:"customer_email"`
	ServiceType        string   `json:"service_type"`
	ProblemDescription string   `json:"problem_description"`
	EstimatedCost      *float64 `json:"estimated_cost"`
	FinalCost          *float64 `json:"final_cost"`
	Deadline           string   `json:"deadline"`
	Priority           string   `json:"priority"`
	Status             string   `json:"status"`
	Notes              string   `json:"notes"`
	Observations       string   `json:"observations"`
}

// StatsOutput holds service order statistics.
type StatsOutput struct {
	Pending    int64 `json:"pending"`
	InProgress int64 `json:"in_progress"`
	Completed  int64 `json:"completed"`
	Delivered  int64 `json:"delivered"`
	Cancelled  int64 `json:"cancelled"`
}

// ListOutput wraps a page of service orders.
type ListOutput struct {
	Data        []*domain.ServiceOrder `json:"data"`
	Total       int64                  `json:"total"`
	CurrentPage int                    `json:"current_page"`
	PerPage     int                    `json:"per_page"`
	LastPage    int                    `json:"last_page"`
}

var orderCounter int

// GetByID returns a single service order.
func (s *Service) GetByID(db *gorm.DB, id uint) (*domain.ServiceOrder, error) {
	return s.repo.GetByID(db, id)
}

// GetStats returns aggregate statistics.
func (s *Service) GetStats(db *gorm.DB) (*StatsOutput, error) {
	data, _, err := s.repo.List(db, map[string]any{}, 1, 10000)
	if err != nil {
		return nil, err
	}
	out := &StatsOutput{}
	for _, o := range data {
		switch o.Status {
		case "pending":
			out.Pending++
		case "in_progress":
			out.InProgress++
		case "completed":
			out.Completed++
		case "delivered":
			out.Delivered++
		case "cancelled":
			out.Cancelled++
		}
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

// Create creates a new service order.
func (s *Service) Create(db *gorm.DB, input CreateInput, createdByUserID *uint) (*domain.ServiceOrder, error) {
	var deadline *time.Time
	if input.Deadline != "" {
		if t, err := time.Parse("2006-01-02", input.Deadline); err == nil {
			deadline = &t
		}
	}

	// Generate order number
	_, total, _ := s.repo.List(db, map[string]any{}, 1, 1)
	orderNum := fmt.Sprintf("SO-%04d", total+1)

	o := &domain.ServiceOrder{
		OrderNumber:           orderNum,
		SupplierID:            input.SupplierID,
		CustomerName:          input.CustomerName,
		CustomerPhone:         input.CustomerPhone,
		CustomerEmail:         input.CustomerEmail,
		ServiceType:           input.ServiceType,
		Description:           input.ProblemDescription,
		EstimatedCost:         input.EstimatedCost,
		EstimatedDeliveryDate: deadline,
		Priority:              input.Priority,
		Status:                "pending",
		Notes:                 input.Notes,
		CreatedByUserID:       createdByUserID,
	}

	if err := s.repo.Create(db, o); err != nil {
		return nil, err
	}
	s.logger.Info("service order created", zap.Uint("id", o.ID))
	return s.repo.GetByID(db, o.ID)
}

// Update updates a service order.
func (s *Service) Update(db *gorm.DB, id uint, input UpdateInput) (*domain.ServiceOrder, error) {
	o, err := s.repo.GetByID(db, id)
	if err != nil {
		return nil, err
	}
	if input.SupplierID != nil {
		o.SupplierID = input.SupplierID
	}
	if input.CustomerName != "" {
		o.CustomerName = input.CustomerName
	}
	if input.CustomerPhone != "" {
		o.CustomerPhone = input.CustomerPhone
	}
	if input.CustomerEmail != "" {
		o.CustomerEmail = input.CustomerEmail
	}
	if input.ServiceType != "" {
		o.ServiceType = input.ServiceType
	}
	if input.ProblemDescription != "" {
		o.Description = input.ProblemDescription
	}
	if input.EstimatedCost != nil {
		o.EstimatedCost = *input.EstimatedCost
	}
	if input.FinalCost != nil {
		o.FinalCost = *input.FinalCost
	}
	if input.Priority != "" {
		o.Priority = input.Priority
	}
	if input.Status != "" {
		o.Status = input.Status
	}
	if input.Notes != "" {
		o.Notes = input.Notes
	}
	if input.Observations != "" {
		o.Observations = input.Observations
	}

	if err := s.repo.Update(db, o); err != nil {
		return nil, err
	}
	return s.repo.GetByID(db, o.ID)
}

// Delete removes a service order.
func (s *Service) Delete(db *gorm.DB, id uint) error {
	if _, err := s.repo.GetByID(db, id); err != nil {
		return err
	}
	return s.repo.Delete(db, id)
}
