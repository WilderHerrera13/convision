import api from '@/lib/axios';

export type PayableSource = 'purchase' | 'expense';

export interface SupplierPayableRow {
  source: PayableSource;
  source_id: number;
  supplier: { id: number; name: string } | null;
  reference: string | null;
  due_date?: string | null;
  amount_total: number;
  amount_paid: number;
  balance: number;
  status: 'pending' | 'overdue' | 'paid';
}

export interface PaginatedPayables {
  data: SupplierPayableRow[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface PayablesFilters {
  search?: string;
  supplier_id?: number;
  status?: 'pending' | 'overdue' | 'paid';
  page?: number;
  per_page?: number;
}

export const supplierPaymentsService = {
  async list(filters: PayablesFilters = {}): Promise<PaginatedPayables> {
    const response = await api.get('/api/v1/supplier-payables', { params: filters });
    return response.data;
  }
};


