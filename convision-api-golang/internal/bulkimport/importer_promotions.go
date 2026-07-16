package bulkimport

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
	"github.com/convision/api/internal/platform/clock"
	promotionsvc "github.com/convision/api/internal/promotion"
)

const ImportTypePromotions ImportType = "promotions"

var promotionImportColumns = []string{
	"Nombre", "Tipo", "DescuentoPorcentaje", "DescuentoMonto", "CompraMinima",
	"CantidadMinima", "AplicaA", "CategoriaObjetivo", "MarcaObjetivo",
	"TipoProductoObjetivo", "CondicionAplicaA", "CondicionCategoria",
	"CondicionMarca", "CondicionTipoProducto", "FechaInicio", "FechaFin",
	"Prioridad", "Acumulable", "Activa", "Descripcion",
}

// promotionTypeAliases maps the Spanish labels used in the Excel template (and the
// raw English enum values) onto the domain promotion types.
var promotionTypeAliases = map[string]domain.PromotionType{
	"por monto de compra": domain.PromotionTypeCartTotal,
	"monto de compra":     domain.PromotionTypeCartTotal,
	"monto_carrito":       domain.PromotionTypeCartTotal,
	"cart_total":          domain.PromotionTypeCartTotal,

	"monto fijo":              domain.PromotionTypeFixedAmount,
	"monto fijo de descuento": domain.PromotionTypeFixedAmount,
	"monto_fijo":              domain.PromotionTypeFixedAmount,
	"fixed_amount":            domain.PromotionTypeFixedAmount,

	"cumpleanos": domain.PromotionTypeBirthday,
	"cumpleaños": domain.PromotionTypeBirthday,
	"birthday":   domain.PromotionTypeBirthday,

	"categoria": domain.PromotionTypeCategory,
	"categoría": domain.PromotionTypeCategory,
	"category":  domain.PromotionTypeCategory,

	"segundo par": domain.PromotionTypeSecondPair,
	"segundo_par": domain.PromotionTypeSecondPair,
	"second_pair": domain.PromotionTypeSecondPair,

	"compra cruzada": domain.PromotionTypeCrossProduct,
	"compra_cruzada": domain.PromotionTypeCrossProduct,
	"cross_product":  domain.PromotionTypeCrossProduct,
	"compra x":       domain.PromotionTypeCrossProduct,
}

var promotionScopeAliases = map[string]domain.PromotionScope{
	"carrito":       domain.PromotionScopeCart,
	"todo":          domain.PromotionScopeCart,
	"cart":          domain.PromotionScopeCart,
	"categoria":     domain.PromotionScopeCategory,
	"categoría":     domain.PromotionScopeCategory,
	"category":      domain.PromotionScopeCategory,
	"marca":         domain.PromotionScopeBrand,
	"brand":         domain.PromotionScopeBrand,
	"tipo producto": domain.PromotionScopeProductType,
	"tipo_producto": domain.PromotionScopeProductType,
	"product_type":  domain.PromotionScopeProductType,
}

var productTypeAliases = map[string]string{
	"lente":             "lens",
	"lentes":            "lens",
	"lens":              "lens",
	"montura":           "frame",
	"monturas":          "frame",
	"frame":             "frame",
	"lente de contacto": "contact_lens",
	"lente_contacto":    "contact_lens",
	"contact_lens":      "contact_lens",
	"liquido":           "liquid",
	"líquido":           "liquid",
	"liquid":            "liquid",
	"accesorio":         "accessory",
	"accesorios":        "accessory",
	"accessory":         "accessory",
	"otro":              "other",
	"other":             "other",
}

// parseBoolCell interprets SI/NO style Excel cells; empty returns def.
func parseBoolCell(s string, def bool) bool {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "":
		return def
	case "si", "sí", "s", "1", "true", "x", "verdadero":
		return true
	default:
		return false
	}
}

type promotionImporter struct {
	promotionRepo domain.PromotionRepository
	categoryRepo  domain.ProductCategoryRepository
	brandRepo     domain.BrandRepository
	logger        *zap.Logger
}

