import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Loader2, TrendingUp, AlertCircle } from 'lucide-react';
import { sessionPriceAdjustmentService } from '@/services/sessionPriceAdjustmentService';
import type { Lens } from '@/services/lensService';

interface SessionLensPriceAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  lens: Lens | null;
  onAdjustmentCreated: (adjustedPrice: number) => void;
}

export const SessionLensPriceAdjustmentModal: React.FC<SessionLensPriceAdjustmentModalProps> = ({
  isOpen,
  onClose,
  lens,
  onAdjustmentCreated,
}) => {
  const [adjustedPrice, setAdjustedPrice] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string>('');

  useEffect(() => {
    if (isOpen && lens) {
      // Check if there's already an adjustment for this lens
      const existingAdjustment = sessionPriceAdjustmentService.getAdjustment(lens.id);
      
      if (existingAdjustment) {
        setAdjustedPrice(existingAdjustment.adjustedPrice.toString());
        setReason(existingAdjustment.reason || '');
      } else {
        setAdjustedPrice(lens.price);
        setReason('');
      }
      
      setValidationError('');
    }
  }, [isOpen, lens]);

  const handlePriceChange = (value: string) => {
    setAdjustedPrice(value);
    setValidationError('');

    if (lens && value) {
      const validation = sessionPriceAdjustmentService.validateAdjustment(
        parseFloat(lens.price),
        parseFloat(value)
      );
      
      if (!validation.isValid) {
        setValidationError(validation.error || '');
      }
    }
  };

  const calculateIncrease = (): { amount: number; percentage: number } => {
    if (!lens || !adjustedPrice) return { amount: 0, percentage: 0 };
    
    const basePrice = parseFloat(lens.price);
    const newPrice = parseFloat(adjustedPrice);
    const amount = newPrice - basePrice;
    const percentage = sessionPriceAdjustmentService.calculateAdjustmentPercentage(
      basePrice,
      newPrice
    );
    
    return { amount, percentage };
  };

  const handleSubmit = async () => {
    if (!lens || !adjustedPrice) return;

    const validation = sessionPriceAdjustmentService.validateAdjustment(
      parseFloat(lens.price),
      parseFloat(adjustedPrice)
    );

    if (!validation.isValid) {
      setValidationError(validation.error || '');
      return;
    }

    setLoading(true);
    try {
      sessionPriceAdjustmentService.createAdjustment(
        lens.id,
        parseFloat(lens.price),
        parseFloat(adjustedPrice),
        reason.trim() || undefined
      );

      toast({
        title: 'Precio ajustado exitosamente',
        description: `El precio del lente ha sido aumentado a ${sessionPriceAdjustmentService.formatPrice(parseFloat(adjustedPrice))}`,
      });

      onAdjustmentCreated(parseFloat(adjustedPrice));
      onClose();
    } catch (error) {
      console.error('Error creating price adjustment:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Error al ajustar el precio del lente';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAdjustment = () => {
    if (!lens) return;

    sessionPriceAdjustmentService.removeAdjustment(lens.id);
    
    toast({
      title: 'Ajuste removido',
      description: 'Se ha removido el ajuste de precio del lente',
    });

    onAdjustmentCreated(parseFloat(lens.price)); // Reset to base price
    onClose();
  };

  const increase = calculateIncrease();
  const hasValidIncrease = increase.amount > 0;
  const hasExistingAdjustment = lens ? sessionPriceAdjustmentService.hasAdjustment(lens.id) : false;

  if (!lens) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Modificar Precio del Lente
          </DialogTitle>
          <DialogDescription>
            Ajuste el precio del lente para esta sesión de venta. El precio base no se modificará en el catálogo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-sm text-gray-700 mb-2">Información del Lente</h4>
            <p className="text-sm font-medium">{lens.description}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-gray-600">Precio base:</span>
              <Badge variant="outline">
                {sessionPriceAdjustmentService.formatPrice(parseFloat(lens.price))}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjusted-price">Nuevo Precio *</Label>
            <Input
              id="adjusted-price"
              type="number"
              step="0.01"
              min="0"
              value={adjustedPrice}
              onChange={(e) => handlePriceChange(e.target.value)}
              placeholder="Ingrese el nuevo precio"
              className={validationError ? 'border-red-500' : ''}
            />
            {validationError && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {validationError}
              </div>
            )}
          </div>

          {hasValidIncrease && (
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-700">Aumento:</span>
                <div className="text-right">
                  <div className="font-medium text-green-800">
                    +{sessionPriceAdjustmentService.formatPrice(increase.amount)}
                  </div>
                  <div className="text-green-600">
                    (+{increase.percentage.toFixed(1)}%)
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Razón del Ajuste (Opcional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Servicio premium, material especial, etc."
              rows={3}
              maxLength={500}
            />
            <div className="text-xs text-gray-500 text-right">
              {reason.length}/500 caracteres
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {hasExistingAdjustment && (
            <Button
              variant="outline"
              onClick={handleRemoveAdjustment}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Remover Ajuste
            </Button>
          )}
          
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !hasValidIncrease || !!validationError}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {hasExistingAdjustment ? 'Actualizar' : 'Aplicar'} Precio
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 