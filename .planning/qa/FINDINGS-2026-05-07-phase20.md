---
status: complete
app: convision-front
api: convision-api-golang (Go)
base_url: http://localhost:4300
api_url: http://localhost:8001
started: 2026-05-07T13:30:00-05:00
updated: 2026-05-07T14:00:00-05:00
roles_tested: [super_admin]
phase_focus: 20 - super-admin-optica-permission-scoping
---

# QA FINDINGS — Fase 20: Super-Admin Optica Permission Scoping

## Resumen ejecutivo

- Pantallas verificadas: 4 (/platform/login, /super-admin/opticas, /super-admin/opticas/1, tab Permisos)
- Hallazgos críticos: 1 (corregido en sesión)
- Hallazgos mayores: 2 (corregidos en sesión)
- Hallazgos menores/sugerencias: 1 (abierto)
- UAT items verificados: 6/6 ✓

---

## Hallazgos FAIL / GAP

### QA-P20-001 — CORREGIDO ✓
- Rol: super_admin
- URL: /api/v1/super-admin/* (todos los endpoints)
- Severidad: **bloqueante**
- Pasos: 1. Login en /platform/login → 2. Navegar a /super-admin/opticas → 3. Tabla vacía con error "No tienes permisos suficientes"
- Esperado: Lista de ópticas cargada correctamente
- Observado: HTTP 403 "forbidden: insufficient permissions" en todos los endpoints /super-admin/*
- Evidencia: JWT super_admin generado con `permissions: []`. Middleware `RequirePermission("super_admin:access")` en routes.go línea 63 requiere el permiso en el array del JWT, pero `loginSuperAdmin` (auth/service.go línea 108) llama `GenerateToken(user, 0, "platform", nil, nil)` con permissions=nil.
- Fix aplicado: `auth/service.go:108` → `GenerateToken(user, 0, "platform", nil, []string{"super_admin:access"})`
- Estado: confirmado → **CORREGIDO**

### QA-P20-002 — CORREGIDO ✓
- Rol: super_admin
- URL: /api/v1/auth/me (llamada interna del AuthContext)
- Severidad: **mayor**
- Pasos: 1. Login como super_admin → 2. AuthContext hace GET /api/v1/auth/me en checkAuth → 3. Respuesta 403 → logout inmediato
- Esperado: Sesión super_admin persistente tras login
- Observado: TenantSchema middleware (tenant_schema.go) cross-checks JWT schema_name="platform" vs subdomain schema → mismatch → 403 "token no pertenece a esta óptica" → AuthContext hace logout del super_admin
- Fix aplicado: `AuthContext.tsx` → en checkAuth, si `storedUser.role === 'super_admin'` se saltea la llamada a getCurrentUser() (que usa auth/me). Los tokens de plataforma son confiables directamente del localStorage.
- Estado: confirmado → **CORREGIDO**

### QA-P20-003 — CORREGIDO ✓
- Rol: super_admin (con sesión admin activa previamente)
- URL: /platform/login
- Severidad: **mayor**
- Pasos: 1. Estar logueado como admin → 2. Navegar a /platform/login → 3. Login como superadmin → 4. Redirige a /unauthorized
- Esperado: Redirección exitosa a /super-admin/opticas
- Observado: PlatformLoginPage.tsx llama navigate('/super-admin/opticas') via React Router, pero AuthContext.user todavía contiene el usuario admin anterior (React state no actualizado). ProtectedRoute ve role='admin' vs allowedRoles=['super_admin'] → /unauthorized
- Fix aplicado: `PlatformLoginPage.tsx` → cambiado `navigate('/super-admin/opticas')` por `window.location.href = '/super-admin/opticas'` para forzar recarga completa y re-inicialización del AuthContext desde localStorage
- Estado: confirmado → **CORREGIDO**

### QA-P20-004 — ABIERTO (sugerencia)
- Rol: super_admin
- URL: /super-admin/opticas/1 (tab Permisos)
- Severidad: **menor**
- Pasos: 1. Abrir tab Permisos en cualquier óptica → 2. Ver nombres de módulos y acciones
- Esperado: Nombres de módulos y acciones en español ("Citas", "Crear", "Ver", etc.)
- Observado: Módulos y acciones mostrados como claves técnicas en inglés capitalizadas ("Appointments", "Create", "Delete", "Bulk Import"). El panel usa `.replace(/_/g, ' ')` y `capitalize` sobre las claves de permiso, sin traducción a español.
- Evidencia: Screenshot qa-permisos-accordion-open.png — módulo "Appointments" con acciones "Create", "Delete", "Edit", "View"
- Estado: confirmado — no bloqueante, pero incumple la convención UI en español del proyecto (CLAUDE.md)

---

## UAT Items Verificados (desde 20-HUMAN-UAT.md)

| # | Test | Resultado |
|---|------|-----------|
| 1 | Panel carga con todos los checkboxes marcados (sin restricciones) | ✓ Confirmado — todos los módulos muestran N/N |
| 2 | Panel renderiza módulos y acciones correctamente (accordion) | ✓ Confirmado — accordion con 20+ módulos, checkboxes por acción |
| 3 | "Seleccionar todo" / "Limpiar" funcionan por módulo | ✓ Confirmado — 4/4 → 0/4 → 4/4 al alternar |
| 4 | Guardar restricciones persiste en DB | ✓ Confirmado — PUT 200, reload muestra estado guardado |
| 5 | Guardar array vacío limpia restricciones | ✓ Confirmado — PUT con [] → API devuelve [] → login sin restricciones |
| 6 | Intersección de permisos en login | ✓ Confirmado — ceiling ["appointments:view"] → JWT admin tiene solo 1 permiso |

---

## OK (sin incidencias)

| Rol | Ruta | Notas |
|-----|------|--------|
| super_admin | /platform/login | Carga correctamente, formulario funciona |
| super_admin | /super-admin/opticas | Lista ópticas con schema/plan/estado/fecha |
| super_admin | /super-admin/opticas/1 | Tabs Información/Módulos/Administradores/Permisos visibles |
| super_admin | /super-admin/opticas/1 (Permisos) | Accordion carga, checkboxes reactivos, guardar funciona |
| API | PUT /super-admin/opticas/1/permissions | 200, persiste correctamente |
| API | GET /super-admin/opticas/1/permissions | 200, devuelve estado actual |
| API | GET /super-admin/permissions | 200, 111 permisos en 20+ módulos |
| Backend | Login intersection (SCOPE-02) | JWT contiene solo permisos dentro del ceiling configurado |

---

## Handoff al agente de corrección

Bugs abiertos tras esta sesión:

- **QA-P20-004** (sugerencia): Traducir nombres de módulos y acciones del panel de permisos al español.
  - Archivo: `convision-front/src/pages/super-admin/OpticaPermissionsPanel.tsx`
  - Líneas: `{module.replace(/_/g, ' ')}` y `{p.action.replace(/_/g, ' ')}`
  - Fix sugerido: agregar diccionario de traducción `MODULE_ES` y `ACTION_ES` similar al de RoleFormShell.tsx
