package laboratory

import (
	"fmt"
	"os"
	"time"

	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
)

// Service handles laboratory and laboratory order use-cases.
type Service struct {
	labRepo      domain.LaboratoryRepository
	orderRepo    domain.LaboratoryOrderRepository
	callRepo     domain.LaboratoryOrderCallRepository
	evidenceRepo domain.LaboratoryOrderEvidenceRepository
	saleRepo     domain.SaleRepository
	logger       *zap.Logger
}

// NewService creates a new laboratory Service.
func NewService(
	labRepo domain.LaboratoryRepository,
	orderRepo domain.LaboratoryOrderRepository,
	callRepo domain.LaboratoryOrderCallRepository,
	evidenceRepo domain.LaboratoryOrderEvidenceRepository,
	saleRepo domain.SaleRepository,
	logger *zap.Logger,
) *Service {
	return &Service{labRepo: labRepo, orderRepo: orderRepo, callRepo: callRepo, evidenceRepo: evidenceRepo, saleRepo: saleRepo, logger: logger}
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

type RxEyeInput struct {
	Sphere    string `json:"sphere"`
	Cylinder  string `json:"cylinder"`
	Axis      string `json:"axis"`
	Addition  string `json:"addition"`
	DP        string `json:"dp"`
	AF        string `json:"af"`
	Diameter  string `json:"diameter"`
	BaseCurve string `json:"base_curve"`
	Power     string `json:"power"`
	PrismH    string `json:"prism_h"`
	PrismV    string `json:"prism_v"`
}

type FrameSpecsInput struct {
	Name               string `json:"name"`
	Type               string `json:"type"`
	Gender             string `json:"gender"`
	Color              string `json:"color"`
	Horizontal         string `json:"horizontal"`
	Bridge             string `json:"bridge"`
	Vertical           string `json:"vertical"`
	PantoscopicAngle   string `json:"pantoscopic_angle"`
	MechanicalDistance string `json:"mechanical_distance"`
	PanoramicAngle     string `json:"panoramic_angle"`
	EffectiveDiameter  string `json:"effective_diameter"`
}

type CreateOrderInput struct {
	OrderID                 *uint            `json:"order_id"`
	SaleID                  *uint            `json:"sale_id"`
	LaboratoryID            uint             `json:"laboratory_id" binding:"required"`
	PatientID               uint             `json:"patient_id"    binding:"required"`
	Status                  string           `json:"status"`
	Priority                string           `json:"priority"`
	EstimatedCompletionDate *string          `json:"estimated_completion_date"`
	Notes                   string           `json:"notes"`
	RxOD                    *RxEyeInput      `json:"rx_od"`
	RxOI                    *RxEyeInput      `json:"rx_oi"`
	LensOD                  string           `json:"lens_od"`
	LensOI                  string           `json:"lens_oi"`
	FrameSpecs              *FrameSpecsInput `json:"frame_specs"`
	SellerName              string           `json:"seller_name"`
	SaleDate                *string          `json:"sale_date"`
	Branch                  string           `json:"branch"`
	SpecialInstructions     string           `json:"special_instructions"`
}

type UpdateOrderInput struct {
	OrderID                 *uint            `json:"order_id"`
	SaleID                  *uint            `json:"sale_id"`
	LaboratoryID            *uint            `json:"laboratory_id"`
	PatientID               *uint            `json:"patient_id"`
	Status                  string           `json:"status"`
	Priority                string           `json:"priority"`
	EstimatedCompletionDate *string          `json:"estimated_completion_date"`
	Notes                   string           `json:"notes"`
	DrawerNumber            *string          `json:"drawer_number"`
	RxOD                    *RxEyeInput      `json:"rx_od"`
	RxOI                    *RxEyeInput      `json:"rx_oi"`
	LensOD                  *string          `json:"lens_od"`
	LensOI                  *string          `json:"lens_oi"`
	FrameSpecs              *FrameSpecsInput `json:"frame_specs"`
	SellerName              *string          `json:"seller_name"`
	SaleDate                *string          `json:"sale_date"`
	Branch                  *string          `json:"branch"`
	SpecialInstructions     *string          `json:"special_instructions"`
}

type UpdateOrderStatusInput struct {
	Status string `json:"status" binding:"required,oneof=pending in_process sent_to_lab in_transit received_from_lab returned_to_lab in_quality quality_approved ready_for_delivery delivered cancelled portfolio"`
	Notes  string `json:"notes"`
}

type OrderListOutput struct {
	Data     []*domain.LaboratoryOrder `json:"data"`
	Total    int64                     `json:"total"`
	Page     int                       `json:"current_page"`
	PerPage  int                       `json:"per_page"`
	LastPage int                       `json:"last_page"`
}

// --- Portfolio DTOs ---

type RegisterCallInput struct {
	Result          string  `json:"result"           binding:"required,oneof=contacted payment_promise no_answer wrong_number"`
	Channel         string  `json:"channel"          binding:"required,oneof=call whatsapp sms email"`
	NextContactDate *string `json:"next_contact_date"`
	Notes           string  `json:"notes"`
}

type PortfolioOrderItem struct {
	domain.LaboratoryOrder
	DaysInPortfolio int                         `json:"days_in_portfolio"`
	LastCall        *domain.LaboratoryOrderCall `json:"last_call,omitempty"`
	CallCount       int                         `json:"call_count"`
	Balance         *float64                    `json:"balance"`
}

type PortfolioListOutput struct {
	Data     []*PortfolioOrderItem `json:"data"`
	Total    int64                 `json:"total"`
	Page     int                  `json:"current_page"`
	PerPage  int                  `json:"per_page"`
	LastPage int                  `json:"last_page"`
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

func rxEyeInputToDomain(inp *RxEyeInput) *domain.RxEye {
	if inp == nil {
		return nil
	}
	return &domain.RxEye{
		Sphere:    inp.Sphere,
		Cylinder:  inp.Cylinder,
		Axis:      inp.Axis,
		Addition:  inp.Addition,
		DP:        inp.DP,
		AF:        inp.AF,
		Diameter:  inp.Diameter,
		BaseCurve: inp.BaseCurve,
		Power:     inp.Power,
		PrismH:    inp.PrismH,
		PrismV:    inp.PrismV,
	}
}

func frameSpecsInputToDomain(inp *FrameSpecsInput) *domain.FrameSpecs {
	if inp == nil {
		return nil
	}
	return &domain.FrameSpecs{
		Name:               inp.Name,
		Type:               inp.Type,
		Gender:             inp.Gender,
		Color:              inp.Color,
		Horizontal:         inp.Horizontal,
		Bridge:             inp.Bridge,
		Vertical:           inp.Vertical,
		PantoscopicAngle:   inp.PantoscopicAngle,
		MechanicalDistance: inp.MechanicalDistance,
		PanoramicAngle:     inp.PanoramicAngle,
		EffectiveDiameter:  inp.EffectiveDiameter,
	}
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

	var saleDate *time.Time
	if input.SaleDate != nil && *input.SaleDate != "" {
		t, err := time.Parse("2006-01-02", *input.SaleDate)
		if err == nil {
			saleDate = &t
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
		RxOD:                    rxEyeInputToDomain(input.RxOD),
		RxOI:                    rxEyeInputToDomain(input.RxOI),
		LensOD:                  input.LensOD,
		LensOI:                  input.LensOI,
		FrameSpecs:              frameSpecsInputToDomain(input.FrameSpecs),
		SellerName:              input.SellerName,
		SaleDate:                saleDate,
		Branch:                  input.Branch,
		SpecialInstructions:     input.SpecialInstructions,
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
	if input.DrawerNumber != nil {
		o.DrawerNumber = input.DrawerNumber
	}
	if input.RxOD != nil {
		o.RxOD = rxEyeInputToDomain(input.RxOD)
	}
	if input.RxOI != nil {
		o.RxOI = rxEyeInputToDomain(input.RxOI)
	}
	if input.LensOD != nil {
		o.LensOD = *input.LensOD
	}
	if input.LensOI != nil {
		o.LensOI = *input.LensOI
	}
	if input.FrameSpecs != nil {
		o.FrameSpecs = frameSpecsInputToDomain(input.FrameSpecs)
	}
	if input.SellerName != nil {
		o.SellerName = *input.SellerName
	}
	if input.SaleDate != nil && *input.SaleDate != "" {
		t, err := time.Parse("2006-01-02", *input.SaleDate)
		if err == nil {
			o.SaleDate = &t
		}
	}
	if input.Branch != nil {
		o.Branch = *input.Branch
	}
	if input.SpecialInstructions != nil {
		o.SpecialInstructions = *input.SpecialInstructions
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

func (s *Service) GetOrderPdfToken(id uint) (map[string]any, error) {
	o, err := s.orderRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	if o.PdfToken == "" {
		token := fmt.Sprintf("%x-%d", o.ID, time.Now().UnixNano())
		o.PdfToken = token
		if updateErr := s.orderRepo.Update(o); updateErr != nil {
			return nil, updateErr
		}
	}

	baseURL := os.Getenv("APP_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8000"
	}
	guestURL := fmt.Sprintf("%s/api/v1/guest/laboratory-orders/%d/pdf?token=%s", baseURL, o.ID, o.PdfToken)

	return map[string]any{
		"pdf_token":     o.PdfToken,
		"guest_pdf_url": guestURL,
	}, nil
}

func (s *Service) Stats() (map[string]int64, error) {
	return s.orderRepo.Stats()
}

// --- Portfolio Methods ---

func (s *Service) PortfolioStats() (map[string]int64, error) {
	return s.callRepo.PortfolioStats()
}

func (s *Service) ListPortfolioOrders(page, perPage int, search string) (*PortfolioListOutput, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 15
	}

	filters := map[string]any{"status": "portfolio"}
	if search != "" {
		filters["_search"] = search
	}
	orders, total, err := s.orderRepo.List(filters, page, perPage)
	if err != nil {
		return nil, err
	}

	orderIDs := make([]uint, len(orders))
	for i, o := range orders {
		orderIDs[i] = o.ID
	}

	calls, err := s.callRepo.GetByOrderIDs(orderIDs)
	if err != nil {
		return nil, err
	}

	callsByOrderID := map[uint][]*domain.LaboratoryOrderCall{}
	for _, c := range calls {
		callsByOrderID[c.LaboratoryOrderID] = append(callsByOrderID[c.LaboratoryOrderID], c)
	}

	items := make([]*PortfolioOrderItem, len(orders))
	for i, o := range orders {
		item := &PortfolioOrderItem{
			LaboratoryOrder: *o,
			CallCount:       len(callsByOrderID[o.ID]),
		}

		portfolioSince := o.UpdatedAt
		for _, entry := range o.StatusHistory {
			if entry.Status == "portfolio" {
				portfolioSince = entry.CreatedAt
			}
		}
		item.DaysInPortfolio = int(time.Since(portfolioSince).Hours() / 24)

		orderCalls := callsByOrderID[o.ID]
		if len(orderCalls) > 0 {
			item.LastCall = orderCalls[0]
		}

		if o.Sale != nil {
			b := o.Sale.Balance
			item.Balance = &b
		}

		items[i] = item
	}

	lastPage := 1
	if perPage > 0 && total > 0 {
		lastPage = int((total + int64(perPage) - 1) / int64(perPage))
	}

	return &PortfolioListOutput{Data: items, Total: total, Page: page, PerPage: perPage, LastPage: lastPage}, nil
}

func (s *Service) RegisterPortfolioCall(orderID uint, input RegisterCallInput, userID uint) (*domain.LaboratoryOrderCall, error) {
	o, err := s.orderRepo.GetByID(orderID)
	if err != nil {
		return nil, err
	}

	if o.Status != domain.LaboratoryOrderStatusPortfolio {
		return nil, &domain.ErrValidation{Field: "status", Message: "order is not in portfolio status"}
	}

	var nextContact *time.Time
	if input.NextContactDate != nil && *input.NextContactDate != "" {
		t, err := time.Parse("2006-01-02", *input.NextContactDate)
		if err == nil {
			nextContact = &t
		}
	}

	call := &domain.LaboratoryOrderCall{
		LaboratoryOrderID: orderID,
		Result:            input.Result,
		Channel:           input.Channel,
		NextContactDate:   nextContact,
		Notes:             input.Notes,
		UserID:            &userID,
	}

	if err := s.callRepo.Create(call); err != nil {
		return nil, err
	}

	s.logger.Info("portfolio call registered", zap.Uint("order_id", orderID), zap.String("result", input.Result))
	return call, nil
}

func (s *Service) GetPortfolioOrderCalls(orderID uint) ([]*domain.LaboratoryOrderCall, error) {
	return s.callRepo.GetByOrderID(orderID)
}

func (s *Service) GetPortfolioOrder(orderID uint) (*PortfolioOrderItem, error) {
	o, err := s.orderRepo.GetByID(orderID)
	if err != nil {
		return nil, err
	}

	calls, err := s.callRepo.GetByOrderID(orderID)
	if err != nil {
		return nil, err
	}

	item := &PortfolioOrderItem{
		LaboratoryOrder: *o,
		CallCount:       len(calls),
	}

	portfolioSince := o.UpdatedAt
	for _, entry := range o.StatusHistory {
		if entry.Status == "portfolio" {
			portfolioSince = entry.CreatedAt
		}
	}
	item.DaysInPortfolio = int(time.Since(portfolioSince).Hours() / 24)

	if len(calls) > 0 {
		item.LastCall = calls[0]
	}

	if o.Sale != nil {
		b := o.Sale.Balance
		item.Balance = &b
	}

	return item, nil
}

func (s *Service) ClosePortfolioOrder(orderID uint, userID uint) error {
	o, err := s.orderRepo.GetByID(orderID)
	if err != nil {
		return err
	}

	if o.Status != domain.LaboratoryOrderStatusPortfolio {
		return &domain.ErrValidation{Field: "status", Message: "order is not in portfolio status"}
	}

	o.Status = domain.LaboratoryOrderStatusDelivered
	if err := s.orderRepo.Update(o); err != nil {
		return err
	}

	_ = s.orderRepo.AddStatusEntry(&domain.LaboratoryOrderStatusEntry{
		LaboratoryOrderID: orderID,
		Status:            string(domain.LaboratoryOrderStatusDelivered),
		Notes:             "Pago completado — cartera cerrada",
		UserID:            &userID,
	})

	if o.SaleID != nil {
		sale, err := s.saleRepo.GetByID(*o.SaleID)
		if err == nil {
			sale.Balance = 0
			sale.AmountPaid = sale.Total
			sale.PaymentStatus = "paid"
			_ = s.saleRepo.Update(sale)
		}
	}

	s.logger.Info("portfolio order closed", zap.Uint("order_id", orderID))
	return nil
}

// --- Evidence Methods ---

func (s *Service) GetOrderEvidence(orderID uint, transitionType string) ([]*domain.LaboratoryOrderEvidence, error) {
	return s.evidenceRepo.ListByOrderID(orderID, transitionType)
}

func (s *Service) AddOrderEvidence(orderID uint, transitionType, imageURL string, userID uint) (*domain.LaboratoryOrderEvidence, error) {
	e := &domain.LaboratoryOrderEvidence{
		LaboratoryOrderID: orderID,
		TransitionType:    transitionType,
		ImageURL:          imageURL,
		CreatedBy:         &userID,
	}
	if err := s.evidenceRepo.Create(e); err != nil {
		return nil, err
	}
	return e, nil
}
