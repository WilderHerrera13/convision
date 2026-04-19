---
status: fixed
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
started: 2026-04-19T17:44:00Z
updated: 2026-04-19T19:30:00Z
roles_tested: [admin, receptionist]
scope: "Flujo de cierre de caja (admin: listado/calendario/advisor; receptionist: nuevo cierre/historial/detalle/reporte diario)"
viewport: "snapshot device width ~800px (browser MCP)"
---

## Resumen ejecutivo

- Pantallas verificadas: 9
  - admin: `/admin/dashboard`, `/admin/cash-closes`, `/admin/cash-closes/advisor/3`, `/admin/cash-closes/1`, `/admin/cash-closes/calendar`, `/admin/daily-reports`
  - receptionist: `/receptionist/cash-closes`, `/receptionist/cash-close-history`, `/receptionist/cash-close-detail/8`, `/receptionist/daily-report`, `/receptionist/daily-report-history`
- Hallazgos confirmados: 8
- Hipótesis / pendiente evidencia: 1
- Sin incidencias destacables: dashboards, login admin/receptionist, listado de cierres carga datos (200), envío de cierre `PUT/POST /cash-register-closes/:id/submit` (200).

## Hallazgos (FAIL / GAP)

### QA-CC-101
- Rol: receptionist (también admin)
- URL: http://localhost:4300/receptionist/cash-closes (y otras rutas con header)
- Severidad: bloqueante (UX visible)
- Pasos:
  1. Iniciar sesión como receptionist@convision.com / password.
  2. Abrir `/receptionist/cash-closes`.
  3. Observar el encabezado de la página.
- Esperado: el título "Cierre de Caja" debe verse completo, sin solaparse con el botón hamburguesa del sidebar (`Expandir sidebar`).
- Observado: el icono hamburguesa se superpone al título y a la descripción; se lee "**[hamburger]**erre de Caja" y "...gistra el cierre financiero del día". El mismo defecto se reproduce en:
  - `/receptionist/cash-close-history` ("Historial de Cierres" → "...storial de Cierres")
  - `/receptionist/cash-close-detail/8` (link de regreso solapado)
  - `/receptionist/daily-report` ("Reporte Diario de Gestión" → "...eporte Diario de Gestión")
  - `/receptionist/daily-report-history` ("Historial de Reportes Diarios" → "...istorial de Reportes Diarios")
- Evidencia: capturas en `/var/folders/.../cursor/screenshots/page-2026-04-19T17-50-16-495Z.png`, `...T17-51-26-434Z.png`, `...T17-51-48-642Z.png`, `...T17-52-10-654Z.png`, `...T17-52-31-589Z.png`. Sin errores de consola; problema puramente CSS/layout del header del layout receptionist.
- Estado: confirmado

### QA-CC-102
- Rol: receptionist
- URL: backend `POST /api/v1/cash-register-closes` y `GET /api/v1/cash-register-closes?close_date=2026-04-19`
- Severidad: bloqueante (regla de negocio)
- Pasos:
  1. Iniciar sesión como receptionist@convision.com.
  2. Visitar `/receptionist/cash-closes` varias veces y/o usar "Guardar borrador".
  3. Consultar la API: `curl -H "Authorization: Bearer <token>" 'http://localhost:8001/api/v1/cash-register-closes?close_date=2026-04-19&per_page=20'`.
- Esperado: como máximo **un** cierre por usuario por fecha (con su ciclo `draft → submitted → approved`); o, si se permiten múltiples, debe haber motivo claro (turnos) y la UI debe diferenciarlos.
- Observado: 6 registros con `close_date=2026-04-19` y `user_id=3` (Receptionist Demo). Estados: 2 `approved`, 2 `submitted`, 2 `draft` (montos $9.000, $50.000, $50.000, $250.000, $460.000, $1.300.000). El listado admin (`/admin/cash-closes`) los muestra apilados como entradas duplicadas y la pantalla "Calendario por asesor" suma los aprobados (≈ $990.000) confundiendo el periodo.
- Evidencia: respuesta JSON guardada arriba; capturas `page-2026-04-19T17-45-13-961Z.png` (listado admin con 4 filas iguales del 19/04/2026) y `page-2026-04-19T17-51-26-434Z.png` (historial receptionist con 6 filas del 19/04/2026).
- Estado: confirmado

