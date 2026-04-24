---
plan: 07-02
phase: 07
status: complete
completed: 2026-04-24
---

# Summary: Plan 07-02 — Figma Ubicaciones Screens

## What Was Built

Four full-screen frames were added to the Figma "bodega" page covering the complete WarehouseLocation (Ubicaciones) module: a list view with filter-by-bodega dropdown, a full-screen creation form with Bodega as the first required field, a detail/edit view with Tab 1 (Información) active showing prefilled Vitrina Lentes data, and a second detail variant with Tab 2 (Inventario) active showing a mini-table of 5 inventory items with correct badge states (Disponible/Reservado/Dañado). All frames follow the Admin palette (`#3A71F7` / `#EFF1FF`) and the canonical layout established in Plan 07-01.

## Frames Created

| Frame | Dimensions | Node ID |
|-------|-----------|---------|
| Lista de Ubicaciones | 1440x938px | 2603:808 |
| Nueva Ubicación | 1440x938px | 2611:887 |
| Detalle Ubicación | 1440x938px | 2617:903 |
| Detalle Ubicación — Inventario | 1440x938px | 2619:919 |

## Key Design Decisions

- **Bodega dropdown first**: In "Nueva Ubicación", the Bodega (parent warehouse) selector is placed in its own "Pertenencia" section above the rest of the fields — establishing ownership before naming, matching the domain model FK hierarchy.
- **5-column table**: The Ubicaciones list uses Nombre / Código / Tipo / Bodega / Estado / Acciones (total ~1036px) rather than the full 1156px original clone, fitting within the table frame without horizontal overflow.
- **Badge states for Tab 2**: Disponible uses `Badge/Listo` (green `#EBF5EF / #228B52`), Reservado uses `Badge/En curso` (blue `#EFF1FF / #3A71F7`), Dañado uses `Badge/Cancelado` (red `#FFEEED / #B82626`) — aligning with the state definitions in 07-CONTEXT.md.
- **Tab indicator**: 2px bottom border `#3A71F7` on active tab; inactive tab is transparent with `text #7D7D87 Regular` — consistent with Plan 07-01 Detalle Bodega tabs.
- **Card/Tip palette**: All AsidePanel Card/Tip components use `bg #EFF1FF, border 1px #3A71F7, text #3A71F7` — Admin palette applied correctly, no hardcoded blues.
- **Mini-table note**: A 11px Regular `#7D7D87` note below the Tab 2 inventory table reads "Para agregar o ajustar stock, usa el módulo de Ítems de Inventario." — guiding the user to the correct module rather than attempting in-place editing.
- **No SedeSwitcher**: Admin role — confirmed absent on all 4 frames.

## El Crítico Results

- [OK] All 4 frames 1440x938px
- [OK] Sidebar/Role=Admin with Inventario NavItem active (bg #EFF1FF, text #3A71F7, Semi Bold) on all frames
- [OK] No SedeSwitcher anywhere — correct for Admin role
- [OK] Topbar structure: breadcrumb top-left, Cancelar + primary CTA top-right on creation/detail frames
- [OK] FooterBar present with required-fields note only (no action buttons in footer)
- [OK] Card/Tip bg #EFF1FF, border #3A71F7 on all applicable frames
- [OK] Tab active indicator: 2px bottom #3A71F7 on correct tab per frame
- [OK] No emojis in any design layer (arrow placeholder replaced with "→" text)
- [OK] Badge states Disponible/Reservado/Dañado correctly mapped to green/blue/red
- [OK] Bodega dropdown is the first required field in Nueva Ubicación
- [OK] Mini-table in Tab 2 distinct from main list table layout
- [MEJORABLE] Action buttons in the Tab 2 mini-table use "→" text rather than a proper Lucide `icon/eye` instance — inserting remote Lucide instances from Assets requires interactive plugin context. Documented as a polish item for a future pass.
- [VIGILAR] Lista de Ubicaciones shows 7 rows (5 planned + 2 extra: Caja Registradora / Zona Recepción) due to the 7-row Table/Frame clone structure. Functionally correct and visually clean; can be trimmed to 5 in a polish pass.

## Issues / Deviations

- The "→" text in Tab 2 action buttons is a placeholder for the Lucide `icon/eye` instance — acceptable for the current design phase; replace with actual Lucide instance in a polish iteration.
- Lista de Ubicaciones renders 7 rows (the original Table/Frame clone has 7 data rows); the 2 extra rows (Caja Registradora / Zona Recepción) are plausible ubicacion data and do not break the design intent.
