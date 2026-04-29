import api from '@/lib/axios';

export interface LaboratoryOrder {
  id: number;
  order_number: string;
  order_id: number | null;
  sale_id: number | null;
  laboratory_id: number;
  patient_id: number;
  status: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  estimated_completion_date: string | null;
  completion_date: string | null;
  notes: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  drawer_number?: string | null;
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
    user?: {
      id: number;
      name: string;
      last_name?: string;
    };
  }>;
  pdf_token?: string;
  guest_pdf_url?: string;
}

export type LaboratoryEvidenceTransition = 'sent_to_lab' | 'received_from_lab' | 'returned_to_lab' | 'notify_client';

export interface LaboratoryOrderEvidence {
  id: number;
  laboratory_order_id: number;
  transition_type: string;
  image_url: string;
  created_at: string;
  user?: {
    id: number;
    name: string;
  };
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
  assigned_uid?: number;
  branch_id?: number;
}

export interface LaboratoryOrderStats {
  total: number;
  pending: number;
  in_process: number;
  sent_to_lab: number;
  in_transit: number;
  received_from_lab: number;
  in_quality: number;
  ready_for_delivery: number;
  delivered: number;
  cancelled: number;
  portfolio: number;
}

export interface RxEye {
  sphere: string;
  cylinder: string;
  axis: string;
  addition: string;
  dp: string;
  af: string;
  diameter: string;
  base_curve: string;
  power: string;
  prism_h: string;
  prism_v: string;
}

export interface FrameSpecs {
  name: string;
  type: string;
  gender: string;
  color: string;
  horizontal: string;
  bridge: string;
  vertical: string;
  pantoscopic_angle: string;
  mechanical_distance: string;
  panoramic_angle: string;
  effective_diameter: string;
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
  rx_od?: RxEye | null;
  rx_oi?: RxEye | null;
  lens_od?: string;
  lens_oi?: string;
  frame_specs?: FrameSpecs | null;
  seller_name?: string;
  sale_date?: string | null;
  branch?: string;
  special_instructions?: string;
}

export interface UpdateLaboratoryOrderRequest {
  order_id?: number | null;
  sale_id?: number | null;
  laboratory_id?: number;
  patient_id?: number;
  status?: string;
  priority?: string;
  estimated_completion_date?: string | null;
  notes?: string | null;
  drawer_number?: string | null;
  rx_od?: RxEye | null;
  rx_oi?: RxEye | null;
  lens_od?: string;
  lens_oi?: string;
  frame_specs?: FrameSpecs | null;
  seller_name?: string;
  sale_date?: string | null;
  branch?: string;
  special_instructions?: string;
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
    const query: Record<string, string | number> = {
      page: params.page || 1,
      per_page: params.per_page || 10,
    };

    if (params.status && params.status !== 'all') {
      query.status = params.status;
    }
    if (params.laboratory_id) {
      query.laboratory_id = params.laboratory_id;
    }
    if (params.patient_id) {
      query.patient_id = params.patient_id;
    }
    if (params.priority && params.priority !== 'all') {
      query.priority = params.priority;
    }
    if (params.search && params.search.trim() !== '') {
      query.search = params.search.trim();
    }
    if (params.sort_field) {
      query.sort = `${params.sort_field},${params.sort_direction || 'desc'}`;
    }
    if (params.assigned_uid) {
      query.assigned_uid = params.assigned_uid;
    }
    if (params.branch_id) {
      query.branch_id = params.branch_id;
    }

    const response = await api.get('/api/v1/laboratory-orders', { params: query });
    return response.data;
  },

  /**
   * Get a single laboratory order by ID
   */
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
      created_by: number;
      created_at: string;
      updated_at: string;
      laboratory?: Record<string, unknown>;
      patient?: { id: number; first_name: string; last_name: string } & Record<string, unknown>;
      order?: { items?: Array<{ id: number; lens?: Record<string, unknown> }> };
      sale?: Record<string, unknown>;
      created_by_user?: { id: number; name: string } | null;
      status_history?: RawStatusHistory[];
      drawer_number?: string | null;
      pdf_token?: string;
      guest_pdf_url?: string;
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
      created_by: raw.created_by,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
      laboratory: raw.laboratory,
      patient: raw.patient,
      order: raw.order,
      sale: raw.sale,
      createdBy: raw.created_by_user ?? undefined,
      statusHistory: raw.status_history as any,
      drawer_number: raw.drawer_number ?? null,
      pdf_token: raw.pdf_token,
      guest_pdf_url: raw.guest_pdf_url,
    };
    return normalized;
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
  async updateLaboratoryOrder(id: number, data: UpdateLaboratoryOrderRequest) {
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
    return (response.data?.data ?? response.data) as LaboratoryOrderStats;
  },

  /**
   * Get a laboratory order PDF download URL with token that can be shared
   */
  getLaboratoryOrderPdfUrl(laboratoryOrderId: number, pdfToken: string): string {
    return `${import.meta.env.VITE_API_URL}/api/v1/guest/laboratory-orders/${laboratoryOrderId}/pdf?token=${pdfToken}`;
  },

  /**
   * Get or generate a PDF token for a laboratory order
   */
  async getLaboratoryOrderPdfToken(id: number): Promise<{ pdf_token: string; guest_pdf_url: string }> {
    const response = await api.get(`/api/v1/laboratory-orders/${id}/pdf-token`);
    return response.data;
  },

  async uploadLaboratoryOrderEvidence(
    orderId: number,
    transitionType: LaboratoryEvidenceTransition,
    file: File | Blob,
    filename?: string,
  ): Promise<LaboratoryOrderEvidence> {
    const form = new FormData();
    const uploadFile = filename && file instanceof Blob && !(file instanceof File)
      ? new File([file], filename, { type: file.type })
      : file;
    form.append('file', uploadFile);
    form.append('transition_type', transitionType);
    const response = await api.post(`/api/v1/laboratory-orders/${orderId}/evidence`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return (response.data?.data ?? response.data) as LaboratoryOrderEvidence;
  },

  async getLaboratoryOrderEvidence(
    orderId: number,
    transitionType?: LaboratoryEvidenceTransition,
  ): Promise<LaboratoryOrderEvidence[]> {
    const params: Record<string, string> = {};
    if (transitionType) params.transition_type = transitionType;
    const response = await api.get(`/api/v1/laboratory-orders/${orderId}/evidence`, { params });
    const raw = response.data?.data ?? response.data;
    return Array.isArray(raw) ? raw : [];
  },
};

export { laboratoryOrderService }; 