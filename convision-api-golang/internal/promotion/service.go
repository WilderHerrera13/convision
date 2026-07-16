package promotion

import (
	"math"
	"sort"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/convision/api/internal/domain"
)

// Service handles promotion (marketing campaign) use-cases, including the
// checkout evaluation engine that auto-applies the single best matching promotion.
type Service struct {
	repo   domain.PromotionRepository
	db     *gorm.DB
	logger *zap.Logger
	now    func() time.Time
}

// NewService creates a new promotion Service.
func NewService(repo domain.PromotionRepository, db *gorm.DB, logger *zap.Logger) *Service {
	return &Service{repo: repo, db: db, logger: logger, now: time.Now}
}

// --- DTOs ---

// CreateInput is the payload for creating/updating a promotion.
type CreateInput struct {
	Name               string     `json:"name"                binding:"required"`
	Type               string     `json:"type"                binding:"required"`
	Active             *bool      `json:"active"`
	Priority           int        `json:"priority"`
	Stackable          bool       `json:"stackable"`
	DiscountPercentage *float64   `json:"discount_percentage"`
	DiscountAmount     *float64   `json:"discount_amount"`
	MinCartTotal       *float64   `json:"min_cart_total"`
	MinQuantity        *int       `json:"min_quantity"`
	Scope              string     `json:"scope"`
	ProductCategoryID  *uint      `json:"product_category_id"`
	BrandID            *uint      `json:"brand_id"`
	ProductType        string     `json:"product_type"`

	// Trigger* fields are only used by type=cross_product: the condition that must be
	// present in the cart (independent of Scope/discount targets above) to activate it.
	TriggerScope             string `json:"trigger_scope"`
	TriggerProductCategoryID *uint  `json:"trigger_product_category_id"`
	TriggerBrandID           *uint  `json:"trigger_brand_id"`
	TriggerProductType       string `json:"trigger_product_type"`

	StartDate   *time.Time `json:"start_date"`
	EndDate     *time.Time `json:"end_date"`
	Description string     `json:"description"`
}

// EvaluateItemInput is a single cart line submitted for evaluation.
type EvaluateItemInput struct {
	ProductID         *uint   `json:"product_id"`
	LensID            *uint   `json:"lens_id"`
	ProductType       string  `json:"product_type"`
	ProductCategoryID *uint   `json:"product_category_id"`
	BrandID           *uint   `json:"brand_id"`
	Quantity          int     `json:"quantity"`
	Price             float64 `json:"price"`
	LineDiscount      float64 `json:"line_discount"`
}

// EvaluateInput is the checkout payload used to compute applicable promotions.
type EvaluateInput struct {
	PatientID        *uint               `json:"patient_id"`
	PatientBirthDate *string             `json:"patient_birth_date"`
	Items            []EvaluateItemInput `json:"items"`
}

// AppliedPromotion is a promotion that matched the cart, with its computed value.
type AppliedPromotion struct {
	ID          uint    `json:"id"`
	Name        string  `json:"name"`
	Type        string  `json:"type"`
	Description string  `json:"description"`
	Amount      float64 `json:"amount"`
}

// EvaluateOutput is the result of a checkout evaluation.
type EvaluateOutput struct {
	Promotions    []AppliedPromotion `json:"promotions"`
	TotalDiscount float64            `json:"total_discount"`
}

// ListOutput is the paginated promotion response.
type ListOutput struct {
	CurrentPage int                 `json:"current_page"`
	Data        []*domain.Promotion `json:"data"`
	LastPage    int                 `json:"last_page"`
	PerPage     int                 `json:"per_page"`
	Total       int64               `json:"total"`
}

// --- CRUD ---

func (s *Service) List(f domain.PromotionFilter) (*ListOutput, error) {
	f.Clamp()
	data, total, err := s.repo.List(s.db, f)
	if err != nil {
		return nil, err
	}
	return &ListOutput{
		CurrentPage: f.Page,
		Data:        data,
		LastPage:    calcLastPage(total, f.PerPage),
		PerPage:     f.PerPage,
		Total:       total,
	}, nil
}

func (s *Service) GetByID(id uint) (*domain.Promotion, error) {
	return s.repo.GetByID(s.db, id)
}

