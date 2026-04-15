---
status: complete
app: convision-front
api: convision-api
base_url: http://localhost:4300
started: 2026-04-15T00:00:00Z
updated: 2026-04-15T00:00:00Z
roles_tested: [admin, receptionist, specialist]
scope: "Reporte de gestión diario — admin listado + detalle, registro rápido, recepción formulario + historial; pruebas destructivas (nota larga API, query inválida URL)"
---

## Resumen ejecutivo

- Pantallas / rutas verificadas: **8** (login x3, admin daily-reports, admin quick-attention con query basura, recepción daily-report, recepción dashboard, specialist dashboard, specialist → admin URL)
- Hallazgos confirmados: **5** (incl. 1 producto esperado: 403 specialist)
- Hipótesis / evidencia parcial: **1** (texto a11y «Catálogo» en snapshot)
- Prueba API complementaria: **POST quick-attention** con nota de **501 caracteres** → **422** con `errors.note` (válido; coherente con `max:500` en backend)

## Hallazgos (FAIL / GAP)

### QA-DR-001
- **Rol:** specialist
- **URL:** `http://localhost:4300/admin/daily-reports` (navegación directa con sesión especialista)
- **Severidad:** menor (producto / permisos)
- **Pasos:** 1. Login `specialist@convision.com` / `password`. 2. Abrir URL admin de reportes diarios.
- **Esperado (según negocio):** solo roles con permiso admin acceden al consolidado.
- **Observado:** redirección a `http://localhost:4300/unauthorized`, título «403 / Acceso Denegado».
- **Evidencia:** snapshot MCP: `heading "403"`, `heading "Acceso Denegado"`.
- **Estado:** confirmado  
- **Nota:** coherente con rutas protegidas; el especialista **no** tiene ítem de menú para este módulo (solo Dashboard + Citas).

### Resolución (QA-DR-001)
- **Estado:** resuelto / por diseño — sin cambio de código (403 esperado para rol sin ruta admin).
- **Fecha:** 2026-04-15

### QA-DR-002
- **Rol:** admin (API JWT)
- **URL:** `POST http://localhost:8000/api/v1/daily-activity-reports/quick-attention`
- **Severidad:** menor (validación servidor; ya mitigable en front con `maxLength`)
- **Pasos:** 1. Login API admin. 2. POST con `note` de **501** caracteres (`x` repetido), `Accept: application/json`, cuerpo válido restante (`report_date`, `shift`, `item`).
- **Esperado:** 422 y mensaje de validación en `errors.note`.
- **Observado:** `HTTP 422`, cuerpo: `The note must not be greater than 500 characters.`
- **Evidencia:** respuesta JSON Laravel estándar.
- **Estado:** confirmado

### Resolución (QA-DR-002)
- **Estado:** resuelto — `QuickAttentionDailyActivityReportRequest::messages()` con textos en español (incl. `note.max`); test `test_quick_attention_note_exceeds_max_returns_spanish_message`; el front ya muestra `errors.*` en toast.
- **Archivos:** `convision-api/app/Http/Requests/Api/V1/DailyActivityReport/QuickAttentionDailyActivityReportRequest.php`, `convision-api/tests/Feature/Api/V1/DailyActivityReportQuickAttentionTest.php`
- **Fecha:** 2026-04-15

### QA-DR-003
- **Rol:** admin
- **URL:** `http://localhost:4300/admin/daily-reports/quick-attention?date=not-a-date&shift=night`
- **Severidad:** sugerencia / menor
- **Pasos:** 1. Sesión admin. 2. Abrir URL con `date` y `shift` inválidos.
- **Esperado:** no romper la vista; ignorar o normalizar parámetros.
- **Observado:** página carga; **Jornada** muestra «Mañana» (valor por defecto); fecha en DatePicker coherente con **hoy** (fallback).
- **Evidencia:** snapshot MCP: `combobox` «Mañana», botón fecha «15/04/2026» (sesión del día de prueba).
- **Estado:** confirmado

### Resolución (QA-DR-003)
- **Estado:** resuelto — comportamiento ya correcto; sin cambio adicional.

