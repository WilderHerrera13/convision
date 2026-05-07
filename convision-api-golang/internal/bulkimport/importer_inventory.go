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

func (i *inventoryImporter) ProcessRow(db *gorm.DB, rowNum int, data map[string]string) RecordResult {
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

	product, productCreated, err := i.resolveOrCreateProduct(db, rowNum, internalCode, identifier, description, productType, price, cost, brandName, gender, shape)
	if err != nil {
		rec.Status = RecordStatusError
		rec.Reason = "error al resolver producto: " + err.Error()
		return rec
	}

	warehouse, err := i.resolveOrCreateWarehouse(db, rowNum, branchID)
	if err != nil {
		rec.Status = RecordStatusError
		rec.Reason = fmt.Sprintf("error al resolver bodega para sede %s: %s", sedeStr, err.Error())
		return rec
	}

	itemCreated, err := i.upsertInventoryItem(db, rowNum, product.ID, warehouse.ID, branchID, quantity)
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

func (i *inventoryImporter) resolveOrCreateProduct(
	db *gorm.DB, rowNum int,
	internalCode, identifier, description string,
	productType domain.ProductType,
	price, cost float64,
	brandName, gender, shape string,
) (*domain.Product, bool, error) {
	existing, _, err := i.productRepo.List(db, map[string]any{
		"internal_code": internalCode,
		"product_type":  string(productType),
	}, 1, 1)
	if err == nil && len(existing) > 0 {
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
	p.BrandID = i.resolveOrCreateBrand(db, rowNum, brandName)
	if productType == domain.ProductTypeFrame {
		p.FrameAttributes = &domain.ProductFrameAttributes{
			Gender: gender,
			Shape:  shape,
		}
	}
	if err := i.productRepo.Create(db, p); err != nil {
		return nil, false, fmt.Errorf("crear producto %q: %w", internalCode, err)
	}
	i.logger.Info("bulk inventory: product created",
		zap.Int("row", rowNum),
		zap.String("internal_code", internalCode),
	)
	return p, true, nil
}

func (i *inventoryImporter) resolveOrCreateWarehouse(db *gorm.DB, rowNum int, branchID uint) (*domain.Warehouse, error) {
	warehouses, _, err := i.warehouseRepo.List(db, map[string]any{
		"branch_id": branchID,
		"status":    "active",
	}, 1, 1)
	if err == nil && len(warehouses) > 0 {
		return warehouses[0], nil
	}
	w := &domain.Warehouse{
		BranchID: branchID,
		Name:     "Bodega Principal",
		Code:     fmt.Sprintf("WH-%d", branchID),
		Status:   "active",
		Notes:    "Creada automáticamente por carga masiva de inventario",
	}
	if err := i.warehouseRepo.Create(db, w); err != nil {
		return nil, fmt.Errorf("crear bodega para sede %d: %w", branchID, err)
	}
	i.logger.Info("bulk inventory: warehouse auto-created",
		zap.Int("row", rowNum),
		zap.Uint("branch_id", branchID),
	)
	return w, nil
}

func (i *inventoryImporter) upsertInventoryItem(db *gorm.DB, rowNum int, productID, warehouseID, branchID uint, quantity int) (bool, error) {
	items, _, err := i.itemRepo.List(db, map[string]any{
		"product_id":   productID,
		"warehouse_id": warehouseID,
		"branch_id":    branchID,
	}, 1, 1)
	if err != nil {
		return false, fmt.Errorf("buscar inventory item: %w", err)
	}

	refType := domain.ReferenceTypeManual

	if len(items) > 0 {
		existing := items[0]
		qBefore := existing.Quantity
		existing.Quantity += quantity
		if err := i.itemRepo.Update(db, existing); err != nil {
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
		if err := i.movementRepo.Create(db, movement); err != nil {
			i.logger.Warn("bulk inventory: failed to write adjustment_add movement",
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
	if err := i.itemRepo.Create(db, item); err != nil {
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
	if err := i.movementRepo.Create(db, movement); err != nil {
		i.logger.Warn("bulk inventory: failed to write entry movement",
			zap.Int("row", rowNum), zap.Error(err))
	}
	return true, nil
}

func (i *inventoryImporter) resolveOrCreateBrand(db *gorm.DB, rowNum int, name string) *uint {
	if name == "" {
		return nil
	}
	e, err := i.brandRepo.GetByName(db, name)
	if err == nil {
		id := e.ID
		return &id
	}
	newEntry := &domain.Brand{Name: name}
	if err := i.brandRepo.Create(db, newEntry); err != nil {
		i.logger.Warn("bulk inventory: failed to create brand",
			zap.Int("row", rowNum), zap.String("name", name), zap.Error(err))
		return nil
	}
	id := newEntry.ID
	return &id
}