func (s *Service) Create(input CreateInput) (*domain.Promotion, error) {
	p, err := buildFromInput(&domain.Promotion{}, input)
	if err != nil {
		return nil, err
	}
	if err := s.repo.Create(s.db, p); err != nil {
		return nil, err
	}
	return s.repo.GetByID(s.db, p.ID)
}

func (s *Service) Update(id uint, input CreateInput) (*domain.Promotion, error) {
	existing, err := s.repo.GetByID(s.db, id)
	if err != nil {
		return nil, err
	}
	p, err := buildFromInput(existing, input)
	if err != nil {
		return nil, err
	}
	if err := s.repo.Update(s.db, p); err != nil {
		return nil, err
	}
	return s.repo.GetByID(s.db, id)
}

func (s *Service) Delete(id uint) error {
	if _, err := s.repo.GetByID(s.db, id); err != nil {
		return err
	}
	return s.repo.Delete(s.db, id)
}

// Evaluate returns every promotion that applies to the given cart under the
// conflict-resolution rules documented on EvaluateCart.
func (s *Service) Evaluate(in EvaluateInput) (*EvaluateOutput, error) {
	candidates, err := s.repo.ListActiveAt(s.db, s.now())
	if err != nil {
		return nil, err
	}
	applied := EvaluateCart(in.Items, in.PatientBirthDate, s.now(), candidates)
	out := &EvaluateOutput{Promotions: applied}
	for _, a := range applied {
		out.TotalDiscount = round2(out.TotalDiscount + a.Amount)
	}
	return out, nil
}

// BuildFromInput validates a CreateInput and maps it onto a new domain.Promotion.
// Exported so other entry points (e.g. bulk Excel import) share the exact same
// validation rules as the HTTP API.
func BuildFromInput(in CreateInput) (*domain.Promotion, error) {
	return buildFromInput(&domain.Promotion{}, in)
}

