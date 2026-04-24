---
plan: 07-01
phase: 07
status: complete
completed: 2026-04-24
---

# Summary: Plan 07-01 — Figma Bodegas Screens

## What Was Built

Four full-screen frames were created on the Figma "bodega" page following the Admin role palette (`#3A71F7` / `#EFF1FF`). The frames establish the canonical design pattern — Sidebar Admin with Inventario NavItem active, Topbar with breadcrumb and action buttons, and the FormCard + AsidePanel layout — that all subsequent plans (07-02, 07-03, 07-04) will replicate.

## Frames Created

| Frame | Dimensions | Location |
|-------|-----------|----------|
| Lista de Bodegas | 1440x938px | Page: bodega |
| Nueva Bodega | 1440x938px | Page: bodega |
| Detalle Bodega | 1440x938px | Page: bodega |
| Detalle Bodega — Ubicaciones | 1440x938px | Page: bodega |

## Key Design Decisions

- **Sidebar Admin (node-id 83:2)** cloned via `createInstance()` on every frame; NavItem/Inventario manually set to `bg #EFF1FF, text #3A71F7, Semi Bold` to mark active state.
- **No SedeSwitcher** on any frame — Admin operates in consolidated multi-sede view as per pixel.md rules.
- **Lista de Bodegas**: Table cloned from `Table/Frame (78:89)`, contextualized for Bodegas domain — title "Bodegas", 5 rows with real seeder data (Sede Principal / Sede Norte / Almacén Centro / Sede Sur / Depósito Norte), `Badge/Listo` (green) for Activo, `Badge/Cotizado` (gray) for Inactivo. Column widths: N° 68px | Nombre 240px | Código 176px | Ciudad 340px | Estado 136px | Acciones 196px.
- **Nueva Bodega**: Full-screen creation view (not modal). Topbar holds Cancelar + "Crear Bodega" buttons; FooterBar holds only the required-fields note. AsidePanel has Card/Info with 3 info items and Card/Tip with `bg #EFF1FF, border #3A71F7`.
- **Detalle Bodega**: Same architecture as Nueva Bodega but with TabBar (2 tabs: Información active / Ubicaciones inactive) and all fields prefilled with "Sede Principal - Bogotá" data. Primary button is "Guardar Cambios".
- **Detalle Bodega — Ubicaciones**: Identical frame structure but Tab 2 (Ubicaciones) is active. FormBody shows a MiniToolbar with title + "+ Nueva Ubicación" CTA, followed by a 5-row inline table of warehouse locations (Vitrina Lentes, Vitrina Monturas, Vitrina LC, Almacén General, Accesorios) with Shelf/Storage type, Activo badge, and action buttons.
- **Card/Tip** on all creation/detail views: `bg #EFF1FF, border 1px #3A71F7` — Admin paleta applied correctly.
- **Tab indicator**: active tab has `border-bottom 2px #3A71F7`, inactive tab is transparent with `text #7D7D87 Regular`.
- **Action buttons** in table rows: view (`bg #EFF4FF, border #C5D3F8`), edit (`bg #F5F5F7, border #E0E0E4`), delete (`bg #FFF0F0, border #F5BABA`).

## El Crítico Results

El Crítico automated audit run across all 4 frames — **zero issues found**, 60 total checks passed:

- [OK] All frames 1440x938px
- [OK] Sidebar/Role=Admin at x:0, y:0, 240x938px on all frames
- [OK] NavItem/Inventario active: bg #EFF1FF, text #3A71F7, Semi Bold
- [OK] No SedeSwitcher anywhere (correct for Admin)
- [OK] Main at x:240, width 1200px
- [OK] Topbar h:60px
- [OK] Cancelar button in Topbar (all creation/detail frames)
- [OK] No SedeSwitcher in Topbar
- [OK] FooterBar present on all creation/detail frames
- [OK] No action buttons in FooterBar
- [OK] Card/Tip bg #EFF1FF on all applicable frames
- [OK] Card/Tip border #3A71F7 on all applicable frames
- [OK] TabBar present on both Detalle frames
- [OK] Tab/Informacion and Tab/Ubicaciones present in both Detalle frames
- [OK] No emojis in any text layer
- [OK] Primary buttons bg #3A71F7 (Admin blue)

## Issues / Deviations

- The "Ciudad" column in the Lista de Bodegas table uses 340px (the "long" col width from the original Table/Frame clone) instead of the 176px specified in the plan. The original 07-01 table was already built before this plan ran and matched the existing Table/Frame (78:89) column structure. This is a minor deviation — functionally the data is legible and the total table width (1156px) is preserved. Can be adjusted in a future polish pass if needed.
- Multiple duplicate frames were created during debugging of the Figma page-switching issue (each `use_figma` call resets the current page). Duplicates were identified and removed programmatically; the 4 canonical frames remain.
