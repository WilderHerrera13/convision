package postgres

import (
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// LaboratoryOrderCallRepository is the PostgreSQL-backed implementation of domain.LaboratoryOrderCallRepository.
type LaboratoryOrderCallRepository struct {
	db *gorm.DB
}

func NewLaboratoryOrderCallRepository(db *gorm.DB) *LaboratoryOrderCallRepository {
	return &LaboratoryOrderCallRepository{db: db}
}

func (r *LaboratoryOrderCallRepository) Create(call *domain.LaboratoryOrderCall) error {
	return r.db.Create(call).Error
}

func (r *LaboratoryOrderCallRepository) GetByOrderID(orderID uint) ([]*domain.LaboratoryOrderCall, error) {
	var calls []*domain.LaboratoryOrderCall
	err := r.db.Where("laboratory_order_id = ?", orderID).
		Preload("User").
		Order("id DESC").
		Find(&calls).Error
	return calls, err
}

func (r *LaboratoryOrderCallRepository) GetByOrderIDs(orderIDs []uint) ([]*domain.LaboratoryOrderCall, error) {
	if len(orderIDs) == 0 {
		return nil, nil
	}
	var calls []*domain.LaboratoryOrderCall
	err := r.db.Where("laboratory_order_id IN ?", orderIDs).
		Preload("User").
		Order("id DESC").
		Find(&calls).Error
	return calls, err
}

func (r *LaboratoryOrderCallRepository) PortfolioStats() (map[string]int64, error) {
	result := map[string]int64{}

	var total int64
	r.db.Model(&domain.LaboratoryOrder{}).Where("status = ?", "portfolio").Count(&total)
	result["total"] = total

	var over5Days int64
	r.db.Raw(`
		SELECT COUNT(DISTINCT lo.id)
		FROM laboratory_orders lo
		JOIN (
			SELECT laboratory_order_id, MAX(created_at) as portfolio_since
			FROM laboratory_order_statuses
			WHERE status = 'portfolio'
			GROUP BY laboratory_order_id
		) los ON los.laboratory_order_id = lo.id
		WHERE lo.status = 'portfolio'
		AND los.portfolio_since < NOW() - INTERVAL '5 days'
	`).Scan(&over5Days)
	result["over_five_days"] = over5Days

	var failedAttempts int64
	r.db.Raw(`
		SELECT COUNT(loc.id)
		FROM laboratory_order_calls loc
		JOIN laboratory_orders lo ON lo.id = loc.laboratory_order_id
		WHERE lo.status = 'portfolio'
		AND loc.result = 'no_answer'
	`).Scan(&failedAttempts)
	result["failed_attempts"] = failedAttempts

	var paymentPromises int64
	r.db.Raw(`
		SELECT COUNT(loc.id)
		FROM laboratory_order_calls loc
		JOIN laboratory_orders lo ON lo.id = loc.laboratory_order_id
		WHERE lo.status = 'portfolio'
		AND loc.result = 'payment_promise'
	`).Scan(&paymentPromises)
	result["payment_promises"] = paymentPromises

	return result, nil
}
