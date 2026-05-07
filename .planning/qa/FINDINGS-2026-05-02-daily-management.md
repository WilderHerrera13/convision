---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
started: 2026-05-02T10:34:00-05:00
updated: 2026-05-02T11:15:00-05:00
roles_tested: [admin, specialist, receptionist]
scope: Daily management flow (specialist Informe de Gestión, admin Reportes Diarios, receptionist Reporte Diario), branch/multi-tenant filtering, data persistence
---

## Resumen ejecutivo

- Pantallas verificadas: 10
- Hallazgos confirmados: 1
- Hipótesis / pendiente evidencia: 1
- Sin incidencias: 8

## Hallazgos (FAIL / GAP)

### QA-001 — Admin specialist-reports consolidated no envía branch_id al API

- Rol: admin
- URL: http://localhost:4300/admin/specialist-reports
- Severidad: menor
- Pasos:
  1. Login como admin
  2. Navegar a "Informe Gestión Especialista" en sidebar
  3. Observar el filtro de sede "Todas (4)" y seleccionar una sede específica
  4. Revisar la petición de red al API `specialist-reports/consolidated`
- Esperado: La petición debe incluir `branch_id=0` (todas) o `branch_id=N` (sede específica) como query param, igual que `daily-activity-reports`
- Observado: La petición NO incluye el query param `branch_id`. El API usa el `X-Branch-ID` del header global, que puede no corresponder con la sede seleccionada en el filtro
- Evidencia: Network request `GET /api/v1/specialist-reports/consolidated?from=2026-04-19&to=2026-05-02` — sin `branch_id`
- Estado: confirmado

### QA-002 — Specialist management-report UI es mínima cuando no hay datos

- Rol: specialist
- URL: http://localhost:4300/specialist/management-report
- Severidad: menor
- Pasos:
  1. Login como specialist
  2. Seleccionar sede
  3. Navegar a "Informe de Gestión"
  4. Observar la página cuando no hay datos
- Esperado: Mostrar título "Informe de Gestión", filtros visibles, y un empty state claro tipo "Sin reportes de gestión en el período seleccionado"
- Observado: La página solo muestra una caja de búsqueda "Buscar paciente..." y paginación, sin título visible ni empty state descriptivo
- Evidencia: Snapshot solo contiene search box y paginación, sin heading ni empty state
- Estado: confirmado

## OK (sin incidencias)

| Rol | Ruta | Notas |
|-----|------|-------|
| admin | `/admin/dashboard` | Carga dashboard admin con sidebar completo |
| admin | `/admin/daily-reports` | Lista reportes diarios con filtro de fecha, sede (SearchableCombobox con 4 sedes), y asesor. Branch filter cambia API param `branch_id` correctamente |
| admin | `/admin/daily-reports/3` | Detalle de reporte con secciones: Atención al Cliente, Operaciones (valor_ordenes $250k), Redes Sociales, Observaciones |
| admin | `/admin/cash-closes` | Panel de cierres con summary cards ($980k total, 4 cierres, 2 pendientes), filtro de sede funcional, tabs Consolidado/Todos los cierres/Por asesor |
| specialist | `/select-branch` | Flujo multi-tenant: selección de sede con 3 opciones visibles. Botón "Continuar a Sede Centro" tras selección |
| specialist | `/specialist/dashboard` | Dashboard con métricas del especialista, quick cards, y "Cambiar sede" en sidebar |
| receptionist | `/receptionist/dashboard` | Dashboard recepción con métricas del día |
| receptionist | `/receptionist/daily-report` | Formulario completo con secciones plegables (Atención al Cliente, Dinero recibido, Operaciones, Redes Sociales). Pre-carga datos existentes. Guardar funciona (botones se deshabilitan). Observaciones persisten |
| receptionist | `/receptionist/daily-report-history` | Historial muestra reportes guardados (2 reports), filtros de fecha funcionales |

## Verificaciones cross-role

| Verificación | Resultado |
|---|---|
| Branch filter en admin daily-reports | ✅ `branch_id` se envía como query param (0 = todas, N = sede específica) |
| Branch filter en admin cash-closes | ✅ Filtra correctamente (Sede Sur → datos en $0 vs Todas → $980k) |
| Branch filter en admin specialist-reports | ⚠️ No envía `branch_id` como query param (ver QA-001) |
| Multi-tenant specialist branch selection | ✅ Select-branch page funciona; specialist ve solo sus sedes asignadas |
| Specialist API calls include branch_id | ✅ Management-report API incluye `branch_id=3` correctamente |
| Receptionist data persistence | ✅ Guardar reporte funciona; historial muestra reportes guardados |
| Receptionist daily report pre-loads data | ✅ Campos pre-cargados con valores de sesión anterior (consultas, dinero) |
| Empty states (filter no results) | ✅ "Sin resultados" + "No hay registros que coincidan" con botón limpiar |
| All APIs return 200 | ✅ Sin errores 4xx/5xx en ninguna llamada observada |

## Handoff al agente de corrección

- **QA-001**: El frontend del admin specialist-reports debe enviar `branch_id` como query param (0 para todas, N para sede específica) en la llamada a `specialist-reports/consolidated`, consistente con el patrón de `daily-activity-reports`.
- **QA-002**: La página `/specialist/management-report` debe mostrar un título "Informe de Gestión" y un empty state claro cuando no hay reportes en el período.
- **Recomendado:** regla `convision-qa-fixer`.
- Comando sugerido: "Con @convision-qa-fixer, cerrar QA-001 y QA-002 usando este FINDINGS como fuente."
