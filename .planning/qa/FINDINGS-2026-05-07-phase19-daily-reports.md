---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
started: 2026-05-07T13:40:00-05:00
updated: 2026-05-07T14:00:00-05:00
roles_tested: [admin, specialist, receptionist]
scope: "Módulo gestión diaria de asesor (daily-activity-reports, management-report, specialist-reports) + RBAC phase 19"
---

# QA FINDINGS — Phase 19 RBAC × Módulo Gestión Diaria de Asesor

## Resumen ejecutivo

- Pantallas/endpoints verificados: 18
- Hallazgos confirmados: 1 (mayor)
- Sugerencias / gaps menores: 2
- Sin incidencias: 15 rutas

## Hallazgos (FAIL / GAP)

### QA-001
- Rol: specialist / receptionist
- URL: `POST http://localhost:8001/api/v1/daily-activity-reports/:id/reopen`
- Severidad: **mayor**
- Pasos:
  1. Cerrar un reporte existente: `POST /daily-activity-reports/:id/close` → `status: closed`
  2. Llamar directamente vía API: `POST /daily-activity-reports/:id/reopen` con token de specialist o receptionist
- Esperado: `403 Forbidden` — solo admin puede reabrir un reporte cerrado (la UI muestra el botón de reapertura únicamente a admins)
- Observado: `200 OK` — el reporte cambia a `status: pending`. Specialist y receptionist pueden reabrir cualquier reporte cerrado que pertenezca a su sede.
- Evidencia: HTTP 200 confirmado con tokens de `specialist@convision.com` y `receptionist@convision.com` en ambos reportes (id=1 y id=2)
- Raíz: El handler `ReopenReport` en [handler_t10.go:732](convision-api-golang/internal/transport/http/v1/handler_t10.go#L732) no verifica `claims.Role == "admin"`. La ruta usa `jwtauth.RequirePermission("daily_reports:view")` y tanto specialist como receptionist tienen ese permiso. Otros endpoints del mismo handler sí verifican el rol (crear: line 617, quick-attention: line 798).
- Estado: **confirmado**

---

### QA-002
- Rol: todos
- URL: `convision-front/src/pages/admin/DailyReports.tsx:33`
- Severidad: **menor** (no funcional en producción, pero frágil)
- Pasos: Revisar código en `DailyReports.tsx` línea 33: `ROLE_LABELS[u.role] ?? u.role`
- Esperado: Usar `u.role_type` (nombre canónico post phase-19) para mostrar el rol del asesor en la tabla
- Observado: Se usa `u.role` — funciona porque el backend devuelve ambos campos (`role` y `role_type`) pero `u.role` no está definido como campo principal en el tipo `User` de `userService.ts` (sí está como `role: 'admin'|'specialist'|'receptionist'` en la interfaz, y el API sí lo devuelve). Sin impacto funcional hoy, pero genera deuda técnica.
- Evidencia: Código en [DailyReports.tsx:33](convision-front/src/pages/admin/DailyReports.tsx#L33), interfaz `User` en [userService.ts:16](convision-front/src/services/userService.ts#L16)
- Estado: **hipótesis de deuda técnica** (no es un bug en producción)

---

### QA-003
- Rol: admin / specialist / receptionist
- URL: Sidebar (AdminLayout.tsx)
- Severidad: **sugerencia**
- Pasos: Verificar feature_flags en JWT para los tres roles
- Esperado: Feature flags granulares por rol (receptionist no debería ver `sidebar.specialist_management`, specialist no debería ver `sidebar.advisor_report` si ese módulo es solo para receptionist)
- Observado: Los tres roles reciben **todos los feature flags** habilitados (`sidebar.advisor_report`, `sidebar.specialist_management`, `sidebar.reports`, etc.). La visibilidad correcta del sidebar se logra por la separación de rutas (`/admin`, `/specialist`, `/receptionist`) y sus `allowedRoles`, no por feature_flags diferenciados.
- Evidencia: Login responses: admin recibe 15 feature_flags; specialist y receptionist también reciben los mismos 15 flags. El sidebar filtra por flags pero todos están `true` para todos los roles.
- Estado: **hipótesis / sugerencia** — no es un bug de seguridad porque las rutas están protegidas por `BranchProtectedRoute allowedRoles`

---

## OK (sin incidencias)

| Rol | Endpoint / Ruta | Resultado | Notas |
|-----|-----------------|-----------|-------|
| admin | `GET /daily-activity-reports` | 200 | Lista vacía pero acceso OK |
| admin | `GET /daily-activity-reports/:id` | 200 | Acceso correcto |
| admin | `POST /daily-activity-reports` | **403** (business logic) | "administradores no pueden crear" — correcto |
| admin | `PUT /daily-activity-reports/:id` | 200 | Edición OK |
| admin | `POST /daily-activity-reports/:id/close` | 200 | Cierre OK |
| admin | `POST /daily-activity-reports/:id/reopen` | 200 | Solo desde admin — correcto |
| admin | `POST /daily-activity-reports/quick-attention` | **403** (business logic) | "administradores no pueden usar atención rápida" — correcto |
| admin | `GET /daily-activity-reports/:id/edit-logs` | 200 | Audit log OK |
| admin | `GET /management-report` | 200 | Vista consolidada OK |
| admin | `GET /specialist-reports/consolidated` | 200 | Vista admin-only OK |
| admin | `GET /roles` | 200 | RBAC management OK |
| admin | `GET /permissions` | 200 | RBAC management OK |
| specialist | `GET /daily-activity-reports` | 200 | Vista propia OK |
| specialist | `POST /daily-activity-reports` | 201 | Crear reporte OK |
| specialist | `PUT /daily-activity-reports/:id` | 200 | Edición OK |
| specialist | `POST /daily-activity-reports/:id/close` | 200 | Cierre OK |
| specialist | `GET /management-report` | 200 | Informe de gestión OK |
| specialist | `GET /specialist-reports/consolidated` | **403** | Correcto — vista admin-only |
| specialist | `GET /roles` | **403** | Correcto — RBAC management admin-only |
| receptionist | `GET /daily-activity-reports` (sede propia) | 200 | Vista propia OK |
| receptionist | `POST /daily-activity-reports` (sede propia) | 201 | Crear reporte OK |
| receptionist | `PUT /daily-activity-reports/:id` (sede propia) | 200 | Edición OK |
| receptionist | `GET /management-report` | **403** | Correcto — sin `management_report:view` |
| receptionist | `GET /specialist-reports/consolidated` | **403** | Correcto — sin permiso |
| receptionist | `GET /roles` | **403** | Correcto — RBAC management admin-only |
| receptionist | GET en sede de otro | **403** "Sin acceso a esta sede" | Aislamiento de sede correcto |

## Permisos verificados por rol (JWT)

**Specialist** — tiene `daily_reports:view`, `daily_reports:create`, `management_report:view`, `management_report:create`. NO tiene `specialist_reports:view/manage`. Total: 29 permisos.

**Receptionist** — tiene `daily_reports:view`, `daily_reports:create`. NO tiene `management_report:*` ni `specialist_reports:*`. Total: 47 permisos.

**Admin** — todos los permisos (111). Feature flag de aislamiento: admin no puede crear/editar reportes de asesor (business logic en handler, no RBAC permission).

## Handoff al agente de corrección

Para corregir con `/gsd-code-review-fix` o `convision-qa-fixer`:

| ID | Archivo | Línea | Acción requerida |
|----|---------|-------|-----------------|
| **QA-001** | [handler_t10.go:732](convision-api-golang/internal/transport/http/v1/handler_t10.go#L732) | ~740 | Agregar `if claims.Role != "admin" { c.JSON(403, gin.H{"message": "solo los administradores pueden reabrir un reporte"}) ; return }` después de obtener `claims` |
| QA-002 | [DailyReports.tsx:33](convision-front/src/pages/admin/DailyReports.tsx#L33) | 33 | Cambiar `u.role` por `u.role_type ?? u.role` para usar el campo canónico |
| QA-003 | Backend auth service | — | Considerar emitir feature_flags diferenciados por rol en el JWT (sugerencia no urgente) |

**Prioridad recomendada:** QA-001 (seguridad, fix de 3 líneas en backend) → QA-002 (deuda técnica menor) → QA-003 (mejora futura).
