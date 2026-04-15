import { useAuth } from '@/contexts/AuthContext';

const ROLE_COLORS = {
  admin:        { primary: '#3a71f8', dark: '#2558d4', light: '#eff1ff' },
  specialist:   { primary: '#0f8f64', dark: '#0a6e4d', light: '#e5f8ef' },
  receptionist: { primary: '#8753ef', dark: '#6a3cc4', light: '#f1ebff' },
} as const;

export function useRoleTheme() {
  const { user } = useAuth();
  const role = (user?.role ?? 'admin') as keyof typeof ROLE_COLORS;
  return ROLE_COLORS[role] ?? ROLE_COLORS.admin;
}
