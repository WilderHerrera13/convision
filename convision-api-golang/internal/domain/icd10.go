package domain

import (
	"time"

	"gorm.io/gorm"
)

// Icd10Code represents one entry of the real ICD-10 (CIE-10) diagnosis
// catalog. Replaces the free-text CIE-10 inputs previously accepted on
// Diagnosis.PrimaryCode/Related*Code (see
// docs/GAP_ANALYSIS_HISTORIA_CLINICA_JARVIS.md, section 03/08).
//
// The catalog is seeded with the WHO ICD-10 chapter most relevant to an
// optometry practice (Chapter VII — Diseases of the eye and adnexa, H00-H59)
// plus the handful of Z-chapter codes used for routine/screening visits.
// Codes are stored without the decimal point (e.g. "H520", matching the
// notation already used by the frontend's FREQUENT list in DiagnosisTab.tsx),
// consistent with how DANE/MinSalud CIE-10 tables are commonly distributed.
type Icd10Code struct {
	ID          uint      `json:"id"          gorm:"primaryKey;autoIncrement"`
	Code        string    `json:"code"        gorm:"type:varchar(10);not null;uniqueIndex"`
	Description string    `json:"description" gorm:"type:text;not null"`
	Chapter     string    `json:"chapter"     gorm:"type:varchar(10)"`
	IsActive    bool      `json:"is_active"   gorm:"not null;default:true"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TableName overrides the default pluralized name to keep the existing
// "icd10_codes" table name explicit regardless of GORM naming strategy.
func (Icd10Code) TableName() string { return "icd10_codes" }

// Icd10CodeFilter holds query parameters for searching the ICD-10 catalog.
type Icd10CodeFilter struct {
	Pagination
	Search string `form:"search"`
}

// Icd10CodeRepository defines persistence operations for the ICD-10 catalog.
type Icd10CodeRepository interface {
	// List returns codes matching Search (ILIKE on code prefix or description),
	// active-only, ordered by code. Used by the clinical-form autocomplete.
	List(db *gorm.DB, f Icd10CodeFilter) ([]*Icd10Code, int64, error)
	// GetByCode returns a single active code, used to validate
	// Diagnosis.PrimaryCode/Related*Code against the real catalog.
	GetByCode(db *gorm.DB, code string) (*Icd10Code, error)
}
