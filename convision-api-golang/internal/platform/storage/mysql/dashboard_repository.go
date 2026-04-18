package mysql

import (
	"math"
	"time"

	"gorm.io/gorm"
)

// DashboardSummary holds all dashboard metrics.
type DashboardSummary struct {
	Metrics      DashboardMetrics      `json:"metrics"`
	WeeklySales  []WeeklySaleDay       `json:"weekly_sales"`
	RecentOrders []DashboardOrder      `json:"recent_orders"`
}

// DashboardMetrics holds top-level dashboard metric cards.
type DashboardMetrics struct {
	MonthlySales    MonthlySalesMetric    `json:"monthly_sales"`
	MonthlyPatients MonthlyPatientsMetric `json:"monthly_patients"`
	LabOrders       LabOrdersMetric       `json:"lab_orders"`
	PendingBalance  PendingBalanceMetric  `json:"pending_balance"`
}

// MonthlySalesMetric holds sales aggregates for the current month.
type MonthlySalesMetric struct {
	Total float64 `json:"total"`
	Count int64   `json:"count"`
}

// MonthlyPatientsMetric holds patient count for the current month.
type MonthlyPatientsMetric struct {
	Count int64 `json:"count"`
}

// LabOrdersMetric holds lab order counts.
type LabOrdersMetric struct {
	Total   int64 `json:"total"`
	Pending int64 `json:"pending"`
}

// PendingBalanceMetric holds unpaid sales balance.
type PendingBalanceMetric struct {
	Total float64 `json:"total"`
}

// WeeklySaleDay holds sales data for a single day of the current week.
type WeeklySaleDay struct {
	Label     string  `json:"label"`
	Total     float64 `json:"total"`
	HeightPct int     `json:"height_pct"`
	IsCurrent bool    `json:"is_current"`
}

// DashboardOrder holds a recent order for the dashboard widget.
type DashboardOrder struct {
	ID      uint    `json:"id"`
	Patient string  `json:"patient"`
	Product string  `json:"product"`
	Status  string  `json:"status"`
	Total   float64 `json:"total"`
}

// DashboardRepository provides aggregated dashboard data.
type DashboardRepository struct {
	db *gorm.DB
}

// NewDashboardRepository creates a new DashboardRepository.
func NewDashboardRepository(db *gorm.DB) *DashboardRepository {
	return &DashboardRepository{db: db}
}

// Summary computes all dashboard metrics and returns them as a DashboardSummary.
func (r *DashboardRepository) Summary() (*DashboardSummary, error) {
	now := time.Now()
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	// Monthly sales
	var monthlySalesTotal *float64
	var monthlySalesCount int64
	r.db.Table("sales").
		Where("created_at >= ? AND status != 'cancelled'", monthStart).
		Select("COALESCE(SUM(total_amount), 0)").Scan(&monthlySalesTotal)
	r.db.Table("sales").
		Where("created_at >= ? AND status != 'cancelled'", monthStart).
		Count(&monthlySalesCount)

	// Monthly patients (new patients created this month)
	var monthlyPatients int64
	r.db.Table("patients").
		Where("created_at >= ?", monthStart).
		Count(&monthlyPatients)

	// Lab orders
	var labTotal, labPending int64
	r.db.Table("laboratory_orders").Count(&labTotal)
	r.db.Table("laboratory_orders").Where("status = 'pending' OR status = 'in_process'").Count(&labPending)

	// Pending balance (sales with payment_status = pending)
	var pendingBalance *float64
	r.db.Table("sales").
		Where("payment_status = 'pending' AND status != 'cancelled'").
		Select("COALESCE(SUM(total_amount), 0)").Scan(&pendingBalance)

	// Weekly sales (Mon–Sun of current week)
	weekdays := []string{"Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"}
	// Find Monday of current week
	weekday := int(now.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	mondayOffset := weekday - 1
	monday := now.AddDate(0, 0, -mondayOffset)
	monday = time.Date(monday.Year(), monday.Month(), monday.Day(), 0, 0, 0, 0, monday.Location())

	weekSales := make([]float64, 7)
	for i := 0; i < 7; i++ {
		dayStart := monday.AddDate(0, 0, i)
		dayEnd := dayStart.Add(24 * time.Hour)
		var dayTotal *float64
		r.db.Table("sales").
			Where("created_at >= ? AND created_at < ? AND status != 'cancelled'", dayStart, dayEnd).
			Select("COALESCE(SUM(total_amount), 0)").Scan(&dayTotal)
		if dayTotal != nil {
			weekSales[i] = *dayTotal
		}
	}

	// Find max for height_pct calculation
	maxSale := 0.0
	for _, v := range weekSales {
		if v > maxSale {
			maxSale = v
		}
	}

	weeklySales := make([]WeeklySaleDay, 7)
	for i := 0; i < 7; i++ {
		pct := 0
		if maxSale > 0 {
			pct = int(math.Round(weekSales[i] / maxSale * 100))
		}
		weeklySales[i] = WeeklySaleDay{
			Label:     weekdays[i],
			Total:     weekSales[i],
			HeightPct: pct,
			IsCurrent: i == mondayOffset,
		}
	}

	// Recent orders (last 8)
	type OrderRow struct {
		ID            uint
		PatientName   string
		PatientLastName string
		ProductName   string
		Status        string
		TotalAmount   float64
	}
	var orderRows []OrderRow
	r.db.Table("orders o").
		Joins("LEFT JOIN patients p ON p.id = o.patient_id").
		Joins("LEFT JOIN products pr ON pr.id = o.product_id").
		Select("o.id, p.name as patient_name, p.last_name as patient_last_name, COALESCE(pr.name, '') as product_name, o.status, o.total_amount").
		Order("o.created_at DESC").
		Limit(8).
		Scan(&orderRows)

	recentOrders := make([]DashboardOrder, len(orderRows))
	for i, row := range orderRows {
		patient := row.PatientName + " " + row.PatientLastName
		recentOrders[i] = DashboardOrder{
			ID:      row.ID,
			Patient: patient,
			Product: row.ProductName,
			Status:  row.Status,
			Total:   row.TotalAmount,
		}
	}

	safeFloat := func(f *float64) float64 {
		if f == nil {
			return 0
		}
		return *f
	}

	return &DashboardSummary{
		Metrics: DashboardMetrics{
			MonthlySales:    MonthlySalesMetric{Total: safeFloat(monthlySalesTotal), Count: monthlySalesCount},
			MonthlyPatients: MonthlyPatientsMetric{Count: monthlyPatients},
			LabOrders:       LabOrdersMetric{Total: labTotal, Pending: labPending},
			PendingBalance:  PendingBalanceMetric{Total: safeFloat(pendingBalance)},
		},
		WeeklySales:  weeklySales,
		RecentOrders: recentOrders,
	}, nil
}
