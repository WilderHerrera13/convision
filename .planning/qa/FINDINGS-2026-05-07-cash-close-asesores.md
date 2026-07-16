---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
api_url: http://localhost:8001
started: 2026-05-07T18:30:00-05:00
updated: 2026-05-07T18:50:00-05:00
roles_tested: [admin, receptionist, specialist]
scope: "Cierre de caja (asesores) — multi-tenant, multi-sede, filtros UI, cálculo de cuentas, RBAC nuevos permisos globales"
tools: [playwright-mcp, curl-api, code-review]
related_findings: [FINDINGS-2026-05-07-cash-close-rbac.md, FINDINGS-2026-05-02-cashclose-branches.md]
---

# QA — Cierre de caja de asesores (post-refactor permisos globales)

## Contexto

Re-validación tras los commits recientes:
- `0654a04` Refactorizacion para agregar permisos globales en la app
- `7dc18d6` Ajustar cuentas de cierre de caja
- `f41a552` Agregar correccion en cierre de caja
- `4cfd90c` Merge branch main_bk into main (cash close fixes)

Foco: **flujo de cierre de caja de asesores**, multi-tenant (schema), multi-sede (`X-Branch-ID`), filtros en UI, **cuentas/varianzas** y la **nueva matriz de permisos** (`cash_close:view`, `cash_close:create`, `cash_close:approve`).

## Resumen ejecutivo

- Endpoints API verificados: **15** (login, advisors-pending, consolidated, list, detail, multi-sede 403, sin auth 401, sin sede 400)
- Pantallas UI verificadas: **8** (login, select-branch, admin/cash-closes 3 tabs, advisor detail, receptionist cash-closes, history, /unauthorized)
- Hallazgos **bloqueantes**: **0**
- Hallazgos **mayores**: **1** (regresión: specialist retiene perms cash_close)
- Hallazgos **menores / sugerencia**: **5**
- Verificaciones **OK confirmadas**: **15** (RBAC API por permisos, multi-sede 403, owner check, cálculo varianza, KPIs cuadran, UI bloquea cierre aprobado, etc.)

> **Nota infraestructura.** El binario `convision-api-golang/bin/convision-api` estaba desactualizado (sin claim `permissions` en el JWT) — hubo que correr `make build` antes de poder validar la nueva RBAC. Si el flujo de QA solo "reinicia" el binario sin recompilar, **se obtienen falsos positivos**. Recomiendo ajustar el skill `gsd-qa-explore` o el comando de reinicio para hacer `make build && ./bin/convision-api`.

---

## Hallazgos (FAIL / GAP)

### QA-CCA-001 — REGRESIÓN: Specialist conserva permisos `cash_close:view` y `cash_close:create`
- **Rol**: specialist
- **Endpoint/Archivo**: `convision-api-golang/db/migrations/platform/000037_remove_specialist_cash_close_perms.up.sql` y/o `000035_seed_rbac_data.up.sql`
- **Severidad**: **mayor** (gap de producto, no de seguridad)
- **Pasos**:
  1. `POST /api/v1/auth/login` con `specialist@convision.com / password`
  2. Decodificar el JWT (`access_token.split('.')[1] | base64d`) y buscar `permissions`
  3. Observar que contiene `cash_close:view` **y** `cash_close:create`
- **Esperado**: Tras la decisión "Opción B" registrada en `FINDINGS-2026-05-07-cash-close-rbac.md` QA-002 (marcado **resuelto**), specialist no debería tener ninguno de los permisos `cash_close:*`.
- **Observado**: JWT del specialist contiene `cash_close:create` y `cash_close:view` (junto con 55 permisos más). El endpoint `/cash-register-closes-advisors-pending` retorna **HTTP 200** para specialist.
- **Evidencia**:
  ```
  specialist@convision.com:
    cash_close perms = ['cash_close:create', 'cash_close:view']
    total perms = 57
  GET /cash-register-closes-advisors-pending  X-Branch-ID:3 → HTTP 200 items=1
  ```
- **Estado**: **confirmado**
- **Hipótesis**: la migración `000037` se aplicó, pero el seed `000035` se re-aplicó después (idempotente con `ON CONFLICT DO NOTHING`) o el seed mantiene el permiso. Conviene revisar el orden y si `000037` está dentro del rango ejecutado por el `migrate up`.

---

### QA-CCA-002 — Etiqueta "Total hoy" del card de asesor muestra el último cierre, aunque no sea de hoy
- **Rol**: admin
- **URL**: `http://localhost:4300/admin/cash-closes` (tab **Por asesor**)
- **Archivo**:
  - Backend: `convision-api-golang/internal/cashclose/service.go:515` `TotalToday: latest.TotalCounted`
  - Frontend: `convision-front/src/components/admin/AdvisorCashCloseCard.tsx:114` label "Total hoy"
