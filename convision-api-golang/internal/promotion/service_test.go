package promotion

import (
	"math"
	"testing"
	"time"

	"github.com/convision/api/internal/domain"
)

func fptr(v float64) *float64 { return &v }
func uptr(v uint) *uint       { return &v }
func iptr(v int) *int         { return &v }
func sptr(v string) *string   { return &v }

var testNow = time.Date(2026, 7, 3, 12, 0, 0, 0, time.UTC)

func cartTotal(id uint, min, pct float64) *domain.Promotion {
	return &domain.Promotion{ID: id, Name: "CartTotal", Type: domain.PromotionTypeCartTotal, Active: true,
		MinCartTotal: fptr(min), DiscountPercentage: fptr(pct), Scope: domain.PromotionScopeCart}
}

func categoryPromo(id uint, pct float64, scope domain.PromotionScope) *domain.Promotion {
	return &domain.Promotion{ID: id, Name: "Category", Type: domain.PromotionTypeCategory, Active: true,
		DiscountPercentage: fptr(pct), Scope: scope}
}

func crossPromo(id uint, pct float64) *domain.Promotion {
	// Buy a frame → pct% off lenses.
	return &domain.Promotion{ID: id, Name: "Cross", Type: domain.PromotionTypeCrossProduct, Active: true,
		DiscountPercentage: fptr(pct),
		Scope:              domain.PromotionScopeProductType, ProductType: "lens",
		TriggerScope: domain.PromotionScopeProductType, TriggerProductType: "frame"}
}

func total(applied []AppliedPromotion) float64 {
	t := 0.0
	for _, a := range applied {
		t += a.Amount
	}
	return t
}

func amountOf(t *testing.T, applied []AppliedPromotion, id uint) float64 {
	t.Helper()
	for _, a := range applied {
		if a.ID == id {
			return a.Amount
		}
	}
	return 0
}

// --- Single-promotion behavior (regression of the original five types) ---

func TestEvaluateCart_CartTotalThreshold(t *testing.T) {
	items := []EvaluateItemInput{{Price: 300000, Quantity: 1}, {Price: 250000, Quantity: 1}}
	applied := EvaluateCart(items, nil, testNow, []*domain.Promotion{cartTotal(1, 500000, 10)})
	if len(applied) != 1 || applied[0].Amount != 55000 {
		t.Fatalf("want single 55000, got %+v", applied)
	}
}

func TestEvaluateCart_BelowThreshold_NoPromo(t *testing.T) {
	items := []EvaluateItemInput{{Price: 100000, Quantity: 1}}
	if applied := EvaluateCart(items, nil, testNow, []*domain.Promotion{cartTotal(1, 500000, 10)}); len(applied) != 0 {
		t.Fatalf("expected none below threshold, got %+v", applied)
	}
}

func TestEvaluateCart_LineDiscountReducesEligibleSubtotal(t *testing.T) {
	items := []EvaluateItemInput{{Price: 550000, Quantity: 1, LineDiscount: 60000}}
	if applied := EvaluateCart(items, nil, testNow, []*domain.Promotion{cartTotal(1, 500000, 10)}); len(applied) != 0 {
		t.Fatalf("net 490000 < threshold, expected none, got %+v", applied)
	}
}

func TestEvaluateCart_FixedAmountCappedAtSubtotal(t *testing.T) {
	promo := &domain.Promotion{ID: 2, Type: domain.PromotionTypeFixedAmount, Active: true, DiscountAmount: fptr(80000)}
	applied := EvaluateCart([]EvaluateItemInput{{Price: 50000, Quantity: 1}}, nil, testNow, []*domain.Promotion{promo})
	if total(applied) != 50000 {
		t.Fatalf("fixed amount must cap at subtotal 50000, got %+v", applied)
	}
}

