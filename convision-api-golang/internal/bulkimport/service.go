package bulkimport

import (
	"fmt"
	"mime/multipart"
	"sort"
	"strings"
	"sync"
	"time"
	"unicode"

	"github.com/xuri/excelize/v2"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// ImportType identifies which entity type is being imported.
type ImportType string

const (
	ImportTypePatients   ImportType = "patients"
	ImportTypeDoctors    ImportType = "doctors"
	ImportTypeStaffUsers ImportType = "staff-users"
	// ImportTypeScheduledAppointments is declared in importer_scheduled_appointments.go
)

// RecordStatus describes the outcome of processing one row.
type RecordStatus string

const (
	RecordStatusCreated RecordStatus = "created"
	RecordStatusSkipped RecordStatus = "skipped"
	RecordStatusError   RecordStatus = "error"
	RecordStatusUpdated RecordStatus = "updated"
)

// RecordResult holds the processing result for a single Excel row.
type RecordResult struct {
	Row    int               `json:"row"`
	Status RecordStatus      `json:"status"`
	Data   map[string]string `json:"data"`
	Reason string            `json:"reason,omitempty"`
}

// ImportResult is the summary returned after processing an upload.
type ImportResult struct {
	ImportType ImportType     `json:"import_type"`
	TotalRows  int            `json:"total_rows"`
	Created    int            `json:"created"`
	Skipped    int            `json:"skipped"`
	Errors     int            `json:"errors"`
	Records    []RecordResult `json:"records"`
}

// ConnectionFactory creates a *gorm.DB pinned to a single connection with
// search_path set to schemaName. The cleanup func releases the connection
// and must always be deferred by the caller.
type ConnectionFactory func(schemaName string) (*gorm.DB, func(), error)

// workerCount is the number of parallel DB workers used for imports that
// implement the Preloadable interface.
const workerCount = 4

// Service processes bulk Excel imports by delegating to the registered Importer
// for each ImportType. To support a new type: implement Importer and register
// it in NewService — no other changes are required.
type Service struct {
	registry    Registry
	connFactory ConnectionFactory // nil → parallel processing disabled
	logger      *zap.Logger
}

// NewService creates a Service with all built-in importers pre-registered.
// connFactory enables parallel processing for importers that support it
// (currently inventory). Pass nil to disable parallel processing.
func NewService(
	connFactory ConnectionFactory,
	patientRepo domain.PatientRepository,
	userRepo domain.UserRepository,
	branchRepo domain.BranchRepository,
	appointmentRepo domain.AppointmentRepository,
	productRepo domain.ProductRepository,
	lensTypeRepo domain.LensTypeRepository,
	brandRepo domain.BrandRepository,
	materialRepo domain.MaterialRepository,
	lensClassRepo domain.LensClassRepository,
	treatmentRepo domain.TreatmentRepository,
	photochromicRepo domain.PhotochromicRepository,
	supplierRepo domain.SupplierRepository,
	warehouseRepo domain.WarehouseRepository,
	itemRepo domain.InventoryItemRepository,
	movementRepo domain.StockMovementRepository,
	logger *zap.Logger,
) *Service {
	return &Service{
		connFactory: connFactory,
		registry: Registry{
			ImportTypePatients:              newPatientImporter(patientRepo, logger),
			ImportTypeDoctors:               newDoctorImporter(userRepo, logger),
			ImportTypeStaffUsers:            newStaffUserImporter(userRepo, branchRepo, logger),
			ImportTypeScheduledAppointments: newScheduledAppointmentsImporter(patientRepo, userRepo, appointmentRepo, logger),
			ImportTypeLenses:                newLensImporter(productRepo, lensTypeRepo, brandRepo, materialRepo, lensClassRepo, treatmentRepo, photochromicRepo, supplierRepo, logger),
			ImportTypeInventory:             newInventoryImporter(productRepo, brandRepo, warehouseRepo, itemRepo, movementRepo, logger),
		},
		logger: logger,
	}
}

// ProcessExcel parses the uploaded file and processes each row with the
// Importer registered for importType. schemaName is the tenant PostgreSQL
// schema; it is used to pin worker connections when parallel processing is
// enabled (non-empty and not "platform").
func (s *Service) ProcessExcel(db *gorm.DB, schemaName string, fh *multipart.FileHeader, importType ImportType) (*ImportResult, error) {
	importer, ok := s.registry[importType]
	if !ok {
		return nil, fmt.Errorf("tipo de importación desconocido: %q", importType)
	}

	src, err := fh.Open()
	if err != nil {
		return nil, fmt.Errorf("no se pudo abrir el archivo: %w", err)
	}
	defer src.Close()

	f, err := excelize.OpenReader(src)
	if err != nil {
		return nil, fmt.Errorf("archivo Excel inválido: %w", err)
	}
	defer f.Close()

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, fmt.Errorf("el archivo no contiene hojas")
	}

	rows, err := f.GetRows(sheets[0])
	if err != nil {
		return nil, fmt.Errorf("no se pudieron leer las filas: %w", err)
	}
	if len(rows) < 2 {
		return nil, fmt.Errorf("el archivo no contiene datos (solo encabezados o vacío)")
	}

	headers := normalizeHeaders(rows[0])
	dataRows := rows[1:]

	// Pre-map all rows once regardless of which processing path is taken.
	mappedRows := make([]map[string]string, len(dataRows))
	for i, row := range dataRows {
		mappedRows[i] = mapRowToHeaders(headers, row)
	}

	result := &ImportResult{ImportType: importType, TotalRows: len(mappedRows)}

	// Parallel path: importer must support Preloadable, connFactory must be
	// configured, and the request must be scoped to a real tenant schema.
	if s.connFactory != nil && schemaName != "" && schemaName != "platform" {
		if pl, ok := importer.(Preloadable); ok {
			return s.processParallel(db, pl, mappedRows, schemaName, importType)
		}
	}

	// Sequential path (all importers that don't support parallel).
	runner := importer
	if rf, ok := importer.(RunFactory); ok {
		runner = rf.NewRun()
	}

	for i, rowData := range mappedRows {
		rowNum := i + 2

		sp := fmt.Sprintf("sp_row_%d", rowNum)
		db.Exec("SAVEPOINT " + sp)
		rec := runner.ProcessRow(db, rowNum, rowData)
		if rec.Status == RecordStatusError {
			db.Exec("ROLLBACK TO SAVEPOINT " + sp)
		} else {
			db.Exec("RELEASE SAVEPOINT " + sp)
		}

		result.Records = append(result.Records, rec)
		switch rec.Status {
		case RecordStatusCreated:
			result.Created++
		case RecordStatusUpdated:
			result.Created++ // counts as successfully processed
		case RecordStatusSkipped:
			result.Skipped++
		case RecordStatusError:
			result.Errors++
		}
	}

	s.logger.Info("bulk import completed",
		zap.String("type", string(importType)),
		zap.Int("total", result.TotalRows),
		zap.Int("created", result.Created),
		zap.Int("skipped", result.Skipped),
		zap.Int("errors", result.Errors),
	)

	return result, nil
}

