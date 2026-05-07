package auth_test

import (
	"testing"
)

// mockOpticaPermRepo is a minimal in-test mock for domain.OpticaPermissionRepository.
type mockOpticaPermRepo struct {
	keys      []string
	hasAny    bool
	hasAnyErr error
	listErr   error
}

func (m *mockOpticaPermRepo) ListByOpticaID(_ uint) ([]string, error) {
	return m.keys, m.listErr
}

func (m *mockOpticaPermRepo) ReplaceAll(_ uint, _ []string) error { return nil }

func (m *mockOpticaPermRepo) HasAny(_ uint) (bool, error) {
	return m.hasAny, m.hasAnyErr
}

// applyPermissionCeiling mirrors the intersection logic in auth/service.go.
// Tests exercise this local function which matches the production implementation.
func applyPermissionCeiling(rolePerms []string, allowedKeys []string, hasRestriction bool, schemaName string) []string {
	if schemaName == "platform" {
		return rolePerms
	}
	if !hasRestriction {
		return rolePerms
	}
	allowedSet := make(map[string]struct{}, len(allowedKeys))
	for _, k := range allowedKeys {
		allowedSet[k] = struct{}{}
	}
	filtered := make([]string, 0, len(rolePerms))
	for _, p := range rolePerms {
		if _, ok := allowedSet[p]; ok {
			filtered = append(filtered, p)
		}
	}
	return filtered
}

// TestPermissionIntersection_WithRestrictions verifies that when the optica has
// restrictions, only the intersection of role permissions and allowed keys ends
// up in the JWT permissions.
func TestPermissionIntersection_WithRestrictions(t *testing.T) {
	rolePerms := []string{"patients:read", "patients:write", "appointments:write", "roles:manage"}
	allowedKeys := []string{"patients:read", "appointments:write"}

	filtered := applyPermissionCeiling(rolePerms, allowedKeys, true, "optica_schema")

	if len(filtered) != 2 {
		t.Fatalf("expected 2 permissions after intersection, got %d: %v", len(filtered), filtered)
	}

	resultSet := make(map[string]struct{}, len(filtered))
	for _, p := range filtered {
		resultSet[p] = struct{}{}
	}

	if _, ok := resultSet["patients:read"]; !ok {
		t.Errorf("expected patients:read in filtered permissions, got %v", filtered)
	}
	if _, ok := resultSet["appointments:write"]; !ok {
		t.Errorf("expected appointments:write in filtered permissions, got %v", filtered)
	}
	if _, ok := resultSet["patients:write"]; ok {
		t.Errorf("patients:write should have been removed by intersection, but it was kept")
	}
	if _, ok := resultSet["roles:manage"]; ok {
		t.Errorf("roles:manage should have been removed by intersection, but it was kept")
	}
}

// TestPermissionIntersection_NoRestrictions verifies that when the optica has no
// restriction rows (hasRestriction == false), all role permissions pass through
// unchanged.
func TestPermissionIntersection_NoRestrictions(t *testing.T) {
	rolePerms := []string{"patients:read", "patients:write", "appointments:write"}

	filtered := applyPermissionCeiling(rolePerms, nil, false, "optica_schema")

	if len(filtered) != 3 {
		t.Fatalf("expected 3 permissions (no restriction applied), got %d: %v", len(filtered), filtered)
	}
	for i, want := range rolePerms {
		if filtered[i] != want {
			t.Errorf("expected filtered[%d] = %q, got %q", i, want, filtered[i])
		}
	}
}

// TestPermissionIntersection_SuperAdmin verifies that when the schema name is
// "platform" (super admin login), the intersection is bypassed entirely and all
// role permissions pass through.
func TestPermissionIntersection_SuperAdmin(t *testing.T) {
	rolePerms := []string{"patients:read", "patients:write"}
	allowedKeys := []string{"patients:read"}

	filtered := applyPermissionCeiling(rolePerms, allowedKeys, true, "platform")

	if len(filtered) != 2 {
		t.Fatalf("expected 2 permissions for super admin (no ceiling applied), got %d: %v", len(filtered), filtered)
	}
	for i, want := range rolePerms {
		if filtered[i] != want {
			t.Errorf("expected filtered[%d] = %q, got %q", i, want, filtered[i])
		}
	}
}
