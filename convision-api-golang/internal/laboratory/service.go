package laboratory

import (
	"time"

	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
)

// Service handles laboratory and laboratory order use-cases.
type Service struct {
	labRepo   domain.LaboratoryRepository
	orderRepo domain.LaboratoryOrderRepository
	logger    *zap.Logger
}

// NewService creates a new laboratory Service.
func NewService(
	labRepo domain.LaboratoryRepository,
	orderRepo domain.LaboratoryOrderRepository,
	logger *zap.Logger,
) *Service {
	return &Service{labRepo: labRepo, orderRepo: orderRepo, logger: logger}
}

// --- Laboratory DTOs ---

type CreateLabInput struct {
	Name          string `json:"name"           binding:"required,max=255"`
	ContactPerson string `json:"contact_person"`
	Email         string `json:"email"`
	Phone         string `json:"phone"`
	Address       string `json:"address"`
	Status        string `json:"status"`
	Notes         string `json:"notes"`
}

type UpdateLabInput struct {
	Name          string `json:"name"`
	ContactPerson string `json:"contact_person"`
	Email         string `json:"email"`
	Phone         string `json:"phone"`
	Address       string `json:"address"`
	Status        string `json:"status"`
	Notes         string `json:"notes"`
}

type LabListOutput struct {
	Data     []*domain.Laboratory `json:"data"`
	Total    int64                `json:"total"`
	Page     int                  `json:"current_page"`
	PerPage  int                  `json:"per_page"`
	LastPage int                  `json:"last_page"`
}

// --- Laboratory Order DTOs ---

type CreateOrderInput struct {
	OrderID                 *uint   `json:"order_id"`
	SaleID                  *uint   `json:"sale_id"`
	LaboratoryID            uint    `json:"laboratory_id" binding:"required"`
	PatientID               uint    `json:"patient_id"    binding:"required"`
	Status                  string  `json:"status"`
	Priority                string  `json:"priority"`
	EstimatedCompletionDate *string `json:"estimated_completion_date"`
	Notes                   string  `json:"notes"`
}

type UpdateOrderInput struct {
	OrderID                 *uint   `json:"order_id"`
	SaleID                  *uint   `json:"sale_id"`
	LaboratoryID            *uint   `json:"laboratory_id"`
	PatientID               *uint   `json:"patient_id"`
	Status                  string  `json:"status"`
	Priority                string  `json:"priority"`
	EstimatedCompletionDate *string `json:"estimated_completion_date"`
	Notes                   string  `json:"notes"`
}

type UpdateOrderStatusInput struct {
	Status string `json:"status" binding:"required,oneof=pending in_process sent_to_lab ready_for_delivery delivered cancelled"`
	Notes  string `json:"notes"`
}

type OrderListOutput struct {
	Data     []*domain.LaboratoryOrder `json:"data"`
	Total    int64                     `json:"total"`
	Page     int                       `json:"current_page"`
	PerPage  int                       `json:"per_page"`
	LastPage int                       `json:"last_page"`
}

// --- Laboratory Methods ---

func (s *Service) GetLab(id uint) (*domain.Laboratory, error) {
	return s.labRepo.GetByID(id)
}

func (s *Service) ListLabs(filters map[string]any, page, perPage int) (*LabListOutput, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 15
	}

	data, total, err := s.labRepo.List(filters, page, perPage)
	if err != nil {
		return nil, err
	}

	lastPage := 1
	if perPage > 0 && total > 0 {
		lastPage = int((total + int64(perPage) - 1) / int64(perPage))
	}

	return &LabListOutput{Data: data, Total: total, Page: page, PerPage: perPage, LastPage: lastPage}, nil
}

func (s *Service) CreateLab(input CreateLabInput) (*domain.Laboratory, error) {
	status := input.Status
	if status == "" {
		status = "active"
	}

	l := &domain.Laboratory{
		Name:          input.Name,
		ContactPerson: input.ContactPerson,
		Email:         input.Email,
		Phone:         input.Phone,
		Address:       input.Address,
		Status:        status,
		Notes:         input.Notes,
	}

	if err := s.labRepo.Create(l); err != nil {
		return nil, err
	}

	s.logger.Info("laboratory created", zap.Uint("id", l.ID))
	return s.labRepo.GetByID(l.ID)
}

func (s *Service) UpdateLab(id uint, input UpdateLabInput) (*domain.Laboratory, error) {
	l, err := s.labRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	if input.Name != "" {
		l.Name = input.Name
	}
	if input.ContactPerson != "" {
		l.ContactPerson = input.ContactPerson
	}
	if input.Email != "" {
		l.Email = input.Email
	}
	if input.Phone != "" {
		l.Phone = input.Phone
	}
	if input.Address != "" {
		l.Address = input.Address
	}
	if input.Status != "" {
		l.Status = input.Status
	}
	if input.Notes != "" {
		l.Notes = input.Notes
	}

	if err := s.labRepo.Update(l); err != nil {
		return nil, err
	}
	return s.labRepo.GetByID(id)
}

