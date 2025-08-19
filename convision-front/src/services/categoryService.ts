import api from '@/lib/axios';

export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  required_attributes?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  products_count?: number;
}

export interface CreateCategoryRequest {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  required_attributes?: string[];
  is_active?: boolean;
}

export interface UpdateCategoryRequest {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  required_attributes?: string[];
  is_active?: boolean;
}

export interface CategorySearchParams {
  search?: string;
  is_active?: boolean;
  page?: number;
  per_page?: number;
  sort_field?: string;
  sort_direction?: 'asc' | 'desc';
  s_f?: string;
  s_v?: string;
}

export interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  from: number;
  last_page: number;
  per_page: number;
  to: number;
  total: number;
}

class CategoryService {
  async getCategories(params?: CategorySearchParams): Promise<PaginatedResponse<ProductCategory>> {
    const response = await api.get('/api/v1/product-categories', { params });
    return response.data;
  }

  async getAllCategories(): Promise<ProductCategory[]> {
    const response = await api.get('/api/v1/product-categories/all');
    return response.data;
  }

  async getActiveCategories(): Promise<ProductCategory[]> {
    const response = await api.get('/api/v1/product-categories', { 
      params: { is_active: true, per_page: 1000 } 
    });
    return response.data.data;
  }

  async getCategory(id: number): Promise<ProductCategory> {
    const response = await api.get(`/api/v1/product-categories/${id}`);
    return response.data;
  }

  async createCategory(data: CreateCategoryRequest): Promise<ProductCategory> {
    const response = await api.post('/api/v1/product-categories', data);
    return response.data;
  }

  async updateCategory(id: number, data: UpdateCategoryRequest): Promise<ProductCategory> {
    const response = await api.put(`/api/v1/product-categories/${id}`, data);
    return response.data;
  }

  async deleteCategory(id: number): Promise<void> {
    await api.delete(`/api/v1/product-categories/${id}`);
  }

  async getCategoriesWithProductsCount(): Promise<ProductCategory[]> {
    const response = await api.get('/api/v1/product-categories/products-count');
    return response.data;
  }

  async searchCategories(query: string): Promise<ProductCategory[]> {
    const response = await api.get('/api/v1/product-categories', {
      params: {
        s_f: JSON.stringify(['name', 'description', 'slug']),
        s_v: JSON.stringify([query, query, query]),
        s_o: 'or',
        per_page: 50
      }
    });
    return response.data.data;
  }
}

export const categoryService = new CategoryService(); 