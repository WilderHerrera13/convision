import api from '@/lib/axios';
import ApiService from './ApiService';

export interface Discount {
  id: number;
  lens_id: number;
  patient_id?: number;
  patient?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  discount_percentage: number;
  original_price: number | string;
  discounted_price: number | string;
  reason?: string;
  rejection_reason?: string;
  approved_by?: number;
  expiry_date?: string;
  is_global: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiscountCreateData {
  lens_id: number;
  patient_id?: number;
  discount_percentage: number;
  reason?: string;
  expiry_date?: string;
  is_global?: boolean;
}

export interface DiscountUpdateData {
  lens_id?: number;
  patient_id?: number;
  discount_percentage?: number;
  reason?: string;
  expiry_date?: string;
  is_global?: boolean;
}

export interface ActiveDiscountsResponse {
  data: Discount[];
}

export interface LensDetails {
  id: number;
  internal_code: string;
  description: string;
  price: number;
  has_discounts: boolean;
}

class DiscountService {
  // Cache para evitar múltiples llamadas a la API para los mismos parámetros
  private discountCache: Map<string, { data: Discount[], timestamp: number }> = new Map();
  private readonly CACHE_TTL = 300000; // 5 minutos en milisegundos

  /**
   * Get all discount requests with optional filtering
   */
  async getDiscountRequests(params = {}) {
    return await ApiService.get('/api/v1/discount-requests', { params });
  }

  /**
   * Get a single discount request by ID
   */
  async getDiscountRequestById(id: number) {
    return await ApiService.get(`/api/v1/discount-requests/${id}`);
  }

  /**
   * Create a new discount request
   */
  async createDiscountRequest(data: {
    lens_id: number;
    patient_id: number;
    requested_discount: number;
    reason: string;
  }) {
    try {
      const response = await api.post('/api/v1/discounts', data);
      return response.data;
    } catch (error) {
      console.error('Error creating discount request:', error);
      throw error;
    }
  }

  /**
   * Update a discount request
   */
  async updateDiscountRequest(id: number, data: DiscountUpdateData) {
    return await ApiService.put(`/api/v1/discount-requests/${id}`, data);
  }

  /**
   * Approve a discount request
   */
  async approveDiscountRequest(id: number) {
    return await ApiService.post(`/api/v1/discount-requests/${id}/approve`);
  }

  /**
   * Reject a discount request
   */
  async rejectDiscountRequest(id: number, rejectionReason: string) {
    return await ApiService.post(`/api/v1/discount-requests/${id}/reject`, { rejection_reason: rejectionReason });
  }

  /**
   * Delete a discount request
   */
  async deleteDiscountRequest(id: number) {
    return await ApiService.delete(`/api/v1/discount-requests/${id}`);
  }