// buildFromInput validates the input and maps it onto p (shared by create/update).
func buildFromInput(p *domain.Promotion, in CreateInput) (*domain.Promotion, error) {
	t := domain.PromotionType(in.Type)
	if !domain.ValidPromotionType(t) {
		return nil, &domain.ErrValidation{Field: "type", Message: "unsupported promotion type"}
	}
	if in.DiscountPercentage != nil && (*in.DiscountPercentage <= 0 || *in.DiscountPercentage > 100) {
		return nil, &domain.ErrValidation{Field: "discount_percentage", Message: "must be between 0.01 and 100"}
	}
	if in.DiscountAmount != nil && *in.DiscountAmount <= 0 {
		return nil, &domain.ErrValidation{Field: "discount_amount", Message: "must be greater than 0"}
	}
	hasPct := in.DiscountPercentage != nil && *in.DiscountPercentage > 0
	hasAmount := in.DiscountAmount != nil && *in.DiscountAmount > 0

	scope := domain.PromotionScope(in.Scope)
	if scope == "" {
		scope = domain.PromotionScopeCart
	}

	switch t {
	case domain.PromotionTypeCartTotal:
		if in.MinCartTotal == nil || *in.MinCartTotal <= 0 {
			return nil, &domain.ErrValidation{Field: "min_cart_total", Message: "required and must be greater than 0"}
		}
		if !hasPct && !hasAmount {
			return nil, &domain.ErrValidation{Field: "discount", Message: "discount_percentage or discount_amount is required"}
		}
	case domain.PromotionTypeFixedAmount:
		if !hasAmount {
			return nil, &domain.ErrValidation{Field: "discount_amount", Message: "required for fixed_amount promotions"}
		}
	case domain.PromotionTypeBirthday:
		if !hasPct && !hasAmount {
			return nil, &domain.ErrValidation{Field: "discount", Message: "discount_percentage or discount_amount is required"}
		}
	case domain.PromotionTypeCategory:
		if scope == domain.PromotionScopeCart {
			return nil, &domain.ErrValidation{Field: "scope", Message: "category promotions require scope category, brand or product_type"}
		}
		if scope == domain.PromotionScopeCategory && in.ProductCategoryID == nil {
			return nil, &domain.ErrValidation{Field: "product_category_id", Message: "required for category scope"}
		}
		if scope == domain.PromotionScopeBrand && in.BrandID == nil {
			return nil, &domain.ErrValidation{Field: "brand_id", Message: "required for brand scope"}
		}
		if scope == domain.PromotionScopeProductType && in.ProductType == "" {
			return nil, &domain.ErrValidation{Field: "product_type", Message: "required for product_type scope"}
		}
		if !hasPct && !hasAmount {
			return nil, &domain.ErrValidation{Field: "discount", Message: "discount_percentage or discount_amount is required"}
		}
	case domain.PromotionTypeSecondPair:
		if !hasPct && !hasAmount {
			return nil, &domain.ErrValidation{Field: "discount", Message: "discount_percentage or discount_amount is required"}
		}
	case domain.PromotionTypeCrossProduct:
		if !hasPct && !hasAmount {
			return nil, &domain.ErrValidation{Field: "discount", Message: "discount_percentage or discount_amount is required"}
		}
		if scope == domain.PromotionScopeCategory && in.ProductCategoryID == nil {
			return nil, &domain.ErrValidation{Field: "product_category_id", Message: "required when scope is category"}
		}
		if scope == domain.PromotionScopeBrand && in.BrandID == nil {
			return nil, &domain.ErrValidation{Field: "brand_id", Message: "required when scope is brand"}
		}
		if scope == domain.PromotionScopeProductType && in.ProductType == "" {
			return nil, &domain.ErrValidation{Field: "product_type", Message: "required when scope is product_type"}
		}

		triggerScope := domain.PromotionScope(in.TriggerScope)
		if triggerScope == "" || triggerScope == domain.PromotionScopeCart {
			return nil, &domain.ErrValidation{Field: "trigger_scope", Message: "cross_product requires a specific trigger_scope (category, brand or product_type)"}
		}
		switch triggerScope {
		case domain.PromotionScopeCategory:
			if in.TriggerProductCategoryID == nil {
				return nil, &domain.ErrValidation{Field: "trigger_product_category_id", Message: "required when trigger_scope is category"}
			}
		case domain.PromotionScopeBrand:
			if in.TriggerBrandID == nil {
				return nil, &domain.ErrValidation{Field: "trigger_brand_id", Message: "required when trigger_scope is brand"}
			}
		case domain.PromotionScopeProductType:
			if in.TriggerProductType == "" {
				return nil, &domain.ErrValidation{Field: "trigger_product_type", Message: "required when trigger_scope is product_type"}
			}
		}
		// A trigger identical to its own target degenerates into a plain category promo
		// and would let a single unit both trigger and receive its own discount — reject it
		// so admins use `category` for "discount this scope" and `cross_product` only for
		// genuine buy-X-get-Y-off campaigns across two different scopes.
		if triggerScope == scope &&
			samePtr(in.TriggerProductCategoryID, in.ProductCategoryID) &&
			samePtr(in.TriggerBrandID, in.BrandID) &&
			in.TriggerProductType == in.ProductType {
			return nil, &domain.ErrValidation{Field: "trigger_scope", Message: "trigger and target scope must differ — use type=category to discount a single scope"}
		}
	}

	if in.StartDate != nil && in.EndDate != nil && in.EndDate.Before(*in.StartDate) {
		return nil, &domain.ErrValidation{Field: "end_date", Message: "must be on or after start_date"}
	}

	active := true
	if in.Active != nil {
		active = *in.Active
	}

	p.Name = in.Name
	p.Type = t
	p.Active = active
	p.Priority = in.Priority
	p.Stackable = in.Stackable
	p.DiscountPercentage = in.DiscountPercentage
	p.DiscountAmount = in.DiscountAmount
	p.MinCartTotal = in.MinCartTotal
	p.MinQuantity = in.MinQuantity
	p.Scope = scope
	p.ProductCategoryID = in.ProductCategoryID
	p.BrandID = in.BrandID
	p.ProductType = in.ProductType
	p.TriggerScope = domain.PromotionScope(in.TriggerScope)
	p.TriggerProductCategoryID = in.TriggerProductCategoryID
	p.TriggerBrandID = in.TriggerBrandID
	p.TriggerProductType = in.TriggerProductType
	p.StartDate = in.StartDate
	p.EndDate = in.EndDate
	p.Description = in.Description
	return p, nil
}

// samePtr reports whether two *uint pointers hold the same value (both nil counts as equal).
func samePtr(a, b *uint) bool {
	if a == nil || b == nil {
		return a == b
	}
	return *a == *b
}

