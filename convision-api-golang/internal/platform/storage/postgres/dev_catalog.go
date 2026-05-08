package postgres

import (
	"errors"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

type devLensSeed struct {
	InternalCode string
	Identifier   string
	Description  string
	Price        float64
	Cost         float64
}

var localDevLenses = []devLensSeed{
	{InternalCode: "LEN-001", Identifier: "MONO-CR39-AR", Description: "Monofocal CR-39 con Antirreflejo", Price: 180000, Cost: 90000},
	{InternalCode: "LEN-002", Identifier: "MONO-POLI-AR", Description: "Monofocal Policarbonato con Antirreflejo", Price: 240000, Cost: 120000},
	{InternalCode: "LEN-003", Identifier: "MONO-CR39-FA", Description: "Monofocal CR-39 con Filtro luz azul", Price: 220000, Cost: 110000},
	{InternalCode: "LEN-004", Identifier: "BIF-FT28", Description: "Bifocal CR-39 FT28", Price: 320000, Cost: 160000},
	{InternalCode: "LEN-005", Identifier: "PROG-STD", Description: "Progresivo estándar Policarbonato", Price: 460000, Cost: 240000},
}

// EnsureLocalDevCatalog creates a minimal product catalog (lens category + a few
// lens products) so the receptionist's "Seleccionar Lentes para la Venta" dialog
// has data to work with in local dev. Idempotent: skips entries that already exist.
func EnsureLocalDevCatalog(db *gorm.DB, logger *zap.Logger) error {
	categoryID, err := ensureLensCategory(db, logger)
	if err != nil {
		return err
	}

	for _, seed := range localDevLenses {
		var existing domain.Product
		err := db.Select("id").Where("internal_code = ?", seed.InternalCode).First(&existing).Error
		if err == nil {
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		p := &domain.Product{
			InternalCode:      seed.InternalCode,
			Identifier:        seed.Identifier,
			Description:       seed.Description,
			Price:             seed.Price,
			Cost:              seed.Cost,
			ProductCategoryID: &categoryID,
			Status:            domain.ProductStatusEnabled,
			ProductType:       domain.ProductTypeLens,
			TracksStock:       false,
		}
		if err := db.Create(p).Error; err != nil {
			return err
		}
		logger.Info("seeded dev lens product",
			zap.String("internal_code", seed.InternalCode),
			zap.Uint("product_id", p.ID),
		)
	}

	return nil
}

func ensureLensCategory(db *gorm.DB, logger *zap.Logger) (uint, error) {
	var cat domain.ProductCategory
	err := db.Select("id").Where("slug = ?", "lens").First(&cat).Error
	if err == nil {
		return cat.ID, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return 0, err
	}
	cat = domain.ProductCategory{
		Name:     "Lentes oftálmicos",
		Slug:     "lens",
		IsActive: true,
	}
	if err := db.Create(&cat).Error; err != nil {
		return 0, err
	}
	logger.Info("created lens product category", zap.Uint("category_id", cat.ID))
	return cat.ID, nil
}
