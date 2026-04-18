import api from '@/lib/axios';

/** Declaración del asesor por medio de pago (sin valor de sistema). */
export interface PaymentMethodEntry {
  name: string;
  counted_amount: number;
}

export interface DenominationEntry {
  denomination: number;
  quantity: number;
}

/** Solo en respuestas autenticadas como admin (API no lo envía a asesor/recepción). */
export interface CashCloseReconciliationTotals {
  advisor_total: number;
  admin_total: number | null;
  variance_total: number | null;
}

export interface CashCloseReconciliationRow {
  name: string;
  advisor_counted: number;
  admin_actual: number;
  variance: number;
}

export interface CashCloseReconciliation {
  totals: CashCloseReconciliationTotals;
  recorded_at: string | null;
  payment_methods: CashCloseReconciliationRow[] | null;
}

export interface CashClose {
  id: number;
  close_date: string;
  status: 'draft' | 'submitted' | 'approved';
  user?: { id: number; name: string; last_name?: string | null };
  payment_methods: PaymentMethodEntry[];
  denominations?: DenominationEntry[];
  total_counted: number;
  admin_notes?: string;
  /** Notas del asesor al registrar el cierre (borrador / envío). */
  advisor_notes?: string | null;
  /** Totales reales ingresados por admin (contabilidad manual). */
  total_actual_amount?: number | null;
  admin_actuals_recorded_at?: string | null;
  reconciliation?: CashCloseReconciliation;
  approved_by?: { id: number; name: string };
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PutAdminActualsPayload {
  actual_payment_methods: { name: string; actual_amount: number }[];
}

export interface AdvisorPendingClose {
  id: number;
  close_date: string;
  status: 'draft' | 'submitted' | 'approved';
  total_counted: number;
}

export interface AdvisorPendingGroup {
  user_id: number;
  user_name: string;
  pending_count: number;
  close_dates: string[];
  total_today: number;
  total_yesterday: number | null;
  accumulated_variance: number | null;
  latest_status: 'draft' | 'submitted' | 'approved';
  closes: AdvisorPendingClose[];
}

export interface CashCloseCalendarClose {
  id: number;
  status: 'draft' | 'submitted' | 'approved';
  total_counted: number;
  total_actual_amount: number | null;
  cash_counted: number;
  variance: number | null;
  advisor_notes: string | null;
  admin_notes: string | null;
  approved_at: string | null;
  submitted_at: string | null;
  payment_methods: { name: string; counted_amount: number }[];
  denominations: { denomination: number; quantity: number; subtotal: number }[];
}

export interface CashCloseCalendarDay {
  date: string;
  day_number: string;
  day_name: string;
  month_name: string;
  is_today: boolean;
  close: CashCloseCalendarClose | null;
}

export interface CashCloseCalendarApprovedDay {
  id: number;
  index: number;
  close_date: string;
  total_counted: number;
  total_actual_amount: number | null;
  variance: number | null;
}

export interface CashCloseCalendarPayload {
  advisor: { id: number; name: string; last_name: string | null; role: string };
  date_from: string;
  date_to: string;
  days: CashCloseCalendarDay[];
  summary: {
    approved_count: number;
    pending_count: number;
    approved_total: number;
    approved_actual_total: number | null;
    approved_variance_total: number | null;
    approved_days: CashCloseCalendarApprovedDay[];
  };
}

export interface CreateCashClosePayload {
  close_date: string;
  payment_methods: PaymentMethodEntry[];
  denominations?: DenominationEntry[];
  advisor_notes?: string | null;
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

  returnToDraft: async (id: number, admin_notes?: string) => {
    const response = await api.post(`/api/v1/cash-register-closes/${id}/return`, { admin_notes });
    return response.data;
  },

  /** Totales reales por medio de pago (solo rol admin). */
  putAdminActuals: async (id: number, data: PutAdminActualsPayload) => {
    const response = await api.put(`/api/v1/cash-register-closes/${id}/admin-actuals`, data);
    return response.data;
  },

  listAdvisorsWithPending: async (): Promise<AdvisorPendingGroup[]> => {
    const response = await api.get('/api/v1/cash-register-closes-advisors-pending');
    return response.data?.data ?? [];
  },

  getCalendarForAdvisor: async (params: {
    user_id: number | string;
    date_from?: string;
    date_to?: string;
  }): Promise<CashCloseCalendarPayload> => {
    const response = await api.get('/api/v1/cash-register-closes-calendar', { params });
    return response.data?.data;
  },
};

export default cashRegisterCloseService;
