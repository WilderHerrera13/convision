package domain

import "time"

// AppointmentStatus enumerates valid appointment lifecycle states.
type AppointmentStatus string

const (
	AppointmentStatusScheduled  AppointmentStatus = "scheduled"
	AppointmentStatusInProgress AppointmentStatus = "in_progress"
	AppointmentStatusPaused     AppointmentStatus = "paused"
	AppointmentStatusCompleted  AppointmentStatus = "completed"
	AppointmentStatusCancelled  AppointmentStatus = "cancelled"
)

// Appointment represents a scheduled patient visit.
type Appointment struct {
	ID                      uint              `json:"id"                        gorm:"primaryKey;autoIncrement"`
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
	CreatedAt               time.Time         `json:"created_at"`
	UpdatedAt               time.Time         `json:"updated_at"`

	// Associations
	Patient      *Patient      `json:"patient,omitempty"      gorm:"foreignKey:PatientID"`
	Specialist   *User         `json:"specialist,omitempty"   gorm:"foreignKey:SpecialistID"`
	Receptionist *User         `json:"receptionist,omitempty" gorm:"foreignKey:ReceptionistID"`
	TakenBy      *User         `json:"taken_by,omitempty"     gorm:"foreignKey:TakenByID"`
	Prescription *Prescription `json:"prescription,omitempty" gorm:"foreignKey:AppointmentID"`
}

// AppointmentRepository defines persistence operations for Appointment.
type AppointmentRepository interface {
	GetByID(id uint) (*Appointment, error)
	GetByPatientID(patientID uint, page, perPage int) ([]*Appointment, int64, error)
	GetBySpecialistID(specialistID uint, page, perPage int) ([]*Appointment, int64, error)
	Create(a *Appointment) error
	Update(a *Appointment) error
	Delete(id uint) error
	List(filters map[string]any, page, perPage int) ([]*Appointment, int64, error)
}
