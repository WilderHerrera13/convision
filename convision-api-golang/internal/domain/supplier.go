package domain

import "time"

// Supplier represents a vendor/provider for lenses and products.
type Supplier struct {
	ID                    uint      `json:"id"                      gorm:"primaryKey;autoIncrement"`
	Name                  string    `json:"name"                    gorm:"not null"`
	NIT                   string    `json:"nit"                     gorm:"column:nit;index"`
	LegalName             string    `json:"legal_name"`
	LegalRepresentative   string    `json:"legal_representative"`
	LegalRepresentativeID string    `json:"legal_representative_id"`
	PersonType            string    `json:"person_type"             gorm:"type:varchar(30)"`
	TaxResponsibility     string    `json:"tax_responsibility"      gorm:"type:varchar(50)"`
	RegimeType            string    `json:"regime_type"             gorm:"type:varchar(30)"`
	DocumentType          string    `json:"document_type"           gorm:"type:varchar(30)"`
	CommercialName        string    `json:"commercial_name"`
	ResponsiblePerson     string    `json:"responsible_person"`
	Address               string    `json:"address"`
	Phone                 string    `json:"phone"`
	Email                 string    `json:"email"`
	CityID                *uint     `json:"city_id"                 gorm:"column:city_id"`
	State                 string    `json:"state"`
	Country               string    `json:"country"`
	PostalCode            string    `json:"postal_code"`
	Website               string    `json:"website"`
	BankName              string    `json:"bank_name"`
	BankAccountType       string    `json:"bank_account_type"       gorm:"type:varchar(30)"`
	BankAccountNumber     string    `json:"bank_account_number"`
	InvimaRegistration    string    `json:"invima_registration"`
	FiscalResponsibility  string    `json:"fiscal_responsibility"   gorm:"type:text"`
	IsSelfWithholding     bool      `json:"is_self_withholding"     gorm:"not null;default:false"`
	IsVATAgent            bool      `json:"is_vat_agent"            gorm:"column:is_vat_agent;not null;default:false"`
	IsGreatContributor    bool      `json:"is_great_contributor"    gorm:"not null;default:false"`
	Notes                 string    `json:"notes"                   gorm:"type:text"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`

	City *City `json:"city,omitempty" gorm:"foreignKey:CityID"`
}

// SupplierRepository defines persistence operations for Supplier.
type SupplierRepository interface {
	GetByID(id uint) (*Supplier, error)
	Create(s *Supplier) error
	Update(s *Supplier) error
	Delete(id uint) error
	List(filters map[string]any, page, perPage int) ([]*Supplier, int64, error)
}
