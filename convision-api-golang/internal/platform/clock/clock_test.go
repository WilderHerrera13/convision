package clock

import (
	"testing"
)

func TestParseDateAnchorsToBogota(t *testing.T) {
	got, err := ParseDate("1990-05-15")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if name, _ := got.Zone(); name == "UTC" {
		t.Fatalf("expected Bogota location, got UTC")
	}
	if got.Hour() != 0 || got.Minute() != 0 {
		t.Fatalf("expected midnight Bogota, got %v", got)
	}
	if got.UTC().Hour() != 5 {
		t.Fatalf("expected 05:00 UTC equivalent (Bogota midnight), got %v", got.UTC())
	}
}

func TestParseDateTimeNaiveAsBogota(t *testing.T) {
	got, err := ParseDateTime("2026-05-08 10:30")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.Hour() != 10 || got.Minute() != 30 {
		t.Fatalf("expected wall-clock 10:30, got %v", got)
	}
	if got.UTC().Hour() != 15 {
		t.Fatalf("expected 15:30 UTC equivalent, got %v", got.UTC())
	}
}

func TestParseDateTimeRespectsOffset(t *testing.T) {
	got, err := ParseDateTime("2026-05-08T10:30:00-05:00")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.UTC().Hour() != 15 {
		t.Fatalf("expected 15:30 UTC equivalent, got %v", got.UTC())
	}
}

func TestParseDateTimeRejectsEmpty(t *testing.T) {
	if _, err := ParseDateTime(""); err == nil {
		t.Fatal("expected error for empty input")
	}
}
