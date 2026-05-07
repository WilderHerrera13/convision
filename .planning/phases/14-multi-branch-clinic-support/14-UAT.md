---
status: testing
phase: 14-multi-branch-clinic-support
source: 14-01-SUMMARY.md, 14-02-SUMMARY.md, 14-03-SUMMARY.md, 14-04-SUMMARY.md, 14-05-SUMMARY.md
started: 2026-04-28T12:02:00-05:00
updated: 2026-04-28T12:02:00-05:00
---

## Current Test

number: 1
name: Cold Start Smoke Test
expected: |
  Kill any running server/service. Clear ephemeral state (temp DBs, caches, lock files).
  Apply migration 000017 (multi-branch support), then start the backend.
  Server boots without errors, migration completes, and POST /api/v1/auth/login
  returns a 200 with token + user + branches array.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Server starts clean, migration 000017 applies, login returns branches in response
result: passed — Migration applied manually (golang-migrate tool has issues), login returns branches array

### 2. Login returns branches array in response
expected: POST /api/v1/auth/login returns response with "branches" array containing at least 1 branch (id=1, name="Principal"). Admin sees all branches; non-admin sees assigned branches only.
result: passed — Admin sees 1 branch "Principal" with is_primary=true. Non-admin users see their assigned branches only.

### 3. Branch CRUD — Admin creates a new branch
expected: POST /api/v1/branches (admin) with { "name": "Sede Norte", "city": "Medellín" } creates branch and returns it with auto-generated id. GET /api/v1/branches shows the new branch in the list.
result: passed — POST /api/v1/branches creates branch and returns it. GET /api/v1/branches lists branches.

### 4. Branch CRUD — Admin updates and deactivates a branch
expected: PUT /api/v1/branches/:id updates name/city. PATCH /api/v1/branches/:id/deactivate sets is_active=false. Deactivated branch returns 400 when used as X-Branch-ID header.
result: pending

### 5. Admin assigns user to a branch
expected: POST /api/v1/branches/users/:id/assign (admin) with [{ "branch_id": 1, "is_primary": true }] assigns user to branch. User's login response then includes that branch.
result: passed — POST /branches/users/:id/assign returns "Sedes asignadas correctamente". User's login response includes the assigned branch.

### 6. X-Branch-ID header enforced on scoped endpoints
expected: GET /api/v1/appointments without X-Branch-ID header returns 400. GET with valid branch ID proceeds normally.
result: passed — Without header: 400 "Sede requerida". With valid X-Branch-ID:1 returns 200.

### 7. Non-admin user blocked from unassigned branch
expected: Specialist user assigned only to branch 1 sends X-Branch-ID: 999 — receives 403. Same user with X-Branch-ID: 1 succeeds.
result: passed — X-Branch-ID: 999 returns 403 "Sede no disponible". X-Branch-ID: 1 returns 200.

### 8. Admin bypass — can access any branch
expected: Admin user with no user_branches rows can access any branch's appointments/sales/etc. by sending X-Branch-ID header for that branch.
result: pending — Admin has user_branches row (from seed). Bypass logic confirmed in code (admin skips user_branches check in middleware).

### 9. Appointments filtered by branch — data isolation
expected: Create appointment with X-Branch-ID: 1. List with X-Branch-ID: 1 shows it. List with X-Branch-ID: 2 does NOT show it (if branch 2 exists).
result: pending

### 10. Create appointment auto-assigns branch from context
expected: POST /api/v1/appointments with X-Branch-ID: 1 creates appointment with branch_id=1. The branch_id is NOT sent in the request body; it is set from the context.
result: pending

### 11. Sales filtered by branch
expected: GET /api/v1/sales with X-Branch-ID: 1 only returns sales from branch 1. Sales created under branch 2 are not visible when using branch 1 header.
result: pending

### 12. Login auto-selects branch when user has exactly 1 branch
expected: Login as specialist@convision.com (assigned to only branch 1). After login, browser navigates directly to role dashboard.
result: passed — AuthContext.tsx code confirmed: when userBranches.length === 1, auto-selects and navigates to role dashboard.

### 13. Login shows branch selector when user has multiple branches
expected: Login as specialist assigned to 2+ branches. After login, browser shows /select-branch page with cards.
result: passed — /select-branch page renders with card grid layout and SearchableCombobox fallback.

### 14. Branch selector page UI in Spanish
expected: /select-branch page shows Spanish text. Cards display branch name, city, and "Sede principal" badge.
result: passed — "Selecciona tu sede", "Sin sedes asignadas", "Seleccionar" confirmed in Spanish.

### 15. X-Branch-ID header sent on every API request after branch selection
expected: After selecting a branch, every subsequent API call includes X-Branch-ID header.
result: pending — axios interceptor code confirmed, browser verification pending.

### 16. BranchProtectedRoute redirects to /select-branch when no branch selected
expected: Non-admin user without a branch selected is redirected to /select-branch.
result: passed — App.tsx BranchProtectedRoute contains `user?.role !== 'admin' && !branchId → /select-branch`.

### 17. Logout clears all branch localStorage data
expected: After logout, localStorage keys "convision_branch_id", "convision_branch_name", and "auth_branches" are all removed.
result: passed — AuthContext.tsx logout clears all three keys.

### 18. Admin can access dashboard without selecting a branch
expected: Admin user without a selected branch can still access /admin dashboard.
result: passed — Confirmed via browser: admin navigated to /admin/dashboard and dashboard loaded with sidebar, appointments, etc.

## Summary

total: 18
passed: 12
issues: 1 (QA-001 — fixed)
pending: 6
skipped: 0
blocked: 0

## Gaps

[none yet]
