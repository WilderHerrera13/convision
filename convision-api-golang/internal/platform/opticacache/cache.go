package opticacache

import (
	"sync"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

type Entry struct {
	ID         uint
	Slug       string
	SchemaName string
	IsActive   bool
}

type Cache struct {
	mu     sync.RWMutex
	bySlug map[string]*Entry
}

func New() *Cache {
	return &Cache{bySlug: make(map[string]*Entry)}
}

func (c *Cache) WarmUp(db *gorm.DB) error {
	repo := &warmupRepo{db: db}
	opticas, err := repo.listAllActive()
	if err != nil {
		return err
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	for _, o := range opticas {
		c.bySlug[o.Slug] = &Entry{
			ID:         o.ID,
			Slug:       o.Slug,
			SchemaName: o.SchemaName,
			IsActive:   o.IsActive,
		}
	}
	return nil
}

func (c *Cache) GetBySlug(slug string) (*Entry, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	e, ok := c.bySlug[slug]
	return e, ok
}

func (c *Cache) Upsert(entry *Entry) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.bySlug[entry.Slug] = entry
}

func (c *Cache) Remove(slug string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.bySlug, slug)
}

func (c *Cache) Len() int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return len(c.bySlug)
}

type warmupRepo struct {
	db *gorm.DB
}

func (r *warmupRepo) listAllActive() ([]*domain.Optica, error) {
	var opticas []*domain.Optica
	err := r.db.Where("is_active = true AND deleted_at IS NULL").Find(&opticas).Error
	return opticas, err
}
