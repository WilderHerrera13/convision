import axios from 'axios';

const API_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

let refreshAccessTokenPromise: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (!refreshAccessTokenPromise) {
    refreshAccessTokenPromise = api
      .post('/api/v1/auth/refresh')
      .then((response) => {
        const { access_token, token_type, user } = response.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('token_type', token_type);
        localStorage.setItem('auth_user', JSON.stringify(user));
        return access_token as string;
      })
      .finally(() => {
        refreshAccessTokenPromise = null;
      });
  }
  return refreshAccessTokenPromise;
}

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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const access_token = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('token_type');
        localStorage.removeItem('auth_user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 404) {
      console.warn('Resource not found (404):', originalRequest.url);
    }

    return Promise.reject(error);
  }
);

export default api; 