### QA-CC-103
- Rol: admin
- URL: http://localhost:4300/admin/cash-closes/advisor/3?date=2026-04-19
- Severidad: bloqueante (funcionalidad de aprobación)
- Pasos:
  1. Iniciar sesión como admin@convision.com.
  2. Ir a `/admin/cash-closes`.
  3. Hacer clic en el primer botón de fila (rotulado "Ver calendario de cierres") para entrar al detalle por asesor.
  4. Buscar la acción "Aprobar" indicada por el banner amarillo "1 cierre pendiente de revisión / Revisa el calendario abajo y haz clic en 'Aprobar' para procesarlos".
- Esperado: existe un botón "Aprobar" visible (en la fila del cierre pendiente, en un menú contextual o en un modal de detalle) que permite aprobar el cierre del 17 abr ($280.000, status `submitted`).
- Observado: la palabra "Aprobar" aparece **únicamente como texto descriptivo dentro del banner** (búsqueda exhaustiva con `browser_search "Aprobar"` retorna 1 sola coincidencia). Las celdas de la tabla "Resumen de cierres aprobados" no tienen acciones; el clic sobre la fila pendiente (17 abr) no abre ningún modal/ruta. El botón "Ver pendientes" cambia el `focused state` pero no abre vista alguna ni desplaza al pendiente.
- Evidencia: capturas `page-2026-04-19T17-46-29-250Z.png` (banner sin botón Aprobar) y `page-2026-04-19T17-47-06-300Z.png` (después de "Ver pendientes" no hay cambio); snapshot a11y muestra solo 8 botones interactivos: Volver, Desde, Hasta, Ir a hoy, Ver pendientes, Exportar, Sidebar, Notificaciones — ninguna acción de aprobación.
- Estado: confirmado

### QA-CC-104
- Rol: admin
- URL: http://localhost:4300/admin/cash-closes
- Severidad: mayor (a11y / descubribilidad)
- Pasos:
  1. Iniciar sesión como admin.
  2. Abrir `/admin/cash-closes`.
  3. Inspeccionar los botones de acción de cada fila del listado.
- Esperado: cada acción de fila tiene un nombre accesible único, p. ej. "Ver cierres de Receptionist Demo" o "Ver detalle del cierre #N".
- Observado: las 8 filas del listado exponen todas el mismo `accessible name`: **"Ver calendario de cierres"** (nth=0..7). Para usuarios de lectores de pantalla y para automatización son indistinguibles. Adicionalmente, el botón redirige al **calendario por asesor** (no a un detalle de cierre concreto), lo que el rótulo confunde porque sugiere abrir un calendario global.
- Evidencia: snapshot a11y de `/admin/cash-closes` (refs e10–e17 todos `name: "Ver calendario de cierres"`); captura `page-2026-04-19T17-45-13-961Z.png`.
- Estado: confirmado

### QA-CC-105
- Rol: admin
- URL: http://localhost:4300/admin/cash-closes/advisor/3?date=2026-04-19
- Severidad: mayor (lectura de datos críticos truncada)
- Pasos:
  1. Entrar al detalle por asesor (cualquier asesor con cierres).
  2. Observar la tabla "Resumen de cierres aprobados" y los "Cierres del Período / Pendientes / Diferencia Acumulada" del listado padre.
- Esperado: las columnas y cards muestran los valores completos (subtítulo "Abril 2026", encabezado "(–) Sobrante / Subsidio", diferencias "+$10.000" / "-$170.000", total "-$160.000").
- Observado: las cards superiores cortan el subtítulo ("Abril 2026", "Requieren ...", "Acumulado del ...") y la tabla recorta:
  - Encabezado: "(–) S..." (no se sabe si es Sobrante/Subsidio).
  - Diferencias: "+$ 1...", "-$ 17...", "-$ 16..." sin las cifras finales.
  La tabla ofrece scrollbar horizontal interno pero el ancho restante ya está saturado por columnas previas — la información financiera crítica queda fuera del viewport razonable.
- Evidencia: capturas `page-2026-04-19T17-45-13-961Z.png` (cards) y `page-2026-04-19T17-47-19-...png` y la búsqueda "17 abr" (`page-2026-04-19T17-47-...png`) muestran las celdas cortadas.
- Estado: confirmado

### QA-CC-106
- Rol: receptionist
- URL: http://localhost:4300/receptionist/daily-report
- Severidad: mayor (formulario inutilizable parcialmente)
- Pasos:
  1. Iniciar sesión como receptionist.
  2. Ir a "CAJA → Reporte Diario".
  3. Observar la sección "Atención al Cliente" con columnas Hombres / Mujeres / Niños.
