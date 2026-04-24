# Phase 7: Figma — Bodega & Inventory Module Design — Context

**Gathered:** 2026-04-24
**Status:** Ready for planning
**Source:** Laravel warehouse module docs + pixel.md design system

---

<domain>
## Phase Boundary

Diseñar en Figma (página "bodega") todas las pantallas del módulo de Bodega e Inventario que corresponden al backend Laravel. El trabajo es 100% Figma — no hay cambios de código. Se crean frames con el sistema de componentes de Convision, rol Admin.

**Entidades del dominio:**
- Warehouse (Bodega): nombre, código único, dirección, ciudad, estado (active/inactive), notas
- WarehouseLocation (Ubicación de Bodega): bodega_id, nombre, código, tipo (Shelf/Zone/Bin), estado, descripción
- InventoryItem (Ítem de Inventario): producto, bodega, ubicación, cantidad, estado (available/reserved/damaged), notas
- InventoryTransfer (Transferencia): producto, ubicación_origen, ubicación_destino, cantidad, responsable, notas, estado (pending/completed/cancelled)

**Flujos de negocio a representar:**
- CRUD de Bodegas
- CRUD de Ubicaciones (anidadas dentro de bodega)
- Gestión de ítems de inventario (con filtros por bodega/ubicación/estado)
- Vista de Stock Total agregado por producto
- Resumen de inventario por producto
- Workflow de Transferencias (crear → completar/cancelar)

</domain>

<decisions>
## Implementation Decisions

### Rol y Paleta
- Rol: **Admin** (módulo Inventario → Admin según tabla de rol)
- Color primario: `#3A71F7`
- Fondo acento: `#EFF1FF`
- Sidebar: `Sidebar/Role=Admin` node-id `83:2`
- Sin SedeSwitcher (Admin opera vista consolidada)
- File key Figma: `dHBbcAQTlUSXGKnP6l76OS`

### Página Figma destino
- Nombre exacto de la página: **"bodega"** (minúsculas, sin número de orden)
- Crear la página si no existe — no reutilizar una página existente

