import React from 'react';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';
import { saleLensPriceAdjustmentService } from '@/services/saleLensPriceAdjustmentService';

interface LensPriceDisplayProps {
  basePrice: string | number;
  adjustedPrice?: string | number;
  hasAdjustment?: boolean;
  showIncrease?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LensPriceDisplay: React.FC<LensPriceDisplayProps> = ({
  basePrice,
  adjustedPrice,
  hasAdjustment = false,
  showIncrease = true,
  size = 'md',
  className = '',
}) => {
  const displayPrice = hasAdjustment && adjustedPrice ? adjustedPrice : basePrice;
  const formattedPrice = saleLensPriceAdjustmentService.formatPrice(displayPrice);
  
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold',
  };

  if (!hasAdjustment) {
    return (
      <div className={`${sizeClasses[size]} ${className}`}>
        {formattedPrice}
      </div>
    );
  }

  const increase = saleLensPriceAdjustmentService.calculateAdjustmentPercentage(
    basePrice,
    adjustedPrice || basePrice
  );

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center gap-2">
        <span className={`${sizeClasses[size]} font-semibold text-green-700`}>
          {formattedPrice}
        </span>
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          <TrendingUp className="h-3 w-3 mr-1" />
          Ajustado
        </Badge>
      </div>
      
      {showIncrease && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 line-through">
            {saleLensPriceAdjustmentService.formatPrice(basePrice)}
          </span>
          <span className="text-xs text-green-600 font-medium">
            +{increase.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}; 