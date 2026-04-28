---
phase: 14-multi-branch-clinic-support
plan: 14-05
subsystem: frontend
tags: [react, typescript, context, axios, branch-selector, route-guards, localStorage]

# Dependency graph
requires:
  - phase: 14-03
    provides: Login response includes branches array, X-Branch-ID middleware, BranchContext helper
  - phase: 14-04
    provides: All backend endpoints now scoped by branch_id via BranchIDFromCtx
provides:
  - BranchContext React context with localStorage persistence (branchId, branchName, setBranch, clearBranch)
  - Axios interceptor sends X-Branch-ID header on all requests when branch is selected
  - SelectBranchPage with card grid (≤6 branches) or SearchableCombobox (>6)
  - BranchProtectedRoute that redirects non-admin users to /select-branch when no branch selected
  - Login flow routes to /select-branch when user has multiple branches, auto-selects when only 1
  - Logout clears all branch localStorage keys
affects: [frontend-data-scoping]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - React Context for branch state with localStorage persistence (keys: convision_branch_id, convision_branch_name)
    - Axios request interceptor pattern extended to include X-Branch-ID header
    - BranchProtectedRoute pattern: extends ProtectedRoute with branch_id guard for non-admin users
    - Auto-select pattern: single-branch users skip the selector page entirely

key-files:
  created:
    - convision-front/src/contexts/BranchContext.tsx
    - convision-front/src/pages/SelectBranchPage.tsx
  modified:
    - convision-front/src/lib/axios.ts
    - convision-front/src/services/auth.ts
    - convision-front/src/contexts/AuthContext.tsx
    - convision-front/src/App.tsx

key-decisions:
  - "BranchContext uses direct localStorage reads in state initializer for session persistence across page refreshes"
  - "AuthContext does NOT import useBranch to avoid circular dependency; uses direct localStorage manipulation instead"
  - "Admin users can access role dashboards without selecting a branch (BranchProtectedRoute skips branch_id check for admin)"
  - "Auto-select branch when user has exactly 1 branch: navigate directly to role dashboard, no /select-branch shown"
  - "Login function in AuthContext handles branch routing — single branch auto-selects, multiple branches go to /select-branch"

patterns-established:
  - "BranchContext pattern: React Context with localStorage-backed state initializer for cross-session persistence"
  - "BranchProtectedRoute pattern: auth check → role check → branch check (admin bypass) → render children"
  - "Axios branch header pattern: reads convision_branch_id from localStorage, conditionally sends X-Branch-ID"

requirements-completed: [BRANCH-05, BRANCH-09, BRANCH-10]

# Metrics
duration: ~25min
completed: 2026-04-28
---

# Phase 14 Plan 5: Frontend BranchContext, SelectBranchPage, Route Guards Summary

**BranchContext with localStorage persistence, axios X-Branch-ID interceptor, SelectBranchPage with card grid/combobox, BranchProtectedRoute with admin bypass, and login branch routing**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-28T15:55:00Z
- **Completed:** 2026-04-28T16:20:00Z
- **Tasks:** 6
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments

- BranchContext stores branchId and branchName in React context, persists to localStorage with keys `convision_branch_id` and `convision_branch_name`
- Axios interceptor reads `convision_branch_id` from localStorage and sends `X-Branch-ID` header on every API request
- AuthService now stores `branches` array from login/refresh responses in `auth_branches` localStorage key
- Login flow auto-selects branch when user has exactly 1 branch; navigates to `/select-branch` when >1
- SelectBranchPage displays branch cards (≤6) or SearchableCombobox (>6), all UI in Spanish
- BranchProtectedRoute enforces branch selection for non-admin users on /admin, /specialist, /receptionist routes
- Logout clears all branch-related localStorage keys (`convision_branch_id`, `convision_branch_name`, `auth_branches`)
- HomePage redirects non-admin users without a branch to `/select-branch`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create src/contexts/BranchContext.tsx** - `b9fcfdd` (feat)
2. **Task 2: Update src/lib/axios.ts to add X-Branch-ID interceptor** - `8bfd483` (feat)
3. **Task 3: Update src/services/auth.ts and AuthContext.tsx to store branches** - `baa36b5` (feat)
4. **Task 4: Create src/pages/SelectBranchPage.tsx** - `16b4634` (feat)
5. **Task 5: Update src/App.tsx with BranchProtectedRoute and /select-branch** - `307e99a` (feat)
6. **Task 6: Update AuthContext logout to clear branch from localStorage** - `8553d06` (feat)

## Files Created/Modified

- `convision-front/src/contexts/BranchContext.tsx` - New: React Context with branchId/branchName state, localStorage persistence, useBranch hook
- `convision-front/src/pages/SelectBranchPage.tsx` - New: Branch selector page with card grid (≤6) or SearchableCombobox (>6), Spanish UI
- `convision-front/src/lib/axios.ts` - Added X-Branch-ID header to request interceptor (reads convision_branch_id from localStorage)
- `convision-front/src/services/auth.ts` - Added BranchInfo interface, branches in AuthResponse, auth_branches storage, getBranches() helper
- `convision-front/src/contexts/AuthContext.tsx` - Added branches state, login branch routing, logout branch cleanup, checkAuth branch clearing
- `convision-front/src/App.tsx` - Added BranchProvider wrapping, BranchProtectedRoute, /select-branch route, updated role layouts, updated HomePage

## Decisions Made

- BranchContext uses direct localStorage in state initializer for session persistence across page refreshes
- AuthContext avoids importing useBranch to prevent circular dependency; manipulates localStorage directly for branch clearing
- Admin users bypass the branch_id check in BranchProtectedRoute (can access dashboards without selecting a branch)
- Single-branch users skip /select-branch entirely — auto-select and navigate directly to role dashboard
- Login function handles all branch routing logic in AuthContext

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- Frontend now sends X-Branch-ID on every API request when a branch is selected
- Branch selection flow complete: login → auto-select or /select-branch → role dashboard
- BranchProtectedRoute guards all role-based routes
- All UI text in Spanish, components under 200 lines
- Ready for 14-06 (end-to-end testing and final integration)

---

*Phase: 14-multi-branch-clinic-support*
*Completed: 2026-04-28*
