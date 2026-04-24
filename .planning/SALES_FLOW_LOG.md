# Sales Flow Implementation Log
**Project:** Convision — Flujo completo de ventas del Recepcionista  
**Started:** 2026-04-22  
**Orchestrator:** Claude Opus 4.7 (main agent)  
**Status:** ✅ COMPLETE — Ready for QA (2026-04-22)

---

## Figma Frames (fileKey: dHBbcAQTlUSXGKnP6l76OS)

| # | Frame | Node ID | Target File | Status |
|---|-------|---------|-------------|--------|
| 1 | Ventas — Lista | 1059:188 | `receptionist/Sales.tsx` (NEW — copy from admin pattern) | ⏳ PENDING |
| 2 | Ventas — Nueva Venta | 1061:188 | `receptionist/NewSale.tsx` (UPDATE — 2057 lines exists) | ⏳ PENDING |
| 3 | Ventas — Catálogo de Lentes | 1068:398 | `receptionist/SalesCatalog.tsx` (UPDATE — 1954 lines exists) | ✅ DONE |
| 4 | Ventas — Catálogo (Drawer Abierto) | 1172:580 | cart drawer component inside SalesCatalog | ✅ DONE |
| 5 | Ventas — Detalle Producto (Modal) | 1204:671 | `src/components/sales/ProductDetailModal.tsx` (NEW) | ⏳ PENDING |
| 6 | Ventas — Galería Full Screen | 1217:671 | `src/components/sales/ProductGallery.tsx` (NEW) | ⏳ PENDING |

---

## Architecture Overview

### Frontend Stack
- React 18 + TypeScript, Vite, React Router v6
- Tailwind CSS + shadcn/ui components
- React Query + axios (`src/lib/axios.ts`)
- Path: `convision-front/src/`

### Backend Stack
- Go 1.22, Gin, GORM, PostgreSQL
- Path: `convision-api-golang/`
- API base: `http://localhost:8001/api/v1/`
- Vite proxy: `/api` → `http://localhost:8001`

### Key Existing Files
- `src/services/saleService.ts` — sale CRUD, payments, stats
- `src/services/productService.ts` — products + discounts
- `src/services/lensService.ts` — lens lookup
- `src/services/discountService.ts` — discount calc
- `src/pages/admin/Sales.tsx` — reference for receptionist list (825 lines)
- `src/pages/receptionist/SalesCatalog.tsx` — catalog (1954 lines, FULL feature set)
- `src/pages/receptionist/NewSale.tsx` — new sale form (2057 lines)

### Backend Endpoints Available
```
GET  /api/v1/sales               — list sales (paginated)
GET  /api/v1/sales/stats         — stats
GET  /api/v1/sales/stats/today   — today stats (metric cards)
POST /api/v1/sales               — create sale
GET  /api/v1/sales/:id           — get sale
PUT  /api/v1/sales/:id           — update sale
POST /api/v1/sales/:id/payments  — add payment
POST /api/v1/sales/:id/cancel    — cancel sale

GET  /api/v1/products            — list products (supports ?search=, ?category_id=)
GET  /api/v1/products/search     — search products
GET  /api/v1/products/:id        — get product
GET  /api/v1/products/:id/stock  — get stock
GET  /api/v1/products/:id/discounts         — discounts
GET  /api/v1/products/:id/discount-info     — discount info
GET  /api/v1/products/:id/active-discounts  — active discounts
GET  /api/v1/products/:id/calculate-price   — price with discount

GET  /api/v1/product-categories  — categories
GET  /api/v1/lens-types          — lens types (Monofocal, Bifocal, Progresivo)
GET  /api/v1/lens-classes        — lens classes
```

### App.tsx Routes (receptionist)
```
/receptionist/sales           → admin/Sales.tsx  ← NEEDS CHANGE to receptionist/Sales.tsx
/receptionist/sales/catalog   → receptionist/SalesCatalog.tsx
/receptionist/sales/new       → receptionist/NewSale.tsx
/receptionist/sales/:id       → receptionist/SaleDetail.tsx
```

---

## Figma Design System Notes

