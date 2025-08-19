import api from '@/lib/axios';

export interface LaboratoryOrder {
  id: number;
  order_number: string;
  order_id: number | null;
  sale_id: number | null;
  laboratory_id: number;
  patient_id: number;
  status: 'pending' | 'in_process' | 'sent_to_lab' | 'ready_for_delivery' | 'delivered' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  estimated_completion_date: string | null;
  completion_date: string | null;
  notes: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  laboratory?: {
    id: number;
    name: string;
    contact_person: string;
    phone: string;
    email: string;
  };
  patient?: {
    id: number;
    first_name: string;
    last_name: string;
    identification: string;
    phone: string;
    email: string;
  };
  order?: {
    id: number;
    order_number: string;
    items: Array<{
      id: number;
      lens?: {
        id: number;
        description: string;
        brand?: {
          id: number;
          name: string;
        };
        material?: {
          id: number;
          name: string;
        };
        treatment?: {
          id: number;
          name: string;
        };
        lensType?: {
          id: number;
          name: string;
        };
      };
    }>;
  };
  sale?: {
    id: number;
    sale_number: string;
  };
  createdBy?: {
    id: number;
    name: string;
  };
  statusHistory?: Array<{
    id: number;
    status: string;
    notes: string;
    created_at: string;
    user: {
      id: number;
      name: string;
    };
  }>;
  pdf_token?: string;
  guest_pdf_url?: string;
}

export interface LaboratoryOrderFilterParams {
  status?: string;
  laboratory_id?: number;
  patient_id?: number;
  priority?: string;
  search?: string;
  page?: number;
  per_page?: number;
  sort_field?: string;
  sort_direction?: 'asc' | 'desc';
}

export interface LaboratoryOrderStats {
  total: number;
  pending: number;
  in_process: number;
  sent_to_lab: number;
  ready_for_delivery: number;
  delivered: number;
  cancelled: number;
}

export interface CreateLaboratoryOrderRequest {
  order_id?: number | null;
  sale_id?: number | null;
  laboratory_id: number;
  patient_id: number;
  status?: string;
  priority?: string;
  estimated_completion_date?: string | null;
  notes?: string | null;
}

export interface UpdateLaboratoryOrderStatusRequest {
  status: string;
  notes?: string;
}

const laboratoryOrderService = {
  /**
   * Get all laboratory orders with optional filtering
   */
  async getLaboratoryOrders(params: LaboratoryOrderFilterParams = {}) {
    // Build s_f and s_v arrays for all filters
    const searchFields: string[] = [];
    const searchValues: string[] = [];

    if (params.status && params.status !== 'all') {
      searchFields.push('status');
      searchValues.push(params.status);
    }
    if (params.laboratory_id) {
      searchFields.push('laboratory_id');
      searchValues.push(params.laboratory_id.toString());
    }
    if (params.patient_id) {
      searchFields.push('patient_id');
      searchValues.push(params.patient_id.toString());
    }
    if (params.priority && params.priority !== 'all') {
      searchFields.push('priority');
      searchValues.push(params.priority);
    }
    if (params.search && params.search.trim() !== '') {
      // You can add more fields for search if needed (e.g., patient.name)
      searchFields.push('order_number');
      searchValues.push(params.search.trim());
    }

    // Build query params
    const query: any = {
      page: params.page || 1,
      per_page: params.per_page || 10,
    };
    if (searchFields.length > 0) {
      query.s_f = JSON.stringify(searchFields);
      query.s_v = JSON.stringify(searchValues);
    }
    // Sorting
    if (params.sort_field) {
      query.sort = `${params.sort_field},${params.sort_direction || 'desc'}`;
    }

    try {
      console.log('Debug - API request params:', query);
      
      const response = await api.get('/api/v1/laboratory-orders', { params: query });
      
      console.log('Debug - Raw API response:', response);
      console.log('Debug - API response data:', response.data);
      
      // Ensure proper data mapping
      if (response.data && Array.isArray(response.data.data)) {
        // Make sure all objects have the expected relationships
        response.data.data = response.data.data.map((order: any) => {
          // Ensure laboratory is initialized properly
          if (order.laboratory_id && !order.laboratory) {
            console.log('Debug - Missing laboratory object for ID:', order.laboratory_id);
          }
          
          // Ensure patient is initialized properly
          if (order.patient_id && !order.patient) {
            console.log('Debug - Missing patient object for ID:', order.patient_id);
          }
          
          return order;
        });
        
        console.log('Debug - Processed data:', response.data.data);
      }
      
      return response.data;
    } catch (error) {
      console.error('Debug - Error fetching laboratory orders:', error);
      throw error;
    }
  },

  /**
   * Get a single laboratory order by ID
   */
  async getLaboratoryOrder(id: number) {
    const response = await api.get(`/api/v1/laboratory-orders/${id}`);
    return response.data as LaboratoryOrder;
  },

  /**
   * Create a new laboratory order
   */
  async createLaboratoryOrder(data: CreateLaboratoryOrderRequest) {
    const response = await api.post('/api/v1/laboratory-orders', data);
    return response.data;
  },

  /**
   * Update an existing laboratory order
   */
  async updateLaboratoryOrder(id: number, data: Partial<CreateLaboratoryOrderRequest>) {
    const response = await api.put(`/api/v1/laboratory-orders/${id}`, data);
    return response.data;
  },

  /**
   * Update laboratory order status
   */
  async updateLaboratoryOrderStatus(id: number, data: UpdateLaboratoryOrderStatusRequest) {
    const response = await api.post(`/api/v1/laboratory-orders/${id}/status`, data);
    return response.data;
  },

  /**
   * Delete a laboratory order
   */
  async deleteLaboratoryOrder(id: number) {
    const response = await api.delete(`/api/v1/laboratory-orders/${id}`);
    return response.data;
  },

  /**
   * Get laboratory order statistics
   */
  async getLaboratoryOrderStats() {
    const response = await api.get('/api/v1/laboratory-orders/stats');
    return response.data as LaboratoryOrderStats;
  },

  /**
   * Get a laboratory order PDF download URL with token that can be shared
   */
  getLaboratoryOrderPdfUrl(laboratoryOrderId: number, pdfToken: string): string {
    return `${import.meta.env.VITE_API_URL}/api/v1/guest/laboratory-orders/${laboratoryOrderId}/pdf?token=${pdfToken}`;
  }
};

export { laboratoryOrderService }; 