type workerJob struct {
	rowNum  int
	rowData map[string]string
}

type workerResult struct {
	rowNum int
	rec    RecordResult
}

// processParallel runs the import using a pool of goroutine workers. Each
// worker gets its own PostgreSQL connection (search_path pinned to schemaName)
// and its own clone of the pre-populated run context. Workers commit their
// results independently — per-row atomicity replaces per-import atomicity,
// which is acceptable and preferable for bulk operations.
func (s *Service) processParallel(
	tenantDB *gorm.DB,
	pl Preloadable,
	mappedRows []map[string]string,
	schemaName string,
	importType ImportType,
) (*ImportResult, error) {
	// Phase 1: pre-load reference data (brands, warehouses) using the
	// existing tenant transaction so we avoid redundant per-row SELECTs.
	baseRun, err := pl.Preload(tenantDB, mappedRows)
	if err != nil {
		return nil, fmt.Errorf("preload: %w", err)
	}
	wc, ok := baseRun.(WorkerCloner)
	if !ok {
		return nil, fmt.Errorf("preloaded importer does not implement WorkerCloner")
	}

	// Phase 2: distribute rows across workers.
	jobs := make(chan workerJob, len(mappedRows))
	results := make(chan workerResult, len(mappedRows))

	var wg sync.WaitGroup
	for w := 0; w < workerCount; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()

			workerDB, cleanup, err := s.connFactory(schemaName)
			if err != nil {
				s.logger.Error("bulk import worker: connection failed", zap.Error(err))
				// Remaining jobs will be handled by other workers.
				return
			}
			defer cleanup()

			tx := workerDB.Begin()
			if tx.Error != nil {
				s.logger.Error("bulk import worker: begin tx failed", zap.Error(tx.Error))
				return
			}

			// Worker-local results: collected before commit so that a commit
			// failure can mark all rows as errors rather than reporting false success.
			localResults := make([]workerResult, 0, len(mappedRows)/workerCount+1)
			workerRun := wc.CloneForWorker()

			for j := range jobs {
				sp := fmt.Sprintf("sp_row_%d", j.rowNum)
				tx.Exec("SAVEPOINT " + sp)
				rec := workerRun.ProcessRow(tx, j.rowNum, j.rowData)
				if rec.Status == RecordStatusError {
					tx.Exec("ROLLBACK TO SAVEPOINT " + sp)
				} else {
					tx.Exec("RELEASE SAVEPOINT " + sp)
				}
				localResults = append(localResults, workerResult{j.rowNum, rec})
			}

			if err := tx.Commit().Error; err != nil {
				s.logger.Error("bulk import worker: commit failed", zap.Error(err))
				for _, r := range localResults {
					if r.rec.Status != RecordStatusError {
						r.rec.Status = RecordStatusError
						r.rec.Reason = "fallo al confirmar transacción del worker"
					}
					results <- r
				}
				return
			}

			for _, r := range localResults {
				results <- r
			}
		}()
	}

	// Feed all jobs, then signal workers to stop.
	for i, rowData := range mappedRows {
		jobs <- workerJob{i + 2, rowData}
	}
	close(jobs)

	// Close results once all workers finish.
	go func() {
		wg.Wait()
		close(results)
	}()

	// Collect and restore row order.
	collected := make([]workerResult, 0, len(mappedRows))
	for r := range results {
		collected = append(collected, r)
	}
	sort.Slice(collected, func(i, j int) bool {
		return collected[i].rowNum < collected[j].rowNum
	})

	result := &ImportResult{ImportType: importType, TotalRows: len(mappedRows)}
	for _, r := range collected {
		result.Records = append(result.Records, r.rec)
		switch r.rec.Status {
		case RecordStatusCreated:
			result.Created++
		case RecordStatusUpdated:
			result.Created++
		case RecordStatusSkipped:
			result.Skipped++
		case RecordStatusError:
			result.Errors++
		}
	}

	s.logger.Info("bulk import (parallel) completed",
		zap.String("type", string(importType)),
		zap.Int("workers", workerCount),
		zap.Int("total", result.TotalRows),
		zap.Int("created", result.Created),
		zap.Int("skipped", result.Skipped),
		zap.Int("errors", result.Errors),
	)

	return result, nil
}

