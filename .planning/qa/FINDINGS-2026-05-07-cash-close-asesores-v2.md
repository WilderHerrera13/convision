---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
api_url: http://localhost:8001
started: 2026-05-07T19:20:00-05:00
updated: 2026-05-07T19:35:00-05:00
roles_tested: [admin, receptionist, specialist, laboratory]
scope: "Re-verificación post-fix RBAC: cierre de caja de asesores — multi-tenant, multi-sede, filtros UI, cuentas, permisos globales"
tools: [playwright-mcp, curl-api, code-review, sql-direct]
related_findings:
  - FINDINGS-2026-05-07-cash-close-asesores.md  # 18:46 base previa
  - FINDINGS-2026-05-07-cash-close-rbac.md      # 08:56 decisiones RBAC
  - FINDINGS-2026-05-02-cashclose-branches.md
notes: |
  - Backend reconstruido (`make build && ./bin/convision-api`) antes de QA, evitando el binario stale que ocultó RBAC en pasadas anteriores (lección INFRA-01 del FINDINGS previo).
  - QA-CCA-001 **resuelto**: specialist ya NO retiene `cash_close:*` en el JWT.
  - QA-CCA-005 **resuelto**: el filtro de sede en tab "Por asesor" reduce la lista a asesores con actividad en la sede.
  - Hallazgos nuevos descubiertos en esta pasada: 1 bloqueante de despliegue (índice DB ausente), 1 mayor (cross-branch unique), 2 menores (UX/keys), 1 sugerencia.
---

# QA — Cierre de caja de asesores v2 (post-fix RBAC)

## Estado inicial verificado vía JWT

```
admin@convision.com         role=admin         perms=111  cash_close=[approve, create, view]   branches=[1,3,4,5,2]
receptionist@convision.com  role=receptionist  perms=48   cash_close=[create, view]            branches=[3,4]
specialist@convision.com    role=specialist  ✅ perms=28  cash_close=[]  ← QA-CCA-001 fixed     branches=[2,3,4]
hquintero@convision.com (laboratory)           Credenciales incorrectas (no existe en seed Go — gap conocido del seed)
```

## Resumen ejecutivo

- Endpoints API verificados: **18** (login×4, list, advisors-pending×2, consolidated, by-id propio/ajeno×3, create×3, submit, approve)
- Pantallas UI verificadas: **9** (login, select-branch, /admin/cash-closes consolidado/asesor con filtro sede, /receptionist/cash-closes Sede Centro, /receptionist/cash-close-history Sede Centro y Sede Norte, /unauthorized para specialist en admin/cash-closes y /receptionist/cash-closes y history)
- Verificación SQL directa: **2** (índice único parcial ausente, datos heredados duplicados)
- Hallazgos **bloqueantes**: **1** (QA-CCA-V2-001 — índice único `uq_cash_register_closes_user_date_active` no aplicado en local, AutoMigrate no replica migraciones SQL parciales — riesgo de despliegue a prod por datos heredados duplicados)
- Hallazgos **mayores**: **1** (QA-CCA-V2-002 — `GetByUserAndDate` no incluye `branch_id`, impide cross-branch closes mismo día para asesor con sedes múltiples)
- Hallazgos **menores**: **2** (QA-CCA-V2-003 keys React duplicadas, QA-CCA-V2-004 KPI "Pendientes de Revisión" cuenta 9 incluyendo asesores sin actividad)
- Hallazgos **sugerencia**: **1** (QA-CCA-V2-005 — specialists residuales aparecen como "asesores comerciales")
- Verificaciones **OK confirmadas**: **17**

---

## Hallazgos (FAIL / GAP)

### QA-CCA-V2-001 — BLOQUEANTE: Índice único parcial `uq_cash_register_closes_user_date_active` no existe en BD local; datos heredados violan la constraint

- **Rol**: admin (impacto sistema-wide)
- **Endpoint/Archivo**:
  - Migración: `convision-api-golang/db/migrations/platform/000002_cash_close_unique_partial.up.sql`
  - AutoMigrate: `convision-api-golang/internal/platform/storage/postgres/db.go`
