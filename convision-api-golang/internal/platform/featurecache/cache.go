package featurecache

import (
	"sync"
	"time"

	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

type cacheEntry struct {
	flags     []string
	expiresAt time.Time
}

type Cache struct {
	mu    sync.RWMutex
	store map[uint]cacheEntry
	ttl   time.Duration
	db    *gorm.DB
}

func New(db *gorm.DB, ttl time.Duration) *Cache {
	if ttl <= 0 {
		ttl = 5 * time.Minute
	}
	return &Cache{store: make(map[uint]cacheEntry), ttl: ttl, db: db}
}

func (c *Cache) GetEnabled(opticaID uint) ([]string, error) {
	c.mu.RLock()
	entry, ok := c.store[opticaID]
	c.mu.RUnlock()
	if ok && time.Now().Before(entry.expiresAt) {
		return entry.flags, nil
	}
	return c.refresh(opticaID)
}

func (c *Cache) Invalidate(opticaID uint) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.store, opticaID)
}

func (c *Cache) refresh(opticaID uint) ([]string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	// Double-checked locking: another goroutine may have populated while we waited
	if entry, ok := c.store[opticaID]; ok && time.Now().Before(entry.expiresAt) {
		return entry.flags, nil
	}
	var rows []struct {
		FeatureKey string
		IsEnabled  bool
	}
	err := c.db.Table("platform.optica_features").
		Select("feature_key, is_enabled").
		Where("optica_id = ? AND is_enabled = true", opticaID).
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	flags := make([]string, len(rows))
	for i, r := range rows {
		flags[i] = r.FeatureKey
	}

	seen := make(map[string]struct{}, len(flags))
	for _, f := range flags {
		seen[f] = struct{}{}
	}
	for _, k := range domain.AllFeatureKeys {
		if _, ok := seen[k]; !ok {
			flags = append(flags, k)
		}
	}

	c.store[opticaID] = cacheEntry{flags: flags, expiresAt: time.Now().Add(c.ttl)}
	return flags, nil
}
