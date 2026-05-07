---
plan: 19-06
title: "Cleanup: remove deprecated RequireRole, rename Role→UserType in Claims, remove deprecated auth helpers"
status: completed
---

## What was done

**Backend cleanup:**
- Removed `RequireRole` function from `middleware.go` — all routes now use `RequirePermission`/`RequireAnyPermission`
- Renamed `Role domain.Role` → `UserType string` in JWT `Claims` struct in `jwt.go`
- Updated `GenerateToken` to set `UserType: string(user.RoleType)` instead of `Role: user.RoleType`
- Updated all `claims.Role` references to `claims.UserType` (or `domain.Role(claims.UserType)` for casts): `handler_discount.go`, `handler_management_report.go`, `handler_cash_register_close.go`, `handler_t10.go`, `middleware/branch.go`
- Fixed `testutil/auth.go`: `Role:` → `UserType:` in `MakeTestClaims`
- Fixed `testutil/mocks/user_repo.go`: added missing `GetRoles`, `AssignRoles`, `IncrementTokenVersion` methods to satisfy updated `domain.UserRepository` interface
- Fixed pre-existing bug in `cmd/api/main.go`: `inventorysvc.NewService` was missing `db` as first arg after Phase 16 signature change

**Frontend cleanup:**
- Removed `isAdmin()`, `isSpecialist()`, `isReceptionist()` from `AuthContextType` interface and `AuthProvider` implementation in `AuthContext.tsx`
- Updated all callers to inline `role_type ?? role` checks:
  - `LabOrderDetail.tsx` — `isAdmin()` → local `(user?.role_type ?? user?.role) === 'admin'`
  - `LabOrderSidebar.tsx` — both `isAdmin()` and `isReceptionist()`
  - `ConfirmReception.tsx` — both `isAdmin()` and `isReceptionist()`
  - `NewLaboratoryOrder.tsx` — `isReceptionist()`
  - `QualityReview.tsx` — `isAdmin()`

## Build verification
- `make build`: exits 0
- `make test`: exits 0 (all 5 test packages pass)
- `npm run build`: exits 0
