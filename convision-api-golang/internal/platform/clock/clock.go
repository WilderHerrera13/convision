// Package clock centralises the clinic timezone (America/Bogota) and the
// parsing helpers used to interpret "naive" date / datetime strings that the
// front-end sends without an offset. Storing them as UTC was producing 5-hour
// drifts on appointment, payment and birth date fields.
package clock

import (
	"errors"
	"strings"
	"time"
)

const clinicLocationName = "America/Bogota"

// Location returns the canonical clinic location. Falls back to UTC if the
// tzdata is unavailable in the runtime image.
func Location() *time.Location {
	loc, err := time.LoadLocation(clinicLocationName)
	if err != nil {
		return time.UTC
	}
	return loc
}

// Now returns the current time anchored to the clinic location.
func Now() time.Time {
	return time.Now().In(Location())
}

// ParseDate parses a YYYY-MM-DD string as midnight in the clinic location.
// Empty input returns a zero time and a non-nil error so callers can branch
// safely.
func ParseDate(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, errors.New("empty date")
	}
	return time.ParseInLocation("2006-01-02", s, Location())
}

// ParseDateTime accepts both naive ("YYYY-MM-DD HH:MM[:SS]") and offset-aware
// (RFC3339) inputs. Naive strings are interpreted in the clinic location so
// the persisted UTC value matches the wall-clock the user picked. Offset-aware
// strings are honoured as-is.
func ParseDateTime(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, errors.New("empty datetime")
	}

	loc := Location()
	for _, layout := range []string{
		"2006-01-02 15:04:05",
		"2006-01-02 15:04",
		"2006-01-02T15:04:05",
		"2006-01-02T15:04",
	} {
		if t, err := time.ParseInLocation(layout, s, loc); err == nil {
			return t, nil
		}
	}
	for _, layout := range []string{time.RFC3339Nano, time.RFC3339, "2006-01-02T15:04:05Z07:00"} {
		if t, err := time.Parse(layout, s); err == nil {
			return t, nil
		}
	}
	return time.Time{}, errors.New("unsupported datetime layout")
}

// CombineDateTime parses a YYYY-MM-DD date and a HH:MM[:SS] time separately
// (the legacy front-end split form) into a time anchored to the clinic
// location.
func CombineDateTime(date, timeStr string) (time.Time, error) {
	return ParseDateTime(strings.TrimSpace(date) + " " + strings.TrimSpace(timeStr))
}