- **Severidad**: menor (UX/copy)
- **Pasos**:
  1. Login admin → `/admin/cash-closes` → tab **Por asesor**
  2. Filtrar Sede Centro
  3. Card de **Recepcionista4 QA** muestra "Total hoy $ 880.000"
  4. Pero su único cierre pendiente es del **2026-04-28** (no hoy 2026-05-07)
- **Esperado**: Etiqueta debería decir "Último cierre" / "Total último cierre" o filtrar `latest.CloseDate == hoy`.
- **Observado**: Backend asigna `TotalToday = userCloses[0].TotalCounted` sin verificar si la fecha del último cierre es hoy.
- **Evidencia**: `service.go:515`; UI muestra "$ 880.000" para cierre del 28-abr.
- **Estado**: **confirmado**
- **Fix sugerido**: en `service.go`, calcular `TotalToday` solo si `latest.CloseDate.UTC().Format("2006-01-02") == hoy`, o renombrar JSON tag a `total_latest` y la label a "Último cierre".

---

### QA-CCA-003 — Calendario de asesor abre con rango 14d que excluye el cierre pendiente
- **Rol**: admin
- **URL**: `http://localhost:4300/admin/cash-closes/advisor/8?branch_id=3`
- **Archivo**: `convision-front/src/pages/admin/CashCloseCalendar.tsx`
- **Severidad**: menor (UX)
- **Pasos**:
  1. Tab **Por asesor** → click en card de Recepcionista4 QA → **Revisar cierre**
  2. Calendario abre con **30/04/2026 — 13/05/2026** (14 días, "ayer +13d")
  3. El cierre real está en **28/04/2026** (fuera del rango por defecto)
  4. Pantalla muestra "Sin cierre" en todas las fechas
- **Esperado**: el rango por defecto debería **incluir el cierre pendiente que motivó la navegación** (ej. 14 días hacia atrás desde hoy, igual que el Consolidado).
- **Observado**: Consolidado por defecto usa `dateTo=hoy` y `dateFrom=hoy-13d` (24/04 — 07/05), Calendario asesor abre `from=ayer, to=ayer+13d` — desfase que oculta cierres pendientes recientes.
- **Estado**: **confirmado**
- **Fix sugerido**: alinear el rango por defecto del calendario al mismo del Consolidado (`hoy-13d` … `hoy`) o anclar a la fecha del cierre pendiente más reciente del asesor.

---

### QA-CCA-004 — `variance_pct` calculado sobre reconciliados, pero la UI no aclara denominador
- **Rol**: admin
- **URL**: `http://localhost:4300/admin/cash-closes` (tab Consolidado, KPIs si se exponen)
- **Archivo**: `convision-api-golang/internal/cashclose/service.go` (zona del cómputo de KPIs)
- **Severidad**: sugerencia / UX
- **Pasos**:
  1. `GET /cash-register-closes-consolidated?branch_id=0&date_from=2025-01-01&date_to=2026-12-31`
  2. KPI `variance_pct = 22.54%` con `net_variance = 160000` y `total_declared = 8269000`
  3. `160000 / 8269000 = 1.93%` ≠ `22.54%`
  4. La cifra coincide cuando se divide por `reconDeclared` (250000 + 460000 = 710000): `160000 / 710000 = 22.54%` ✅
- **Esperado**: que la UI/JSON aclare que `variance_pct` es **% sobre lo conciliado**, no sobre el total declarado del periodo. O exponer ambos.
- **Observado**: comentario en `service.go` etiqueta `reconDeclared` como "QA-CC-002: track declared for reconciled closes only" — el cálculo es intencional, pero la consumición por la UI puede confundir.
- **Estado**: **confirmado** (cálculo correcto, presentación ambigua)

---

### QA-CCA-005 — Tab "Por asesor" muestra asesores sin cierres en la sede filtrada
- **Rol**: admin
- **URL**: `http://localhost:4300/admin/cash-closes` (tab Por asesor con filtro de sede)
- **Archivo**: probablemente `convision-front/src/pages/admin/CashCloses.tsx:160` (función que combina `advisorsPending` con lista de "asesores comerciales")
- **Severidad**: menor (UX)
- **Pasos**:
  1. Tab **Por asesor**, filtro **Sede Centro**
  2. Resultado lista 3 asesores: Recepcionista4 QA (1 pendiente), Receptionist Demo (sin pendientes), **Specialist Demo** (sin pendientes)
  3. Specialist Demo no tiene actividad en Sede Centro (su único cierre es en Sede Sur)