  /**
   * Get active discounts for a specific lens and optionally a patient
   * Added caching mechanism to improve performance
   */
  async getActiveDiscounts(lensId: number, patientId?: number): Promise<Discount[]> {
    try {
      const cacheKey = `lens_${lensId}_patient_${patientId || 'none'}`;
      const cachedData = this.discountCache.get(cacheKey);
      const now = Date.now();

      // Si tenemos datos en caché y no han expirado, usarlos
      if (cachedData && (now - cachedData.timestamp < this.CACHE_TTL)) {
        console.log('Usando datos de descuentos en caché');
        return cachedData.data;
      }

      let url = `/api/v1/active-discounts?lens_id=${lensId}`;
      if (patientId) {
        url += `&patient_id=${patientId}`;
      }
      
      console.log('Realizando petición a:', url);
      
      const response = await api.get(url);
      console.log('Respuesta completa del API:', response);
      
      // La API puede devolver datos dentro de data.data o directamente en data
      const discountData = response.data && response.data.data 
        ? response.data.data 
        : (Array.isArray(response.data) ? response.data : []);
      
      console.log('Datos de descuentos extraídos:', discountData);
      
      // Asegurarse de que original_price y discounted_price sean números
      if (discountData && Array.isArray(discountData)) {
        const processedDiscounts = discountData.map(discount => {
          // Obtener el precio original del lente
          const originalPrice = typeof discount.original_price !== 'undefined' 
            ? (typeof discount.original_price === 'string' 
                ? parseFloat(discount.original_price) 
                : discount.original_price)
            : 0;
            
          // Calcular el precio con descuento si no viene en la respuesta
          let discountedPrice = typeof discount.discounted_price !== 'undefined'
            ? (typeof discount.discounted_price === 'string'
                ? parseFloat(discount.discounted_price)
                : discount.discounted_price)
            : 0;
          
          // Si no hay precio con descuento, calcularlo
          if (!discountedPrice && originalPrice && discount.discount_percentage) {
            discountedPrice = this.calculateDiscountedPrice(
              originalPrice, 
              typeof discount.discount_percentage === 'string' 
                ? parseFloat(discount.discount_percentage) 
                : discount.discount_percentage
            );
          }
          
          return {
            ...discount,
            original_price: originalPrice,
            discounted_price: discountedPrice,
            discount_percentage: typeof discount.discount_percentage === 'string'
              ? parseFloat(discount.discount_percentage)
              : discount.discount_percentage
          };
        });
        
        console.log('Descuentos procesados:', processedDiscounts);

        // Guardar en caché
        this.discountCache.set(cacheKey, {
          data: processedDiscounts,
          timestamp: now
        });
        
        return processedDiscounts;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching active discounts:', error);
      // Devolver caché expirada si está disponible, mejor tener datos antiguos que ninguno
      const cacheKey = `lens_${lensId}_patient_${patientId || 'none'}`;
      const cachedData = this.discountCache.get(cacheKey);
      if (cachedData) {
        console.log('Usando datos en caché expirados debido a error de API');
        return cachedData.data;
      }
      throw error;
    }
  }

  /**
   * Find the best discount for a lens and patient (returns the highest percentage discount)
   * Improved error handling and uses the cached discount data when possible
   */
  async getBestDiscount(lensId: number, patientId?: number): Promise<Discount | null> {
    try {
      const discounts = await this.getActiveDiscounts(lensId, patientId);
      
      if (!discounts || discounts.length === 0) {
        return null;
      }
      
      // Ordenar por porcentaje de descuento de mayor a menor
      const sortedDiscounts = discounts.sort((a, b) => 
        b.discount_percentage - a.discount_percentage
      );
      
      return sortedDiscounts[0];
    } catch (error) {
      console.error('Error obteniendo el mejor descuento:', error);
      return null;
    }
  }

  /**
   * Calculate discounted price
   */
  calculateDiscountedPrice(originalPrice: number, discountPercentage: number): number {
    if (typeof originalPrice !== 'number' || isNaN(originalPrice)) {
      console.error('Precio original no es un número válido:', originalPrice);
      return 0;
    }
    
    if (typeof discountPercentage !== 'number' || isNaN(discountPercentage)) {
      console.error('Porcentaje de descuento no es un número válido:', discountPercentage);
      return originalPrice;
    }
    
    const discount = (originalPrice * discountPercentage) / 100;
    return Math.round((originalPrice - discount) * 100) / 100; // Redondear a 2 decimales
  }

  async getLensDiscounts(lensId: number) {
    try {
      const response = await api.get(`/api/v1/discounts?lens_id=${lensId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching lens discounts:', error);
      throw error;
    }
  }

  async getPatientDiscounts(patientId: number) {
    try {
      const response = await api.get(`/api/v1/discounts?patient_id=${patientId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching patient discounts:', error);
      throw error;
    }
  }

  async getMyDiscountRequests() {
    try {
      const response = await api.get('/api/v1/my-discount-requests');
      return response.data;
    } catch (error) {
      console.error('Error fetching my discount requests:', error);
      throw error;
    }
  }

  /**
   * Get lens details including discount flag
   */
  async getLensDetails(lensId: number): Promise<LensDetails | null> {
    try {
      const response = await api.get(`/api/v1/lenses/${lensId}`);
      
      if (!response.data) {
        return null;
      }
      
      const lens = response.data.data || response.data;
      
      return {
        id: lens.id,
        internal_code: lens.internal_code || '',
        description: lens.description || '',
        price: parseFloat(lens.price) || 0,
        has_discounts: lens.has_discounts === true
      };
    } catch (error) {
      console.error('Error fetching lens details:', error);
      return null;
    }
  }

  /**
   * Clear discount cache to force refresh of data
   */
  clearCache() {
    this.discountCache.clear();
    console.log('Caché de descuentos limpiada');
  }
}

export const discountService = new DiscountService(); 