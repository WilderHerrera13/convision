#!/usr/bin/env bash
# verify-inventory.sh — Integration verification for Phase 8: Inventory Backend Hardening
# Usage: BASE_URL=http://localhost:8001 TOKEN=<jwt> bash verify-inventory.sh
# Or with auto-login: BASE_URL=http://localhost:8001 bash verify-inventory.sh

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8001}"
TOKEN="${TOKEN:-}"

PASS=0
FAIL=0

_auth() { echo "Authorization: Bearer $TOKEN"; }
_json() { echo "Content-Type: application/json"; }

assert_status() {
  local label="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  PASS: $label (HTTP $actual)"
    PASS=$((PASS+1))
  else
    echo "  FAIL: $label (expected HTTP $expected, got HTTP $actual)"
    FAIL=$((FAIL+1))
  fi
}

assert_json_contains() {
  local label="$1" body="$2" pattern="$3"
  if echo "$body" | grep -q "$pattern"; then
    echo "  PASS: $label"
    PASS=$((PASS+1))
  else
    echo "  FAIL: $label (pattern '$pattern' not found in response)"
    echo "    Response: $body" | head -c 300
    FAIL=$((FAIL+1))
  fi
}

assert_json_not_contains() {
  local label="$1" body="$2" pattern="$3"
  if ! echo "$body" | grep -q "$pattern"; then
    echo "  PASS: $label"
    PASS=$((PASS+1))
  else
    echo "  FAIL: $label (pattern '$pattern' should NOT be in response)"
    FAIL=$((FAIL+1))
  fi
}

echo "========================================================"
echo " Convision — Inventory Backend Verification"
echo " BASE_URL: $BASE_URL"
echo "========================================================"

# ── 0. Login (if TOKEN not provided) ──
if [ -z "$TOKEN" ]; then
  echo ""
  echo "── 0. Login ──"
  LOGIN_BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/login" \
    -H "$(_json)" \
    -d '{"email":"admin@convision.com","password":"password"}')
  LOGIN_CODE=$(echo "$LOGIN_BODY" | tail -1)
  LOGIN_JSON=$(echo "$LOGIN_BODY" | head -n -1)
  assert_status "Login as admin" "200" "$LOGIN_CODE"
  TOKEN=$(echo "$LOGIN_JSON" | grep -o '"token":"[^"]*"' | head -1 | sed 's/"token":"//;s/"//')
  if [ -z "$TOKEN" ]; then
    echo "  FATAL: Could not extract token from login response. Exiting."
    echo "  Response: $LOGIN_JSON"
    exit 1
  fi
  echo "  INFO: Token obtained successfully"
fi

# ────────────────────────────────────────────────────────
echo ""
echo "── 1. Warehouse CRUD ──"

# Create warehouse
WH_BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/warehouses" \
  -H "$(_auth)" -H "$(_json)" \
  -d '{"name":"Bodega Verificacion","code":"VRF-001","status":"active"}')
