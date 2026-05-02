package postgres

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
type PayrollRepository struct{}

// NewPayrollRepository creates a new PayrollRepository.
func NewPayrollRepository() *PayrollRepository {
	return &PayrollRepository{}
}

func (r *PayrollRepository) GetByID(db *gorm.DB, id uint) (*domain.Payroll, error) {
	var p domain.Payroll
	err := db.Preload("PaymentMethod").Preload("CreatedByUser").
		First(&p, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, &domain.ErrNotFound{Resource: "payroll"}
	}
	return &p, err
}

func (r *PayrollRepository) Create(db *gorm.DB, p *domain.Payroll) error {
	return db.Create(p).Error
}

func (r *PayrollRepository) Update(db *gorm.DB, p *domain.Payroll) error {
	return db.Model(p).Updates(map[string]any{
		"employee_name":           p.EmployeeName,
		"employee_identification": p.EmployeeIdentification,
		"employee_position":       p.EmployeePosition,
		"base_salary":             p.BaseSalary,
		"overtime_hours":          p.OvertimeHours,
		"overtime_rate":           p.OvertimeRate,
		"overtime_amount":         p.OvertimeAmount,
		"bonuses":                 p.Bonuses,
		"commissions":             p.Commissions,
		"other_income":            p.OtherIncome,
		"gross_salary":            p.GrossSalary,
		"health_deduction":        p.HealthDeduction,
		"pension_deduction":       p.PensionDeduction,
		"tax_deduction":           p.TaxDeduction,
		"other_deductions":        p.OtherDeductions,
		"total_deductions":        p.TotalDeductions,
		"net_salary":              p.NetSalary,
		"payment_method_id":       p.PaymentMethodID,
		"reference":               p.Reference,
		"notes":                   p.Notes,
		"status":                  p.Status,
	}).Error
}

func (r *PayrollRepository) Delete(db *gorm.DB, id uint) error {
	return db.Delete(&domain.Payroll{}, id).Error
}

func (r *PayrollRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.Payroll, int64, error) {
	var records []*domain.Payroll
	var total int64

	q := db.Model(&domain.Payroll{})
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