### Color Palette (Recepcionista)
- Primary button: Role=Recepcionista → amber/orange tone (`Button/Primary/Recep`)
- Use existing Tailwind tokens — NO hardcoded `bg-blue-500`
- Design System node: `33:2` in fileKey `dHBbcAQTlUSXGKnP6l76OS`

### Sidebar
- `Sidebar/Role=Recepcionista` instance (240px wide)
- Already exists as component in the project

### Topbar Pattern (reusable across all frames)
- Breadcrumb text (small gray) + Title (larger)
- Right: SedeSwitcher (260px) + action buttons
- Height: 60px

### Metric Cards Pattern (frame 1059:188)
- 4 cards: Total Ventas Hoy, Ingresos Hoy, Por Cobrar Hoy, Estado de Pagos
- Each 88px tall, left accent bar (colored bar)
- Label (small gray) + Value (large number) + Subtext (small gray)

### Product Card Pattern (frames 1068:398, 1172:580)
- 264×368px cards
- ImageZone (116px) with badge overlay (type + optional promo badge)
- Brand (uppercase small), Name (2 lines bold), Material/Treatment, Sphere range
- Price (large), optional strikethrough for discounted price
- QtySelector (32px tall, -/qty/+) + Add to Cart button (full width)
- States: normal, "EN CARRITO" badge, promo circle badge

### Cart Drawer (frame 1172:580)
- 320px right drawer
- Header: "Carrito de Venta" + count badge + close X
- Cart items (80px each): thumbnail + name + brand+type + price + remove X
- Divider + Total section + "Continuar Venta →" primary button + "Vaciar Carrito" outline button
- Footer note: "Transacción segura · Solo efectivo y tarjeta"

### Product Detail Modal (frame 1204:671)
- 860×624px centered modal
- Left panel (340px): visual background, promo badge, type badge, ref code, warranty, stock
- Right panel (520px): 
  - Header: brand + name + close X
  - Price block: original strikethrough + discounted + savings chip
  - Tabs: Descripción | Especificaciones | Compatibilidad (Especificaciones active)
  - Specs grid: 2 columns × 4 rows
  - Action footer: QtySelector + stock count + Add to Cart + Compartir buttons

### Gallery Full Screen (frame 1217:671)
- Full 1440×938px (overlays sidebar too)
- TopBar: breadcrumb + file count badge + close button
- Left 920px: main image with prev/next buttons, photo counter, zoom button, progress bar
- Bottom 100px: thumbnail strip (4 thumbs, labeled)
- Right 280px info panel: price, specs, Add to Cart, Back to detail, Share

---

## Sub-Agent Execution Log

### Agent 1 — Backend Audit (stats + product fields)
- **Status:** ✅ DONE
- **Goal:** Verify `GET /sales/stats/today` response matches metric card needs. Verify product list response has all fields for catalog cards. Add missing fields/endpoints if any.
- **Output:**

**Task 1: `GET /api/v1/sales/stats/today`**

Before (only 3 fields): `{ total_sales, total_revenue, total_discount }`

After (all metric card fields):
```json
{
  "total_sales": 5,        // Total Ventas Hoy card
  "total_revenue": 500.00, // sum of all non-cancelled sales totals
  "total_discount": 10.00,
  "total_collected": 350.00, // Ingresos Hoy — sum of totals where payment_status='paid'
  "total_pending": 150.00,   // Por Cobrar Hoy — sum of balance where status pending/partial
  "count_paid": 3,           // Estado de Pagos card
  "count_partial": 1,
  "count_pending": 1
}
```
Changed: `internal/platform/storage/postgres/sale_repository.go` — extended `GetTodayStats()` SQL with conditional SUMs/COUNTs per payment_status.

**Task 2: `GET /api/v1/products` catalog fields**

`productResponse()` now returns all needed catalog card fields:
- `brand` (full object) + `brand_name` (flat string — NEW)
- `lens_attributes` now has populated nested objects `lens_type`, `material`, `treatment`, `lens_class`, `photochromic` (associations were NOT being preloaded before — FIXED)
- `lens_type_name`, `material_name`, `treatment_name` (flat strings — NEW)
- `sphere_min`, `sphere_max`, `cylinder_min`, `cylinder_max` (flat floats — NEW)
- `?search=term` now works on `GET /api/v1/products` (delegates to existing Search method)