- **Severidad**: **bloqueante** (riesgo de despliegue a producción)
- **Pasos**:
  1. `\d optica_main.cash_register_closes` en psql contra `convision` local
  2. Observar que solo existen 3 índices: PK + `idx_..._user_id` + `idx_..._branch_id`. **No existe** `uq_cash_register_closes_user_date_active`.
  3. Inspeccionar registros del usuario id=3 (Receptionist Demo) en branch_id=1:
     ```
     id |  status   | close_date (UTC)
      3 | submitted | 2026-04-19
      4 | approved  | 2026-04-19
      5 | approved  | 2026-04-19
      8 | submitted | 2026-04-19
     ```
     **4 cierres del mismo día en estado submitted+approved** → violan la constraint que la migración 000002 pretende crear.
- **Esperado**: el índice único parcial existe y no se permite que coexistan 2+ registros submitted/approved del mismo (`user_id`, `close_date::date`).
- **Observado**: el índice no existe. AutoMigrate de GORM (modo `local`) no replica `CREATE UNIQUE INDEX ... WHERE status IN ('submitted','approved')` con expresión funcional `((close_date AT TIME ZONE 'UTC')::date)`.
- **Impacto en producción**: si en staging/prod ya hay datos duplicados similares (por bugs previos antes del UPSERT-guard del servicio), `migrate up` **fallará** al intentar crear el índice — bloqueando despliegues. Si no hay duplicados aún, el índice sí se aplica pero nunca se valida en QA local.
- **Evidencia**:
  ```
  -- Esperado en pg_indexes (no aparece):
  uq_cash_register_closes_user_date_active
    (user_id, ((close_date AT TIME ZONE 'UTC')::date)) WHERE status IN ('submitted','approved')

  -- Datos que violan:
  optica_main.cash_register_closes
    user=3 branch=1 status IN (submitted,approved)
    fecha UTC 2026-04-19 → 4 filas (ids 3, 4, 5, 8)
  ```
- **Estado**: **confirmado**
- **Fix sugerido**:
  1. Antes del despliegue: script de remediación que conserve sólo el cierre "ganador" (approved > submitted, mayor `created_at`) y mueva los demás a status `archived` (nuevo) o los borre con audit log.
  2. Considerar agregar `branch_id` a la unique key (`(user_id, branch_id, close_date::date)`) — la app es multi-sede; ver QA-CCA-V2-002.
  3. En `db.go`, replicar el índice manualmente vía `db.Exec(...)` post-AutoMigrate **solo en `local`**, para que QA detecte duplicados antes de prod.

---

### QA-CCA-V2-002 — MAYOR: `GetByUserAndDate` no filtra por `branch_id` — un asesor con N sedes asignadas no puede cerrar caja del mismo día en sedes distintas

- **Rol**: receptionist
- **Archivo**: `convision-api-golang/internal/platform/storage/postgres/cash_register_close_repository.go:52-74` (`GetByUserAndDate`) y `internal/cashclose/service.go:177` (uso en `Create`)
- **Severidad**: **mayor** (gap funcional)
- **Pasos** (reproducible vía API):
  1. Login `receptionist@convision.com` (sedes asignadas: Sede Centro id=3, Sede Norte id=4).
  2. `POST /cash-register-closes` con `branch_id=3`, `close_date=2026-05-05` → 201 (id 17, draft).
  3. `POST /cash-register-closes/17/submit` con `X-Branch-ID: 3` → 200 (status submitted).
  4. `POST /cash-register-closes` con `branch_id=4`, `close_date=2026-05-05` (otra sede, mismo usuario, mismo día) → **HTTP 409** "Ya existe un cierre para esta fecha en estado submitted. No se puede crear otro."
