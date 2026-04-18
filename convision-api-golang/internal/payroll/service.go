package payroll

import (
	"math"
	"time"

	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
)

// Service handles payroll use-cases.
type Service struct {
	repo   domain.PayrollRepository
	logger *zap.Logger
}

// NewService creates a new payroll Service.
func NewService(repo domain.PayrollRepository, logger *zap.Logger) *Service {
	return &Service{repo: repo, logger: logger}
}

// CreateInput holds validated fields for creating a payroll.
type CreateInput struct {
	EmployeeName           string  `json:"employee_name"            binding:"required,max=255"`
	EmployeeIdentification string  `json:"employee_identification"  binding:"required,max=255"`
	EmployeePosition       string  `json:"employee_position"        binding:"required,max=255"`
	PayPeriodStart         string  `json:"pay_period_start"         binding:"required"`
	PayPeriodEnd           string  `json:"pay_period_end"           binding:"required"`
	BaseSalary             float64 `json:"base_salary"              binding:"required,min=0"`
	OvertimeHours          float64 `json:"overtime_hours"`
	OvertimeRate           float64 `json:"overtime_rate"`
	Bonuses                float64 `json:"bonuses"`
	Commissions            float64 `json:"commissions"`
	OtherIncome            float64 `json:"other_income"`
	HealthDeduction        float64 `json:"health_deduction"`
	PensionDeduction       float64 `json:"pension_deduction"`
	TaxDeduction           float64 `json:"tax_deduction"`
	OtherDeductions        float64 `json:"other_deductions"`
	PaymentDate            string  `json:"payment_date"`
	PaymentMethodID        *uint   `json:"payment_method_id"`
	Reference              string  `json:"reference"`
	Notes                  string  `json:"notes"`
}

// UpdateInput holds fields for updating a payroll.
type UpdateInput struct {
	EmployeeName           string   `json:"employee_name"`
	EmployeeIdentification string   `json:"employee_identification"`
	EmployeePosition       string   `json:"employee_position"`
	PayPeriodStart         string   `json:"pay_period_start"`
	PayPeriodEnd           string   `json:"pay_period_end"`
	BaseSalary             *float64 `json:"base_salary"`
	OvertimeHours          *float64 `json:"overtime_hours"`
	OvertimeRate           *float64 `json:"overtime_rate"`
	Bonuses                *float64 `json:"bonuses"`
	Commissions            *float64 `json:"commissions"`
	OtherIncome            *float64 `json:"other_income"`
	HealthDeduction        *float64 `json:"health_deduction"`
	PensionDeduction       *float64 `json:"pension_deduction"`
	TaxDeduction           *float64 `json:"tax_deduction"`
	OtherDeductions        *float64 `json:"other_deductions"`
	PaymentDate            string   `json:"payment_date"`
	PaymentMethodID        *uint    `json:"payment_method_id"`
	Reference              string   `json:"reference"`
	Notes                  string   `json:"notes"`
	Status                 string   `json:"status"`
}

// StatsOutput holds payroll summary statistics.
type StatsOutput struct {
	TotalPayrolls  int64   `json:"total_payrolls"`
	TotalNetSalary float64 `json:"total_net_salary"`
	PaidCount      int64   `json:"paid_count"`
	PendingCount   int64   `json:"pending_count"`
}

// ListOutput wraps a page of payrolls with pagination metadata.
type ListOutput struct {
	Data        []*domain.Payroll `json:"data"`
	Total       int64             `json:"total"`
	CurrentPage int               `json:"current_page"`
	PerPage     int               `json:"per_page"`
	LastPage    int               `json:"last_page"`
}

// GetByID returns a single payroll or ErrNotFound.
func (s *Service) GetByID(id uint) (*domain.Payroll, error) {
	return s.repo.GetByID(id)
}

// GetStats returns aggregate payroll statistics.
func (s *Service) GetStats() (*StatsOutput, error) {
	data, total, err := s.repo.List(map[string]any{}, 1, 10000)
	if err != nil {
		return nil, err
	}
	out := &StatsOutput{TotalPayrolls: total}
	for _, p := range data {
		out.TotalNetSalary += p.NetSalary
		if p.Status == "paid" {
			out.PaidCount++
		} else if p.Status == "pending" {
			out.PendingCount++
		}
	}
	return out, nil
}

