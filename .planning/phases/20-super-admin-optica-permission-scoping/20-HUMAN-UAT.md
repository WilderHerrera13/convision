---
status: passed
phase: 20-super-admin-optica-permission-scoping
source: [20-VERIFICATION.md]
started: 2026-05-07T00:00:00Z
updated: 2026-05-07T14:00:00Z
---

## Current Test

QA exploratorio completado vía gsd-qa-explore. Todos los tests pasaron tras aplicar 3 fixes de bugs descubiertos durante QA (commit 9ecd051).

## Tests

### 1. Permission matrix panel loads with all checkboxes checked (no saved restrictions)
expected: Navigate to super-admin OpticaDetailPage → "Permisos" tab. If the optica has no saved permissions, ALL checkboxes should be checked (default = allow all).
result: PASSED — todos los módulos muestran contador N/N con todos los checkboxes marcados

### 2. Permission matrix panel renders modules and actions correctly
expected: Accordion with one item per module (e.g., "patients", "appointments", "roles"). Each module has checkboxes for its actions (e.g., "read", "write", "manage").
result: PASSED — accordion renderiza 20+ módulos, cada uno con sus acciones como checkboxes

### 3. "Seleccionar todo" / "Limpiar" buttons work per module
expected: Clicking "Seleccionar todo" for a module checks all its action checkboxes. Clicking "Limpiar" unchecks all for that module.
result: PASSED — "Limpiar" cambia 4/4→0/4, "Seleccionar todo" cambia 0/4→4/4

### 4. Saving restrictions persists to the database
expected: Uncheck some permissions → click "Guardar permisos" → success toast shown → reload page → unchecked permissions remain unchecked.
result: PASSED — PUT 200, recarga muestra el estado guardado (appointments:delete desmarcado persiste)

### 5. Saving empty array clears all restrictions (allow all)
expected: Check all permissions → click "Guardar permisos" → success toast → backend receives empty [] → subsequent clinic user login gets all role permissions.
result: PASSED — API devuelve `{"permission_keys":[]}` tras guardar con todos seleccionados

### 6. Permission intersection applies at login
expected: Set optica allowed permissions to ["patients:read"] → login as a clinic user with role that has ["patients:read", "patients:write", "roles:manage"] → JWT should only contain ["patients:read"].
result: PASSED — con ceiling ["appointments:view"], JWT del admin contiene exactamente 1 permiso: ["appointments:view"]

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

### QA-P20-004 (sugerencia abierta)
Nombres de módulos y acciones mostrados en inglés en el panel de permisos ("Appointments", "Create", "Delete") en lugar de español. No bloqueante — funcionalidad correcta, solo UI/UX.
Fix sugerido: agregar diccionario MODULE_ES/ACTION_ES en OpticaPermissionsPanel.tsx.
