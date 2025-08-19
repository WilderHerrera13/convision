import api from '@/lib/axios';

export interface Product {
  id: number;
  internal_code: string;
  identifier: string;
  description: string;
  cost: number;
  price: number;
  product_category_id: number;
  brand_id: number;
  supplier_id: number;
  status: 'enabled' | 'disabled';
  has_discounts: boolean;
  created_at: string;
  updated_at: string;
  category?: ProductCategory;
  brand?: Brand;
  supplier?: Supplier;
}

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
}

export interface Brand {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  nit?: string;
  legal_name?: string;
  legal_representative?: string;
  legal_representative_id?: string;
  address?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  website?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProductRequest {
  internal_code: string;
  identifier: string;
  description?: string;
  cost: number;
  price: number;
  product_category_id: number;
  brand_id: number;
  supplier_id: number;
  status?: 'enabled' | 'disabled';
}

export interface UpdateProductRequest {
  internal_code?: string;
  identifier?: string;
  description?: string;
  cost?: number;
  price?: number;
  product_category_id?: number;
  brand_id?: number;
  supplier_id?: number;
  status?: 'enabled' | 'disabled';
}

export interface ProductSearchParams {
  search?: string;
  category?: string;
  brand_id?: number;
  supplier_id?: number;
  status?: string;
  page?: number;
  per_page?: number;
  sort_field?: string;
  sort_direction?: 'asc' | 'desc';
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

class ProductService {
  async getProducts(params?: ProductSearchParams): Promise<PaginatedResponse<Product>> {
    const response = await api.get('/api/v1/products', { params });
    return response.data;
  }

  async getProduct(id: number): Promise<Product> {
    const response = await api.get(`/api/v1/products/${id}`);
    return response.data;
  }

  async createProduct(data: CreateProductRequest): Promise<Product> {
    const response = await api.post('/api/v1/products', data);
    return response.data;
  }

  async updateProduct(id: number, data: UpdateProductRequest): Promise<Product> {
    const response = await api.put(`/api/v1/products/${id}`, data);
    return response.data;
  }

  async deleteProduct(id: number): Promise<void> {
    await api.delete(`/api/v1/products/${id}`);
  }

  async searchProducts(query: string, category?: string, limit?: number): Promise<Product[]> {
    const response = await api.get('/api/v1/products/search', {
      params: { query, category, limit }
    });
    return response.data;
  }

  async bulkUpdateStatus(productIds: number[], status: 'enabled' | 'disabled'): Promise<{ updated_count: number }> {
    const response = await api.post('/api/v1/products/bulk-update-status', {
      product_ids: productIds,
      status
    });
    return response.data;
  }

  async getProductsByCategory(categorySlug: string, filters?: Record<string, unknown>): Promise<PaginatedResponse<Product>> {
    const response = await api.get(`/api/v1/products/category/${categorySlug}`, {
      params: filters
    });
    return response.data;
  }
}

export const productService = new ProductService(); 