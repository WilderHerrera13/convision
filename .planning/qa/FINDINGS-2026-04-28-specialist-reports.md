---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
api_url: http://localhost:8001
started: 2026-04-28T22:15:00-05:00
updated: 2026-04-28T22:45:00-05:00
roles_tested: [admin]
scope: /admin/specialist-reports — Branch filtering validation with 4 specialists across 4 branches
---

## Resumen ejecutivo

- Pantallas verificadas: 4 (Consolidado tab, Lista de reportes tab, Detalle especialista, Login admin)
- Hallazgos confirmados: 0
- Hipotesis / pendiente evidencia: 0
- Issues menores encontrados: 3
- Sin incidencias (lista): Consolidado + branch filter, Lista de reportes, Detalle especialista

### Test Data Setup

Se crearon 4 especialistas y 20 citas (5 por especialista, una sede distinta cada uno) con tipos de consulta variados para validar el filtrado por sede:

| Especialista | Email | Sede | Citas | Tipos |
|---|---|---|---|---|
| Specialist Demo (ID=2) | specialist@convision.com | Principal | 5 | effective×2, formula_sale×1, ineffective×1, follow_up×1 |
| Second Specialist (ID=4) | spec2@convision.com | Sede Sur | 5 | effective×1, formula_sale×1, ineffective×1, follow_up×1, warranty_follow_up×1 |
| Andres Bermudez (ID=9) | abermudez@convision.com | Sede Centro | 5 | formula_sale×2, ineffective×2, follow_up×1 |
| Sandra Torres (ID=10) | storres@convision.com | Sede Norte | 5 | effective×1, ineffective×2, follow_up×1, warranty_follow_up×1 |

### API Verification Results

El endpoint `GET /api/v1/specialist-reports/consolidated` responde correctamente con los filtros de sede:

| Filtro | Efectivas | Venta Formula | No Efectivas | Ctrl+Garantias | Especialistas |
|---|---|---|---|---|---|
| Todas (branch_id=0) | 4 | 4 | 6 | 4 | 4 |
| Principal (branch_id=1) | 2 | 1 | 1 | 1 | 1 |
| Sede Sur (branch_id=2) | 1 | 1 | 1 | 1 | 1 |
| Sede Centro (branch_id=3) | 0 | 2 | 2 | 1 | 1 |
| Sede Norte (branch_id=4) | 1 | 0 | 2 | 1 | 1 |

El endpoint `GET /api/v1/management-report` tambien responde correctamente con branch_id:
- `branch_id=1` → 5 appointments (Specialist Demo)
- `branch_id=2` → 5 appointments (Second Specialist)
- `branch_id=3` → 5 appointments (Andres Bermudez)
- `branch_id=4` → 5 appointments (Sandra Torres)

---

## Issues (FAIL / GAP)

### QA-SR-001
- Rol: admin
- URL: http://localhost:4300/admin/specialist-reports (tab "Lista de reportes")
- Severidad: menor
- Pasos:
  1. Login como admin
  2. Ir a /admin/specialist-reports
  3. Cambiar a la pestaña "Lista de reportes"
  4. Observar que no hay filtro de sede disponible
- Esperado: La pestaña "Lista de reportes" deberia incluir un filtro de sede (AdminBranchFilter), igual que la pestaña "Consolidado", para que el admin pueda filtrar los especialistas por sede.
- Observado: La pestaña "Lista de reportes" solo muestra un buscador de texto ("Buscar especialista...") pero no tiene selector de sede. El filtro de sede solo aparece en la pestaña "Consolidado".
- Evidencia: En `SpecialistManagementReport.tsx` linea 188: el filtro de sede (SearchableCombobox con sedeOptions) solo se renderiza dentro del bloque `{activeTab === 'consolidado' && (`
- Estado: confirmado

### QA-SR-002
- Rol: admin
- URL: http://localhost:4300/admin/specialist-reports (tab "Consolidado")
- Severidad: menor
- Pasos:
  1. Login como admin
  2. Ir a /admin/specialist-reports
  3. Abrir el dropdown de sede ("Todas (4)")
  4. Seleccionar "Sede Centro"
  5. Observar que el dropdown permanece abierto despues de seleccionar
- Esperado: El dropdown de sede deberia cerrarse automaticamente al seleccionar una opcion.
- Observado: El dropdown permanece expandido (states: [expanded]) despues de hacer clic en "Sede Centro", mostrando "Sede Centro" como selected pero con el panel de opciones aun visible.
- Evidencia: Snapshot del browser: `- role: button "Sede Centro" states: [active, focused, collapsed]` y `- role: combobox "Buscar sede..." states: [expanded]` visibles simultaneamente despues de seleccion.
- Estado: confirmado

### QA-SR-003
- Rol: admin
- URL: http://localhost:4300/admin/specialist-reports/2 (detalle de especialista)
- Severidad: menor
- Pasos:
  1. Login como admin
  2. Ir a /admin/specialist-reports
  3. Ir a pestaña "Lista de reportes"
  4. Hacer clic en "Specialist Demo"
  5. Observar la seccion "Periodo analizado"
