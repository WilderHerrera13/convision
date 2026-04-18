// cmd/migrate/main.go
//
// Migration CLI — equivalent to `php artisan migrate` in Laravel.
//
// Usage:
//   go run ./cmd/migrate [flags]
//
// Flags:
//   -tenant string   Tenant slug to migrate (e.g. "clinica-vision"). Omit to migrate platform only.
//   -all             Migrate platform schema + ALL active tenants.
//   -down            Roll back the last applied migration instead of migrating up.
//   -steps int       Number of migrations to apply (default: all pending). Use with -down.
//   -new string      Create a new empty migration pair with this name (e.g. "add_phone_to_patients").
//   -list            List migration status for the selected scope.
//
// Examples:
//   go run ./cmd/migrate                          # migrate platform schema
//   go run ./cmd/migrate -tenant clinica-vision   # migrate one tenant
//   go run ./cmd/migrate -all                     # migrate platform + all tenants
//   go run ./cmd/migrate -down -tenant clinica-vision -steps 1   # rollback 1 migration
//   go run ./cmd/migrate -new add_insurance_to_patients           # create new migration files

package main

import (
	"database/sql"
	"errors"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	_ "github.com/lib/pq"
	"github.com/joho/godotenv"
	"github.com/convision/api/db/migrations"
)

func main() {
	_ = godotenv.Load()

	tenantFlag := flag.String("tenant", "", "Tenant slug to migrate")
	allFlag := flag.Bool("all", false, "Migrate platform + all active tenants")
	downFlag := flag.Bool("down", false, "Roll back instead of migrating up")
	stepsFlag := flag.Int("steps", 0, "Number of migrations to apply (0 = all)")
	newFlag := flag.String("new", "", "Create a new empty migration pair with this name")
	listFlag := flag.Bool("list", false, "List migration status")
	flag.Parse()

	// --- Create new migration files (like `artisan make:migration`) ---
	if *newFlag != "" {
		createMigrationFiles(*newFlag, *tenantFlag == "" && !*allFlag)
		return
	}

	dsn := buildDSN()
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("cannot open database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("cannot reach database: %v", err)
	}

	direction := "up"
	if *downFlag {
		direction = "down"
	}

	if *listFlag {
		if *tenantFlag != "" {
			listMigrations(db, "tenant_"+slug(*tenantFlag), migrations.Tenant, "tenant")
		} else {
			listMigrations(db, "platform", migrations.Platform, "platform")
		}
		return
	}

	// Platform migrations always run first
	log.Println("[platform] Running migrations...")
	runMigrations(db, "platform", migrations.Platform, "platform", direction, *stepsFlag)

	if *allFlag {
		tenants := listActiveTenants(db)
		for _, t := range tenants {
			schema := "tenant_" + t
			log.Printf("[%s] Running migrations...", schema)
			runMigrations(db, schema, migrations.Tenant, "tenant", direction, *stepsFlag)
		}
		return
	}

	if *tenantFlag != "" {
		schema := "tenant_" + slug(*tenantFlag)
		log.Printf("[%s] Running migrations...", schema)
		runMigrations(db, schema, migrations.Tenant, "tenant", direction, *stepsFlag)
	}
}

// ---------------------------------------------------------------------------
// Core migration runner
// ---------------------------------------------------------------------------

func runMigrations(db *sql.DB, schema string, fsys fs.FS, dir string, direction string, steps int) {
	ensureSchema(db, schema)
	ensureMigrationsTable(db, schema)

	files := migrationFiles(fsys, dir, direction)
	applied := appliedMigrations(db, schema)

	count := 0
	for _, f := range files {
		version, name := parseFilename(filepath.Base(f))

		if direction == "up" && applied[version] {
			continue // already applied
		}
		if direction == "down" && !applied[version] {
			continue // not applied, nothing to roll back
		}
		if steps > 0 && count >= steps {
			break
		}

		content, err := fs.ReadFile(fsys, f)
		if err != nil {
			log.Fatalf("cannot read %s: %v", f, err)
		}

		tx, err := db.Begin()
		if err != nil {
			log.Fatalf("cannot begin transaction: %v", err)
		}

		if _, err := tx.Exec(fmt.Sprintf("SET search_path TO %s", pgIdent(schema))); err != nil {
			tx.Rollback()
			log.Fatalf("cannot set search_path to %s: %v", schema, err)
		}

		if _, err := tx.Exec(string(content)); err != nil {
			tx.Rollback()
			log.Fatalf("[%s] migration %s failed: %v", schema, name, err)
		}

		if direction == "up" {
			if _, err := tx.Exec(
				fmt.Sprintf("INSERT INTO %s.schema_migrations (version, name, applied_at) VALUES ($1, $2, now())", pgIdent(schema)),
				version, name,
			); err != nil {
				tx.Rollback()
				log.Fatalf("cannot record migration %s: %v", name, err)
			}
		} else {
			if _, err := tx.Exec(
				fmt.Sprintf("DELETE FROM %s.schema_migrations WHERE version = $1", pgIdent(schema)),
				version,
			); err != nil {
				tx.Rollback()
				log.Fatalf("cannot remove migration record %s: %v", name, err)
			}
		}

		if err := tx.Commit(); err != nil {
			log.Fatalf("cannot commit migration %s: %v", name, err)
		}

		log.Printf("[%s] %s %s — OK", schema, direction, name)
		count++
	}

	if count == 0 {
		log.Printf("[%s] nothing to %s", schema, direction)
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func ensureSchema(db *sql.DB, schema string) {
	_, err := db.Exec(fmt.Sprintf("CREATE SCHEMA IF NOT EXISTS %s", pgIdent(schema)))
	if err != nil {
		log.Fatalf("cannot create schema %s: %v", schema, err)
	}
}

func ensureMigrationsTable(db *sql.DB, schema string) {
	q := fmt.Sprintf(`
		CREATE TABLE IF NOT EXISTS %s.schema_migrations (
			version    TEXT        PRIMARY KEY,
			name       TEXT        NOT NULL,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)`, pgIdent(schema))
	if _, err := db.Exec(q); err != nil {
		log.Fatalf("cannot create schema_migrations in %s: %v", schema, err)
	}
}

func appliedMigrations(db *sql.DB, schema string) map[string]bool {
	rows, err := db.Query(fmt.Sprintf("SELECT version FROM %s.schema_migrations", pgIdent(schema)))
	if err != nil {
		log.Fatalf("cannot read applied migrations for %s: %v", schema, err)
	}
	defer rows.Close()

	result := map[string]bool{}
	for rows.Next() {
		var v string
		rows.Scan(&v)
		result[v] = true
	}
	return result
}

func migrationFiles(fsys fs.FS, dir, direction string) []string {
	entries, err := fs.ReadDir(fsys, dir)
	if err != nil {
		log.Fatalf("cannot read migrations dir %s: %v", dir, err)
	}

	suffix := ".up.sql"
	if direction == "down" {
		suffix = ".down.sql"
	}

	var files []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), suffix) {
			files = append(files, filepath.Join(dir, e.Name()))
		}
	}

	sort.Slice(files, func(i, j int) bool {
		if direction == "down" {
			return filepath.Base(files[i]) > filepath.Base(files[j]) // reverse for rollback
		}
		return filepath.Base(files[i]) < filepath.Base(files[j])
	})
	return files
}

