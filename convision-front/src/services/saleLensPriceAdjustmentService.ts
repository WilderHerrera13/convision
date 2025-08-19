import ApiService from './ApiService';

export interface SaleLensPriceAdjustment {
  id: number;
  sale_id: number;
  lens_id: number;
  base_price: string;
  adjusted_price: string;
  adjustment_amount: string;
  reason?: string;
  adjusted_by: number;
  lens?: {
    id: number;
    description: string;
    price: string;
  };
  adjustedBy?: {
    id: number;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreatePriceAdjustmentRequest {
  lens_id: number;
  adjusted_price: number;
  reason?: string;
}

export interface AdjustedPriceResponse {
  lens_id: number;
  base_price: string;
  adjusted_price: string;
  has_adjustment: boolean;
  adjustment?: SaleLensPriceAdjustment;
}

class SaleLensPriceAdjustmentService {
  async getAdjustments(saleId: number): Promise<SaleLensPriceAdjustment[]> {
    try {
      const response = await ApiService.get<SaleLensPriceAdjustment[]>(
        `/api/v1/sales/${saleId}/lens-price-adjustments`
      );
      return response;
    } catch (error) {
      console.error('Error fetching price adjustments:', error);
      throw error;
    }
  }

  async createAdjustment(
    saleId: number, 
    data: CreatePriceAdjustmentRequest
  ): Promise<SaleLensPriceAdjustment> {
    try {
      const response = await ApiService.post<SaleLensPriceAdjustment>(
        `/api/v1/sales/${saleId}/lens-price-adjustments`,
        data
      );
      return response;
    } catch (error) {
      console.error('Error creating price adjustment:', error);
      throw error;
    }
  }

  async getAdjustment(
    saleId: number, 
    adjustmentId: number
  ): Promise<SaleLensPriceAdjustment> {
    try {
      const response = await ApiService.get<SaleLensPriceAdjustment>(
        `/api/v1/sales/${saleId}/lens-price-adjustments/${adjustmentId}`
      );
      return response;
    } catch (error) {
      console.error('Error fetching price adjustment:', error);
      throw error;
    }
  }

  async deleteAdjustment(saleId: number, adjustmentId: number): Promise<void> {
    try {
      await ApiService.delete(`/api/v1/sales/${saleId}/lens-price-adjustments/${adjustmentId}`);
    } catch (error) {
      console.error('Error deleting price adjustment:', error);
      throw error;
    }
  }

  async getAdjustedPrice(saleId: number, lensId: number): Promise<AdjustedPriceResponse> {
    try {
      const response = await ApiService.get<AdjustedPriceResponse>(
        `/api/v1/sales/${saleId}/lenses/${lensId}/adjusted-price`
      );
      return response;
    } catch (error) {
      console.error('Error fetching adjusted price:', error);
      throw error;
    }
  }

  formatPrice(price: string | number): string {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numPrice);
  }

  calculateAdjustmentPercentage(basePrice: string | number, adjustedPrice: string | number): number {
    const base = typeof basePrice === 'string' ? parseFloat(basePrice) : basePrice;
    const adjusted = typeof adjustedPrice === 'string' ? parseFloat(adjustedPrice) : adjustedPrice;
    
    if (base === 0) return 0;
    
    return ((adjusted - base) / base) * 100;
  }

  validateAdjustment(basePrice: string | number, adjustedPrice: string | number): {
    isValid: boolean;
    error?: string;
  } {
    const base = typeof basePrice === 'string' ? parseFloat(basePrice) : basePrice;
    const adjusted = typeof adjustedPrice === 'string' ? parseFloat(adjustedPrice) : adjustedPrice;

    if (adjusted <= 0) {
      return {
        isValid: false,
        error: 'El precio ajustado debe ser mayor a 0'
      };
    }

    if (adjusted <= base) {
      return {
        isValid: false,
        error: 'No se permite disminuir el precio. Utilice el flujo de descuentos si desea aplicar una reducción.'
      };
    }

    return { isValid: true };
  }
}

export const saleLensPriceAdjustmentService = new SaleLensPriceAdjustmentService(); 