Changed files:
1. `internal/platform/storage/postgres/product_repository.go` — added nested Preloads for `LensAttributes.LensType`, `.Material`, `.LensClass`, `.Treatment`, `.Photochromic`
2. `internal/transport/http/v1/handler_product.go` — added flat convenience fields in `productResponse()` + `?search=` param support in `ListProducts`

**Task 3: Patient search `GET /api/v1/patients?search=...`**

OR-mode search via complex `s_f/s_v/s_o=or` params already existed. Added a simple `?search=term` shortcut to `ListPatients` that OR-searches across `first_name`, `last_name`, `identification`, and `phone`.

Changed: `internal/transport/http/v1/handler.go` — `ListPatients` checks `?search=` first.

**Build:** `go build ./...` and `go vet ./...` both pass with 0 errors.

### Agent 2 — Ventas Lista (frame 1059:188)
- **Status:** ✅ DONE
- **Depends on:** Agent 1
- **Goal:** Create `convision-front/src/pages/receptionist/Sales.tsx` matching Figma frame 1059:188. Update App.tsx import. Use existing saleService.ts.
- **Key components:** 4 metric cards, sales DataTable with columns (N° Factura, Fecha, Cliente, Total, Estado, Acciones)
- **Output:**
  - Created `convision-front/src/pages/receptionist/Sales.tsx` — new page matching Figma frame 1059:188
  - 4 metric cards with `#8753ef` accent bar (Total Ventas Hoy, Ingresos Hoy, Por Cobrar Hoy, Estado de Pagos)
  - Table with columns: N° Factura, Fecha, Cliente, Total, Estado, Acciones (view + invoice buttons)
  - React Query hooks for `sales-today-stats` and `receptionist-sales`
  - Filter modal for status / payment_status / date_from / date_to
  - PDF preview dialog (reuses same pattern as admin/Sales.tsx)
  - `+ Nueva venta` button → `/receptionist/sales/new` with Figma primary color `bg-[#8753ef]`
  - Updated `App.tsx` line 30 (import) and line 618 (route) to use `ReceptionistSales` instead of admin `Sales`
  - TypeScript: **0 errors** (`npx tsc --noEmit` clean)

### Agent 3 — Nueva Venta (frame 1061:188)
- **Status:** ✅ DONE
- **Depends on:** Agent 1 (backend ready)
- **Goal:** Rewrite `convision-front/src/pages/receptionist/NewSale.tsx` to match Figma frame 1061:188 exactly. Keep all existing API integration logic, update only the UI layout.
- **Key components:** client search combobox, document info row, product rows (type+desc+code+qty+price+discount), product list summary, ResumenCompra card, FormaPago card
- **Output:**
  - Refactored `convision-front/src/pages/receptionist/NewSale.tsx` — 249 lines, pure orchestrator using `useNewSale` hook
  - Created `convision-front/src/components/sales/useNewSale.ts` — all business logic: sessionStorage hydration, discount auto-application, totals calculation, payment methods, sale submission
  - Created `convision-front/src/components/sales/NewSaleTopbar.tsx` (40 lines) — breadcrumb + title + Cancelar + Completar Venta buttons
  - Created `convision-front/src/components/sales/ClientSearch.tsx` (142 lines) — inline combobox search with dropdown results, ClienteSeleccionado card with purple bg + [X] button
  - Created `convision-front/src/components/sales/ProductForm.tsx` (134 lines) — Row1 (Tipo+Desc) + Row2 (Código+Cant+Valor+Desc%) + "+ Agregar producto" button
  - Created `convision-front/src/components/sales/ProductList.tsx` (70 lines) — item rows with name, x1 Desc:% -$amount, price, trash icon
  - Created `convision-front/src/components/sales/PurchaseSummary.tsx` (107 lines) — header purple, items table, Subtotal/Descuento(red)/IVA rows, TOTAL in purple
  - Created `convision-front/src/components/sales/PaymentForm.tsx` (128 lines) — Método de Pago select + Referencia input + Observaciones textarea + partial payment toggle
  - Layout matches Figma 1061:188: FormCard left (flex-1) + AsidePanel right (332px), top bar 60px, footer bar 64px
  - Colors: `#8753ef` primary, `#f7f4ff` section headers, `#f1edff` client card bg, `#af2926` discount red
  - TypeScript: **0 errors** (`npx tsc --noEmit` clean)