// --- Evaluation engine (pure) ---
//
// CONFLICT RESOLUTION MODEL
//
// Promotions fall into two layers:
//   - item-level: category, second_pair, cross_product — discount specific units.
//   - cart-level: cart_total, fixed_amount, birthday — discount the eligible subtotal.
//
// Within each layer, promotions are either EXCLUSIVE (default, Stackable=false) or
// STACKABLE (Stackable=true):
//
//   - Exclusive item-level promotions compete for the same units. Each unit in the cart
//     can be discounted by AT MOST ONE exclusive item-level promotion — once an
//     exclusive promotion takes any cut from a unit, that unit is CLAIMED and no other
//     exclusive promotion may touch it (not even its leftover value). Candidates are
//     processed highest Priority first (ties broken by the larger potential discount,
//     then by lowest promotion ID for full determinism), so priority is the merchant's
//     explicit conflict-resolution knob.
//   - Stackable item-level promotions never compete: they run afterwards, computed
//     against whatever value the exclusive pass left on each unit, and may layer with
//     each other and with the exclusive winner. This is the deliberate escape hatch for
//     "this coupon always applies in addition to anything else."
//   - The same exclusive/stackable split, and the same priority tie-break, governs
//     cart-level promotions. Exactly one exclusive cart-level promotion may apply (the
//     single largest at its turn); stackable cart-level promotions apply afterwards in
//     priority order, each computed against the subtotal remaining after the previous one.
//   - Cart-level discounts are computed on the subtotal AFTER item-level discounts have
//     already reduced it (coupon-on-top-of-item-sale, not the other way around) — this
//     guarantees the combined discount can never exceed the cart's value and matches the
//     "biggest lever first" order shoppers expect. The MinCartTotal *gate* for cart-level
//     promotions, however, is evaluated against the ORIGINAL pre-discount subtotal, so an
//     item-level discount can never retroactively disqualify a spend threshold the
//     customer's purchase clearly met.
//   - Every per-unit and per-promotion amount is floored at 0 and capped at the value
//     remaining to discount, so total discount can mathematically never exceed the cart's
//     eligible subtotal, however many promotions are active at once.
//
// A cross_product promotion ("buy a frame, get lenses cheaper") is modeled as an
// item-level promotion whose eligibility gate is a cart-wide trigger-scope match
// (evaluated against the ORIGINAL cart, unaffected by other promotions' claims — buying
// the qualifying item is never "used up" by a different discount) and whose discount
// targets are units matching its own Scope, going through the same exclusive/stackable
// claiming pipeline as `category`.

// cartUnit is one physical unit of a cart line, used internally so item-level promotions
// (second_pair, category, cross_product) can claim individual units instead of whole
// lines — this is what makes "same product in two promotions" resolvable deterministically.
type cartUnit struct {
	price       float64 // original per-unit price net of this unit's share of the line discount
	remaining   float64 // value still available to be discounted by a later promotion
	claimed     bool    // true once an EXCLUSIVE item-level promotion has discounted this unit
	categoryID  *uint
	brandID     *uint
	productType string
}

// buildUnits explodes cart lines into individual units. A line's existing per-line
// discount (LineDiscount) is spread evenly across its units before promotions run, so a
// unit's starting `remaining` already reflects any discount applied earlier in the flow
// (e.g. a manually-approved DiscountRequest).
func buildUnits(items []EvaluateItemInput) []*cartUnit {
	var units []*cartUnit
	for _, it := range items {
		qty := it.Quantity
		if qty <= 0 {
			qty = 1
		}
		discPerUnit := it.LineDiscount / float64(qty)
		for i := 0; i < qty; i++ {
			net := it.Price - discPerUnit
			if net < 0 {
				net = 0
			}
			units = append(units, &cartUnit{
				price:       net,
				remaining:   net,
				categoryID:  it.ProductCategoryID,
				brandID:     it.BrandID,
				productType: it.ProductType,
			})
		}
	}
	return units
}

func unitMatchesScope(scope domain.PromotionScope, categoryID, brandID *uint, productType string, u *cartUnit) bool {
	switch scope {
	case domain.PromotionScopeCategory:
		return u.categoryID != nil && categoryID != nil && *u.categoryID == *categoryID
	case domain.PromotionScopeBrand:
		return u.brandID != nil && brandID != nil && *u.brandID == *brandID
	case domain.PromotionScopeProductType:
		return productType != "" && u.productType == productType
	case domain.PromotionScopeCart:
		return true
	}
	return false
}

