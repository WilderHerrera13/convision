---
status: all-fixed
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
started: 2026-05-02T13:11:00Z
updated: 2026-05-02T14:30:00Z
scope: phase-16 multi-tenancy-super-admin
roles_tested: [admin, super_admin]
---

# QA Exploración — Phase 16: Multi-Tenancy Super Admin

## Resumen ejecutivo

- Pantallas verificadas: 6 (login, dashboard, pacientes, /super-admin/opticas attempt, API endpoints)
- Hallazgos confirmados: 3
- Hipótesis / pendiente evidencia: 0
- Backend super-admin API: 100% funcional
- Fixes anteriores (16-08, 16-09): verificados en código y DB, correctos

---

## Hallazgos (FAIL / GAP)

### QA-001
- Rol: admin (y todos los roles tenants)
- URL: http://localhost:4300/admin/dashboard (sidebar)
- Severidad: **mayor**
- Pasos:
  1. Login como admin@convision.com
  2. Observar sidebar — faltan Citas, Ventas, Cotizaciones, Lab, Descuentos, Compras, Inventario, Nómina, Gastos, Informe Especialista
  3. Verificar localStorage: `JSON.parse(localStorage.getItem('auth_user')).feature_flags` → `undefined`
- Esperado: Sidebar muestra todos los ítems habilitados en `feature_flags` del JWT (`sidebar.appointments`, `sidebar.sales`, etc.)
- Observado: Sidebar solo muestra ítems sin `featureKey` (Dashboard, Pacientes, Gestión de Cartera, etc.). Los 10 ítems gateados quedan ocultos.
- Evidencia: `localStorage.getItem('auth_user')` → `hasFlagsField: false`. API devuelve `feature_flags: ["sidebar.appointments", ...]` en el body de login pero `authService.login` solo hace `localStorage.setItem('auth_user', JSON.stringify(user))` sin copiar `feature_flags` al objeto `user`.
- Archivo: `convision-front/src/services/auth.ts` líneas 30-35 y 67-72
- Fix: Extraer `feature_flags` del response y mergearlo al user antes de guardarlo:
  ```ts
  const { access_token, token_type, expires_in, user, branches, feature_flags } = response.data;
  const userWithFlags = { ...user, feature_flags: feature_flags ?? [] };
  localStorage.setItem('auth_user', JSON.stringify(userWithFlags));
  ```
  Aplicar igual en `refreshToken` (líneas 67-72).
- Estado: **FIXED** — `auth.ts` login/refreshToken: extract `feature_flags` top-level, merge into `userWithFlags = { ...user, feature_flags: feature_flags ?? [] }`, store merged user AND return it in response object. Sidebar shows all 12 gated items after re-login. ✓

---

### QA-002
- Rol: admin (y todos los roles que usen endpoints branch-scoped)
- URL: http://localhost:4300/admin/dashboard (carga de citas del día → 403)
- Severidad: **bloqueante**
- Pasos:
  1. Login como admin@convision.com (branch activo en localStorage: `convision_branch_id=3`)
  2. Dashboard carga pero el widget de citas del día falla silenciosamente
  3. Navegar a `/admin/appointments` — todas las peticiones devuelven 403 "Sede no disponible"
  4. Verificar: `curl -H "X-Branch-ID: 3" /api/v1/appointments` → `{"message":"Sede no disponible"}`
  5. `curl -H "X-Branch-ID: 1" /api/v1/appointments` → 200 OK
- Esperado: Todos los endpoints branch-scoped (appointments, sales, inventory, laboratory-orders, etc.) responden correctamente para cualquier branch activo en `optica_main.branches`
- Observado: Solo el branch ID=1 funciona (`public.branches` tiene 1 fila: Sede Principal). Los branches 2, 3, 4 (en `optica_main.branches`) devuelven 403.
- Evidencia:
  - `SELECT COUNT(*) FROM public.branches` → 1 (solo "Sede Principal")
  - `SELECT COUNT(*) FROM optica_main.branches` → 4
  - Docker logs: `record not found — SELECT * FROM "branches" WHERE "branches"."id" = 3 → rows:0`
- Causa raíz: `BranchContext` middleware recibe `globalDB` como parámetro y lo usa directamente en `GetActiveByID(db, branchID)`. El `globalDB` tiene `search_path=public` (sin schema de tenant). La tabla `branches` en `public` solo tiene 1 fila legacy. Los branches reales están en `optica_main.branches` y solo son accesibles vía el `tenant_db` que crea `TenantSchema`.
- Archivo: `convision-api-golang/internal/transport/http/v1/middleware/branch.go` línea 32
- Fix: Obtener `tenant_db` del gin context y usarlo si está disponible:
  ```go
  func BranchContext(branchRepo domain.BranchRepository, fallbackDB *gorm.DB) gin.HandlerFunc {
      return func(c *gin.Context) {
          db := fallbackDB
          if v, ok := c.Get("tenant_db"); ok {
              if tdb, ok := v.(*gorm.DB); ok {
                  db = tdb
              }
          }
          // ...resto del middleware usa db (ahora tenant-scoped)
      }
  }
  ```
- Estado: **FIXED** — `BranchContext` now checks gin context for `tenant_db` key and uses it if present, falls back to `fallbackDB`. Rebuilt Docker image. `curl -H "X-Branch-ID: 3"` → HTTP 200. ✓

