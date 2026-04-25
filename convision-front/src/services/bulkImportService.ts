import api from '@/lib/axios';

export type ImportType = 'patients' | 'doctors' | 'scheduled-appointments' | 'lenses';

export type RecordStatus = 'created' | 'skipped' | 'error';

export interface RecordResult {
  row: number;
  status: RecordStatus;
  data: Record<string, string>;
  reason?: string;
}

export interface ImportResult {
  import_type: ImportType;
  total_rows: number;
  created: number;
  skipped: number;
  errors: number;
  records: RecordResult[];
}

export interface BulkImportLogEntry {
  id: number;
  import_type: string;
  file_name: string;
  total_rows: number;
  created: number;
  skipped: number;
  errors: number;
  processed_by: number | null;
  processed_at: string;
}

export interface BulkImportHistoryResponse {
  data: BulkImportLogEntry[];
  total: number;
  page: number;
  per_page: number;
}

const bulkImportService = {
  uploadPatients: async (file: File): Promise<ImportResult> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<ImportResult>('/api/v1/bulk-import/patients', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  uploadDoctors: async (file: File): Promise<ImportResult> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<ImportResult>('/api/v1/bulk-import/doctors', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  uploadScheduledAppointments: async (file: File): Promise<ImportResult> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<ImportResult>('/api/v1/bulk-import/scheduled-appointments', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  uploadLenses: async (file: File): Promise<ImportResult> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<ImportResult>('/api/v1/bulk-import/lenses', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  getHistory: async (importType: ImportType, page = 1, perPage = 50): Promise<BulkImportHistoryResponse> => {
    const { data } = await api.get<BulkImportHistoryResponse>('/api/v1/bulk-import/history', {
      params: { type: importType, page, per_page: perPage },
    });
    return data;
  },
};

export default bulkImportService;
