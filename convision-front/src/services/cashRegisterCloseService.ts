import api from '@/lib/axios';

export interface PaymentMethodEntry {
  name: string;
  registered_amount: number;
  counted_amount: number;
}

export interface DenominationEntry {
  denomination: number;
  quantity: number;
}

export interface CashClose {
  id: number;
  close_date: string;
  status: 'draft' | 'submitted' | 'approved';
  payment_methods: PaymentMethodEntry[];
  denominations?: DenominationEntry[];
  total_registered: number;
  total_counted: number;
  total_difference: number;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCashClosePayload {
  close_date: string;
  payment_methods: PaymentMethodEntry[];
  denominations?: DenominationEntry[];
}

export const PAYMENT_METHODS = [
  'efectivo', 'voucher', 'bancolombia', 'daviplata', 'nequi',
  'addi', 'sistecredito', 'anticipo', 'bono', 'pago_sistecredito',
] as const;

export type PaymentMethodName = typeof PAYMENT_METHODS[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodName, string> = {
  efectivo: 'Efectivo',
  voucher: 'Voucher',
  bancolombia: 'Bancolombia',
  daviplata: 'Daviplata',
  nequi: 'Nequi',
  addi: 'Addi',
  sistecredito: 'Sistecredito',
  anticipo: 'Anticipo',
  bono: 'Bono',
  pago_sistecredito: 'Pago Sistecredito',
};

export const DENOMINATIONS = [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50];

const cashRegisterCloseService = {
  list: async (params?: Record<string, unknown>) => {
    const response = await api.get('/api/v1/cash-register-closes', { params });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get(`/api/v1/cash-register-closes/${id}`);
    return response.data;
  },

  create: async (data: CreateCashClosePayload) => {
    const response = await api.post('/api/v1/cash-register-closes', data);
    return response.data;
  },

  update: async (id: number, data: Partial<CreateCashClosePayload>) => {
    const response = await api.put(`/api/v1/cash-register-closes/${id}`, data);
    return response.data;
  },

  submit: async (id: number) => {
    const response = await api.post(`/api/v1/cash-register-closes/${id}/submit`);
    return response.data;
  },

  approve: async (id: number, admin_notes?: string) => {
    const response = await api.post(`/api/v1/cash-register-closes/${id}/approve`, { admin_notes });
    return response.data;
  },
};

export default cashRegisterCloseService;