// RegisteredTypes returns all import types registered in this service.
func (s *Service) RegisteredTypes() []ImportType {
	types := make([]ImportType, 0, len(s.registry))
	for k := range s.registry {
		types = append(types, k)
	}
	return types
}

// normalizeHeaders lowercases all header names for case-insensitive matching.
func normalizeHeaders(row []string) []string {
	out := make([]string, len(row))
	for i, h := range row {
		out[i] = strings.ToLower(strings.TrimSpace(h))
	}
	return out
}

// mapRowToHeaders builds a map[normalizedHeader]value for a data row.
func mapRowToHeaders(headers []string, row []string) map[string]string {
	m := make(map[string]string, len(headers))
	for i, h := range headers {
		if i < len(row) {
			m[h] = row[i]
		} else {
			m[h] = ""
		}
	}
	return m
}

// splitName splits "FIRSTNAME LASTNAME..." into (firstName, lastName).
func splitName(full string) (string, string) {
	parts := strings.Fields(full)
	if len(parts) == 0 {
		return full, ""
	}
	if len(parts) == 1 {
		return parts[0], ""
	}
	mid := len(parts) / 2
	return strings.Join(parts[:mid], " "), strings.Join(parts[mid:], " ")
}

// toTitleCase converts each word to Title Case using Unicode-aware casing.
func toTitleCase(s string) string {
	words := strings.Fields(s)
	for i, w := range words {
		r := []rune(w)
		if len(r) == 0 {
			continue
		}
		for j, ch := range r {
			if j == 0 {
				r[j] = unicode.ToUpper(ch)
			} else {
				r[j] = unicode.ToLower(ch)
			}
		}
		words[i] = string(r)
	}
	return strings.Join(words, " ")
}

// parseDate tries to parse DD/MM/YYYY or YYYY-MM-DD or DD-MM-YYYY.
func parseDate(s string) *time.Time {
	formats := []string{"02/01/2006", "2006-01-02", "02-01-2006"}
	for _, f := range formats {
		if t, err := time.Parse(f, s); err == nil {
			return &t
		}
	}
	return nil
}

// defaultTempPassword returns a bcrypt hash of a fixed temp password.
func defaultTempPassword() string {
	return "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
}
