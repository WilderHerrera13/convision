// internal/platform/tenant/provisioner.go
//
// TenantProvisioner handles the lifecycle of a tenant schema:
//   - Create:  INSERT into platform.accounts + CREATE SCHEMA + run all tenant migrations
//   - Suspend: SET is_active = false  (schema data preserved)
//   - Drop:    DELETE from platform.accounts + DROP SCHEMA CASCADE  (irreversible)

package tenant

import (
	"database/sql"
	"fmt"
	"io/fs"
	"log"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"github.com/convision/api/db/migrations"
)

// Provisioner manages tenant schema lifecycle.
type Provisioner struct {
	db *sql.DB
}

// New returns a Provisioner backed by the given *sql.DB.
func New(db *sql.DB) *Provisioner {
	return &Provisioner{db: db}
}

// Create creates a new tenant: registers it in platform.accounts, creates the
// PostgreSQL schema, and runs all tenant migrations in a single transaction.
// Returns the generated tenant slug (schema suffix).
func (p *Provisioner) Create(name, plan string) (string, error) {
	s := slug(name)
	schema := "tenant_" + s

	tx, err := p.db.Begin()
	if err != nil {
		return "", fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	// Register in platform
	_, err = tx.Exec(
		`INSERT INTO platform.accounts (slug, name, plan) VALUES ($1, $2, $3)`,
		s, name, plan,
	)
	if err != nil {
		return "", fmt.Errorf("insert account: %w", err)
	}

	// Create schema
	if _, err = tx.Exec(fmt.Sprintf("CREATE SCHEMA %s", pgIdent(schema))); err != nil {
		return "", fmt.Errorf("create schema: %w", err)
	}

	if err = tx.Commit(); err != nil {
		return "", fmt.Errorf("commit: %w", err)
	}

	// Run migrations outside the main transaction (DDL in PG is transactional,
	// but we run each migration in its own tx for granular error reporting).
	if err := p.migrate(schema); err != nil {
		return "", fmt.Errorf("migrate %s: %w", schema, err)
	}

	log.Printf("[provisioner] tenant %q created (schema: %s)", name, schema)
	return s, nil
}

// Suspend deactivates a tenant without touching its data.
func (p *Provisioner) Suspend(slug string) error {
	res, err := p.db.Exec(
		`UPDATE platform.accounts SET is_active = false, updated_at = now() WHERE slug = $1`, slug)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("tenant %q not found", slug)
	}
	return nil
}

// Activate re-activates a previously suspended tenant.
func (p *Provisioner) Activate(slug string) error {
	_, err := p.db.Exec(
		`UPDATE platform.accounts SET is_active = true, updated_at = now() WHERE slug = $1`, slug)
	return err
}

// Drop permanently deletes a tenant schema and its platform record.
// THIS IS IRREVERSIBLE — caller must confirm before invoking.
func (p *Provisioner) Drop(tenantSlug string) error {
	schema := "tenant_" + tenantSlug
	tx, err := p.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err = tx.Exec(fmt.Sprintf("DROP SCHEMA IF EXISTS %s CASCADE", pgIdent(schema))); err != nil {
		return fmt.Errorf("drop schema: %w", err)
	}
	if _, err = tx.Exec(`DELETE FROM platform.accounts WHERE slug = $1`, tenantSlug); err != nil {
		return fmt.Errorf("delete account: %w", err)
	}
	return tx.Commit()
}

// migrate runs all pending .up.sql files against the given schema.
func (p *Provisioner) migrate(schema string) error {
	p.ensureMigrationsTable(schema)
	applied := p.appliedMigrations(schema)

	files := p.migrationFiles()
	for _, f := range files {
		version, name := parseFilename(filepath.Base(f))
		if applied[version] {
			continue
		}

		content, err := fs.ReadFile(migrations.Tenant, f)
		if err != nil {
			return fmt.Errorf("read %s: %w", f, err)
		}

		tx, err := p.db.Begin()
		if err != nil {
			return err
		}

		if _, err = tx.Exec(fmt.Sprintf("SET search_path TO %s", pgIdent(schema))); err != nil {
			tx.Rollback()
			return fmt.Errorf("set search_path: %w", err)
		}
		if _, err = tx.Exec(string(content)); err != nil {
			tx.Rollback()
			return fmt.Errorf("migration %s: %w", name, err)
		}
		if _, err = tx.Exec(
			fmt.Sprintf(`INSERT INTO %s.schema_migrations (version, name) VALUES ($1, $2)`, pgIdent(schema)),
			version, name,
		); err != nil {
			tx.Rollback()
			return fmt.Errorf("record migration %s: %w", name, err)
		}
		if err = tx.Commit(); err != nil {
			return err
		}
		log.Printf("[provisioner] [%s] applied %s", schema, name)
	}
	return nil
}

func (p *Provisioner) ensureMigrationsTable(schema string) {
	q := fmt.Sprintf(`CREATE TABLE IF NOT EXISTS %s.schema_migrations (
		version    TEXT        PRIMARY KEY,
		name       TEXT        NOT NULL,
		applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
	)`, pgIdent(schema))
	if _, err := p.db.Exec(q); err != nil {
		log.Fatalf("ensure schema_migrations in %s: %v", schema, err)
	}
}

func (p *Provisioner) appliedMigrations(schema string) map[string]bool {
	rows, err := p.db.Query(fmt.Sprintf("SELECT version FROM %s.schema_migrations", pgIdent(schema)))
	if err != nil {
		log.Fatalf("read applied migrations %s: %v", schema, err)
	}
	defer rows.Close()
	m := map[string]bool{}
	for rows.Next() {
		var v string
		rows.Scan(&v)
		m[v] = true
	}
	return m
}

func (p *Provisioner) migrationFiles() []string {
	entries, err := fs.ReadDir(migrations.Tenant, "tenant")
	if err != nil {
		log.Fatalf("read migrations dir: %v", err)
	}
	var files []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".up.sql") {
			files = append(files, filepath.Join("tenant", e.Name()))
		}
	}
	sort.Strings(files)
	return files
}

var nameRe = regexp.MustCompile(`^(\d+)_(.+)\.(up|down)\.sql$`)

func parseFilename(name string) (version, label string) {
	m := nameRe.FindStringSubmatch(name)
	if m == nil {
		log.Fatalf("invalid migration filename: %s", name)
	}
	return m[1], m[0]
}

func pgIdent(name string) string {
	if !regexp.MustCompile(`^[a-zA-Z_][a-zA-Z0-9_]*$`).MatchString(name) {
		log.Fatalf("invalid schema name: %q", name)
	}
	return `"` + name + `"`
}

func slug(s string) string {
	return regexp.MustCompile(`[^a-z0-9]+`).ReplaceAllString(strings.ToLower(s), "_")
}
