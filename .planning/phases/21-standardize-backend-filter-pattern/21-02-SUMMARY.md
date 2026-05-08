---
phase: 21-standardize-backend-filter-pattern
plan: 02
subsystem: api
tags: [go, gorm, gin, filter-structs, role, notification, mocks]

requires:
  - phase: 21-01
    provides: domain.Pagination struct + canonical Filter pattern documentation
provides:
  - RoleFilter typed struct + ShouldBindQuery wired end-to-end (domain → repo → service → handler)
  - NotificationFilter typed struct + ShouldBindQuery wired end-to-end + mock updated
  - Reference template for waves 2–6 to migrate other domains
affects: [21-03, 21-04, 21-05, 21-06, 21-07, 21-08, 21-09, 21-10]

tech-stack:
  added: []
  patterns:
    - "Replace map[string]any+page+perPage with domain.<Name>Filter on Repository.List"
    - "Service.List receives typed Filter, calls f.Clamp(), forwards to repo"
    - "Handler binds via c.ShouldBindQuery(&f); response meta reads from service ListOutput.Page/PerPage"

key-files:
  created: []
  modified:
    - convision-api-golang/internal/domain/role.go
    - convision-api-golang/internal/domain/notification.go
    - convision-api-golang/internal/platform/storage/postgres/role_repository.go
    - convision-api-golang/internal/platform/storage/postgres/notification_repository.go
    - convision-api-golang/internal/role/service.go
    - convision-api-golang/internal/notification/service.go
    - convision-api-golang/internal/transport/http/v1/handler_role.go
    - convision-api-golang/internal/transport/http/v1/handler_t10.go
    - convision-api-golang/internal/testutil/mocks/notification_repo.go

key-decisions:
  - "Bundled T1+T2 (and T3+T4, T5+T6) into compound commits because the Repository interface change and its sole implementation are inseparable — splitting them would land an uncompilable HEAD"
  - "Skipped role mock update from T6 — internal/testutil/mocks/role_repo.go does not exist (no Role mock exists in the repo yet); only notification_repo.go mock was present and was updated"
  - "Notification handler meta now reads out.Page/out.PerPage from the service output instead of unbound page/perPage locals (the originals were removed when ShouldBindQuery replaced the strconv plumbing)"
  - "NotificationFilter uses *bool with switch-case (Archived true → archived; Unread true → unread+inbox; default → inbox) preserving the original repo semantics where 'archived=1 wins over unread=1' as a case ordering"

patterns-established:
  - "Filter struct named <Entity>Filter, embeds domain.Pagination, lives in domain/<entity>.go"
  - "Service ListOutput populated from f.Page/f.PerPage post-Clamp so handlers can use it as the meta source of truth"
  - "Mocks only need the new typed signature; they do not need to retain backward compatibility"

requirements-completed: [FILTER-01, FILTER-02, FILTER-03, FILTER-04, FILTER-05]

duration: 25min
completed: 2026-05-08
---

# Phase 21-02: Role and Notification Filter Migration Summary

**Migrated Role and Notification list endpoints from map[string]any+page+perPage to typed RoleFilter / NotificationFilter ShouldBindQuery flow end-to-end across domain, repository, service, handler, and notification mock.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-05-08
- **Tasks:** 6 (committed as 3 compound commits)
- **Files modified:** 9

## Accomplishments

- `RoleFilter{Pagination, Name}` and `NotificationFilter{Pagination, *bool Archived, *bool Unread}` defined alongside their entities in `internal/domain/`.
- `RoleRepository.List` and `NotificationRepository.List` now accept the typed Filter; existing soft-delete + Permissions preload + ordering preserved on roles; archived/unread/inbox case ordering preserved on notifications.
- `role/service.go` and `notification/service.go` `List` methods receive the typed Filter, call `f.Clamp()`, and populate `ListOutput.Page/PerPage` from the clamped values.
- `handler_role.go` `ListRoles` and `handler_t10.go` `ListNotifications` use `c.ShouldBindQuery(&f)` — no more `strconv.Atoi(c.DefaultQuery(...))` or per-key `c.Query(...)` for filter params.
- `MockNotificationRepository.List` signature updated to match the new interface; `make build` and `go test ./...` (except for a pre-existing inventory test failure tracked for plan 21-03) pass.

