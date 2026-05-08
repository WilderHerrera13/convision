---
phase: 15
slug: mobile-responsive-design-app-funcione-correctamente-en-pc-ta
status: draft
shadcn_initialized: true
preset: shadcn-studio (Pro registries @ss-components, @ss-blocks, @ss-themes)
created: 2026-05-08
---

# Phase 15 — UI Design Contract (Responsive)

> Visual and interaction contract scoped to the responsive scope of Phase 15. Existing tokens, typography, and color from the established design system are inherited — this contract only locks **responsive behavior** and **breakpoint-driven decisions** that the planner and executor must follow.

---

## Design System (inherited, not re-defined)

| Property | Value |
|----------|-------|
| Tool | shadcn-studio v3 (CLI with Pro registries) |
| Preset | components.json with `@ss-components/`, `@ss-blocks/`, `@ss-themes/` registries |
| Component library | Radix UI primitives via shadcn (`src/components/ui/`) |
| Icon library | lucide-react |
| Font | system stack (Tailwind default) |
| Token strategy | CSS variables in `src/index.css` consumed via `tailwind.config.ts` |

**No new tokens, components, fonts, or colors are introduced in Phase 15.** The phase's job is to make existing primitives behave correctly across viewports.

---

## Breakpoints (canonical for Phase 15)

| Token | Min width | Target device | Container max |
|-------|-----------|---------------|---------------|
| (default) | 0 | Phone portrait | 100% width, `px-4` |
| `sm:` | 640px | Phone landscape / small tablet | 100% width, `px-6` |
| `md:` | 768px | Tablet portrait | 100% width, `px-6` |
| `lg:` | 1024px | Tablet landscape / small laptop | 100% width, `px-8` |
| `xl:` | 1280px | Desktop | 100% width, `px-8` |
| `2xl:` | 1400px | Large desktop | `max-w-[1400px]` centered (existing container config) |

