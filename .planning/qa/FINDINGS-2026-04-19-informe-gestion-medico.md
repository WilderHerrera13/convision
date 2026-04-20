---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
api_url: http://localhost:8001
started: 2026-04-19
updated: 2026-04-20
roles_tested: [specialist, admin, receptionist, specialist#2]
scope: flujo "Informe de Gestión" (especialista) — implementado en esta sesión
---

## Resumen ejecutivo

- Alcance: QA del flujo **Informe de Gestión** (specialist) recién implementado en
  esta sesión (backend Go + frontend React).
- **Capas verificadas:** API (23 casos) **y** UI en Playwright (login specialist
  + sidebar + lista + detalle + save + reapertura/persistencia + edit + toast +
  búsqueda positiva/negativa + admin read + admin write 403). Backend reiniciado
  con `APP_ENV=local` — AutoMigrate aplicó columnas + índice parcial sin errores.
- Pantallas verificadas UI: 6 (login, dashboard, lista, detalle nuevo,
  detalle persistido, detalle admin).
- Hallazgos **bloqueantes**: 0.
- Hallazgos **mayores**: 0.
- Hallazgos menores / UX: **3** confirmados vía UI (QA-IG-002, QA-IG-003, QA-IG-004)
  + **1 gap UX admin** (QA-IG-005).
- Limitación entorno (ya no aplica): QA-IG-001 resuelto al cerrar la otra
  sesión del Playwright.

## Hallazgos (FAIL / GAP)

### QA-IG-002 — "Sede Principal" hardcoded
- Rol: specialist / admin
- URL: `/specialist/management-report` y `/specialist/management-report/:id`
- Severidad: menor (descubribilidad / multi-clínica)
- Pasos: abrir lista → columna **SEDE** siempre muestra `Sede Principal`.
  Abrir detalle → card "Información del paciente" también muestra `Sede
  Principal` como constante.
- Esperado: sede proviene del `clinic_id` del appointment o del contexto del
  usuario logueado (per `DATABASE_GUIDE.md §aislamiento multi-clínica`).
- Observado: literal en
  [`ManagementReport.tsx`](../../convision-front/src/pages/specialist/ManagementReport.tsx#L143)
  y
  [`ManagementReportDetail.tsx`](../../convision-front/src/pages/specialist/ManagementReportDetail.tsx#L133).
  El backend aún no expone `clinic` en `AppointmentResource`.
- Evidencia: screenshots `informe-gestion-lista.png`,
  `informe-gestion-detalle.png`, `informe-gestion-admin.png`.
- Estado: **abierto** — deuda conocida; depende de que `appointments` reciba `clinic_id` en el backend Go. Diferido.

### QA-IG-003 — Subtítulo en mayúsculas por `capitalize` CSS
- Rol: specialist / admin
- URL: `/specialist/management-report`
- Severidad: menor (UI polish)
- Pasos: abrir la lista → subtítulo "Pacientes atendidos" muestra
  `Lunes, 20 De Abril De 2026`.
- Esperado (Figma 1820:2): `Lunes, 13 de abril de 2026` (preposiciones en
  minúscula).
- Observado: la clase `capitalize` aplicada al `<span>` convierte cada palabra
  a mayúscula.
- Evidencia: screenshot `informe-gestion-lista.png`, línea `capitalize` en
  [`ManagementReport.tsx`](../../convision-front/src/pages/specialist/ManagementReport.tsx#L84).
- Fix sugerido: reemplazar `capitalize` por `first-letter:uppercase` o
  capitalizar solo la primera palabra en JS.
- Estado: **resuelto** — `capitalize` reemplazado por `first-letter:capitalize` en [`ManagementReport.tsx`](../../convision-front/src/pages/specialist/ManagementReport.tsx).

### QA-IG-004 — Paginación muestra "0--1 de 0" con búsqueda sin resultados
- Rol: specialist
- URL: `/specialist/management-report?search=NoExisteZZZ` (via input)
- Severidad: menor (UI polish)
- Pasos: escribir un término sin matches → tabla muestra "No hay atenciones
  registradas aún"; footer muestra `Mostrando 0--1 de 0 atenciones`.
- Esperado: `Mostrando 0 de 0 atenciones` (o similar).
- Observado: cálculo `toItem = Math.min(fromItem + rows.length - 1, total)`
  produce `-1` cuando `rows.length === 0`, por lo que renderiza `0--1`.
- Evidencia: screenshot `informe-gestion-search-empty.png`, código en
  [`ManagementReport.tsx`](../../convision-front/src/pages/specialist/ManagementReport.tsx#L64-L65).
- Fix sugerido: `const toItem = rows.length === 0 ? 0 : Math.min(fromItem + rows.length - 1, total);`
- Estado: **resuelto** — aplicado en [`ManagementReport.tsx`](../../convision-front/src/pages/specialist/ManagementReport.tsx).

### QA-IG-005 — Admin ve botón "Guardar Registro" y acciones de edición habilitadas
- Rol: admin
- URL: `/specialist/management-report/:id`
- Severidad: menor (UX / consistencia con copy)
- Pasos: login admin → abrir lista → clic en "Editar" de una fila → detalle
  muestra `Guardar Registro` verde y el formulario editable → al guardar el
  backend responde `403` y se dispara el toast de error.
- Esperado: según el texto del propio sidebar del detalle —
  *"El Admin puede visualizarlo pero no modificarlo"*— la UI del admin debería
  ocultar `Guardar Registro` y los iconos "Editar" de la lista (dejar solo
  "Ver"), o presentarlos en modo disabled.
- Observado: UI idéntica al specialist; la protección vive únicamente en
  backend.
- Evidencia: screenshots `informe-gestion-admin.png` +
  `informe-gestion-admin-detalle.png`; network log
  `POST /api/v1/management-report/2 => 403` (confirmado vía
  `browser_network_requests`).
- Fix sugerido: en `ManagementReportDetail.tsx`, ocultar el botón `Guardar
  Registro` y desactivar los radio + textarea cuando `user.role === 'admin'`.
  En `ManagementReport.tsx`, ocultar/deshabilitar el ícono de lápiz para admin.
- Estado: **resuelto** — `useAuth` importado en ambos componentes; botón "Guardar Registro" y ícono lápiz ocultos con `!isAdmin`; radios y textarea con `disabled={isAdmin}` cuando el rol es `admin`.

### QA-IG-001 — (resuelto durante la sesión)
- El browser MCP estaba bloqueado al inicio; el usuario cerró la otra sesión
  y se pudo completar el smoke UI. Mantengo el ID solo como trazabilidad.

## OK (sin incidencias — verificado en esta sesión)

### UI (Playwright MCP — 6 screenshots guardadas en `.playwright-mcp/`)

| Rol | Ruta | Verificación | Screenshot |
|-----|------|--------------|-----------|
| specialist | `/login` | login con `password` redirige a dashboard | `page-2026-04-20T13-04-38-117Z.yml` |
| specialist | `/specialist/dashboard` | sidebar con **GESTIÓN → Informe de Gestión** visible | (snapshot) |
| specialist | `/specialist/management-report` | tabla carga 2 atenciones con columnas correctas, badges de estado (Pendiente / En curso) | `informe-gestion-lista.png` |
| specialist | `/specialist/management-report/2` | detalle nuevo: paciente, 5 radios, textarea 0/500, guía de tipificación, banner "Registro editable" | `informe-gestion-detalle.png` |
| specialist | `/specialist/management-report/2` | guardar **Consultas Efectivas** + comentario de 107/500 → redirect a lista, fila muestra "Consulta Efectiva" | `informe-gestion-form-lleno.png`, `informe-gestion-post-save.png` |
| specialist | `/specialist/management-report/2` | reabrir → radio pre-seleccionado (**Consultas Efectivas**) | `informe-gestion-detalle-persistido.png` |
| specialist | `/specialist/management-report/2` | editar a **Control de Seguimiento** → lista muestra "Ctrl. Seguimiento" + toast "Registro guardado" | `informe-gestion-post-edit.png` |
| specialist | `/specialist/management-report?search=NoExisteZZZ` | tabla vacía con "No hay atenciones registradas aún" | `informe-gestion-search-empty.png` |
| specialist | `/specialist/management-report?search=Laura` | tabla muestra las 2 filas | `informe-gestion-search-laura.png` |
| admin | `/specialist/management-report` | ve la lista completa (2 filas) | `informe-gestion-admin.png` |
| admin | `/specialist/management-report/2` | entra al detalle con valor pre-seleccionado | `informe-gestion-admin-detalle.png` |
| admin | POST `/api/v1/management-report/2` | intento de guardado → `HTTP 403` devuelto por backend | network log + `informe-gestion-admin-403.png` |

### API (curl — verificado 2026-04-19)

| # | Rol | Endpoint / ruta | Caso | Resultado |
|---|-----|-----------------|------|-----------|
| 1 | specialist | `POST /api/v1/auth/login` | login con `password` | HTTP 200, JWT emitido |
| 2 | specialist | `GET /api/v1/management-report` | default | HTTP 200, `total=2`, solo citas suyas |
| 3 | specialist | `GET …?per_page=1&page=2` | paginación | HTTP 200, `last_page=2` |
| 4 | specialist | `GET …?search=Laura` | búsqueda patient | HTTP 200, matches 2 citas |
| 5 | specialist | `GET …?search=NoExisteZZZ` | búsqueda sin match | HTTP 200, `total=0` |
| 6 | specialist | `GET …?status=scheduled` | filtro status | HTTP 200, `total=1` |
| 7 | specialist | `POST …/1` (effective + notes) | guardar | HTTP 200, persistido |
| 8 | specialist | `GET …/1` tras save | reread | `consultation_type=effective` |
| 9 | specialist | `POST …/1` (formula_sale + notes) | editar | HTTP 200 |
| 10 | specialist | `GET …/1` tras edit | reread | actualizados |
| 11 | admin | `GET /api/v1/management-report` | read-only | HTTP 200, ve citas del specialist |
| 12 | admin | `POST /api/v1/management-report/1` | write denied | HTTP 403 `forbidden: insufficient role` |
| 13 | receptionist | `GET /api/v1/management-report` | RBAC | HTTP 403 |
| 14 | anon | `GET /api/v1/management-report` | sin token | HTTP 401 |
| 15 | specialist#2 | `GET /api/v1/management-report/1` | ownership lectura | HTTP 403 `no autorizado` |
| 16 | specialist#2 | `POST /api/v1/management-report/1` | ownership escritura | HTTP 403 `solo el especialista asignado puede registrar el informe` |
| 17 | specialist#2 | `GET /api/v1/management-report` | lista filtrada | HTTP 200, `total=0` |
| 18 | specialist | `POST …/1` `consultation_type=bogus` | enum inválido | HTTP 422 `oneof` |
| 19 | specialist | `POST …/1` `report_notes=""` | notes vacío | HTTP 422 `required` |
| 20 | specialist | `POST …/1` sin `consultation_type` | required | HTTP 422 `required` |
| 21 | specialist | `POST …/1` notes 501 chars | max=500 | HTTP 422 `max` |
| 22 | specialist | `POST …/999999` | id inexistente | HTTP 404 `appointment not found` |
| 23 | specialist | `GET …/999999` | id inexistente | HTTP 404 `appointment not found` |

### Estático

| Herramienta | Alcance | Resultado |
|-------------|---------|-----------|
| `go build ./...` | backend completo | exit 0 |
| `go vet ./...` | backend completo | exit 0 |
| AutoMigrate | `APP_ENV=local` al reiniciar | columnas `consultation_type` + `report_notes` + índice parcial creados |
| `npx eslint` | archivos nuevos/modificados | exit 0 |
| `npx tsc --noEmit` | todo el front | exit 0 |

## Handoff al agente de corrección

- Archivo fuente: `.planning/qa/FINDINGS-2026-04-19-informe-gestion-medico.md`.
- IDs abiertos para corrección (menores):
  - **QA-IG-002** — reemplazar literal `Sede Principal` por sede derivada
    (depende de que `appointments` reciba `clinic_id` o que
    `AppointmentResource` exponga `clinic`).
  - **QA-IG-003** — quitar `capitalize` del subtítulo en
    [`ManagementReport.tsx`](../../convision-front/src/pages/specialist/ManagementReport.tsx#L84).
  - **QA-IG-004** — `toItem = rows.length === 0 ? 0 : Math.min(fromItem + rows.length - 1, total)` en
    [`ManagementReport.tsx`](../../convision-front/src/pages/specialist/ManagementReport.tsx#L65).
  - **QA-IG-005** — ocultar / deshabilitar los controles de escritura cuando
    `user.role === 'admin'` en `ManagementReport.tsx` (iconos "Editar") y
    `ManagementReportDetail.tsx` (botón "Guardar Registro", radios, textarea).
- Regla sugerida: `convision-qa-fixer` con este archivo + IDs.