- **Esperado**: cuando hay un filtro de sede activo, el listado debería ceñirse a asesores con actividad o asignación en esa sede.
- **Observado**: la columna agrega usuarios con permiso de cierre globalmente, sin reflejar el filtro de sede. KPI dice correctamente "1 pendiente de revisión", pero la lista de cards engaña.
- **Estado**: **confirmado**

---

### QA-CCA-006 — Ruta `/receptionist/cash-closes-history` (con guion) responde 404; la ruta real es `cash-close-history` (singular)
- **Rol**: receptionist
- **URL**: `http://localhost:4300/receptionist/cash-closes-history` (con `s`)
- **Archivo**: `convision-front/src/App.tsx:902-906` (define `cash-closes` plural y `cash-close-history` singular)
- **Severidad**: sugerencia (descubribilidad)
- **Pasos**:
  1. Login receptionist → `/receptionist/cash-closes-history` → 404 "Página no encontrada"
  2. La ruta correcta es `/receptionist/cash-close-history` (sin `s` en `close`)
- **Esperado**: consistencia: `cash-closes` (lista de creación) y `cash-closes-history` o `cash-close-history` ambos resuelven o redirigen.
- **Observado**: solo la singular existe.
- **Estado**: **confirmado** (sigue siendo accesible vía sidebar; impacto solo si alguien tipea/escribe la URL en docs).

---

## OK / Sin incidencias confirmadas

### RBAC nuevos permisos globales — POST refactor `0654a04`

| Verificación | Admin | Receptionist | Specialist | Notas |
|---|---|---|---|---|
| JWT contiene claim `permissions` con totales correctos | ✅ 111 perms | ✅ 48 perms | ✅ 57 perms | Antes del rebuild: claim ausente (binario stale) |
| `GET /cash-register-closes` (lista) sede asignada | ✅ 200 (2 cierres) | ✅ 200 (1 cierre — solo suyos) | ✅ 200 (0 cierres) | Owner-check del servicio |
| `GET /cash-register-closes-advisors-pending` sede 3 | ✅ 200 items=1 | ✅ 200 items=1 | ✅ 200 items=1 | Los 3 con `cash_close:view` |
| `GET /cash-register-closes-consolidated` sede 3 | ✅ 200 | ✅ 200 | ✅ 200 | KPIs idénticos |
| `GET /cash-register-closes/:id` ajeno (cross-user) | ✅ 200 | (no probado) | (no probado) | Servicio aplica owner-check |
| Sin `Authorization` header | ✅ 401 | — | — | "unauthenticated" |
| Sin `X-Branch-ID` header | ✅ 400 "Sede requerida" | ✅ 400 | ✅ 400 | Middleware `BranchContext` |

### Multi-sede (`X-Branch-ID`)

| Verificación | Resultado |
|---|---|
| Receptionist (id 3, sedes 3 y 4) sede 3 | ✅ 200 |
| Receptionist sede 2 (no asignada) | ✅ 403 "Sin acceso a esta sede" |
| Receptionist sede 1 (no asignada) | ✅ 403 |
| Recep1_qa (id 5, sede 4) sede 4 | ✅ 200 |
| Recep1_qa sede 3 (no asignada) | ✅ 403 |
| Recep1_qa sede 2 (no asignada) | ✅ 403 |
| Admin (sin asignaciones) sede 1 | ✅ 200 (admin bypassa `UserHasAccess`) |
| `branch_id=0` (override "todas") en query | ✅ 200 — agrega cierres de todas las sedes (admin) |

### Multi-tenant — revisión de código (no se prueba runtime con un solo tenant local)

- `internal/transport/http/v1/middleware/tenant_subdomain.go`: en local fuerza `optica_main`. En staging/prod resuelve por subdominio (cache `opticacache`).
- `internal/transport/http/v1/middleware/tenant_schema.go:32-35`: rechaza si `claims.SchemaName != name` con **403 "token no pertenece a esta óptica"** ✅
- Cada request abre un `tx` con `SET LOCAL search_path = optica_X` ✅ (aislamiento por schema PG)
- JWT incluye `optica_id` y `schema_name` (`auth/jwt.go:47-55`)
- **Conclusión**: enforcement adecuado por código. Para validar runtime se requiere un segundo tenant en staging/prod.

### UI Admin — flujo de cierres de caja

