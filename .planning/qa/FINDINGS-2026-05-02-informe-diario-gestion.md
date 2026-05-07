---
status: updated
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
started: 2026-05-02T13:40:00Z
updated: 2026-05-02T14:30:00Z
roles_tested: [receptionist, admin, specialist]
scope: "Informe Diario de Gestión / Reporte Diario — filtros, montos, branches, multi-tenant, persistencia"
---

# QA FINDINGS — Informe Diario de Gestión / Reporte Diario
## Sesión 2026-05-02

### Alcance
Flujo del Reporte de Gestión Diario (receptionist), vista consolidada admin, Informe de Gestión specialist.
Foco: filtros por fecha, filtro por branch/sede, validación de montos, persistencia de datos, soporte multi-tenant.

---

## Resumen ejecutivo

- Pantallas verificadas: 8 (login ×3, dashboard receptionist, daily-report, daily-report-history, admin/daily-reports, specialist/management-report)
- Hallazgos confirmados: 4
- Hipótesis / pendiente evidencia: 1
- Sin incidencias (lista): ver sección OK abajo

---

## Hallazgos (FAIL / GAP)

### QA-001 — CRÍTICO: `branch_id` se pisa a 0 en cada PUT del reporte diario (receptionist)

- **Rol:** receptionist
- **URL:** `http://localhost:4300/receptionist/daily-report`
- **Severidad:** bloqueante
- **Pasos:**
  1. Login como `receptionist@convision.com`
  2. Ir a "Reporte de gestión diario"
  3. Ingresar cualquier valor en los campos y hacer clic "Guardar Reporte"
  4. Recargar la página
