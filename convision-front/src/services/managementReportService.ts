import api from '@/lib/axios';

export type ConsultationType =
  | 'effective'
  | 'formula_sale'
  | 'ineffective'
  | 'follow_up'
  | 'warranty_follow_up';

export type AppointmentStatus =
  | 'scheduled'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'cancelled';

export type ManagementReportPatient = {
  id: number;
  first_name: string;
  last_name: string;
  identification: string;
  phone?: string;
  email?: string;
};

export type ManagementReportRecord = {
  id: number;
  patient_id: number;
  specialist_id: number | null;
  scheduled_at: string | null;
  status: AppointmentStatus;
  consultation_type: ConsultationType | null;
  report_notes: string | null;
  patient: ManagementReportPatient | null;
  specialist: { id: number; name: string; last_name?: string } | null;
  updated_at: string;
};

export type ManagementReportListResponse = {
  data: ManagementReportRecord[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type ListParams = {
  page?: number;
  perPage?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  status?: AppointmentStatus;
  consultationType?: ConsultationType;
  specialistId?: string | number;
  pendingReport?: boolean;
};

export const CONSULTATION_TYPE_OPTIONS: {
  value: ConsultationType;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    value: 'effective',
    label: 'Consultas Efectivas',
    shortLabel: 'Consulta Efectiva',
    description: 'Atención completada con resultado clínico definido',
  },
  {
    value: 'formula_sale',
    label: 'Consulta Venta Fórmula',
    shortLabel: 'Venta Fórmula',
    description: 'Consulta que resultó en la venta de una fórmula óptica',
  },
  {
    value: 'ineffective',
    label: 'Consultas No Efectivas',
    shortLabel: 'No Efectiva',
    description: 'Atención que no pudo completarse o el paciente no se presentó',
  },
  {
    value: 'follow_up',
    label: 'Control de Seguimiento',
    shortLabel: 'Ctrl. Seguimiento',
    description: 'Revisión de seguimiento a tratamiento previo',
  },
  {
    value: 'warranty_follow_up',
    label: 'Seguimiento Garantías',
    shortLabel: 'Seg. Garantías',
    description: 'Atención en el marco de garantía de un producto o servicio',
  },
];

export const managementReportService = {
  async list(params: ListParams = {}): Promise<ManagementReportListResponse> {
    const query: Record<string, string | number> = {
      page: params.page ?? 1,
      per_page: params.perPage ?? 7,
    };
    if (params.search) query.search = params.search;
    if (params.startDate) query.start_date = params.startDate;
    if (params.endDate) query.end_date = params.endDate;
    if (params.status) query.status = params.status;
    if (params.consultationType) query.consultation_type = params.consultationType;
    if (params.specialistId) query.specialist_id = params.specialistId;
    if (params.pendingReport) query.pending_report = 'true';

    const response = await api.get('/api/v1/management-report', { params: query });
    return response.data;
  },

  async getById(id: number): Promise<ManagementReportRecord> {
    const response = await api.get(`/api/v1/management-report/${id}`);
    return response.data;
  },

  async save(
    id: number,
    payload: { consultation_type: ConsultationType; report_notes: string },
  ): Promise<ManagementReportRecord> {
    const response = await api.post(`/api/v1/management-report/${id}`, payload);
    return response.data;
  },
};
