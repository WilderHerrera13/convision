package v1_test

import (
	"bytes"
	"context"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
	labsvc "github.com/convision/api/internal/laboratory"
	"github.com/convision/api/internal/testutil"
	"github.com/convision/api/internal/testutil/mocks"
	v1 "github.com/convision/api/internal/transport/http/v1"
)

// testStorage is an inline filestore.Storage mock.
type testStorage struct{}

func (s *testStorage) Store(_ context.Context, _ string, _ io.Reader, _ int64, _ string) (string, error) {
	return "https://storage.test/evidence.jpg", nil
}

func TestListLaboratories_Success(t *testing.T) {
	labRepo := &mocks.MockLaboratoryRepository{}
	orderRepo := &mocks.MockLaboratoryOrderRepository{}
	labRepo.On("List", mock.Anything, 1, 15).Return(
		[]*domain.Laboratory{{ID: 1, Name: "Lab A"}},
		int64(1),
		nil,
	)

	labService := labsvc.NewService(labRepo, orderRepo, zap.NewNop())
	h := buildHandler(nil, nil, nil, nil, nil, labService, nil, nil)

	router := plainRouter(h)
	req := authedRequest(http.MethodGet, "/api/v1/laboratories", nil, 1, domain.RoleAdmin)
	w := testutil.DoRequest(router, req)

	testutil.AssertStatus(t, w, http.StatusOK)
}

func TestUploadEvidence_Success(t *testing.T) {
	labRepo := &mocks.MockLaboratoryRepository{}
	orderRepo := &mocks.MockLaboratoryOrderRepository{}
	orderRepo.On("GetByID", uint(1)).Return(&domain.LaboratoryOrder{ID: 1}, nil)
	orderRepo.On("GetEvidence", uint(1), "sent_to_lab").Return([]*domain.LaboratoryOrderEvidence{}, nil)
	orderRepo.On("AddEvidence", mock.Anything).Return(nil)

	labService := labsvc.NewService(labRepo, orderRepo, zap.NewNop())
	// Wire testStorage so h.storage is non-nil
	h := v1.NewHandler(
		nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil,
		labService,
		nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil,
		&testStorage{},
	)

	// Build multipart form with an image file
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	_ = mw.WriteField("type", "sent_to_lab")
	fw, _ := mw.CreateFormFile("image", "photo.jpg")
	_, _ = fw.Write([]byte("fake-image-data"))
	mw.Close()

	router := plainRouter(h)
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/laboratory-orders/1/evidence", &buf)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+tokenFor(1, domain.RoleAdmin))

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	testutil.AssertStatus(t, w, http.StatusCreated)
}

func TestUploadEvidence_Unauthorized(t *testing.T) {
	// POST /laboratory-orders/:id/evidence requires RoleAdmin or RoleReceptionist
	labRepo := &mocks.MockLaboratoryRepository{}
	orderRepo := &mocks.MockLaboratoryOrderRepository{}
	labService := labsvc.NewService(labRepo, orderRepo, zap.NewNop())
	h := buildHandler(nil, nil, nil, nil, nil, labService, nil, nil)

	router := plainRouter(h)
	// Specialist is not in the allowed roles for this endpoint
	req := authedRequest(http.MethodPost, "/api/v1/laboratory-orders/1/evidence", nil, 2, domain.RoleSpecialist)
	w := testutil.DoRequest(router, req)

	testutil.AssertStatus(t, w, http.StatusForbidden)
}
