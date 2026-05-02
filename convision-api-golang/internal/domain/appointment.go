package domain

import (
	"time"

	"gorm.io/gorm"
)

// AppointmentStatus enumerates valid appointment lifecycle states.
type AppointmentStatus string

const (
	AppointmentStatusScheduled  AppointmentStatus = "scheduled"
	AppointmentStatusInProgress AppointmentStatus = "in_progress"
	AppointmentStatusPaused     AppointmentStatus = "paused"
	AppointmentStatusCompleted  AppointmentStatus = "completed"
	AppointmentStatusCancelled  AppointmentStatus = "cancelled"
)

// ConsultationType enumerates the clinical typification values captured in the
// specialist management report ("Informe de gestión").
type ConsultationType string

const (
	ConsultationTypeEffective        ConsultationType = "effective"
	ConsultationTypeFormulaSale      ConsultationType = "formula_sale"
	ConsultationTypeIneffective      ConsultationType = "ineffective"
	ConsultationTypeFollowUp         ConsultationType = "follow_up"
	ConsultationTypeWarrantyFollowUp ConsultationType = "warranty_follow_up"
)

// IsValidConsultationType reports whether v is a recognized ConsultationType.
func IsValidConsultationType(v string) bool {
	switch ConsultationType(v) {
	case ConsultationTypeEffective,
		ConsultationTypeFormulaSale,
		ConsultationTypeIneffective,
		ConsultationTypeFollowUp,
		ConsultationTypeWarrantyFollowUp:
		return true
	}
	return false
}

// Appointment represents a scheduled patient visit.
type Appointment struct {
	ID                      uint              `json:"id"                        gorm:"primaryKey;autoIncrement"`
	BranchID                uint              `json:"branch_id"                 gorm:"column:branch_id;not null;index"`
	PatientID               uint              `json:"patient_id"                gorm:"not null;index"`
	SpecialistID            *uint             `json:"specialist_id"             gorm:"column:specialist_id;index"`
	ReceptionistID          *uint             `json:"receptionist_id"           gorm:"column:receptionist_id;index"`
	TakenByID               *uint             `json:"taken_by_id"               gorm:"column:taken_by_id"`
	ScheduledAt             *time.Time        `json:"scheduled_at"`
	AppointmentDate         *time.Time        `json:"appointment_date"`
	AppointmentTime         string            `json:"appointment_time"`
	Duration                int               `json:"duration"                  gorm:"default:30"`
	AppointmentTypeID       *uint             `json:"appointment_type_id"       gorm:"column:appointment_type_id"`
	Status                  AppointmentStatus `json:"status"                    gorm:"type:varchar(20);not null;default:'scheduled'"`
	Reason                  string            `json:"reason"                    gorm:"type:text"`
	Notes                   string            `json:"notes"                     gorm:"type:text"`
	IsBilled                bool              `json:"is_billed"                 gorm:"not null;default:false"`
	BilledAt                *time.Time        `json:"billed_at"`
	SaleID                  *uint             `json:"sale_id"                   gorm:"column:sale_id"`
	PaymentStatus           string            `json:"payment_status"            gorm:"type:varchar(20)"`
	TotalAmount             float64           `json:"total_amount"              gorm:"type:decimal(12,2)"`
	PaymentMethod           string            `json:"payment_method"            gorm:"type:varchar(50)"`
	LeftEyeAnnotationPaths  string            `json:"left_eye_annotation_paths"  gorm:"type:text"`
	LeftEyeAnnotationImage  string            `json:"left_eye_annotation_image"  gorm:"type:text"`
	RightEyeAnnotationPaths string            `json:"right_eye_annotation_paths" gorm:"type:text"`
	RightEyeAnnotationImage string            `json:"right_eye_annotation_image" gorm:"type:text"`
	LensAnnotationImage     string            `json:"lens_annotation_image"      gorm:"type:text"`
	LensAnnotationPaths     string            `json:"lens_annotation_paths"      gorm:"type:text"`
	ConsultationType        string            `json:"consultation_type"          gorm:"column:consultation_type;type:varchar(30)"`
	ReportNotes             string            `json:"report_notes"               gorm:"column:report_notes;type:text"`
	CreatedAt               time.Time         `json:"created_at"`
	UpdatedAt               time.Time         `json:"updated_at"`

	// Associations
	Patient      *Patient `json:"patient,omitempty"      gorm:"foreignKey:PatientID"`
	Branch       *Branch  `json:"branch,omitempty"       gorm:"foreignKey:BranchID"`
	Specialist   *User    `json:"specialist,omitempty"   gorm:"foreignKey:SpecialistID"`
	Receptionist *User    `json:"receptionist,omitempty" gorm:"foreignKey:ReceptionistID"`
	TakenBy      *User    `json:"taken_by,omitempty"     gorm:"foreignKey:TakenByID"`
}

// SpecialistReportSummary holds aggregated consultation counts for one specialist
// within a date range (used by the consolidated admin report).
type SpecialistReportSummary struct {
	SpecialistID     uint   `json:"specialist_id"`
	SpecialistName   string `json:"specialist_name"`
	Effective        int64  `json:"effective"`
	FormulaSale      int64  `json:"formula_sale"`
	Ineffective      int64  `json:"ineffective"`
	FollowUp         int64  `json:"follow_up"`
	WarrantyFollowUp int64  `json:"warranty_follow_up"`
	Total            int64  `json:"total"`
	Observation      string `json:"observation"`
}

// AppointmentRepository defines persistence operations for Appointment.
type AppointmentRepository interface {
	GetByID(db *gorm.DB, id uint) (*Appointment, error)
	GetByPatientID(db *gorm.DB, patientID uint, page, perPage int) ([]*Appointment, int64, error)
	GetBySpecialistID(db *gorm.DB, specialistID uint, page, perPage int) ([]*Appointment, int64, error)
	Create(db *gorm.DB, a *Appointment) error
	Update(db *gorm.DB, a *Appointment) error
	Delete(db *gorm.DB, id uint) error
	List(db *gorm.DB, filters map[string]any, page, perPage int) ([]*Appointment, int64, error)
	SaveManagementReport(db *gorm.DB, id uint, consultationType, reportNotes string) error
	GetConsolidatedReport(db *gorm.DB, from, to string, specialistIDs []uint, branchID *uint) ([]*SpecialistReportSummary, error)
	ExistsByPatientAndDate(db *gorm.DB, patientID uint, specialistID *uint, date time.Time) (bool, error)
	HasConflictForSpecialist(db *gorm.DB, specialistID uint, scheduledAt time.Time, excludeID uint, durationMins int) (bool, error)
	GetBookedTimesForSpecialist(db *gorm.DB, specialistID uint, date time.Time) ([]string, error)
}
