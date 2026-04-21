package order

import (
	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
	"github.com/google/uuid"
)

// Service handles order use-cases.
type Service struct {
	repo   domain.OrderRepository
	logger *zap.Logger
}

// NewService creates a new order Service.
func NewService(repo domain.OrderRepository, logger *zap.Logger) *Service {
	return &Service{repo: repo, logger: logger}
}

// --- DTOs ---

// ItemInput represents a line item in an order request.
type ItemInput struct {
	ProductID   *uint   `json:"product_id"`
	ProductType string  `json:"product_type"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Quantity    int     `json:"quantity" binding:"min=1"`
	Price       float64 `json:"price"    binding:"min=0"`
	Discount    float64 `json:"discount" binding:"min=0"`
	Notes       string  `json:"notes"`
}

// CreateInput holds validated data for creating an order.
type CreateInput struct {
	PatientID     uint        `json:"patient_id"     binding:"required"`
	AppointmentID *uint       `json:"appointment_id"`
	LaboratoryID  *uint       `json:"laboratory_id"`
	TaxPercentage float64     `json:"tax_percentage"`
	Status        string      `json:"status"`
	PaymentStatus string      `json:"payment_status"`
	Notes         string      `json:"notes"`
	Items         []ItemInput `json:"items"`
}

// UpdateInput holds validated data for updating an order.
type UpdateInput struct {
	PatientID     uint        `json:"patient_id"`
	AppointmentID *uint       `json:"appointment_id"`
	LaboratoryID  *uint       `json:"laboratory_id"`
	TaxPercentage float64     `json:"tax_percentage"`
	Status        string      `json:"status"`
	PaymentStatus string      `json:"payment_status"`
	Notes         string      `json:"notes"`
	Items         []ItemInput `json:"items"`
}

// ListOutput wraps paginated order results.
type ListOutput struct {
	Data        []*domain.Order `json:"data"`
	Total       int64           `json:"total"`
	Page        int             `json:"current_page"`
	PerPage     int             `json:"per_page"`
	LastPage    int             `json:"last_page"`
}

// StatusInput is used for updating order status.
type StatusInput struct {
	Status string `json:"status" binding:"required"`
}

// PaymentStatusInput is used for updating payment status.
type PaymentStatusInput struct {
	PaymentStatus string `json:"payment_status" binding:"required"`
}

// --- Methods ---

func (s *Service) GetByID(id uint) (*domain.Order, error) {
	o, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	changed := false
	if o.PdfToken == "" {
		o.PdfToken = uuid.New().String()
		changed = true
	}
	if o.LaboratoryPdfToken == "" {
		o.LaboratoryPdfToken = uuid.New().String()
		changed = true
	}
	if changed {
		if err := s.repo.Update(o); err != nil {
			return nil, err
		}
		return s.repo.GetByID(id)
	}
	return o, nil
}

func (s *Service) List(filters map[string]any, page, perPage int) (*ListOutput, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 15
	}

	data, total, err := s.repo.List(filters, page, perPage)
	if err != nil {
		return nil, err
	}

	lastPage := 1
	if perPage > 0 && total > 0 {
		lastPage = int((total + int64(perPage) - 1) / int64(perPage))
	}

	return &ListOutput{
		Data:     data,
		Total:    total,
		Page:     page,
		PerPage:  perPage,
		LastPage: lastPage,
	}, nil
}

func (s *Service) Create(input CreateInput, userID uint) (*domain.Order, error) {
	validStatuses := map[string]bool{"pending": true, "in_progress": true, "completed": true, "cancelled": true}
	status := input.Status
	if status == "" {
		status = "pending"
	} else if !validStatuses[status] {
		return nil, &domain.ErrValidation{Field: "status", Message: "invalid status"}
	}

	paymentStatus := input.PaymentStatus
	if paymentStatus == "" {
		paymentStatus = "pending"
	}

	// Build items
	items := make([]domain.OrderItem, 0, len(input.Items))
	var subtotal float64
	for _, it := range input.Items {
		qty := it.Quantity
		if qty < 1 {
			qty = 1
		}
		total := (it.Price - it.Discount) * float64(qty)
		items = append(items, domain.OrderItem{
			ProductID:   it.ProductID,
			ProductType: it.ProductType,
			Name:        it.Name,
			Description: it.Description,
			Quantity:    qty,
			Price:       it.Price,
			Discount:    it.Discount,
			Total:       total,
			Notes:       it.Notes,
		})
		subtotal += total
	}

	taxPct := input.TaxPercentage
	tax := subtotal * taxPct / 100
	total := subtotal + tax

	o := &domain.Order{
		PatientID:           input.PatientID,
		AppointmentID:       input.AppointmentID,
		LaboratoryID:        input.LaboratoryID,
		Subtotal:            subtotal,
		Tax:                 tax,
		Total:               total,
		Status:              domain.OrderStatus(status),
		PaymentStatus:       paymentStatus,
		Notes:               input.Notes,
		CreatedBy:           &userID,
		Items:               items,
		PdfToken:            uuid.New().String(),
		LaboratoryPdfToken:  uuid.New().String(),
	}

	if err := s.repo.Create(o); err != nil {
		return nil, err
	}

	s.logger.Info("order created", zap.Uint("id", o.ID), zap.String("order_number", o.OrderNumber))
	return s.repo.GetByID(o.ID)
}

func (s *Service) Update(id uint, input UpdateInput) (*domain.Order, error) {
	o, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}

	if input.PatientID != 0 {
		o.PatientID = input.PatientID
	}
	if input.AppointmentID != nil {
		o.AppointmentID = input.AppointmentID
	}
	if input.LaboratoryID != nil {
		o.LaboratoryID = input.LaboratoryID
	}
	if input.Status != "" {
		o.Status = domain.OrderStatus(input.Status)
	}
	if input.PaymentStatus != "" {
		o.PaymentStatus = input.PaymentStatus
	}
	if input.Notes != "" {
		o.Notes = input.Notes
	}

	if err := s.repo.Update(o); err != nil {
		return nil, err
	}
	return s.repo.GetByID(id)
}

func (s *Service) UpdateStatus(id uint, input StatusInput) (*domain.Order, error) {
	o, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}

	o.Status = domain.OrderStatus(input.Status)
	if err := s.repo.Update(o); err != nil {
		return nil, err
	}
	return s.repo.GetByID(id)
}

func (s *Service) UpdatePaymentStatus(id uint, input PaymentStatusInput) (*domain.Order, error) {
	o, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}

	o.PaymentStatus = input.PaymentStatus
	if err := s.repo.Update(o); err != nil {
		return nil, err
	}
	return s.repo.GetByID(id)
}

func (s *Service) Delete(id uint) error {
	_, err := s.repo.GetByID(id)
	if err != nil {
		return err
	}
	return s.repo.Delete(id)
}
