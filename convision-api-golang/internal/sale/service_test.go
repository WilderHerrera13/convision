package sale

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap/zaptest"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/testutil/mocks"
)

// float64Ptr and intPtr are small helpers to build pointer literals in tests.
func float64Ptr(v float64) *float64 { return &v }
func intPtr(v int) *int             { return &v }

// buildService builds a sale.Service with mocked repositories, wiring only
// the dependencies exercised by populateRxFromAppointment/createLabOrderIfNeeded.
// Dependencies never touched by those code paths (saleRepo, adjRepo,
// productRepo, itemRepo, movementRepo, promotionRepo, patientRepo) are passed
// as nil interfaces — valid in Go as long as no method is invoked on them.
func buildService(t *testing.T,
	labOrderRepo *mocks.MockLaboratoryOrderRepository,
	labRepo *mocks.MockLaboratoryRepository,
	appointmentRepo *mocks.MockAppointmentRepository,
	branchRepo *mocks.MockBranchRepository,
	prescriptionRepo *mocks.MockPrescriptionRepository,
	clinicalRecordRepo *mocks.MockClinicalRecordRepository,
	userRepo *mocks.MockUserRepository,
) *Service {
	logger := zaptest.NewLogger(t)
	return NewService(
		nil, // db
		nil, // saleRepo
		nil, // adjRepo
		nil, // productRepo
		labOrderRepo,
		labRepo,
		appointmentRepo,
		branchRepo,
		nil, // itemRepo
		nil, // movementRepo
		prescriptionRepo,
		clinicalRecordRepo,
		userRepo,
		logger,
	)
}

func signedClinicalRecordFixture() *domain.ClinicalRecord {
	signedAt := time.Now()
	return &domain.ClinicalRecord{
		ID:            42,
		AppointmentID: 7,
		PatientID:     1,
		Status:        "signed",
		ClinicalPrescription: &domain.ClinicalPrescription{
			ID:               99,
			ClinicalRecordID: 42,
			SphOd:            float64Ptr(-1.25),
			CylOd:            float64Ptr(-0.50),
			AxisOd:           intPtr(90),
			AddOd:            float64Ptr(2.00),
			DpOd:             float64Ptr(32.0),
			SphOi:            float64Ptr(-1.00),
			CylOi:            float64Ptr(-0.25),
			AxisOi:           intPtr(85),
			AddOi:            float64Ptr(2.00),
			DpOi:             float64Ptr(31.5),
			SignedAt:         &signedAt,
		},
	}
}

func TestPopulateRxFromAppointment_UsesSignedClinicalPrescription(t *testing.T) {
	labOrderRepo := new(mocks.MockLaboratoryOrderRepository)
	labRepo := new(mocks.MockLaboratoryRepository)
	appointmentRepo := new(mocks.MockAppointmentRepository)
	branchRepo := new(mocks.MockBranchRepository)
	prescriptionRepo := new(mocks.MockPrescriptionRepository)
	clinicalRecordRepo := new(mocks.MockClinicalRecordRepository)
	userRepo := new(mocks.MockUserRepository)

	clinicalRecordRepo.On("GetByAppointmentID", mock.Anything, uint(7)).
		Return(signedClinicalRecordFixture(), nil)

	svc := buildService(t, labOrderRepo, labRepo, appointmentRepo, branchRepo, prescriptionRepo, clinicalRecordRepo, userRepo)

	lo := &domain.LaboratoryOrder{}
	svc.populateRxFromAppointment(lo, 7)

	assert.NotNil(t, lo.RxOD)
	assert.Equal(t, "-1.25", lo.RxOD.Sphere)
	assert.Equal(t, "-0.50", lo.RxOD.Cylinder)
	assert.Equal(t, "90", lo.RxOD.Axis)
	assert.Equal(t, "+2.00", lo.RxOD.Addition)
	assert.Equal(t, "32.0", lo.RxOD.DP)

	assert.NotNil(t, lo.RxOI)
	assert.Equal(t, "-1.00", lo.RxOI.Sphere)
	assert.Equal(t, "-0.25", lo.RxOI.Cylinder)
	assert.Equal(t, "85", lo.RxOI.Axis)

	// The legacy fallback must never be consulted when a signed formula exists.
	prescriptionRepo.AssertNotCalled(t, "GetByAppointmentID", mock.Anything, mock.Anything)
}

func TestPopulateRxFromAppointment_FallsBackWhenPrescriptionNotSigned(t *testing.T) {
	labOrderRepo := new(mocks.MockLaboratoryOrderRepository)
	labRepo := new(mocks.MockLaboratoryRepository)
	appointmentRepo := new(mocks.MockAppointmentRepository)
	branchRepo := new(mocks.MockBranchRepository)
	prescriptionRepo := new(mocks.MockPrescriptionRepository)
	clinicalRecordRepo := new(mocks.MockClinicalRecordRepository)
	userRepo := new(mocks.MockUserRepository)

	unsigned := signedClinicalRecordFixture()
	unsigned.ClinicalPrescription.SignedAt = nil
	clinicalRecordRepo.On("GetByAppointmentID", mock.Anything, uint(7)).Return(unsigned, nil)

	legacy := &domain.Prescription{
		RightSphere:    "-2.00",
		RightCylinder:  "-1.00",
		RightAxis:      "180",
		RightAddition:  "+1.50",
		Recommendation: "Uso permanente",
	}
	prescriptionRepo.On("GetByAppointmentID", mock.Anything, uint(7)).Return(legacy, nil)

	svc := buildService(t, labOrderRepo, labRepo, appointmentRepo, branchRepo, prescriptionRepo, clinicalRecordRepo, userRepo)

	lo := &domain.LaboratoryOrder{}
	svc.populateRxFromAppointment(lo, 7)

	assert.NotNil(t, lo.RxOD)
	assert.Equal(t, "-2.00", lo.RxOD.Sphere)
	assert.Equal(t, "Uso permanente", lo.SpecialInstructions)
}

