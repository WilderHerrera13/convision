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
  bonos_entregados: number;
  bonos_redimidos: number;
  sistecreditos_realizados: number;
  addi_realizados: number;
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

export type RecepcionDineroKey =
  | 'voucher'
  | 'bancolombia'
  | 'daviplata'
  | 'nequi'
  | 'addi_recibido'
  | 'sistecredito_recibido'
  | 'compras'
  | 'anticipos_recibidos'
  | 'anticipos_por_cru'
  | 'bono_regalo_recibido'
  | 'pago_sistecredito';

export type RecepcionesDinero = Record<RecepcionDineroKey, number>;

export const RECEPCIONES_DINERO_META: { key: RecepcionDineroKey; label: string }[] = [
  { key: 'voucher', label: 'Voucher' },
  { key: 'bancolombia', label: 'Bancolombia' },
  { key: 'daviplata', label: 'Daviplata' },
  { key: 'nequi', label: 'Nequi' },
  { key: 'addi_recibido', label: 'Addi' },
  { key: 'sistecredito_recibido', label: 'Sistecrédito' },
  { key: 'compras', label: 'Compras' },
  { key: 'anticipos_recibidos', label: 'Anticipos recibidos' },
  { key: 'anticipos_por_cru', label: 'Anticipos por cruces' },
  { key: 'bono_regalo_recibido', label: 'Bono regalo' },
  { key: 'pago_sistecredito', label: 'Pago Sistecrédito' },
];

export const defaultRecepcionesDinero = (): RecepcionesDinero =>
  RECEPCIONES_DINERO_META.reduce(
    (acc, { key }) => {
      acc[key] = 0;
      return acc;
    },
    {} as RecepcionesDinero,
  );

export const sumRecepcionesDinero = (r: Partial<RecepcionesDinero> | RecepcionesDinero): number =>
  RECEPCIONES_DINERO_META.reduce((s, { key }) => {
    const n = Number(r[key]);
    return s + (Number.isFinite(n) ? n : 0);
  }, 0);

export interface DailyActivityReport {
  id: number;
  report_date: string;
  status: 'pending' | 'closed';
  customer_attention: CustomerAttention;
  operations: Operations;
  social_media: SocialMedia;
  recepciones_dinero?: RecepcionesDinero;
  observations?: string;
  created_at: string;
  updated_at: string;
  user?: { id: number; name: string; last_name?: string };
}

export interface CreateDailyReportPayload {
  customer_attention: CustomerAttention;
  operations: Operations;
  social_media: SocialMedia;
  observations?: string;
}

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
  bonos_entregados: 0,
  bonos_redimidos: 0,
  sistecreditos_realizados: 0,
  addi_realizados: 0,
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

export const QUICK_ATTENTION_ITEMS = [
  { value: 'preguntas', label: 'Preguntas' },
  { value: 'cotizaciones', label: 'Cotizaciones' },
  { value: 'consultas_efectivas', label: 'Consultas efectivas' },
  { value: 'consulta_venta_formula', label: 'Consulta venta fórmula' },
  { value: 'consultas_no_efectivas', label: 'Consultas no efectivas' },
  { value: 'bonos_entregados', label: 'Bonos entregados' },
  { value: 'bonos_redimidos', label: 'Bonos redimidos' },
  { value: 'sistecreditos_realizados', label: 'Sistecréditos realizados' },
  { value: 'addi_realizados', label: 'Addi realizados' },
  { value: 'control_seguimiento', label: 'Control de seguimiento' },
  { value: 'seguimiento_garantias', label: 'Seguimiento garantías' },
  { value: 'ordenes', label: 'Órdenes' },
  { value: 'plan_separe', label: 'Plan Separe' },
  { value: 'otras_ventas', label: 'Otras ventas' },
  { value: 'entregas', label: 'Entregas' },
  { value: 'sistecreditos_abonos', label: 'Sistecréditos abonos' },
  { value: 'valor_ordenes', label: 'Valor de las órdenes ($)' },
  { value: 'voucher', label: 'Voucher' },
  { value: 'bancolombia', label: 'Bancolombia' },
  { value: 'daviplata', label: 'Daviplata' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'addi_recibido', label: 'Addi (dinero)' },
  { value: 'sistecredito_recibido', label: 'Sistecrédito (dinero)' },
  { value: 'compras', label: 'Compras' },
  { value: 'anticipos_recibidos', label: 'Anticipos recibidos' },
  { value: 'anticipos_por_cru', label: 'Anticipos por cruces' },
  { value: 'bono_regalo_recibido', label: 'Bono regalo' },
  { value: 'pago_sistecredito', label: 'Pago Sistecrédito' },
] as const;

export type QuickAttentionItem = (typeof QUICK_ATTENTION_ITEMS)[number]['value'];