| Pantalla | Resultado |
|---|---|
| Sidebar admin → "Cierres de Caja" → `/admin/cash-closes` | ✅ Carga; tabs Consolidado / Todos los cierres / Por asesor |
| Tab Consolidado, filtro Todas (5) sedes, 14d | ✅ 6 cierres, $5.870.000 declarado = contado, diferencia neta $0 |
| Tab Consolidado, filtro Sede Centro | ✅ 2 cierres, $1.030.000 ($150k aprobado + $880k pendiente) |
| Tab Por asesor, filtro Sede Centro | ✅ 1 asesor con pendiente real (Recep4 QA $880k) |
| Detalle asesor → Calendario | ✅ Carga (rango ver QA-CCA-003); muestra denominaciones y medios de pago |
| KPIs Aprobados / Pendientes / Con diferencia cuadran | ✅ 1 aprobado ($150k) + 4 pendientes ($5.720k) + 1 borrador ($0) = 6 cierres |
| Detalle conciliación: 0 con diferencia (corresponde a sin admin actuals en periodo 14d) | ✅ |

### UI Receptionist — multi-sede + RBAC frontend

| Pantalla | Resultado |
|---|---|
| Login receptionist con 2 sedes asignadas | ✅ Página `/select-branch` con Sede Centro y Sede Norte (no muestra Principal/Sur/Occidente) |
| `/receptionist/cash-closes` con cierre aprobado del día | ✅ Banner "Cierre aprobado — solo lectura" |
| `/receptionist/cash-close-history` en Sede Centro | ✅ Muestra solo su cierre del 07/05 ($150k Aprobado) |
| `/receptionist/cash-close-history` en Sede Norte | ✅ "No se encontraron elementos" (no leak entre sedes del mismo usuario) |
| `/admin/cash-closes` desde receptionist | ✅ Redirige a `/unauthorized` (front guard) |

### Cálculo de cuentas y varianza — verificación numérica

Tomando el periodo completo (`date_from=2025-01-01&date_to=2026-12-31`, todas las sedes):

| Métrica | Valor API | Verificación manual |
|---|---|---|
| `total_closes` | 13 | ✅ |
| `total_declared` | $8.269.000 | ✅ suma todos los `total_counted` |
| `total_counted` (efectivo contado del periodo) | $8.429.000 | ✅ = $8.269.000 + variancia $160.000 |
| `net_variance` | +$160.000 | ✅ = +$170k (cierre #5: declared 250k, actual 420k) − $10k (cierre #4: declared 460k, actual 450k) |
| `variance_pct` | 22.54% | ✅ sobre reconciliados ($160k / $710k); ver QA-CCA-004 |
| `advisors_count` | 6 | ✅ |
| Aprobados / Pendientes / Borrador (UI 14d) | 1 / 4 / 1 | ✅ totales coherentes |

**Lógica de "QA-CC-001" verificada**: cuando un cierre no tiene `admin_actuals_recorded_at`, el agregado usa `declared` como proxy del contado, así el total contado del periodo nunca queda subestimado mientras quedan cierres por conciliar.

---

## Handoff al agente de corrección

Para `convision-qa-fixer` o `convision-qa-gap-fixer`. Una linea por ID; archivo fuente arriba.

```
QA-CCA-001  mayor      Specialist conserva cash_close:view/create — re-aplicar 000037 o limpiar seed 000035 para rol specialist
QA-CCA-002  menor      service.go:515 — TotalToday solo si latest.CloseDate==hoy, o renombrar a total_latest + label "Último cierre"
QA-CCA-003  menor      CashCloseCalendar.tsx — alinear default range con Consolidated (hoy-13d…hoy) o anclar a último cierre pendiente
QA-CCA-004  sugerencia Renombrar variance_pct → variance_pct_reconciled o exponer ambos numeradores; aclarar copy en KPI
QA-CCA-005  menor      CashCloses.tsx Tab "Por asesor": filtrar lista de asesores por sede activa cuando branch_id != 0
QA-CCA-006  sugerencia Alias /receptionist/cash-closes-history → /receptionist/cash-close-history (Navigate replace)
INFRA-01    sugerencia gsd-qa-explore: prepend `make build` antes de relanzar el binario; binario stale ocultó la nueva RBAC
```

Comando sugerido:

> Con `@convision-qa-gap-fixer`, cerrar QA-CCA-001 a QA-CCA-006 usando `.planning/qa/FINDINGS-2026-05-07-cash-close-asesores.md` como fuente. Empezar por QA-CCA-001 (regresión de seed RBAC), validar que `specialist@convision.com` deja de tener `cash_close:*` en el JWT.
