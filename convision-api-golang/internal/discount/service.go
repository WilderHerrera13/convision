package discount

import (
	"errors"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// Service handles discount use-cases.
type Service struct {
	repo   domain.DiscountRepository
	db     *gorm.DB
	logger *zap.Logger
}

// NewService creates a new discount Service.
func NewService(repo domain.DiscountRepository, db *gorm.DB, logger *zap.Logger) *Service {
	return &Service{repo: repo, db: db, logger: logger}
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

type CreateInput struct {
	ProductID          *uint      `json:"product_id"`
	LensID             *uint      `json:"lens_id"`
	PatientID          *uint      `json:"patient_id"`
	UserID             uint       `json:"user_id"`
	DiscountPercentage float64    `json:"discount_percentage"  binding:"required"`
	OriginalPrice      float64    `json:"original_price"`
	DiscountedPrice    float64    `json:"discounted_price"`
	Reason             string     `json:"reason"`
	IsGlobal           bool       `json:"is_global"`
	ExpiryDate         *time.Time `json:"expiry_date"`
	AutoApprove        bool       `json:"-"`
	ApproverID         uint       `json:"-"`
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
	CurrentPage int                       `json:"current_page"`
	Data        []*domain.DiscountRequest `json:"data"`
	LastPage    int                       `json:"last_page"`
	PerPage     int                       `json:"per_page"`
	Total       int64                     `json:"total"`
}

// --- Methods ---

func (s *Service) List(filters map[string]any, page, perPage int) (*ListOutput, error) {
	page, perPage = clampPage(page, perPage)
	data, total, err := s.repo.List(s.db, filters, page, perPage)
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
	return s.repo.GetByID(s.db, id)
}

func (s *Service) Create(input CreateInput) (*domain.DiscountRequest, error) {
	if input.ProductID == nil && input.LensID != nil {
		input.ProductID = input.LensID
	}
	if input.DiscountPercentage <= 0 || input.DiscountPercentage > 100 {
		return nil, &domain.ErrValidation{Field: "discount_percentage", Message: "must be between 0.01 and 100"}
	}

	if input.OriginalPrice > 0 && input.DiscountedPrice == 0 {
		input.DiscountedPrice = input.OriginalPrice * (1 - input.DiscountPercentage/100)
	}

	var result *domain.DiscountRequest
	err := s.db.Transaction(func(tx *gorm.DB) error {
		status := domain.DiscountRequestStatusPending
		var approvedBy *uint
		var approvedAt *time.Time
		var approvalNotes string

		if input.AutoApprove {
			status = domain.DiscountRequestStatusApproved
			now := time.Now()
			approvedAt = &now
			if input.ApproverID != 0 {
				approvedBy = &input.ApproverID
			}
			approvalNotes = input.Reason
			if approvalNotes == "" {
				approvalNotes = "Aprobado por administrador durante la creación."
			}
		}

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
			Status:             status,
			ApprovedBy:         approvedBy,
			ApprovedAt:         approvedAt,
			ApprovalNotes:      approvalNotes,
		}
		if err := s.repo.Create(tx, d); err != nil {
			return err
		}
		fetched, err := s.repo.GetByID(tx, d.ID)
		if err != nil {
			return err
		}
		result = fetched
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *Service) Update(id uint, input CreateInput, callerID uint, callerRole domain.Role) (*domain.DiscountRequest, error) {
	if input.ProductID == nil && input.LensID != nil {
		input.ProductID = input.LensID
	}
	if input.DiscountPercentage <= 0 || input.DiscountPercentage > 100 {
		return nil, &domain.ErrValidation{Field: "discount_percentage", Message: "must be between 0.01 and 100"}
	}

	var result *domain.DiscountRequest
	err := s.db.Transaction(func(tx *gorm.DB) error {
		d, err := s.repo.GetByID(tx, id)
		if err != nil {
			return err
		}

		if callerRole != domain.RoleAdmin {
			if d.UserID != callerID {
				return &domain.ErrUnauthorized{Action: "solo el creador del descuento puede editarlo"}
			}
			if d.Status != domain.DiscountRequestStatusPending {
				return &domain.ErrUnauthorized{Action: "solo los descuentos pendientes pueden ser editados"}
			}
		}

		existingOriginalPrice := d.OriginalPrice

		d.ProductID = input.ProductID
		d.PatientID = input.PatientID
		d.DiscountPercentage = input.DiscountPercentage
		d.OriginalPrice = input.OriginalPrice
		d.DiscountedPrice = input.DiscountedPrice
		d.Reason = input.Reason
		d.IsGlobal = input.IsGlobal
		d.ExpiryDate = input.ExpiryDate

		if d.DiscountedPrice == 0 && d.DiscountPercentage > 0 {
			basePrice := d.OriginalPrice
			if basePrice == 0 {
				basePrice = existingOriginalPrice
				d.OriginalPrice = existingOriginalPrice
			}
			d.DiscountedPrice = basePrice * (1 - d.DiscountPercentage/100)
		}

		if err := s.repo.Update(tx, d); err != nil {
			return err
		}
		result, err = s.repo.GetByID(tx, id)
		return err
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *Service) Delete(id uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if _, err := s.repo.GetByID(tx, id); err != nil {
			return err
		}
		return s.repo.Delete(tx, id)
	})
}

func (s *Service) Approve(id uint, approverID uint, input ApproveInput) (*domain.DiscountRequest, error) {
	var result *domain.DiscountRequest
	err := s.db.Transaction(func(tx *gorm.DB) error {
		d, err := s.repo.GetByID(tx, id)
		if err != nil {
			return err
		}
		if d.Status != domain.DiscountRequestStatusPending {
			return &domain.ErrValidation{Field: "status", Message: "only pending requests can be approved"}
		}
		now := time.Now()
		d.Status = domain.DiscountRequestStatusApproved
		d.ApprovedBy = &approverID
		d.ApprovedAt = &now
		d.ApprovalNotes = input.ApprovalNotes
		if input.ExpiryDate != nil {
			d.ExpiryDate = input.ExpiryDate
		}

		if err := s.repo.Update(tx, d); err != nil {
			return err
		}
		result, err = s.repo.GetByID(tx, id)
		return err
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *Service) Reject(id uint, reason string) (*domain.DiscountRequest, error) {
	var result *domain.DiscountRequest
	err := s.db.Transaction(func(tx *gorm.DB) error {
		d, err := s.repo.GetByID(tx, id)
		if err != nil {
			return err
		}
		if d.Status != domain.DiscountRequestStatusPending {
			return &domain.ErrValidation{Field: "status", Message: "only pending requests can be rejected"}
		}
		d.Status = domain.DiscountRequestStatusRejected
		d.RejectionReason = reason

		if err := s.repo.Update(tx, d); err != nil {
			return err
		}
		result, err = s.repo.GetByID(tx, id)
		return err
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *Service) ListActive(productID, patientID *uint) ([]*domain.DiscountRequest, error) {
	if productID == nil {
		return nil, &domain.ErrValidation{Field: "product_id", Message: "required"}
	}
	return s.repo.GetActiveForProductWithPatient(s.db, *productID, patientID)
}

func (s *Service) ListAllActiveForProduct(productID uint) ([]*domain.DiscountRequest, error) {
	return s.repo.GetActiveForProduct(s.db, productID)
}

// GetBestDiscount returns the best applicable discount for a product/lens.
// When patientID is provided, patient-specific discounts take priority over global ones.
func (s *Service) GetBestDiscount(lensID, patientID *uint) (*domain.DiscountRequest, error) {
	if lensID == nil {
		return nil, nil
	}
	best, err := s.repo.GetBestForProduct(s.db, *lensID, patientID)
	if err != nil {
		var notFound *domain.ErrNotFound
		if errors.As(err, &notFound) {
			return nil, nil
		}
		return nil, err
	}
	return best, nil
}
