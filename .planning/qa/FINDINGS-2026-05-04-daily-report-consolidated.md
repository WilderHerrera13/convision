---
status: complete
app: convision-front
api: convision-api-golang (Go)
base_url: http://localhost:4300
started: 2026-05-04T19:02:00-05:00
updated: 2026-05-04T19:18:00-05:00
roles_tested: [admin, specialist]
scope: Specialist daily report flow — data entered by specialist correctly presented to admin consolidated view with working filters at admin/specialist-reports
---

## Resumen ejecutivo

- Pantallas verificadas: 5 (login, /admin/specialist-reports Consolidado, /admin/specialist-reports Lista de reportes, /admin/specialist-reports/2 detalle specialist, /admin/daily-reports)
- Hallazgos confirmados: 5
- Hipotesis / pendiente evidencia: 0
- Sin incidencias: 11 items OK

## Hallazgos (FAIL / GAP)

### QA-001 — Specialist login fails — frontend redirects to error pages

- Rol: specialist
- URL: http://localhost:4300/login (intentando login como specialist@convision.com)
- Severidad: bloqueante
- Pasos:
  1. Navegar a /login
  2. Ingresar specialist@convision.com / password
  3. Click en Ingresar
- Esperado: Redireccion al dashboard de specialist (/specialist/dashboard)
- Observado: El API login responde 200 con JWT valido (rol "specialist"). El frontend primero navega a /specialist/daily-report y /specialist/daily-report/history, pero ErrorPage.tsx muestra "Error encountered: null" en linea 38, y eventualmente redirige a /unauthorized con "403 Acceso Denegado".
- Evidencia:
  - API: `POST /api/v1/auth/login` con specialist@convision.com retorna token JWT valido con role "specialist"
  - Consola: `ErrorPage.tsx:38` - "Error encountered: null" en http://localhost:4300/specialist/daily-report y /specialist/daily-report/history
  - URL final: http://localhost:4300/unauthorized con mensaje "403 Acceso Denegado — No tienes los permisos necesarios para acceder a esta pagina"
- Estado: confirmado

### QA-002 — Pagination text incorrecta — "Mostrando 1–0 de 0 especialistas"

- Rol: admin
- URL: http://localhost:4300/admin/specialist-reports (tab Consolidado)
- Severidad: menor
- Pasos:
  1. Navegar a /admin/specialist-reports como admin
  2. Observar el texto de paginacion en la seccion "Consultas por tipo y especialista" cuando no hay datos
- Esperado: "Mostrando 0 de 0 especialistas" o "No hay especialistas"
- Observado: Muestra "Mostrando 1– 0 de 0 especialistas". El rango "1–0" es semanticamente incorrecto y confuso.
- Evidencia: Snapshot del DOM: `name: "Mostrando 1– 0 de 0 especialistas"` (ref e26)
- Estado: confirmado

### QA-003 — Specialist count muestra 0 inicialmente (flash de estado incorrecto)

- Rol: admin
- URL: http://localhost:4300/admin/specialist-reports (tab Consolidado)
- Severidad: menor
- Pasos:
  1. Navegar a /admin/specialist-reports
  2. Observar el contador de especialistas y el filtro al cargar
- Esperado: Mostrar el numero correcto de especialistas (4) desde el inicio, o un skeleton/loading state consistente
- Observado: El texto muestra "0 especialistas" y el filtro de especialista muestra "Todos (0)" durante la carga inicial. Luego se actualiza a "4 especialistas" y "Todos (4)". Esto causa un flash de estado incorrecto visible para el usuario.
- Evidencia:
  - Snapshot inicial: `name: "0 especialistas"` y `name: "Todos (0)"`
  - Snapshot post-carga: `name: "4 especialistas"` y `name: "Todos (4)"`
- Estado: confirmado

### QA-004 — Boton duplicado "Specialist Demo" en barra de filtros

- Rol: admin
- URL: http://localhost:4300/admin/specialist-reports (tab Consolidado)
- Severidad: menor
- Pasos:
  1. Expandir filtro de especialista
  2. Seleccionar "Specialist Demo"
  3. Cerrar el dropdown (Escape)
  4. Observar la barra de filtros
- Esperado: Solo un boton/badge con "Specialist Demo" visible
- Observado: Aparecen dos botones: ref e13 (el filtro collapsed "Specialist Demo") y ref e34 (un duplicado adicional "Specialist Demo"). Esto indica un bug de renderizado donde el valor seleccionado se renderiza dos veces.
- Evidencia: Snapshot DOM muestra ambos: `ref: e13 name: "Specialist Demo"` y `ref: e34 nth: 1 name: "Specialist Demo"`
- Estado: confirmado

