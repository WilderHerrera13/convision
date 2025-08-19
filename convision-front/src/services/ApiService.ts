import api from '@/lib/axios';
import { toast } from '@/components/ui/use-toast';
import { translateErrorMessage } from '@/lib/utils';
import { AxiosRequestConfig, AxiosError } from 'axios';

/**
 * Custom error class with additional metadata
 */
class ApiError extends Error {
  metadata?: unknown;
  
  constructor(message: string, metadata?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.metadata = metadata;
  }
}

class ApiService {
  private static instance: ApiService;

  private constructor() {}

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  /**
   * Extracts the error message from an API error response and preserves important metadata
   * @param error Any error object from the API
   * @returns A structured object with translated message and metadata from original data
   */
  private processApiError(error: unknown): { message: string; metadata?: unknown } {
    let message = '';
    let metadata: unknown = undefined;
    
    if (error instanceof AxiosError && error.response) {
      // Preserve the original response data for additional context
      metadata = error.response.data;
      
      // First try to get the error message from the response data
      if (error.response.data?.error) {
        message = translateErrorMessage(error.response.data.error);
      }
      // Then try to get the message from the response data
      else if (error.response.data?.message) {
        message = translateErrorMessage(error.response.data.message);
      }
      // If there's a status code, use a generic message based on status
      else if (error.response.status) {
        switch (error.response.status) {
          case 401:
            message = translateErrorMessage('Unauthenticated');
            break;
          case 403:
            message = translateErrorMessage('Forbidden');
            break;
          case 404:
            message = translateErrorMessage('Not found');
            break;
          case 422:
            message = translateErrorMessage('Validation error');
            break;
          case 500:
            message = translateErrorMessage('Internal server error');
            break;
          default:
            message = translateErrorMessage('Something went wrong');
            break;
        }
      }
      // Finally use the error message property if available
      else if (error.message) {
        message = translateErrorMessage(error.message);
      }
    } else if (error instanceof Error) {
      message = translateErrorMessage(error.message);
      // Check if it's our custom ApiError with metadata
      if (error instanceof ApiError && error.metadata) {
        metadata = error.metadata;
      }
    } else if (typeof error === 'string') {
      message = translateErrorMessage(error);
    } else {
      message = translateErrorMessage('Something went wrong');
    }
    
    return { message, metadata };
  }

  /**
   * Process an API error and return an ApiError instance
   * This is useful when you need to handle API errors outside of the ApiService class
   * @param error Any error object from the API
   * @returns An ApiError instance with translated message and metadata
   */
  public processApiErrorDirectly(error: unknown): ApiError {
    const { message, metadata } = this.processApiError(error);
    return new ApiError(message, metadata);
  }

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      // Add additional debug logging for filter endpoints
      const isFilterEndpoint = url.includes('/brands') || url.includes('/materials') || 
                               url.includes('/lens-classes') || url.includes('/treatments') ||
                               url.includes('/warehouse-locations');
      
      if (isFilterEndpoint) {
        console.log(`ApiService GET request to filter endpoint: ${url}`);
      }
      
      const response = await api.get<T>(url, config);
      
      if (isFilterEndpoint) {
        console.log(`ApiService GET response from ${url}:`, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          dataType: typeof response.data,
          isArray: Array.isArray(response.data),
          dataLength: Array.isArray(response.data) ? response.data.length : 'N/A',
          data: response.data
        });
        
        // Enhanced response handling for filter endpoints
        // Case 1: Check if the response has a 'data' property that is an array
        // This handles the case where the API returns {data: []} instead of []
        interface WrappedDataResponse {
          data: unknown[];
        }
        
        if (!Array.isArray(response.data) && 
            typeof response.data === 'object' && 
            response.data !== null && 
            'data' in response.data && 
            Array.isArray((response.data as WrappedDataResponse).data)) {
          console.log(`Filter endpoint ${url} returned wrapped data, extracting array`);
          return (response.data as WrappedDataResponse).data as unknown as T;
        }
        