export const SHIFT_OPTIONS = [
  { value: 'morning', label: 'Mañana' },
  { value: 'afternoon', label: 'Tarde' },
  { value: 'full', label: 'Día completo' },
] as const;

export function normalizeDailyActivityReport(raw: Record<string, unknown>): DailyActivityReport {
  const ca = raw.customer_attention as Record<string, number> | undefined;

  const atencion = (raw.atencion ?? {}) as Record<string, unknown>;
  const preg = (atencion.preguntas ?? {}) as Record<string, number>;
  const cot = (atencion.cotizaciones ?? {}) as Record<string, number>;
  const ce = (atencion.consultas_efectivas ?? {}) as Record<string, number>;
  const cvf = Number(ca?.consulta_venta_formula ?? atencion.consulta_venta_formula ?? 0);
  const cne = Number(ca?.consultas_no_efectivas ?? atencion.consultas_no_efectivas ?? 0);

  const customer_attention: CustomerAttention = {
    questions_men: Number(ca?.preguntas_hombre ?? preg.hombre ?? 0),
    questions_women: Number(ca?.preguntas_mujeres ?? preg.mujeres ?? 0),
    questions_children: Number(ca?.preguntas_ninos ?? preg.ninos ?? 0),
    quotes_men: Number(ca?.cotizaciones_hombre ?? cot.hombre ?? 0),
    quotes_women: Number(ca?.cotizaciones_mujeres ?? cot.mujeres ?? 0),
    quotes_children: Number(ca?.cotizaciones_ninos ?? cot.ninos ?? 0),
    effective_consultations_men: Number(ca?.consultas_efectivas_hombre ?? ce.hombre ?? 0),
    effective_consultations_women: Number(ca?.consultas_efectivas_mujeres ?? ce.mujeres ?? 0),
    effective_consultations_children: Number(ca?.consultas_efectivas_ninos ?? ce.ninos ?? 0),
    formula_sale_consultations_men: cvf,
    formula_sale_consultations_women: 0,
    formula_sale_consultations_children: 0,
    non_effective_consultations_men: cne,
    non_effective_consultations_women: 0,
    non_effective_consultations_children: 0,
  };

  const opsNew = raw.operations as Record<string, number> | undefined;
  const oper = (raw.operaciones ?? {}) as Record<string, number>;

  const operations: Operations = {
    bonos_entregados: Number(opsNew?.bonos_entregados ?? oper.bonos_entregados ?? 0),
    bonos_redimidos: Number(opsNew?.bonos_redimidos ?? oper.bonos_redimidos ?? 0),
    sistecreditos_realizados: Number(opsNew?.sistecreditos_realizados ?? oper.sistecreditos_realizados ?? 0),
    addi_realizados: Number(opsNew?.addi_realizados ?? oper.addi_realizados ?? 0),
    control_seguimiento: Number(opsNew?.control_seguimiento ?? oper.control_seguimiento ?? 0),
    seguimiento_garantias: Number(opsNew?.seguimiento_garantias ?? oper.seguimiento_garantias ?? 0),
    ordenes: Number(opsNew?.ordenes ?? oper.ordenes ?? 0),
    plan_separe: Number(opsNew?.plan_separe ?? oper.plan_separe ?? 0),
    otras_ventas: Number(opsNew?.otras_ventas ?? oper.otras_ventas ?? 0),
    entregas: Number(opsNew?.entregas ?? oper.entregas ?? 0),
    sistecreditos_abonos: Number(opsNew?.sistecreditos_abonos ?? oper.sistecreditos_abonos ?? 0),
    valor_ordenes: Number(opsNew?.valor_ordenes ?? oper.valor_ordenes ?? 0),
  };

  const smNew = raw.social_media as Record<string, number> | undefined;
  const redes = (raw.redes_sociales ?? {}) as Record<string, number>;

  const social_media: SocialMedia = {
    publicaciones_fb: Number(smNew?.publicaciones_fb ?? redes.publicaciones_facebook ?? 0),
    publicaciones_ig: Number(smNew?.publicaciones_ig ?? redes.publicaciones_instagram ?? 0),
    mensajes_fb: Number(smNew?.mensajes_fb ?? redes.mensajes_facebook ?? 0),
    mensajes_ig: Number(smNew?.mensajes_ig ?? redes.mensajes_instagram ?? 0),
    publicaciones_wa: Number(smNew?.publicaciones_wa ?? redes.publicaciones_whatsapp ?? 0),
    tiktoks: Number(smNew?.tiktoks ?? redes.tiktok_realizados ?? 0),
    bonos_regalo: Number(smNew?.bonos_regalo ?? redes.bonos_regalo_enviados ?? 0),
    bonos_fidelizacion: Number(smNew?.bonos_fidelizacion ?? redes.bonos_fidelizacion_enviados ?? 0),
  };

  const baseRecepciones = defaultRecepcionesDinero();
  const rawRec = raw.recepciones_dinero as Record<string, unknown> | undefined;
  if (rawRec && typeof rawRec === 'object') {
    for (const { key } of RECEPCIONES_DINERO_META) {
      if (key in rawRec && rawRec[key] != null) {
        baseRecepciones[key] = Number(rawRec[key]);
      }
    }
  }

  const userRaw = raw.user as { id?: number; name?: string; last_name?: string } | undefined;

  return {
    id: Number(raw.id),
    report_date: String(raw.report_date ?? ''),
    status: (raw.status as DailyActivityReport['status']) ?? 'pending',
    customer_attention,
    operations,
    social_media,
    recepciones_dinero: baseRecepciones,
    observations: (raw.observations as string) ?? undefined,
    created_at: String(raw.created_at ?? ''),
    updated_at: String(raw.updated_at ?? ''),
    user: userRaw?.id
      ? { id: userRaw.id, name: userRaw.name ?? '', last_name: userRaw.last_name }
      : undefined,
  };
}

