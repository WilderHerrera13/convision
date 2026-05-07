package bulkimport

import "gorm.io/gorm"

// Importer is the interface every import type must implement.
// Each importer is responsible for a single entity type: it knows its
// expected columns and how to process one Excel data row.
type Importer interface {
	// Columns returns the expected column header names (used for documentation
	// and column-presence validation).
	Columns() []string

	// ProcessRow processes one Excel data row and returns a RecordResult
	// describing whether the record was created, skipped, or errored.
	ProcessRow(db *gorm.DB, rowNum int, data map[string]string) RecordResult
}

// RunFactory is an optional interface for Importers that need per-run
// isolated state (e.g. in-memory caches). When implemented, ProcessExcel
// calls NewRun() to obtain a fresh instance per import so concurrent
// requests never share mutable state.
type RunFactory interface {
	NewRun() Importer
}

// Preloadable is an optional interface for importers that support parallel
// processing. Preload bulk-loads shared reference data (brands, warehouses,
// etc.) from the tenant DB before the worker pool starts, so workers read
// pre-populated read-only caches rather than hitting the DB on every row.
// The returned Importer must also implement WorkerCloner.
type Preloadable interface {
	Preload(db *gorm.DB, allRows []map[string]string) (Importer, error)
}

// WorkerCloner is implemented by run-scoped Importers returned by Preload.
// CloneForWorker returns an independent copy of the run context so each
// goroutine worker operates on its own cache without shared mutable state.
type WorkerCloner interface {
	CloneForWorker() Importer
}

// Registry maps an ImportType to its concrete Importer implementation.
// To add a new import type: create a file importer_<type>.go, implement
// Importer, and register it in NewService — no other changes are required.
type Registry map[ImportType]Importer