var migrationNameRe = regexp.MustCompile(`^(\d+)_(.+)\.(up|down)\.sql$`)

func parseFilename(name string) (version, label string) {
	m := migrationNameRe.FindStringSubmatch(name)
	if m == nil {
		log.Fatalf("invalid migration filename: %s", name)
	}
	return m[1], m[0]
}

func listActiveTenants(db *sql.DB) []string {
	rows, err := db.Query("SELECT slug FROM platform.accounts WHERE is_active = true ORDER BY slug")
	if err != nil {
		log.Fatalf("cannot list tenants: %v", err)
	}
	defer rows.Close()
	var tenants []string
	for rows.Next() {
		var s string
		rows.Scan(&s)
		tenants = append(tenants, s)
	}
	return tenants
}

func listMigrations(db *sql.DB, schema string, fsys fs.FS, dir string) {
	applied := appliedMigrations(db, schema)
	files := migrationFiles(fsys, dir, "up")
	fmt.Printf("\nMigrations for schema: %s\n\n", schema)
	fmt.Printf("  %-12s %-50s %s\n", "VERSION", "NAME", "STATUS")
	fmt.Printf("  %s\n", strings.Repeat("-", 75))
	for _, f := range files {
		v, name := parseFilename(filepath.Base(f))
		status := "pending"
		if applied[v] {
			status = "applied"
		}
		fmt.Printf("  %-12s %-50s %s\n", v, name, status)
	}
	fmt.Println()
}

func createMigrationFiles(name string, platformScope bool) {
	subdir := "tenant"
	if platformScope {
		subdir = "platform"
	}
	dir := filepath.Join("db", "migrations", subdir)

	// Find next version number
	entries, _ := os.ReadDir(dir)
	maxVer := 0
	for _, e := range entries {
		if m := migrationNameRe.FindStringSubmatch(e.Name()); m != nil {
			if v, err := strconv.Atoi(m[1]); err == nil && v > maxVer {
				maxVer = v
			}
		}
	}
	next := fmt.Sprintf("%06d", maxVer+1)
	safe := regexp.MustCompile(`[^a-z0-9]+`).ReplaceAllString(strings.ToLower(name), "_")
	ts := time.Now().Format("2006-01-02")

	for _, ext := range []string{"up", "down"} {
		fname := filepath.Join(dir, fmt.Sprintf("%s_%s.%s.sql", next, safe, ext))
		comment := fmt.Sprintf("-- %s migration %s_%s — created %s\n-- Write your %s SQL here\n", subdir, next, safe, ts, ext)
		if err := os.WriteFile(fname, []byte(comment), 0644); err != nil {
			log.Fatalf("cannot create %s: %v", fname, err)
		}
		fmt.Printf("Created: %s\n", fname)
	}
}

// pgIdent sanitizes a schema name for use in SQL identifiers (no user input injection).
func pgIdent(name string) string {
	// Allow only alphanumeric and underscore — reject anything else.
	if !regexp.MustCompile(`^[a-zA-Z_][a-zA-Z0-9_]*$`).MatchString(name) {
		log.Fatalf("invalid schema name: %q", name)
	}
	return `"` + name + `"`
}

func slug(s string) string {
	return regexp.MustCompile(`[^a-z0-9]+`).ReplaceAllString(strings.ToLower(s), "_")
}

func buildDSN() string {
	host := getenv("DB_HOST", "127.0.0.1")
	port := getenv("DB_PORT", "5432")
	user := getenv("DB_USERNAME", "postgres")
	pass := getenv("DB_PASSWORD", "")
	name := getenv("DB_DATABASE", "convision")
	sslmode := getenv("DB_SSLMODE", "disable")
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s", host, port, user, pass, name, sslmode)
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func panicOnErr(err error) {
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		log.Fatal(err)
	}
}