// List returns a paginated list of payrolls.
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
	if total > 0 {
		lastPage = int(math.Ceil(float64(total) / float64(perPage)))
	}
	return &ListOutput{Data: data, Total: total, CurrentPage: page, PerPage: perPage, LastPage: lastPage}, nil
}

func calculatePayroll(p *domain.Payroll) {
	p.OvertimeAmount = p.OvertimeHours * p.OvertimeRate
	p.GrossSalary = p.BaseSalary + p.OvertimeAmount + p.Bonuses + p.Commissions + p.OtherIncome
	p.TotalDeductions = p.HealthDeduction + p.PensionDeduction + p.TaxDeduction + p.OtherDeductions
	p.NetSalary = p.GrossSalary - p.TotalDeductions
}

// Create creates a new payroll record.
func (s *Service) Create(input CreateInput, createdByUserID *uint) (*domain.Payroll, error) {
	var start, end, payDate *time.Time
	if t, err := time.Parse("2006-01-02", input.PayPeriodStart); err == nil {
		start = &t
	}
	if t, err := time.Parse("2006-01-02", input.PayPeriodEnd); err == nil {
		end = &t
	}
	if input.PaymentDate != "" {
		if t, err := time.Parse("2006-01-02", input.PaymentDate); err == nil {
			payDate = &t
		}
	}

	p := &domain.Payroll{
		EmployeeName:           input.EmployeeName,
		EmployeeIdentification: input.EmployeeIdentification,
		EmployeePosition:       input.EmployeePosition,
		PayPeriodStart:         start,
		PayPeriodEnd:           end,
		BaseSalary:             input.BaseSalary,
		OvertimeHours:          input.OvertimeHours,
		OvertimeRate:           input.OvertimeRate,
		Bonuses:                input.Bonuses,
		Commissions:            input.Commissions,
		OtherIncome:            input.OtherIncome,
		HealthDeduction:        input.HealthDeduction,
		PensionDeduction:       input.PensionDeduction,
		TaxDeduction:           input.TaxDeduction,
		OtherDeductions:        input.OtherDeductions,
		PaymentDate:            payDate,
		PaymentMethodID:        input.PaymentMethodID,
		Reference:              input.Reference,
		Notes:                  input.Notes,
		Status:                 "pending",
		CreatedByUserID:        createdByUserID,
	}
	calculatePayroll(p)

	if err := s.repo.Create(p); err != nil {
		return nil, err
	}
	s.logger.Info("payroll created", zap.Uint("id", p.ID))
	return s.repo.GetByID(p.ID)
}

// Update updates a payroll record.
func (s *Service) Update(id uint, input UpdateInput) (*domain.Payroll, error) {
	p, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if input.EmployeeName != "" {
		p.EmployeeName = input.EmployeeName
	}
	if input.EmployeeIdentification != "" {
		p.EmployeeIdentification = input.EmployeeIdentification
	}
	if input.EmployeePosition != "" {
		p.EmployeePosition = input.EmployeePosition
	}
	if input.BaseSalary != nil {
		p.BaseSalary = *input.BaseSalary
	}
	if input.OvertimeHours != nil {
		p.OvertimeHours = *input.OvertimeHours
	}
	if input.OvertimeRate != nil {
		p.OvertimeRate = *input.OvertimeRate
	}
	if input.Bonuses != nil {
		p.Bonuses = *input.Bonuses
	}
	if input.Commissions != nil {
		p.Commissions = *input.Commissions
	}
	if input.OtherIncome != nil {
		p.OtherIncome = *input.OtherIncome
	}
	if input.HealthDeduction != nil {
		p.HealthDeduction = *input.HealthDeduction
	}
	if input.PensionDeduction != nil {
		p.PensionDeduction = *input.PensionDeduction
	}
	if input.TaxDeduction != nil {
		p.TaxDeduction = *input.TaxDeduction
	}
	if input.OtherDeductions != nil {
		p.OtherDeductions = *input.OtherDeductions
	}
	if input.Status != "" {
		p.Status = input.Status
	}
	if input.Reference != "" {
		p.Reference = input.Reference
	}
	if input.Notes != "" {
		p.Notes = input.Notes
	}
	calculatePayroll(p)

	if err := s.repo.Update(p); err != nil {
		return nil, err
	}
	return s.repo.GetByID(p.ID)
}

// Delete removes a payroll record.
func (s *Service) Delete(id uint) error {
	if _, err := s.repo.GetByID(id); err != nil {
		return err
	}
	return s.repo.Delete(id)
}
