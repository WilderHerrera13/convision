import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ShoppingCart, Trash2, Lock, ArrowRight } from 'lucide-react';
import type { Lens } from '@/services/lensService';
import { formatCurrency } from '@/lib/utils';

interface CartItem extends Lens {
  quantity?: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemoveItem: (productId: number) => void;
  onClear: () => void;
  onContinue: () => void;
  patientName?: string;
}

const LensThumb = ({ typeName }: { typeName?: string }) => {
  const bgMap: Record<string, string> = {
    Progresivo: 'bg-violet-100',
    Bifocal: 'bg-amber-100',
    Monofocal: 'bg-sky-100',
  };
  const bg = bgMap[typeName ?? ''] ?? 'bg-slate-100';
  return (
    <div className={`w-12 h-12 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
      <svg width="28" height="14" viewBox="0 0 28 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" className="text-slate-400" />
        <circle cx="21" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" className="text-slate-400" />
        <line x1="12.5" y1="7" x2="15.5" y2="7" stroke="currentColor" strokeWidth="1.5" className="text-slate-400" />
      </svg>
    </div>
  );
};

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onRemoveItem,
  onClear,
  onContinue,
}) => {
  const total = items.reduce((sum, item) => {
    return sum + parseFloat(item.price?.toString() ?? '0');
  }, 0);

  if (!isOpen) return null;

  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col flex-shrink-0 h-full">
      <div className="px-5 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-slate-800">Carrito de Venta</span>
            <span className="bg-violet-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {items.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <Separator />

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-5 py-10 gap-3">
          <ShoppingCart size={40} className="text-slate-200" />
          <p className="text-sm text-slate-500">El carrito está vacío</p>
        </div>
      ) : (
        <ScrollArea className="flex-1 px-5 py-3">
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <LensThumb typeName={item.type?.name} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 leading-snug line-clamp-2">
                    {item.description}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {[item.brand?.name, item.type?.name].filter(Boolean).join(' · ')}
                  </p>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5">
                    {formatCurrency(parseFloat(item.price?.toString() ?? '0'), 'COP')}
                  </p>
                </div>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="text-slate-300 hover:text-red-500 transition-colors mt-0.5 flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <div className="flex-shrink-0 px-5 pb-5 pt-3 space-y-3">
        <Separator />
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Total a pagar</span>
          <span className="text-lg font-bold text-slate-800">
            {formatCurrency(total, 'COP')}
          </span>
        </div>

        <Button
          onClick={onContinue}
          disabled={items.length === 0}
          className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium"
        >
          Continuar Venta
          <ArrowRight size={16} className="ml-2" />
        </Button>

        <Button
          onClick={onClear}
          disabled={items.length === 0}
          variant="outline"
          className="w-full border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
        >
          <Trash2 size={14} className="mr-2" />
          Vaciar Carrito
        </Button>

        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <Lock size={11} />
          <span>Transacción segura · Solo efectivo y tarjeta</span>
        </div>
      </div>
    </div>
  );
};

export default CartDrawer;