---

### QA-003
- Rol: super_admin
- URL: http://localhost:4300/super-admin/opticas
- Severidad: **bloqueante**
- Pasos:
  1. Arrancar API con `DEFAULT_TENANT_SLUG=admin`
  2. Login como superadmin@convision.com → redirige a `/super-admin/opticas`
  3. Página crashea inmediatamente con error de React Router
  4. URL cambia a `/unauthorized` (error boundary)
- Esperado: `/super-admin/opticas` carga tabla de ópticas con columnas ID, Nombre, Slug, Plan, Estado
- Observado: React Router captura el error `"Columns require an id when using a non-string header"` y muestra error boundary
- Evidencia: Console error → `Error: Columns require an id when using a non-string header at createColumn (@tanstack/react-table:165) ... at OpticasPage (OpticasPage.tsx:67)`
- Causa raíz: `OpticasPage.tsx` define columnas con `key` en lugar de `id`, `sortable` en lugar de `enableSorting`, `render` en lugar de `cell`. `DataTable.tsx` construye cada columna con `id: column.id` → `column.id` es `undefined` porque la página usa `column.key`. TanStack Table requiere `id` cuando `header` es una función (no string).
- Archivo: `convision-front/src/pages/super-admin/OpticasPage.tsx` líneas 18-36
- Fix:
  ```tsx
  const columns: DataTableColumnDef<Optica>[] = [
    { id: 'id', header: 'ID', type: 'text', enableSorting: true },
    { id: 'name', header: 'Nombre', type: 'text', enableSorting: true },
    { id: 'slug', header: 'Slug', type: 'text', enableSorting: true },
    {
      id: 'plan',
      header: 'Plan',
      type: 'custom',
      cell: (o: Optica) => <Badge variant="outline">{PLAN_LABELS[o.plan] ?? o.plan}</Badge>,
    },
    {
      id: 'is_active',
      header: 'Estado',
      type: 'custom',
      cell: (o: Optica) => (
        <Badge variant={o.is_active ? 'default' : 'secondary'}>
          {o.is_active ? 'Activa' : 'Inactiva'}
        </Badge>
      ),
    },
  ];
  ```
- Estado: **FIXED** — All column defs use `id`, `type: 'custom'`, `cell`, `enableSorting`. Page loads correctly; row click → detail page; feature flag toggles work (PATCH 200). ✓

---

## OK (sin incidencias)

| Área | Ruta / Endpoint | Notas |
|------|----------------|-------|
| API | `GET /health` | 200, `status:ok` |
| Auth | `POST /api/v1/auth/login` (admin) | 200, JWT correcto con `optica_id`, `schema_name`, `feature_flags` |
| Auth | `POST /api/v1/auth/login` (super_admin) | 200, JWT con `role:super_admin`, `schema_name:platform` — fix 16-09 ✓ |
| Auth Middleware | JWT revocation (`globalDB` + `platform.revoked_tokens`) | 200 en endpoints protegidos — fix 16-08 ✓ |
| Super Admin API | `GET /api/v1/super-admin/opticas` | 200, lista correcta |
| Super Admin API | `GET /api/v1/super-admin/opticas/1` | 200, detalle correcto |
| Super Admin API | `GET /api/v1/super-admin/opticas/1/features` | 200, 12 feature flags |
| Super Admin API | `PATCH /api/v1/super-admin/opticas/1/features/:key` | 200, toggle funciona |
| Super Admin API | `GET /api/v1/super-admin/feature-keys` | 200, 12 keys |
| Admin Frontend | `GET /admin/dashboard` | Carga, métricas en 0 (sin datos es OK) |
| Admin Frontend | `GET /admin/patients` | Carga, tabla con 2 pacientes |
| ProtectedRoute | `/super-admin/*` con `role:super_admin` | Acceso permitido correctamente |
| DB | `platform.revoked_tokens` | Tabla existe con migration 000023 ✓ |
| Code | `domain.RevokedToken.TableName()` | Retorna `"platform.revoked_tokens"` ✓ |
| Code | `tenant_subdomain.go` local dev | Admin slug → platform, cache lookup para optica_id ✓ |

---

## Observaciones menores (no bugs)

| # | Descripción | Archivo |
|---|-------------|---------|
| M1 | `platform.opticas.created_at` es NULL en DB → API devuelve `"0001-01-01T00:00:00Z"` | Seed/bootstrap no popula timestamp |
| M2 | SuperAdminLayout usa sidebar claro (`bg-[#fcfcfd]`), no oscuro como decía la especificación UAT original | SuperAdminLayout.tsx |
| M3 | `public.branches` tiene fila legacy "Sede Principal" (del bootstrap) que coexiste con datos en `optica_main.branches` | DB state |

---

## Resultado final

Todos los hallazgos fueron corregidos en la misma sesión de QA. No quedan issues abiertos.

| Bug | Archivo | Estado |
|-----|---------|--------|
| QA-001: feature_flags no llegan al sidebar | `convision-front/src/services/auth.ts` | ✅ FIXED |
| QA-002: branch-scoped endpoints 403 para branch > 1 | `convision-api-golang/internal/transport/http/v1/middleware/branch.go` | ✅ FIXED |
| QA-003: `/super-admin/opticas` crash en React | `convision-front/src/pages/super-admin/OpticasPage.tsx` | ✅ FIXED |
