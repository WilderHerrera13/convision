// Package rips implements the transmission side of the FEV-RIPS flow
// (Resolución 2275/2023): sending the built RIPS JSON to the government's
// validation service once it is linked to a real Factura Electrónica de
// Venta. Mirrors the DIAN_TRANSMISSION_MODE pattern already used by
// convision-invoicing-api (internal/platform/dian/transmitter.go there) so
// both regulatory integrations follow the same operational shape.
package rips

import (
	"errors"
	"os"
	"strings"

	"go.uber.org/zap"
)

// TransmissionMode selects how (or whether) a RIPS payload is sent.
type TransmissionMode string

const (
	// ModeNone never attempts any network call — only logs and stores the
	// payload as pending. Safe default; used whenever RIPS_TRANSMISSION_MODE
	// is unset.
	ModeNone TransmissionMode = "none"
	// ModeLocal simulates a successful transmission against no real endpoint,
	// for local/dev/QA verification of the end-to-end flow without contacting
	// any government system.
	ModeLocal TransmissionMode = "local"
	// ModeDirect is the target production mode: a real connection to the
	// official FEVRIPS APILOCAL container (see
	// docs/GAP_ANALYSIS_HISTORIA_CLINICA_JARVIS.md, section 07). NOT
	// implemented in this codebase — this environment has no government
	// credentials, and none should be hardcoded here. Send() returns an
	// explicit error in this mode rather than silently pretending success.
	ModeDirect TransmissionMode = "direct"
)

// Result describes the outcome of a transmission attempt.
type Result struct {
	Status  string
	Message string
}

// Transmitter sends (or simulates sending) a built RIPS JSON payload.
type Transmitter struct {
	mode   TransmissionMode
	logger *zap.Logger
}

// NewFromEnv builds a Transmitter using RIPS_TRANSMISSION_MODE ("none" default).
func NewFromEnv(logger *zap.Logger) *Transmitter {
	raw := strings.ToLower(strings.TrimSpace(os.Getenv("RIPS_TRANSMISSION_MODE")))
	mode := TransmissionMode(raw)
	switch mode {
	case ModeLocal, ModeDirect:
		// valid, keep as-is
	default:
		mode = ModeNone
	}
	return &Transmitter{mode: mode, logger: logger}
}

// Mode returns the configured transmission mode as a string (stored on RipsRecord.TransmissionMode).
func (t *Transmitter) Mode() string { return string(t.mode) }

// Send attempts to transmit payload for the RIPS record identified by
// invoiceNumber (the real FEV number it is attached to). Behavior depends on
// the configured mode — see the ModeXxx constants above.
func (t *Transmitter) Send(invoiceNumber string, payload []byte) (*Result, error) {
	switch t.mode {
	case ModeDirect:
		t.logger.Warn("rips: direct transmission mode requested but not implemented",
			zap.String("invoice_number", invoiceNumber))
		return nil, errors.New("rips: direct transmission mode is not implemented in this environment (no FEVRIPS/DIAN production credentials configured) — set RIPS_TRANSMISSION_MODE=local for mock verification")
	case ModeLocal:
		t.logger.Info("rips: local mode — simulating successful transmission, no real HTTP call made",
			zap.String("invoice_number", invoiceNumber),
			zap.Int("payload_bytes", len(payload)))
		return &Result{Status: "simulated_ok", Message: "local mode: payload validated shape-only, no government endpoint contacted"}, nil
	default:
		t.logger.Info("rips: transmission mode 'none' — payload built and stored as pending, not sent",
			zap.String("invoice_number", invoiceNumber))
		return &Result{Status: "not_sent", Message: "transmission disabled (RIPS_TRANSMISSION_MODE=none)"}, nil
	}
}