- **Esperado**: el guard debería permitir un cierre por `(user_id, branch_id, close_date)`. Un asesor que trabajó turnos en 2 sedes el mismo día tiene que poder cerrar cada una por separado.
- **Observado**: la query es `WHERE user_id = ? AND DATE(close_date) = ?` (sin `branch_id`), bloqueando creación cross-branch.
- **Evidencia**:
  ```sql
  -- repository.go:55-66
  Where("user_id = ? AND DATE(close_date) = ?", userID, date)
  -- No incluye branch_id
  ```
  Test ejecutado:
  ```
  POST cash-register-closes branch_id=3 close_date=2026-05-05 → 201 id=17
  POST /17/submit X-Branch-ID:3 → 200 status=submitted
  POST cash-register-closes branch_id=4 close_date=2026-05-05 → 409 "Ya existe ... submitted"
  ```
- **Estado**: **confirmado**
- **Fix sugerido**:
  1. Cambiar la firma a `GetByUserBranchAndDate(db, userID, branchID, date)` y propagar al `Create`.
  2. La unique key DB también debería ser `(user_id, branch_id, ((close_date AT TIME ZONE 'UTC')::date))` (relacionado con QA-CCA-V2-001).
  3. Decisión de producto necesaria: ¿un asesor puede tener cierres simultáneos en sedes distintas? Si la respuesta es "sólo trabaja una sede al día", entonces este hallazgo se degrada a sugerencia y debería quedar documentado en la migración 000002.

---

### QA-CCA-V2-003 — Warning React "Encountered two children with the same key" en `AdvisorCashCloseCard`

- **Rol**: admin
- **URL**: `http://localhost:4300/admin/cash-closes` (tab **Por asesor**, sin filtro de sede)
- **Archivo**: `convision-front/src/components/admin/AdvisorCashCloseCard.tsx:97` (zona de mapping de `close_dates` a chips)
- **Severidad**: menor (DX/estabilidad UI)
- **Pasos**:
  1. Login admin → `/admin/cash-closes` → tab **Por asesor**.
  2. Abrir DevTools → consola.
  3. Card de Receptionist Demo muestra 4 chips "19 abr". Console arroja:
     ```
     Warning: Encountered two children with the same key, `2026-04-19`. Keys should be unique...
     at AdvisorCashCloseCard
     ```
- **Esperado**: usar `id` del cierre como key (único) o ``${close_date}-${id}``.
- **Observado**: la API devuelve 4 cierres del mismo día (consecuencia de QA-CCA-V2-001), y el componente usa `close_date` como key, generando el warning.
- **Evidencia**: `console-2026-05-08T00-19-41.log` líneas 2-115.
- **Estado**: **confirmado**
- **Fix sugerido**: en `AdvisorCashCloseCard.tsx`, cambiar la key a `closes[i].id` (dato disponible en `closes` del payload).

---

### QA-CCA-V2-004 — KPI "Pendientes de Revisión" cuenta asesores sin pendientes reales (incluye 3 cards "Sin pendientes")

- **Rol**: admin
- **URL**: `/admin/cash-closes` → tab **Por asesor** (sin filtros)
- **Archivo**: `convision-front/src/pages/admin/CashCloses.tsx` (tarjetas KPI)
- **Severidad**: menor (UX, métrica engañosa)
- **Pasos**:
  1. Tab **Por asesor**, filtros "Todos".
  2. KPI "Asesores en vista" = 9.
  3. KPI "Pendientes de Revisión" = 9 — pero solo 6 cards traen un cierre real (4 con "1 día pendiente", 1 con "4 días pendientes" Receptionist Demo, 1 con "1 día pendiente" Specialist Demo).
  4. Las otras 3 cards muestran "Sin cierres pendientes de revisión" (Andres Bermudez, Sandra Torres, Second Specialist).
- **Esperado**: KPI cuenta solo asesores con `pending_count > 0` o suma de `pending_count`. "9 = 9" hace creer que todos los listados requieren acción.
- **Observado**: la métrica iguala "asesores en vista", lo que sugiere que cuenta **cards** y no **pendientes reales**.
- **Estado**: **confirmado**