func TestEvaluateCart_Birthday(t *testing.T) {
	promo := &domain.Promotion{ID: 3, Type: domain.PromotionTypeBirthday, Active: true, DiscountPercentage: fptr(15), Scope: domain.PromotionScopeCart}
	items := []EvaluateItemInput{{Price: 200000, Quantity: 1}}

	if applied := EvaluateCart(items, sptr("1990-07-20"), testNow, []*domain.Promotion{promo}); total(applied) != 30000 {
		t.Fatalf("birthday month: want 30000, got %+v", applied)
	}
	if applied := EvaluateCart(items, sptr("1990-03-20"), testNow, []*domain.Promotion{promo}); len(applied) != 0 {
		t.Fatalf("non-birthday month must not apply, got %+v", applied)
	}
	if applied := EvaluateCart(items, nil, testNow, []*domain.Promotion{promo}); len(applied) != 0 {
		t.Fatalf("missing birth date must not apply, got %+v", applied)
	}
}

func TestEvaluateCart_CategoryScope_Brand(t *testing.T) {
	promo := &domain.Promotion{ID: 4, Type: domain.PromotionTypeCategory, Active: true,
		DiscountPercentage: fptr(20), Scope: domain.PromotionScopeBrand, BrandID: uptr(7)}
	items := []EvaluateItemInput{
		{Price: 400000, Quantity: 1, BrandID: uptr(7)},
		{Price: 100000, Quantity: 1, BrandID: uptr(9)},
	}
	if applied := EvaluateCart(items, nil, testNow, []*domain.Promotion{promo}); total(applied) != 80000 {
		t.Fatalf("want 20%% of matched 400000 = 80000, got %+v", applied)
	}
}

func TestEvaluateCart_SecondPair(t *testing.T) {
	promo := &domain.Promotion{ID: 5, Type: domain.PromotionTypeSecondPair, Active: true,
		DiscountPercentage: fptr(50), Scope: domain.PromotionScopeCart}
	items := []EvaluateItemInput{{Price: 300000, Quantity: 1}, {Price: 200000, Quantity: 1}}
	if applied := EvaluateCart(items, nil, testNow, []*domain.Promotion{promo}); total(applied) != 100000 {
		t.Fatalf("want 50%% of cheaper 200000 = 100000, got %+v", applied)
	}
	if applied := EvaluateCart([]EvaluateItemInput{{Price: 300000, Quantity: 1}}, nil, testNow, []*domain.Promotion{promo}); len(applied) != 0 {
		t.Fatalf("single unit must not trigger second pair, got %+v", applied)
	}
}

func TestEvaluateCart_SecondPair_QuantityExpansion(t *testing.T) {
	// One line, qty 2 → two units of the same product: second unit gets 50%.
	promo := &domain.Promotion{ID: 5, Type: domain.PromotionTypeSecondPair, Active: true,
		DiscountPercentage: fptr(50), Scope: domain.PromotionScopeCart}
	items := []EvaluateItemInput{{Price: 200000, Quantity: 2}}
	if applied := EvaluateCart(items, nil, testNow, []*domain.Promotion{promo}); total(applied) != 100000 {
		t.Fatalf("qty 2 of same product: want 100000, got %+v", applied)
	}
}

// --- cross_product (buy X → discount Y) ---

func TestCrossProduct_TriggerPresent(t *testing.T) {
	items := []EvaluateItemInput{
		{Price: 360000, Quantity: 1, ProductType: "frame"},
		{Price: 240000, Quantity: 1, ProductType: "lens"},
	}
	applied := EvaluateCart(items, nil, testNow, []*domain.Promotion{crossPromo(10, 25)})
	if total(applied) != 60000 { // 25% of 240000 lens only
		t.Fatalf("want 60000 on lens only, got %+v", applied)
	}
}

func TestCrossProduct_TriggerAbsent(t *testing.T) {
	items := []EvaluateItemInput{{Price: 240000, Quantity: 1, ProductType: "lens"}}
	if applied := EvaluateCart(items, nil, testNow, []*domain.Promotion{crossPromo(10, 25)}); len(applied) != 0 {
		t.Fatalf("no frame in cart → no cross discount, got %+v", applied)
	}
}

func TestCrossProduct_TargetAbsent(t *testing.T) {
	items := []EvaluateItemInput{{Price: 360000, Quantity: 1, ProductType: "frame"}}
	if applied := EvaluateCart(items, nil, testNow, []*domain.Promotion{crossPromo(10, 25)}); len(applied) != 0 {
		t.Fatalf("frame but no lens → nothing to discount, got %+v", applied)
	}
}

