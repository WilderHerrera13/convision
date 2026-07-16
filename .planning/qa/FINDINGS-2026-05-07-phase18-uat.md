---
status: complete
app: convision-api-golang
api: convision-api-golang
base_url: http://localhost:8001
started: 2026-05-07T15:00:00-05:00
updated: 2026-05-07T15:35:00-05:00
phase: 18 — Sales Inventory Stock Deduction
roles_tested: [admin]
---

# QA Findings — Phase 18 Human Verification UAT

## Resumen ejecutivo

- Pantallas / endpoints verificados: 5 (HV-01 a HV-05)
- Hallazgos confirmados: 2 (GAP-01, GAP-02)
- Hipótesis: 0
- HV pasados: HV-01, HV-02, HV-03, HV-04, HV-05

---

## Pre-conditions aplicadas para la sesión

Antes de poder ejecutar HV-02 a HV-05 fue necesario aplicar dos correcciones de entorno:

1. **`ALTER ROLE convision SET search_path = optica_main, public`** — El `sale.Service` usa `s.db` (global DB) directamente (decisión arquitectural de Phase 16). Sin este change, el INSERT a `sales` resolvía `public` schema (vacío) y fallaba FK. Esta es una limitación de la configuración local de dev, no un bug de Phase 18.
2. **`PUT /api/v1/branches/1 { "default_warehouse_id": 2045 }`** — El `default_warehouse_id` de la sucursal apuntaba a `warehouse_id=1` (bodega de otra carga QA), no a `warehouse_id=2045` (Bodega Principal que contiene el inventario real).

---

## Hallazgos (FAIL / GAP)

### GAP-01 — El endpoint PUT /branches/:id no permite limpiar (null) el default_warehouse_id

- **Rol:** admin
- **URL:** `PUT http://localhost:8001/api/v1/branches/1`
- **Severidad:** menor
- **Pasos:**
  1. `PUT /api/v1/branches/1` con body `{"default_warehouse_id": null}`
  2. `GET /api/v1/branches/1`
- **Esperado:** `default_warehouse_id = null`
- **Observado:** el campo no cambia; la guarda condicional `if input.DefaultWarehouseID != nil` omite la actualización cuando el valor es null
- **Evidencia:** `branch/service.go:123 — if input.DefaultWarehouseID != nil { b.DefaultWarehouseID = input.DefaultWarehouseID }`
- **Estado:** confirmado

### GAP-02 — sale.Service usa DB global (search_path public) en entorno local sin search_path configurado

- **Rol:** todos
- **URL:** `POST http://localhost:8001/api/v1/sales`
- **Severidad:** mayor (bloqueante en local sin workaround, no impacta staging/prod si el DSN tiene search_path correcto)
- **Pasos:**
  1. Instalar local con `convision` user sin `ALTER ROLE ... SET search_path`
  2. `POST /api/v1/sales`
- **Esperado:** venta creada (HTTP 201)
- **Observado:** `ERROR: insert or update on table "sales" violates foreign key constraint "fk_sales_patient" (SQLSTATE 23503)`
- **Evidencia:** `sale/service.go:278 — s.saleRepo.Create(s.db, sale)` usa `s.db` (global DB sin search_path de tenant); la data está en `optica_main` schema
- **Raíz:** En Phase 16, `sale.Service` fue marcado como excepción al refactor de tenant DB (comment en commit `e0f2476`). El workaround local es `ALTER ROLE convision SET search_path = optica_main, public`.
- **Estado:** confirmado

---

## OK (sin incidencias)

| Test | Endpoint | Resultado |
|------|----------|-----------|
| HV-01 | `PUT /api/v1/branches/1 {default_warehouse_id: 2045}` → `GET /api/v1/branches/1` | PASS — `default_warehouse_id=2045` persiste |
| HV-02 | `POST /api/v1/sales` con product 32433 (tracks_stock=true, qty=1 en warehouse 2045) | PASS — sale_id=3 (VTA-0003), `inventory_items.quantity` 1→0, kardex `exit|reference_type=sale|reference_id=3` |
| HV-03a | Venta desde branch 3 (null default_warehouse_id) | PASS — HTTP 201; log warn "branch has no default_warehouse_id configured, skipping all deductions" |
| HV-03b | Venta con product 32433 (zero stock en warehouse 2045) | PASS — HTTP 201; log warn "zero stock in default warehouse, sale proceeds without deduction" |
| HV-03c | Venta con product 28355 (sin inventory item en warehouse 2045) | PASS — HTTP 201; log warn "no inventory item found in default warehouse, skipping" |
| HV-04 | `POST /api/v1/sales/3/cancel` | PASS — HTTP 200; `inventory_items.quantity` 0→1; kardex `adjustment_add|reference_type=sale|reference_id=3` |
| HV-05 | `POST /api/v1/sales/3/cancel` (segunda vez, ya cancelada) | PASS — HTTP 200; stock sigue en 1; kardex sin nueva entrada (3 entradas, no 4) |

---

## Evidencia de kardex (producto 32433, warehouse 2045)

```
id     | movement_type  | reference_type | ref_id | qty_before | qty_delta | qty_after
-------|----------------|----------------|--------|------------|-----------|----------
44001  | entry          | manual         |        | 0          | +1        | 1
47869  | exit           | sale           | 3      | 1          | -1        | 0        ← deducción HV-02
47870  | adjustment_add | sale           | 3      | 0          | +1        | 1        ← reversión HV-04
```

Después del double-cancel (HV-05): tabla sin cambios (solo 3 filas). ✅ Idempotencia confirmada.

---

## Handoff al agente de corrección

IDs para corrección con `convision-qa-fixer`:

| ID | Severidad | Acción sugerida |
|----|-----------|-----------------|
| GAP-01 | menor | En `branch/service.go`, agregar manejo explícito para null en el campo `DefaultWarehouseID` (por ejemplo, aceptar un `"default_warehouse_id": 0` para limpiar, o cambiar la lógica de guarda) |
| GAP-02 | mayor | Documentar en `.env.example` y DEVELOPMENT_GUIDE: `ALTER ROLE convision SET search_path = optica_main, public` es requerido para dev local. O mejor: agregar el parámetro `search_path=optica_main` al DSN del `Open()` en `db.go` cuando `APP_ENV=local`. |