## Task Commits

1. **T1+T2: Domain RoleFilter struct + role_repository typed List** — `0bc67e3` (refactor)
2. **T3+T4: Role service + handler typed flow** — `6a5abfb` (refactor)
3. **T5+T6: NotificationFilter end-to-end + mock update** — `176d0d5` (refactor)

## Files Created/Modified

- `internal/domain/role.go` — added `RoleFilter`; `RoleRepository.List` typed
- `internal/domain/notification.go` — added `NotificationFilter`; `NotificationRepository.List` typed
- `internal/platform/storage/postgres/role_repository.go` — typed List, preserved soft-delete + Permissions preload
- `internal/platform/storage/postgres/notification_repository.go` — typed List with switch on `*bool` filters
- `internal/role/service.go` — `List(db, f RoleFilter)`
- `internal/notification/service.go` — `List(db, f NotificationFilter)`
- `internal/transport/http/v1/handler_role.go` — `ShouldBindQuery`
- `internal/transport/http/v1/handler_t10.go` — `ShouldBindQuery`; meta reads from service `ListOutput`
- `internal/testutil/mocks/notification_repo.go` — typed mock signature

## Decisions Made

- **Compound commits** — T1+T2 / T3+T4 / T5+T6 had to ship together because the Repository interface change and its only implementation must compile in lockstep. Splitting into 6 commits would have left HEAD uncompilable mid-plan.
- **Notification meta source** — repurposed `out.Page` / `out.PerPage` (set by service from clamped filter) instead of resurrecting page/perPage locals, since ShouldBindQuery already populated them.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule: missing precondition] Skipped role mock update**
- **Found during:** T6 (`grep -l MockRoleRepository internal/testutil/mocks/`)
- **Issue:** Plan T6 instructed updating `internal/testutil/mocks/role_repo.go`, but no such file exists in the repository.
- **Fix:** Skipped that step; only updated `notification_repo.go`. No build/test regression because there is no consumer of a Role mock.
- **Files modified:** None additional.
- **Verification:** `go build ./...` and `go test ./...` (excluding pre-existing inventory failure) pass.
- **Committed in:** `176d0d5` (note in commit body)

**2. [Rule: outside-scope code refactor] Notification handler meta locals**
- **Found during:** T5 (`go build` after handler_t10 edit reported `undefined: page`/`perPage`)
- **Issue:** Removing the strconv-based plumbing made the response meta block (`current_page`, `last_page`, `per_page`) reference undefined variables.
- **Fix:** Replaced `page` / `perPage` references with `out.Page` / `out.PerPage` from the service output. Behavior is identical — service populates those fields from the clamped filter.
- **Files modified:** `internal/transport/http/v1/handler_t10.go`
- **Verification:** `make build` clean; clamping still applied via `f.Clamp()` in service.
- **Committed in:** `176d0d5`

---

**Total deviations:** 2 auto-fixed (1 missing precondition, 1 outside-scope refactor)
**Impact on plan:** Both necessary for correctness. No scope creep — only directly affected lines were touched.

## Issues Encountered

- Pre-existing build failure in `internal/inventory/service_test.go` (introduced in commit `e0f2476`, predates Phase 21) — calls `svc.CreateTransfer(input)` with one arg but signature requires `(db, input)`. Unrelated to Filter Struct migration; will be addressed in plan 21-03.

## Next Phase Readiness

- Wave 1 complete (21-01 + 21-02). Pattern proven on the smallest, lowest-risk domains.
- Subsequent plans can now reference `RoleFilter` / `NotificationFilter` as the canonical migration template.
- No blockers for Wave 2 (plans 21-03 inventory + 21-04 sales/quote/order).
