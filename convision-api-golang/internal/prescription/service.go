package prescription

import (
	"math"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// Service handles prescription use-cases.
type Service struct {
	repo   domain.PrescriptionRepository
	logger *zap.Logger
}

// NewService creates a new prescription Service.
func NewService(repo domain.PrescriptionRepository, logger *zap.Logger) *Service {
	return &Service{repo: repo, logger: logger}
}

// CreateInput holds validated fields for creating a prescription.
type CreateInput struct {
	AppointmentID         *uint  `json:"appointment_id"`
	Date                  string `json:"date"`
	Document              string `json:"document"`
	PatientName           string `json:"patient_name"`
	RightSphere           string `json:"right_sphere"`
	RightCylinder         string `json:"right_cylinder"`
	RightAxis             string `json:"right_axis"`
	RightAddition         string `json:"right_addition"`
	RightHeight           string `json:"right_height"`
	RightDistanceP        string `json:"right_distance_p"`
	RightVisualAcuityFar  string `json:"right_visual_acuity_far"`
	RightVisualAcuityNear string `json:"right_visual_acuity_near"`
	LeftSphere            string `json:"left_sphere"`
	LeftCylinder          string `json:"left_cylinder"`
	LeftAxis              string `json:"left_axis"`
	LeftAddition          string `json:"left_addition"`
	LeftHeight            string `json:"left_height"`
	LeftDistanceP         string `json:"left_distance_p"`
	LeftVisualAcuityFar   string `json:"left_visual_acuity_far"`
	LeftVisualAcuityNear  string `json:"left_visual_acuity_near"`
	CorrectionType        string `json:"correction_type"`
	UsageType             string `json:"usage_type"`
	Recommendation        string `json:"recommendation"`
	Professional          string `json:"professional"`
	Observation           string `json:"observation"`
	Attachment            string `json:"attachment"`
}

// UpdateInput holds validated fields for updating a prescription (all optional).
type UpdateInput struct {
	AppointmentID         *uint  `json:"appointment_id"`
	Date                  string `json:"date"`
	Document              string `json:"document"`
	PatientName           string `json:"patient_name"`
	RightSphere           string `json:"right_sphere"`
	RightCylinder         string `json:"right_cylinder"`
	RightAxis             string `json:"right_axis"`
	RightAddition         string `json:"right_addition"`
	RightHeight           string `json:"right_height"`
	RightDistanceP        string `json:"right_distance_p"`
	RightVisualAcuityFar  string `json:"right_visual_acuity_far"`
	RightVisualAcuityNear string `json:"right_visual_acuity_near"`
	LeftSphere            string `json:"left_sphere"`
	LeftCylinder          string `json:"left_cylinder"`
	LeftAxis              string `json:"left_axis"`
	LeftAddition          string `json:"left_addition"`
	LeftHeight            string `json:"left_height"`
	LeftDistanceP         string `json:"left_distance_p"`
	LeftVisualAcuityFar   string `json:"left_visual_acuity_far"`
	LeftVisualAcuityNear  string `json:"left_visual_acuity_near"`
	CorrectionType        string `json:"correction_type"`
	UsageType             string `json:"usage_type"`
	Recommendation        string `json:"recommendation"`
	Professional          string `json:"professional"`
	Observation           string `json:"observation"`
	Attachment            string `json:"attachment"`
}

// ListOutput holds paginated prescription results.
type ListOutput struct {
	Data        []*domain.Prescription `json:"data"`
	Total       int64                  `json:"total"`
	CurrentPage int                    `json:"current_page"`
	LastPage    int                    `json:"last_page"`
	PerPage     int                    `json:"per_page"`
}

func clampPage(page, perPage int) (int, int) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 15
	}
	return page, perPage
}

// GetByID returns a single prescription by ID.
func (s *Service) GetByID(db *gorm.DB, id uint) (*domain.Prescription, error) {
	return s.repo.GetByID(db, id)
}

// List returns paginated prescriptions with optional filters.
func (s *Service) List(db *gorm.DB, filters map[string]any, page, perPage int) (*ListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.repo.List(db, filters, page, perPage)
	if err != nil {
		return nil, err
	}
	lastPage := int(math.Ceil(float64(total) / float64(perPage)))
	if lastPage < 1 {
		lastPage = 1
	}
	return &ListOutput{Data: data, Total: total, CurrentPage: page, LastPage: lastPage, PerPage: perPage}, nil
}