---

### QA-CCA-V2-005 — Specialists residuales se listan como "Asesor Comercial" en tab Por asesor

- **Rol**: admin
- **URL**: `/admin/cash-closes` (tab Por asesor)
- **Archivo**: `convision-front/src/pages/admin/CashCloses.tsx` (lógica de "asesores comerciales")
- **Severidad**: sugerencia
- **Pasos**:
  1. Tab Por asesor sin filtros muestra 9 cards. Tres de ellas son **specialists** (`Andres Bermudez`, `Sandra Torres`, `Second Specialist`) — todos sin pendientes.
  2. Specialist Demo aparece con "1 día pendiente" (cierre Borrador residual del 2026-05-07).
- **Esperado**: tras la decisión "Opción B" del FINDINGS-cash-close-rbac (specialist no participa en cash close), el front no debería listar specialists ni siquiera con "Sin pendientes". La fuente de la lista parece ser todos los users con `cash_close:create|view` o el listado interno de `Asesores comerciales`. Specialists ya no tienen el permiso pero quedaron en la pantalla (probablemente por su cierre histórico o por hardcode).
- **Observado**: 3 specialists sin actividad + 1 con cierre borrador residual aparecen mezclados con receptionists.
- **Evidencia**: snapshot tab "Por asesor", cards Andres Bermudez / Sandra Torres / Second Specialist con texto "Sin cierres pendientes de revisión".
- **Estado**: **confirmado**
- **Fix sugerido**: filtrar la lista a usuarios con `cash_close:create` activo en el momento (rol receptionist) y/o usuarios con cierres existentes. Si Specialist Demo tiene un cierre borrador huérfano, ofrecer botón "Anular borrador" al admin.

---

## OK / Sin incidencias confirmadas

### RBAC nuevos permisos globales — POST refactor

| Verificación | Resultado |
|---|---|
| Specialist JWT no contiene `cash_close:*` (QA-CCA-001 fixed) | ✅ 0 perms cash_close, total 28 |
| Receptionist JWT contiene `cash_close:create`, `cash_close:view` (no approve) | ✅ |
| Admin JWT contiene `cash_close:approve`, `cash_close:create`, `cash_close:view` | ✅ |
| Specialist `GET /cash-register-closes` | ✅ 403 forbidden |
| Specialist `GET /cash-register-closes-advisors-pending` | ✅ 403 forbidden |
| Specialist `GET /cash-register-closes-consolidated` | ✅ 403 forbidden |
| Specialist `POST /cash-register-closes` | ✅ 403 forbidden |
| Specialist navega a `/admin/cash-closes` | ✅ redirige a `/unauthorized` |
| Specialist navega a `/receptionist/cash-closes` | ✅ redirige a `/unauthorized` |
| Specialist navega a `/receptionist/cash-close-history` | ✅ redirige a `/unauthorized` |
| Receptionist `POST /cash-register-closes/:id/approve` | ✅ 403 forbidden (sin `cash_close:approve`) |
| Receptionist `GET /cash-register-closes/13` (suyo, Sede Centro asignada) | ✅ 200 |
| Receptionist `GET /cash-register-closes/11` (ajeno, Sede Sur no asignada) | ✅ 403 "Sin acceso a esta sede" |

### Multi-sede — runtime y código

| Verificación | Resultado |
|---|---|
| Receptionist asignado a Sede Centro/Norte ve solo esas en `/select-branch` | ✅ |
| `/receptionist/cash-close-history` en Sede Centro: 1 cierre del 07/05 $150k Aprobado | ✅ |
| `/receptionist/cash-close-history` en Sede Norte: vacía (no leak) | ✅ |
| Filtro Sede Centro en tab Por asesor reduce a 1 asesor real (QA-CCA-005 v1 fixed) | ✅ |
| Admin `branch_id=0` agrega cierres de todas las sedes | ✅ |
| `X-Branch-ID` requerido (sin header → 400 "Sede requerida") | ✅ (verificado en pasada anterior) |

