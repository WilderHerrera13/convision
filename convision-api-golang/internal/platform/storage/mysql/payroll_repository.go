package mysql

import (
	"errors"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var payrollFilterAllowlist = map[string]bool{
	"status":            true,
	"employee_position": true,
}

// PayrollRepository implements domain.PayrollRepository using GORM/PostgreSQL.
type PayrollRepository struct {
	db *gorm.DB
}

// NewPayrollRepository creates a new PayrollRepository.
func NewPayrollRepository(db *gorm.DB) *PayrollRepository {
	return &PayrollRepository{db: db}
}

func (r *PayrollRepository) GetByID(id uint) (*domain.Payroll, error) {
	var p domain.Payroll
	err := r.db.Preload("PaymentMethod").Preload("CreatedByUser").
		First(&p, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "payroll"}
	}
	return &p, err
}

func (r *PayrollRepository) Create(p *domain.Payroll) error {
	return r.db.Create(p).Error
}

func (r *PayrollRepository) Update(p *domain.Payroll) error {
	return r.db.Model(p).Updates(map[string]any{
		"employee_name":            p.EmployeeName,
		"employee_identification":  p.EmployeeIdentification,
		"employee_position":        p.EmployeePosition,
		"base_salary":              p.BaseSalary,
		"overtime_hours":           p.OvertimeHours,
		"overtime_rate":            p.OvertimeRate,
		"overtime_amount":          p.OvertimeAmount,
		"bonuses":                  p.Bonuses,
		"commissions":              p.Commissions,
		"other_income":             p.OtherIncome,
		"gross_salary":             p.GrossSalary,
		"health_deduction":         p.HealthDeduction,
		"pension_deduction":        p.PensionDeduction,
		"tax_deduction":            p.TaxDeduction,
		"other_deductions":         p.OtherDeductions,
		"total_deductions":         p.TotalDeductions,
		"net_salary":               p.NetSalary,
		"payment_method_id":        p.PaymentMethodID,
		"reference":                p.Reference,
		"notes":                    p.Notes,
		"status":                   p.Status,
	}).Error
}

func (r *PayrollRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Payroll{}, id).Error
}

func (r *PayrollRepository) List(filters map[string]any, page, perPage int) ([]*domain.Payroll, int64, error) {
	var records []*domain.Payroll
	var total int64

	q := r.db.Model(&domain.Payroll{})
	for k, v := range filters {
		if payrollFilterAllowlist[k] {
			q = q.Where(k+" = ?", v)
		}
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * perPage
	err := q.Select("id, employee_name, employee_identification, employee_position, pay_period_start, pay_period_end, base_salary, net_salary, status, payment_date, created_at, updated_at").
		Order("created_at DESC").Offset(offset).Limit(perPage).Find(&records).Error
	return records, total, err
}