- Esperado: "Periodo analizado" deberia mostrar el rango de fechas activo (ej. "15/04/2026 - 28/04/2026")
- Observado: "Periodo analizado" muestra "—" (guion) en lugar del rango de fechas. Los KPIs y registros se cargan correctamente.
- Evidencia: Snapshot del browser: `name: Periodo analizado ref: e13` seguido de `name: — ref: e14`
- Estado: confirmado

---

## OK (sin incidencias)

| Rol | Ruta | Notas |
|---|---|---|
| admin | /admin/dashboard | Login exitoso, redireccion correcta |
| admin | /admin/specialist-reports (Consolidado) | KPI cards correctos, 4 especialistas, tabla con observaciones, sin errores en consola |
| admin | /admin/specialist-reports (Consolidado) + filtro Principal | KPIs: E=2 F=1 I=1 FG=1, 1 especialista |
| admin | /admin/specialist-reports (Consolidado) + filtro Sede Sur | KPIs: E=1 F=1 I=1 FG=1, 1 especialista |
| admin | /admin/specialist-reports (Consolidado) + filtro Sede Centro | KPIs: E=0 F=2 I=2 FG=1, 1 especialista |
| admin | /admin/specialist-reports (Consolidado) + filtro Sede Norte | KPIs: E=1 F=0 I=2 FG=1, 1 especialista |
| admin | /admin/specialist-reports (Consolidado) + filtro Specialist Demo + Sede Norte | 0 resultados (correcto: no hay cruce) |
| admin | /admin/specialist-reports (Lista de reportes) | 4 tarjetas de especialistas visibles, buscador de texto funcional |
| admin | /admin/specialist-reports/2 (Detalle Specialist Demo) | KPIs correctos (E=2 F=1 I=1 FU=1 WF=0), 14 registros |
| admin | API /api/v1/specialist-reports/consolidated | Todos los filtros branch_id funcionan correctamente |
| admin | API /api/v1/management-report | branch_id filtra correctamente las citas |

---

## Handoff al agente de correccion

- **Recomendado:** regla `convision-qa-gap-fixer`
- **Comando sugerido:** "Con `@convision-qa-gap-fixer`, cerrar QA-SR-001 y QA-SR-002 usando este FINDINGS como fuente."

### Detalle de correcciones sugeridas:

**QA-SR-001** — Agregar filtro de sede en pestaña "Lista de reportes":
- En `SpecialistManagementReport.tsx`, mover el SearchableCombobox de sede fuera del bloque `activeTab === 'consolidado'` o agregarlo tambien en el bloque de "lista"
- Asegurar que el queryKey del useQuery de especialistas incluya selectedSedeId para refetch al cambiar de sede

**QA-SR-002** — Cerrar dropdown al seleccionar:
- Verificar si SearchableCombobox tiene prop para cerrar automaticamente (onChange deberia cerrar el popover)
- Posible fix en el componente SearchableCombobox: llamar setOpen(false) en el handler de seleccion

**QA-SR-003** — Mostrar periodo analizado en detalle:
- En `SpecialistManagementReportDetail.tsx`, el endpoint ya recibe `from` y `to` como query params, pero el frontend no los envia (solo envia `page` y `per_page`)
- Agregar `from` y `to` a la llamada API en `specialistReportService.getSpecialistDetail()` y mostrar el rango en la UI

---

## Re-validacion 2026-04-28 22:47

Backend reiniciado (`make build` + `./bin/convision-api`). Frontend en `localhost:4300`.

### QA-SR-001 — ✅ FIXED

- La pestaña "Lista de reportes" ahora incluye el filtro de sede (SearchableCombobox "Todas (4)")
- El boton "Todas (4)" aparece como `ref=e15` con `states: [collapsed]`
- Al seleccionar "Sede Centro", la lista se filtra correctamente mostrando solo "Andres Bermudez"
- El texto de cabecera muestra "1 especialistas · 15/04/2026 – 28/04/2026"
- **Evidencia**: Snapshot del browser confirma presencia del filtro y filtrado correcto

### QA-SR-002 — ✅ FIXED

- Al seleccionar "Sede Centro" en el dropdown de sede en la pestaña "Lista de reportes", el dropdown se cierra automaticamente
- Estado final del boton: `"Sede Centro" states: [active, focused, collapsed]`
- El combobox de busqueda ("Buscar sede...") ya no es visible despues de que los datos cargan
- **Nota**: Durante la carga de datos, el combobox aparece brevemente como `[expanded]`, pero se cierra al completar el fetch
- **Evidencia**: Snapshot del browser post-carga muestra dropdown cerrado

### QA-SR-003 — ✅ FIXED

- Navegacion a `/admin/specialist-reports/9?from=2026-04-15&to=2026-04-28`
- La URL ahora incluye los query params `from` y `to`
- "Periodo analizado" muestra "15/04/2026 – 28/04/2026" (antes mostraba "—")
- Datos de Andres Bermudez (Sede Centro): E=0, F=2, I=2, FU=1, WF=0 — correctos
- Registros: "Mostrando 1 – 5 de 5 registros" — correcto
- **Evidencia**: Snapshot del browser confirma todo lo anterior

### Veredicto final

Los 3 issues reportados en la exploracion original han sido corregidos. El flujo de reporte de especialista con filtrado por sede funciona correctamente en ambas pestañas (Consolidado y Lista de reportes), y la pagina de detalle muestra el periodo analizado.