func TestCrossProduct_TriggerNeverDiscountsItself(t *testing.T) {
	// The frame (trigger) must keep full price; only lenses are discounted.
	items := []EvaluateItemInput{
		{Price: 360000, Quantity: 1, ProductType: "frame"},
		{Price: 200000, Quantity: 2, ProductType: "lens"},
	}
	applied := EvaluateCart(items, nil, testNow, []*domain.Promotion{crossPromo(10, 50)})
	if total(applied) != 200000 { // 50% of 2×200000
		t.Fatalf("want 200000 (both lens units, frame untouched), got %+v", applied)
	}
}

func TestCrossProduct_MinQuantityTrigger(t *testing.T) {
	promo := crossPromo(10, 25)
	promo.MinQuantity = iptr(2) // needs TWO frames
	one := []EvaluateItemInput{
		{Price: 360000, Quantity: 1, ProductType: "frame"},
		{Price: 240000, Quantity: 1, ProductType: "lens"},
	}
	if applied := EvaluateCart(one, nil, testNow, []*domain.Promotion{promo}); len(applied) != 0 {
		t.Fatalf("1 frame < min_quantity 2 → none, got %+v", applied)
	}
	two := []EvaluateItemInput{
		{Price: 360000, Quantity: 2, ProductType: "frame"},
		{Price: 240000, Quantity: 1, ProductType: "lens"},
	}
	if applied := EvaluateCart(two, nil, testNow, []*domain.Promotion{promo}); total(applied) != 60000 {
		t.Fatalf("2 frames satisfy trigger → 60000, got %+v", applied)
	}
}

func TestCrossProduct_TriggerByBrand(t *testing.T) {
	promo := &domain.Promotion{ID: 11, Name: "RayBan combo", Type: domain.PromotionTypeCrossProduct, Active: true,
		DiscountPercentage: fptr(30),
		Scope:              domain.PromotionScopeProductType, ProductType: "lens",
		TriggerScope: domain.PromotionScopeBrand, TriggerBrandID: uptr(42)}
	noBrand := []EvaluateItemInput{
		{Price: 300000, Quantity: 1, ProductType: "frame", BrandID: uptr(7)},
		{Price: 200000, Quantity: 1, ProductType: "lens"},
	}
	if applied := EvaluateCart(noBrand, nil, testNow, []*domain.Promotion{promo}); len(applied) != 0 {
		t.Fatalf("wrong trigger brand → none, got %+v", applied)
	}
	withBrand := []EvaluateItemInput{
		{Price: 300000, Quantity: 1, ProductType: "frame", BrandID: uptr(42)},
		{Price: 200000, Quantity: 1, ProductType: "lens"},
	}
	if applied := EvaluateCart(withBrand, nil, testNow, []*domain.Promotion{promo}); total(applied) != 60000 {
		t.Fatalf("brand 42 frame triggers 30%% off lens = 60000, got %+v", applied)
	}
}

// --- Conflict resolution: same product, multiple promotions ---

func TestConflict_TwoExclusivePromosSameUnits_OnlyOneClaims(t *testing.T) {
	// Both category promos target the same brand-7 frame. Exclusive → higher priority
	// claims the unit; the other gets nothing (not stacked, not split).
	strong := categoryPromo(20, 30, domain.PromotionScopeBrand)
	strong.BrandID = uptr(7)
	strong.Priority = 10
	weak := categoryPromo(21, 25, domain.PromotionScopeBrand)
	weak.BrandID = uptr(7)
	weak.Priority = 1

	items := []EvaluateItemInput{{Price: 100000, Quantity: 1, BrandID: uptr(7)}}
	applied := EvaluateCart(items, nil, testNow, []*domain.Promotion{weak, strong})

	if len(applied) != 1 {
		t.Fatalf("exactly one exclusive promo must claim the unit, got %+v", applied)
	}
	if applied[0].ID != 20 || applied[0].Amount != 30000 {
		t.Fatalf("priority 10 (30%%) must win: want id=20 amount=30000, got %+v", applied[0])
	}
}

