---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:8001
started: 2026-05-07T15:00:00-05:00
updated: 2026-05-07T16:30:00-05:00
roles_tested: [admin, specialist, receptionist]
scope: "Phase 19 RBAC × Módulo gestión diaria de asesor — sesión continuada. Cubre toda la batería API + flujo admin en frontend. QA-001 del archivo anterior confirmado CORREGIDO."
---

# QA FINDINGS v2 — Phase 19 RBAC × Módulo Gestión Diaria de Asesor

## Resumen ejecutivo

- Endpoints/rutas verificados: 24
- Hallazgos confirmados esta sesión: 2 nuevos (1 mayor, 1 menor)
- QA-001 del archivo anterior: **CERRADO — corregido en binario activo**
- Sin incidencias: 22 rutas

---

## Hallazgos (FAIL / GAP)

### QA-NEW-001
- Rol: specialist / receptionist
- Endpoint: `GET /api/v1/daily-activity-reports/:id/edit-logs`
- Severidad: **mayor**
- Pasos:
  1. Obtener un token de `specialist@convision.com` (branches 2, 3, 4).
  2. Intentar leer los edit-logs del reporte `id=1`, que pertenece a la sede 2 (branch_id=2) y al usuario admin.
  3. Enviar: `GET /api/v1/daily-activity-reports/1/edit-logs` con `X-Branch-ID: 3` (sede de receptionist).
