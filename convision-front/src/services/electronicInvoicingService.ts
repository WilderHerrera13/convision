import api from '@/lib/axios';

export type DocumentType = 'FV' | 'NC' | 'ND' | 'DS' | 'POS';
export type DIANStatus =
  | 'draft'
  | 'signed'
  | 'sent'
  | 'validated'
  | 'rejected'
  | 'contingency'
  | 'error';

export interface ElectronicDocument {
  id: number;
  issuer_id: number;
  external_ref: string;
  number: string;
  document_type: DocumentType;
  issue_date: string;
  dian_status: DIANStatus;
  cufe: string;
  total: number;
  iva_total: number;
  recipient_name: string;
  recipient_doc_number: string;
  created_at: string;
}

export interface ElectronicDocumentListResponse {
  data: ElectronicDocument[];
  total: number;
  current_page: number;
  per_page: number;
  last_page: number;
}

export interface DocumentFilter {
  document_type?: string;
  dian_status?: string;
  start_date?: string;
  end_date?: string;
  external_ref?: string;
  page?: number;
  page_size?: number;
}

const electronicInvoicingService = {
  async list(filter: DocumentFilter = {}): Promise<ElectronicDocumentListResponse> {
    const params = new URLSearchParams();
    if (filter.document_type) params.set('document_type', filter.document_type);
    if (filter.dian_status) params.set('dian_status', filter.dian_status);
    if (filter.start_date) params.set('start_date', filter.start_date);
    if (filter.end_date) params.set('end_date', filter.end_date);
    if (filter.external_ref) params.set('external_ref', filter.external_ref);
    if (filter.page) params.set('page', String(filter.page));
    if (filter.page_size) params.set('page_size', String(filter.page_size));
    const { data } = await api.get<ElectronicDocumentListResponse>(
      `/api/v1/invoicing/documents?${params.toString()}`
    );
    return data;
  },

  async getForTable(params: {
    page: number;
    per_page: number;
    filters?: Record<string, unknown>;
  }): Promise<{ data: ElectronicDocument[]; last_page: number; total: number }> {
    const f = params.filters ?? {};
    const result = await electronicInvoicingService.list({
      document_type: f.document_type as string | undefined,
      dian_status: f.dian_status as string | undefined,
      start_date: f.start_date as string | undefined,
      end_date: f.end_date as string | undefined,
      external_ref: f.external_ref as string | undefined,
      page: params.page,
      page_size: params.per_page,
    });
    return {
      data: result.data,
      last_page: result.last_page,
      total: result.total,
    };
  },

  async getById(id: number): Promise<ElectronicDocument> {
    const { data } = await api.get<ElectronicDocument>(`/api/v1/invoicing/documents/${id}`);
    return data;
  },

  async downloadXML(id: number, filename: string): Promise<void> {
    const response = await api.get(`/api/v1/invoicing/documents/${id}/xml`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/xml' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  async retry(id: number): Promise<ElectronicDocument> {
    const { data } = await api.post<ElectronicDocument>(`/api/v1/invoicing/documents/${id}/retry`);
    return data;
  },
};

export default electronicInvoicingService;