func (s *Service) DeleteLab(id uint) error {
	_, err := s.labRepo.GetByID(id)
	if err != nil {
		return err
	}
	return s.labRepo.Delete(id)
}

// --- Laboratory Order Methods ---

func (s *Service) GetOrder(id uint) (*domain.LaboratoryOrder, error) {
	return s.orderRepo.GetByID(id)
}

func (s *Service) ListOrders(filters map[string]any, page, perPage int) (*OrderListOutput, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 15
	}

	data, total, err := s.orderRepo.List(filters, page, perPage)
	if err != nil {
		return nil, err
	}

	lastPage := 1
	if perPage > 0 && total > 0 {
		lastPage = int((total + int64(perPage) - 1) / int64(perPage))
	}

	return &OrderListOutput{Data: data, Total: total, Page: page, PerPage: perPage, LastPage: lastPage}, nil
}

func (s *Service) CreateOrder(input CreateOrderInput, userID uint) (*domain.LaboratoryOrder, error) {
	status := input.Status
	if status == "" {
		status = "pending"
	}

	priority := input.Priority
	if priority == "" {
		priority = "normal"
	}

	var estDate *time.Time
	if input.EstimatedCompletionDate != nil && *input.EstimatedCompletionDate != "" {
		t, err := time.Parse("2006-01-02", *input.EstimatedCompletionDate)
		if err == nil {
			estDate = &t
		}
	}

	labID := input.LaboratoryID
	patID := input.PatientID

	o := &domain.LaboratoryOrder{
		OrderID:                 input.OrderID,
		SaleID:                  input.SaleID,
		LaboratoryID:            &labID,
		PatientID:               &patID,
		Status:                  domain.LaboratoryOrderStatusValue(status),
		Priority:                priority,
		EstimatedCompletionDate: estDate,
		Notes:                   input.Notes,
		CreatedBy:               &userID,
	}

	if err := s.orderRepo.Create(o); err != nil {
		return nil, err
	}

	// Add initial status history entry
	_ = s.orderRepo.AddStatusEntry(&domain.LaboratoryOrderStatusEntry{
		LaboratoryOrderID: o.ID,
		Status:            status,
		Notes:             "Orden creada",
		UserID:            &userID,
	})

	s.logger.Info("laboratory order created", zap.Uint("id", o.ID))
	return s.orderRepo.GetByID(o.ID)
}

func (s *Service) UpdateOrder(id uint, input UpdateOrderInput) (*domain.LaboratoryOrder, error) {
	o, err := s.orderRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	if input.LaboratoryID != nil {
		o.LaboratoryID = input.LaboratoryID
	}
	if input.PatientID != nil {
		o.PatientID = input.PatientID
	}
	if input.OrderID != nil {
		o.OrderID = input.OrderID
	}
	if input.SaleID != nil {
		o.SaleID = input.SaleID
	}
	if input.Status != "" {
		o.Status = domain.LaboratoryOrderStatusValue(input.Status)
	}
	if input.Priority != "" {
		o.Priority = input.Priority
	}
	if input.EstimatedCompletionDate != nil && *input.EstimatedCompletionDate != "" {
		t, err := time.Parse("2006-01-02", *input.EstimatedCompletionDate)
		if err == nil {
			o.EstimatedCompletionDate = &t
		}
	}
	if input.Notes != "" {
		o.Notes = input.Notes
	}

	if err := s.orderRepo.Update(o); err != nil {
		return nil, err
	}
	return s.orderRepo.GetByID(id)
}

func (s *Service) UpdateOrderStatus(id uint, input UpdateOrderStatusInput, userID uint) (*domain.LaboratoryOrder, error) {
	o, err := s.orderRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	o.Status = domain.LaboratoryOrderStatusValue(input.Status)
	if err := s.orderRepo.Update(o); err != nil {
		return nil, err
	}

	// Record history entry
	_ = s.orderRepo.AddStatusEntry(&domain.LaboratoryOrderStatusEntry{
		LaboratoryOrderID: id,
		Status:            input.Status,
		Notes:             input.Notes,
		UserID:            &userID,
	})

	return s.orderRepo.GetByID(id)
}

func (s *Service) DeleteOrder(id uint) error {
	_, err := s.orderRepo.GetByID(id)
	if err != nil {
		return err
	}
	return s.orderRepo.Delete(id)
}

func (s *Service) Stats() (map[string]int64, error) {
	return s.orderRepo.Stats()
}
