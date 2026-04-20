---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
started: 2026-04-19T21:16:22Z
updated: 2026-04-19T22:10:00Z
roles_tested: [admin]
scope: "/admin/cash-closes — tab Consolidado (filtros + tablas + KPIs + reconciliación)"
fixes_applied: 2026-04-19
---

## Resumen ejecutivo

- Pantallas verificadas: 1 (`/admin/cash-closes` tab **Consolidado**) + endpoint API `GET /api/v1/cash-register-closes-consolidated`.
- Hallazgos confirmados: **9** (3 bloqueantes/mayores de semántica de datos, 1 mayor funcional, 1 mayor visual, 4 menores UX/i18n).
- Hipótesis pendientes evidencia: 0.
- Sin incidencias: filtros de presets temporales (Hoy/7d/14d/Mes), navegación a detalle por asesor, validación de la API (422 fecha inválida, 403 sin rol admin).

**Resumen de los datos contra los que se validó** (rango 2026-04-06..19, admin, BD seed):

| Cierres | Status | total_counted | total_actual_amount | admin_actuals_recorded_at |
|--|--|--|--|--|
| id=8 | submitted | 9.000 | — | — |
| id=7 | draft | 50.000 | — | — |
| id=6 | draft | 50.000 | — | — |
| id=5 | approved | 250.000 | 420.000 | 2026-04-19 |
| id=4 | approved | 460.000 | 450.000 | 2026-04-19 |
| id=3 | submitted | 1.300.000 | — | — |
| id=1 | draft | 350.000 | 350.000 | NULL |
| id=2 | approved | 280.000 | 280.000 | NULL |

Y la respuesta del endpoint:

```json
{ "kpis": { "total_closes": 8, "total_declared": 2749000, "total_counted": 870000,
            "net_variance": 160000, "variance_pct": 5.82, "advisors_count": 1, "days_in_period": 14 },
  "breakdown": { "approved_count": 3, "approved_total": 990000, "approved_pct": 37.5,
                 "pending_count": 2, "pending_total": 1309000,
                 "with_variance_count": 2, "net_variance": 160000 } }
```

## Hallazgos (FAIL / GAP)

### QA-CC-001 — Semántica inconsistente: "Total declarado" vs "Efectivo contado" miden universos distintos
- Estado: **resuelto** — `service.go`: cierres no reconciliados ahora usan el `declared` como proxy de `counted`, haciendo ambos KPIs del mismo universo. `total_counted` y `total_declared` son siempre coherentes; la diferencia entre ellos refleja exactamente `net_variance`.
- Verificado: `total_declared=2749000`, `total_counted=2909000`, `net_variance=160000` ✓
- Rol: admin
- URL: http://localhost:4300/admin/cash-closes (tab Consolidado)
- Severidad: **bloqueante** (decisión gerencial sobre datos engañosos)
- Pasos:
  1. Login admin, abrir tab Consolidado, preset "Mes" o "14d".
  2. Comparar visualmente las 4 KPIs.
- Esperado: ambos KPIs (`Total declarado` y `Efectivo contado`) deben venir del mismo universo de cierres para que su diferencia sea coherente. Si el "contado" sólo cubre cierres conciliados, entonces el "declarado" del mismo card debe filtrarse igual; o bien marcar explícitamente la cobertura.
- Observado:
  - `Total declarado = $2.749.000` = sumatoria de `total_counted` de **los 8 cierres** (incluye 3 drafts + 2 submitted + 3 approved).
  - `Efectivo contado = $870.000` = sumatoria de `total_actual_amount` SÓLO de los 2 cierres con `admin_actuals_recorded_at IS NOT NULL` (id=4, id=5).
  - El usuario lee un "faltante" ficticio de **$1.879.000** que no existe (los $1.879.000 son simplemente cierres aún no conciliados por el admin).
- Evidencia: `convision-api-golang/internal/cashclose/service.go` lines 718-734 y 815-818 (`totalCounted` sólo se suma si `hasRecon`; `totalDeclared` siempre se suma; fallback a `totalDeclared` cuando counted=0 contradice cuando hay parcialmente reconciliados).
- Estado: confirmado.
- Recomendación: o bien (a) calcular ambos sólo sobre cierres reconciliados, o (b) renombrar `Efectivo contado` a `Efectivo conciliado` y agregar un sub-tile `Pendiente de conciliar = $1.879.000`, o (c) sumar `total_counted` (declarado por advisor) cuando no haya `total_actual_amount` para mantener simetría.

