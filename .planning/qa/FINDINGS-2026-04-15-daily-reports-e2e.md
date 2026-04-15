---
status: complete
resolved: 2026-04-15
scope: daily-reports-e2e
app: convision-front
api: convision-api
base_url: http://localhost:4300
date: 2026-04-15
roles_tested: [admin con acceso a rutas recepción]
---

# QA E2E — Reportes diarios (recepción → admin)

## Contexto

Exploración según **`$gsd-qa-explore`**, centrada en el flujo **reporte diario de gestión**: formulario recepción, historial recepción, módulo admin **Reportes Diarios**.

**Nota de sesión:** El navegador de pruebas mantenía JWT de **`admin@convision.com`**. Las rutas bajo **`/receptionist/*`** cargaron con **layout de recepción** (sidebar recepción) cuando el router lo permite para admin — no se repitió login como `receptionist@convision.com` en esta pasada. Los resultados API se contrastaron con `curl` (listado paginado).

---

## Resumen ejecutivo

| Resultado | Detalle |
|-----------|---------|
| **Flujo guardado → visible en admin** | **OK confirmado:** observación escrita en formulario recepción apareció en el **Sheet** de **Admin → Reportes Diarios** (detalle del mismo reporte, asesor "Receptionist User"). |
| **Historial recepción → detalle** | **OK:** botón **"Ver detalle del reporte"** abre panel lateral; cierre con **Close**. |
| **API** | **OK:** `GET /api/v1/daily-activity-reports` devuelve `data[]` con `atencion`, `operaciones`, `user`. |
| **Bloqueantes** | 0 |

---

## Casos verificados (navegador + API)

1. **`/receptionist/daily-report`** — Formulario carga (fecha, jornada, secciones Atención / Operaciones / Redes). **Guardar Reporte** tras completar observaciones: botón entra en estado deshabilitado durante guardado (feedback de envío).
2. **`/receptionist/daily-report-history`** — Tabla con columnas y filas; **Ver detalle del reporte** abre **Sheet** (sin `alert`).
3. **`/admin/daily-reports`** — Filtros Desde/Hasta, Asesor, Jornada; tabla; clic en botón de acciones de fila abre **Sheet** con título `Reporte: {Asesor} — {fecha}`, secciones Atención / Operaciones / Redes, **Observaciones** con el texto de prueba **"QA E2E: observación de prueba"** (coherencia punta a punta).
4. **`curl`** — Token admin: listado no vacío; ítem ejemplo `id: 1`, `user.name` Receptionist.

---

## Hallazgos

### QA-E2E-DR-001 — menor / accesibilidad — **RESUELTO**

- **Rol:** admin  
- **URL:** `http://localhost:4300/admin/daily-reports`  
- **Título:** Botón de ver detalle en tabla sin nombre accesible  
- **Severidad:** menor  
- **Observado (antes):** En el árbol de accesibilidad el botón de acciones aparecía como `button` sin `name` (solo ícono ojo).  
- **Corrección:** `aria-label="Ver detalle del reporte"` en el `Button` de la columna Acciones en `convision-front/src/pages/admin/DailyReports.tsx`.  
- **Estado:** resuelto  

### QA-E2E-DR-002 — nota de producto (no regresión)

- **Título:** Admin navegando rutas `/receptionist/...`  
- **Observado:** Con sesión admin, las URLs de recepción muestran **UI de recepción** (menú recepción, labels morados).  
- **Severidad:** informativa — validar si es política deseada (soporte / pruebas) o restringir navegación.  

---

## OK explícito (sin incidencia)

| Paso | Evidencia |
|------|-----------|
| Datos del reporte visibles en admin tras guardar en formulario tipo recepción | Sheet admin muestra observaciones de prueba |
| Historial recepción abre detalle | Sheet + botón nombrado |
| Listado API | JSON con reporte y usuario asesor |

---

## Handoff

- ~~**QA-E2E-DR-001**~~ — aplicado en código (ver arriba).  
- **Cierre de fase E2E:** El flujo funcional **registro → consulta admin** queda **validado** en esta sesión.

---

## Referencias

- Mapa: `docs/QA_MAPA_EXPLORACION.md`  
- FINDINGS general previo: `.planning/qa/FINDINGS-2026-04-14.md` (varios ítems ya corregidos en código posterior).