func itemMatchesScope(promo *domain.Promotion, u *cartUnit) bool {
	return unitMatchesScope(promo.Scope, promo.ProductCategoryID, promo.BrandID, promo.ProductType, u)
}

func itemMatchesTrigger(promo *domain.Promotion, u *cartUnit) bool {
	return unitMatchesScope(promo.TriggerScope, promo.TriggerProductCategoryID, promo.TriggerBrandID, promo.TriggerProductType, u)
}

// triggerSatisfied reports whether the ORIGINAL cart (unaffected by other promotions'
// claims) contains enough trigger-matching units for a cross_product promotion to fire.
func triggerSatisfied(promo *domain.Promotion, allUnits []*cartUnit) bool {
	need := 1
	if promo.MinQuantity != nil && *promo.MinQuantity > need {
		need = *promo.MinQuantity
	}
	count := 0
	for _, u := range allUnits {
		if itemMatchesTrigger(promo, u) {
			count++
			if count >= need {
				return true
			}
		}
	}
	return false
}

// applyItemPromo takes a discount from the matching units for category/cross_product
// (percentage: per unit; fixed amount: distributed proportionally across matching units
// so partially-discounted units are handled correctly) and returns the total granted.
// When exclusive, every unit it cuts is marked claimed so no other exclusive promotion
// can touch it afterwards.
func applyItemPromo(promo *domain.Promotion, matching []*cartUnit, exclusive bool) float64 {
	var available float64
	for _, u := range matching {
		available += u.remaining
	}
	if available <= 0 {
		return 0
	}

	if promo.DiscountPercentage != nil && *promo.DiscountPercentage > 0 {
		total := 0.0
		for _, u := range matching {
			if u.remaining <= 0 {
				continue
			}
			cut := u.remaining * (*promo.DiscountPercentage) / 100
			u.remaining -= cut
			if exclusive {
				u.claimed = true
			}
			total += cut
		}
		return total
	}
	if promo.DiscountAmount != nil && *promo.DiscountAmount > 0 {
		amount := *promo.DiscountAmount
		if amount > available {
			amount = available
		}
		total := 0.0
		for _, u := range matching {
			if u.remaining <= 0 {
				continue
			}
			share := amount * (u.remaining / available)
			u.remaining -= share
			if exclusive {
				u.claimed = true
			}
			total += share
		}
		return total
	}
	return 0
}

// applySecondPair discounts every second unit (by descending remaining value) among the
// eligible units matching the promotion's scope. When exclusive, the discounted units
// are marked claimed (the full-priced first unit of each pair stays available).
func applySecondPair(promo *domain.Promotion, matching []*cartUnit, exclusive bool) float64 {
	eligible := make([]*cartUnit, 0, len(matching))
	for _, u := range matching {
		if u.remaining > 0 {
			eligible = append(eligible, u)
		}
	}
	if len(eligible) < 2 {
		return 0
	}
	sort.Slice(eligible, func(i, j int) bool { return eligible[i].remaining > eligible[j].remaining })

	total := 0.0
	for i := 1; i < len(eligible); i += 2 {
		u := eligible[i]
		var cut float64
		if promo.DiscountAmount != nil && *promo.DiscountAmount > 0 {
			cut = *promo.DiscountAmount
			if cut > u.remaining {
				cut = u.remaining
			}
		} else if promo.DiscountPercentage != nil && *promo.DiscountPercentage > 0 {
			cut = u.remaining * (*promo.DiscountPercentage) / 100
		}
		if cut > 0 {
			u.remaining -= cut
			if exclusive {
				u.claimed = true
			}
			total += cut
		}
	}
	return total
}