### QA-CC-002 — `variance_pct` usa denominador inconsistente con `net_variance`
- Estado: **resuelto** — `service.go`: `pct` ahora usa `reconDeclared` (suma del `declared` sólo de cierres con `admin_actuals_recorded_at != nil`) como denominador. `variance_pct=22.54%` (160000/710000) en lugar de `5.82%`. ✓
- Rol: admin
- URL: http://localhost:4300/admin/cash-closes (tab Consolidado, KPI "Diferencia neta")
- Severidad: **mayor**
- Pasos: ver KPI "Diferencia neta" → muestra `$ 160.000` y debajo `5.820% del total declarado`.
- Esperado: si `net_variance` se calcula sólo sobre cierres reconciliados (`160.000`), el porcentaje debe usar el **declarado de ese mismo subconjunto** (`710.000`) → `22.54%`. O usar el universo completo en ambos.
- Observado: `pct = 160.000 / 2.749.000 = 5.82%` — mezcla numerador (universo conciliado) con denominador (universo total), produciendo un % artificialmente bajo que oculta la magnitud real de la varianza.
- Evidencia: `service.go` líneas 806-809 (`pct = (netVariance / totalDeclared) * 100`).
- Estado: confirmado.

### QA-CC-003 — `Diferencia neta` positiva (sobrante) se renderiza como alerta roja sin signo
- Estado: **resuelto** — `CashClosesConsolidated.tsx`: KPI ahora muestra prefijo `+` para sobrantes con `accentColor`/`valueColor` verde `#228b52`, rojo solo para faltantes. ✓
- Rol: admin
- URL: http://localhost:4300/admin/cash-closes (tab Consolidado, KPI "Diferencia neta")
- Severidad: **mayor**
- Pasos: con datos seed (admin contó $870k, advisor declaró $710k → variance = +160k), observar el KPI.
- Esperado: para un sobrante positivo, color neutro o verde y mostrar prefijo `+` (ej. `+$ 160.000` con `5.82% sobrante`).
- Observado: se muestra `$ 160.000` (sin signo) en color rojo `#b82626` y subtítulo neutro `5.820% del total declarado`. La leyenda al pie dice "positivo = sobrante" pero el card lo trata visualmente como falla.
- Evidencia: `CashClosesConsolidated.tsx` líneas 226-240 (`accentColor` y `valueColor` rojos cuando `net_variance !== 0`, sin distinguir signo); `Money` muestra el negativo, pero positivos se muestran sin `+`.
- Estado: confirmado.

### QA-CC-004 — Convención de signos contradictoria entre el header de tabla y la leyenda lateral
- Estado: **resuelto** — Header corregido a `(+) Sobra (-) Falta`, leyenda lateral actualizada a `(+) Sobra (-) Falta` con descripción "Positivo = sobra; negativo = falta". Única convención en toda la vista. ✓
- Rol: admin
- URL: http://localhost:4300/admin/cash-closes (tab Consolidado, sección "Detalle de conciliación")
- Severidad: **mayor**
- Pasos: comparar el header `(-) Sobra (+) Falta` con el bloque "Cómo leer este panel" → "Diferencia: ... En negativo = falta; en positivo = sobrante".
- Esperado: una única convención de signos.
- Observado: el header dice `(-) = sobra` (negativo = sobrante), la leyenda dice `(-) = falta` (negativo = falta). Para id=5 (variance = +170.000) el front lo pinta en negro/normal (tratando como sobrante OK) coincidiendo con la leyenda → entonces el header está al revés.
- Evidencia: `CashClosesConsolidated.tsx` líneas 293, 396 (header) vs líneas 454-457 y 466-469 (legend).
- Estado: confirmado.

