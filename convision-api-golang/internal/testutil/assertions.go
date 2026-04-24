package testutil

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

// AssertStatus asserts recorder.Code == expectedCode.
// On failure, prints the response body to aid debugging.
func AssertStatus(t *testing.T, w *httptest.ResponseRecorder, expectedCode int) {
	t.Helper()
	assert.Equal(t, expectedCode, w.Code, "response body: %s", w.Body.String())
}

// AssertJSONField asserts that the top-level JSON field equals expected.
func AssertJSONField(t *testing.T, w *httptest.ResponseRecorder, field string, expected any) {
	t.Helper()
	var body map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("response is not JSON: %s", w.Body.String())
	}
	assert.Equal(t, expected, body[field])
}

// AssertJSONHasKey asserts that the top-level JSON key exists (any value).
func AssertJSONHasKey(t *testing.T, w *httptest.ResponseRecorder, field string) {
	t.Helper()
	var body map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("response is not JSON: %s", w.Body.String())
	}
	_, ok := body[field]
	assert.True(t, ok, "expected JSON key %q to exist; body: %s", field, w.Body.String())
}