// itemLevelAmount computes and applies (mutating unit state) a single item-level
// promotion against the current units. When exclusive, units already claimed by another
// exclusive promotion are invisible to it, and the units it discounts become claimed.
func itemLevelAmount(promo *domain.Promotion, allUnits []*cartUnit, exclusive bool) float64 {
	selectable := func(u *cartUnit) bool {
		return u.remaining > 0 && !(exclusive && u.claimed)
	}

	switch promo.Type {
	case domain.PromotionTypeCategory:
		matching := make([]*cartUnit, 0, len(allUnits))
		for _, u := range allUnits {
			if selectable(u) && itemMatchesScope(promo, u) {
				matching = append(matching, u)
			}
		}
		return applyItemPromo(promo, matching, exclusive)

	case domain.PromotionTypeSecondPair:
		matching := make([]*cartUnit, 0, len(allUnits))
		for _, u := range allUnits {
			if selectable(u) && (promo.Scope == domain.PromotionScopeCart || itemMatchesScope(promo, u)) {
				matching = append(matching, u)
			}
		}
		return applySecondPair(promo, matching, exclusive)

	case domain.PromotionTypeCrossProduct:
		if !triggerSatisfied(promo, allUnits) {
			return 0
		}
		matching := make([]*cartUnit, 0, len(allUnits))
		for _, u := range allUnits {
			if selectable(u) && itemMatchesScope(promo, u) {
				matching = append(matching, u)
			}
		}
		return applyItemPromo(promo, matching, exclusive)
	}
	return 0
}

func isItemLevel(t domain.PromotionType) bool {
	switch t {
	case domain.PromotionTypeCategory, domain.PromotionTypeSecondPair, domain.PromotionTypeCrossProduct:
		return true
	default:
		return false
	}
}

// potentialValue estimates a candidate's discount against the untouched cart, used only
// to order same-priority exclusive candidates deterministically before any claiming
// happens (the real amount is recomputed against live unit state when it is applied).
func potentialValue(promo *domain.Promotion, allUnits []*cartUnit, eligibleSubtotal float64, patientBirthDate *string, now time.Time) float64 {
	if isItemLevel(promo.Type) {
		scratch := make([]*cartUnit, len(allUnits))
		for i, u := range allUnits {
			cp := *u
			scratch[i] = &cp
		}
		return itemLevelAmount(promo, scratch, !promo.Stackable)
	}
	return cartLevelAmount(promo, eligibleSubtotal, eligibleSubtotal, patientBirthDate, now)
}

// orderCandidates sorts by priority desc, then potential value desc, then promotion ID
// asc — a fully deterministic order so identical-priority ties never depend on slice/DB
// ordering (verified by TestEvaluateCart_DeterministicTieBreak).
func orderCandidates(promos []*domain.Promotion, allUnits []*cartUnit, eligibleSubtotal float64, patientBirthDate *string, now time.Time) {
	values := make(map[uint]float64, len(promos))
	for _, p := range promos {
		values[p.ID] = potentialValue(p, allUnits, eligibleSubtotal, patientBirthDate, now)
	}
	sort.SliceStable(promos, func(i, j int) bool {
		a, b := promos[i], promos[j]
		if a.Priority != b.Priority {
			return a.Priority > b.Priority
		}
		if values[a.ID] != values[b.ID] {
			return values[a.ID] > values[b.ID]
		}
		return a.ID < b.ID
	})
}

// cartLevelAmount computes a cart_total/fixed_amount/birthday promotion's discount.
// gateSubtotal (original, pre-item-discount) determines eligibility; base (current,
// possibly already reduced by other cart-level promotions) determines the amount.
func cartLevelAmount(promo *domain.Promotion, gateSubtotal, base float64, patientBirthDate *string, now time.Time) float64 {
	switch promo.Type {
	case domain.PromotionTypeCartTotal:
		if promo.MinCartTotal == nil || gateSubtotal < *promo.MinCartTotal {
			return 0
		}
		return discountOf(promo, base)

	case domain.PromotionTypeFixedAmount:
		if promo.MinCartTotal != nil && gateSubtotal < *promo.MinCartTotal {
			return 0
		}
		if promo.DiscountAmount == nil {
			return 0
		}
		amt := *promo.DiscountAmount
		if amt > base {
			amt = base
		}
		return amt

	case domain.PromotionTypeBirthday:
		if !isBirthdayMonth(patientBirthDate, now) {
			return 0
		}
		if promo.MinCartTotal != nil && gateSubtotal < *promo.MinCartTotal {
			return 0
		}
		return discountOf(promo, base)
	}
	return 0
}