### QA-CC-005 — Botón "Personalizado" del rango no abre selector de fechas
- Estado: **resuelto** — `CashClosesConsolidated.tsx`: al activar preset `custom`, los dos `<div>` estáticos se reemplazan por `<input type="date">` controlados con `handleCustomDate`. El rango se valida (from ≤ to). ✓
- Rol: admin
- URL: http://localhost:4300/admin/cash-closes (tab Consolidado, barra "Rango")
- Severidad: **bloqueante** (filtro principal anunciado pero no funcional)
- Pasos:
  1. Click en preset "Personalizado".
  2. Intentar elegir una fecha diferente (click en `06/apr/2026` o `19/apr/2026`).
- Esperado: al activar "Personalizado" debe aparecer un date-picker (popover) sobre los dos chips de fecha; el rango debe poder ajustarse manualmente.
- Observado: el botón "Personalizado" sólo cambia su estilo activo. Los dos chips de fecha son `<div>` no interactivos (no son inputs). No hay UI para elegir un rango personalizado. Equivale a tener "14d" con otro nombre.
- Evidencia: `CashClosesConsolidated.tsx` líneas 138-143 y 164-172 (handlePreset omite "custom"; el render usa divs sin `onClick`/`type=button`).
- Estado: confirmado.

### QA-CC-006 — Cards y tablas se cortan horizontalmente; aparece scroll horizontal
- Estado: **resuelto** — `KpiCard` usa `min-w-0 flex-1` y `truncate text-[20px]`. Ambas tablas (asesores y reconciliación) envueltas en `overflow-x-auto` + `min-w-[900px]`/`min-w-[700px]` respectivamente para evitar colapso de columnas. ✓
- Rol: admin
- URL: http://localhost:4300/admin/cash-closes (tab Consolidado)
- Severidad: **mayor** visual/UX
- Pasos: abrir la vista en un viewport de ~800-1100px (sidebar expandido o ancho de notebook común).
- Esperado: el contenido debe ser responsivo; los KPIs y tablas no se deben truncar.
- Observado:
  - KPIs muestran `$ 2.74` (cortado, debería ser `$ 2.749.000`), `$ 870` (cortado), `$ 160` (cortado) y subtítulos invisibles.
  - Tabla "Consolidado por asesor": columna "Asesor" muestra solo "...Demo", encabezado "Total d..." en lugar de "Total declarado", el ojo de "Acciones" queda fuera de pantalla.
  - Aparece scrollbar horizontal en el contenedor principal.
- Evidencia: el grid usa `minmax(220px,2fr)_80px_140px_140px_120px_140px_120px_80px` (~1080px mínimo) más el sidebar; cards son `flex-1` con texto `text-[24px]` que no se ajusta. Capturas en `.playwright-mcp/page-2026-04-19T21-18-*` y `21-20-*`.
- Estado: confirmado.

### QA-CC-007 — Estado de carga inconsistente en breakdown cards (flashea 0)
- Estado: **resuelto** — `BreakdownCard` recibe prop `isLoading` y muestra `—` en lugar de `0` durante la carga. ✓
- Rol: admin
- URL: http://localhost:4300/admin/cash-closes (tab Consolidado)
- Severidad: menor (UX)
- Pasos: cambiar de preset (p. ej. "Mes" → "Hoy") y observar el primer frame.
- Esperado: durante `isLoading`, todas las cifras deben ocultarse o mostrar skeleton/placeholder consistente.
- Observado: KPIs muestran `—` mientras cargan ✅, pero las **3 BreakdownCards muestran `0` y "$ 0 conciliados / $ 0 por aprobar / $ 0 neto acumulado"** durante `isLoading`. Eso aparenta "no hay nada" hasta que llegan los datos reales.
- Evidencia: `CashClosesConsolidated.tsx` líneas 244-277 (los `BreakdownCard` reciben `data?.breakdown.X ?? 0` sin chequear `isLoading`).
- Estado: confirmado.

### QA-CC-008 — Pluralización incorrecta en métricas
- Estado: **resuelto** — Helper `pl(n, singular, plural)` aplica lógica de plural en barra de rango y sub de KPI "Cierres del período". `1 día · 1 asesor`, `14 días · 1 asesor`, etc. ✓
- Rol: admin
- URL: http://localhost:4300/admin/cash-closes (tab Consolidado)
- Severidad: menor (UX)
- Pasos: preset "Hoy" o "14d".
- Esperado: gramática singular cuando aplica.
- Observado:
  - `1 días · 1 asesores` en preset "Hoy" → debería ser `1 día · 1 asesor`.
  - `14 días · 1 asesores` en preset "14d" → `14 días · 1 asesor`.
  - Aparece tanto en el subtítulo del cabezal de rango (línea 196) como en el sub del KPI "Cierres del período" (línea 207).