func TestConflict_PriorityBeatsValue(t *testing.T) {
	// Explicit merchant priority overrides "bigger discount wins".
	big := categoryPromo(30, 50, domain.PromotionScopeBrand) // 50% but priority 0
	big.BrandID = uptr(7)
	small := categoryPromo(31, 10, domain.PromotionScopeBrand) // 10% but priority 99
	small.BrandID = uptr(7)
	small.Priority = 99

	items := []EvaluateItemInput{{Price: 100000, Quantity: 1, BrandID: uptr(7)}}
	applied := EvaluateCart(items, nil, testNow, []*domain.Promotion{big, small})
	if len(applied) != 1 || applied[0].ID != 31 || applied[0].Amount != 10000 {
		t.Fatalf("priority 99 must claim first even at lower value, got %+v", applied)
	}
}

func TestConflict_SamePriority_LargerValueWins(t *testing.T) {
	big := categoryPromo(40, 50, domain.PromotionScopeBrand)
	big.BrandID = uptr(7)
	small := categoryPromo(41, 10, domain.PromotionScopeBrand)
	small.BrandID = uptr(7)

	items := []EvaluateItemInput{{Price: 100000, Quantity: 1, BrandID: uptr(7)}}
	applied := EvaluateCart(items, nil, testNow, []*domain.Promotion{small, big})
	if len(applied) != 1 || applied[0].ID != 40 || applied[0].Amount != 50000 {
		t.Fatalf("same priority → larger discount wins, got %+v", applied)
	}
}

func TestConflict_DeterministicTieBreak(t *testing.T) {
	// Identical priority AND identical value → lowest ID wins, regardless of input order.
	a := categoryPromo(50, 20, domain.PromotionScopeBrand)
	a.BrandID = uptr(7)
	b := categoryPromo(51, 20, domain.PromotionScopeBrand)
	b.BrandID = uptr(7)

	items := []EvaluateItemInput{{Price: 100000, Quantity: 1, BrandID: uptr(7)}}
	r1 := EvaluateCart(items, nil, testNow, []*domain.Promotion{a, b})
	r2 := EvaluateCart(items, nil, testNow, []*domain.Promotion{b, a})
	if len(r1) != 1 || len(r2) != 1 || r1[0].ID != 50 || r2[0].ID != 50 {
		t.Fatalf("tie-break must be deterministic (lowest ID): got %+v vs %+v", r1, r2)
	}
}

func TestConflict_DisjointScopes_BothApply(t *testing.T) {
	// Two exclusive promos on DIFFERENT products don't conflict — both apply.
	frames := categoryPromo(60, 20, domain.PromotionScopeProductType)
	frames.ProductType = "frame"
	lenses := categoryPromo(61, 10, domain.PromotionScopeProductType)
	lenses.ProductType = "lens"

	items := []EvaluateItemInput{
		{Price: 300000, Quantity: 1, ProductType: "frame"},
		{Price: 200000, Quantity: 1, ProductType: "lens"},
	}
	applied := EvaluateCart(items, nil, testNow, []*domain.Promotion{frames, lenses})
	if len(applied) != 2 {
		t.Fatalf("disjoint scopes must both apply, got %+v", applied)
	}
	if amountOf(t, applied, 60) != 60000 || amountOf(t, applied, 61) != 20000 {
		t.Fatalf("want frame 60000 + lens 20000, got %+v", applied)
	}
}

func TestConflict_PartialOverlap_LoserKeepsDisjointRemainder(t *testing.T) {
	// Promo A (priority) covers brand 7; promo B covers ALL frames. The brand-7 frame is
	// claimed by A; B still discounts the other frame it alone matches.
	brandPromo := categoryPromo(70, 30, domain.PromotionScopeBrand)
	brandPromo.BrandID = uptr(7)
	brandPromo.Priority = 10
	framePromo := categoryPromo(71, 10, domain.PromotionScopeProductType)
	framePromo.ProductType = "frame"

	items := []EvaluateItemInput{
		{Price: 100000, Quantity: 1, ProductType: "frame", BrandID: uptr(7)},
		{Price: 200000, Quantity: 1, ProductType: "frame", BrandID: uptr(9)},
	}
	applied := EvaluateCart(items, nil, testNow, []*domain.Promotion{framePromo, brandPromo})
	if amountOf(t, applied, 70) != 30000 {
		t.Fatalf("brand promo must claim brand-7 frame fully: want 30000, got %+v", applied)
	}
	// The brand-7 unit is CLAIMED by promo A; exclusive promo B may not touch it — not
	// even its leftover 70000. B discounts only the brand-9 frame it alone matches:
	// 10% of 200000 = 20000.
	if amountOf(t, applied, 71) != 20000 {
		t.Fatalf("frame promo gets 10%% of unclaimed brand-9 frame only = 20000, got %+v", applied)
	}
}

