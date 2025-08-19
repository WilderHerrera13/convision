import api from '@/lib/axios';
import { Patient } from './patientService';
import { Order } from './orderService';
import { User } from './userService';
import { LaboratoryOrder } from './laboratoryOrderService';

export interface Sale {
  id: number;
  sale_number: string;
  patient_id: number;
  order_id?: number;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amount_paid: number;
  balance: number;
  status: 'pending' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'partial' | 'paid';
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by: number;
  patient?: Patient;
  order?: Order;
  payments: Payment[];
  partialPayments: PartialPayment[];
  createdBy?: User;
  items?: SaleItem[];
  laboratoryOrders?: LaboratoryOrder[];
}

export interface SaleItem {
  id: number;
  sale_id: number;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: number;
  name: string;
  code: string;
  requires_reference: boolean;
}

export interface CreateSaleRequest {
  patient_id: number;
  order_id?: number;
  appointment_id?: number;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  laboratory_id?: number;
  laboratory_notes?: string;
  payments?: CreatePaymentRequest[];
  is_partial_payment?: boolean;
}

export interface SaleFilterParams {
  page?: number;
  per_page?: number;
  status?: string;
  payment_status?: string;
  date_from?: string;
  date_to?: string;
  patient_id?: number | string | undefined;
}

export interface SaleStats {
  total_sales: number;
  total_revenue: number;
  collected_amount: number;
  pending_balance: number;
  payment_status_breakdown: Record<string, number>;
  recent_sales: Sale[];
  period: {
    start_date: string;
    end_date: string;
  };
}

export interface CreatePaymentRequest {
  payment_method_id: number;
  amount: number;
  reference_number?: string;
  payment_date: string;
  notes?: string;
}

export interface SaleResponse {
  message: string;
  sale: Sale;
  pdf_url: string;
  pdf_token?: string;
  laboratory_order?: LaboratoryOrder;
}

export interface Payment {
  id: number;
  sale_id: number;
  payment_method_id: number;
  amount: number;
  reference_number?: string;
  payment_date: string;
  notes?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  payment_method?: PaymentMethod;
}

export interface PartialPayment {
  id: number;
  sale_id: number;
  payment_method_id: number;
  amount: number;
  reference_number?: string;
  payment_date: string;
  notes?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  payment_method?: PaymentMethod;
}

class SaleService {
  /**
   * Get a list of sales with filtering options
   */
  async getSales(params?: SaleFilterParams) {
    // Clean params: remove empty string values for date fields to prevent database errors
    const cleanParams = { ...params };
    
    // Check if date parameters are empty strings and remove them
    if (cleanParams && 'date_from' in cleanParams && (!cleanParams.date_from || cleanParams.date_from === '')) {
      delete cleanParams.date_from;
    }
    
    if (cleanParams && 'date_to' in cleanParams && (!cleanParams.date_to || cleanParams.date_to === '')) {
      delete cleanParams.date_to;
    }
    
    // Remove any other empty string parameters to avoid filtering issues
    if (cleanParams) {
      Object.keys(cleanParams).forEach(key => {
        if (cleanParams[key as keyof SaleFilterParams] === '') {
          delete cleanParams[key as keyof SaleFilterParams];
        }
      });
    }
    
    const response = await api.get('/api/v1/sales', { params: cleanParams });
    return response.data;
  }

  /**
   * Get sale statistics
   */
  async getStats(startDate?: string, endDate?: string) {
    const params = { start_date: startDate, end_date: endDate };
    const response = await api.get('/api/v1/sales/stats', { params });
    return response.data as SaleStats;
  }

  /**
   * Get today's sale statistics
   */
  async getTodayStats() {
    const response = await api.get('/api/v1/sales/stats/today');
    return response.data as SaleStats;
  }

  /**
   * Get a single sale by ID
   */
  async getSale(id: number) {
    const response = await api.get(`/api/v1/sales/${id}`);
    return response.data.data as Sale;
  }

  /**
   * Create a new sale
   */
  async createSale(data: CreateSaleRequest) {
    const response = await api.post('/api/v1/sales', data);
    return response.data as SaleResponse;
  }

  /**
   * Add a payment to a sale
   */
  async addPayment(saleId: number, data: CreatePaymentRequest) {
    const response = await api.post(`/api/v1/sales/${saleId}/payments`, data);
    return response.data;
  }

  /**
   * Remove a payment from a sale
   */
  async removePayment(saleId: number, paymentId: number) {
    const response = await api.delete(`/api/v1/sales/${saleId}/payments/${paymentId}`);
    return response.data;
  }

  /**
   * Cancel a sale
   */
  async cancelSale(id: number) {
    const response = await api.post(`/api/v1/sales/${id}/cancel`);
    return response.data;
  }

