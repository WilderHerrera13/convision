import api from '@/lib/axios';

export interface CashTransfer {
  id: number;
  transfer_number: string;
  origin_type: string;
  origin_description: string;
  destination_type: string;
  destination_description: string;
  amount: number;
  reason: string;
  requested_by: string;
  approved_by?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CashTransferStats {
  total_transfers: number;
  pending_transfers: number;
  approved_transfers: number;
  completed_transfers: number;
  cancelled_transfers: number;
  total_amount: number;
  pending_amount: number;
  completed_amount: number;
}

export interface CashTransferFilters {
  search?: string;
  status?: string;
  origin_type?: string;
  destination_type?: string;
  amount_from?: number;
  amount_to?: number;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}

export interface CreateCashTransferData {
  origin_type: string;
  origin_description: string;
  destination_type: string;
  destination_description: string;
  amount: number;
  reason: string;
  notes?: string;
}

export interface UpdateCashTransferData extends Partial<CreateCashTransferData> {
  status?: string;
}

class CashTransferService {
  async getCashTransfers(filters: CashTransferFilters = {}) {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.origin_type) params.append('origin_type', filters.origin_type);
    if (filters.destination_type) params.append('destination_type', filters.destination_type);
    if (filters.amount_from) params.append('amount_from', filters.amount_from.toString());
    if (filters.amount_to) params.append('amount_to', filters.amount_to.toString());
    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.per_page) params.append('per_page', filters.per_page.toString());

    const response = await api.get(`/cash-transfers?${params.toString()}`);
    return response.data;
  }

  async getCashTransfer(id: number): Promise<CashTransfer> {
    const response = await api.get(`/cash-transfers/${id}`);
    return response.data.data;
  }

  async createCashTransfer(data: CreateCashTransferData): Promise<CashTransfer> {
    const response = await api.post('/cash-transfers', data);
    return response.data.data;
  }

  async updateCashTransfer(id: number, data: UpdateCashTransferData): Promise<CashTransfer> {
    const response = await api.put(`/cash-transfers/${id}`, data);
    return response.data.data;
  }

  async deleteCashTransfer(id: number): Promise<void> {
    await api.delete(`/cash-transfers/${id}`);
  }

  async approveCashTransfer(id: number): Promise<CashTransfer> {
    const response = await api.post(`/cash-transfers/${id}/approve`);
    return response.data.data;
  }

  async cancelCashTransfer(id: number): Promise<CashTransfer> {
    const response = await api.post(`/cash-transfers/${id}/cancel`);
    return response.data.data;
  }

  async getStats(): Promise<CashTransferStats> {
    const response = await api.get('/cash-transfers/stats');
    return response.data.data;
  }

  async exportCashTransfers(filters: CashTransferFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.origin_type) params.append('origin_type', filters.origin_type);
    if (filters.destination_type) params.append('destination_type', filters.destination_type);
    if (filters.amount_from) params.append('amount_from', filters.amount_from.toString());
    if (filters.amount_to) params.append('amount_to', filters.amount_to.toString());
    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);

    const response = await api.get(`/cash-transfers/export?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  }

  getOriginTypes(): Array<{ value: string; label: string }> {
    return [
      { value: 'caja_principal', label: 'Caja Principal' },
      { value: 'caja_secundaria', label: 'Caja Secundaria' },
      { value: 'banco', label: 'Banco' },
      { value: 'efectivo', label: 'Efectivo' },
      { value: 'tarjeta', label: 'Tarjeta' },
      { value: 'otro', label: 'Otro' },
    ];
  }

  getDestinationTypes(): Array<{ value: string; label: string }> {
    return [
      { value: 'caja_principal', label: 'Caja Principal' },
      { value: 'caja_secundaria', label: 'Caja Secundaria' },
      { value: 'banco', label: 'Banco' },
      { value: 'efectivo', label: 'Efectivo' },
      { value: 'tarjeta', label: 'Tarjeta' },
      { value: 'gastos', label: 'Gastos' },
      { value: 'otro', label: 'Otro' },
    ];
  }

  getStatuses(): Array<{ value: string; label: string }> {
    return [
      { value: 'pending', label: 'Pendiente' },
      { value: 'approved', label: 'Aprobado' },
      { value: 'completed', label: 'Completado' },
      { value: 'cancelled', label: 'Cancelado' },
    ];
  }
}

export const cashTransferService = new CashTransferService(); 