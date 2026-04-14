import api from '@/lib/axios';

export interface CustomerAttention {
  questions_men: number;
  questions_women: number;
  questions_children: number;
  quotes_men: number;
  quotes_women: number;
  quotes_children: number;
  effective_consultations_men: number;
  effective_consultations_women: number;
  effective_consultations_children: number;
  formula_sale_consultations_men: number;
  formula_sale_consultations_women: number;
  formula_sale_consultations_children: number;
  non_effective_consultations_men: number;
  non_effective_consultations_women: number;
  non_effective_consultations_children: number;
}

export interface Operations {
  control_seguimiento: number;
  seguimiento_garantias: number;
  ordenes: number;
  plan_separe: number;
  otras_ventas: number;
  entregas: number;
  sistecreditos_abonos: number;
  valor_ordenes: number;
}

export interface SocialMedia {
  publicaciones_fb: number;
  publicaciones_ig: number;
  mensajes_fb: number;
  mensajes_ig: number;
  publicaciones_wa: number;
  tiktoks: number;
  bonos_regalo: number;
  bonos_fidelizacion: number;
}

export interface DailyActivityReport {
  id: number;
  report_date: string;
  shift: 'morning' | 'afternoon' | 'full';
  customer_attention: CustomerAttention;
  operations: Operations;
  social_media: SocialMedia;
  observations?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDailyReportPayload {
  report_date: string;
  shift: string;
  customer_attention: CustomerAttention;
  operations: Operations;
  social_media: SocialMedia;
  observations?: string;
}

export const SHIFT_OPTIONS = [
  { value: 'morning', label: 'Mañana' },
  { value: 'afternoon', label: 'Tarde' },
  { value: 'full', label: 'Completa' },
];

export const defaultCustomerAttention = (): CustomerAttention => ({
  questions_men: 0,
  questions_women: 0,
  questions_children: 0,
  quotes_men: 0,
  quotes_women: 0,
  quotes_children: 0,
  effective_consultations_men: 0,
  effective_consultations_women: 0,
  effective_consultations_children: 0,
  formula_sale_consultations_men: 0,
  formula_sale_consultations_women: 0,
  formula_sale_consultations_children: 0,
  non_effective_consultations_men: 0,
  non_effective_consultations_women: 0,
  non_effective_consultations_children: 0,
});

export const defaultOperations = (): Operations => ({
  control_seguimiento: 0,
  seguimiento_garantias: 0,
  ordenes: 0,
  plan_separe: 0,
  otras_ventas: 0,
  entregas: 0,
  sistecreditos_abonos: 0,
  valor_ordenes: 0,
});

export const defaultSocialMedia = (): SocialMedia => ({
  publicaciones_fb: 0,
  publicaciones_ig: 0,
  mensajes_fb: 0,
  mensajes_ig: 0,
  publicaciones_wa: 0,
  tiktoks: 0,
  bonos_regalo: 0,
  bonos_fidelizacion: 0,
});

const dailyActivityReportService = {
  list: async (params?: Record<string, unknown>) => {
    const response = await api.get('/api/v1/daily-activity-reports', { params });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get(`/api/v1/daily-activity-reports/${id}`);
    return response.data;
  },

  create: async (data: CreateDailyReportPayload) => {
    const response = await api.post('/api/v1/daily-activity-reports', data);
    return response.data;
  },

  update: async (id: number, data: Partial<CreateDailyReportPayload>) => {
    const response = await api.put(`/api/v1/daily-activity-reports/${id}`, data);
    return response.data;
  },
};

export default dailyActivityReportService;
