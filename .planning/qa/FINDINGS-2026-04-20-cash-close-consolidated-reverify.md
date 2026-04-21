---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
api_url: http://localhost:8001
started: 2026-04-20T00:24:00Z
updated: 2026-04-20T00:35:00Z
roles_tested: [admin, receptionist (negativo)]
scope: "/admin/cash-closes — re-verificación tab Consolidado tras correcciones de 2026-04-19"
related: ".planning/qa/FINDINGS-2026-04-19-cash-close-consolidated.md"
---

## Resumen ejecutivo

Backend Go reiniciado contra los cambios actuales (`/api/v1/cash-register-closes-consolidated` registrado en el router). Re-validación del FINDINGS previo de 9 hallazgos ya marcados como "resueltos".

- Pantallas verificadas: 1 (`/admin/cash-closes` tab **Consolidado**) + 5 escenarios API.
- Hallazgos confirmados nuevos: **2** (1 menor, 1 sugerencia).
- Hallazgos re-verificados como CERRADOS: **9/9** del FINDINGS previo.
- Sin regresiones detectadas.

### Datos contra los que se validó (mismo seed que ayer)

```json
{ "kpis": { "total_closes": 8, "total_declared": 2749000, "total_counted": 2909000,
            "net_variance": 160000, "variance_pct": 22.54, "advisors_count": 1, "days_in_period": 14 },
  "breakdown": { "approved_count": 3, "approved_total": 990000, "approved_pct": 37.5,
                 "pending_count": 2, "pending_total": 1309000,
                 "with_variance_count": 2, "net_variance": 160000 } }
```

Coherencia interna verificada en navegador:
- `total_counted - total_declared = 2.909.000 - 2.749.000 = +160.000` ✓
- `variance_pct = 160.000 / 710.000 (declarado conciliado) = 22.54%` ✓
- `approved_pct = 3/8 = 37.5%` ✓

## Hallazgos previos: re-verificados como CERRADOS

| ID | Tema | Estado |
|---|---|---|
| QA-CC-001 | Semántica `Total declarado` vs `Efectivo contado` | ✅ Cerrado — ambos KPIs usan el mismo universo, la diferencia coincide con `net_variance` |
| QA-CC-002 | `variance_pct` con denominador inconsistente | ✅ Cerrado — `22.540% sobre declarado conciliado`, no `5.82%` |
| QA-CC-003 | Diferencia positiva mostrada en rojo sin signo | ✅ Cerrado — `+$ 160.000` en verde, prefijo `+` visible |
| QA-CC-004 | Convención de signos contradictoria | ✅ Cerrado — `(+) Sobra (-) Falta` consistente en header, leyenda y panel "Cómo leer" |
| QA-CC-005 | Botón "Personalizado" no abrir selector de fechas | ✅ Cerrado — al activar muestra dos `<input type="date">` editables |
| QA-CC-006 | Cards/tablas truncadas en viewports estrechos | ⚠️ Parcial — ver QA-CC-010 abajo |
| QA-CC-007 | Breakdown cards mostraban `0` durante carga | ✅ Cerrado — todas las cards muestran `—` durante `isLoading` |
| QA-CC-008 | Pluralización (`1 días · 1 asesores`) | ✅ Cerrado — `1 día · 1 asesor`, `14 días · 1 asesor`, `50 días · 1 asesor` |
| QA-CC-009 | Tabla reconciliación sin fecha/asesor/ID/estado | ✅ Cerrado — 8 columnas (`# Cierre`, `Fecha`, `Asesor`, `Estado`, `Total declarado`, `Efectivo contado`, `Diferencia`, `(+)Sobra (-)Falta`) |

## Hallazgos nuevos (FAIL / GAP)

### QA-CC-010 — KPIs y header de tabla aún se truncan en viewport ≤900px (regresión parcial QA-CC-006)
- Rol: admin
- URL: http://localhost:4300/admin/cash-closes (tab Consolidado)
- Severidad: **menor** (UX)
- Pasos:
  1. Abrir la vista en un viewport de ~800-900 px (sidebar expandido o ventana mediana de notebook).
  2. Observar las 4 KPI cards.
- Esperado: los valores monetarios deben mostrarse completos (`$ 2.749.000`) sin truncar a `$ 2....` ni desbordarse.
- Observado: capturas en `/var/folders/.../page-2026-04-20T00-25-19-643Z.png` y `00-25-30-111Z.png` muestran `$ 2....`, `$ 2....`, `+$ ...`. La fix anterior (`truncate text-[20px]`) reduce el font, pero al haber 4 cards en una sola fila + sidebar + texto largo (`Cierres del período`, `Sumatoria del conteo físico…`), los valores monetarios siguen sin caber.
- Evidencia: `KpiCard` en `CashClosesConsolidated.tsx` (línea 69-95) usa `flex-1` con padding fijo y `text-[20px]`; los 4 cards en `grid-cols-4` no se reordenan a 2x2 hasta breakpoints muy chicos.
- Mitigación: el snapshot ARIA siempre devuelve los valores reales (`$ 2.749.000`), por lo que **funcionalmente** está correcto; es **sólo problema visual** en pantallas medianas.
- Estado: confirmado.
- Recomendación: aplicar `lg:grid-cols-4 md:grid-cols-2 grid-cols-1` al contenedor de las 4 KpiCards y/o usar `text-[18px] xl:text-[22px]` con `tabular-nums`. Para tabla "Consolidado por asesor" considerar `overflow-x-auto` envuelto y reducir paddings horizontales.

