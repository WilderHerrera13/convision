package bulkimport

import (
	"strconv"
	"strings"

	"go.uber.org/zap"

	"github.com/convision/api/internal/domain"
)

const ImportTypeLenses ImportType = "lenses"

var lensImportColumns = []string{
	"CodigoInterno", "Identificador", "TipoLente", "Marca", "Material",
	"ClaseLente", "Tratamiento", "Fotocromático", "Descripción",
	"Precio", "Costo", "Proveedor",
}

type lensImporter struct {
	productRepo      domain.ProductRepository
	lensTypeRepo     domain.LensTypeRepository
	brandRepo        domain.BrandRepository
	materialRepo     domain.MaterialRepository
	lensClassRepo    domain.LensClassRepository
	treatmentRepo    domain.TreatmentRepository
	photochromicRepo domain.PhotochromicRepository
	supplierRepo     domain.SupplierRepository
	logger           *zap.Logger
}

func newLensImporter(
	productRepo domain.ProductRepository,
	lensTypeRepo domain.LensTypeRepository,
	brandRepo domain.BrandRepository,
	materialRepo domain.MaterialRepository,
	lensClassRepo domain.LensClassRepository,
	treatmentRepo domain.TreatmentRepository,
	photochromicRepo domain.PhotochromicRepository,
	supplierRepo domain.SupplierRepository,
	logger *zap.Logger,
) Importer {
	return &lensImporter{
		productRepo:      productRepo,
		lensTypeRepo:     lensTypeRepo,
		brandRepo:        brandRepo,
		materialRepo:     materialRepo,
		lensClassRepo:    lensClassRepo,
		treatmentRepo:    treatmentRepo,
		photochromicRepo: photochromicRepo,
		supplierRepo:     supplierRepo,
		logger:           logger,
	}
}

func (i *lensImporter) Columns() []string { return lensImportColumns }

func (i *lensImporter) ProcessRow(rowNum int, data map[string]string) RecordResult {
	rec := RecordResult{Row: rowNum, Data: data}

	internalCode := strings.TrimSpace(data["codigointerno"])
	if internalCode == "" {
		rec.Status = RecordStatusError
		rec.Reason = "campo CodigoInterno vacío"
		return rec
	}

	// Duplicate check: look for existing product with same internal_code and product_type=lens.
	existing, _, err := i.productRepo.List(map[string]any{
		"internal_code": internalCode,
		"product_type":  string(domain.ProductTypeLens),
	}, 1, 1)
	if err == nil && len(existing) > 0 {
		rec.Status = RecordStatusSkipped
		rec.Reason = "lente ya existe (CodigoInterno duplicado)"
		return rec
	}

	priceStr := strings.TrimSpace(data["precio"])
	if priceStr == "" {
		rec.Status = RecordStatusError
		rec.Reason = "campo Precio vacío"
		return rec
	}
	price, err := parsePrice(priceStr)
	if err != nil {
		rec.Status = RecordStatusError
		rec.Reason = "campo Precio inválido: " + priceStr
		return rec
	}

	p := &domain.Product{
		InternalCode: internalCode,
		Identifier:   strings.TrimSpace(data["identificador"]),
		Description:  strings.TrimSpace(data["descripción"]),
		Price:        price,
		Status:       domain.ProductStatusEnabled,
		ProductType:  domain.ProductTypeLens,
		TracksStock:  false,
	}

	if costStr := strings.TrimSpace(data["costo"]); costStr != "" {
		if cost, err := parsePrice(costStr); err == nil {
			p.Cost = cost
		}
	}

	p.BrandID = i.resolveOrCreateBrand(rowNum, strings.TrimSpace(data["marca"]))
	p.SupplierID = i.resolveOrCreateSupplier(rowNum, strings.TrimSpace(data["proveedor"]))

	lensTypeID := i.resolveOrCreateLensType(rowNum, strings.TrimSpace(data["tipolente"]))
	materialID := i.resolveOrCreateMaterial(rowNum, strings.TrimSpace(data["material"]))
	lensClassID := i.resolveOrCreateLensClass(rowNum, strings.TrimSpace(data["claselente"]))
	treatmentID := i.resolveOrCreateTreatment(rowNum, strings.TrimSpace(data["tratamiento"]))
	photochromicID := i.resolveOrCreatePhotochromic(rowNum, strings.TrimSpace(data["fotocromático"]))

	p.LensAttributes = &domain.ProductLensAttributes{
		LensTypeID:     lensTypeID,
		MaterialID:     materialID,
		LensClassID:    lensClassID,
		TreatmentID:    treatmentID,
		PhotochromicID: photochromicID,
	}

	if err := i.productRepo.Create(p); err != nil {
		i.logger.Warn("bulk import lenses: failed to create product",
			zap.Int("row", rowNum),
			zap.String("internal_code", internalCode),
			zap.Error(err),
		)
		rec.Status = RecordStatusError
		rec.Reason = "error al crear lente: " + err.Error()
		return rec
	}

	rec.Status = RecordStatusCreated
	return rec
}