**Mobile-first rule:** every responsive utility is added as a wider-up override (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`). Never write desktop-first (`md:grid-cols-1`).

**Test viewports** (Playwright + manual):
- 360×640 (phone narrow)
- 414×896 (phone wide)
- 768×1024 (tablet portrait)
- 1024×1366 (tablet landscape / iPad Pro)
- 1440×900 (desktop)

---

## Spacing Scale (inherited)

Standard Tailwind 4-pt scale (`p-1`=4px, `p-2`=8px, `p-4`=16px, `p-6`=24px, `p-8`=32px, `p-12`=48px, `p-16`=64px). No new tokens.

**Responsive padding pattern** (page containers):
```
px-4 sm:px-6 lg:px-8
```

**Responsive gap pattern** (form/grid):
```
gap-4 lg:gap-6
```

**Touch target minimum (mobile/tablet only):**
- Sidebar nav items: `min-h-[44px]` below `lg:` (Apple HIG / WCAG 2.5.5 baseline)
- Icon-only buttons in toolbars: `h-10 w-10` below `md:`, may shrink to `h-9 w-9` at `md:` and up

---

## Typography (inherited, no responsive scaling)

Existing scale stays. Headings do **not** scale down on mobile — they wrap. Body text remains 14–16px across all viewports. The phase does not introduce fluid typography.

| Role | Class | Rationale |
|------|-------|-----------|
| Body | `text-sm` (14) / `text-base` (16) | Existing usage |
| Label | `text-xs` (12) / `text-sm` (14) | Form labels |
| Heading H2/H3 | `text-lg` (18) / `text-xl` (20) | Page section titles — unchanged on mobile |

---

## Color (inherited)

Inherited from `src/index.css` and `tailwind.config.ts` (`convision.*` namespace + shadcn HSL CSS variables). Phase 15 does not introduce, alter, or re-distribute the 60/30/10 split.

| Role | Source | Notes |
|------|--------|-------|
| Dominant (60%) | `bg-background` / `bg-convision-background` | App canvas |
| Secondary (30%) | `bg-card` / `bg-convision-sidebar` | Cards, sidebar |
| Accent (10%) | `bg-primary` (role-themed via `--role-primary`) | Primary CTAs, active nav |
| Destructive | `bg-destructive` | Confirm-delete dialogs only |

---

## Copywriting Contract (inherited)

Phase 15 does not introduce new copy. All Spanish strings already in place stay as-is. Empty/error/CTA copy is **out of scope** for this phase.

| Element | Source |
|---------|--------|
| Primary CTAs | Existing buttons (Guardar, Crear, Confirmar, …) — unchanged |
| Empty states | Existing `EmptyState` component instances — unchanged |
| Error states | Existing toast/inline error copy — unchanged |
| Destructive confirmations | Existing `ConfirmDialog` copy — unchanged |

---

## Responsive Patterns (PHASE 15 CORE CONTRACT)

This section is the prescriptive output the planner MUST consume.

### Pattern R1 — Form grids
**Rule:** every `grid-cols-N` (N≥2) without a responsive prefix is a defect. Replace with mobile-first responsive grid.

| Original | Replacement |
|----------|-------------|
| `grid grid-cols-2 gap-4` | `grid grid-cols-1 sm:grid-cols-2 gap-4` |
| `grid grid-cols-3 gap-4` | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` |
| `grid grid-cols-4 gap-4` | `grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4` |

### Pattern R2 — Two-column page layouts (form + sidebar)
**Rule:** parent flex/grid container stacks vertically below `lg:`.

```tsx
// BEFORE (broken on mobile)
<div className="flex gap-6">
  <main className="flex-1">…</main>
  <aside className="w-[332px]">…</aside>
</div>

// AFTER
<div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
  <main className="flex-1 min-w-0">…</main>
  <aside className="w-full lg:w-[332px] lg:flex-shrink-0">…</aside>
</div>
```

**Fixed widths to convert:** `w-[332px]`, `w-[320px]`, `w-[372px]` → `w-full lg:w-[Npx]`.

### Pattern R3 — Dialogs / Modals
**Rule:** every `Dialog` / `AlertDialog` content must respect viewport width on mobile.

```tsx
<DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
```

The `sm:max-w-lg` (or whatever the design calls for) is the desktop max; the `max-w-[calc(100vw-2rem)]` prevents horizontal overflow at 360px.

### Pattern R4 — EntityTable / DataTable toolbar
**Rule:** toolbar (search + filters + bulk actions + new-button) wraps and stacks on narrow screens.

```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 flex-wrap">
  <Search … className="w-full sm:w-64" />
  <div className="flex flex-wrap items-center gap-2">{filters}</div>
  <Button className="w-full sm:w-auto">Nuevo</Button>
</div>
```

Tables themselves stay scrollable horizontally inside an `overflow-x-auto` wrapper (`<div className="-mx-4 sm:mx-0 overflow-x-auto">`).

### Pattern R5 — Step indicators (multi-step forms)
**Rule:** horizontal-on-desktop, vertical-on-mobile.

```tsx
<ol className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-2">
  {/* each step row stacks on mobile */}
</ol>
```

The "current step number / total" badge stays inline on all viewports.

### Pattern R6 — Date pickers and combobox triggers in forms
**Rule:** `DatePicker` and `SearchableCombobox` triggers must be `w-full` inside form fields, never fixed widths. Popover content stays at its design width and uses Radix's collision detection.

### Pattern R7 — Sidebar navigation (admin / specialist / receptionist)
**Rule:**
- Below `lg:`: sidebar collapses behind a hamburger trigger in the top bar; opens as a `Sheet` covering left 80% of viewport.
- At `lg:` and up: sidebar is permanent at `w-[260px]` (or current width).
- Sidebar items get `min-h-[44px]` below `lg:` for touch targets.

### Pattern R8 — Page container padding
**Rule:** every page wraps content in:
```tsx
<div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
```

`PageLayout.tsx` is the single source of truth. Pages must not add their own `px-*` on the outer wrapper.

### Pattern R9 — Cards inside grids
**Rule:** card grids (dashboard, list views) use:
```
grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4
```

Single-column on phone, 2-up on tablet, 3-up on desktop, 4-up on large desktop.

### Pattern R10 — No horizontal overflow (acceptance gate)
**Rule:** at every breakpoint test viewport, `document.documentElement.scrollWidth <= window.innerWidth`. Any page that overflows horizontally fails the phase. Common culprits to audit: hardcoded `min-w-*` on inputs, `whitespace-nowrap` on long titles, fixed-width sidebars without `lg:` prefix.

---

## In-Scope Components (must be audited and fixed)

The planner MUST cover these explicitly:

| Component / Page | Pattern(s) | File |
|---|---|---|
| `MainLayout` | R7, R8 | `src/components/layouts/MainLayout.tsx` |
| `PageLayout` | R8 | `src/components/layouts/PageLayout.tsx` |
| `ReceptionistSidebar` (and admin/specialist sidebars) | R7 | `src/components/layouts/ReceptionistSidebar.tsx` |
| `ClinicalFormLayout` | R2, R8 | (locate via grep) |
| `AppointmentFormPage` | R5, R1 | (locate) |
| `NewSale` | R2, R1 | (locate) |
| `NewLaboratoryOrder` | R1, R2 | (locate) |
| `EntityTable` / `DataTable` toolbar | R4 | `src/components/ui/data-table/` |
| `Dialog`, `AlertDialog` | R3 | `src/components/ui/dialog.tsx`, `alert-dialog.tsx` |
| Finance forms (cash close, expenses, …) | R1, R8 | (locate) |
| Patient list / appointments calendar | R4, R9 | (locate) |

---

## Out of Scope (deferred)

- Dark mode tweaks for mobile (dark mode itself stays as-is)
- Fluid typography (clamp-based scaling)
- Touch-specific gestures (swipe to delete, pull to refresh)
- Native mobile app or PWA install prompt
- New illustrations or empty-state imagery for mobile

---

## Registry Safety

| Registry | Blocks Used in Phase 15 | Safety Gate |
|----------|-------------------------|-------------|
| shadcn official | none new (only existing primitives modified for responsive classes) | not required |
| `@ss-components/` | none new | not applicable |
| `@ss-blocks/` | none new | not applicable |
| `@ss-themes/` | none new | not applicable |

Phase 15 does not pull any new third-party blocks. All work is class-string changes on existing components.

---

## Acceptance Criteria (must pass before Phase 15 closes)

1. `grep -rE "grid-cols-[2-9]"` in `convision-front/src/` returns **zero** matches without a responsive prefix (`sm:`, `md:`, `lg:`, etc.) — verified via script in 15-05 PLAN.
2. `grep -rE "w-\[[0-9]+px\]"` matches must be paired with a `lg:` prefix or explicit `w-full` fallback.
3. `npm run build` exits 0.
4. Playwright suite passes for the 5 test viewports (360, 414, 768, 1024, 1440) on the in-scope pages — no horizontal scroll, no overlapping content, no inaccessible CTAs.
5. Sidebar collapses below `lg:` on every authenticated page.
6. All `DialogContent` instances include `max-w-[calc(100vw-2rem)]`.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS (no new copy — inherited)
- [ ] Dimension 2 Visuals: PASS (responsive patterns R1–R10 declared)
- [ ] Dimension 3 Color: PASS (inherited, no changes)
- [ ] Dimension 4 Typography: PASS (inherited, no responsive scaling)
- [ ] Dimension 5 Spacing: PASS (Tailwind 4-pt + responsive padding pattern)
- [ ] Dimension 6 Registry Safety: PASS (no new third-party blocks)

**Approval:** pending

---

## Notes

This UI-SPEC was authored manually (not by `gsd-ui-researcher`) because:
- The Claude Code subagent `gsd-ui-researcher` is not registered in this environment.
- Phase 15 is purely a responsive-layout pass over an established design system; no new tokens, components, or copy are introduced.
- Pre-population from upstream (tailwind.config.ts, components.json, src/index.css, src/components/ui/) covered ~95% of the contract; the remaining 5% is the responsive patterns R1–R10, which are the actual deliverable of this phase.
