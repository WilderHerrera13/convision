import api from '@/lib/axios';

export interface LaboratoryOrder {
  id: number;
  order_number: string;
  order_id: number | null;
  sale_id: number | null;
  laboratory_id: number;
  patient_id: number;
  status: 'pending' | 'crm_registered' | 'in_process' | 'sent_to_lab' | 'in_transit' | 'received_from_lab' | 'in_quality' | 'ready_for_delivery' | 'portfolio' | 'delivered' | 'in_collection' | 'collection_follow_up' | 'closed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  estimated_completion_date: string | null;
  completion_date: string | null;
  notes: string | null;
  description?: string | null;
  product_code?: string | null;
  lens_type?: string | null;
  drawer_number?: string | null;
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
  evidence?: LaboratoryOrderEvidence[];
}

export interface LaboratoryOrderFilterParams {
  status?: string;
  laboratory_id?: number;
  patient_id?: number;
  priority?: string;
  search?: string;
  overdue?: string;
  page?: number;
  per_page?: number;
  sort_field?: string;
  sort_direction?: 'asc' | 'desc';
}

export interface LaboratoryOrderStats {
  total: number;
  overdue: number;
  pending: number;
  crm_registered: number;
  in_process: number;
  sent_to_lab: number;
  in_transit: number;
  received_from_lab: number;
  in_quality: number;
  portfolio: number;
  ready_for_delivery: number;
  delivered: number;
  in_collection: number;
  collection_follow_up: number;
  closed: number;
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
  description?: string | null;
  product_code?: string | null;
  lens_type?: string | null;
}

export interface UpdateLaboratoryOrderStatusRequest {
  status: string;
  notes?: string;
}

export type LaboratoryEvidenceTransition = 'sent_to_lab' | 'received_from_lab';

export interface LaboratoryOrderEvidence {
  id: number;
  laboratory_order_id: number;
  transition_type: LaboratoryEvidenceTransition;
  image_url: string;
  filename: string;
  uploaded_by?: number | null;
  created_at: string;
  user?: { id: number; name: string } | null;
}

const laboratoryOrderService = {
  async getLaboratoryOrders(params: LaboratoryOrderFilterParams = {}) {
    const query: Record<string, string | number> = {
      page: params.page || 1,
      per_page: params.per_page || 10,
    };
    if (params.status && params.status !== 'all') {
      query.status = params.status;
    }
    if (params.priority && params.priority !== 'all') {
      query.priority = params.priority;
    }
    if (params.laboratory_id) {
      query.laboratory_id = params.laboratory_id;
    }
    if (params.patient_id) {
      query.patient_id = params.patient_id;
    }
    if (params.search && params.search.trim() !== '') {
      query.search = params.search.trim();
    }
    if (params.sort_field) {
      query.sort = `${params.sort_field},${params.sort_direction || 'desc'}`;
    }
    if (params.overdue === 'true') {
      query.overdue = 'true';
    }

    const response = await api.get('/api/v1/laboratory-orders', { params: query });
    return response.data;
  },

  async getLaboratoryOrder(id: number) {
    const response = await api.get(`/api/v1/laboratory-orders/${id}`);
    type RawStatusHistory = {
      id: number;
      status: string;
      notes?: string | null;
      created_at: string;
      user?: { id: number; name: string } | null;
    };
    type RawOrder = {
      id: number;
      order_number: string;
      order_id: number | null;
      sale_id: number | null;
      laboratory_id: number;
      patient_id: number;
      status: string;
      priority: string;
      estimated_completion_date?: string | null;
      completion_date?: string | null;
      notes?: string | null;
      description?: string | null;
      product_code?: string | null;
      lens_type?: string | null;
      created_by: number;
      created_at: string;
      updated_at: string;
      laboratory?: Record<string, unknown>;
      patient?: { id: number; first_name: string; last_name: string } & Record<string, unknown>;
      order?: { items?: Array<{ id: number; lens?: Record<string, unknown> }> };
      sale?: Record<string, unknown>;
      created_by_user?: { id: number; name: string } | null;
      status_history?: RawStatusHistory[];
      pdf_token?: string;
      guest_pdf_url?: string;
      evidence?: LaboratoryOrderEvidence[];
    };
    const wrapped = response.data as { data?: RawOrder } | RawOrder;
    const raw: RawOrder = (wrapped as { data?: RawOrder }).data ?? (wrapped as RawOrder);
    const normalized: LaboratoryOrder = {
      id: raw.id,
      order_number: raw.order_number,
      order_id: raw.order_id,
      sale_id: raw.sale_id,
      laboratory_id: raw.laboratory_id,
      patient_id: raw.patient_id,
      status: raw.status,
      priority: raw.priority,
      estimated_completion_date: raw.estimated_completion_date ?? null,
      completion_date: raw.completion_date ?? null,
      notes: raw.notes ?? null,
      description: raw.description ?? null,
      product_code: raw.product_code ?? null,
      lens_type: raw.lens_type ?? null,
      created_by: raw.created_by,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
      laboratory: raw.laboratory,
      patient: raw.patient,
      order: raw.order,
      sale: raw.sale,
      createdBy: raw.created_by_user ?? undefined,
      statusHistory: raw.status_history as LaboratoryOrder['statusHistory'],
      pdf_token: raw.pdf_token,
      guest_pdf_url: raw.guest_pdf_url,
      evidence: raw.evidence,
    };
    return normalized;
  },

  async createLaboratoryOrder(data: CreateLaboratoryOrderRequest) {
    const response = await api.post('/api/v1/laboratory-orders', data);
    return response.data;
  },

  async updateLaboratoryOrder(id: number, data: Partial<CreateLaboratoryOrderRequest>) {
    const response = await api.put(`/api/v1/laboratory-orders/${id}`, data);
    return response.data;
  },

  async updateLaboratoryOrderStatus(id: number, data: UpdateLaboratoryOrderStatusRequest) {
    const response = await api.post(`/api/v1/laboratory-orders/${id}/status`, data);
    return response.data;
  },

  async deleteLaboratoryOrder(id: number) {
    const response = await api.delete(`/api/v1/laboratory-orders/${id}`);
    return response.data;
  },

  async getLaboratoryOrderStats() {
    const response = await api.get('/api/v1/laboratory-orders/stats');
    return (response.data?.data ?? response.data) as LaboratoryOrderStats;
  },

  getLaboratoryOrderPdfUrl(laboratoryOrderId: number, pdfToken: string): string {
    return `${import.meta.env.VITE_API_URL}/api/v1/guest/laboratory-orders/${laboratoryOrderId}/pdf?token=${pdfToken}`;
  },

  async uploadLaboratoryOrderEvidence(
    orderId: number,
    transitionType: LaboratoryEvidenceTransition,
    file: File | Blob,
    filename = 'evidence.jpg'
  ): Promise<LaboratoryOrderEvidence> {
    const form = new FormData();
    form.append('type', transitionType);
    if (file instanceof File) {
      form.append('image', file);
    } else {
      form.append('image', file, filename);
    }
    const { data } = await api.post<LaboratoryOrderEvidence>(`/api/v1/laboratory-orders/${orderId}/evidence`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async getLaboratoryOrderEvidence(orderId: number, type?: LaboratoryEvidenceTransition): Promise<LaboratoryOrderEvidence[]> {
    const { data } = await api.get<{ data: LaboratoryOrderEvidence[] }>(`/api/v1/laboratory-orders/${orderId}/evidence`, {
      params: type ? { type } : {},
    });
    return data.data ?? [];
  },
};

export { laboratoryOrderService }; 