- Esperado: las tres columnas (Hombres, Mujeres, Niños) muestran inputs numéricos del mismo ancho, todos con el valor actual visible.
- Observado: la columna **Mujeres** muestra solo "(" (paréntesis) en lugar del valor; la columna **Niños** se ve como recuadros vacíos (input fuera del ancho disponible). Los inputs de Hombres se ven correctamente. Es una sobrescritura/clipping de las columnas a la derecha por anchos calculados muy estrechos.
- Evidencia: captura `page-2026-04-19T17-52-10-654Z.png`.
- Estado: confirmado

### QA-CC-107
- Rol: admin
- URL: http://localhost:4300/admin/daily-reports
- Severidad: mayor (layout principal roto)
- Pasos:
  1. Iniciar sesión como admin.
  2. Ir a `/admin/daily-reports` (sidebar: "Reporte de gestión diario").
  3. Observar la cabecera y el área de filtros.
- Esperado: el título "Consolidado del día" y su descripción se renderizan en líneas normales (multi-palabra por línea).
- Observado: el contenedor del título usa un ancho de ~30 px y la fuente se rompe a **una letra (o sílaba) por línea**: la pantalla muestra "C / o / n / s / o / l / i / d / a / d / o", "C / o / m / p / a / r / a / t / i / v / a / e / n / t / r / e / a / s / e / s / o / r / e / s / ...". Indica un grid/flex sin `min-width: 0` o `flex-basis` mal calculado en el header del consolidado.
- Evidencia: captura `page-2026-04-19T17-49-00-802Z.png`.
- Estado: confirmado

### QA-CC-108
- Rol: receptionist
- URL: http://localhost:4300/receptionist/daily-report-history
- Severidad: menor
- Pasos:
  1. Abrir el historial de reportes (sin reportes registrados todavía hoy).
- Esperado: indicador de paginación coherente ("Página 0 de 0" o "1 de 1") y mensaje de vacío visible.
- Observado:
  - Indicador "**Página 1 de 0**" — incoherente.
  - Texto "No se encontraron..." cortado por el ancho de la columna ("No se encon...").
  - Botones de paginación habilitados pese a no haber páginas.
- Evidencia: captura `page-2026-04-19T17-52-31-589Z.png`.
- Estado: confirmado

### QA-CC-109
- Rol: admin
- URL: http://localhost:4300/admin/cash-closes/advisor/3?date=2026-04-19
- Severidad: sugerencia (semántica de color/UX)
- Pasos:
  1. Abrir el detalle del asesor.
  2. Observar la columna de diferencia: cierres con efectivo contado < declarado pintan **rojo** con signo "+", y cierres con contado > declarado pintan **verde** con signo "-".
- Esperado: convención clara y consistente. En finanzas suele usarse rojo = faltante / negativo, verde = sobrante / positivo. Además, signo y color no deben contradecirse.
- Observado: ej. fila 19 abr declarado $460.000, contado $450.000 → diferencia "+$10.000" en **rojo**. Fila 19 abr declarado $250.000, contado $420.000 → diferencia "-$170.000" en **verde**. Total "-$160.000" en **verde**. El criterio (declarado − contado) puede ser válido, pero la combinación signo+color resulta contraintuitiva ("-" verde = positivo) y el encabezado truncado ("(–) S...") no permite confirmarlo. Riesgo de mala lectura por administradores al aprobar.
- Evidencia: captura `page-2026-04-19T17-47-...png`.
- Estado: hipótesis (depende de la convención oficial del producto)

## OK (sin incidencias)

| Rol | Ruta | Notas |
|-----|------|-------|
| admin | `/admin/dashboard` | Login OK, dashboard renderiza, sin errores en consola. |
| admin | `/admin/cash-closes` (red) | `GET /api/v1/cash-register-closes?page=1&per_page=10` → 200 con datos paginados; QA-001 (anterior) sigue resuelto. |
| admin | `/admin/cash-closes/advisor/3` (red) | `GET /api/v1/cash-register-closes-calendar?user_id=3&date_from=...&date_to=...` → 200. |
| admin | `/admin/cash-closes/1` | El redirector lleva al calendario del asesor correcto (advisor/3, fechas centradas en la fecha del cierre). |
| receptionist | `/receptionist/dashboard` | Login OK con `receptionist@convision.com / password`. |
| receptionist | `/receptionist/cash-closes` (envío) | `PUT /api/v1/cash-register-closes/8` → 200; `POST /cash-register-closes/8/submit` → 200; banner "Cierre enviado" visible. |
| receptionist | `/receptionist/cash-close-history` | Listado carga 6 filas de hoy + filas de días previos; acciones "Ver detalle" únicas. |
| receptionist | `/receptionist/cash-close-detail/8` | Detalle carga; muestra total y desglose por medio de pago. |