### Layout canónico de vistas de lista
- Frame: 1440x938px, bg `#F5F5F6`
- Sidebar Admin 240x938 en x:0
- Main 1200x938 en x:240 — Topbar 1200x60 + Content 1200x878
- Tabla: clonar `Table/Frame` (78:89), contextualizar al módulo
- Topbar: breadcrumb + título + CTA primario Admin (#3A71F7)

### Layout canónico de vistas de creación/edición
- Frame: 1440x938px (pantalla completa — no modal)
- Estructura: Sidebar | Main [Topbar + Content (FormCard + AsidePanel) + FooterBar]
- FormCard: left 24, width 780, bg white, border #EBEBEE, rounded 8px
- AsidePanel: left 844, width 332
- Card/Tip en AsidePanel: bg `#EFF1FF`, border `#3A71F7` (paleta Admin)
- Botones en Topbar: Cancelar (Outline) + acción principal (Primary Admin)
- FooterBar: solo nota de campos obligatorios

### Columnas de tabla por entidad
- **Bodegas**: Nombre (240px primary) | Código (176px) | Ciudad (176px) | Estado badge (136px) | Acciones (132px)
- **Ubicaciones**: Nombre (240px primary) | Código (176px) | Tipo (176px) | Bodega (176px) | Estado badge (136px) | Acciones (132px) — total > 1156, ajustar a 5 cols: Nombre | Código | Tipo | Estado | Acciones
- **Ítems Inventario**: Producto (240px primary) | Bodega (176px) | Ubicación (176px) | Cantidad (68px) | Estado badge (136px) | Acciones (132px)
- **Stock Total**: Producto (240px primary) | Categoría (176px) | Proveedor (176px) | Stock Total (176px) | Acciones (132px) — ajustar
- **Transferencias**: Producto (240px primary) | Desde (176px) | Hacia (176px) | Cantidad (68px) | Estado badge (136px) | Acciones (132px)

### Badges de estado
- Activo → `Badge/Listo` (verde `#EBF5EF / #228B52`) node-id `51:18`
- Inactivo → `Badge/Cotizado` (gris `#F9F9FB / #7D7D87`) node-id `51:16`
- Disponible (available) → `Badge/Listo` (verde)
- Reservado (reserved) → `Badge/En curso` (azul `#EFF1FF / #3A71F7`) node-id `51:8`
- Dañado (damaged) → `Badge/Cancelado` (rojo `#FFEEED / #B82626`) node-id `51:12`
- Transferencia Pendiente → `Badge/Pendiente` (amber `#FFF6E3 / #B57218`) node-id `51:10`
- Transferencia Completada → `Badge/Atendido` (verde `#EBF5EF / #228B52`) node-id `51:6`
- Transferencia Cancelada → `Badge/Cancelado` (rojo) node-id `51:12`

### Datos de muestra realistas
- Bodega 1: "Sede Principal - Bogotá" | SEDE-PRINCIPAL | Bogotá | Activo
- Bodega 2: "Sede Norte - Medellín" | SEDE-NORTE | Medellín | Activo
- Ubicaciones: VITRINA-LENTES | VITRINA-MONTURAS | VITRINA-LC | ALMACEN-GENERAL | ACCESORIOS
- Productos de muestra: lentes oftálmicos, monturas, lentes de contacto, accesorios
- Cantidades: rangos 3-30 unidades

### Iconos Lucide
- Todos desde Assets Figma, color default `#7D7D87`
- Iconos de navegación: usar `Icon/Inventario` del sidebar
- `icon/search` (369:234) para búsqueda
- `icon/filter` (369:129) para filtros
- `icon/eye` (353:209) para ver detalle

### Orden de diseño (waves)
- Wave 1 (Plan 07-01): Pantallas de Bodegas — establece el patrón base
- Wave 2 (Plan 07-02): Pantallas de Ubicaciones — reutiliza patrón de Wave 1
- Wave 3 (Plan 07-03): Inventario e ítems — vistas más complejas con filtros
- Wave 4 (Plan 07-04): Transferencias — incluye workflow de estados

### Requisito crítico para el agente Figma
- Leer `pixel.md` (Instrucciones de Pixel) completamente antes de ejecutar
- Usar SIEMPRE `compPage.findOne(n => n.name === 'NombreExacto')` para clonar
- NUNCA `figma.createFrame()` si existe en catálogo
- Contextualizar TODOS los clones al módulo bodega/inventario

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Pixel / Design System
- `pixel.md` — Sistema completo de diseño: roles, paletas, componentes, node-ids, flujo de trabajo obligatorio

### Laravel Domain Model
- `docs/laravel-warehouse-inventory-module.md` — Modelos, relaciones, endpoints, validaciones y lógica de negocio del módulo de bodega

### Figma File
- fileKey: `dHBbcAQTlUSXGKnP6l76OS`
- Página de componentes: `00 · Componentes` (node-id `33:2`)
- Sidebar Admin: node-id `83:2`
- Table/Frame maestro: node-id `78:89`

</canonical_refs>

<specifics>
## Specific Ideas

- El módulo Inventario en el sidebar Admin debe tener su NavItem activo (#EFF1FF bg, #3A71F7 text) cuando se está en cualquier pantalla de bodega
- El "Stock Total por Producto" es una vista especial (query agregada) — no es un CRUD estándar, es más como un reporte/dashboard de inventario
- El detalle de Bodega debe mostrar sus Ubicaciones en un tab secundario (lista embebida)
- El detalle de Ubicación debe mostrar sus Ítems de Inventario en un tab secundario
- La vista "Resumen de Inventario por Producto" (`/products/{id}/inventory-summary`) tiene header con datos del producto + tabla de desglose — diseñar como pantalla de detalle con header card + tabla
- El formulario de Nueva Transferencia debe tener un selector de Ubicación Origen y Destino con validación visual de que no sean iguales
- En el Detalle de Transferencia, mostrar los botones de acción contextuales según estado: si Pendiente → botones "Completar" y "Cancelar"; si Completada o Cancelada → solo lectura

</specifics>

<deferred>
## Deferred Ideas

- Historial de movimientos de stock (audit log) — no está implementado en Laravel, se omite en diseño v1
- Integración visual ventas→inventario y compras→inventario — fuera de scope de este módulo de diseño
- Pantalla de configuración de alertas de stock mínimo — no existe en el backend aún
- Vista mobile / responsiva — v1 es solo desktop 1440px
- Filtros avanzados con date range en transferencias — puede agregarse en iteración posterior

</deferred>

---

*Phase: 07-figma-bodega-inventory-module-design*
*Context gathered: 2026-04-24*