- Esperado: `403 Forbidden` — un asesor sin ownership sobre ese reporte no debería ver su historial de edición.
- Observado: `200 OK` con el listado completo de 12 entradas del audit log. Receptionist de sede 3 puede leer logs de un reporte en sede 2 que no le pertenece.
- Evidencia: HTTP 200 confirmado con token de `receptionist@convision.com` (X-Branch-ID: 3) para reporte id=1 (sede 2). Devuelve array con 12 entradas de audit log incluyendo "reabierto por Specialist" (rastros del bug anterior QA-001).
- Raíz: `GetDailyActivityReportEditLogs` en [handler_t10.go:757](convision-api-golang/internal/transport/http/v1/handler_t10.go#L757) solo verifica `daily_reports:view` (vía la ruta) pero **no tiene ownership check ni branch check**. Por contraste, `GetDailyActivityReport` (line 600) aplica la guardia: `if claims.Role != "admin" && report.UserID != uint(claims.UserID) { 403 }`.
- Fix requerido: Agregar en `GetDailyActivityReportEditLogs`, después de cargar el reporte, la misma guardia que usa `GetDailyActivityReport`:
  ```go
  if claims.Role != "admin" && report.UserID != uint(claims.UserID) {
      c.JSON(http.StatusForbidden, gin.H{"message": "no tienes permiso para ver este reporte"})
      return
  }
  ```
- Estado: **confirmado**

---

### QA-NEW-002
- Rol: specialist
- URL: `convision-front/src/pages/SelectBranchPage.tsx:69-80`
- Severidad: **menor** (UX blocker en desarrollo; puede no reproducirse en staging si el contexto de AuthContext es diferente)
- Pasos:
  1. Iniciar sesión como `specialist@convision.com`.
  2. En `/select-branch`, hacer click en la tarjeta "Sede Sur" (branch_id=2).
  3. Hacer click en el botón "Continuar a Sede Sur".
- Esperado: Navegación a `/specialist/dashboard`.
- Observado: El usuario permanece en `/select-branch`. `setBranch()` se ejecuta (localStorage se actualiza con `branch_id` y `branch_name`), pero `navigate()` no lleva a la siguiente ruta.
- Evidencia: Evaluación en browser confirma que `localStorage.getItem('auth_user')` tiene `role: "specialist"` correctamente. La función `handleContinue` en `SelectBranchPage.tsx:69` usa `user?.role` (no `user?.role_type`) para decidir la ruta de navegación. En la misma sesión de Playwright el `user` objeto del `AuthContext` podría tener `role_type` pero no `role`, dejando todos los condicionales `false` y ejecutando `navigate('/profile')` sin error visible.
- Raíz probable: `SelectBranchPage.tsx` línea 73 hace `if (user?.role === 'specialist')` pero si `AuthContext` expone `role_type` y no `role` en el objeto `user`, ningún `if` hace match y navega a `/profile`. Verificar qué campo expone `AuthContext` y alinear.
- Fix sugerido: Cambiar las 3 condiciones de `user?.role` a `user?.role_type ?? user?.role` en [SelectBranchPage.tsx:71-76](convision-front/src/pages/SelectBranchPage.tsx#L71-L76).
- Estado: **hipótesis confirmada por síntoma** — requiere verificación de `AuthContext`

---

## Hallazgos cerrados (de FINDINGS v1)

### QA-001 — CERRADO/CORREGIDO
- Endpoint: `POST /api/v1/daily-activity-reports/:id/reopen`
- Severidad original: mayor
- Corrección aplicada: Se agregó `if claims.Role != "admin" { c.JSON(403, ...) ; return }` en `ReopenReport` ([handler_t10.go:732](convision-api-golang/internal/transport/http/v1/handler_t10.go#L732)).
- Verificación: specialist → `403 "solo los administradores pueden reabrir un reporte"` ✓; receptionist → `403` ✓; admin → `200` ✓.
- Estado: **CERRADO**

---

## OK (sin incidencias — esta sesión)

| Rol | Endpoint / Acción | Resultado | Notas |
|-----|-------------------|-----------|-------|
| admin | `GET /daily-activity-reports` (X-Branch-ID: 2) | 200 | Lista OK |
| admin | `POST /daily-activity-reports/:id/close` | 200 | Cierre OK |
| admin | `POST /daily-activity-reports/:id/reopen` | 200 | Solo admin — correcto |
| admin | `POST /daily-activity-reports` | 403 | "administradores no pueden crear" — correcto |
| admin | `POST /daily-activity-reports/quick-attention` | 403 | "administradores no pueden" — correcto |
| admin | `GET /management-report` | 200 | Vista consolidada OK |
| admin | `GET /specialist-reports/consolidated` | 200 | Vista admin-only OK |
| admin | `/admin/daily-reports` UI (tab Consolidado) | Carga OK | KPIs y tabla visibles |
| admin | `/admin/daily-reports` UI (tab Reportes por asesor) | Carga OK | EntityTable visible |
| admin | `/admin/daily-reports/1` UI (detalle) | Carga OK | Audit log visible |
| specialist | `GET /daily-activity-reports` (X-Branch-ID: 2) | 200 | Vista propia OK |
| specialist | `POST /daily-activity-reports` (X-Branch-ID: 2) | 201 | Crear OK |
| specialist | `PUT /daily-activity-reports/:id` | 200 | Editar OK |
| specialist | `POST /daily-activity-reports/:id/close` | 200 | Cerrar OK |
| specialist | `POST /daily-activity-reports/:id/reopen` | **403** | Correcto — fix QA-001 ✓ |
| specialist | `GET /management-report` | 200 | Informe de gestión OK |
| specialist | `GET /specialist-reports/consolidated` | **403** | Correcto — admin-only |
| specialist | `GET /daily-activity-reports/:id` (otro usuario) | **403** | Ownership check OK |
| receptionist | `GET /daily-activity-reports` (X-Branch-ID: 3) | 200 | Vista propia OK |
| receptionist | `POST /daily-activity-reports` (X-Branch-ID: 3) | 201 | Crear OK |
| receptionist | `POST /daily-activity-reports/:id/reopen` | **403** | Correcto — fix QA-001 ✓ |
| receptionist | `GET /management-report` | **403** | Sin permiso — correcto |
| receptionist | `GET /daily-activity-reports` (sede ajena) | **403** "Sin acceso a esta sede" | Branch isolation OK |

---

## Permisos verificados por rol

**Specialist** — `daily_reports:view`, `daily_reports:create`, `management_report:view`, `management_report:create`. Sin `specialist_reports:view/manage`. Total: 29 permisos.

**Receptionist** — `daily_reports:view`, `daily_reports:create`. Sin `management_report:*` ni `specialist_reports:*`. Total: 47 permisos.

**Admin** — todos los permisos. Business logic en handler bloquea crear/quick-attention para admin (no RBAC permission).

---

## Handoff al agente corrector

Para corregir con `/gsd-code-review-fix` o skill `convision-qa-fixer`:

| ID | Prioridad | Archivo | Línea aprox. | Acción requerida |
|----|-----------|---------|--------------|-----------------|
| **QA-NEW-001** | **alta** | [handler_t10.go](convision-api-golang/internal/transport/http/v1/handler_t10.go) | ~757 | Agregar ownership check en `GetDailyActivityReportEditLogs`: después de cargar el reporte, `if claims.Role != "admin" && report.UserID != uint(claims.UserID) { c.JSON(403, gin.H{"message": "..."}) ; return }` |
| QA-NEW-002 | media | [SelectBranchPage.tsx](convision-front/src/pages/SelectBranchPage.tsx) | ~71-76 | Cambiar `user?.role` por `user?.role_type ?? user?.role` en las 3 condiciones de `handleContinue` |
| QA-002 | baja | [DailyReports.tsx](convision-front/src/pages/admin/DailyReports.tsx) | 37 | Cambiar `u.role === 'receptionist'` por `(u.role_type ?? u.role) === 'receptionist'` para alinearlo con la corrección ya aplicada en la línea 33 |

**Prioridad recomendada:** QA-NEW-001 (seguridad — información sensible legible sin autorización) → QA-NEW-002 (UX blocker para specialist) → QA-002 (deuda técnica menor).
