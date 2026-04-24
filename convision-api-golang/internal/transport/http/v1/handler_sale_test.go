package v1_test

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/sale"
	"github.com/convision/api/internal/testutil"
	"github.com/convision/api/internal/testutil/mocks"
)

func TestListSales_Success(t *testing.T) {
	saleRepo := &mocks.MockSaleRepository{}
	saleRepo.On("List", mock.Anything, 1, 15).Return(
		[]*domain.Sale{{ID: 1, Total: 100.0}},
		int64(1),
		nil,
	)

	saleSvc := sale.NewService(saleRepo, &mocks.MockSaleLensPriceAdjustmentRepository{}, &mocks.MockProductRepository{}, zap.NewNop())
	h := buildHandler(nil, nil, nil, nil, saleSvc, nil, nil, nil)

	router := plainRouter(h)
	req := authedRequest(http.MethodGet, "/api/v1/sales", nil, 1, domain.RoleAdmin)
	w := testutil.DoRequest(router, req)

	testutil.AssertStatus(t, w, http.StatusOK)
}

func TestCreateSale_Success(t *testing.T) {
	saleRepo := &mocks.MockSaleRepository{}
	saleRepo.On("Create", mock.Anything).Return(nil)
	// Reload after Create (ID stays 0 in mock)
	saleRepo.On("GetByID", uint(0)).Return(&domain.Sale{ID: 1, Total: 100.0}, nil)
	// GeneratePdfToken called with the real ID returned from reload
	saleRepo.On("GetByID", uint(1)).Return(&domain.Sale{ID: 1, Total: 100.0}, nil)

	saleSvc := sale.NewService(saleRepo, &mocks.MockSaleLensPriceAdjustmentRepository{}, &mocks.MockProductRepository{}, zap.NewNop())
	h := buildHandler(nil, nil, nil, nil, saleSvc, nil, nil, nil)

	router := plainRouter(h)
	req := authedRequest(http.MethodPost, "/api/v1/sales", map[string]any{
		"patient_id": 1,
		"total":      100.0,
	}, 1, domain.RoleAdmin)
	w := testutil.DoRequest(router, req)

	testutil.AssertStatus(t, w, http.StatusCreated)
}

func TestAddSalePayment_Success(t *testing.T) {
	saleRepo := &mocks.MockSaleRepository{}
	saleRepo.On("GetByID", uint(1)).Return(&domain.Sale{ID: 1, Total: 100.0, AmountPaid: 0}, nil).Once()
	saleRepo.On("AddPayment", mock.Anything).Return(nil)
	saleRepo.On("Update", mock.Anything).Return(nil)
	saleRepo.On("GetByID", uint(1)).Return(&domain.Sale{ID: 1, Total: 100.0, AmountPaid: 100.0, PaymentStatus: "paid"}, nil).Once()

	saleSvc := sale.NewService(saleRepo, &mocks.MockSaleLensPriceAdjustmentRepository{}, &mocks.MockProductRepository{}, zap.NewNop())
	h := buildHandler(nil, nil, nil, nil, saleSvc, nil, nil, nil)

	router := plainRouter(h)
	req := authedRequest(http.MethodPost, "/api/v1/sales/1/payments", map[string]any{
		"payment_method_id": 1,
		"amount":            100.0,
	}, 1, domain.RoleAdmin)
	w := testutil.DoRequest(router, req)

	testutil.AssertStatus(t, w, http.StatusOK)
}

func TestCancelSale_Success(t *testing.T) {
	saleRepo := &mocks.MockSaleRepository{}
	saleRepo.On("GetByID", uint(1)).Return(&domain.Sale{ID: 1, Status: domain.SaleStatusPending}, nil).Once()
	saleRepo.On("Update", mock.Anything).Return(nil)
	saleRepo.On("GetByID", uint(1)).Return(&domain.Sale{ID: 1, Status: domain.SaleStatusCancelled}, nil).Once()

	saleSvc := sale.NewService(saleRepo, &mocks.MockSaleLensPriceAdjustmentRepository{}, &mocks.MockProductRepository{}, zap.NewNop())
	h := buildHandler(nil, nil, nil, nil, saleSvc, nil, nil, nil)

	router := plainRouter(h)
	req := authedRequest(http.MethodPost, "/api/v1/sales/1/cancel", nil, 1, domain.RoleAdmin)
	w := testutil.DoRequest(router, req)

	testutil.AssertStatus(t, w, http.StatusOK)
}

func TestCancelSale_NotFound(t *testing.T) {
	saleRepo := &mocks.MockSaleRepository{}
	saleRepo.On("GetByID", uint(99)).Return(nil, &domain.ErrNotFound{Resource: "sale"})

	saleSvc := sale.NewService(saleRepo, &mocks.MockSaleLensPriceAdjustmentRepository{}, &mocks.MockProductRepository{}, zap.NewNop())
	h := buildHandler(nil, nil, nil, nil, saleSvc, nil, nil, nil)

	router := plainRouter(h)
	req := authedRequest(http.MethodPost, "/api/v1/sales/99/cancel", nil, 1, domain.RoleAdmin)
	w := testutil.DoRequest(router, req)

	testutil.AssertStatus(t, w, http.StatusNotFound)
}
