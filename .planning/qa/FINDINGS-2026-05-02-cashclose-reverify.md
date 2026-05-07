---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
started: 2026-05-02T15:10:00-05:00
updated: 2026-05-02T15:30:00-05:00
roles_tested: [admin, receptionist, specialist]
scope: Cash close flow reverification with branch/multi-tenant filters, amount validation, data persistence
previous: FINDINGS-2026-05-02-cashclose-branches.md (all marked resolved; QA-001 is actually fixed but needed redeploy)
---

## Resumen ejecutivo

- Pantallas verificadas: 6 (API + frontend)
- Hallazgos confirmados: 2 (QA-R1, QA-R2)
- Hipotesis / pendiente evidencia: 0
- Sin incidencias (lista): admin consolidated, admin list, admin por asesor, receptionist cash close form, receptionist history, cash close detail, branch filter, data persistence, amounts consistency

## Hallazgos (FAIL / GAP)

### QA-R1 — DELETE cash-register-closes/:id fails with FK constraint error
- Rol: admin
- URL: DELETE /api/v1/cash-register-closes/:id
- Severidad: mayor
- Pasos:
  1. Create a draft cash close (ID=4, status=draft, branch_id=1)
  2. Call DELETE /api/v1/cash-register-closes/4 as admin
- Esperado: HTTP 204 No Content, cash close deleted
- Observado: HTTP 500 Internal Server Error. Cash close NOT deleted.
- Evidencia: Docker logs show: `ERROR: update or delete on table "cash_register_closes" violates foreign key constraint "fk_cash_register_closes_payments" on table "cash_register_close_payments" (SQLSTATE 23503)`
- Estado: confirmado
- Causa raiz: `CashRegisterCloseRepository.Delete()` en `cash_register_close_repository.go:252` ejecuta `db.Delete(&domain.CashRegisterClose{}, id)` pero no elimina primero los registros asociados en `cash_register_close_payments` ni `cash_count_denominations`. La FK constraint bloquea el DELETE de la fila padre.
- Fix sugerido: Modificar `Delete()` en el repositorio para usar una transaccion que primero elimine payments y denominations, luego el close. Similar al patron usado en `Update()`.

### QA-R2 — sede field empty in consolidated all-branches view (post-redeploy resolved)
- Rol: admin
- URL: GET /api/v1/cash-register-closes-consolidated?branch_id=0
- Severidad: menor (ya resuelto tras redeploy)
- Pasos:
  1. Login as admin, navigate to /admin/cash-closes (Consolidado tab)
  2. Select "Todas (4)" in branch filter
  3. Observe advisor list
- Esperado: Each advisor shows the name of the branch where they have their latest close
- Observado: All advisors showed sede="" (empty string) before Docker redeploy. After `docker compose build api && docker compose up -d api`, the fix from QA-001 now works correctly.
- Estado: confirmado → resuelto
- Causa raiz: The QA-001 code fix was correct (handler builds branchNameMap, service uses it), but the Docker container was running the old binary from before the fix. The `make build` only builds locally; `docker compose build api` was needed to apply to the running container.
- Nota: Consider adding a step in the deploy workflow documentation to ensure Docker containers are rebuilt after code changes.

## OK (sin incidencias)

| Rol | Ruta / Endpoint | Notas |
|-----|------|--------|
| admin | GET /api/v1/cash-register-closes-consolidated?branch_id=0 | Muestra 4 cierres de 3 asesores. KPIs correctos: $980,000 total. Sede names ahora correctos tras redeploy. |
| admin | GET /api/v1/cash-register-closes-consolidated?branch_id=1 | Filtra correctamente a Sede Norte: 3 cierres, $580,000 total. Excluye correctamente a Ana (Sede QA Test). |
| admin | GET /api/v1/cash-register-closes?branch_id=0 | Lista paginada con 4 cierres. Filtros por branch, status, user funcionales. |
| admin | /admin/cash-closes (frontend) | UI carga correctamente. Branch filter "Todas (4)" muestra dropdown con 4 sedes. Cambiar filtro actualiza los datos. |
| admin | /admin/cash-closes tab "Por asesor" | Muestra cards de asesores con montos. Branch filter persiste entre tabs. |
| receptionist | /receptionist/cash-closes (frontend) | Formulario de cierre carga con date picker, denominaciones, medios de pago, observaciones. |
| receptionist | /receptionist/cash-close-history (frontend) | Historial muestra tabla con cierres del recepcionista. "Ver detalle" navega a /receptionist/cash-close-detail/:id. |
| receptionist | GET /api/v1/cash-register-closes (auto-filtro) | Correctamente ve solo sus propios cierres (2: ID=4 draft + ID=2 submitted). No ve cierres de otros usuarios. |
| specialist | GET /api/v1/cash-register-closes (auto-filtro) | Correctamente ve solo su propio cierre (ID=3, draft, $50,000, Sede Norte). |
| receptionist | /receptionist/cash-close-detail/2 | Detalle muestra: nombre del asesor, fecha, total declarado $380,000, medios de pago. |
| API | POST /api/v1/cash-register-closes | Creacion de cierre exitosa: ID=4, status=draft, total=$150,000, branch_id=1. Datos persisten correctamente. |
| API | Amount consistency | Montos consistentes entre endpoints: list, consolidated, detail. $150K creado + $380K existente = $530K para Receptionist Demo en consolidated. |
| API | Branch filtering | Funciona en todos los endpoints. branch_id=0 muestra todos, branch_id=1 filtra a Sede Norte, branch_id=2 (Sede Sur) sin datos retorna vacio. |
| frontend | Branch filter (AdminBranchFilter) | Componente funcional en filtros bar. Dropdown muestra todas las sedes. Seleccion actualiza los datos. |

## Handoff al agente de correccion

- **QA-R1**: Corregir `CashRegisterCloseRepository.Delete()` para eliminar asociaciones (payments + denominations) en transaccion antes de eliminar el close.
- Archivo: `convision-api-golang/internal/platform/storage/postgres/cash_register_close_repository.go`
- Comando sugerido: "Con @convision-qa-gap-fixer, cerrar QA-R1 usando FINDINGS-2026-05-02-cashclose-reverify.md como fuente."

## Notas adicionales

1. **Proceso de deploy**: El `make build` solo construye el binario local. Para aplicar cambios al contenedor Docker en ejecucion, se necesita `docker compose -f docker/docker-compose.yml build api && docker compose -f docker/docker-compose.yml up -d api`. Esto causo que QA-001 apareciera como no resuelto cuando el codigo ya estaba corregido.

2. **Test data cleanup**: El cierre de prueba ID=4 ($150,000 draft) no pudo ser eliminado por el bug QA-R1. Queda como dato de prueba.
