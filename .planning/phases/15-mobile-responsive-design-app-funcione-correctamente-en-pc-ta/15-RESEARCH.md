# Phase 15 Research: Mobile & Responsive Design

**Date:** 2026-04-28  
**Researcher:** AI Agent  
**Scope:** Full frontend audit of responsive behavior across PC, tablet, and phone

---

## Current State Audit

### Overall Assessment

The codebase has **partial responsive support** with significant gaps. The sidebar/layout has a solid responsive foundation, but most page-level components lack proper mobile adaptation. Several hardcoded pixel widths will break on narrow viewports.

### Responsive Coverage by Component Type

| Component Type | Responsive? | Issues |
|---|---|---|
| AdminLayout (sidebar) | Partially | Solid collapse at 1023px, but mobile breakpoint inconsistency |
| Login page | Yes | Left panel hidden on mobile (`md:block`), good form width |
| EntityTable/DataTable | Partially | Horizontal overflow scroll works but no card-layout fallback |
| PageLayout (page shell) | No | Fixed `px-6`, fixed `h-[56px]`, no responsive padding |
| Forms (general) | Mixed | Some use `sm:`, many grid-cols-2 lack collapse |
| Clinical forms | No | `ClinicalFormLayout` has hardcoded `w-[780px]` |
| Cash register close | Partially | Has `sm:` classes on headers, stepper has responsive circle sizing |
| NewSale page | No | `w-[332px]` sidebar, grid-cols-2 without responsive |
| Dialog/Modals | No | No max-width constraints on mobile |

### Responsive Tailwind Class Usage

```
Files with sm: classes:  80+ files
Files with md: classes:  40+ files
Files with lg: classes:  35+ files
Files with xl: classes:  5 files
```

The distribution shows developers frequently use `sm:` and `md:` but rarely plan for `lg:` tablet layouts. Most responsive work focuses on the small-screen case.

---

## Tailwind Breakpoint Strategy

### Current Configuration

From `tailwind.config.ts`:

```ts
// Default breakpoints (not customized):
// sm:  640px   — mobile landscape / small tablet
// md:  768px   — tablet portrait
// lg:  1024px  — tablet landscape / small desktop
// xl:  1280px  — desktop
// 2xl: 1536px  — large desktop
```

**No custom `screens` are defined.** The `container` center is set with `2xl: 1400px` max-width, which is fine.

### Mobile Breakpoint Inconsistency (Critical Finding)

Two different mobile breakpoints exist:

| Source | Breakpoint | Where |
|---|---|---|
| `useIsMobile()` hook | `< 768px` (md) | All shadcn sidebar logic |
| `AdminLayout` media query | `(max-width: 1023px)` (lg) | AdminLayout sidebar collapse |

This means:
- The `useIsMobile()` hook considers the device "mobile" below 768px
- But `AdminLayout` collapses the sidebar at 1023px
- At 768px-1023px (iPad portrait), `isMobile` = false but sidebar IS collapsed
- The shadcn `Sidebar` component shows as `Sheet` only when `isMobile` = true (below 768px)
- Between 768-1023px, the sidebar uses the `collapsed` state with a toggle button

**Recommendation:** Standardize on a single breakpoint. Since the AdminLayout already uses 1023px for sidebar collapse, either:
1. Update `useIsMobile()` to use 1023px, or
2. Keep the current two-tier approach (tablet = collapsed sidebar with toggle, phone = Sheet overlay)

Option 2 is recommended because it differentiates tablet from phone behavior.

### CSS Custom Properties

The project uses CSS variables for theming (HSL-based for shadcn, named colors for Convision design system). No responsive CSS custom properties were found (e.g., `--container-padding` that changes per breakpoint).

---

## shadcn/ui Mobile Patterns

### Available Mobile-Capable Components