func TestConflict_StackableLayersOnExclusive(t *testing.T) {
	// Exclusive 20% on frames + stackable 10% on frames: stackable applies on the
	// remaining 80% → 8% effective, total 28%.
	excl := categoryPromo(80, 20, domain.PromotionScopeProductType)
	excl.ProductType = "frame"
	stack := categoryPromo(81, 10, domain.PromotionScopeProductType)
	stack.ProductType = "frame"
	stack.Stackable = true

	items := []EvaluateItemInput{{Price: 100000, Quantity: 1, ProductType: "frame"}}
	applied := EvaluateCart(items, nil, testNow, []*domain.Promotion{excl, stack})
	if len(applied) != 2 {
		t.Fatalf("stackable must coexist with exclusive, got %+v", applied)
	}
	if amountOf(t, applied, 80) != 20000 || amountOf(t, applied, 81) != 8000 {
		t.Fatalf("want 20000 + 8000 (10%% of remaining 80000), got %+v", applied)
	}
}

func TestConflict_CartLevel_OnlyBestExclusiveApplies(t *testing.T) {
	ten := cartTotal(90, 100000, 10)
	fifteen := cartTotal(91, 100000, 15)
	items := []EvaluateItemInput{{Price: 400000, Quantity: 1}}
	applied := EvaluateCart(items, nil, testNow, []*domain.Promotion{ten, fifteen})
	if len(applied) != 1 || applied[0].ID != 91 || applied[0].Amount != 60000 {
		t.Fatalf("only best cart-level promo applies (15%% = 60000), got %+v", applied)
	}
}

func TestConflict_ItemThenCartLevel_CartComputedOnReducedBase(t *testing.T) {
	// 20% off frames (item) + cart-total 10% over min 300000.
	// Item: 20% of 400000 = 80000. Cart gate uses ORIGINAL subtotal 400000 (≥ 300000 ✓),
	// but its amount is 10% of the REDUCED base 320000 = 32000. Total 112000.
	framePromo := categoryPromo(100, 20, domain.PromotionScopeProductType)
	framePromo.ProductType = "frame"
	cart := cartTotal(101, 300000, 10)

	items := []EvaluateItemInput{{Price: 400000, Quantity: 1, ProductType: "frame"}}
	applied := EvaluateCart(items, nil, testNow, []*domain.Promotion{framePromo, cart})
	if amountOf(t, applied, 100) != 80000 || amountOf(t, applied, 101) != 32000 {
		t.Fatalf("want item 80000 + cart 32000, got %+v", applied)
	}
}

func TestConflict_CartGateUsesOriginalSubtotal(t *testing.T) {
	// Item discount pulls the reduced subtotal BELOW the cart-total min, but the gate is
	// evaluated on the original subtotal, so the cart promo still fires.
	framePromo := categoryPromo(110, 50, domain.PromotionScopeProductType)
	framePromo.ProductType = "frame"
	cart := cartTotal(111, 350000, 10) // original 400000 ≥ 350000; reduced 200000 < 350000

	items := []EvaluateItemInput{{Price: 400000, Quantity: 1, ProductType: "frame"}}
	applied := EvaluateCart(items, nil, testNow, []*domain.Promotion{framePromo, cart})
	if amountOf(t, applied, 111) != 20000 { // 10% of reduced 200000
		t.Fatalf("gate on original subtotal must pass; want cart 20000, got %+v", applied)
	}
}

func TestConflict_TotalNeverExceedsSubtotal(t *testing.T) {
	// Pathological stack: 100% category + big fixed amounts. Total discount must be
	// capped at the cart's value.
	full := categoryPromo(120, 100, domain.PromotionScopeCart)
	fixedA := &domain.Promotion{ID: 121, Type: domain.PromotionTypeFixedAmount, Active: true, DiscountAmount: fptr(500000), Stackable: true}
	fixedB := &domain.Promotion{ID: 122, Type: domain.PromotionTypeFixedAmount, Active: true, DiscountAmount: fptr(500000)}

	items := []EvaluateItemInput{{Price: 300000, Quantity: 1}}
	applied := EvaluateCart(items, nil, testNow, []*domain.Promotion{full, fixedA, fixedB})
	if got := total(applied); got > 300000+0.01 {
		t.Fatalf("total discount %v exceeds subtotal 300000: %+v", got, applied)
	}
}

