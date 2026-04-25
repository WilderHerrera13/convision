import api from '@/lib/axios';

export interface LaboratoryOrderCall {
  id: number;
  laboratory_order_id: number;
  result: 'contacted' | 'payment_promise' | 'no_answer' | 'wrong_number';
  channel: 'call' | 'whatsapp' | 'sms' | 'email';
  next_contact_date: string | null;
  notes: string;
  user_id: number | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    name: string;
  };
}

export interface PortfolioOrderItem {
  id: number;
  order_number: string;
  patient_id: number;
  sale_id: number | null;
  status: string;
  priority: string;
  drawer_number: string | null;
  days_in_portfolio: number;
  call_count: number;
  balance: number | null;
  created_at: string;
  updated_at: string;
  patient?: {
    id: number;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    identification: string;
  };
  laboratory?: {
    id: number;
    name: string;
  };
  sale?: {
    id: number;
    sale_number: string;
    balance?: number;
  };
  last_call?: LaboratoryOrderCall;
}

export interface PortfolioStats {
  total: number;
  over_five_days: number;
  failed_attempts: number;
  payment_promises: number;
}

export interface RegisterCallRequest {
  result: 'contacted' | 'payment_promise' | 'no_answer' | 'wrong_number';
  channel: 'call' | 'whatsapp' | 'sms' | 'email';
  next_contact_date?: string | null;
  notes?: string;
}

export interface PortfolioListParams {
  page?: number;
  per_page?: number;
  search?: string;
}

const portfolioService = {
  async getStats(): Promise<PortfolioStats> {
    const response = await api.get('/api/v1/portfolio/stats');
    const raw = response.data?.data ?? response.data;
    return {
      total: raw.total ?? 0,
      over_five_days: raw.over_five_days ?? 0,
      failed_attempts: raw.failed_attempts ?? 0,
      payment_promises: raw.payment_promises ?? 0,
    };
  },

  async getOrders(params: PortfolioListParams = {}) {
    const query: Record<string, string | number> = {
      page: params.page || 1,
      per_page: params.per_page || 15,
    };
    if (params.search?.trim()) {
      query.search = params.search.trim();
    }
    const response = await api.get('/api/v1/portfolio/orders', { params: query });
    return response.data;
  },

  async getOrdersForTable(params: PortfolioListParams): Promise<{
    data: PortfolioOrderItem[];
    last_page: number;
    total: number;
  }> {
    const query: Record<string, string | number> = {
      page: params.page || 1,
      per_page: params.per_page || 10,
    };
    if (params.search?.trim()) {
      query.search = params.search.trim();
    }
    const response = await api.get('/api/v1/portfolio/orders', { params: query });
    const body = response.data;
    return {
      data: Array.isArray(body.data) ? body.data : [],
      last_page: body.last_page ?? 1,
      total: body.total ?? 0,
    };
  },

  async getOrder(orderId: number): Promise<PortfolioOrderItem> {
    const response = await api.get(`/api/v1/portfolio/orders/${orderId}`);
    return response.data;
  },

  async registerCall(orderId: number, data: RegisterCallRequest): Promise<LaboratoryOrderCall> {
    const response = await api.post(`/api/v1/portfolio/orders/${orderId}/calls`, data);
    return response.data;
  },

  async getOrderCalls(orderId: number): Promise<LaboratoryOrderCall[]> {
    const response = await api.get(`/api/v1/portfolio/orders/${orderId}/calls`);
    const raw = response.data?.data ?? response.data;
    return Array.isArray(raw) ? raw : [];
  },
};

export { portfolioService };
