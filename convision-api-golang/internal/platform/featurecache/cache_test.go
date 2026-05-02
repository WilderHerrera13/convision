package featurecache

import (
	"testing"
	"time"
)

func TestNew_DefaultTTL(t *testing.T) {
	c := New(nil, 0)
	if c.ttl != 5*time.Minute {
		t.Fatalf("expected default TTL 5m, got %v", c.ttl)
	}
}

func TestInvalidate(t *testing.T) {
	c := New(nil, 1*time.Hour)
	c.store[1] = cacheEntry{flags: []string{"a", "b"}, expiresAt: time.Now().Add(1 * time.Hour)}
	c.Invalidate(1)
	_, ok := c.store[1]
	if ok {
		t.Fatal("entry should have been invalidated")
	}
}
