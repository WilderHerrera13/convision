---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
started: 2026-04-22T14:33:00
updated: 2026-04-22T14:35:00
resolved: 2026-04-22
roles_tested: [receptionist]
scope: Catálogo de Productos — alineación visual Figma (nodes 1068:398, 1172:580)
---

# QA FINDINGS — Catálogo de Productos — Alineación Figma (2026-04-22)

## Resumen ejecutivo

- Pantallas verificadas: 3 (grid sin carrito, grid con carrito, lista con carrito)
- Hallazgos confirmados: 1 menor (P2)
- Hipótesis pendiente datos reales: 1 (P2)
- **Sin incidencias P0 ni P1 — alineación Figma exitosa**
- Backend Go reiniciado antes de validaciones: OK
- Consola JS: 0 errores
- Red: todos los endpoints API → 200

---

## ✅ Verificado vs Figma node 1068:398 (catálogo sin carrito)

| Elemento | Figma | Implementación | Estado |
|---|---|---|---|
| Título topbar | "Catálogo de Productos" | ✅ Idéntico | OK |
| Breadcrumb | "Ventas / Nueva Venta / Catálogo de Productos" | ✅ Idéntico | OK |
| Botón Cancelar | Outline | ✅ Presente y funcional | OK |
| Botón Agregar N productos | Púrpura, muestra count | ✅ "Agregar 2 productos" con 2 items | OK |
| Tabs: Todos (activo púrpura) | Pill relleno | ✅ Idéntico | OK |
| Tabs: 4 categorías outline | Pill borde | ✅ Todos presentes | OK |
| Toggle Grid/Lista con texto | Ícono + texto | ✅ "Grid" / "Lista" con íconos | OK |
| Grid 4 columnas | 4 cols sin carrito | ✅ 4 cols | OK |
| FAB carrito | Botón circular, badge contador | ✅ Presente | OK |

## ✅ Verificado vs Figma node 1172:580 (carrito abierto)

| Elemento | Figma | Implementación | Estado |
|---|---|---|---|
| Panel carrito inline | Div derecho, no Sheet overlay | ✅ Panel div fijo a la derecha | OK |
| "Carrito de Venta 2" | Badge con count | ✅ Idéntico | OK |
| X cerrar panel | Top-right | ✅ Presente y funcional | OK |
| Items con thumbnail + datos + X | Por item | ✅ Idéntico | OK |
| "Total a pagar $68.000" | Suma correcta | ✅ 33.000 + 35.000 = 68.000 | OK |
| "Continuar Venta →" | Púrpura full-width | ✅ Idéntico | OK |
| "Vaciar Carrito" | Outline full-width | ✅ Presente | OK |
| "Transacción segura…" | Texto footer | ✅ Idéntico | OK |
| Grid 3 columnas | Reduce a 3 con carrito | ✅ 3 cols | OK |
| FAB oculto con carrito abierto | No visible | ✅ Ocultado | OK |
| Banner "EN CARRITO" | Verde top, full-width | ✅ Idéntico | OK |
| "Quitar del Carrito" | Outline rojo | ✅ Idéntico | OK |

## ✅ Vista Lista con carrito

| Elemento | Estado |
|---|---|
| Columnas DESCRIPCIÓN / TIPO·MARCA / MATERIAL / PRECIO | OK |
| Botones "Quitar"/"Agregar" por estado | OK |
| Layout lista + panel derecho | OK |

---

## Hallazgos (FAIL / GAP)

### QA-CAT-001
- **Rol:** receptionist
- **URL:** http://localhost:4300/receptionist/sales/catalog
- **Severidad:** menor (P2)
- **Pasos:** 1. Clic en tab "Marcos" o "Lentes de Contacto" o "Accesorios"
- **Esperado:** La lista filtra por esa categoría de producto
- **Observado:** El tab activo cambia visualmente pero el API siempre envía `category.slug=lens` — no filtra
- **Evidencia:** Network requests sin cambio al pulsar tabs de categoría distintos de "Todos"
- **Estado:** confirmado
- **Resolución: resuelto** — añadido campo `categorySlug` a `LensSearchParams`; `searchLenses` ya no hardcodea `category.slug=lens` sino que usa el slug recibido (omite el filtro cuando es `undefined`). En `SalesCatalog.tsx`: nuevo handler `handleCategoryChange` que llama a `setActiveCategory` + `setCurrentPage(1)`; `activeCategory` agregado al deps de `loadLenses`; tabs conectados. `handleResetFilters` también resetea a `'all'`. Archivos: `src/services/lensService.ts`, `src/pages/receptionist/SalesCatalog.tsx`.

### QA-CAT-002
- **Rol:** receptionist
- **URL:** http://localhost:4300/receptionist/sales/catalog
- **Severidad:** menor (P2) — no reproducible con datos de prueba seed
- **Pasos:** 1. Tener productos con `has_discounts=true` 2. Abrir catálogo
- **Esperado:** Badge "HASTA N% OFF" en top-right de imagen; banner "★ OFERTA ESPECIAL ★" en amber al bottom de imagen
- **Observado:** Sin datos de descuento en seed — no se pueden visualizar los elementos
- **Evidencia:** Código implementado correctamente en `ProductCard.tsx`; los elementos solo renderizan cuando `discount !== null`
- **Estado:** hipótesis (pendiente validar con datos reales)
- **Resolución: no requiere cambio de código** — implementación verificada en `ProductCard.tsx`. Validar con datos de descuento reales.

---

## OK (sin incidencias)

| Rol | Ruta | Notas |
|-----|------|--------|
| receptionist | /receptionist/sales/catalog (grid, carrito cerrado) | 0 errores, API 200, 4 cols, topbar correcto |
| receptionist | /receptionist/sales/catalog (grid, carrito abierto 2 items) | Panel inline, 3 cols, total correcto |
| receptionist | /receptionist/sales/catalog (lista, carrito abierto) | Vista lista funcional con panel |
| receptionist | FAB → abrir/cerrar carrito | Abre panel inline; FAB se oculta al abrir |
| receptionist | Agregar 2 productos + verificar EN CARRITO | Banners verdes, botones Quitar, total actualizado |

---

## Handoff al agente de corrección

**QA-CAT-001 (P2):** Conectar `activeCategory` en `SalesCatalog.tsx` al parámetro `category.slug` del API, o bien deshabilitar visualmente (disabled/tooltip) los tabs de categorías que no tienen soporte de backend aún.

**QA-CAT-002 (P2):** Validar badges de descuento con datos reales; no requiere cambio de código.