// EvaluateCart is the pure promotion engine described above. It performs no I/O and is
// safe to call from both the HTTP layer and the sale service. Returned amounts are
// already rounded to cents; TotalDiscount is not returned here — callers sum Amount.
func EvaluateCart(items []EvaluateItemInput, patientBirthDate *string, now time.Time, candidates []*domain.Promotion) []AppliedPromotion {
	units := buildUnits(items)
	eligibleSubtotal := 0.0
	for _, u := range units {
		eligibleSubtotal += u.remaining
	}
	if eligibleSubtotal <= 0 || len(candidates) == 0 {
		return []AppliedPromotion{}
	}
	allUnits := make([]*cartUnit, len(units))
	copy(allUnits, units) // trigger checks always see the untouched cart

	var itemExclusive, itemStackable, cartExclusive, cartStackable []*domain.Promotion
	for _, p := range candidates {
		if isItemLevel(p.Type) {
			if p.Stackable {
				itemStackable = append(itemStackable, p)
			} else {
				itemExclusive = append(itemExclusive, p)
			}
		} else {
			if p.Stackable {
				cartStackable = append(cartStackable, p)
			} else {
				cartExclusive = append(cartExclusive, p)
			}
		}
	}

	var applied []AppliedPromotion

	// Item-level: exclusive candidates claim first-come (priority order), each unit at
	// most once; stackable candidates then layer on whatever value remains per unit.
	orderCandidates(itemExclusive, allUnits, eligibleSubtotal, patientBirthDate, now)
	for _, p := range itemExclusive {
		amt := itemLevelAmount(p, units, true)
		if amt > 0 {
			applied = append(applied, AppliedPromotion{ID: p.ID, Name: p.Name, Type: string(p.Type), Description: p.Description, Amount: round2(amt)})
		}
	}
	orderCandidates(itemStackable, allUnits, eligibleSubtotal, patientBirthDate, now)
	for _, p := range itemStackable {
		amt := itemLevelAmount(p, units, false)
		if amt > 0 {
			applied = append(applied, AppliedPromotion{ID: p.ID, Name: p.Name, Type: string(p.Type), Description: p.Description, Amount: round2(amt)})
		}
	}

	reducedSubtotal := 0.0
	for _, u := range units {
		reducedSubtotal += u.remaining
	}

	// Cart-level: at most one exclusive promotion (the largest at its turn); stackable
	// promotions then apply sequentially on the shrinking remainder.
	if len(cartExclusive) > 0 {
		var best *domain.Promotion
		var bestAmt float64
		for _, p := range cartExclusive {
			amt := cartLevelAmount(p, eligibleSubtotal, reducedSubtotal, patientBirthDate, now)
			if amt > bestAmt {
				best, bestAmt = p, amt
			}
		}
		if best != nil && bestAmt > 0 {
			reducedSubtotal -= bestAmt
			applied = append(applied, AppliedPromotion{ID: best.ID, Name: best.Name, Type: string(best.Type), Description: best.Description, Amount: round2(bestAmt)})
		}
	}
	orderCandidates(cartStackable, allUnits, eligibleSubtotal, patientBirthDate, now)
	for _, p := range cartStackable {
		amt := cartLevelAmount(p, eligibleSubtotal, reducedSubtotal, patientBirthDate, now)
		if amt > 0 {
			reducedSubtotal -= amt
			applied = append(applied, AppliedPromotion{ID: p.ID, Name: p.Name, Type: string(p.Type), Description: p.Description, Amount: round2(amt)})
		}
	}

	if applied == nil {
		return []AppliedPromotion{}
	}
	return applied
}

// discountOf applies a promotion's percentage or fixed amount against base.
func discountOf(promo *domain.Promotion, base float64) float64 {
	if promo.DiscountAmount != nil && *promo.DiscountAmount > 0 {
		if *promo.DiscountAmount > base {
			return base
		}
		return *promo.DiscountAmount
	}
	if promo.DiscountPercentage != nil && *promo.DiscountPercentage > 0 {
		return base * (*promo.DiscountPercentage) / 100
	}
	return 0
}

// isBirthdayMonth reports whether an ISO birth date falls in the same month as now.
func isBirthdayMonth(birthDate *string, now time.Time) bool {
	if birthDate == nil || *birthDate == "" {
		return false
	}
	layouts := []string{"2006-01-02", time.RFC3339, "2006-01-02T15:04:05Z07:00", "2006-01-02T15:04:05"}
	for _, l := range layouts {
		if t, err := time.Parse(l, *birthDate); err == nil {
			return t.Month() == now.Month()
		}
	}
	return false
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}

func calcLastPage(total int64, perPage int) int {
	if total == 0 {
		return 1
	}
	lp := int(total) / perPage
	if int(total)%perPage != 0 {
		lp++
	}
	return lp
}
