import api from '@/lib/axios';

export interface Purchase {
  id: number;
  supplier_id: number;
  supplier?: {
    id: number;
    name: string;
    nit?: string;
  };
  purchase_date: string;
  invoice_number: string;
  concept: string;
  subtotal: number;
  tax_amount: number;
  retention_amount: number;
  total_amount: number;
  payment_amount: number;
  balance: number;
  payment_status: 'pending' | 'partial' | 'paid';
  status: 'pending' | 'partial' | 'paid';
  tax_excluded: boolean;
  invoice_file?: string;
  notes?: string;
  payment_due_date?: string;
  created_by_user_id: number;
  created_by?: {
    id: number;
    name: string;
  };
  items?: PurchaseItem[];
  payments?: PurchasePayment[];
  created_at: string;
  updated_at: string;
}

export interface PurchaseItem {
  id?: number;
  purchase_id?: number;
  product_id?: number;
  product?: {
    id: number;
    name: string;
    code?: string;
  };
  product_code?: string;
  product_description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  tax_rate?: number;
  tax_amount?: number;
  total: number;
  notes?: string;
}

export interface PurchasePayment {
  id?: number;
  purchase_id?: number;
  payment_method_id: number;
  payment_method?: {
    id: number;
    name: string;
  };
  amount: number;
  payment_date: string;
  reference?: string;
  notes?: string;
  created_by_user_id?: number;
  created_by?: {
    id: number;
    name: string;
  };
}

export interface CreatePurchaseData {
  supplier_id: number;
  purchase_date: string;
  invoice_number: string;
  concept: string;
  subtotal: number;
  tax_amount?: number;
  retention_amount?: number;
  total_amount: number;
  // payment_amount y balance se calculan automáticamente en el backend
  tax_excluded?: boolean;
  invoice_file?: string;
  notes?: string;
  payment_due_date?: string;
  items: Omit<PurchaseItem, 'id' | 'purchase_id'>[];
  payments?: Omit<PurchasePayment, 'id' | 'purchase_id' | 'created_by_user_id'>[];
}

export interface UpdatePurchaseData extends Partial<CreatePurchaseData> {
  id?: number;
}

export interface PurchaseSearchParams {
  search?: string;
  supplier_id?: number;
  payment_status?: string;
  purchase_date_from?: string;
  purchase_date_to?: string;
  page?: number;
  per_page?: number;
  s_f?: string;
  s_v?: string;
}

export interface PaginatedPurchases {
  data: Purchase[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

export interface CalculateTotalsData {
  items: {
    quantity: number;
    unit_price: number;
    tax_rate?: number;
  }[];
}

export interface CalculatedTotals {
  subtotal: number;
  tax_amount: number;
  total_amount: number;
}

export interface AddPaymentData {
  payment_method_id: number;
  amount: number;
  payment_date: string;
  reference?: string;
  notes?: string;
}

class PurchaseService {
  async getPurchases(params: PurchaseSearchParams = {}): Promise<PaginatedPurchases> {
    const response = await api.get('/api/v1/purchases', { params });
    return response.data;
  }

  async getPurchase(id: number): Promise<Purchase> {
    const response = await api.get(`/api/v1/purchases/${id}`);
    return response.data.data;
  }

  async createPurchase(data: CreatePurchaseData): Promise<Purchase> {
    const response = await api.post('/api/v1/purchases', data);
    return response.data.data;
  }

  async updatePurchase(id: number, data: UpdatePurchaseData): Promise<Purchase> {
    const response = await api.put(`/api/v1/purchases/${id}`, data);
    return response.data.data;
  }

  async deletePurchase(id: number): Promise<void> {
    await api.delete(`/api/v1/purchases/${id}`);
  }

  async calculateTotals(data: CalculateTotalsData): Promise<CalculatedTotals> {
    const response = await api.post('/api/v1/purchases/calculate-totals', data);
    return response.data;
  }

  async addPayment(purchaseId: number, data: AddPaymentData): Promise<{ message: string; payment: PurchasePayment }> {
    const response = await api.post(`/api/v1/purchases/${purchaseId}/payments`, data);
    return response.data;
  }
}

export const purchaseService = new PurchaseService();