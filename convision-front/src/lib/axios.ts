import axios from 'axios';

// In development, use relative URLs to leverage Vite proxy
// In production, use the full API URL
const API_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Ensure credentials are sent with requests
  withCredentials: true,
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't try to refresh token for login or refresh token requests
    if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    // If the error is 401 and we haven't tried to refresh the token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        console.log('Attempting to refresh token...');
        const response = await api.post('/api/v1/auth/refresh');
        const { access_token, token_type, user } = response.data;
        
        // Update the token in localStorage
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('token_type', token_type);
        localStorage.setItem('auth_user', JSON.stringify(user));
        
        // Update the Authorization header
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        
        console.log('Token refreshed successfully, retrying original request');
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // If refresh token fails, clear auth data and redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('token_type');
        localStorage.removeItem('auth_user');
        
        if (window.location.pathname !== '/login') {
          console.log('Redirecting to login due to refresh failure');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    } 
    
    // Add specific handling for 404 errors (resource not found)
    // We don't redirect or clear tokens for 404s since it might just be an endpoint
    // that doesn't exist for the current user's role
    if (error.response?.status === 404) {
      console.warn('Resource not found (404):', originalRequest.url);
      // Just pass through the error for component handling
    }

    return Promise.reject(error);
  }
);

export default api; 