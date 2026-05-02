package domain

import "time"

func (Prescription) TableName() string { return "appointment_prescriptions" }

type Prescription struct {
	ID                      uint       `json:"id"                        gorm:"primaryKey;autoIncrement"`
	AppointmentID           *uint      `json:"appointment_id"            gorm:"column:appointment_id"`
	Date                    *time.Time `json:"date"`
	Document                string     `json:"document"`
	PatientName             string     `json:"patient_name"`
	RightSphere             string     `json:"right_sphere"`
	RightCylinder           string     `json:"right_cylinder"`
	RightAxis               string     `json:"right_axis"`
	RightAddition           string     `json:"right_addition"`
	RightHeight             string     `json:"right_height"`
	RightDistanceP          string     `json:"right_distance_p"`
	RightVisualAcuityFar    string     `json:"right_visual_acuity_far"`
	RightVisualAcuityNear   string     `json:"right_visual_acuity_near"`
	LeftSphere              string     `json:"left_sphere"`
	LeftCylinder            string     `json:"left_cylinder"`
	LeftAxis                string     `json:"left_axis"`
	LeftAddition            string     `json:"left_addition"`
	LeftHeight              string     `json:"left_height"`
	LeftDistanceP           string     `json:"left_distance_p"`
	LeftVisualAcuityFar     string     `json:"left_visual_acuity_far"`
	LeftVisualAcuityNear    string     `json:"left_visual_acuity_near"`
	CorrectionType          string     `json:"correction_type"           gorm:"type:varchar(50)"`
	UsageType               string     `json:"usage_type"                gorm:"type:varchar(50)"`
	Recommendation          string     `json:"recommendation"            gorm:"type:text"`
	Professional            string     `json:"professional"`
	Observation             string     `json:"observation"               gorm:"type:text"`
	Attachment              string     `json:"attachment"`
	AnnotationPaths         string     `json:"annotation_paths"          gorm:"type:text"`
	CreatedAt               time.Time  `json:"created_at"`
	UpdatedAt               time.Time  `json:"updated_at"`

	// Associations
	Appointment *Appointment `json:"appointment,omitempty" gorm:"foreignKey:AppointmentID"`
}

// PrescriptionRepository defines persistence operations for Prescription.
type PrescriptionRepository interface {
	GetByID(id uint) (*Prescription, error)
	GetByAppointmentID(appointmentID uint) (*Prescription, error)
	List(filters map[string]any, page, perPage int) ([]*Prescription, int64, error)
	ListByPatientID(patientID uint, page, perPage int) ([]*Prescription, int64, error)
	Create(p *Prescription) error
	Update(p *Prescription) error
	Delete(id uint) error
}
