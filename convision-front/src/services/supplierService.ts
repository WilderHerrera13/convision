import api from '@/lib/axios';

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

export interface CreateSupplierRequest {
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
}

export interface UpdateSupplierRequest {
  name?: string;
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
}

export interface SupplierSearchParams {
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

class SupplierService {
  async getSuppliers(params?: SupplierSearchParams): Promise<PaginatedResponse<Supplier>> {
    const response = await api.get('/api/v1/suppliers', { params });
    return response.data;
  }

  async getAllSuppliers(): Promise<Supplier[]> {
    const response = await api.get('/api/v1/suppliers', { 
      params: { per_page: 1000 } 
    });
    return response.data.data;
  }

  async getSupplier(id: number): Promise<Supplier> {
    const response = await api.get(`/api/v1/suppliers/${id}`);
    return response.data;
  }

  async createSupplier(data: CreateSupplierRequest): Promise<Supplier> {
    const response = await api.post('/api/v1/suppliers', data);
    return response.data;
  }

  async updateSupplier(id: number, data: UpdateSupplierRequest): Promise<Supplier> {
    const response = await api.put(`/api/v1/suppliers/${id}`, data);
    return response.data;
  }

  async deleteSupplier(id: number): Promise<void> {
    await api.delete(`/api/v1/suppliers/${id}`);
  }

  async searchSuppliers(query: string): Promise<Supplier[]> {
    const response = await api.get('/api/v1/suppliers', {
      params: {
        s_f: JSON.stringify(['name', 'nit', 'legal_name', 'email']),
        s_v: JSON.stringify([query, query, query, query]),
        s_o: 'or',
        per_page: 50
      }
    });
    return response.data.data;
  }
}

export const supplierService = new SupplierService(); 