  /**
   * Get payment methods
   */
  async getPaymentMethods() {
    const response = await api.get('/api/v1/payment-methods');
    return response.data.data as PaymentMethod[];
  }

  /**
   * Generate a sale PDF (invoice) with authentication
   */
  getSalePdfUrl(id: number): string {
    return `${api.defaults.baseURL}/api/v1/sales/${id}/pdf`;
  }

  /**
   * Get a secure token for PDF download with authentication
   * @param id Sale ID
   */
  async getPdfToken(id: number): Promise<{ token: string, url: string }> {
    try {
      const response = await api.get(`/api/v1/sales/${id}/pdf-token`);
      return response.data.data;
    } catch (error) {
      console.error(`Error getting PDF token for sale ${id}:`, error);
      throw error;
    }
  }

  /**
   * Download sale invoice using a two-step process:
   * 1. Get token (authenticated request)
   * 2. Download the PDF using the token (no auth required)
   * @param id Sale ID
   * @param saleNumber Sale number (for filename)
   */
  async downloadSalePdfSecure(id: number, saleNumber: string): Promise<void> {
    try {
      // Step 1: Get token (authenticated request)
      const { token, url: downloadUrl } = await this.getPdfToken(id);
      
      // Step 2: Download PDF with token (no auth required)
      const response = await fetch(`${downloadUrl}`, {
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
        `<a id="download" href="${url}" download="invoice-${saleNumber}.pdf"></a>`
      );
      iframe.contentWindow?.document.getElementById('download')?.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(iframe);
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error(`Error downloading PDF for sale ${id}:`, error);
      throw error;
    }
  }

  /**
   * Download sale invoice PDF with authentication
   * @param id Sale ID 
   * @param saleNumber Sale number (for filename)
   */
  async downloadSalePdf(id: number, saleNumber: string): Promise<void> {
    try {
      // Get the auth token from localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Use fetch API with authorization header
      const baseUrl = api.defaults.baseURL || window.location.origin;
      const response = await fetch(`${baseUrl}/api/v1/sales/${id}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
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
        `<a id="download" href="${url}" download="invoice-${saleNumber}.pdf"></a>`
      );
      iframe.contentWindow?.document.getElementById('download')?.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(iframe);
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error(`Error downloading PDF for sale ${id}:`, error);
      throw error;
    }
  }

  /**
   * Download sale invoice PDF using a secure token (no authentication required)
   * @param saleId Sale ID
   * @param saleNumber Sale number (for filename)
   * @param pdfToken Secure token for PDF access
   */
  async downloadSalePdfWithToken(saleId: number, saleNumber: string, pdfToken: string): Promise<void> {
    try {
      // Use fetch API to download the PDF with token
      const baseUrl = api.defaults.baseURL || window.location.origin;
      const response = await fetch(`${baseUrl}/api/v1/guest/sales/${saleId}/pdf?token=${pdfToken}`, {
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
        `<a id="download" href="${url}" download="invoice-${saleNumber}.pdf"></a>`
      );
      iframe.contentWindow?.document.getElementById('download')?.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(iframe);
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error(`Error downloading PDF with token for sale ${saleId}:`, error);
      throw error;
    }
  }

  /**
   * Get a PDF download URL with token that can be shared
   * @param saleId Sale ID 
   * @param pdfToken The secure PDF token
   * @returns Full URL for downloading the PDF
   */
  getSalePdfShareableUrl(saleId: number, pdfToken: string): string {
    const baseUrl = api.defaults.baseURL || window.location.origin;
    return `${baseUrl}/api/v1/guest/sales/${saleId}/pdf?token=${pdfToken}`;
  }

  /**
   * Get a PDF preview URL with token that can be used in an iframe
   * @param saleId Sale ID 
   * @param pdfToken The secure PDF token
   * @returns Full URL for previewing the PDF
   */
  getSalePdfPreviewUrl(saleId: number, pdfToken: string): string {
    const baseUrl = api.defaults.baseURL || window.location.origin;
    return `${baseUrl}/api/v1/guest/sales/${saleId}/pdf?token=${pdfToken}&preview=true`;
  }

  /**
   * Add a partial payment (abono) to a sale
   */
  async addPartialPayment(saleId: number, data: CreatePaymentRequest) {
    const response = await api.post(`/api/v1/sales/${saleId}/partial-payments`, data);
    return response.data;
  }
  
  /**
   * Get partial payments for a sale
   */
  async getPartialPayments(saleId: number) {
    const response = await api.get(`/api/v1/sales/${saleId}/partial-payments`);
    return response.data as PartialPayment[];
  }
  
  /**
   * Remove a partial payment from a sale
   */
  async removePartialPayment(saleId: number, paymentId: number) {
    const response = await api.delete(`/api/v1/sales/${saleId}/partial-payments/${paymentId}`);
    return response.data;
  }
}

export const saleService = new SaleService(); 