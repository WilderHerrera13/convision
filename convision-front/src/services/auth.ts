import api from '../lib/axios';
import ApiService from './ApiService';
import { User } from '../types/user';

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Use direct axios call here since we need to process the response before ApiService would return it
      const response = await api.post('/api/v1/auth/login', credentials);
      const { access_token, token_type, expires_in, user } = response.data;
      
      // Store auth data
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('token_type', token_type);
      localStorage.setItem('auth_user', JSON.stringify(user));
      
      return response.data;
    } catch (error) {
      // Let ApiService handle the error translation for consistency
      throw ApiService.processApiErrorDirectly(error);
    }
  },

  async logout(): Promise<void> {
    try {
      await ApiService.post('/api/v1/auth/logout');
    } finally {
      // Clear auth data regardless of API call success
      localStorage.removeItem('access_token');
      localStorage.removeItem('token_type');
      localStorage.removeItem('auth_user');
    }
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
      const { access_token, token_type, expires_in, user } = response.data;
      
      // Update stored auth data
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('token_type', token_type);
      localStorage.setItem('auth_user', JSON.stringify(user));
      
      return response.data;
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
  }
}; 