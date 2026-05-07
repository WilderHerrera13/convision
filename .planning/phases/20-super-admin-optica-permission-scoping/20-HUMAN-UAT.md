---
status: partial
phase: 20-super-admin-optica-permission-scoping
source: [20-VERIFICATION.md]
started: 2026-05-07T00:00:00Z
updated: 2026-05-07T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Permission matrix panel loads with all checkboxes checked (no saved restrictions)
expected: Navigate to super-admin OpticaDetailPage → "Permisos" tab. If the optica has no saved permissions, ALL checkboxes should be checked (default = allow all).
result: [pending]

### 2. Permission matrix panel renders modules and actions correctly
expected: Accordion with one item per module (e.g., "patients", "appointments", "roles"). Each module has checkboxes for its actions (e.g., "read", "write", "manage").
result: [pending]

### 3. "Seleccionar todo" / "Limpiar" buttons work per module
expected: Clicking "Seleccionar todo" for a module checks all its action checkboxes. Clicking "Limpiar" unchecks all for that module.
result: [pending]

### 4. Saving restrictions persists to the database
expected: Uncheck some permissions → click "Guardar permisos" → success toast shown → reload page → unchecked permissions remain unchecked.
result: [pending]

### 5. Saving empty array clears all restrictions (allow all)
expected: Check all permissions → click "Guardar permisos" → success toast → backend receives empty [] → subsequent clinic user login gets all role permissions.
result: [pending]

### 6. Permission intersection applies at login
expected: Set optica allowed permissions to ["patients:read"] → login as a clinic user with role that has ["patients:read", "patients:write", "roles:manage"] → JWT should only contain ["patients:read"].
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
