package invoicingclient

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

// Client is a typed HTTP client for the convision-invoicing-api service.
// Configure via environment variables:
//
//	INVOICING_API_URL   — base URL, e.g. http://localhost:8002
//	INVOICING_API_KEY   — X-Api-Key header value
//	INVOICING_ISSUER_ID — default issuer ID for this optica
//
// If INVOICING_API_URL is empty the client is disabled and all calls
// return nil, nil (no-op), preserving existing sale behavior.
type Client struct {
	baseURL  string
	apiKey   string
	issuerID string
	http     *http.Client
}

// NewFromEnv creates a Client from environment variables.
// Returns nil if INVOICING_API_URL is not set.
func NewFromEnv() *Client {
	url := os.Getenv("INVOICING_API_URL")
	if url == "" {
		return nil
	}
	return &Client{
		baseURL:  url,
		apiKey:   os.Getenv("INVOICING_API_KEY"),
		issuerID: os.Getenv("INVOICING_ISSUER_ID"),
		http:     &http.Client{Timeout: 30 * time.Second},
	}
}

// New creates a Client with explicit configuration.
func New(baseURL, apiKey, issuerID string) *Client {
	return &Client{
		baseURL:  baseURL,
		apiKey:   apiKey,
		issuerID: issuerID,
		http:     &http.Client{Timeout: 30 * time.Second},
	}
}

// IsEnabled returns true if the client is configured and ready.
func (c *Client) IsEnabled() bool {
	return c != nil && c.baseURL != ""
}

// IssuerID returns the configured default issuer ID.
func (c *Client) IssuerID() string {
	if c == nil {
		return ""
	}
	return c.issuerID
}

// --- Request / Response types ---

type RecipientRequest struct {
	DocType   string `json:"doc_type"`
	DocNumber string `json:"doc_number"`
	Name      string `json:"name"`
	Email     string `json:"email,omitempty"`
}

type LineRequest struct {
	ProductCode  string  `json:"product_code,omitempty"`
	Description  string  `json:"description"`
	Quantity     float64 `json:"quantity"`
	UnitCode     string  `json:"unit_code,omitempty"`
	UnitPrice    float64 `json:"unit_price"`
	DiscountRate float64 `json:"discount_rate,omitempty"`
	IVATreatment string  `json:"iva_treatment"`
}

type EmitRequest struct {
	ExternalRef      string           `json:"external_ref,omitempty"`
	DocumentType     string           `json:"document_type"`
	Recipient        RecipientRequest `json:"recipient"`
	Lines            []LineRequest    `json:"lines"`
	PaymentMeansCode string           `json:"payment_means_code,omitempty"`
	Notes            string           `json:"notes,omitempty"`
}

