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
  total_latest: number;
  total_yesterday: number | null;
  accumulated_variance: number | null;
  latest_status: 'draft' | 'submitted' | 'approved';
  /** Nº de ajustes administrativos registrados contra el asesor (advertencias). */
  warning_count: number;
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
  created_at: string;
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

export interface ConsolidatedKPIs {
  total_closes: number;
  total_declared: number;
  total_counted: number;
  net_variance: number;
  variance_pct_reconciled: number;
  advisors_count: number;
  days_in_period: number;
}

export interface ConsolidatedBreakdown {
  approved_count: number;
  approved_total: number;
  approved_pct: number;
  pending_count: number;
  pending_total: number;
  with_variance_count: number;
  net_variance: number;
}

export interface ConsolidatedAdvisorRow {
  user_id: number;
  user_name: string;
  initials: string;
  sede: string;
  closes_count: number;
  total_declared: number;
  total_counted: number;
  variance: number;
  sobra_falta: number;
  latest_status: 'draft' | 'submitted' | 'approved' | '';
  has_reconciled: boolean;
}

export interface ConsolidatedReconRow {
  id: number;
  close_date: string;
  user_id: number;
  user_name: string;
  total_declared: number;
  total_counted: number;
  variance: number;
  sobra_falta: number;
  status: string;
}

export interface ConsolidatedTotals {
  closes_count: number;
  total_declared: number;
  total_counted: number;
  variance: number;
  sobra_falta: number;
}

export interface ConsolidatedPayload {
  date_from: string;
  date_to: string;
  kpis: ConsolidatedKPIs;
  breakdown: ConsolidatedBreakdown;
  advisors: ConsolidatedAdvisorRow[];
  totals: ConsolidatedTotals;
  reconciliation: ConsolidatedReconRow[];
}

export interface CreateCashClosePayload {
  close_date: string;
  payment_methods: PaymentMethodEntry[];
  denominations?: DenominationEntry[];
  advisor_notes?: string | null;
}

/** Payload del ajuste administrativo (edita lo reportado y aprueba en una acción). */
export interface AdjustCashClosePayload {
  payment_methods: PaymentMethodEntry[];
  denominations?: DenominationEntry[];
  admin_notes?: string | null;
  /** Motivo del ajuste — obligatorio; queda registrado como advertencia. */
  reason: string;
}

/** Captura inmutable del estado de un cierre (para comparar antes/después). */
export interface CashCloseSnapshot {
  close_date: string;
  status: string;
  total_counted: number;
  advisor_notes: string;
  admin_notes: string;
  payment_methods: { name: string; counted_amount: number }[];
  denominations: { denomination: number; quantity: number; subtotal: number }[];
}

/** Un ajuste administrativo = una versión + una advertencia contra el asesor. */
export interface CashCloseAdjustment {
  id: number;
  cash_register_close_id: number;
  reason: string;
  before_snapshot: CashCloseSnapshot;
  after_snapshot: CashCloseSnapshot;
  admin_user?: { id: number; name: string; last_name?: string | null };
  advisor_user?: { id: number; name: string; last_name?: string | null };
  acknowledged_at?: string | null;
  created_at: string;
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

export const CASH_EQUIVALENT_METHODS = new Set<string>(['efectivo', 'anticipo', 'pago_sistecredito']);

export const DENOMINATIONS = [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50];

/**
 * Un cierre debería registrarse el mismo día que declara cubrir (`close_date`).
 * Devuelve true cuando el registro real (`created_at`, en hora local) cayó en
 * un día distinto — señal de posible error del asesor al elegir la fecha.
 */
export const isCloseCreatedOnDifferentDay = (
  closeDate: string,
  createdAt: string | null | undefined,
): boolean => {
  if (!closeDate || !createdAt) return false;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return false;
  const localDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return localDay !== closeDate;
};

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

  /** Ajusta un cierre enviado y lo aprueba en una sola acción (solo rol admin). */
  adjust: async (id: number, data: AdjustCashClosePayload) => {
    const response = await api.post(`/api/v1/cash-register-closes/${id}/adjust`, data);
    return response.data;
  },

  /** Historial de ajustes (versiones antes/después) de un cierre. */
  getAdjustments: async (id: number): Promise<CashCloseAdjustment[]> => {
    const response = await api.get(`/api/v1/cash-register-closes/${id}/adjustments`);
    return response.data?.data ?? [];
  },

  /** El asesor confirma haber visto la advertencia del ajuste. */
  acknowledgeAdjustment: async (id: number): Promise<CashCloseAdjustment> => {
    const response = await api.post(`/api/v1/cash-register-close-adjustments/${id}/acknowledge`);
    return response.data?.data;
  },

  /** Totales reales por medio de pago (solo rol admin). */
  putAdminActuals: async (id: number, data: PutAdminActualsPayload) => {
    const response = await api.put(`/api/v1/cash-register-closes/${id}/admin-actuals`, data);
    return response.data;
  },

  listAdvisorsWithPending: async (params?: { branch_id?: string }): Promise<AdvisorPendingGroup[]> => {
    const response = await api.get('/api/v1/cash-register-closes-advisors-pending', { params });
    return response.data?.data ?? [];
  },

  getConsolidated: async (params?: {
    date_from?: string;
    date_to?: string;
    branch_id?: string;
  }): Promise<ConsolidatedPayload> => {
    const response = await api.get('/api/v1/cash-register-closes-consolidated', { params });
    return response.data?.data;
  },

  getCalendarForAdvisor: async (params: {
    user_id: number | string;
    date_from?: string;
    date_to?: string;
    branch_id?: string;
  }): Promise<CashCloseCalendarPayload> => {
    const response = await api.get('/api/v1/cash-register-closes-calendar', { params });
    return response.data?.data;
  },

  /**
   * Descarga el reporte de conciliación de cierres de caja en Excel (.xlsx)
   * para el rango de fechas y sucursal indicados. Devuelve el blob y el nombre
   * de archivo sugerido por el servidor (Content-Disposition).
   */
  exportExcel: async (params?: {
    date_from?: string;
    date_to?: string;
    branch_id?: string;
    user_id?: string;
  }): Promise<{ blob: Blob; filename: string }> => {
    const response = await api.get('/api/v1/cash-register-closes-export', {
      params,
      responseType: 'blob',
    });

    let filename = 'cierre-de-caja.xlsx';
    const disposition = response.headers?.['content-disposition'] as string | undefined;
    if (disposition) {
      const match = /filename\*?=(?:UTF-8'')?"?([^"';]+)"?/i.exec(disposition);
      if (match?.[1]) {
        filename = decodeURIComponent(match[1]);
      }
    }
    return { blob: response.data as Blob, filename };
  },
};

export default cashRegisterCloseService;
