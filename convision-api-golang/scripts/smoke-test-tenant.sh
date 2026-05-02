#!/bin/bash
set -e

BASE="https://api.opticaconvision.com"
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

pass() { echo -e "${GREEN}PASS${NC}: $1"; }
fail() { echo -e "${RED}FAIL${NC}: $1"; exit 1; }

echo "=== Phase 16 Multi-Tenant Smoke Tests ==="

echo -n "Health check... "
curl -sf "$BASE/health" > /dev/null && pass "health" || fail "health"

echo -n "Tenant login (main)... "
RESP=$(curl -s \
  -H "Host: main.app.opticaconvision.com" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@convision.com","password":"password"}' \
  "$BASE/api/v1/auth/login")
TOKEN=$(echo "$RESP" | jq -r .access_token)
[ "$TOKEN" != "null" ] && [ -n "$TOKEN" ] && pass "tenant login" || fail "tenant login: $RESP"

echo -n "Tenant /me... "
ME=$(curl -s \
  -H "Host: main.app.opticaconvision.com" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/v1/auth/me")
[ "$(echo "$ME" | jq -r .data.id)" != "null" ] && pass "/me" || fail "/me: $ME"

echo -n "Super admin login... "
SA_RESP=$(curl -s \
  -H "Host: admin.app.opticaconvision.com" \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@convision.com","password":"password"}' \
  "$BASE/api/v1/auth/login")
SA_TOKEN=$(echo "$SA_RESP" | jq -r .access_token)
[ "$SA_TOKEN" != "null" ] && [ -n "$SA_TOKEN" ] && pass "super admin login" || fail "super admin login: $SA_RESP"

echo -n "Super admin list opticas... "
OPTICAS=$(curl -s \
  -H "Host: admin.app.opticaconvision.com" \
  -H "Authorization: Bearer $SA_TOKEN" \
  "$BASE/api/v1/super-admin/opticas")
TOTAL=$(echo "$OPTICAS" | jq -r .total)
[ "$TOTAL" -ge 1 ] 2>/dev/null && pass "list opticas (total=$TOTAL)" || fail "list opticas: $OPTICAS"

echo -n "Cross-tenant token rejection... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Host: main.app.opticaconvision.com" \
  -H "Authorization: Bearer $SA_TOKEN" \
  "$BASE/api/v1/auth/me")
[ "$STATUS" = "403" ] && pass "cross-tenant rejection" || fail "cross-tenant rejection: status=$STATUS"

echo -n "Apex redirect... "
REDIR=$(curl -s -o /dev/null -w "%{http_code}" https://app.opticaconvision.com)
[ "$REDIR" = "302" ] && pass "apex redirect" || fail "apex redirect: status=$REDIR"

echo ""
echo -e "${GREEN}All smoke tests passed!${NC}"