| Component | Mobile Support | File |
|---|---|---|
| Sheet | Yes — slide-in panel, supports left/right/top/bottom | `components/ui/sheet.tsx` |
| Sidebar | Yes — uses `Sheet` on mobile (`isMobile`), hidden div on desktop | `components/ui/sidebar.tsx` |
| Dialog | Partial — `sm:max-w-lg` on content, but no max-width limit on mobile | `components/ui/dialog.tsx` |
| AlertDialog | Same as Dialog | `components/ui/alert-dialog.tsx` |
| Drawer | Yes — bottom sheet for mobile (vaul-based) | `components/ui/drawer.tsx` |
| Popover | Yes — radix handles positioning | `components/ui/popover.tsx` |
| DropdownMenu | Yes — radix handles positioning | `components/ui/dropdown-menu.tsx` |
| NavigationMenu | Partial — `sm:flex` on triggers | `components/ui/navigation-menu.tsx` |
| Toggle | Yes — `sm:flex` variant | `components/ui/toggle.tsx` |
| Toast | Partial — `sm:top-0 sm:right-0` positioning | `components/ui/toast.tsx` |
| Button | Partial — `sm` size variant | `components/ui/button.tsx` |
| Breadcrumb | Minimal — `sm:block` on separator | `components/ui/breadcrumb.tsx` |
| Input | Minimal — `sm:text-sm` | `components/ui/input.tsx` |

### Sheet Component (Used for Mobile Navigation)

The `Sheet` component already handles mobile-sidebar use. Current configuration:
- Left side: `w-3/4` (75% on mobile), `sm:max-w-sm` (384px on larger screens)
- Right side: same sizing
- **Known issue:** The sidebar `SheetContent` hides the close button with `[&>button]:hidden`, relying on the backdrop click to close — this is intentional for sidebar UX

### Critical Pattern: `useIsMobile()` Hook

```tsx
// hooks/use-mobile.tsx
const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Returns true when window.innerWidth < 768
  // Used by: Sidebar, SidebarProvider, and any component consuming useSidebar()
}
```

This hook is used extensively in `sidebar.tsx` to decide between `Sheet` (mobile) and fixed sidebar (desktop).

---

## Key Pages Audit

### 1. AdminLayout (`layouts/AdminLayout.tsx`) — THE CRITICAL LAYOUT

**Current responsive behavior:**
- **Above 1023px**: Full sidebar (`w-[240px]`) with collapsible toggle
- **768px–1023px**: Collapsed sidebar (only toggle buttons visible, `pl-12` main content)
- **Below 768px**: Sidebar hidden by default; toggle opens as overlay (fixed position `z-60`, with backdrop `bg-black/40`)
- **Main content**: `flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden h-screen`

