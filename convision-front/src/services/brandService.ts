import api from '@/lib/axios';

export interface Brand {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBrandRequest {
  name: string;
  description?: string;
}

export interface UpdateBrandRequest {
  name?: string;
  description?: string;
}

export interface BrandSearchParams {
  search?: string;
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

class BrandService {
  async getBrands(params?: BrandSearchParams): Promise<PaginatedResponse<Brand>> {
    const response = await api.get('/api/v1/brands', { params });
    return response.data;
  }

  async getAllBrands(): Promise<Brand[]> {
    const response = await api.get('/api/v1/brands', { 
      params: { per_page: 1000 } 
    });
    return response.data.data;
  }

  async getBrand(id: number): Promise<Brand> {
    const response = await api.get(`/api/v1/brands/${id}`);
    return response.data;
  }

  async createBrand(data: CreateBrandRequest): Promise<Brand> {
    const response = await api.post('/api/v1/brands', data);
    return response.data;
  }

  async updateBrand(id: number, data: UpdateBrandRequest): Promise<Brand> {
    const response = await api.put(`/api/v1/brands/${id}`, data);
    return response.data;
  }

  async deleteBrand(id: number): Promise<void> {
    await api.delete(`/api/v1/brands/${id}`);
  }

  async searchBrands(query: string): Promise<Brand[]> {
    const response = await api.get('/api/v1/brands', {
      params: {
        s_f: JSON.stringify(['name', 'description']),
        s_v: JSON.stringify([query, query]),
        s_o: 'or',
        per_page: 50
      }
    });
    return response.data.data;
  }
}

export const brandService = new BrandService(); 