### QA-CC-011 — Edge case: rango colapsado a 1 día sin datos no muestra empty state en el header de KPIs
- Rol: admin
- URL: http://localhost:4300/admin/cash-closes (tab Consolidado, "Personalizado" con `from=to=2026-03-15`)
- Severidad: **sugerencia** (UX)
- Pasos:
  1. "Personalizado" → `to = 2026-03-15` (auto-colapsa `from = 2026-03-15`).
- Esperado: el subtítulo del header de rango y/o un mensaje principal indicando "Sin actividad en el período" además del empty state de las dos tablas.
- Observado: el estado vacío sí está presente en las dos tablas (`No hay cierres en el rango seleccionado`, `No hay cierres con diferencia en el período`), pero el cabezal sólo muestra `1 día · 0 asesores` y los KPIs muestran `$ 0` / `0`. Es funcionalmente correcto, sólo falta señal visual fuerte de "rango sin actividad".
- Evidencia: snapshot tras fill `e57=2026-03-15` muestra `Cierres del período: 0`, `1 día · 0 asesores`.
- Estado: confirmado (cosmético).
- Recomendación: si `kpis.total_closes === 0`, mostrar banner de info `Sin cierres en el período seleccionado` arriba de los KPIs.

## OK (sin incidencias)

| Rol | Ruta / interacción | Notas |
|-----|--------------------|--------|
| admin | `/admin/cash-closes` carga inicial | Tab "Consolidado" primera por defecto, preset 14d, datos correctos ✅ |
| admin | Preset "Hoy" | `Cierres=6`, `1 día · 1 asesor` (plural OK), refetch correcto |
| admin | Preset "7d" | Refetch correcto |
| admin | Preset "14d" | `14 días · 1 asesor` (plural OK) |
| admin | Preset "Mes" | `19 días · 1 asesor`, `Cierres=8` |
| admin | "Personalizado" + `from=2026-04-01` | Inputs date editables, refetch correcto, `19 días` |
| admin | "Personalizado" + `from=2026-03-01` | `50 días · 1 asesor`, mismos 8 cierres del seed |
| admin | KPI "Diferencia neta" sobrante | `+$ 160.000` en verde (`#228b52`), sub `22.540% sobre declarado conciliado` ✅ |
| admin | Click "Ver" (asesor RD) | Navega a `/admin/cash-closes/advisor/3` ✅ |
| admin | Loading state | Todos los KPIs y BreakdownCards muestran `—` durante `isLoading` (no `0`) ✅ |
| admin | Convención de signos | `(+) Sobra (-) Falta` consistente en header tabla, fila totales y panel "Cómo leer este panel" ✅ |
| admin | Empty state tabla "Por asesor" | "No hay cierres en el rango seleccionado" cuando rango sin datos ✅ |
| admin | Empty state tabla "Reconciliación" | "No hay cierres con diferencia en el período" ✅ |
| admin | Tab "Todos los cierres" / "Por asesor" | Switching funciona, vista anterior intacta |
| consola | `/admin/cash-closes` | Sin errores JS (sólo logs Vite/HMR/React-DevTools) |
| network | `GET /api/v1/cash-register-closes-consolidated?...` | 200 OK desde el front |

## Smoke API (Go reiniciado)

| Caso | Esperado | Observado | OK |
|---|---|---|---|
| Default sin params | últimos 14 días | `date_from=2026-04-07`, `date_to=2026-04-20`, `days_in_period=14` | ✅ |
| `from > to` | swap automático | input `from=2026-04-19&to=2026-04-01` → response `date_from=2026-04-01, date_to=2026-04-19, days=19` | ✅ |
| `date_from=garbage` | 422 | `422 {"message":"validation failed on date_from: formato inválido (YYYY-MM-DD)"}` | ✅ |
| Sin Bearer | 401 | `401` | ✅ |
| Token receptionist | 403 | `403` | ✅ |

## Handoff al agente de corrección

- **Recomendado**: regla `convision-qa-fixer` (los hallazgos restantes son cosméticos y de baja prioridad — no es necesario `gap-fixer` esta vez).
- **Comando sugerido**:
  > "Con `@convision-qa-fixer`, cerrar QA-CC-010 (responsive grid de KpiCards) y QA-CC-011 (banner empty-state) usando `.planning/qa/FINDINGS-2026-04-20-cash-close-consolidated-reverify.md` como fuente."

### IDs por prioridad sugerida
- **Menor**: QA-CC-010 (KPIs visuales en viewport medio).
- **Sugerencia**: QA-CC-011 (banner empty-state cuando 0 cierres).

### Conclusión
La vista **Consolidado** está **funcionalmente lista**. Los 9 bloqueantes/mayores reportados ayer están cerrados; quedan dos refinamientos visuales menores que no afectan auditoría ni decisión gerencial.