        // Case 2: If we expected an array but got an object, try to convert it to an array
        // This is a fallback for inconsistent API responses
        if (!Array.isArray(response.data) && typeof response.data === 'object' && response.data !== null) {
          console.warn(`Filter endpoint ${url} returned an object when an array was expected`);
          
          // Try to extract any array-like data from the response if possible
          const potentialArrayData = Object.values(response.data).find(value => Array.isArray(value));
          if (potentialArrayData && Array.isArray(potentialArrayData)) {
            console.log(`Found array data in object response, using it instead`);
            return potentialArrayData as unknown as T;
          }
          
          // Check if this is a filter response with property key matching endpoint name
          const endpoint = url.split('/').pop() || '';
          if (endpoint && endpoint in response.data) {
            const typedData = (response.data as Record<string, unknown>)[endpoint];
            if (Array.isArray(typedData)) {
              console.log(`Found array in property '${endpoint}', using it`);
              return typedData as unknown as T;
            }
          }
          
          // If it has key-value pairs that look like options, convert to array format
          try {
            const entries = Object.entries(response.data);
            if (entries.length > 0 && typeof entries[0][0] === 'string') {
              const mappedArray = entries.map(([id, name]) => ({
                id: parseInt(id, 10) || id,
                name: typeof name === 'string' ? name : String(name)
              }));
              console.log(`Converted object to options array with ${mappedArray.length} items`);
              return mappedArray as unknown as T;
            }
          } catch (err) {
            console.error('Failed to convert object to array:', err);
          }
          
          // If it's an empty object or no arrays found, return an empty array
          console.log(`Returning empty array as fallback for object response`);
          return [] as unknown as T;
        }
        
        // Case 3: If we got null or undefined, return an empty array
        if (response.data === null || response.data === undefined) {
          console.warn(`Filter endpoint ${url} returned null/undefined, providing empty array`);
          return [] as unknown as T;
        }
      }
      
      return response.data;
    } catch (error) {
      // Handle common API errors more gracefully for filter endpoints
      const isFilterEndpoint = 
        url.includes('/brands') || 
        url.includes('/materials') || 
        url.includes('/lens-classes') || 
        url.includes('/treatments') ||
        url.includes('/warehouse-locations') ||
        url.includes('/photochromics') ||
        url.includes('/suppliers');
      
      if (isFilterEndpoint) {
        console.warn(`Filter endpoint ${url} failed:`, error);
        
        // For filter endpoints, return empty array as fallback to avoid breaking UI
        if (url.includes('?') || url.includes('search')) {
          console.log(`Providing empty array fallback for filter search endpoint: ${url}`);
          return [] as unknown as T;
        }
        
        // Extract the specific endpoint name for detailed error message
        const endpointName = url.split('/').pop() || 'unknown';
        console.warn(`Database issue detected with ${endpointName}. Using empty data fallback.`);
        
        // Log detailed error for debugging
        if (error instanceof AxiosError && error.response) {
          console.error(`API Error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
        }
        
        // Try to check network errors vs server errors
        if (error instanceof AxiosError && !error.response) {
          console.error(`Network error when accessing ${url}: ${error.message}`);
        }
        
        // Return empty array to prevent UI from breaking
        return [] as unknown as T;
      }
      
      const { message, metadata } = this.processApiError(error);
      
      // Log the error details for filter endpoints
      if (url.includes('/brands') || url.includes('/materials') || 
          url.includes('/lens-classes') || url.includes('/treatments')) {
        console.error(`Error fetching from ${url}:`, { message, metadata });
      }
      
      throw new ApiError(message, metadata);
    }
  }

  public async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await api.post<T>(url, data, config);
      return response.data;
    } catch (error) {
      const { message, metadata } = this.processApiError(error);
      throw new ApiError(message, metadata);
    }
  }

  public async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await api.put<T>(url, data, config);
      return response.data;
    } catch (error) {
      const { message, metadata } = this.processApiError(error);
      throw new ApiError(message, metadata);
    }
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await api.delete<T>(url, config);
      return response.data;
    } catch (error) {
      const { message, metadata } = this.processApiError(error);
      throw new ApiError(message, metadata);
    }
  }
}

export { ApiError };
export default ApiService.getInstance();
