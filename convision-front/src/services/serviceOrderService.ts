import api from '@/lib/axios';

export interface ServiceOrder {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  service_type: string;
  problem_description: string;
  estimated_cost: number;
  actual_cost?: number;
  deadline: string;
  priority: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceOrderStats {
  total_orders: number;
  pending_orders: number;
  in_progress_orders: number;
  completed_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  average_cost: number;
}

export interface ServiceOrderFilters {
  search?: string;
  status?: string;
  priority?: string;
  service_type?: string;
  deadline_from?: string;
  deadline_to?: string;
  page?: number;
  per_page?: number;
}

export interface CreateServiceOrderData {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  service_type: string;
  problem_description: string;
  estimated_cost: number;
  deadline: string;
  priority: string;
  notes?: string;
}

export interface UpdateServiceOrderData extends Partial<CreateServiceOrderData> {
  actual_cost?: number;
  status?: string;
}

class ServiceOrderService {
  async getServiceOrders(filters: ServiceOrderFilters = {}) {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.service_type) params.append('service_type', filters.service_type);
    if (filters.deadline_from) params.append('deadline_from', filters.deadline_from);
    if (filters.deadline_to) params.append('deadline_to', filters.deadline_to);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.per_page) params.append('per_page', filters.per_page.toString());

    const response = await api.get(`/service-orders?${params.toString()}`);
    return response.data;
  }

  async getServiceOrder(id: number): Promise<ServiceOrder> {
    const response = await api.get(`/service-orders/${id}`);
    return response.data.data;
  }

  async createServiceOrder(data: CreateServiceOrderData): Promise<ServiceOrder> {
    const response = await api.post('/service-orders', data);
    return response.data.data;
  }

  async updateServiceOrder(id: number, data: UpdateServiceOrderData): Promise<ServiceOrder> {
    const response = await api.put(`/service-orders/${id}`, data);
    return response.data.data;
  }

  async deleteServiceOrder(id: number): Promise<void> {
    await api.delete(`/service-orders/${id}`);
  }

  async updateStatus(id: number, status: string): Promise<ServiceOrder> {
    const response = await api.post(`/service-orders/${id}/status`, { status });
    return response.data.data;
  }

  async getStats(): Promise<ServiceOrderStats> {
    const response = await api.get('/service-orders/stats');
    return response.data.data;
  }

  async exportServiceOrders(filters: ServiceOrderFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.service_type) params.append('service_type', filters.service_type);
    if (filters.deadline_from) params.append('deadline_from', filters.deadline_from);
    if (filters.deadline_to) params.append('deadline_to', filters.deadline_to);

    const response = await api.get(`/service-orders/export?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  }

  getServiceTypes(): string[] {
    return [
      'Reparación de montura',
      'Cambio de lentes',
      'Ajuste de montura',
      'Soldadura',
      'Cambio de plaquetas',
      'Cambio de tornillos',
      'Pulido de lentes',
      'Otro',
    ];
  }

  getPriorities(): Array<{ value: string; label: string }> {
    return [
      { value: 'low', label: 'Baja' },
      { value: 'medium', label: 'Media' },
      { value: 'high', label: 'Alta' },
    ];
  }

  getStatuses(): Array<{ value: string; label: string }> {
    return [
      { value: 'pending', label: 'Pendiente' },
      { value: 'in_progress', label: 'En Progreso' },
      { value: 'completed', label: 'Completado' },
      { value: 'delivered', label: 'Entregado' },
      { value: 'cancelled', label: 'Cancelado' },
    ];
  }
}

export const serviceOrderService = new ServiceOrderService(); 