- Evidencia: `CashClosesConsolidated.tsx` líneas 196 y 207 (interpolación sin lógica de plural).
- Estado: confirmado.

### QA-CC-009 — La tabla "Detalle de conciliación por cierre" omite columnas claves: fecha, asesor, ID y estado
- Estado: **resuelto** — Tabla de reconciliación expandida a 8 columnas: `# Cierre`, `Fecha`, `Asesor`, `Estado`, `Total declarado`, `Efectivo contado`, `Diferencia`, `(+) Sobra (-) Falta`. Usa los campos `id`, `close_date`, `user_name`, `status` que ya retornaba `ConsolidatedReconRow`. ✓
- Rol: admin
- URL: http://localhost:4300/admin/cash-closes (tab Consolidado, panel inferior)
- Severidad: mayor (utilidad)
- Pasos: abrir el panel "Detalle de conciliación por cierre".
- Esperado: para auditoría de varianzas, cada fila debe incluir al menos `fecha`, `asesor`, `# cierre` y `estado` (la API ya los retorna en `reconciliation[]`: `id`, `close_date`, `user_name`, `status`).
- Observado: el render sólo expone 4 columnas numéricas (`Total declarado`, `Efectivo contado`, `Diferencia`, `(-) Sobra (+) Falta`). El admin no puede saber a qué cierre corresponde cada fila. Además, la fila de totales suma manualmente en el front (cliente) en vez de usar el agregado del backend.
- Evidencia: `CashClosesConsolidated.tsx` líneas 392-417 (tabla) vs `service.go` líneas 770-781 (`ConsolidatedReconRow` que ya trae `id`, `close_date`, `user_name`, `status` sin usar).
- Estado: confirmado.

## OK (sin incidencias)

| Rol | Ruta / interacción | Notas |
|-----|--------------------|--------|
| admin | `/admin/cash-closes` (carga inicial) | Tab "Consolidado" carga por defecto y queda primera ✅ |
| admin | Preset "Hoy" | Refetch correcto, KPIs cambian (8 → 6 cierres del día) |
| admin | Preset "7d" | Funciona |
| admin | Preset "14d" | Funciona |
| admin | Preset "Mes" | Funciona, `days_in_period=19` (Apr 1-19) |
| admin | Click "Ver" (fila asesor) | Navega a `/admin/cash-closes/advisor/3` ✅ |
| admin | Tab "Todos los cierres" / "Por asesor" | Siguen funcionando (no son alcance pero verificadas en sidebar) |
| admin | API `GET ...consolidated?date_from=bad...` | 422 con mensaje claro |
| admin | API rango invertido (from > to) | Se intercambia automáticamente, días positivos |
| admin | API sin params | Defaults a últimos 14 días |
| receptionist | API `consolidated` | 403 forbidden ✅ guardrail correcto |
| consola | navegador en `/admin/cash-closes` | Sin errores JS (solo logs Vite/React) |

## Handoff al agente de corrección

- **Recomendado**: regla `convision-qa-gap-fixer` con este FINDINGS como entrada.
- **Comando sugerido**: 
  > "Con `@convision-qa-gap-fixer`, cerrar QA-CC-001..QA-CC-009 usando `.planning/qa/FINDINGS-2026-04-19-cash-close-consolidated.md` como fuente. Priorizar QA-CC-001, QA-CC-005, QA-CC-006 (bloqueantes/mayores)."

### IDs por prioridad sugerida
- **Bloqueantes**: QA-CC-001 (semántica de KPIs), QA-CC-005 (rango personalizado no funcional).
- **Mayores**: QA-CC-002 (% varianza inconsistente), QA-CC-003 (signo/color de sobrante), QA-CC-004 (convenciones de signo contradictorias), QA-CC-006 (responsive cards/tabla), QA-CC-009 (columnas faltantes en reconciliación).
- **Menores**: QA-CC-007 (loading state breakdown), QA-CC-008 (pluralización).