export function toFlatDailyReportPayload(
  customer_attention: CustomerAttention,
  operations: Operations,
  social_media: SocialMedia,
  observations?: string,
): Record<string, unknown> {
  const formulaTotal =
    customer_attention.formula_sale_consultations_men +
    customer_attention.formula_sale_consultations_women +
    customer_attention.formula_sale_consultations_children;
  const noEfTotal =
    customer_attention.non_effective_consultations_men +
    customer_attention.non_effective_consultations_women +
    customer_attention.non_effective_consultations_children;

  return {
    preguntas_hombre: customer_attention.questions_men,
    preguntas_mujeres: customer_attention.questions_women,
    preguntas_ninos: customer_attention.questions_children,
    cotizaciones_hombre: customer_attention.quotes_men,
    cotizaciones_mujeres: customer_attention.quotes_women,
    cotizaciones_ninos: customer_attention.quotes_children,
    consultas_efectivas_hombre: customer_attention.effective_consultations_men,
    consultas_efectivas_mujeres: customer_attention.effective_consultations_women,
    consultas_efectivas_ninos: customer_attention.effective_consultations_children,
    consulta_venta_formula: formulaTotal,
    consultas_no_efectivas: noEfTotal,
    control_seguimiento: operations.control_seguimiento,
    seguimiento_garantias: operations.seguimiento_garantias,
    ordenes: operations.ordenes,
    plan_separe: operations.plan_separe,
    otras_ventas: operations.otras_ventas,
    entregas: operations.entregas,
    sistecreditos_abonos: operations.sistecreditos_abonos,
    valor_ordenes: operations.valor_ordenes,
    bonos_entregados: operations.bonos_entregados,
    bonos_redimidos: operations.bonos_redimidos,
    sistecreditos_realizados: operations.sistecreditos_realizados,
    addi_realizados: operations.addi_realizados,
    publicaciones_facebook: social_media.publicaciones_fb,
    publicaciones_instagram: social_media.publicaciones_ig,
    publicaciones_whatsapp: social_media.publicaciones_wa,
    publicaciones_compartidas_fb: 0,
    tiktok_realizados: social_media.tiktoks,
    bonos_regalo_enviados: social_media.bonos_regalo,
    bonos_fidelizacion_enviados: social_media.bonos_fidelizacion,
    mensajes_facebook: social_media.mensajes_fb,
    mensajes_instagram: social_media.mensajes_ig,
    mensajes_whatsapp: 0,
    entregas_realizadas: 0,
    etiquetas_clientes: 0,
    cotizaciones_trabajo: 0,
    ordenes_trabajo: 0,
    observations: observations ?? null,
  };
}

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
    const flat = toFlatDailyReportPayload(
      data.customer_attention,
      data.operations,
      data.social_media,
      data.observations,
    );
    const response = await api.post('/api/v1/daily-activity-reports', flat);
    return response.data;
  },

  update: async (id: number, data: CreateDailyReportPayload) => {
    const flat = toFlatDailyReportPayload(
      data.customer_attention,
      data.operations,
      data.social_media,
      data.observations,
    );
    const response = await api.put(`/api/v1/daily-activity-reports/${id}`, flat);
    return response.data;
  },

  close: async (id: number) => {
    const response = await api.post(`/api/v1/daily-activity-reports/${id}/close`);
    return response.data;
  },

  reopen: async (id: number) => {
    const response = await api.post(`/api/v1/daily-activity-reports/${id}/reopen`);
    return response.data;
  },

  quickAttention: async (payload: {
    item: QuickAttentionItem;
    profile?: 'hombre' | 'mujer' | 'nino';
    amount?: number;
    note?: string;
  }) => {
    const response = await api.post('/api/v1/daily-activity-reports/quick-attention', payload);
    const body = response.data?.data ?? response.data;
    return normalizeDailyActivityReport(body as Record<string, unknown>);
  },
};

export default dailyActivityReportService;