func newPromotionImporter(
	promotionRepo domain.PromotionRepository,
	categoryRepo domain.ProductCategoryRepository,
	brandRepo domain.BrandRepository,
	logger *zap.Logger,
) Importer {
	return &promotionImporter{
		promotionRepo: promotionRepo,
		categoryRepo:  categoryRepo,
		brandRepo:     brandRepo,
		logger:        logger,
	}
}

func (i *promotionImporter) Columns() []string { return promotionImportColumns }

func (i *promotionImporter) ProcessRow(db *gorm.DB, rowNum int, data map[string]string) RecordResult {
	rec := RecordResult{Row: rowNum, Data: data}

	name := strings.TrimSpace(data["nombre"])
	if name == "" {
		rec.Status = RecordStatusError
		rec.Reason = "campo Nombre vacío"
		return rec
	}

	rawType := strings.ToLower(strings.TrimSpace(data["tipo"]))
	promoType, ok := promotionTypeAliases[rawType]
	if !ok {
		rec.Status = RecordStatusError
		rec.Reason = fmt.Sprintf("Tipo inválido: %q — use: por monto de compra, monto fijo, cumpleaños, categoria, segundo par o compra cruzada", data["tipo"])
		return rec
	}

	// Duplicate check: exact promotion name (case-insensitive), non-deleted.
	existing, _, err := i.promotionRepo.List(db, domain.PromotionFilter{
		Pagination: domain.Pagination{Page: 1, PerPage: 200},
		Search:     name,
	})
	if err == nil {
		for _, e := range existing {
			if strings.EqualFold(strings.TrimSpace(e.Name), name) {
				rec.Status = RecordStatusSkipped
				rec.Reason = "promoción ya existe (Nombre duplicado)"
				return rec
			}
		}
	}

	input := promotionsvc.CreateInput{
		Name:        name,
		Type:        string(promoType),
		Stackable:   parseBoolCell(data["acumulable"], false),
		Description: strings.TrimSpace(data["descripcion"]),
	}
	active := parseBoolCell(data["activa"], true)
	input.Active = &active

	if v := strings.TrimSpace(data["descuentoporcentaje"]); v != "" {
		pct, err := parsePrice(v)
		if err != nil {
			rec.Status = RecordStatusError
			rec.Reason = "campo DescuentoPorcentaje inválido: " + v
			return rec
		}
		input.DiscountPercentage = &pct
	}
	if v := strings.TrimSpace(data["descuentomonto"]); v != "" {
		amt, err := parsePrice(v)
		if err != nil {
			rec.Status = RecordStatusError
			rec.Reason = "campo DescuentoMonto inválido: " + v
			return rec
		}
		input.DiscountAmount = &amt
	}
	if v := strings.TrimSpace(data["compraminima"]); v != "" {
		min, err := parsePrice(v)
		if err != nil {
			rec.Status = RecordStatusError
			rec.Reason = "campo CompraMinima inválido: " + v
			return rec
		}
		input.MinCartTotal = &min
	}
	if v := strings.TrimSpace(data["cantidadminima"]); v != "" {
		q, err := strconv.Atoi(v)
		if err != nil {
			rec.Status = RecordStatusError
			rec.Reason = "campo CantidadMinima inválido: " + v
			return rec
		}
		input.MinQuantity = &q
	}
	if v := strings.TrimSpace(data["prioridad"]); v != "" {
		p, err := strconv.Atoi(v)
		if err != nil {
			rec.Status = RecordStatusError
			rec.Reason = "campo Prioridad inválido: " + v
			return rec
		}
		input.Priority = p
	}

	// Target scope.
	scope, scopeErr := i.resolveScope(db, data, "aplicaa", "categoriaobjetivo", "marcaobjetivo", "tipoproductoobjetivo")
	if scopeErr != "" {
		rec.Status = RecordStatusError
		rec.Reason = scopeErr
		return rec
	}
	input.Scope = string(scope.scope)
	input.ProductCategoryID = scope.categoryID
	input.BrandID = scope.brandID
	input.ProductType = scope.productType

	// Trigger scope (cross_product only).
	if promoType == domain.PromotionTypeCrossProduct {
		trigger, trigErr := i.resolveScope(db, data, "condicionaplicaa", "condicioncategoria", "condicionmarca", "condiciontipoproducto")
		if trigErr != "" {
			rec.Status = RecordStatusError
			rec.Reason = strings.Replace(trigErr, "AplicaA", "CondicionAplicaA", 1)
			return rec
		}
		input.TriggerScope = string(trigger.scope)
		input.TriggerProductCategoryID = trigger.categoryID
		input.TriggerBrandID = trigger.brandID
		input.TriggerProductType = trigger.productType
	}

	// Validity window: FechaInicio starts at 00:00, FechaFin covers the whole day.
	if v := strings.TrimSpace(data["fechainicio"]); v != "" {
		t := parseDate(v)
		if t == nil {
			rec.Status = RecordStatusError
			rec.Reason = "campo FechaInicio inválido (use DD/MM/YYYY): " + v
			return rec
		}
		input.StartDate = t
	}
	if v := strings.TrimSpace(data["fechafin"]); v != "" {
		t := parseDate(v)
		if t == nil {
			rec.Status = RecordStatusError
			rec.Reason = "campo FechaFin inválido (use DD/MM/YYYY): " + v
			return rec
		}
		end := time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 0, clock.Location())
		input.EndDate = &end
	}

	// Shared validation with the HTTP API (percent bounds, per-type requirements,
	// trigger != target, date ordering...).
	promo, err := promotionsvc.BuildFromInput(input)
	if err != nil {
		rec.Status = RecordStatusError
		rec.Reason = err.Error()
		return rec
	}

	if err := i.promotionRepo.Create(db, promo); err != nil {
		i.logger.Warn("bulk import promotions: failed to create promotion",
			zap.Int("row", rowNum),
			zap.String("name", name),
			zap.Error(err),
		)
		rec.Status = RecordStatusError
		rec.Reason = "error al crear promoción: " + err.Error()
		return rec
	}

	rec.Status = RecordStatusCreated
	return rec
}

