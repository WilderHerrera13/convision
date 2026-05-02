package postgres

import (
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

var quoteFilterAllowlist = map[string]bool{
	"patient_id": true,
	"status":     true,
	"created_by": true,
}

// QuoteRepository is the PostgreSQL-backed implementation of domain.QuoteRepository.
type QuoteRepository struct{}

// NewQuoteRepository creates a new QuoteRepository.
func NewQuoteRepository() *QuoteRepository {
	return &QuoteRepository{}
}

func (r *QuoteRepository) withRelations(q *gorm.DB) *gorm.DB {
	return q.
		Preload("Patient").
		Preload("CreatedByUser").
		Preload("Items").
		Preload("Items.Product")
}

func (r *QuoteRepository) GetByID(db *gorm.DB, id uint) (*domain.Quote, error) {
	var q domain.Quote
	err := r.withRelations(db).First(&q, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "quote"}
		}
		return nil, err
	}
	return &q, nil
}

func (r *QuoteRepository) GetByQuoteNumber(db *gorm.DB, number string) (*domain.Quote, error) {
	var q domain.Quote
	err := r.withRelations(db).Where("quote_number = ?", number).First(&q).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &domain.ErrNotFound{Resource: "quote"}
		}
		return nil, err
	}
	return &q, nil
}

func (r *QuoteRepository) Create(db *gorm.DB, q *domain.Quote) error {
	// Use a temporary unique placeholder to satisfy NOT NULL + uniqueIndex
	q.QuoteNumber = fmt.Sprintf("TEMP-%d", time.Now().UnixNano())
	if err := db.Create(q).Error; err != nil {
		return err
	}
	// Now set the real number using the generated ID
	q.QuoteNumber = fmt.Sprintf("COT-%04d", q.ID)
	return db.Model(q).Update("quote_number", q.QuoteNumber).Error
}

func (r *QuoteRepository) Update(db *gorm.DB, q *domain.Quote) error {
	return db.Model(q).Updates(map[string]any{
		"patient_id":      q.PatientID,
		"subtotal":        q.Subtotal,
		"tax_amount":      q.TaxAmount,
		"discount_amount": q.DiscountAmount,
		"total":           q.Total,
		"status":          q.Status,
		"expiration_date": q.ExpirationDate,
		"notes":           q.Notes,
		"created_by":      q.CreatedBy,
	}).Error
}

func (r *QuoteRepository) Delete(db *gorm.DB, id uint) error {
	return db.Delete(&domain.Quote{}, id).Error
}

func (r *QuoteRepository) List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*domain.Quote, int64, error) {
	var quotes []*domain.Quote
	var total int64

	q := db.Model(&domain.Quote{})
	for field, value := range filters {
		if !quoteFilterAllowlist[field] {
			continue
		}
		q = q.Where("quotes."+field+" = ?", value)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	err := r.withRelations(q).
		Offset(offset).
		Limit(perPage).
		Order("quotes.id desc").
		Find(&quotes).Error
	if err != nil {
		return nil, 0, err
	}

	return quotes, total, nil
}
