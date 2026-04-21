package bulkimport

// Importer is the interface every import type must implement.
// Each importer is responsible for a single entity type: it knows its
// expected columns and how to process one Excel data row.
type Importer interface {
	// Columns returns the expected column header names (used for documentation
	// and column-presence validation).
	Columns() []string

	// ProcessRow processes one Excel data row and returns a RecordResult
	// describing whether the record was created, skipped, or errored.
	ProcessRow(rowNum int, data map[string]string) RecordResult
}

// Registry maps an ImportType to its concrete Importer implementation.
// To add a new import type: create a file importer_<type>.go, implement
// Importer, and register it in NewService.
type Registry map[ImportType]Importer