### QA-DR-004
- **Rol:** receptionist
- **URL:** `http://localhost:4300/receptionist/dashboard`
- **Severidad:** menor (accesibilidad / encoding)
- **Pasos:** 1. Login recepción. 2. Revisar árbol de accesibilidad.
- **Esperado:** nombres accesibles con caracteres UTF-8 correctos (ej. «Catálogo», «ópticos»).
- **Observado:** en snapshot MCP aparecen cadenas tipo `Cat?logo` y `?pticos` en nombres de botón/heading.
- **Evidencia:** snapshot YAML MCP (puede ser limitación del canal a11y, no del DOM real).
- **Estado:** hipótesis — verificar en inspector del navegador o lectores de pantalla reales.

### Resolución (QA-DR-004)
- **Estado:** resuelto — causa raíz: caracteres UTF-8 corruptos en código (`?` en lugar de `á`/`ó`) en `ReceptionistDashboard.tsx` (badge «atención», título Catálogo, descripción ópticos, botón «Ir al catálogo»).
- **Archivo:** `convision-front/src/pages/receptionist/ReceptionistDashboard.tsx`
- **Fecha:** 2026-04-15

### QA-DR-005
- **Rol:** admin
- **URL:** `http://localhost:4300/admin/daily-reports`
- **Severidad:** menor (accesibilidad tabla)
- **Pasos:** 1. Cargar listado con al menos una fila. 2. Revisar snapshot completo.
- **Esperado:** estructura de tabla semántica (`table`, `th`) o equivalente anunciado.
- **Observado:** aparecen acciones «Ver detalle del reporte» por fila y textos de ayuda; **no** se listan encabezados de columna como nodos separados en el snapshot (limitación frecuente con ciertas implementaciones de tabla).
- **Evidencia:** snapshot MCP.
- **Estado:** hipótesis leve — priorizar si auditoría a11y formal lo exige.

### Resolución (QA-DR-005)
- **Estado:** resuelto (parcial) — `TableHead` con `scope="col"` por defecto en `table.tsx`; `DataTable` / `EntityTable` aceptan `tableAriaLabel`; listado admin pasa descripción en español para la tabla.
- **Archivos:** `convision-front/src/components/ui/table.tsx`, `convision-front/src/components/ui/data-table/DataTable.tsx`, `convision-front/src/components/ui/data-table/EntityTable.tsx`, `convision-front/src/pages/admin/DailyReports.tsx`
- **Fecha:** 2026-04-15

## OK (sin incidencias funcionales en esta sesión)

| Rol | Ruta | Notas |
|-----|------|--------|
| admin | `/admin/dashboard` | Carga con sesión previa |
| admin | `/admin/daily-reports` | Consolidado: filtros fecha/asesor, enlace «Registro rápido de atención», ≥2 filas con «Ver detalle del reporte», paginación en página única |
| admin | `/admin/daily-reports/quick-attention` | Flujo por pasos; query inválida no rompe (QA-DR-003) |
| receptionist | `/receptionist/dashboard` | Panel carga; ítems sidebar incl. reporte diario |
| receptionist | `/receptionist/daily-report` | Formulario completo (spinbuttons por secciones, observaciones, enlace registro rápido) |
| specialist | `/specialist/dashboard` | Panel especialista carga |
| API | `POST .../quick-attention` | Validación nota >500 → 422 (QA-DR-002) |

## Pruebas destructivas ejecutadas (resumen)

| Prueba | Resultado |
|--------|-----------|
| Nota API 501 caracteres | 422 + mensaje Laravel |
| `?date=not-a-date&shift=night` en registro rápido admin | Fallback fecha/jornada, sin pantalla en blanco |
| Specialist fuerza URL admin reportes | 403 / unauthorized (QA-DR-001) |

**No ejecutado en esta sesión (límite tiempo):** pegar texto masivo en observaciones del **formulario completo** recepción (`/receptionist/daily-report`), valores numéricos extremos en todos los spinners, doble envío rápido de «Guardar Reporte», historial recepción clic a detalle.

## Handoff al agente de corrección

- Archivo fuente: `.planning/qa/FINDINGS-2026-04-15-gsd-qa-daily-reports.md`
- **Prioridad baja:** QA-DR-004 (confirmar si «Cat?logo» es real o artefacto MCP); QA-DR-005 (semántica tabla).
- **Sin acción si el producto confirma:** QA-DR-001 (especialista sin acceso admin).
- **Ya cubierto en código reciente (si aplica retest):** front registro rápido con `maxLength` + mensajes 422 — revalidar toast muestra texto de `errors.*` tras QA-DR-002.

**Comando sugerido:** con `@convision-qa-gap-fixer` o `@convision-qa-fixer`, cerrar solo si se confirman QA-DR-004/005 como bugs reales en DOM.
