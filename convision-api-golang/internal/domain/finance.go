package domain

import "time"

// Expense represents an operating expense tracked in the system.
type Expense struct {
	ID              uint       `json:"id"               gorm:"primaryKey;autoIncrement"`
	SupplierID      *uint      `json:"supplier_id"      gorm:"column:supplier_id"`
	InvoiceNumber   string     `json:"invoice_number"   gorm:"index"`
	Concept         string     `json:"concept"`
	Description     string     `json:"description"      gorm:"type:text"`
	ExpenseDate     *time.Time `json:"expense_date"`
	Amount          float64    `json:"amount"           gorm:"type:decimal(12,2)"`
	PaymentAmount   float64    `json:"payment_amount"   gorm:"type:decimal(12,2)"`
	Balance         float64    `json:"balance"          gorm:"type:decimal(12,2)"`
	Status          string     `json:"status"           gorm:"type:varchar(20);not null;default:'pending'"`
	TaxExcluded     bool       `json:"tax_excluded"     gorm:"not null;default:false"`
	PaymentMethodID *uint      `json:"payment_method_id" gorm:"column:payment_method_id"`
	Reference       string     `json:"reference"`
	Notes           string     `json:"notes"            gorm:"type:text"`
	CreatedByUserID *uint      `json:"created_by_user_id" gorm:"column:created_by_user_id"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`

	Supplier      *Supplier      `json:"supplier,omitempty"       gorm:"foreignKey:SupplierID"`
	PaymentMethod *PaymentMethod `json:"payment_method,omitempty" gorm:"foreignKey:PaymentMethodID"`
	CreatedByUser *User          `json:"created_by_user,omitempty" gorm:"foreignKey:CreatedByUserID"`
}

// ExpenseRepository defines persistence operations for Expense.
type ExpenseRepository interface {
	GetByID(id uint) (*Expense, error)
	Create(e *Expense) error
	Update(e *Expense) error
	Delete(id uint) error
	List(filters map[string]any, page, perPage int) ([]*Expense, int64, error)
}

// ServiceOrder represents an external service order sent to a supplier.
type ServiceOrder struct {
	ID                    uint       `json:"id"                      gorm:"primaryKey;autoIncrement"`
	OrderNumber           string     `json:"order_number"            gorm:"uniqueIndex;not null"`
	SupplierID            *uint      `json:"supplier_id"             gorm:"column:supplier_id"`
	CustomerName          string     `json:"customer_name"`
	CustomerPhone         string     `json:"customer_phone"`
	CustomerEmail         string     `json:"customer_email"`
	ServiceType           string     `json:"service_type"            gorm:"type:varchar(50)"`
	Description           string     `json:"problem_description"     gorm:"type:text"`
	LensHorizontalAxis    float64    `json:"lens_horizontal_axis"    gorm:"type:decimal(5,2)"`
	LensVerticalAxis      float64    `json:"lens_vertical_axis"      gorm:"type:decimal(5,2)"`
	LensDistance          float64    `json:"lens_distance"           gorm:"type:decimal(5,2)"`
	EstimatedCost         float64    `json:"estimated_cost"          gorm:"type:decimal(12,2)"`
	FinalCost             float64    `json:"final_cost"              gorm:"type:decimal(12,2)"`
	EstimatedDeliveryDate *time.Time `json:"estimated_delivery_date"`
	ActualDeliveryDate    *time.Time `json:"actual_delivery_date"`
	Priority              string     `json:"priority"                gorm:"type:varchar(20);default:'normal'"`
	Status                string     `json:"status"                  gorm:"type:varchar(20);not null;default:'pending'"`
	Notes                 string     `json:"notes"                   gorm:"type:text"`
	Observations          string     `json:"observations"            gorm:"type:text"`
	CreatedByUserID       *uint      `json:"created_by_user_id"      gorm:"column:created_by_user_id"`
	CreatedAt             time.Time  `json:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at"`

	Supplier      *Supplier `json:"supplier,omitempty"       gorm:"foreignKey:SupplierID"`
	CreatedByUser *User     `json:"created_by_user,omitempty" gorm:"foreignKey:CreatedByUserID"`
}

// Payroll represents a payroll record for an employee.
type Payroll struct {
	ID                     uint       `json:"id"                       gorm:"primaryKey;autoIncrement"`
	EmployeeName           string     `json:"employee_name"            gorm:"not null"`
	EmployeeIdentification string     `json:"employee_identification"`
	EmployeePosition       string     `json:"employee_position"`
	PayPeriodStart         *time.Time `json:"pay_period_start"`
	PayPeriodEnd           *time.Time `json:"pay_period_end"`
	BaseSalary             float64    `json:"base_salary"              gorm:"type:decimal(12,2)"`
	OvertimeHours          float64    `json:"overtime_hours"           gorm:"type:decimal(5,2)"`
	OvertimeRate           float64    `json:"overtime_rate"            gorm:"type:decimal(12,2)"`
	OvertimeAmount         float64    `json:"overtime_amount"          gorm:"type:decimal(12,2)"`
	Bonuses                float64    `json:"bonuses"                  gorm:"type:decimal(12,2)"`
	Commissions            float64    `json:"commissions"              gorm:"type:decimal(12,2)"`
	OtherIncome            float64    `json:"other_income"             gorm:"type:decimal(12,2)"`
	GrossSalary            float64    `json:"gross_salary"             gorm:"type:decimal(12,2)"`
	HealthDeduction        float64    `json:"health_deduction"         gorm:"type:decimal(12,2)"`
	PensionDeduction       float64    `json:"pension_deduction"        gorm:"type:decimal(12,2)"`
	TaxDeduction           float64    `json:"tax_deduction"            gorm:"type:decimal(12,2)"`
	OtherDeductions        float64    `json:"other_deductions"         gorm:"type:decimal(12,2)"`
	TotalDeductions        float64    `json:"total_deductions"         gorm:"type:decimal(12,2)"`
	NetSalary              float64    `json:"net_salary"               gorm:"type:decimal(12,2)"`
	PaymentDate            *time.Time `json:"payment_date"`
	PaymentMethodID        *uint      `json:"payment_method_id"        gorm:"column:payment_method_id"`
	Reference              string     `json:"reference"`
	Notes                  string     `json:"notes"                    gorm:"type:text"`
	Status                 string     `json:"status"                   gorm:"type:varchar(20);not null;default:'pending'"`
	CreatedByUserID        *uint      `json:"created_by_user_id"       gorm:"column:created_by_user_id"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`

	PaymentMethod *PaymentMethod `json:"payment_method,omitempty" gorm:"foreignKey:PaymentMethodID"`
	CreatedByUser *User          `json:"created_by_user,omitempty" gorm:"foreignKey:CreatedByUserID"`
}

// TableName overrides the GORM default for Payroll (table is `payroll`, not `payrolls`).
func (Payroll) TableName() string {
	return "payroll"
}

// ServiceOrderRepository defines persistence operations for ServiceOrder.
type ServiceOrderRepository interface {
	GetByID(id uint) (*ServiceOrder, error)
	Create(s *ServiceOrder) error
	Update(s *ServiceOrder) error
	Delete(id uint) error
	List(filters map[string]any, page, perPage int) ([]*ServiceOrder, int64, error)
}

// PayrollRepository defines persistence operations for Payroll.
type PayrollRepository interface {
	GetByID(id uint) (*Payroll, error)
	Create(p *Payroll) error
	Update(p *Payroll) error
	Delete(id uint) error
	List(filters map[string]any, page, perPage int) ([]*Payroll, int64, error)
}
