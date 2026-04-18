package discount

import (
	"time"

	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
)

// Service handles discount use-cases.
type Service struct {
	repo   domain.DiscountRepository
	logger *zap.Logger
}

// NewService creates a new discount Service.
func NewService(repo domain.DiscountRepository, logger *zap.Logger) *Service {
	return &Service{repo: repo, logger: logger}
}

// --- Pagination helpers ---

func calcLastPage(total int64, perPage int) int {
	if total == 0 {
		return 1
	}
	lp := int(total) / perPage
	if int(total)%perPage != 0 {
		lp++
	}
	return lp
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

// --- DTOs ---

// CreateInput holds validated fields for creating a discount request.
type CreateInput struct {
	ProductID          *uint      `json:"product_id"`
	PatientID          *uint      `json:"patient_id"`
	UserID             uint       `json:"user_id"`
	DiscountPercentage float64    `json:"discount_percentage"  binding:"required"`
	OriginalPrice      float64    `json:"original_price"`
	DiscountedPrice    float64    `json:"discounted_price"`
	Reason             string     `json:"reason"`
	IsGlobal           bool       `json:"is_global"`
	ExpiryDate         *time.Time `json:"expiry_date"`
}

// ApproveInput holds fields for approving a discount request.
type ApproveInput struct {
	ApprovalNotes string     `json:"approval_notes"`
	ExpiryDate    *time.Time `json:"expiry_date"`
}

// RejectInput holds fields for rejecting a discount request.
type RejectInput struct {
	RejectionReason string `json:"rejection_reason" binding:"required"`
}

// ListOutput is the paginated discount response.
type ListOutput struct {
	CurrentPage int                        `json:"current_page"`
	Data        []*domain.DiscountRequest  `json:"data"`
	LastPage    int                        `json:"last_page"`
	PerPage     int                        `json:"per_page"`
	Total       int64                      `json:"total"`
}

// --- Methods ---

func (s *Service) List(filters map[string]any, page, perPage int) (*ListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.repo.List(filters, page, perPage)
	if err != nil {
		return nil, err
	}
	return &ListOutput{
		CurrentPage: page,
		Data:        data,
		LastPage:    calcLastPage(total, perPage),
		PerPage:     perPage,
		Total:       total,
	}, nil
}

func (s *Service) GetByID(id uint) (*domain.DiscountRequest, error) {
	return s.repo.GetByID(id)
}

func (s *Service) Create(input CreateInput) (*domain.DiscountRequest, error) {
	d := &domain.DiscountRequest{
		ProductID:          input.ProductID,
		PatientID:          input.PatientID,
		UserID:             input.UserID,
		DiscountPercentage: input.DiscountPercentage,
		OriginalPrice:      input.OriginalPrice,
		DiscountedPrice:    input.DiscountedPrice,
		Reason:             input.Reason,
		IsGlobal:           input.IsGlobal,
		ExpiryDate:         input.ExpiryDate,
		Status:             domain.DiscountRequestStatusPending,
	}
	if err := s.repo.Create(d); err != nil {
		return nil, err
	}
	return s.repo.GetByID(d.ID)
}

func (s *Service) Update(id uint, input CreateInput) (*domain.DiscountRequest, error) {
	d, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	d.ProductID = input.ProductID
	d.PatientID = input.PatientID
	d.DiscountPercentage = input.DiscountPercentage
	d.OriginalPrice = input.OriginalPrice
	d.DiscountedPrice = input.DiscountedPrice
	d.Reason = input.Reason
	d.IsGlobal = input.IsGlobal
	d.ExpiryDate = input.ExpiryDate

	if err := s.repo.Update(d); err != nil {
		return nil, err
	}
	return s.repo.GetByID(id)
}

func (s *Service) Delete(id uint) error {
	if _, err := s.repo.GetByID(id); err != nil {
		return err
	}
	return s.repo.Delete(id)
}

func (s *Service) Approve(id uint, approverID uint, input ApproveInput) (*domain.DiscountRequest, error) {
	d, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if d.Status != domain.DiscountRequestStatusPending {
		return nil, &domain.ErrValidation{Field: "status", Message: "only pending requests can be approved"}
	}
	now := time.Now()
	d.Status = domain.DiscountRequestStatusApproved
	d.ApprovedBy = &approverID
	d.ApprovedAt = &now
	d.ApprovalNotes = input.ApprovalNotes
	if input.ExpiryDate != nil {
		d.ExpiryDate = input.ExpiryDate
	}

	if err := s.repo.Update(d); err != nil {
		return nil, err
	}
	return s.repo.GetByID(id)
}

func (s *Service) Reject(id uint, reason string) (*domain.DiscountRequest, error) {
	d, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if d.Status != domain.DiscountRequestStatusPending {
		return nil, &domain.ErrValidation{Field: "status", Message: "only pending requests can be rejected"}
	}
	d.Status = domain.DiscountRequestStatusRejected
	d.RejectionReason = reason

	if err := s.repo.Update(d); err != nil {
		return nil, err
	}
	return s.repo.GetByID(id)
}

func (s *Service) ListActive(productID, patientID *uint) ([]*domain.DiscountRequest, error) {
	if productID == nil {
		return nil, &domain.ErrValidation{Field: "product_id", Message: "required"}
	}
	return s.repo.GetActiveForProduct(*productID)
}
