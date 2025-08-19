import api from '@/lib/axios';

export interface OrderItem {
  lens_id: number;
  quantity: number;
  price: number;
  discount: number;
  total: number;
  notes?: string | null;
}

export interface OrderRequest {
  patient_id: number;
  appointment_id: number;
  laboratory_id?: number | null;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string | null;
}

export interface Order {
  id: number;
  order_number: string;
  patient_id: number;
  patient: {
    id: number;
    first_name: string;
    last_name: string;
    identification: string;
    email?: string;
    phone?: string;
  };
  appointment_id: number;
  laboratory_id?: number | null;
  laboratory?: {
    id: number;
    name: string;
    phone?: string;
    email?: string;
    contact_person?: string;
    status: string;
  };
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  notes?: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  pdf_path?: string;
  pdf_url?: string;
  pdf_token?: string;
  laboratory_pdf_token?: string;
  guest_pdf_url?: string;
  guest_lab_pdf_url?: string;
}

export interface OrderResponse {
  message: string;
  order: Order;
  pdf_url: string;
  laboratory_pdf_url?: string;
  pdf_token?: string;
  laboratory_pdf_token?: string;
}

export interface PaginatedOrdersResponse {
  data: Order[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export const orderService = {
  /**
   * Create a new order
   * @param orderData Order data
   * @returns Promise with the created order
   */
  async createOrder(orderData: OrderRequest): Promise<OrderResponse> {
    const response = await api.post('/api/v1/orders', orderData);
    return response.data;
  },

  /**
   * Get all orders with pagination
   * @param page Page number
   * @param perPage Items per page
   * @param filters Additional filters (status, payment_status, search, etc.)
   * @returns Paginated orders
   */
  async getOrders(
    page = 1, 
    perPage = 10, 
    filters: Record<string, string | number> = {}
  ): Promise<PaginatedOrdersResponse> {
    try {
      const params: Record<string, string | number> = {
        page,
        per_page: perPage,
      };
      
      // Add any additional filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== 'all') {
          params[key] = value;
        }
      });
      
      const response = await api.get('/api/v1/orders', { params });
      return response.data;
    } catch (error) {
      console.error('Error in orderService.getOrders:', error);
      throw error; // Re-throw to allow components to handle specific error types
    }
  },

  /**
   * Get a single order by ID
   * @param orderId Order ID
   * @returns Order details
   */
  async getOrder(orderId: number): Promise<Order> {
    const response = await api.get(`/api/v1/orders/${orderId}`);
    return response.data;
  },

  /**
   * Download order PDF using standard authentication
   * @param orderId Order ID
   * @param orderNumber Order number (for filename)
   */
  async downloadOrderPdf(orderId: number, orderNumber: string): Promise<void> {
    try {
      // Get the auth token
      const token = localStorage.getItem('token');
      
      // Use fetch API for better control over the response
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/orders/${orderId}/pdf-download`, {
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
        `<a id="download" href="${url}" download="order-${orderNumber}.pdf"></a>`
      );
      iframe.contentWindow?.document.getElementById('download')?.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(iframe);
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error(`Error downloading PDF for order ${orderId}:`, error);
      throw error;
    }
  },

  /**
   * Download laboratory order PDF using standard authentication
   * @param orderId Order ID
   * @param orderNumber Order number (for filename)
   */
  async downloadLaboratoryOrderPdf(orderId: number, orderNumber: string): Promise<void> {
    try {
      // Get the auth token
      const token = localStorage.getItem('token');
      
      // Use fetch API for better control over the response
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/orders/${orderId}/laboratory-pdf-download`, {
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
        `<a id="download" href="${url}" download="laboratory-order-${orderNumber}.pdf"></a>`
      );
      iframe.contentWindow?.document.getElementById('download')?.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(iframe);
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error(`Error downloading laboratory PDF for order ${orderId}:`, error);
      throw error;
    }
  },

  /**
   * Download order PDF using a secure token (no authentication required)
   * @param orderId Order ID
   * @param orderNumber Order number (for filename)
   * @param pdfToken Secure token for PDF access
   */
  async downloadOrderPdfWithToken(orderId: number, orderNumber: string, pdfToken: string): Promise<void> {
    try {
      // Use fetch API to download the PDF with token
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/guest/orders/${orderId}/pdf?token=${pdfToken}`, {
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
        `<a id="download" href="${url}" download="order-${orderNumber}.pdf"></a>`
      );
      iframe.contentWindow?.document.getElementById('download')?.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(iframe);
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error(`Error downloading PDF with token for order ${orderId}:`, error);
      throw error;
    }
  },

  /**
   * Download laboratory order PDF using a secure token (no authentication required)
   * @param orderId Order ID
   * @param orderNumber Order number (for filename)
   * @param pdfToken Secure token for PDF access
   */
  async downloadLaboratoryOrderPdfWithToken(orderId: number, orderNumber: string, pdfToken: string): Promise<void> {
    try {
      // Use fetch API to download the PDF with token
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/guest/orders/${orderId}/laboratory-pdf?token=${pdfToken}`, {
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
        `<a id="download" href="${url}" download="laboratory-order-${orderNumber}.pdf"></a>`
      );
      iframe.contentWindow?.document.getElementById('download')?.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(iframe);
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error(`Error downloading laboratory PDF with token for order ${orderId}:`, error);
      throw error;
    }
  },

  /**
   * Get a PDF download URL with token that can be shared
   * @param orderId Order ID 
   * @param pdfToken The secure PDF token
   * @returns Full URL for downloading the PDF
   */
  getOrderPdfShareableUrl(orderId: number, pdfToken: string): string {
    return `${import.meta.env.VITE_API_URL}/api/v1/guest/orders/${orderId}/pdf?token=${pdfToken}`;
  },

  /**
   * Get a laboratory PDF download URL with token that can be shared
   * @param orderId Order ID 
   * @param pdfToken The secure PDF token
   * @returns Full URL for downloading the PDF
   */
  getLaboratoryOrderPdfShareableUrl(orderId: number, pdfToken: string): string {
    return `${import.meta.env.VITE_API_URL}/api/v1/guest/orders/${orderId}/laboratory-pdf?token=${pdfToken}`;
  }
}; 