package testutil

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"

	"github.com/gin-gonic/gin"

	jwtauth "github.com/convision/api/internal/platform/auth"
	"github.com/convision/api/internal/platform/opticacache"
	v1 "github.com/convision/api/internal/transport/http/v1"
)

// NewRequest creates an *http.Request with Content-Type: application/json.
// body is marshalled to JSON; pass nil for no-body requests.
func NewRequest(method, path string, body any) *http.Request {
	var buf bytes.Buffer
	if body != nil {
		_ = json.NewEncoder(&buf).Encode(body)
	}
	req, _ := http.NewRequest(method, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	return req
}

// DoRequest executes req against router and returns the recorded response.
func DoRequest(router *gin.Engine, req *http.Request) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}

// NewTestRouter creates a gin.Engine in TestMode with InjectClaims middleware
// and all handler routes registered. claims are injected on every request.
func NewTestRouter(h *v1.Handler, claims *jwtauth.Claims) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(InjectClaims(claims))
	api := r.Group("/api")
	h.RegisterRoutes(api, opticacache.New(), nil)
	return r
}