WH_CODE=$(echo "$WH_BODY" | tail -1)
WH_JSON=$(echo "$WH_BODY" | head -n -1)
assert_status "Create warehouse" "201" "$WH_CODE"
WH_ID=$(echo "$WH_JSON" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

# Get warehouse
GET_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/warehouses/$WH_ID" \
  -H "$(_auth)")
assert_status "Get warehouse" "200" "$GET_CODE"

# List warehouses
LIST_BODY=$(curl -s "$BASE_URL/api/v1/warehouses" -H "$(_auth)")
assert_json_contains "List warehouses returns data array" "$LIST_BODY" '"data"'

# Update warehouse
UPD_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE_URL/api/v1/warehouses/$WH_ID" \
  -H "$(_auth)" -H "$(_json)" \
  -d '{"name":"Bodega Verificacion Actualizada","status":"active"}')
assert_status "Update warehouse" "200" "$UPD_CODE"

# ────────────────────────────────────────────────────────
echo ""
echo "── 2. Warehouse Location CRUD ──"

# Create location A (source)
LOC_A_BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/warehouse-locations" \
  -H "$(_auth)" -H "$(_json)" \
  -d "{\"warehouse_id\":$WH_ID,\"name\":\"Ubicacion A\",\"code\":\"VRF-LOC-A\",\"type\":\"Shelf\",\"status\":\"active\"}")
LOC_A_CODE=$(echo "$LOC_A_BODY" | tail -1)
LOC_A_JSON=$(echo "$LOC_A_BODY" | head -n -1)
assert_status "Create location A" "201" "$LOC_A_CODE"
LOC_A_ID=$(echo "$LOC_A_JSON" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

# Create location B (destination)
LOC_B_BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/warehouse-locations" \
  -H "$(_auth)" -H "$(_json)" \
  -d "{\"warehouse_id\":$WH_ID,\"name\":\"Ubicacion B\",\"code\":\"VRF-LOC-B\",\"type\":\"Shelf\",\"status\":\"active\"}")
LOC_B_CODE=$(echo "$LOC_B_BODY" | tail -1)
LOC_B_JSON=$(echo "$LOC_B_BODY" | head -n -1)
assert_status "Create location B" "201" "$LOC_B_CODE"
LOC_B_ID=$(echo "$LOC_B_JSON" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

# Get location
GET_LOC_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/warehouse-locations/$LOC_A_ID" \
  -H "$(_auth)")
assert_status "Get warehouse location" "200" "$GET_LOC_CODE"

# ────────────────────────────────────────────────────────
echo ""
echo "── 3. Inventory Item CRUD & Guards ──"

# Get a real product ID from the catalog
PROD_BODY=$(curl -s "$BASE_URL/api/v1/products?per_page=1" -H "$(_auth)")
PROD_ID=$(echo "$PROD_BODY" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -z "$PROD_ID" ]; then
  echo "  SKIP: No products in catalog — item tests skipped (seed products first)"
  FAIL=$((FAIL+1))
else
  # Create inventory item in location A with quantity=10
  ITEM_A_BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/inventory-items" \
    -H "$(_auth)" -H "$(_json)" \
    -d "{\"product_id\":$PROD_ID,\"warehouse_id\":$WH_ID,\"warehouse_location_id\":$LOC_A_ID,\"quantity\":10,\"status\":\"available\"}")
  ITEM_A_CODE=$(echo "$ITEM_A_BODY" | tail -1)
  ITEM_A_JSON=$(echo "$ITEM_A_BODY" | head -n -1)
  assert_status "Create inventory item in location A (qty=10)" "201" "$ITEM_A_CODE"
  ITEM_A_ID=$(echo "$ITEM_A_JSON" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

  # Create item in location B with quantity=0 (for transfer destination)
  ITEM_B_BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/inventory-items" \
    -H "$(_auth)" -H "$(_json)" \
    -d "{\"product_id\":$PROD_ID,\"warehouse_id\":$WH_ID,\"warehouse_location_id\":$LOC_B_ID,\"quantity\":0,\"status\":\"available\"}")
  ITEM_B_CODE=$(echo "$ITEM_B_BODY" | tail -1)
  ITEM_B_JSON=$(echo "$ITEM_B_BODY" | head -n -1)
  assert_status "Create inventory item in location B (qty=0)" "201" "$ITEM_B_CODE"
  ITEM_B_ID=$(echo "$ITEM_B_JSON" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

  # Uniqueness constraint: duplicate product+location must fail
  DUP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/inventory-items" \
    -H "$(_auth)" -H "$(_json)" \
    -d "{\"product_id\":$PROD_ID,\"warehouse_id\":$WH_ID,\"warehouse_location_id\":$LOC_A_ID,\"quantity\":5}")
  assert_status "Duplicate product+location rejected (409)" "409" "$DUP_CODE"

  # Delete protection: item with quantity > 0 must not be deletable
  DEL_PROT_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/v1/inventory-items/$ITEM_A_ID" \
    -H "$(_auth)")
  assert_status "Delete inventory item with qty>0 rejected (422)" "422" "$DEL_PROT_CODE"

  # AdjustStock by item ID: adjust item A from 10 to 7 (delta=-3)
  ADJ_BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/inventory/adjust" \
    -H "$(_auth)" -H "$(_json)" \
    -d "{\"inventory_item_id\":$ITEM_A_ID,\"delta\":-3,\"reason\":\"verification test\"}")
  ADJ_CODE=$(echo "$ADJ_BODY" | tail -1)
  ADJ_JSON=$(echo "$ADJ_BODY" | head -n -1)
  assert_status "AdjustStock by inventory_item_id" "200" "$ADJ_CODE"
  assert_json_contains "AdjustStock returns quantity=7" "$ADJ_JSON" '"quantity":7'

  # AdjustStock reject: negative result
  NEG_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/inventory/adjust" \
    -H "$(_auth)" -H "$(_json)" \
    -d "{\"inventory_item_id\":$ITEM_A_ID,\"delta\":-100,\"reason\":\"should fail\"}")
  assert_status "AdjustStock negative result rejected (422)" "422" "$NEG_CODE"

  # ────────────────────────────────────────────────────────
  echo ""
  echo "── 4. Transfer — Validation Guards ──"

  # source == destination rejected
  SAME_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/inventory-transfers" \
    -H "$(_auth)" -H "$(_json)" \
    -d "{\"source_location_id\":$LOC_A_ID,\"destination_location_id\":$LOC_A_ID,\"quantity\":1,\"product_id\":$PROD_ID}")
  assert_status "Transfer source==destination rejected (422)" "422" "$SAME_CODE"

  # quantity < 1 rejected
  QTY_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/inventory-transfers" \
    -H "$(_auth)" -H "$(_json)" \
    -d "{\"source_location_id\":$LOC_A_ID,\"destination_location_id\":$LOC_B_ID,\"quantity\":0,\"product_id\":$PROD_ID}")
  assert_status "Transfer quantity<1 rejected (422)" "422" "$QTY_CODE"

  # insufficient stock: item A has 7, request 20
  INSUFF_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/inventory-transfers" \
    -H "$(_auth)" -H "$(_json)" \
    -d "{\"source_location_id\":$LOC_A_ID,\"destination_location_id\":$LOC_B_ID,\"quantity\":20,\"product_id\":$PROD_ID}")
  assert_status "Transfer insufficient stock rejected (422)" "422" "$INSUFF_CODE"

  # ────────────────────────────────────────────────────────
  echo ""
  echo "── 5. Transfer — Happy Path (Stock Movement) ──"

  # Create transfer: move 5 units from A (has 7) to B (has 0)
  TRF_BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/inventory-transfers" \
    -H "$(_auth)" -H "$(_json)" \
    -d "{\"source_location_id\":$LOC_A_ID,\"destination_location_id\":$LOC_B_ID,\"quantity\":5,\"product_id\":$PROD_ID}")
  TRF_CODE=$(echo "$TRF_BODY" | tail -1)
  TRF_JSON=$(echo "$TRF_BODY" | head -n -1)
  assert_status "Create transfer (pending)" "201" "$TRF_CODE"
  TRF_ID=$(echo "$TRF_JSON" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
  assert_json_contains "Transfer status is pending" "$TRF_JSON" '"status":"pending"'

  # Complete the transfer
  COMP_BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/inventory-transfers/$TRF_ID/complete" \
    -H "$(_auth)")
  COMP_CODE=$(echo "$COMP_BODY" | tail -1)
  COMP_JSON=$(echo "$COMP_BODY" | head -n -1)
  assert_status "Complete transfer" "200" "$COMP_CODE"
  assert_json_contains "Completed transfer has status=completed" "$COMP_JSON" '"status":"completed"'
  assert_json_not_contains "completed_at is not null" "$COMP_JSON" '"completed_at":null'

  # Verify location A quantity dropped from 7 to 2
  ITEM_A_AFTER=$(curl -s "$BASE_URL/api/v1/inventory-items/$ITEM_A_ID" -H "$(_auth)")
  assert_json_contains "Location A quantity decreased to 2 after transfer" "$ITEM_A_AFTER" '"quantity":2'

  # Verify location B quantity increased from 0 to 5
  ITEM_B_AFTER=$(curl -s "$BASE_URL/api/v1/inventory-items/$ITEM_B_ID" -H "$(_auth)")
  assert_json_contains "Location B quantity increased to 5 after transfer" "$ITEM_B_AFTER" '"quantity":5'

  # ────────────────────────────────────────────────────────
  echo ""
  echo "── 6. Transfer — State Machine Guards ──"

  # complete→complete: already completed transfer cannot be completed again
  RECOMP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/inventory-transfers/$TRF_ID/complete" \
    -H "$(_auth)")
  assert_status "Re-complete already-completed transfer rejected (422)" "422" "$RECOMP_CODE"

  # Create a new pending transfer to test cancel
  TRF2_BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/inventory-transfers" \
    -H "$(_auth)" -H "$(_json)" \
    -d "{\"source_location_id\":$LOC_B_ID,\"destination_location_id\":$LOC_A_ID,\"quantity\":1,\"product_id\":$PROD_ID}")
  TRF2_CODE=$(echo "$TRF2_BODY" | tail -1)
  TRF2_JSON=$(echo "$TRF2_BODY" | head -n -1)
  assert_status "Create second transfer for cancel test" "201" "$TRF2_CODE"
  TRF2_ID=$(echo "$TRF2_JSON" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

  CANCEL_BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/inventory-transfers/$TRF2_ID/cancel" \
    -H "$(_auth)")
  CANCEL_CODE=$(echo "$CANCEL_BODY" | tail -1)
  CANCEL_JSON=$(echo "$CANCEL_BODY" | head -n -1)
  assert_status "Cancel pending transfer" "200" "$CANCEL_CODE"
  assert_json_contains "Cancelled transfer status=cancelled" "$CANCEL_JSON" '"status":"cancelled"'

  # cancelled→cancel again: must be rejected
  RECANCEL_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/inventory-transfers/$TRF2_ID/cancel" \
    -H "$(_auth)")
  assert_status "Re-cancel already-cancelled transfer rejected (422)" "422" "$RECANCEL_CODE"

  # ────────────────────────────────────────────────────────
  echo ""
  echo "── 7. TotalStock — Unified Response Shape ──"

  # Without filters: must return {"data":[...], "total_units":N}
  STOCK_BODY=$(curl -s "$BASE_URL/api/v1/inventory/total-stock" -H "$(_auth)")
  assert_json_contains "TotalStock returns data array (no filters)" "$STOCK_BODY" '"data"'
  assert_json_contains "TotalStock returns total_units (no filters)" "$STOCK_BODY" '"total_units"'

  # With warehouse_id filter: same shape
  STOCK_F_BODY=$(curl -s "$BASE_URL/api/v1/inventory/total-stock?warehouse_id=$WH_ID" -H "$(_auth)")
  assert_json_contains "TotalStock with filter returns data array" "$STOCK_F_BODY" '"data"'
  assert_json_contains "TotalStock with filter returns total_units" "$STOCK_F_BODY" '"total_units"'

  # ────────────────────────────────────────────────────────
  echo ""
  echo "── 8. Location Delete Guard ──"

  # Location A still has inventory (qty=2), must not be deletable
  DEL_LOC_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/v1/warehouse-locations/$LOC_A_ID" \
    -H "$(_auth)")
  assert_status "Delete location with inventory rejected (422)" "422" "$DEL_LOC_CODE"
fi

# ────────────────────────────────────────────────────────
echo ""
echo "── 9. Warehouse Delete Guard (existing behavior) ──"

WH_DEL_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/v1/warehouses/$WH_ID" \
  -H "$(_auth)")
assert_status "Delete warehouse with inventory rejected (422)" "422" "$WH_DEL_CODE"

# ────────────────────────────────────────────────────────
echo ""
echo "========================================================"
echo " Results: $PASS passed, $FAIL failed out of $((PASS+FAIL)) tests"
echo "========================================================"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
