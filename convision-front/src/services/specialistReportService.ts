import api from '@/lib/axios';
import { ConsultationType, CONSULTATION_TYPE_OPTIONS } from './managementReportService';

export type { ConsultationType };
export { CONSULTATION_TYPE_OPTIONS };

export type SpecialistReportKPIs = {
  effective: number;
  formula_sale: number;
  ineffective: number;
  follow_up: number;
  warranty_follow_up: number;
};

export type SpecialistSummaryRow = {
  specialist_id: number;
  specialist_name: string;
  effective: number;
  formula_sale: number;
  ineffective: number;
  follow_up: number;
  warranty_follow_up: number;
  total: number;
  observation: string;
};

export type ConsolidatedReport = {
  from: string;
  to: string;
  specialists_count: number;
  kpis: SpecialistReportKPIs;
  rows: SpecialistSummaryRow[];
};

export type SpecialistProfile = {
  id: number;
  name: string;
  last_name: string;
  role: string;
};

export type SpecialistReportRecord = {
  id: number;
  scheduled_at: string | null;
  consultation_type: ConsultationType | null;
  report_notes: string | null;
  patient: { id: number; first_name: string; last_name: string; identification: string } | null;
  specialist: { id: number; name: string; last_name?: string } | null;
};

export type SpecialistDetailResponse = {
  specialist: SpecialistProfile;
  kpis: SpecialistReportKPIs;
  from: string;
  to: string;
  records: {
    data: SpecialistReportRecord[];
    total: number;
    current_page: number;
    last_page: number;
    per_page: number;
  };
};

export const specialistReportService = {
  async getConsolidated(params: {
    from?: string;
    to?: string;
    specialistIds?: number[];
  }): Promise<ConsolidatedReport> {
    const query: Record<string, string> = {};
    if (params.from) query.from = params.from;
    if (params.to) query.to = params.to;
    if (params.specialistIds?.length) query.specialist_ids = params.specialistIds.join(',');
    const res = await api.get('/api/v1/specialist-reports/consolidated', { params: query });
    return res.data;
  },

  async getSpecialistDetail(
    specialistId: number,
    params: { from?: string; to?: string; search?: string; page?: number; perPage?: number },
  ): Promise<SpecialistDetailResponse> {
    const query: Record<string, string | number> = {
      page: params.page ?? 1,
      per_page: params.perPage ?? 15,
    };
    if (params.from) query.from = params.from;
    if (params.to) query.to = params.to;
    if (params.search) query.search = params.search;
    const res = await api.get(`/api/v1/specialist-reports/specialists/${specialistId}`, { params: query });
    return res.data;
  },

  /** Returns the label shown in the table badge/chip for a consultation type. */
  consultationTypeLabel(type: ConsultationType | null): string {
    if (!type) return '—';
    return CONSULTATION_TYPE_OPTIONS.find((o) => o.value === type)?.shortLabel ?? type;
  },
};
