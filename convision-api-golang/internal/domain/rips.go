package domain

import (
	"time"

	"gorm.io/gorm"
)

// RipsStatus enumerates the lifecycle of a RIPS record.
type RipsStatus string

const (
	// RipsStatusPendingInvoice means the JSON has been built from the signed
	// clinical record but is not yet linked to a real Factura Electrónica de
	// Venta (FEV) — RIPS must go out attached to a real invoice (CUFE + signed
	// XML), which depends on convision-invoicing-api being operational (see
	// docs/GAP_ANALYSIS_FACTURACION_JARVIS.md, P0 #1).
	RipsStatusPendingInvoice RipsStatus = "pending_invoice"
	// RipsStatusPendingTransmission means an invoice number has been attached
	// and the record is ready to send once a real transmission mode exists.
	RipsStatusPendingTransmission RipsStatus = "pending_transmission"
	// RipsStatusSent means the transmitter reported success (only reachable
	// today in "local" mock mode — see internal/platform/rips).
	RipsStatusSent RipsStatus = "sent"
	// RipsStatusError means the transmitter reported failure.
	RipsStatusError RipsStatus = "error"
)

// RipsRecord is one RIPS (Resolución 2275/2023) transaction built from a
// signed ClinicalRecord. Payload holds the full JSON transaction object
// (numDocumentoIdObligado/numFactura/usuarios[]/servicios.consultas[]) ready
// to send to the FEV-RIPS validator once linked to a real invoice.
type RipsRecord struct {
	ID               uint       `json:"id"                gorm:"primaryKey;autoIncrement"`
	ClinicalRecordID uint       `json:"clinical_record_id" gorm:"not null;uniqueIndex"`
	AppointmentID    uint       `json:"appointment_id"    gorm:"not null;index"`
	PatientID        uint       `json:"patient_id"        gorm:"not null;index"`
	InvoiceNumber    *string    `json:"invoice_number"    gorm:"type:varchar(30)"`
	Payload          string     `json:"payload"           gorm:"type:jsonb;not null"`
	Status           RipsStatus `json:"status"            gorm:"type:varchar(30);not null;default:'pending_invoice'"`
	TransmissionMode string     `json:"transmission_mode" gorm:"type:varchar(20);not null;default:'none'"`
	TransmittedAt    *time.Time `json:"transmitted_at"`
	ErrorMessage     string     `json:"error_message"     gorm:"type:text"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

// TableName overrides the pluralized default to keep the table name explicit.
func (RipsRecord) TableName() string { return "rips_records" }

// RipsRecordFilter holds query parameters for listing RIPS records (admin view).
type RipsRecordFilter struct {
	Pagination
	Status    string `form:"status"`
	PatientID *uint  `form:"patient_id"`
}

// RipsRecordRepository defines persistence operations for RipsRecord.
type RipsRecordRepository interface {
	GetByID(db *gorm.DB, id uint) (*RipsRecord, error)
	GetByClinicalRecordID(db *gorm.DB, clinicalRecordID uint) (*RipsRecord, error)
	Create(db *gorm.DB, r *RipsRecord) error
	Update(db *gorm.DB, r *RipsRecord) error
	List(db *gorm.DB, f RipsRecordFilter) ([]*RipsRecord, int64, error)
}
