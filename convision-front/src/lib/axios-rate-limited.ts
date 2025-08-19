import axios from 'axios';

const API_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');

// Rate limiting configuration
const REQUEST_QUEUE: Array<() => void> = [];
let isProcessingQueue = false;
const REQUEST_DELAY = 100; // 100ms between requests

const processQueue = () => {
  if (isProcessingQueue || REQUEST_QUEUE.length === 0) return;
  
  isProcessingQueue = true;
  const nextRequest = REQUEST_QUEUE.shift();
  
  if (nextRequest) {
    nextRequest();
    setTimeout(() => {
      isProcessingQueue = false;
      processQueue();
    }, REQUEST_DELAY);
  } else {
    isProcessingQueue = false;
  }
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
  timeout: 10000, // 10 second timeout
});

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

    // Handle 429 Too Many Requests
    if (error.response?.status === 429) {
      console.warn('Rate limit hit, retrying after delay...');
      
      return new Promise((resolve) => {
        REQUEST_QUEUE.push(() => {
          resolve(api(originalRequest));
        });
        processQueue();
      });
    }

    if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        console.log('Attempting to refresh token...');
        const response = await api.post('/api/v1/auth/refresh');
        const { access_token, token_type, user } = response.data;
        
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('token_type', token_type);
        localStorage.setItem('auth_user', JSON.stringify(user));
        
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        
        console.log('Token refreshed successfully, retrying original request');
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
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
    
    if (error.response?.status === 404) {
      console.warn('Resource not found (404):', originalRequest.url);
    }

    return Promise.reject(error);
  }
);

export default api; 