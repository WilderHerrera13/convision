package v1_test

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/product"
	"github.com/convision/api/internal/testutil"
	"github.com/convision/api/internal/testutil/mocks"
)

func TestListProducts_Success(t *testing.T) {
	productRepo := &mocks.MockProductRepository{}
	discountRepo := &mocks.MockDiscountRepository{}
	productRepo.On("List", mock.Anything, 1, 15).Return(
		[]*domain.Product{{ID: 1, Price: 50.0}},
		int64(1),
		nil,
	)

	productSvc := product.NewService(productRepo, discountRepo, zap.NewNop())
	h := buildHandler(nil, nil, nil, productSvc, nil, nil, nil, nil)

	router := plainRouter(h)
	req := authedRequest(http.MethodGet, "/api/v1/products", nil, 1, domain.RoleAdmin)
	w := testutil.DoRequest(router, req)

	testutil.AssertStatus(t, w, http.StatusOK)
	testutil.AssertJSONHasKey(t, w, "data")
}

func TestCreateProduct_AdminOnly_Forbidden(t *testing.T) {
	// POST /products requires RoleAdmin — receptionist should get 403
	productRepo := &mocks.MockProductRepository{}
	discountRepo := &mocks.MockDiscountRepository{}
	productSvc := product.NewService(productRepo, discountRepo, zap.NewNop())
	h := buildHandler(nil, nil, nil, productSvc, nil, nil, nil, nil)

	router := plainRouter(h)
	req := authedRequest(http.MethodPost, "/api/v1/products", map[string]any{
		"name": "Lens B",
	}, 3, domain.RoleReceptionist)
	w := testutil.DoRequest(router, req)

	testutil.AssertStatus(t, w, http.StatusForbidden)
}