**Issues found:**
- Sidebar width is `w-[240px]` (fixed pixel), not relative
- The collapsed state toggle buttons (`top-4 left-3`) may overlap with page content
- No transition animation when sidebar collapses/expands (it's instant toggle)
- `AdminTopBar` is only visible for admin role — specialist/receptionist have no top bar at all

**Responsive classes used:**
- `md:block` on desktop sidebar
- `fixed inset-0 z-[55] bg-black/40` backdrop on mobile
- `fixed inset-y-0 left-0 z-[60] shadow-lg` sidebar overlay on mobile
- `pl-12` on main content when collapsed and not mobile

### 2. Login Page (`pages/Login.tsx`)

**Current responsive behavior:**
- Left illustration panel: `hidden md:block` with `w-[680px]` — hidden on mobile
- Right form panel: `flex-1` with `md:pt-[213px]` — fills full width on mobile
- Card: `max-w-[400px]` — centered, reasonable width
- Footer: `md:hidden` shows tagline only on mobile

**Issues found:**
- `w-[680px]` illustration panel is hardcoded; won't scale on different desktop sizes
- `pt-10` on mobile vs `md:pt-[213px]` on desktop — large difference but visually works
- No issues for the login flow specifically

**Verdict:** Login page is adequately responsive for a single-form view.

### 3. Appointment Form (`pages/receptionist/AppointmentFormPage.tsx`)

**Current responsive behavior:**
- Main layout: `flex-col lg:flex-row` — stacks vertically on mobile, side-by-side on desktop
- Aside panel: `w-full lg:w-[340px]` — full width on mobile
- Step indicator: `w-[110px]` per step, 4 steps = 440px minimum — **will overflow on mobile**
- Date picker layout: `grid-cols-[1fr_1px_240px]` — **no responsive fallback; breaks on mobile**
- Patient form: `grid-cols-2` — **no collapse to 1 column on mobile**
- Specialist selection: `grid-cols-2` — **no collapse**

**Issues found (HIGH priority):**
1. `grid-cols-[1fr_1px_240px]` at line 619 — three-column layout with no responsive variant. On mobile, the date picker + time column will be squeezed.
2. Step indicator `w-[110px]` per step — at 4 steps + connectors, needs ~500px minimum
3. No `grid-cols-1 sm:grid-cols-2` on patient/specialist grids
4. Bottom navigation buttons could wrap poorly on narrow screens

### 4. Clinical Form Layout (`components/clinical/ClinicalFormLayout.tsx`)

**Current responsive behavior: NONE**

```tsx
<div className="w-[780px] flex-shrink-0">{formCard}</div>
<div className="w-[332px] flex-shrink-0">{asidePanel}</div>
```

**Issues found (CRITICAL priority):**
- `w-[780px]` + `w-[332px]` + `gap-6` + `p-6` = ~1,200px minimum width
- No scroll container wrapping
- This breaks on ALL tablets and phones
- Sidebar: `w-60` (240px) — another 240px
- **Total minimum**: ~1,440px — only works on full HD+ desktop screens

**This is the single biggest responsive blocker.** Used by specialist clinical forms (Anamnesis, Diagnosis, Visual Exam, Prescription tabs).

### 5. Cash Register Close (`pages/receptionist/CashRegisterClose.tsx`)

**Current responsive behavior:**
- Header: `flex-wrap` with `gap-4` — good, wraps on narrow screens
- Title: `sm:text-lg` — responsive font size
- DatePicker wrapper: `max-w-[180px] sm:w-48` — responsive width
- Stepper: `px-3 py-4 sm:px-8` — responsive padding
- Step circles: `h-10 w-10 sm:h-11 sm:w-11` — responsive sizing
- Footer buttons: `flex-wrap` with `gap-2 sm:gap-3` — wraps on mobile
- Payment method cards: via `AdvisorCashCloseSteps` → `AdvisorCashCloseDataStep`

**Issues found (MEDIUM priority):**
- Cash close stepper shows only 2 steps, fits mobile well
- Payment method cards need audit in `AdvisorCashCloseDataStep` (likely `grid-cols-1 sm:grid-cols-2` needed)
- Sticky footer `bottom-0` works on all sizes
- Denomination grid (in child component) may need responsive audit

### 6. NewSale Page (`pages/receptionist/NewSale.tsx`)

**Current responsive behavior:**
- Layout: `flex gap-6 p-6` — no responsive direction change
- Sidebar: `w-[332px]` — **hardcoded, no responsive**
- Document info: `grid-cols-2` — **no collapse**
- Payment form: `grid-cols-2` — **no collapse**

**Issues found (HIGH priority):**
1. `w-[332px]` purchase summary sidebar — needs `lg:flex` approach similar to AppointmentFormPage
2. Product list + purchase summary must stack vertically on mobile
3. Payment form grid must collapse

### 7. Patient/List Pages with EntityTable

**Current responsive behavior:**
- EntityTable wraps DataTable in a Card with `overflow-hidden`
- DataTable has `w-full` table but supports `tableClassName` prop for min-width
- Example: `tableClassName="table-fixed w-full min-w-[680px]"` on ReceptionistDashboard

**Issues found (MEDIUM priority):**
- The table uses horizontal overflow scroll (via `overflow-hidden` on Card parent)
- No card-based layout alternative for mobile
- `table-fixed` + `min-w-[680px]` means good horizontal scroll on mobile
- Search + pagination controls in ledger toolbar: `w-[220px]` search input may be too wide
- Ledger toolbar: `flex h-[52px] items-center justify-between` — search + actions may wrap on narrow screens

**Verdict:** Horizontal scroll approach is acceptable for data-heavy tables, but the toolbar needs responsive wrapping.

### 8. Admin Dashboard / Receptionist Dashboard

**Current responsive behavior:**
- Dashboard widgets: `grid-cols-1 lg:grid-cols-3` — good responsive grid
- ReceptionistDashboard: `grid-cols-1 lg:grid-cols-3` with sidebar on `xl:col-span-2`
- Specialist dashboard: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`

**Verdict:** Dashboard pages have good responsive grids. Acceptable.

### 9. Forms with grid-cols-2 (No Responsive)

The following forms use `grid-cols-2` without responsive breakpoints and WILL break on mobile:

| File | Lines | Impact |
|---|---|---|
| `NewSale.tsx` | 54, 204 | Sale document form, payment form |
| `NewLaboratoryOrder.tsx` | 394, 497, 604, 775, 805, 858 | Lab order creation — CRITICAL |
| `NewPatient.tsx` | multiple | Patient creation form |
| `EditPatient.tsx` | multiple | Patient edit form |
| `NewExpense.tsx` | — | Expense form |
| `NewPayroll.tsx` | — | Payroll form |
| `NewPurchase.tsx` | multiple | Purchase form |
| `NewServiceOrder.tsx` | multiple | Service order form |
| `NewCashTransfer.tsx` | — | Cash transfer form |
| `AppointmentFormPage.tsx` | 391, 407, 430, 570 | Appointment form grids |
| Clinical form tabs (Anamnesis, Diagnosis, etc.) | multiple | ALL clinical form grids |
| `Patients.tsx` (admin/receptionist) | multiple | Patient detail/edit modals |

---

## Navigation Strategy Recommendations

### Current State

The AdminLayout already implements a two-tier navigation approach:
- **Desktop (>1023px)**: Full sidebar with nav sections, toggleable to collapsed state
- **Tablet (768-1023px)**: Collapsed sidebar with Menu + Logout toggle buttons
- **Phone (<768px)**: No sidebar by default; toggle opens it as overlay with backdrop

### Recommended Navigation Strategy

**Option A: Keep current two-tier (Recommended)**

Keep the current approach but fix inconsistencies:
- Phone (<768px): Sheet overlay sidebar (already implemented in shadcn `Sidebar`)
- Tablet (768-1023px): Collapsed sidebar with icon toggle (already implemented)
- Desktop (>1023px): Full sidebar (already implemented)

**What needs fixing:**
- `useIsMobile()` hook breakpoint (768) vs AdminLayout breakpoint (1023) — document this as intentional
- Mobile sidebar close on nav click (already implemented via `setOpenMobile(false)`)
- Mobile sidebar close on backdrop click (already implemented)
- Touch-friendly tap targets (sidebar items at `h-9` = 36px should be increased to 44px minimum for mobile)

**Option B: Bottom navigation bar on mobile**

Add a fixed bottom nav bar for phone sizes. This would be a significant UX departure. Not recommended for v1 since the overlay sidebar pattern is well-established.

**Recommendation:** Stay with Option A. It requires zero new components and minimal changes.

### Top Bar

The `AdminTopBar` is only rendered for admin role. Specialist and receptionist have no top bar in the main content area.

- **Admin**: AdminTopBar is rendered (60px with breadcrumb, notification bell, date)
- **Specialist/Receptionist**: No top bar — the sidebar header acts as the main chrome

This is acceptable but means specialist/receptionist views have no page-level breadcrumb on mobile.

---

## Data Table Strategy

### Current Approach

EntityTable/DataTable uses **horizontal overflow scroll** as its only responsive strategy:
- Tables are wrapped in Card with `overflow-hidden`
- `tableClassName="table-fixed w-full min-w-[680px]"` sets minimum width
- The table container scrolls horizontally when viewport is narrower

### Evaluation

| Strategy | Pros | Cons | Suitability |
|---|---|---|---|
| Horizontal scroll (current) | Simple, preserves all columns, no data loss | Requires horizontal swipe, can be non-obvious | Good for data-dense admin tables |
| Card layout per row | Touch-friendly, no horizontal scroll | Loses column context, more vertical space, complex implementation | Good for simple entity lists |
| Priority columns | Hide less important columns on mobile | Users may need hidden data, complex column config | Good for dashboards |
| Responsive table (CSS) | Columns stack or reflow | Complex CSS, inconsistent with EntityTable pattern | Not suitable |

### Recommendation

**Keep horizontal scroll for tables with 5+ columns** (appointments, sales, patients, cash closes). This is the industry standard for data-heavy admin interfaces and is what users of systems like this expect.

**Add card-based layout option for simpler lists** (2-3 columns, like laboratory list or specialist list) by introducing a `mobileCardView` prop on EntityTable that switches to a card layout below a configurable breakpoint.

**Priority columns approach**: Add `hideOnMobile?: boolean` to `DataTableColumnDef` as a lighter alternative. Users can toggle hidden columns back via a "Columns" menu.

**Implementation recommendation:**
1. Add `hideOnMobile?: boolean` to `DataTableColumnDef` — columns hidden below `md:` breakpoint
2. Add mobile-scroll-hint component (a subtle fade on the right edge indicating more columns)
3. `tableScrollClassName` already supports scroll containers
4. Keep EntityTable API unchanged; responsive behavior is internal

---

## Form Strategy

### Current Issues

Most forms use Tailwind's `grid-cols-2` without responsive variants. On mobile:
- Two-column grids become too narrow (each column ~160px on a 360px phone minus padding)
- Labels overlap inputs on very narrow columns
- DatePicker/Combobox components may overflow

### Recommended Patterns

**Pattern 1: Single-column on mobile**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  {/* fields */}
</div>
```
Use for: Patient forms, product forms, any form with 2-column desktop layout.

**Pattern 2: Full-width inputs**
```tsx
<Input className="w-full" />
```
All form inputs in single-column mode should use `w-full` instead of fixed widths.

**Pattern 3: Responsive form sections**
```tsx
<div className="space-y-6 p-4 sm:p-6">
  {/* form sections */}
</div>
```
Reduce padding on mobile for more usable space.

**Pattern 4: Sticky submit buttons**
```tsx
<div className="sticky bottom-0 z-30 border-t bg-background/95 px-4 py-3 sm:px-6">
  <Button className="w-full sm:w-auto">Guardar</Button>
</div>
```
Full-width buttons on mobile, auto-width on desktop.

### Special Cases

**DatePicker:** Already uses a Popover-based calendar that positions automatically. Works on mobile. Ensure the calendar popover doesn't overflow the viewport — radix handles this natively.

**SearchableCombobox:** Uses Popover + Command. Should work on mobile since radix handles positioning. No changes needed.

**Step indicators:** Multi-step forms with step indicators (AppointmentFormPage has 4 steps, CashCloseStepper has 2) need to collapse on mobile:
- Show only the current step number + label
- Use a progress bar instead of individual step circles
- Or reduce step circle size on mobile (`h-6 w-6 sm:h-8 sm:w-8`)

---

## Testing Approach

### Testing Strategy

| Level | Tool | What to test |
|---|---|---|
| Dev tools | Chrome DevTools responsive mode | Manual visual check of all pages at 375px (iPhone SE), 768px (iPad), 1024px (iPad Pro) |
| Automated | Playwright viewport tests | Automated screenshot comparisons at key breakpoints |
| QA exploratory | BrowserStack / real devices | Real touch interaction, iOS Safari quirks |

### Key Breakpoints to Test

- **360px** — small Android phone
- **375px** — iPhone SE
- **390px** — iPhone 14
- **414px** — iPhone 14 Pro Max
- **768px** — iPad portrait
- **1024px** — iPad landscape / small laptop
- **1280px** — standard laptop
- **1440px+** — desktop monitor

### Pages Requiring Mandatory Mobile Testing

1. **Login** — ✓ already responsive
2. **Select Branch** — needs testing
3. **Admin Dashboard** — needs testing (widget grid)
4. **Appointment Form** (receptionist) — HIGH priority (step indicator + date layout)
5. **Appointments List** — needs testing (table horizontal scroll)
6. **Patient List** — needs testing (table + filters)
7. **New/Edit Patient** — HIGH priority (grid-cols-2 forms)
8. **Cash Register Close** — needs testing (payment method cards)
9. **Daily Report** — needs testing
10. **New Sale** — HIGH priority (w-[332px] sidebar + forms)
11. **Clinical Form (specialist)** — CRITICAL priority (ClinicalFormLayout hardcoded widths)
12. **New Laboratory Order** — HIGH priority (multi-step form)
13. **Lab Order Detail** — needs testing (complex layout)
14. **Admin Cash Closes** — needs testing (table + filters)
15. **Supplier/Laboratory Forms** — needs testing (grid-cols-2)

---

## Recommended Implementation Order

### Wave 1: Layout Foundation (Addresses all pages)
1. **Fix ClinicalFormLayout** — convert `w-[780px]` and `w-[332px]` to responsive (`w-full lg:w-[780px]`, etc.)
2. **Standardize breakpoints** — document the two-tier approach (768 mobile, 1023 sidebar collapse)
3. **Add responsive PageLayout** — `px-4 sm:px-6`, `min-h-[56px]` topbar
4. **Fix sidebar tap targets** — increase nav items to `min-h-[44px]` on mobile

### Wave 2: Global Patterns (Fixes all forms at once)
5. **Audit all `grid-cols-2`** — add `grid-cols-1 sm:grid-cols-2` (highest ROI)
6. **Audit all `grid-cols-3`** — add responsive fallback
7. **Audit fixed widths** — convert `w-[Xpx]` sidebars to `lg:w-[Xpx]` with `w-full` default
8. **EntityTable toolbar** — responsive wrap on narrow screens

### Wave 3: High-Impact Pages
9. **AppointmentFormPage** — step indicator collapse, date layout fix
10. **NewSale page** — sidebar stack, form grid collapse
11. **Clinical form pages** — depends on Wave 1 ClinicalFormLayout fix

### Wave 4: Form Pages Audit
12. **Patient forms** (New/Edit) — grid collapse
13. **Lab order forms** — multi-step responsive
14. **Finance forms** (Expense, Payroll, Purchase, Transfer) — grid collapse

### Wave 5: Polish & Testing
15. **Dialog/Modal max-width** on mobile
16. **Table mobile scroll hints**
17. **Playwright viewport tests**
18. **QA exploratory on real devices**

---

## Research Summary

### Key Findings for the Planner

1. **The layout foundation is partially responsive but inconsistent.** AdminLayout handles sidebar collapse well, but `ClinicalFormLayout` is completely broken on mobile with hardcoded `w-[780px]`.

2. **The single highest-ROI change** is making all `grid-cols-2` use `grid-cols-1 sm:grid-cols-2`. This affects ~90% of forms across the entire app and can be done with search-and-replace plus individual verification.

3. **Fixed sidebar widths** (`w-[332px]`, `w-[340px]`, `w-[780px]`) need to become responsive: `w-full` below `lg:` breakpoint, fixed width above. AppointmentFormPage already demonstrates this pattern correctly.

4. **EntityTable/DataTable horizontal scroll is acceptable** for data-dense tables. Card-based layouts should be an enhancement, not a requirement for Phase 15.

5. **Navigation strategy does not need to change.** The current Sheet-overlay-on-mobile, collapsed-on-tablet, full-on-desktop approach is solid. Only minor polish needed (tap target sizes).

6. **The mobile breakpoint inconsistency** (`useIsMobile` = 768 vs AdminLayout = 1023) is intentional and documents a two-tier approach (phone vs tablet). Document this explicitly rather than "fixing" it.

7. **No backend changes are needed.** This is a pure frontend CSS/component phase.

8. **Estimated scope:** ~50-80 files need modifications, but ~70% of changes are mechanical (adding responsive prefixes to existing Tailwind classes).

### Critical Blockers

| Blocker | Severity | Affected Roles |
|---|---|---|
| `ClinicalFormLayout` fixed widths | CRITICAL | Specialist |
| `AppointmentFormPage` date layout `grid-cols-[1fr_1px_240px]` | HIGH | Receptionist |
| `NewSale` `w-[332px]` sidebar | HIGH | Receptionist |
| `grid-cols-2` without responsive (~40+ instances) | MEDIUM | All |
| Step indicator `w-[110px]` per step at 4 steps | MEDIUM | Receptionist |

---

## RESEARCH COMPLETE