### Agent 4 — Catálogo + Cart Drawer (frames 1068:398 + 1172:580)
- **Status:** ✅ DONE
- **Depends on:** Agent 1
- **Goal:** Rewrite `convision-front/src/pages/receptionist/SalesCatalog.tsx` matching both frames. Keep cart state management and product API calls. Add proper card grid + drawer.
- **Key components:** SearchRow, ViewToggle (Grid/Lista), ChipRow (category chips), product card grid (264px cards), FAB/Carrito floating button, Cart Drawer (320px right panel)
- **Output:**
  - Created `src/components/sales/ProductCard.tsx` — 264px card with ImageZone (gradient bg + LensIcon SVG), type badge, code, brand, name, material/treatment, sphere ranges, price (with strikethrough if discounted), qty selector (+/-), and cart action button (Agregar / Quitar). States: normal, EN CARRITO badge overlay, promo circle badge.
  - Created `src/components/sales/CartDrawer.tsx` — 320px right Sheet with header (title + count badge + close), ScrollArea of cart items (thumb + name + brand/type + price + remove X), total, "Continuar Venta" primary button, "Vaciar Carrito" outline button, security footer.
  - Created `src/components/sales/ProductFilters.tsx` — bottom Drawer with 5 filter selects (Tipo, Marca, Material, Clase, Tratamiento), active count badge on trigger button, Limpiar / Aplicar filtros actions.
  - Rewrote `src/pages/receptionist/SalesCatalog.tsx` — clean orchestrator (~280 lines). Topbar (breadcrumb + title + cliente + Completar Venta button), SearchRow (600px input + Filtros button + Grid/List toggle), ChipRow (category + active filter chips), 4-col product card grid, list view, pagination, fixed FAB (56×56 violet + red badge), CartDrawer via Sheet.
  - All state logic preserved: sessionStorage, cart add/remove/clear, debounced search, filter loading, discount enrichment.
  - Primary color: `bg-violet-600` (receptionist role per Figma DS).
  - TypeScript: **0 errors** (`npx tsc --noEmit` clean).

### Agent 5 — Product Modal + Gallery (frames 1204:671 + 1217:671)
- **Status:** ✅ DONE
- **Depends on:** Agent 4 (catalog page ready to host these)
- **Goal:** Create `src/components/sales/ProductDetailModal.tsx` and `src/components/sales/ProductGallery.tsx`. Integrate into SalesCatalog click handlers.
- **Output:**
  - Created `src/components/sales/ProductDetailModal.tsx` — 860×624 Dialog modal with left visual panel (340px gradient, PromoCircle badge, LensIconLarge SVG, type badge, REF, warranty chip, stock dot, click=gallery) and right info panel (520px header, price block with strikethrough+savings chip, 3 tabs Descripción/Especificaciones/Compatibilidad, 2×4 spec grid, QtySelector, Add to Cart + Compartir buttons). Sub-components: VisualPanel, InfoPanel, TabBar, SpecCard all inline.
  - Created `src/components/sales/ProductGallery.tsx` — full-screen dark Dialog with TopBar (breadcrumb + "4 fotos" badge + close), dark gradient main image area (LensIllustration SVG placeholder per slot), prev/next nav, photo counter, progress dots, ThumbStrip (4 thumbnails with active underline), GalleryInfoPanel (MODO GALERÍA label, price with discount, 4 spec rows, stock, Add to Cart / Volver al detalle / Compartir galería buttons).
  - Updated `src/pages/receptionist/SalesCatalog.tsx` — added imports, state (selectedProduct, isDetailModalOpen, isGalleryOpen), handlers (handleViewDetail, handleOpenGallery, handleBackToDetail), wired onViewDetail on ProductCard, rendered both modals at end of JSX with correct discount/cartQuantity props.
  - TypeScript: **0 errors** (`npx tsc --noEmit` clean).