type InvoiceResponse struct {
	ID           uint       `json:"id"`
	IssuerID     uint       `json:"issuer_id"`
	ExternalRef  string     `json:"external_ref"`
	Number       string     `json:"number"`
	DocumentType string     `json:"document_type"`
	IssueDate    string     `json:"issue_date"`
	DIANStatus   string     `json:"dian_status"`
	CUFE         string     `json:"cufe"`
	Total        float64    `json:"total"`
	IVATotal     float64    `json:"iva_total"`
	ValidatedAt  *time.Time `json:"dian_validated_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
}

// --- API methods ---

// EmitInvoice emits an invoice for the configured issuer.
func (c *Client) EmitInvoice(ctx context.Context, req EmitRequest) (*InvoiceResponse, error) {
	if !c.IsEnabled() {
		return nil, nil
	}
	return c.emitInvoice(ctx, c.issuerID, req)
}

// EmitInvoiceForIssuer emits an invoice for an explicit issuer ID.
func (c *Client) EmitInvoiceForIssuer(ctx context.Context, issuerID string, req EmitRequest) (*InvoiceResponse, error) {
	if !c.IsEnabled() {
		return nil, nil
	}
	return c.emitInvoice(ctx, issuerID, req)
}

func (c *Client) emitInvoice(ctx context.Context, issuerID string, req EmitRequest) (*InvoiceResponse, error) {
	url := fmt.Sprintf("%s/api/v1/issuers/%s/invoices", c.baseURL, issuerID)
	var resp InvoiceResponse
	if err := c.post(ctx, url, req, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// GetInvoice retrieves an invoice by ID.
func (c *Client) GetInvoice(ctx context.Context, issuerID, invoiceID string) (*InvoiceResponse, error) {
	if !c.IsEnabled() {
		return nil, nil
	}
	url := fmt.Sprintf("%s/api/v1/issuers/%s/invoices/%s", c.baseURL, issuerID, invoiceID)
	var resp InvoiceResponse
	if err := c.get(ctx, url, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// EmitCreditNote creates a credit note referencing an existing invoice.
func (c *Client) EmitCreditNote(ctx context.Context, issuerID, referencedInvoiceID string, req EmitRequest) (*InvoiceResponse, error) {
	if !c.IsEnabled() {
		return nil, nil
	}
	url := fmt.Sprintf("%s/api/v1/issuers/%s/invoices/%s/credit-note", c.baseURL, issuerID, referencedInvoiceID)
	var resp InvoiceResponse
	if err := c.post(ctx, url, req, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// EmitDebitNote creates a debit note referencing an existing invoice.
func (c *Client) EmitDebitNote(ctx context.Context, issuerID, referencedInvoiceID string, req EmitRequest) (*InvoiceResponse, error) {
	if !c.IsEnabled() {
		return nil, nil
	}
	url := fmt.Sprintf("%s/api/v1/issuers/%s/invoices/%s/debit-note", c.baseURL, issuerID, referencedInvoiceID)
	var resp InvoiceResponse
	if err := c.post(ctx, url, req, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// InvoiceListResponse wraps a paginated list of invoices.
type InvoiceListResponse struct {
	Data        []InvoiceResponse `json:"data"`
	Total       int64             `json:"total"`
	CurrentPage int               `json:"current_page"`
	PerPage     int               `json:"per_page"`
	LastPage    int               `json:"last_page"`
}

// InvoiceFilter holds query parameters for listing invoices.
type InvoiceFilter struct {
	DocumentType string `json:"document_type,omitempty"`
	DIANStatus   string `json:"dian_status,omitempty"`
	StartDate    string `json:"start_date,omitempty"`
	EndDate      string `json:"end_date,omitempty"`
	ExternalRef  string `json:"external_ref,omitempty"`
	Page         int    `json:"page,omitempty"`
	PageSize     int    `json:"page_size,omitempty"`
}

// ListInvoices returns a paginated list of invoices for the configured issuer.
func (c *Client) ListInvoices(ctx context.Context, filter InvoiceFilter) (*InvoiceListResponse, error) {
	if !c.IsEnabled() {
		return &InvoiceListResponse{}, nil
	}
	url := fmt.Sprintf("%s/api/v1/issuers/%s/invoices", c.baseURL, c.issuerID)
	url += buildInvoiceQueryString(filter)
	var resp InvoiceListResponse
	if err := c.get(ctx, url, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// GetInvoiceXML downloads the signed UBL XML for an invoice.
func (c *Client) GetInvoiceXML(ctx context.Context, invoiceID string) ([]byte, error) {
	if !c.IsEnabled() {
		return nil, nil
	}
	rawURL := fmt.Sprintf("%s/api/v1/issuers/%s/invoices/%s/xml", c.baseURL, c.issuerID, invoiceID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, fmt.Errorf("invoicingclient: new request: %w", err)
	}
	req.Header.Set("X-Api-Key", c.apiKey)
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("invoicingclient: http: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("invoicingclient: read body: %w", err)
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("invoicingclient: status %d: %s", resp.StatusCode, string(body))
	}
	return body, nil
}

func buildInvoiceQueryString(f InvoiceFilter) string {
	params := ""
	add := func(k, v string) {
		if v == "" {
			return
		}
		if params == "" {
			params = "?" + k + "=" + v
		} else {
			params += "&" + k + "=" + v
		}
	}
	add("document_type", f.DocumentType)
	add("dian_status", f.DIANStatus)
	add("start_date", f.StartDate)
	add("end_date", f.EndDate)
	add("external_ref", f.ExternalRef)
	if f.Page > 0 {
		add("page", fmt.Sprintf("%d", f.Page))
	}
	if f.PageSize > 0 {
		add("page_size", fmt.Sprintf("%d", f.PageSize))
	}
	return params
}

// RetryContingency retries a contingency invoice.
func (c *Client) RetryContingency(ctx context.Context, issuerID, invoiceID string) (*InvoiceResponse, error) {
	if !c.IsEnabled() {
		return nil, nil
	}
	url := fmt.Sprintf("%s/api/v1/issuers/%s/invoices/%s/retry", c.baseURL, issuerID, invoiceID)
	var resp InvoiceResponse
	if err := c.post(ctx, url, nil, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// --- HTTP helpers ---

func (c *Client) post(ctx context.Context, url string, body any, out any) error {
	var bodyReader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("invoicingclient: marshal: %w", err)
		}
		bodyReader = bytes.NewReader(b)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bodyReader)
	if err != nil {
		return fmt.Errorf("invoicingclient: new request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Api-Key", c.apiKey)

	return c.do(req, out)
}

func (c *Client) get(ctx context.Context, url string, out any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return fmt.Errorf("invoicingclient: new request: %w", err)
	}
	req.Header.Set("X-Api-Key", c.apiKey)
	return c.do(req, out)
}

func (c *Client) do(req *http.Request, out any) error {
	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("invoicingclient: http: %w", err)
	}
	defer resp.Body.Close()

	rawBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("invoicingclient: read body: %w", err)
	}

	if resp.StatusCode >= 400 {
		return fmt.Errorf("invoicingclient: status %d: %s", resp.StatusCode, string(rawBody))
	}

	if out != nil && len(rawBody) > 0 {
		if err := json.Unmarshal(rawBody, out); err != nil {
			return fmt.Errorf("invoicingclient: unmarshal: %w", err)
		}
	}
	return nil
}