## Handoff al agente de corrección

Recomendado: regla `convision-qa-fixer` (correcciones front) + `convision-qa-gap-fixer` para QA-CC-102 y QA-CC-103 (lógica/back-end).

Priorización sugerida:
1. **QA-CC-102** — bloqueante de negocio (duplicación de cierres por día/usuario). Requiere decisión: ¿índice único `(user_id, close_date)` o reutilizar borrador existente al crear?
2. **QA-CC-103** — bloqueante de flujo (admin no puede aprobar). Probable falta de botón/modal en `CashCloseCalendar.tsx` o en su panel "Ver pendientes".
3. **QA-CC-101** — bloqueante UX (header del layout receptionist; afecta 5 pantallas). Probable corrección en el shell del layout (padding-left del título cuando el sidebar está colapsado).
4. **QA-CC-107** — layout roto en admin daily-reports.
5. **QA-CC-105**, **QA-CC-106** — truncamientos y anchos de columna en cards/tablas/inputs.
6. **QA-CC-104** — `aria-label` por fila único.
7. **QA-CC-108** — paginación vacía.
8. **QA-CC-109** — confirmar convención de color/signo con producto y alinear.

Comando sugerido: "Con `@convision-qa-fixer`, cerrar QA-CC-101, QA-CC-104, QA-CC-105, QA-CC-106, QA-CC-107, QA-CC-108 usando este FINDINGS como fuente. Para QA-CC-102 y QA-CC-103, enrutar a `@convision-qa-gap-fixer`."

---

## Resultado del fix

> Agente: Copilot QA Fixer — 2026-04-19
> Nota: El MCP de Playwright no respondió durante la sesión de corrección; las pruebas visuales no pudieron ejecutarse en el navegador. Se validó lint en todos los archivos modificados y se confirmó que todos los errores preexistentes eran anteriores a esta sesión.

| ID | Estado | Descripción del fix | Commit |
|---|---|---|---|
| QA-CC-101 | **resuelto** | `AdminLayout.tsx`: `<main>` recibe `pl-12` cuando `isCollapsed && !isMobile`, desplazando el contenido 48 px a la derecha para despejar el botón hamburguesa (44 px de ancho) en todos los layouts derivados. | `e76f767` |
| QA-CC-104 | **resuelto** | `CashCloses.tsx`: `aria-label` cambiado de `"Ver calendario de cierres"` (igual para las 8 filas) a `` `Ver cierres de ${item.user?.name ?? 'asesor'} del ${item.close_date}` `` — único por fila. | `32e7628` |
| QA-CC-105 | **resuelto** | `CashCloses.tsx`: `StatCard` cambió `h-[100px]` → `min-h-[100px]` para que el subtítulo pueda crecer. `CashCloseCalendar.tsx`: columnas de la tabla `ApprovedResumePanel` recibieron `min-w-[40px]` (#), `min-w-[90px]` (Fecha), `min-w-[130px]` (Total declarado, Efectivo contado), `min-w-[150px] whitespace-normal` (varianza) — el ancho mínimo activa el scroll horizontal del `overflow-x-auto` antes de recortar el texto. | `569427f` |
| QA-CC-106 | **resuelto** | `CustomerAttentionMatrix.tsx`: columnas Hombres/Mujeres/Niños recibieron `min-w-[90px] w-[90px]` asegurando anchos iguales y suficientes para el input `max-w-[120px]` con `px-3` de padding. | `308e7ad` |
| QA-CC-107 | **resuelto** | `PageLayout.tsx`: div del título cambió de `flex flex-col min-w-0 pr-4` a `flex flex-col min-w-0 flex-1 pr-4`. El `flex-1` previene que el contenedor colapse cuando el panel `actions` (DatePicker + Combobox) es ancho, eliminando el render de una letra/sílaba por línea. | `aefa30f` |
| QA-CC-108 | **resuelto** | `EntityTable.tsx`: `totalPages = Math.max(1, …)` evita el indicador "Página 1 de 0". `pagination.tsx`: botones "siguiente" y "última página" ahora tienen `disabled={currentPage >= totalPages}` en lugar de `=== totalPages`, deshabilitándose correctamente cuando no hay páginas. `DataTable.tsx`: div del empty state añade `text-center px-4 whitespace-normal` para evitar truncar el mensaje. | `42809e5` |
