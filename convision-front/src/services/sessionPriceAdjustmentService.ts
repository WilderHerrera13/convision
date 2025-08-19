interface SessionPriceAdjustment {
  lensId: number;
  basePrice: number;
  adjustedPrice: number;
  adjustmentAmount: number;
  reason?: string;
  timestamp: number;
}

interface SessionAdjustmentData {
  adjustments: Record<number, SessionPriceAdjustment>;
  sessionId: string;
}

class SessionPriceAdjustmentService {
  private readonly STORAGE_KEY = 'sale_session_price_adjustments';
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getSessionData(): SessionAdjustmentData {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        return data;
      }
    } catch (error) {
      console.error('Error reading session adjustments:', error);
    }
    
    return {
      adjustments: {},
      sessionId: this.sessionId
    };
  }

  private saveSessionData(data: SessionAdjustmentData): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving session adjustments:', error);
    }
  }

  createAdjustment(
    lensId: number,
    basePrice: number,
    adjustedPrice: number,
    reason?: string
  ): SessionPriceAdjustment {
    if (adjustedPrice <= basePrice) {
      throw new Error('No se permite disminuir el precio. Utilice el flujo de descuentos si desea aplicar una reducción.');
    }

    const adjustment: SessionPriceAdjustment = {
      lensId,
      basePrice,
      adjustedPrice,
      adjustmentAmount: adjustedPrice - basePrice,
      reason,
      timestamp: Date.now()
    };

    const sessionData = this.getSessionData();
    sessionData.adjustments[lensId] = adjustment;
    this.saveSessionData(sessionData);

    return adjustment;
  }

  getAdjustment(lensId: number): SessionPriceAdjustment | null {
    const sessionData = this.getSessionData();
    return sessionData.adjustments[lensId] || null;
  }

  hasAdjustment(lensId: number): boolean {
    return this.getAdjustment(lensId) !== null;
  }

  getEffectivePrice(lensId: number, basePrice: number): number {
    const adjustment = this.getAdjustment(lensId);
    return adjustment ? adjustment.adjustedPrice : basePrice;
  }

  removeAdjustment(lensId: number): boolean {
    const sessionData = this.getSessionData();
    if (sessionData.adjustments[lensId]) {
      delete sessionData.adjustments[lensId];
      this.saveSessionData(sessionData);
      return true;
    }
    return false;
  }

  getAllAdjustments(): SessionPriceAdjustment[] {
    const sessionData = this.getSessionData();
    return Object.values(sessionData.adjustments);
  }

  clearAllAdjustments(): void {
    const sessionData = this.getSessionData();
    sessionData.adjustments = {};
    this.saveSessionData(sessionData);
  }

  getAdjustmentSummary(): {
    totalAdjustments: number;
    totalAdjustmentAmount: number;
    adjustments: SessionPriceAdjustment[];
  } {
    const adjustments = this.getAllAdjustments();
    const totalAdjustmentAmount = adjustments.reduce(
      (sum, adj) => sum + adj.adjustmentAmount,
      0
    );

    return {
      totalAdjustments: adjustments.length,
      totalAdjustmentAmount,
      adjustments
    };
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  }

  calculateAdjustmentPercentage(basePrice: number, adjustedPrice: number): number {
    if (basePrice === 0) return 0;
    return ((adjustedPrice - basePrice) / basePrice) * 100;
  }

  validateAdjustment(basePrice: number, adjustedPrice: number): {
    isValid: boolean;
    error?: string;
  } {
    if (adjustedPrice <= 0) {
      return {
        isValid: false,
        error: 'El precio ajustado debe ser mayor a 0'
      };
    }

    if (adjustedPrice <= basePrice) {
      return {
        isValid: false,
        error: 'No se permite disminuir el precio. Utilice el flujo de descuentos si desea aplicar una reducción.'
      };
    }

    return { isValid: true };
  }

  // Method to transfer session adjustments to a real sale
  async transferToSale(saleId: number): Promise<void> {
    const adjustments = this.getAllAdjustments();
    
    if (adjustments.length === 0) {
      return;
    }

    // Import the actual service here to avoid circular dependencies
    const { saleLensPriceAdjustmentService } = await import('./saleLensPriceAdjustmentService');
    
    const promises = adjustments.map(adjustment =>
      saleLensPriceAdjustmentService.createAdjustment(saleId, {
        lens_id: adjustment.lensId,
        adjusted_price: adjustment.adjustedPrice,
        reason: adjustment.reason
      })
    );

    try {
      await Promise.all(promises);
      this.clearAllAdjustments(); // Clear session after successful transfer
    } catch (error) {
      console.error('Error transferring adjustments to sale:', error);
      throw error;
    }
  }
}

export const sessionPriceAdjustmentService = new SessionPriceAdjustmentService(); 