func TestConflict_CrossProductVsCategory_SameTarget(t *testing.T) {
	// Both a cross_product (frame→lens 25%) and a category promo (lens 15%) target the
	// same lens. Exclusive → same-priority tie resolves by larger value: cross (25%).
	cross := crossPromo(130, 25)
	lens := categoryPromo(131, 15, domain.PromotionScopeProductType)
	lens.ProductType = "lens"

	items := []EvaluateItemInput{
		{Price: 360000, Quantity: 1, ProductType: "frame"},
		{Price: 240000, Quantity: 1, ProductType: "lens"},
	}
	applied := EvaluateCart(items, nil, testNow, []*domain.Promotion{lens, cross})
	if len(applied) != 1 || applied[0].ID != 130 || applied[0].Amount != 60000 {
		t.Fatalf("cross (25%%=60000) must beat category (15%%=36000) on same unit, got %+v", applied)
	}
}

func TestConflict_CrossProductTriggerNotConsumedByOtherPromos(t *testing.T) {
	// A category promo discounts the FRAME; the frame still counts as the trigger for
	// the cross_product promo on lenses (buying it is a fact, not a consumable).
	framePromo := categoryPromo(140, 20, domain.PromotionScopeProductType)
	framePromo.ProductType = "frame"
	framePromo.Priority = 10
	cross := crossPromo(141, 25)

	items := []EvaluateItemInput{
		{Price: 300000, Quantity: 1, ProductType: "frame"},
		{Price: 200000, Quantity: 1, ProductType: "lens"},
	}
	applied := EvaluateCart(items, nil, testNow, []*domain.Promotion{framePromo, cross})
	if amountOf(t, applied, 140) != 60000 {
		t.Fatalf("frame promo want 60000, got %+v", applied)
	}
	if amountOf(t, applied, 141) != 50000 {
		t.Fatalf("cross promo must still fire (trigger not consumed): want 50000, got %+v", applied)
	}
}

// --- Corner cases ---

func TestCorner_EmptyCart(t *testing.T) {
	if applied := EvaluateCart(nil, nil, testNow, []*domain.Promotion{cartTotal(1, 1, 10)}); len(applied) != 0 {
		t.Fatalf("empty cart → none, got %+v", applied)
	}
}

func TestCorner_NoCandidates(t *testing.T) {
	if applied := EvaluateCart([]EvaluateItemInput{{Price: 100, Quantity: 1}}, nil, testNow, nil); len(applied) != 0 {
		t.Fatalf("no candidates → none, got %+v", applied)
	}
}

func TestCorner_ZeroAndNegativeValues(t *testing.T) {
	items := []EvaluateItemInput{
		{Price: 0, Quantity: 1},
		{Price: 100000, Quantity: 0},              // qty 0 treated as 1
		{Price: 50000, Quantity: 1, LineDiscount: 90000}, // over-discounted line → net 0
	}
	applied := EvaluateCart(items, nil, testNow, []*domain.Promotion{categoryPromo(1, 50, domain.PromotionScopeCart)})
	if got := total(applied); got != 50000 {
		t.Fatalf("only the 100000 unit has value; 50%% = 50000, got %v (%+v)", got, applied)
	}
}

func TestCorner_FixedAmountSpreadAcrossPartiallyClaimedUnits(t *testing.T) {
	// Exclusive 50% claims half of the only unit; a stackable fixed 80000 then must cap
	// at the remaining 50000, not the unit's original price.
	half := categoryPromo(150, 50, domain.PromotionScopeCart)
	fixed := &domain.Promotion{ID: 151, Type: domain.PromotionTypeCategory, Active: true,
		DiscountAmount: fptr(80000), Scope: domain.PromotionScopeCart, Stackable: true}

	items := []EvaluateItemInput{{Price: 100000, Quantity: 1}}
	applied := EvaluateCart(items, nil, testNow, []*domain.Promotion{half, fixed})
	if amountOf(t, applied, 150) != 50000 || amountOf(t, applied, 151) != 50000 {
		t.Fatalf("want 50000 + capped 50000, got %+v", applied)
	}
	if total(applied) != 100000 {
		t.Fatalf("combined must equal unit value exactly, got %v", total(applied))
	}
}

