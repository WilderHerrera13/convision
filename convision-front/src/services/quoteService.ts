import api from '@/lib/axios';

export interface Quote {
  id: number;
  quote_number: string;
  patient_id: number;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'converted';
  expiration_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  patient?: {
    id: number;
    first_name: string;
    last_name: string;
    identification: string;
    phone: string;
    email: string;
  };
  items?: Array<{
    id: number;
    quote_id: number;
    lens_id: number;
    quantity: number;
    price: number;
    discount: number;
    total: number;
    notes: string | null;
    lens: {
      id: number;
      identifier: string;
      description: string;
      price: string;
      brand: {
        id: number;
        name: string;
      };
    };
  }>;
  pdf_token?: string;
  pdf_url?: string;
  created_by?: number;
}

export interface QuoteItem {
  lens_id: number;
  quantity: number;
  price: number;
  discount: number;
  total: number;
  notes?: string | null;
}

export interface CreateQuoteRequest {
  patient_id: number;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  expiration_date: string;
  notes?: string | null;
  items: QuoteItem[];
}

export interface QuoteFilterParams {
  page?: number;
  per_page?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
  patient_id?: number | string;
  search?: string;
}

export interface QuoteResponse {
  message: string;
  quote: Quote;
  pdf_url: string;
  pdf_token?: string;
}

class QuoteService {
  /**
   * Get a list of quotes with filtering options
   */
  async getQuotes(params?: QuoteFilterParams) {
    const cleanParams = { ...params };
    
    // Remove any empty string parameters to avoid filtering issues
    if (cleanParams) {
      Object.keys(cleanParams).forEach(key => {
        if (cleanParams[key as keyof QuoteFilterParams] === '') {
          delete cleanParams[key as keyof QuoteFilterParams];
        }
      });
    }
    
    const response = await api.get('/api/v1/quotes', { params: cleanParams });
    return response.data;
  }

  /**
   * Get a single quote by ID
   */
  async getQuote(id: number) {
    const response = await api.get(`/api/v1/quotes/${id}`);
    return response.data as Quote;
  }

  /**
   * Create a new quote
   */
  async createQuote(data: CreateQuoteRequest) {
    const response = await api.post('/api/v1/quotes', data);
    return response.data as QuoteResponse;
  }

  /**
   * Update the status of a quote
   */
  async updateQuoteStatus(id: number, status: 'pending' | 'approved' | 'rejected' | 'expired') {
    const response = await api.post(`/api/v1/quotes/${id}/status`, { status });
    return response.data;
  }

  /**
   * Convert a quote to a sale
   */
  async convertToSale(id: number) {
    const response = await api.post(`/api/v1/quotes/${id}/convert`);
    return response.data;
  }

  /**
   * Generate a quote PDF
   */
  getQuotePdfUrl(id: number): string {
    return `${api.defaults.baseURL}/api/v1/quotes/${id}/pdf`;
  }

  /**
   * Download quote PDF using a secure token (no authentication required)
   * @param quoteId Quote ID
   * @param quoteNumber Quote number (for filename)
   * @param pdfToken Secure token for PDF access
   */
  async downloadQuotePdfWithToken(quoteId: number, quoteNumber: string, pdfToken: string): Promise<void> {
    try {
      // Use fetch API to download the PDF with token
      const response = await fetch(`${api.defaults.baseURL}/api/v1/guest/quotes/${quoteId}/pdf?token=${pdfToken}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      // Get the blob directly from the response
      const blob = await response.blob();
      
      // Create object URL
      const url = window.URL.createObjectURL(blob);
      
      // Create invisible iframe for download
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      // Write content to iframe and trigger download
      iframe.contentWindow?.document.write(
        `<a id="download" href="${url}" download="cotizacion-${quoteNumber}.pdf"></a>`
      );
      iframe.contentWindow?.document.getElementById('download')?.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(iframe);
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error(`Error downloading PDF with token for quote ${quoteId}:`, error);
      throw error;
    }
  }

  /**
   * Get a PDF download URL with token that can be shared
   * @param quoteId Quote ID 
   * @param pdfToken The secure PDF token
   * @returns Full URL for downloading the PDF
   */
  getQuotePdfShareableUrl(quoteId: number, pdfToken: string): string {
    return `${api.defaults.baseURL}/api/v1/guest/quotes/${quoteId}/pdf?token=${pdfToken}`;
  }
}

export const quoteService = new QuoteService(); 