// ListByPatient returns paginated prescriptions for a given patient (via appointments).
func (s *Service) ListByPatient(db *gorm.DB, patientID uint, page, perPage int) (*ListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.repo.ListByPatientID(db, patientID, page, perPage)
	if err != nil {
		return nil, err
	}
	lastPage := int(math.Ceil(float64(total) / float64(perPage)))
	if lastPage < 1 {
		lastPage = 1
	}
	return &ListOutput{Data: data, Total: total, CurrentPage: page, LastPage: lastPage, PerPage: perPage}, nil
}

// Create creates a new prescription.
func (s *Service) Create(db *gorm.DB, input CreateInput) (*domain.Prescription, error) {
	p := &domain.Prescription{
		AppointmentID:         input.AppointmentID,
		Document:              input.Document,
		PatientName:           input.PatientName,
		RightSphere:           input.RightSphere,
		RightCylinder:         input.RightCylinder,
		RightAxis:             input.RightAxis,
		RightAddition:         input.RightAddition,
		RightHeight:           input.RightHeight,
		RightDistanceP:        input.RightDistanceP,
		RightVisualAcuityFar:  input.RightVisualAcuityFar,
		RightVisualAcuityNear: input.RightVisualAcuityNear,
		LeftSphere:            input.LeftSphere,
		LeftCylinder:          input.LeftCylinder,
		LeftAxis:              input.LeftAxis,
		LeftAddition:          input.LeftAddition,
		LeftHeight:            input.LeftHeight,
		LeftDistanceP:         input.LeftDistanceP,
		LeftVisualAcuityFar:   input.LeftVisualAcuityFar,
		LeftVisualAcuityNear:  input.LeftVisualAcuityNear,
		CorrectionType:        input.CorrectionType,
		UsageType:             input.UsageType,
		Recommendation:        input.Recommendation,
		Professional:          input.Professional,
		Observation:           input.Observation,
		Attachment:            input.Attachment,
	}

	if input.Date != "" {
		t, err := time.Parse("2006-01-02", input.Date)
		if err == nil {
			p.Date = &t
		}
	}

	if err := s.repo.Create(db, p); err != nil {
		return nil, err
	}

	s.logger.Info("prescription created", zap.Uint("prescription_id", p.ID))
	return s.repo.GetByID(db, p.ID)
}

// Update updates an existing prescription.
func (s *Service) Update(db *gorm.DB, id uint, input UpdateInput) (*domain.Prescription, error) {
	p, err := s.repo.GetByID(db, id)
	if err != nil {
		return nil, err
	}

	if input.AppointmentID != nil {
		p.AppointmentID = input.AppointmentID
	}
	if input.Document != "" {
		p.Document = input.Document
	}
	if input.PatientName != "" {
		p.PatientName = input.PatientName
	}
	if input.Date != "" {
		t, err := time.Parse("2006-01-02", input.Date)
		if err == nil {
			p.Date = &t
		}
	}
	p.RightSphere = input.RightSphere
	p.RightCylinder = input.RightCylinder
	p.RightAxis = input.RightAxis
	p.RightAddition = input.RightAddition
	p.RightHeight = input.RightHeight
	p.RightDistanceP = input.RightDistanceP
	p.RightVisualAcuityFar = input.RightVisualAcuityFar
	p.RightVisualAcuityNear = input.RightVisualAcuityNear
	p.LeftSphere = input.LeftSphere
	p.LeftCylinder = input.LeftCylinder
	p.LeftAxis = input.LeftAxis
	p.LeftAddition = input.LeftAddition
	p.LeftHeight = input.LeftHeight
	p.LeftDistanceP = input.LeftDistanceP
	p.LeftVisualAcuityFar = input.LeftVisualAcuityFar
	p.LeftVisualAcuityNear = input.LeftVisualAcuityNear
	if input.CorrectionType != "" {
		p.CorrectionType = input.CorrectionType
	}
	if input.UsageType != "" {
		p.UsageType = input.UsageType
	}
	if input.Recommendation != "" {
		p.Recommendation = input.Recommendation
	}
	if input.Professional != "" {
		p.Professional = input.Professional
	}
	if input.Observation != "" {
		p.Observation = input.Observation
	}
	if input.Attachment != "" {
		p.Attachment = input.Attachment
	}

	if err := s.repo.Update(db, p); err != nil {
		return nil, err
	}

	s.logger.Info("prescription updated", zap.Uint("prescription_id", p.ID))
	return s.repo.GetByID(db, p.ID)
}

// Delete removes a prescription by ID.
func (s *Service) Delete(db *gorm.DB, id uint) error {
	if _, err := s.repo.GetByID(db, id); err != nil {
		return err
	}
	return s.repo.Delete(db, id)
}