func (i *lensImporter) resolveOrCreateLensType(rowNum int, name string) *uint {
	if name == "" {
		return nil
	}
	e, err := i.lensTypeRepo.GetByName(name)
	if err == nil {
		id := e.ID
		return &id
	}
	newEntry := &domain.LensType{Name: name}
	if err := i.lensTypeRepo.Create(newEntry); err != nil {
		i.logger.Warn("bulk import lenses: failed to create lens_type",
			zap.Int("row", rowNum), zap.String("name", name), zap.Error(err))
		return nil
	}
	id := newEntry.ID
	return &id
}

func (i *lensImporter) resolveOrCreateBrand(rowNum int, name string) *uint {
	if name == "" {
		return nil
	}
	e, err := i.brandRepo.GetByName(name)
	if err == nil {
		id := e.ID
		return &id
	}
	newEntry := &domain.Brand{Name: name}
	if err := i.brandRepo.Create(newEntry); err != nil {
		i.logger.Warn("bulk import lenses: failed to create brand",
			zap.Int("row", rowNum), zap.String("name", name), zap.Error(err))
		return nil
	}
	id := newEntry.ID
	return &id
}

func (i *lensImporter) resolveOrCreateMaterial(rowNum int, name string) *uint {
	if name == "" {
		return nil
	}
	e, err := i.materialRepo.GetByName(name)
	if err == nil {
		id := e.ID
		return &id
	}
	newEntry := &domain.Material{Name: name}
	if err := i.materialRepo.Create(newEntry); err != nil {
		i.logger.Warn("bulk import lenses: failed to create material",
			zap.Int("row", rowNum), zap.String("name", name), zap.Error(err))
		return nil
	}
	id := newEntry.ID
	return &id
}

func (i *lensImporter) resolveOrCreateLensClass(rowNum int, name string) *uint {
	if name == "" {
		return nil
	}
	e, err := i.lensClassRepo.GetByName(name)
	if err == nil {
		id := e.ID
		return &id
	}
	newEntry := &domain.LensClass{Name: name}
	if err := i.lensClassRepo.Create(newEntry); err != nil {
		i.logger.Warn("bulk import lenses: failed to create lens_class",
			zap.Int("row", rowNum), zap.String("name", name), zap.Error(err))
		return nil
	}
	id := newEntry.ID
	return &id
}

func (i *lensImporter) resolveOrCreateTreatment(rowNum int, name string) *uint {
	if name == "" {
		return nil
	}
	e, err := i.treatmentRepo.GetByName(name)
	if err == nil {
		id := e.ID
		return &id
	}
	newEntry := &domain.Treatment{Name: name}
	if err := i.treatmentRepo.Create(newEntry); err != nil {
		i.logger.Warn("bulk import lenses: failed to create treatment",
			zap.Int("row", rowNum), zap.String("name", name), zap.Error(err))
		return nil
	}
	id := newEntry.ID
	return &id
}

func (i *lensImporter) resolveOrCreatePhotochromic(rowNum int, name string) *uint {
	if name == "" {
		return nil
	}
	e, err := i.photochromicRepo.GetByName(name)
	if err == nil {
		id := e.ID
		return &id
	}
	newEntry := &domain.Photochromic{Name: name}
	if err := i.photochromicRepo.Create(newEntry); err != nil {
		i.logger.Warn("bulk import lenses: failed to create photochromic",
			zap.Int("row", rowNum), zap.String("name", name), zap.Error(err))
		return nil
	}
	id := newEntry.ID
	return &id
}

func (i *lensImporter) resolveOrCreateSupplier(rowNum int, name string) *uint {
	if name == "" {
		return nil
	}
	suppliers, _, err := i.supplierRepo.List(map[string]any{"name": name}, 1, 1)
	if err == nil && len(suppliers) > 0 {
		id := suppliers[0].ID
		return &id
	}
	newEntry := &domain.Supplier{Name: name}
	if err := i.supplierRepo.Create(newEntry); err != nil {
		i.logger.Warn("bulk import lenses: failed to create supplier",
			zap.Int("row", rowNum), zap.String("name", name), zap.Error(err))
		return nil
	}
	id := newEntry.ID
	return &id
}

// parsePrice parses a numeric string that may contain thousands separators.
// Handles both "720000" and "1,234.56" formats.
func parsePrice(s string) (float64, error) {
	cleaned := strings.ReplaceAll(s, ",", "")
	cleaned = strings.ReplaceAll(cleaned, " ", "")
	return strconv.ParseFloat(cleaned, 64)
}
