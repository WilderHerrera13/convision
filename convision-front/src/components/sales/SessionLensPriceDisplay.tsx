import React from 'react';
import { sessionPriceAdjustmentService } from '@/services/sessionPriceAdjustmentService';

interface SessionLensPriceDisplayProps {
  lensId: number;
  basePrice: string | number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SessionLensPriceDisplay: React.FC<SessionLensPriceDisplayProps> = ({
  lensId,
  basePrice,
  size = 'md',
  className = '',
}) => {
  const basePriceNum = typeof basePrice === 'string' ? parseFloat(basePrice) : basePrice;
  const adjustment = sessionPriceAdjustmentService.getAdjustment(lensId);
  const displayPrice = adjustment ? adjustment.adjustedPrice : basePriceNum;
  const formattedPrice = sessionPriceAdjustmentService.formatPrice(displayPrice);
  
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold',
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      {formattedPrice}
    </div>
  );
}; 