func TestCorner_SecondPairAfterClaim_SkipsClaimedUnits(t *testing.T) {
	// Brand promo claims the expensive frame entirely (100%). Second-pair (exclusive,
	// lower priority) then sees only one unit with value left → does not fire.
	claimAll := categoryPromo(160, 100, domain.PromotionScopeBrand)
	claimAll.BrandID = uptr(7)
	claimAll.Priority = 10
	second := &domain.Promotion{ID: 161, Type: domain.PromotionTypeSecondPair, Active: true,
		DiscountPercentage: fptr(50), Scope: domain.PromotionScopeCart}

	items := []EvaluateItemInput{
		{Price: 300000, Quantity: 1, BrandID: uptr(7)},
		{Price: 200000, Quantity: 1, BrandID: uptr(9)},
	}
	applied := EvaluateCart(items, nil, testNow, []*domain.Promotion{claimAll, second})
	if amountOf(t, applied, 160) != 300000 {
		t.Fatalf("brand promo want full 300000, got %+v", applied)
	}
	if amountOf(t, applied, 161) != 0 {
		t.Fatalf("second pair must not fire with a single valued unit left, got %+v", applied)
	}
}

func TestCorner_RoundingToCents(t *testing.T) {
	promo := categoryPromo(170, 33.33, domain.PromotionScopeCart)
	items := []EvaluateItemInput{{Price: 99999, Quantity: 1}}
	applied := EvaluateCart(items, nil, testNow, []*domain.Promotion{promo})
	want := math.Round(99999*0.3333*100) / 100
	if len(applied) != 1 || applied[0].Amount != want {
		t.Fatalf("want %.2f, got %+v", want, applied)
	}
}

func TestCorner_StackableCartLevel_SequentialBase(t *testing.T) {
	// Exclusive cart 10% then stackable cart 10%: second computes on the already
	// reduced remainder (10% of 90% = 9%), never on the original.
	excl := cartTotal(180, 1, 10)
	stack := cartTotal(181, 1, 10)
	stack.Stackable = true

	items := []EvaluateItemInput{{Price: 100000, Quantity: 1}}
	applied := EvaluateCart(items, nil, testNow, []*domain.Promotion{excl, stack})
	if amountOf(t, applied, 180) != 10000 || amountOf(t, applied, 181) != 9000 {
		t.Fatalf("want 10000 then 9000, got %+v", applied)
	}
}

// --- Validation (buildFromInput) for cross_product ---

func TestValidation_CrossProductRequiresTrigger(t *testing.T) {
	in := CreateInput{Name: "x", Type: "cross_product", DiscountPercentage: fptr(10),
		Scope: "product_type", ProductType: "lens"}
	if _, err := buildFromInput(&domain.Promotion{}, in); err == nil {
		t.Fatal("missing trigger_scope must be rejected")
	}
}

func TestValidation_CrossProductRejectsSelfTrigger(t *testing.T) {
	in := CreateInput{Name: "x", Type: "cross_product", DiscountPercentage: fptr(10),
		Scope: "product_type", ProductType: "lens",
		TriggerScope: "product_type", TriggerProductType: "lens"}
	if _, err := buildFromInput(&domain.Promotion{}, in); err == nil {
		t.Fatal("trigger == target must be rejected")
	}
}

func TestValidation_CrossProductValid(t *testing.T) {
	in := CreateInput{Name: "x", Type: "cross_product", DiscountPercentage: fptr(10),
		Scope: "product_type", ProductType: "lens",
		TriggerScope: "product_type", TriggerProductType: "frame"}
	p, err := buildFromInput(&domain.Promotion{}, in)
	if err != nil {
		t.Fatalf("valid cross_product rejected: %v", err)
	}
	if p.TriggerScope != domain.PromotionScopeProductType || p.TriggerProductType != "frame" {
		t.Fatalf("trigger fields not mapped: %+v", p)
	}
}
