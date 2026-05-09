package bulkimport

import (
	"fmt"
	"strconv"
	"strings"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

const ImportTypeInventory ImportType = "inventory"

var inventoryImportColumns = []string{
	"Código", "Identificador", "Descripción", "tipoproducto",
	"Marca", "Categoria", "Tipo", "Cant", "precioventa", "preciocompra", "Sede",
}

// inventoryImporter is the stateless, long-lived singleton stored in the Registry.
// It holds only read-only dependencies. Call NewRun() (sequential) or Preload()
// (parallel) to get a run-scoped instance with per-import caches.
type inventoryImporter struct {
	productRepo   domain.ProductRepository
	brandRepo     domain.BrandRepository
	warehouseRepo domain.WarehouseRepository
	itemRepo      domain.InventoryItemRepository
	movementRepo  domain.StockMovementRepository
	logger        *zap.Logger
}

func newInventoryImporter(
	productRepo domain.ProductRepository,
	brandRepo domain.BrandRepository,
	warehouseRepo domain.WarehouseRepository,
	itemRepo domain.InventoryItemRepository,
	movementRepo domain.StockMovementRepository,
	logger *zap.Logger,
) Importer {
	return &inventoryImporter{
		productRepo:   productRepo,
		brandRepo:     brandRepo,
		warehouseRepo: warehouseRepo,
		itemRepo:      itemRepo,
		movementRepo:  movementRepo,
		logger:        logger,
	}
}

func (i *inventoryImporter) Columns() []string { return inventoryImportColumns }

// ProcessRow satisfies the Importer interface. The sequential path in
// ProcessExcel calls NewRun() first (RunFactory), so this is only invoked
// directly when no run context is established.
func (i *inventoryImporter) ProcessRow(db *gorm.DB, rowNum int, data map[string]string) RecordResult {
	return i.NewRun().(*inventoryImportRun).ProcessRow(db, rowNum, data)
}

// NewRun returns a fresh run-scoped instance with empty in-memory caches.
// Implements RunFactory (sequential path).
func (i *inventoryImporter) NewRun() Importer {
	return &inventoryImportRun{
		inventoryImporter: i,
		brandCache:        make(map[string]*uint),
		warehouseCache:    make(map[uint]*domain.Warehouse),
		productCache:      make(map[string]*domain.Product),
	}
}

// Preload bulk-loads existing brands and warehouses for all rows so that
// workers start with pre-populated read-only caches. Implements Preloadable
// (parallel path).
func (i *inventoryImporter) Preload(db *gorm.DB, allRows []map[string]string) (Importer, error) {
	run := &inventoryImportRun{
		inventoryImporter: i,
		brandCache:        make(map[string]*uint),
		warehouseCache:    make(map[uint]*domain.Warehouse),
		productCache:      make(map[string]*domain.Product),
	}

	// Collect unique brand names and branch IDs referenced in the file.
	brandNames := make(map[string]struct{})
	branchIDs := make(map[uint]struct{})
	for _, row := range allRows {
		if name := strings.TrimSpace(row["marca"]); name != "" {
			brandNames[name] = struct{}{}
		}
		if s := strings.TrimSpace(row["sede"]); s != "" {
			if f, err := strconv.ParseFloat(s, 64); err == nil && f > 0 {
				branchIDs[uint(f)] = struct{}{}
			}
		}
	}

	// Bulk SELECT existing brands in a single query.
	if len(brandNames) > 0 {
		names := make([]string, 0, len(brandNames))
		for n := range brandNames {
			names = append(names, n)
		}
		var brands []domain.Brand
		db.Where("name IN ?", names).Find(&brands)
		for idx := range brands {
			id := brands[idx].ID
			run.brandCache[brands[idx].Name] = &id
		}
		i.logger.Info("bulk inventory preload: brands loaded",
			zap.Int("found", len(brands)),
			zap.Int("total_unique", len(names)),
		)
	}

	// Bulk SELECT existing warehouses in a single query.
	if len(branchIDs) > 0 {
		ids := make([]uint, 0, len(branchIDs))
		for id := range branchIDs {
			ids = append(ids, id)
		}
		var warehouses []domain.Warehouse
		db.Where("branch_id IN ? AND status = ?", ids, "active").Find(&warehouses)
		for idx := range warehouses {
			run.warehouseCache[warehouses[idx].BranchID] = &warehouses[idx]
		}
		i.logger.Info("bulk inventory preload: warehouses loaded",
			zap.Int("found", len(warehouses)),
			zap.Int("total_unique", len(ids)),
		)
	}

	return run, nil
}

// inventoryImportRun is a short-lived, per-import-run context. It wraps the
// stateless inventoryImporter and adds three in-memory caches that eliminate
// redundant SELECTs when many rows share the same brand, warehouse, or product.
//
// For the sequential path: obtained via inventoryImporter.NewRun().
// For the parallel path: obtained via inventoryImporter.Preload(), then
// cloned per worker via CloneForWorker().
type inventoryImportRun struct {
	*inventoryImporter
	// brandCache maps brand name → brand ID (populated once, reused per row).
	brandCache map[string]*uint
	// warehouseCache maps branch ID → warehouse (one warehouse per branch).
	warehouseCache map[uint]*domain.Warehouse
	// productCache maps internal_code → product.
	productCache map[string]*domain.Product
}

func (r *inventoryImportRun) Columns() []string { return r.inventoryImporter.Columns() }

// CloneForWorker returns an independent copy of this run context so that
// each goroutine worker has its own cache maps. Implements WorkerCloner.
// The copy is a shallow clone of the pre-loaded caches; workers independently
// discover and add new entries to their own copies.
func (r *inventoryImportRun) CloneForWorker() Importer {
	brandCopy := make(map[string]*uint, len(r.brandCache))
	for k, v := range r.brandCache {
		brandCopy[k] = v
	}
	whCopy := make(map[uint]*domain.Warehouse, len(r.warehouseCache))
	for k, v := range r.warehouseCache {
		whCopy[k] = v
	}
	prodCopy := make(map[string]*domain.Product, len(r.productCache))
	for k, v := range r.productCache {
		prodCopy[k] = v
	}
	return &inventoryImportRun{
		inventoryImporter: r.inventoryImporter,
		brandCache:        brandCopy,
		warehouseCache:    whCopy,
		productCache:      prodCopy,
	}
}

func (r *inventoryImportRun) ProcessRow(db *gorm.DB, rowNum int, data map[string]string) RecordResult {
	rec := RecordResult{Row: rowNum, Data: data}

	internalCode := strings.TrimSpace(data["código"])
	if internalCode == "" {
		rec.Status = RecordStatusError
		rec.Reason = "campo Código vacío"
		return rec
	}

	quantityStr := strings.TrimSpace(data["cant"])
	quantityFloat, err := strconv.ParseFloat(quantityStr, 64)
	if err != nil || quantityFloat <= 0 {
		rec.Status = RecordStatusError
		rec.Reason = "campo Cant inválido: " + quantityStr
		return rec
	}
	quantity := int(quantityFloat)

	sedeStr := strings.TrimSpace(data["sede"])
	sedeFloat, err := strconv.ParseFloat(sedeStr, 64)
	if err != nil || sedeFloat <= 0 {
		rec.Status = RecordStatusError
		rec.Reason = "campo Sede inválido: " + sedeStr
		return rec
	}
	branchID := uint(sedeFloat)

	description := strings.TrimSpace(data["descripción"])
	if description == "" {
		description = strings.TrimSpace(data["descripcion"])
	}
	tipoproducto := strings.ToUpper(strings.TrimSpace(data["tipoproducto"]))
	productType := resolveInventoryProductType(tipoproducto)

	var price, cost float64
	if v, err := parsePrice(strings.TrimSpace(data["precioventa"])); err == nil {
		price = v
	}
	if v, err := parsePrice(strings.TrimSpace(data["preciocompra"])); err == nil {
		cost = v
	}

	brandName := strings.TrimSpace(data["marca"])
	gender := toTitleCase(strings.TrimSpace(data["categoria"]))
	shape := toTitleCase(strings.TrimSpace(data["tipo"]))
	identifier := strings.TrimSpace(data["identificador"])

	product, productCreated, err := r.resolveOrCreateProduct(db, rowNum, internalCode, identifier, description, productType, price, cost, brandName, gender, shape)
	if err != nil {
		rec.Status = RecordStatusError
		rec.Reason = "error al resolver producto: " + err.Error()
		return rec
	}

	warehouse, err := r.resolveOrCreateWarehouse(db, rowNum, branchID)
	if err != nil {
		rec.Status = RecordStatusError
		rec.Reason = fmt.Sprintf("error al resolver bodega para sede %s: %s", sedeStr, err.Error())
		return rec
	}

	itemCreated, err := r.upsertInventoryItem(db, rowNum, product.ID, warehouse.ID, branchID, quantity)
	if err != nil {
		rec.Status = RecordStatusError
		rec.Reason = "error al actualizar inventario: " + err.Error()
		return rec
	}

	if productCreated || itemCreated {
		rec.Status = RecordStatusCreated
	} else {
		rec.Status = RecordStatusUpdated
	}
	return rec
}

func resolveInventoryProductType(tipoproducto string) domain.ProductType {
	if tipoproducto == "MONTURA" {
		return domain.ProductTypeFrame
	}
	return domain.ProductTypeAccessory
}

func (r *inventoryImportRun) resolveOrCreateProduct(
	db *gorm.DB, rowNum int,
	internalCode, identifier, description string,
	productType domain.ProductType,
	price, cost float64,
	brandName, gender, shape string,
) (*domain.Product, bool, error) {
	if p, ok := r.productCache[internalCode]; ok {
		return p, false, nil
	}

	existing, _, err := r.productRepo.List(db, domain.ProductFilter{
		Pagination:   domain.Pagination{Page: 1, PerPage: 1},
		InternalCode: internalCode,
		ProductType:  string(productType),
	})
	if err == nil && len(existing) > 0 {
		r.productCache[internalCode] = existing[0]
		return existing[0], false, nil
	}

	p := &domain.Product{
		InternalCode: internalCode,
		Identifier:   identifier,
		Description:  description,
		Price:        price,
		Cost:         cost,
		ProductType:  productType,
		TracksStock:  true,
		Status:       domain.ProductStatusEnabled,
	}
	p.BrandID = r.resolveOrCreateBrand(db, rowNum, brandName)
	if productType == domain.ProductTypeFrame {
		p.FrameAttributes = &domain.ProductFrameAttributes{
			Gender: gender,
			Shape:  shape,
		}
	}
	if err := r.productRepo.Create(db, p); err != nil {
		return nil, false, fmt.Errorf("crear producto %q: %w", internalCode, err)
	}
	r.logger.Info("bulk inventory: product created",
		zap.Int("row", rowNum),
		zap.String("internal_code", internalCode),
	)
	// Do NOT cache a freshly created product for the same reason as brand/warehouse.
	return p, true, nil
}

// resolveOrCreateWarehouse returns the warehouse for branchID from cache or DB.
// If it doesn't exist yet, it creates one. A nested SAVEPOINT protects the
// INSERT so that a concurrent unique-constraint violation (parallel workers)
// can be recovered without aborting the outer row transaction.
func (r *inventoryImportRun) resolveOrCreateWarehouse(db *gorm.DB, rowNum int, branchID uint) (*domain.Warehouse, error) {
	if w, ok := r.warehouseCache[branchID]; ok {
		return w, nil
	}

	bid := branchID
	warehouses, _, err := r.warehouseRepo.List(db, domain.WarehouseFilter{
		Pagination: domain.Pagination{Page: 1, PerPage: 1},
		BranchID:   &bid,
		Status:     "active",
	})
	if err == nil && len(warehouses) > 0 {
		r.warehouseCache[branchID] = warehouses[0]
		return warehouses[0], nil
	}

	w := &domain.Warehouse{
		BranchID: branchID,
		Name:     "Bodega Principal",
		Code:     fmt.Sprintf("WH-%d", branchID),
		Status:   "active",
		Notes:    "Creada automáticamente por carga masiva de inventario",
	}

	// Nested SAVEPOINT: if another worker already inserted this warehouse
	// (unique constraint on Code), we roll back cleanly and re-select.
	sp := fmt.Sprintf("sp_wh_%d", rowNum)
	db.Exec("SAVEPOINT " + sp)
	if createErr := r.warehouseRepo.Create(db, w); createErr != nil {
		db.Exec("ROLLBACK TO SAVEPOINT " + sp)
		db.Exec("RELEASE SAVEPOINT " + sp)
		if isUniqueViolation(createErr) {
			bid2 := branchID
			warehouses2, _, err2 := r.warehouseRepo.List(db, domain.WarehouseFilter{
				Pagination: domain.Pagination{Page: 1, PerPage: 1},
				BranchID:   &bid2,
				Status:     "active",
			})
			if err2 == nil && len(warehouses2) > 0 {
				r.warehouseCache[branchID] = warehouses2[0]
				return warehouses2[0], nil
			}
		}
		return nil, fmt.Errorf("crear bodega para sede %d: %w", branchID, createErr)
	}
	db.Exec("RELEASE SAVEPOINT " + sp)

	r.logger.Info("bulk inventory: warehouse auto-created",
		zap.Int("row", rowNum),
		zap.Uint("branch_id", branchID),
	)
	// Do NOT cache: same reason as resolveOrCreateBrand — the warehouse was
	// created inside the current row's SAVEPOINT and may be rolled back.
	return w, nil
}

func (r *inventoryImportRun) upsertInventoryItem(db *gorm.DB, rowNum int, productID, warehouseID, branchID uint, quantity int) (bool, error) {
	pid := productID
	whid := warehouseID
	bid := branchID
	items, _, err := r.itemRepo.List(db, domain.InventoryItemFilter{
		Pagination:  domain.Pagination{Page: 1, PerPage: 1},
		BranchID:    &bid,
		ProductID:   &pid,
		WarehouseID: &whid,
	})
	if err != nil {
		return false, fmt.Errorf("buscar inventory item: %w", err)
	}

	refType := domain.ReferenceTypeManual

	if len(items) > 0 {
		existing := items[0]
		qBefore := existing.Quantity
		existing.Quantity += quantity
		if err := r.itemRepo.Update(db, existing); err != nil {
			return false, fmt.Errorf("actualizar quantity: %w", err)
		}
		movement := &domain.StockMovement{
			ProductID:      productID,
			WarehouseID:    warehouseID,
			MovementType:   domain.MovementTypeAdjustmentAdd,
			ReferenceType:  &refType,
			QuantityBefore: qBefore,
			QuantityDelta:  quantity,
			QuantityAfter:  existing.Quantity,
			Notes:          "carga masiva de inventario",
		}
		if err := r.movementRepo.Create(db, movement); err != nil {
			r.logger.Warn("bulk inventory: failed to write adjustment_add movement",
				zap.Int("row", rowNum), zap.Error(err))
		}
		return false, nil
	}

	item := &domain.InventoryItem{
		BranchID:    branchID,
		ProductID:   productID,
		WarehouseID: warehouseID,
		Quantity:    quantity,
		Status:      domain.InventoryItemStatusAvailable,
		Notes:       "carga masiva de inventario",
	}
	if err := r.itemRepo.Create(db, item); err != nil {
		return false, fmt.Errorf("crear inventory item: %w", err)
	}
	movement := &domain.StockMovement{
		ProductID:      productID,
		WarehouseID:    warehouseID,
		MovementType:   domain.MovementTypeEntry,
		ReferenceType:  &refType,
		QuantityBefore: 0,
		QuantityDelta:  quantity,
		QuantityAfter:  quantity,
		Notes:          "carga masiva de inventario",
	}
	if err := r.movementRepo.Create(db, movement); err != nil {
		r.logger.Warn("bulk inventory: failed to write entry movement",
			zap.Int("row", rowNum), zap.Error(err))
	}
	return true, nil
}

// resolveOrCreateBrand returns the brand ID for name from cache or DB. A
// nested SAVEPOINT protects the INSERT so that a concurrent unique-constraint
// violation (parallel workers racing to create the same brand) can be
// recovered without aborting the outer row transaction.
func (r *inventoryImportRun) resolveOrCreateBrand(db *gorm.DB, rowNum int, name string) *uint {
	if name == "" {
		return nil
	}
	if id, ok := r.brandCache[name]; ok {
		return id
	}

	e, err := r.brandRepo.GetByName(db, name)
	if err == nil {
		id := e.ID
		r.brandCache[name] = &id
		return &id
	}

	sp := fmt.Sprintf("sp_brand_%d", rowNum)
	db.Exec("SAVEPOINT " + sp)
	newEntry := &domain.Brand{Name: name}
	if createErr := r.brandRepo.Create(db, newEntry); createErr != nil {
		db.Exec("ROLLBACK TO SAVEPOINT " + sp)
		db.Exec("RELEASE SAVEPOINT " + sp)
		if isUniqueViolation(createErr) {
			if e2, err2 := r.brandRepo.GetByName(db, name); err2 == nil {
				id := e2.ID
				r.brandCache[name] = &id
				return &id
			}
		}
		r.logger.Warn("bulk inventory: failed to create brand",
			zap.Int("row", rowNum), zap.String("name", name), zap.Error(createErr))
		return nil
	}
	db.Exec("RELEASE SAVEPOINT " + sp)

	// Do NOT cache a freshly created brand: it lives inside the current row's
	// SAVEPOINT. If the row is rolled back (e.g. warehouse FK fails next), this
	// ID becomes invalid. The next row needing this brand will SELECT it (now
	// committed) and cache it then.
	return &newEntry.ID
}

// isUniqueViolation reports whether err is a PostgreSQL unique-constraint
// violation (SQLSTATE 23505).
func isUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "23505") || strings.Contains(msg, "duplicate key")
}