### QA-005 — Sin datos de consultas clinicas para validar el flujo completo

- Rol: admin
- URL: http://localhost:4300/admin/specialist-reports (ambas tabs)
- Severidad: sugerencia
- Pasos:
  1. Verificar API `/api/v1/specialist-reports/consolidated` con rango amplio de fechas
  2. Verificar que el reporte se genera a partir de appointments con `consultation_type` definido
- Esperado: Existencia de datos de prueba (appointments completados con clinical records) para validar el flujo end-to-end
- Observado: La API retorna `"kpis": { "effective": 0, "formula_sale": 0, "ineffective": 0, "follow_up": 0, "warranty_follow_up": 0 }` y `"rows": []` para cualquier rango de fechas. El query SQL en `GetConsolidatedReport` requiere `consultation_type IS NOT NULL AND consultation_type != ''` en la tabla appointments, pero no existen appointments con estos campos poblados en la BD de desarrollo.
- Evidencia:
  - API response: `"specialists_count": 0, "rows": [], "kpis": { all zeros }`
- Estado: confirmado

## OK (sin incidencias)

| Rol | Ruta | Notas |
|-----|------|--------|
| admin | /admin/specialist-reports | Carga correcta, sidebar admin completo visible, sin errores en consola |
| admin | /admin/specialist-reports (tab Consolidado) | KPI cards (Consultas Efectivas, Venta Formula, No Efectivas, Control y Garantias) renderizados correctamente |
| admin | /admin/specialist-reports (tab Consolidado) | Seccion "Consultas por tipo y especialista" con tabs Efectivas/No efectivas/Controles presente |
| admin | /admin/specialist-reports (tab Lista de reportes) | Muestra "Medicos con reportes de gestion" con lista de 4 especialistas (Specialist Demo, Leidys Dayana Escobar Oliveros, Lina Maria De Hoyos Perez, Usuario Externo) |
| admin | /admin/specialist-reports (filtro fecha Hoy) | Al click en "Hoy", fechas cambian correctamente a 04/05/2026 - 04/05/2026 |
| admin | /admin/specialist-reports (botones rapidos) | Botones 7d, 14d, Mes, Personalizado presentes en la UI |
| admin | /admin/specialist-reports (filtro especialista) | SearchableCombobox expande correctamente con 4 especialistas + opcion "Todos (4)" + busqueda "Buscar especialista..." |
| admin | /admin/specialist-reports (filtro sede) | SearchableCombobox expande correctamente con 11 sedes + opcion "Todas (11)" + busqueda "Buscar sede..." |
| admin | /admin/specialist-reports/:id | Navegacion a detalle de especialista funciona (/admin/specialist-reports/2?from=...&to=...) con KPIs individuales y seccion "Registro de atenciones" |
| admin | /admin/specialist-reports (network) | API calls retornan HTTP 200 (consolidated, specialists/:id) |
| admin | /admin/specialist-reports (consola) | Sin errores JavaScript en consola durante la navegacion |

## Handoff al agente de correccion

- IDs para cerrar: QA-001 (bloqueante), QA-002, QA-003, QA-004, QA-005
- Ruta de este archivo: `.planning/qa/FINDINGS-2026-05-04-daily-report-consolidated.md`
- Recomendado: usar regla `convision-qa-gap-fixer` o `convision-qa-fixer` con este archivo como fuente
- Comando sugerido: "Con @convision-qa-gap-fixer, cerrar QA-001, QA-002, QA-003, QA-004 usando este FINDINGS como fuente. Para QA-005, crear datos de prueba (appointments con consultation_type) via API o seeder."

### Notas adicionales para el corrector

1. **QA-001 (bloqueante):** El specialist@convision.com tiene JWT valido del backend Go pero el frontend falla en las paginas de specialist. Posiblemente relacionado con el manejo del rol en el frontend (App.tsx allowedRoles) o las rutas del specialist layout.
2. **QA-002:** La paginacion usa un formato `start-end de total` donde `start=1, end=0` cuando `total=0`. El componente de paginacion deberia manejar el caso `total === 0`.
3. **QA-003:** El estado inicial del filtro y contador deberia reflejar "cargando..." en lugar de mostrar "0".
4. **QA-004:** Posible renderizado duplicado del valor seleccionado en el SearchableCombobox del filtro de especialista.
5. **QA-005:** El `GetConsolidatedReport` requiere appointments con `consultation_type` no nulo. Se necesitan crear appointments completados con clinical records para validar el flujo end-to-end. Alternativamente, se puede verificar con datos via API directa.
