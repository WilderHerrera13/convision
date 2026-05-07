import { useAuth } from '@/contexts/AuthContext';

export function useHasPermission(permission: string): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}

export function useHasAnyPermission(...permissions: string[]): boolean {
  const { hasAnyPermission } = useAuth();
  return hasAnyPermission(...permissions);
}

export function useHasAllPermissions(...permissions: string[]): boolean {
  const { hasAllPermissions } = useAuth();
  return hasAllPermissions(...permissions);
}