- **Esperado:** El reporte guardado se recarga con los valores ingresados.
- **Observado:** El formulario muestra todos los valores en 0. El registro existe en BD pero con `branch_id = 0`. La API `GET /daily-activity-reports?date_from=...&date_to=...` devuelve `data: []` porque filtra por `X-Branch-ID: 1`.
- **Evidencia:**
  - `GET /daily-activity-reports?date_from=2026-05-02&date_to=2026-05-02` → `{"data":[], "total":0}`
  - `GET /daily-activity-reports/2` → reporte existe con datos correctos pero `branch_id` ausente/0
  - PUT request body no envía `branch_id`; `service.Update()` en `internal/dailyactivity/service.go:151-155` reconstruye el struct con `buildReport(input,...)` donde `input.BranchID = 0`
  - Líneas clave: [service.go:151-155](convision-api-golang/internal/dailyactivity/service.go#L151-L155) — no preserva `existing.BranchID`
- **Estado:** confirmado
- **Fix sugerido:** En `service.Update()`, agregar `updated.BranchID = existing.BranchID` tras las líneas de preservación existentes (Status, MoneyReceipts).

---

### QA-002 — CRÍTICO: Se crea reporte duplicado del día al recargar tras QA-001

- **Rol:** receptionist
- **URL:** `http://localhost:4300/receptionist/daily-report`
- **Severidad:** bloqueante
- **Pasos:**
  1. Reproducir QA-001 (guardar → recargar → formulario en blanco)
  2. Hacer clic en "Guardar Reporte" con el formulario en blanco
- **Esperado:** Error "ya existe un reporte para el día de hoy", o el formulario carga el reporte existente.
- **Observado:** El backend crea un **nuevo reporte duplicado** (ID:3) con `POST /daily-activity-reports → 201 Created`. La guarda `FindByUserAndDate` no detectó el reporte existente (ID:2) porque su `report_date` en BD pertenece al Bogotá-date anterior (ver hipótesis QA-005).
- **Evidencia:**
  - `POST /api/v1/daily-activity-reports → 201 Created {"id":3,...}`
  - BD tiene ahora 2 registros para el mismo usuario (ID:2 con `branch_id=0`, ID:3 con `branch_id=1`)
- **Estado:** confirmado
- **Fix sugerido:** Corregir QA-001 primero. Adicionalmente, agregar UNIQUE constraint en `(user_id, DATE(report_date AT TIME ZONE 'America/Bogota'))` para prevenir duplicados a nivel de BD.

---

### QA-003 — MAYOR: `created_at` se sobreescribe con zero time (`0001-01-01`) en cada PUT

- **Rol:** receptionist / todos
- **URL:** `http://localhost:4300/receptionist/daily-report`
- **Severidad:** mayor
- **Pasos:**
  1. Guardar un reporte (PUT `/daily-activity-reports/:id`)
  2. Consultar el reporte por ID
- **Esperado:** `created_at` conserva el valor original de creación.
- **Observado:** `created_at: "0001-01-01T00:00:00.000000Z"` en la respuesta del PUT y en GETs posteriores.
- **Evidencia:**
  - PUT response: `"created_at":"0001-01-01T00:00:00.000000Z"`
  - `GET /daily-activity-reports/2`: `"created_at":"0001-01-01T00:00:00.000000Z"`
  - Causa: `repo.Update()` usa `db.Save()` ([daily_activity_repository.go:43](convision-api-golang/internal/platform/storage/postgres/daily_activity_repository.go#L43)), el struct `updated` tiene `CreatedAt = time.Time{}` (zero). `db.Save()` sobreescribe todos los campos — viola la regla "Nunca `db.Save()`" de CLAUDE.md.
- **Estado:** confirmado
- **Fix sugerido:** Cambiar `repo.Update()` a `db.Model(report).Updates(map[string]any{...})` con los campos editables explícitos. O al mínimo: `updated.CreatedAt = existing.CreatedAt` antes del Save.

---

### QA-004 — MAYOR: Fecha en Historial Reportes muestra un día antes del valor real (timezone frontend)

- **Rol:** receptionist
- **URL:** `http://localhost:4300/receptionist/daily-report-history`
- **Severidad:** mayor
- **Pasos:**
  1. Abrir "Historial Reportes" como receptionist
  2. Ver la columna "Fecha" de cualquier reporte
- **Esperado:** La fecha mostrada coincide con `report_date` del reporte (ej. 02/05/2026).
- **Observado:** El reporte con `report_date: "2026-05-02"` se muestra como **"01/05/2026"** (un día antes).
- **Evidencia:**
  - API responde `report_date: "2026-05-02"` para ID:2
  - UI muestra `01/05/2026` en la tabla
  - Los botones del filtro de fecha SÍ muestran "02/05/2026" correctamente (formato desde el datepicker)
  - Causa probable: `new Date("2026-05-02")` en JS se interpreta como UTC midnight; al renderizar en hora local (Bogotá UTC-5) queda en `2026-05-01T19:00:00` → muestra May 1.
- **Estado:** confirmado
- **Fix sugerido:** Al parsear `report_date` en el frontend, usar `parseLocalDate("2026-05-02")` o `new Date(str + 'T00:00:00')` para evitar el ajuste UTC. Revisar el componente que formatea la fecha en la tabla del historial.

---

### QA-005 — GAP: `sidebar.advisor_report` feature flag no asignado al rol admin

- **Rol:** admin
- **URL:** `http://localhost:4300/admin/daily-reports` (accesible por URL directa)
- **Severidad:** menor
- **Pasos:**
  1. Login como `admin@convision.com`
  2. Revisar el sidebar — no aparece "Reporte de gestión diario"
  3. Navegar directamente a `/admin/daily-reports` — la página carga correctamente
- **Esperado:** El admin puede ver "Reporte de gestión diario" en el sidebar (para supervisión de asesores).
- **Observado:** El botón no aparece porque el JWT del admin no incluye `sidebar.advisor_report` en `feature_flags`. La página sí funciona por URL directa con filtro de sedes y asesores completo.
- **Evidencia:**
  - JWT admin `feature_flags`: `["sidebar.appointments","sidebar.sales","sidebar.purchases","sidebar.inventory","sidebar.laboratory","sidebar.reports","sidebar.payroll","sidebar.expenses","sidebar.clinical","sidebar.catalog","sidebar.quotes","sidebar.discounts"]` — sin `sidebar.advisor_report`
  - Página `/admin/daily-reports` operativa con filtros SEDES y ASESOR
- **Estado:** confirmado
- **Fix sugerido:** Agregar `sidebar.advisor_report` a los feature flags del rol admin en el seeder o en el endpoint de login. Verificar en `feature_flag.go` si el flag está definido para admin.

---

## OK (sin incidencias)

| Rol | Ruta | Notas |
|-----|------|--------|
| receptionist | `/login` → `/receptionist/dashboard` | Redirección correcta, sidebar completo, branch "Sede Norte" visible |
| receptionist | `/receptionist/daily-report` (GET inicial) | Carga reporte del día, `x-branch-id: 1` en headers, resumen correcto |
| receptionist | PUT `/daily-activity-reports/2` | Datos se guardan en BD (verificado con curl); el bug es post-save en branch_id |
| receptionist | `/receptionist/daily-report-history` filtros fecha | API devuelve registros correctos con `date_from`/`date_to`; filtro funcional |
| admin | `/admin/dashboard` | Login correcto, redirige a dashboard |
| admin | `/admin/daily-reports` (por URL) | Carga consolidado, filtros SEDES y ASESOR funcionales, branch_id=0 por defecto (all) |
| admin | Filtro SEDES → Sede Norte | Envía `branch_id=1` en query param, filtra correctamente |
| admin | `/admin/daily-reports/3` (detalle) | Vista de detalle del reporte de asesor carga correctamente |
| specialist | `/select-branch` | Flujo de selección de sede funciona |
| specialist | `/specialist/management-report` | Carga con `branch_id=1` en query param, estado vacío correcto |

---

## Handoff al agente de corrección

**Archivo de hallazgos:** `.planning/qa/FINDINGS-2026-05-02-informe-diario-gestion.md`

**IDs prioritarios:**

| ID | Severidad | Área | Descripción corta |
|----|-----------|------|-------------------|
| QA-001 | bloqueante | backend Go | `branch_id` → 0 en cada PUT; `service.Update()` no preserva `existing.BranchID` |
| QA-002 | bloqueante | backend Go | Duplicado creado al re-guardar tras QA-001; sin UNIQUE constraint |
| QA-003 | mayor | backend Go | `db.Save()` sobreescribe `created_at` con zero time |
| QA-004 | mayor | frontend React | Fecha off-by-one-day por `new Date("YYYY-MM-DD")` UTC parsing |
| QA-005 | menor | config/flags | `sidebar.advisor_report` falta en feature flags del admin |

**Regla recomendada:** `convision-qa-gap-fixer`

**Comando sugerido:**
```
Con @convision-qa-gap-fixer, cerrar QA-001, QA-002, QA-003, QA-004, QA-005
usando .planning/qa/FINDINGS-2026-05-02-informe-diario-gestion.md como fuente.
Empezar por QA-001 + QA-003 (mismo archivo, mismo método Update).
```

**Archivos a modificar para QA-001+QA-002+QA-003:**
- `convision-api-golang/internal/dailyactivity/service.go` — `Update()`: preservar `BranchID` y `CreatedAt`
- `convision-api-golang/internal/platform/storage/postgres/daily_activity_repository.go` — `Update()`: reemplazar `db.Save()` con `db.Model().Updates()`
- DB migration: agregar UNIQUE constraint `(user_id, DATE(report_date AT TIME ZONE 'America/Bogota'))`

**Archivos a modificar para QA-004:**
- Componente de tabla en `convision-front/src/pages/receptionist/` — función de formateo de fecha (buscar `report_date` o `new Date(` en páginas del historial)

**Archivos a modificar para QA-005:**
- `convision-api-golang/internal/domain/feature_flag.go` — agregar `sidebar.advisor_report` para rol admin
- O el seeder que asigna feature flags por rol

---

## Actualización sesión 2026-05-02T14:30Z — segunda pasada (admin + verificación fixes)

### Estado de los hallazgos originales tras re-inspección del código

| ID | Estado actualizado | Evidencia |
|----|-------------------|-----------|
| QA-001 (backend Update) | **CORREGIDO** en código | `service.go` líneas 155-156: `updated.BranchID = existing.BranchID` + `updated.CreatedAt = existing.CreatedAt` ya presentes |
| QA-002 (duplicado) | **ABIERTO** — data corruption | BD local sigue con id=2 e id=3 ambos con `branch_id=0`; UNIQUE constraint pendiente de verificar |
| QA-003 (created_at zero) | **CORREGIDO** en código | `daily_activity_repository.go` ya usa `db.Model(report).Updates(map[string]any{...})` — nunca `db.Save()` |
| QA-004 (fecha off-by-one) | **CORREGIDO** en código | `DailyReportHistory.tsx` línea 25: `format(new Date(item.report_date + 'T00:00:00'), 'dd/MM/yyyy')` |
| QA-005 (feature flag admin) | **ABIERTO** | `sidebar.advisor_report` ausente del JWT admin; página accesible por URL directa |

---

### QA-006 — BLOQUEANTE: `loadTodayReport` no pasa `branch_id: '0'` (frontend receptionist)

- **Rol:** receptionist
- **Archivo:** `convision-front/src/pages/receptionist/DailyReport.tsx:81`
- **Severidad:** bloqueante
- **Descripción:**
  `loadTodayReport()` llama a `dailyActivityReportService.list({ date_from: today, date_to: today })` sin incluir `branch_id: '0'`. La petición llega al backend con solo el header `X-Branch-ID: <branch>` del localStorage, que en este caso es `1`. El backend filtra `WHERE branch_id = 1`. Los reportes guardados con `branch_id=0` (sesiones previas sin `X-Branch-ID` configurado) nunca aparecen → el formulario carga en blanco en cada recarga.
- **Comparación:** `DailyReportHistory.tsx` línea 102 **sí** pasa `branch_id: '0'` correctamente:
  ```tsx
  const params: Record<string, unknown> = { page, per_page, branch_id: '0' };
  ```
- **Fix:** En `DailyReport.tsx`, cambiar:
  ```tsx
  // Antes (línea 81)
  const resp = await dailyActivityReportService.list({ date_from: today, date_to: today });
  // Después
  const resp = await dailyActivityReportService.list({ date_from: today, date_to: today, branch_id: '0' });
  ```
- **Justificación:** Un usuario solo tiene un reporte por día. La vista del receptionist debe buscar su propio reporte sin restricción de branch (el backend aplica `user_id` del JWT de todos modos para rol no-admin).
- **Estado:** confirmado — código fuente + comportamiento navegador verificados

---

### QA-007 — MAYOR: BD local tiene 2 reportes duplicados para mismo usuario+fecha (branch_id=0)

- **Rol:** admin / sistema
- **Severidad:** mayor (data integrity, no bloquea flujo principal para usuarios nuevos)
- **Descripción:**
  BD local contiene `id=2` e `id=3` con `user_id=3`, `report_date=2026-05-02`, `branch_id=0`. Ambos son visibles en la vista admin (`branch_id=0` → Todas las sedes). La UNIQUE constraint de la migración `000024_daily_activity_unique_user_date` existe en código pero la BD local puede no haberla recibido.
- **Impacto en admin:** Con filtro "Todas (4)" se ven 2 filas para el mismo asesor el mismo día. Con filtro "Sede Norte" (branch_id=1) se ven 0 filas — reportes branch_id=0 son invisibles por branch.
- **Fix:** Limpiar datos de prueba en BD local + verificar que la migración `000024` está aplicada.
- **Estado:** confirmado por consulta directa PostgreSQL

---

### Verificaciones admin (OK)

| Verificación | Resultado |
|---|---|
| Admin login + redirección a `/admin/daily-reports` | ✓ OK |
| Admin list con "Todas (4)" → `branch_id=0` en request | ✓ OK — confirmado en network requests |
| Admin filtro "Sede Norte" → `branch_id=1` en request, tabla vacía | ✓ OK — comportamiento correcto, vacío por QA-007 |
| Admin preset "7d" → `date_from=2026-04-26` en request | ✓ OK |
| Admin limpiar filtro sede via tag pill | ✓ OK |
| Admin ver 3 reportes en rango 7d con "Todas" | ✓ OK — incluye reporte "Ana · Recepción" del 29/04 |
| Admin detalle `/admin/daily-reports/3` | ✓ OK — muestra H=5, M=3, N=1, CE=2 (valores del DB) |
| Admin empty state "Sin resultados" al filtrar por sede sin datos | ✓ OK — muestra botón "Limpiar filtros" |

---

### Handoff actualizado al agente de corrección

**Prioridad real post-verificación:**

| ID | Severidad | Estado | Acción requerida |
|----|-----------|--------|------------------|
| QA-006 | **bloqueante** | ABIERTO | `DailyReport.tsx:81` — agregar `branch_id: '0'` al list() |
| QA-007 | mayor | ABIERTO | Limpiar datos BD local; verificar migración `000024` |
| QA-005 | menor | ABIERTO | Agregar `sidebar.advisor_report` al JWT del rol admin |
| QA-001 | — | CORREGIDO | `service.go:155` ya preserva `BranchID` |
| QA-003 | — | CORREGIDO | `repository.go` ya usa `Updates(map)` |
| QA-004 | — | CORREGIDO | `DailyReportHistory.tsx:25` ya usa `T00:00:00` |

**Fix mínimo para desbloquear receptionist:**
```
Archivo: convision-front/src/pages/receptionist/DailyReport.tsx
Línea 81:
  Antes: dailyActivityReportService.list({ date_from: today, date_to: today })
  Después: dailyActivityReportService.list({ date_from: today, date_to: today, branch_id: '0' })
```