func TestPopulateRxFromAppointment_FallsBackWhenNoClinicalRecord(t *testing.T) {
	labOrderRepo := new(mocks.MockLaboratoryOrderRepository)
	labRepo := new(mocks.MockLaboratoryRepository)
	appointmentRepo := new(mocks.MockAppointmentRepository)
	branchRepo := new(mocks.MockBranchRepository)
	prescriptionRepo := new(mocks.MockPrescriptionRepository)
	clinicalRecordRepo := new(mocks.MockClinicalRecordRepository)
	userRepo := new(mocks.MockUserRepository)

	clinicalRecordRepo.On("GetByAppointmentID", mock.Anything, uint(9)).
		Return(nil, &domain.ErrNotFound{Resource: "clinical_record"})

	legacy := &domain.Prescription{RightSphere: "-3.00"}
	prescriptionRepo.On("GetByAppointmentID", mock.Anything, uint(9)).Return(legacy, nil)

	svc := buildService(t, labOrderRepo, labRepo, appointmentRepo, branchRepo, prescriptionRepo, clinicalRecordRepo, userRepo)

	lo := &domain.LaboratoryOrder{}
	svc.populateRxFromAppointment(lo, 9)

	assert.NotNil(t, lo.RxOD)
	assert.Equal(t, "-3.00", lo.RxOD.Sphere)
}

func TestCreateLabOrderIfNeeded_UsesSignedFormulaEndToEnd(t *testing.T) {
	labOrderRepo := new(mocks.MockLaboratoryOrderRepository)
	labRepo := new(mocks.MockLaboratoryRepository)
	appointmentRepo := new(mocks.MockAppointmentRepository)
	branchRepo := new(mocks.MockBranchRepository)
	prescriptionRepo := new(mocks.MockPrescriptionRepository)
	clinicalRecordRepo := new(mocks.MockClinicalRecordRepository)
	userRepo := new(mocks.MockUserRepository)

	labOrderRepo.On("GetBySaleID", mock.Anything, uint(55)).Return(nil, &domain.ErrNotFound{Resource: "laboratory_order"})
	labRepo.On("GetFirstActive", mock.Anything).Return(&domain.Laboratory{ID: 1}, nil)
	userRepo.On("GetByID", mock.Anything, uint(3)).Return(&domain.User{ID: 3, Name: "Vendedor Uno"}, nil)
	clinicalRecordRepo.On("GetByAppointmentID", mock.Anything, uint(7)).Return(signedClinicalRecordFixture(), nil)

	var created *domain.LaboratoryOrder
	labOrderRepo.On("Create", mock.Anything, mock.AnythingOfType("*domain.LaboratoryOrder")).
		Run(func(args mock.Arguments) {
			created = args.Get(1).(*domain.LaboratoryOrder)
			created.ID = 123
		}).
		Return(nil)
	labOrderRepo.On("AddStatusEntry", mock.Anything, mock.AnythingOfType("*domain.LaboratoryOrderStatusEntry")).Return(nil)

	svc := buildService(t, labOrderRepo, labRepo, appointmentRepo, branchRepo, prescriptionRepo, clinicalRecordRepo, userRepo)

	appointmentID := uint(7)
	saleSale := &domain.Sale{ID: 55, PatientID: 4, AppointmentID: &appointmentID}
	items := []ItemInput{{LensID: uintPtr(10), ProductType: "lens", Description: "Lente monofocal"}}

	svc.createLabOrderIfNeeded(saleSale, items, nil, 3)

	if assert.NotNil(t, created) {
		assert.Equal(t, "-1.25", created.RxOD.Sphere)
		assert.Equal(t, "+2.00", created.RxOD.Addition)
		assert.Equal(t, "-1.00", created.RxOI.Sphere)
	}
	prescriptionRepo.AssertNotCalled(t, "GetByAppointmentID", mock.Anything, mock.Anything)
}

func TestCreateLabOrderIfNeeded_NoLensItem_SkipsOrderCreation(t *testing.T) {
	labOrderRepo := new(mocks.MockLaboratoryOrderRepository)
	labRepo := new(mocks.MockLaboratoryRepository)
	appointmentRepo := new(mocks.MockAppointmentRepository)
	branchRepo := new(mocks.MockBranchRepository)
	prescriptionRepo := new(mocks.MockPrescriptionRepository)
	clinicalRecordRepo := new(mocks.MockClinicalRecordRepository)
	userRepo := new(mocks.MockUserRepository)

	svc := buildService(t, labOrderRepo, labRepo, appointmentRepo, branchRepo, prescriptionRepo, clinicalRecordRepo, userRepo)

	saleSale := &domain.Sale{ID: 60, PatientID: 4}
	items := []ItemInput{{ProductType: "frame", Description: "Montura X"}}

	svc.createLabOrderIfNeeded(saleSale, items, nil, 3)

	labOrderRepo.AssertNotCalled(t, "Create", mock.Anything, mock.Anything)
}

func uintPtr(v uint) *uint { return &v }
