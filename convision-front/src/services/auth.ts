import api from '../lib/axios';
import ApiService from './ApiService';
import { User } from '../types/user';

interface LoginCredentials {
  email: string;
  password: string;
}

export interface BranchInfo {
  id: number;
  name: string;
  city: string;
  is_primary: boolean;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
  branches: BranchInfo[];
  require_password_change: boolean;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await api.post('/api/v1/auth/login', credentials);
      const { access_token, token_type, expires_in, user, branches, feature_flags, require_password_change } = response.data;
      const userWithFlags: User = { ...user, feature_flags: feature_flags ?? [] };

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('token_type', token_type);
      localStorage.setItem('auth_user', JSON.stringify(userWithFlags));
      localStorage.setItem('auth_branches', JSON.stringify(branches ?? []));
      localStorage.setItem('require_password_change', String(require_password_change ?? false));

      return { ...response.data, user: userWithFlags, require_password_change: require_password_change ?? false };
    } catch (error) {
      throw ApiService.processApiErrorDirectly(error);
    }
  },

  async logout(): Promise<void> {
    try {
      await ApiService.post('/api/v1/auth/logout');
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('token_type');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_branches');
      localStorage.removeItem('require_password_change');
    }
  },

  async changePassword(newPassword: string, confirmPassword: string): Promise<void> {
    await ApiService.post('/api/v1/auth/change-password', {
      new_password: newPassword,
      confirm_password: confirmPassword,
    });
    localStorage.setItem('require_password_change', 'false');
  },

  getRequirePasswordChange(): boolean {
    return localStorage.getItem('require_password_change') === 'true';
  },

  async getCurrentUser(): Promise<User> {
    const response = await ApiService.get<{data: User}>('/api/v1/auth/me');
    // The backend returns {data: {user object}}, so we need to extract the user from the data property
    return response.data;
  },

  async refreshToken(): Promise<AuthResponse> {
    try {
      // Use direct axios call here since we need to process the response before ApiService would return it
      const response = await api.post('/api/v1/auth/refresh');
      const { access_token, token_type, expires_in, user, branches, feature_flags } = response.data;
      const userWithFlags: User = { ...user, feature_flags: feature_flags ?? [] };

      // Update stored auth data
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('token_type', token_type);
      localStorage.setItem('auth_user', JSON.stringify(userWithFlags));
      localStorage.setItem('auth_branches', JSON.stringify(branches ?? []));

      return { ...response.data, user: userWithFlags };
    } catch (error) {
      // Let ApiService handle the error translation for consistency
      throw ApiService.processApiErrorDirectly(error);
    }
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  },

  getUser(): User | null {
    const userStr = localStorage.getItem('auth_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken(): string | null {
    return localStorage.getItem('access_token');
  },

  getBranches(): BranchInfo[] {
    const raw = localStorage.getItem('auth_branches');
    if (!raw) return [];
    try { return JSON.parse(raw) as BranchInfo[]; } catch { return []; }
  },
}; 