### Multi-tenant — revisión de código

- `internal/transport/http/v1/middleware/tenant_subdomain.go`: en `local` fuerza `optica_main`. En staging/prod resuelve por subdominio (`opticacache`).
- `internal/transport/http/v1/middleware/tenant_schema.go:32-35`: rechaza si `claims.SchemaName != name` con 403 "token no pertenece a esta óptica".
- Cada request abre `tx` con `SET LOCAL search_path = optica_X`.
- JWT incluye `optica_id` y `schema_name`.
- **No probado runtime** (un solo tenant local). Para QA real se requiere staging con 2+ tenants.

### Lógica de aplicación — guards de duplicados

| Verificación | Resultado |
|---|---|
| Receptionist crea draft 2026-05-05 nuevo → 201 | ✅ |
| Receptionist re-crea draft mismo día → UPSERT (mismo id, notas actualizadas) | ✅ |
| Receptionist intenta crear cierre con día ya `approved` → 409 ErrConflict | ✅ |
| Receptionist intenta crear cierre con día ya `submitted` → 409 ErrConflict | ✅ |

### Cuentas y varianza (heredado del FINDINGS v1, validado de nuevo en consolidado)

| Métrica | Valor | Nota |
|---|---|---|
| 14d, todas las sedes: cierres | 6 | ✅ |
| Total declarado | $5.870.000 | ✅ |
| Efectivo contado | $5.870.000 | ✅ |
| Diferencia neta | $0 | ✅ (ningún cierre conciliado con variancia en 14d) |
| Aprobados / Pendientes / Borrador | 1 / 4 / 1 | ✅ |
| Sede Centro filtrada: 2 cierres = $1.030.000 | ✅ | |

---

## Handoff al agente de corrección

Para `convision-qa-fixer` o `convision-qa-gap-fixer`. Una línea por ID, archivo fuente arriba.

```
QA-CCA-V2-001  bloqueante Migration 000002 — agregar fallback en db.go (sólo local) para que AutoMigrate cree el índice único parcial; documentar plan de remediación de duplicados antes de migrate up en prod
QA-CCA-V2-002  mayor      cash_register_close_repository.go GetByUserAndDate — incluir branch_id; service.go:177 propagar; reformular unique key con branch_id
QA-CCA-V2-003  menor      AdvisorCashCloseCard.tsx:97 — usar id del cierre como React key (no close_date)
QA-CCA-V2-004  menor      CashCloses.tsx — KPI "Pendientes de Revisión" debe sumar pending_count, no contar cards
QA-CCA-V2-005  sugerencia CashCloses.tsx tab Por asesor — filtrar lista a usuarios con cash_close:create o con cierres existentes; ofrecer "anular borrador huérfano"
```

Comando sugerido:

> Con `@convision-qa-gap-fixer`, abordar QA-CCA-V2-001 primero (es prerequisito para que prod no se rompa). Usar `.planning/qa/FINDINGS-2026-05-07-cash-close-asesores-v2.md` como fuente. Luego QA-CCA-V2-002 (decisión de producto: ¿un asesor puede cerrar caja en 2 sedes el mismo día?), después los menores.

---

## Notas para el equipo

- **Confirmado fix de pasada anterior**: QA-CCA-001 (specialist con `cash_close:*`) y QA-CCA-005 (filtro de sede en tab Por asesor) — ambos resueltos.
- **Pendientes heredados** del FINDINGS v1 que **no se reverificaron** en esta pasada (no eran foco del usuario): QA-CCA-002 (label "Total hoy"), QA-CCA-003 (rango calendario), QA-CCA-004 (variance_pct denominador), QA-CCA-006 (alias ruta history). Convendría agruparlos con los nuevos en el siguiente ciclo de fixes.
- **Lección INFRA**: el binario debe **reconstruirse** (`make build`) cada vez que se cambia código Go, no solo reiniciarse. El skill `gsd-qa-explore` debería ejecutar `make build` antes de levantar el binario.
