package opticacache

import (
	"testing"
)

func TestNew(t *testing.T) {
	c := New()
	if c == nil {
		t.Fatal("New returned nil")
	}
	if c.Len() != 0 {
		t.Fatal("new cache should be empty")
	}
}

func TestUpsertAndGet(t *testing.T) {
	c := New()
	entry := &Entry{ID: 1, Slug: "test", SchemaName: "optica_test", IsActive: true}
	c.Upsert(entry)
	got, ok := c.GetBySlug("test")
	if !ok {
		t.Fatal("expected entry to exist")
	}
	if got.ID != 1 || got.Slug != "test" || got.SchemaName != "optica_test" {
		t.Fatalf("unexpected entry: %+v", got)
	}
	if c.Len() != 1 {
		t.Fatalf("expected Len=1, got %d", c.Len())
	}
}

func TestRemove(t *testing.T) {
	c := New()
	c.Upsert(&Entry{ID: 1, Slug: "test", SchemaName: "optica_test", IsActive: true})
	c.Remove("test")
	_, ok := c.GetBySlug("test")
	if ok {
		t.Fatal("entry should have been removed")
	}
}

func TestGetBySlug_NotFound(t *testing.T) {
	c := New()
	_, ok := c.GetBySlug("nonexistent")
	if ok {
		t.Fatal("entry should not exist")
	}
}