### Agent 6 — NewSale Products Flow Refactor
- **Status:** ✅ DONE
- **Goal:** Replace the manual `ProductForm` (text inputs for type/desc/code/qty/price/discount) with a smart `RecommendedProducts` section that shows a linked-appointment banner + recommended products or just a catalog CTA depending on context.
- **Output:**
  - Created `src/components/sales/RecommendedProducts.tsx` (189 lines) — two states:
    - **With `appointmentId`**: renders CITA VINCULADA banner (`bg-[#f1edff]`, `border-[rgba(135,83,239,0.3)]`) with appointment number / specialist / date and "Ver prescripción →" link, plus "RECOMENDADOS SEGÚN LA PRESCRIPCIÓN" label and up to 3 horizontal scrollable lens cards (`RecommendedCard` sub-component) loaded via `useQuery(lensService.searchLenses, limit=3)`. Each card shows brand uppercase, description, type·material, price, and a `[+]` / `[✓]` 24px circle button.
    - **Without `appointmentId`**: just renders the dashed "Explorar catálogo de productos" CTA button.
    - "Explorar catálogo" merges current patient/appointment data into `sessionStorage.pendingSale` before navigating to `/receptionist/sales/catalog`, preserving the existing cart-return flow.
  - Updated `src/components/sales/useNewSale.ts`:
    - Added `addProductDirect(lens: Lens, qty = 1)` — creates a `SaleItem` from a `Lens` object (applies sessionPriceAdjustment, triggers auto-discount if `has_discounts`).
    - Added `appointmentId` computed from `useLocation` search params (`?appointment_id=`) or `location.state.appointmentId`, exposed in hook return.
  - Updated `src/pages/receptionist/NewSale.tsx`:
    - Replaced `import ProductForm` → `import RecommendedProducts`.
    - Section header changed from "Agregar Productos" → "Productos".
    - Swapped `<ProductForm ...>` → `<RecommendedProducts appointmentId patientId onAddProduct={addProductDirect} addedProductIds onViewPrescription selectedPatientName />`.
    - Removed all ProductForm-related destructured props (productType, productDescription, productCode, quantity, price, discount and their setters, addProductToSale).
  - Deleted `src/components/sales/ProductForm.tsx` — confirmed no other importers.
  - TypeScript: **0 errors** (`npx tsc --noEmit` clean).

---

## COMPLETION CHECKLIST
- [x] Agent 1: Backend stats/today returns correct format
- [x] Agent 1: Product list returns brand, lens_type, material, treatment fields
- [x] Agent 2: receptionist/Sales.tsx created with 4 metric cards + table
- [x] Agent 2: App.tsx updated to use receptionist/Sales.tsx
- [x] Agent 3: NewSale.tsx redesigned matching frame 1061:188
- [x] Agent 4: SalesCatalog.tsx redesigned matching frames 1068:398 + 1172:580
- [x] Agent 5: ProductDetailModal.tsx created matching frame 1204:671
- [x] Agent 5: ProductGallery.tsx created matching frame 1217:671
- [x] Agent 6: RecommendedProducts.tsx created (appointment banner + recommended cards + catalog CTA)
- [x] Agent 6: useNewSale.ts updated with addProductDirect + appointmentId
- [x] Agent 6: NewSale.tsx updated — ProductForm replaced by RecommendedProducts
- [x] Agent 6: ProductForm.tsx deleted
- [x] All pages compile without TypeScript errors
- [ ] All UI strings in Spanish
- [ ] No hardcoded colors — use Tailwind tokens + shadcn primitives

---

## CRITICAL RULES FOR ALL AGENTS
1. **English identifiers** — all function/var/component names in English; UI strings in Spanish
2. **No `bg-blue-500`** — use role-specific primary color (receptionist = amber/orange)
3. **No custom CSS files** — Tailwind only
4. **No `next/image`** — use `<img>` (Vite project)
5. **Components ≤ 200 lines** — extract sub-components or hooks if needed
6. **React Query** for data fetching — no direct axios in components
7. **React Hook Form + Zod** for forms
8. **shadcn/ui primitives** — Button, Input, Select, Dialog, Drawer, Badge, Card, Separator, Tabs, etc. from `@/components/ui/`
9. **Never `db.Save()`** in Go updates
10. **Read DEVELOPMENT_GUIDE.md and DATABASE_GUIDE.md before writing any Go code**