type resolvedScope struct {
	scope       domain.PromotionScope
	categoryID  *uint
	brandID     *uint
	productType string
}

// resolveScope reads a scope cell plus its three possible target cells and
// resolves category/brand names against the catalog. Returns a non-empty error
// message (Spanish, user-facing) when the configuration is invalid.
func (i *promotionImporter) resolveScope(db *gorm.DB, data map[string]string, scopeKey, categoryKey, brandKey, typeKey string) (resolvedScope, string) {
	out := resolvedScope{scope: domain.PromotionScopeCart}

	raw := strings.ToLower(strings.TrimSpace(data[scopeKey]))
	if raw == "" {
		return out, ""
	}
	scope, ok := promotionScopeAliases[raw]
	if !ok {
		return out, fmt.Sprintf("AplicaA inválido: %q — use: carrito, categoria, marca o tipo producto", data[scopeKey])
	}
	out.scope = scope

	switch scope {
	case domain.PromotionScopeCategory:
		name := strings.TrimSpace(data[categoryKey])
		if name == "" {
			return out, "falta la categoría objetivo para el alcance 'categoria'"
		}
		cats, err := i.categoryRepo.All(db)
		if err != nil {
			return out, "error consultando categorías: " + err.Error()
		}
		for _, c := range cats {
			if strings.EqualFold(strings.TrimSpace(c.Name), name) {
				id := c.ID
				out.categoryID = &id
				return out, ""
			}
		}
		return out, fmt.Sprintf("categoría no encontrada: %q", name)

	case domain.PromotionScopeBrand:
		name := strings.TrimSpace(data[brandKey])
		if name == "" {
			return out, "falta la marca objetivo para el alcance 'marca'"
		}
		b, err := i.brandRepo.GetByName(db, name)
		if err != nil || b == nil {
			return out, fmt.Sprintf("marca no encontrada: %q", name)
		}
		id := b.ID
		out.brandID = &id
		return out, ""

	case domain.PromotionScopeProductType:
		raw := strings.ToLower(strings.TrimSpace(data[typeKey]))
		if raw == "" {
			return out, "falta el tipo de producto para el alcance 'tipo producto'"
		}
		pt, ok := productTypeAliases[raw]
		if !ok {
			return out, fmt.Sprintf("tipo de producto inválido: %q — use: lente, montura, lente de contacto, liquido, accesorio u otro", data[typeKey])
		}
		out.productType = pt
		return out, ""
	}
	return out, ""
}
