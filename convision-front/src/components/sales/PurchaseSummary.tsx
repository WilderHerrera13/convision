import React from 'react';
import { formatCurrency } from '@/lib/utils';

interface SaleItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
}

interface PurchaseSummaryProps {
  items: SaleItem[];
  subtotal: number;
  tax: number;
  total: number;
  isLoading: boolean;
}

const PurchaseSummary: React.FC<PurchaseSummaryProps> = ({
  items,
  subtotal,
  tax,
  total,
  isLoading,
}) => {
  const totalDiscount = items.reduce((acc, item) => acc + item.discount, 0);
  const discountPct =
    totalDiscount > 0 && subtotal + totalDiscount > 0
      ? Math.round((totalDiscount / (subtotal + totalDiscount)) * 100)
      : 0;

  return (
    <div className="bg-white border border-[#e5e5e9] rounded-[8px] overflow-hidden">
      <div className="bg-[#f7f4ff] border-b border-[#e5e5e9] h-[44px] flex items-center px-4">
        <span className="text-[13px] font-semibold text-[#121212]">Resumen de Compra</span>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <div className="h-8 w-8 border-2 border-t-[#8753ef] border-[#e5e5e9] rounded-full animate-spin" />
          <span className="text-[12px] text-[#7d7d87]">Calculando precios y descuentos...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-1">
          <span className="text-[12px] text-[#b4b5bc]">No hay productos agregados</span>
        </div>
      ) : (
        <>
          <div className="px-4 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-[#b4b5bc]">Producto</span>
              <div className="flex gap-8">
                <span className="text-[11px] font-semibold text-[#b4b5bc]">Cant.</span>
                <span className="text-[11px] font-semibold text-[#b4b5bc]">Valor</span>
              </div>
            </div>
            <div className="border-t border-[#e5e5e9]" />
          </div>

          <div className="px-4 pt-2 pb-3 space-y-1">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <span className="text-[12px] text-[#121212] flex-1 truncate pr-2">{item.description}</span>
                <div className="flex gap-8 shrink-0">
                  <span className="text-[12px] text-[#121212] w-8 text-center">{item.quantity}</span>
                  <span className="text-[12px] text-[#121212] w-20 text-right">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-[#e5e5e9] mx-4" />

          <div className="px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[#7d7d87]">Subtotal</span>
              <span className="text-[12px] text-[#7d7d87]">{formatCurrency(subtotal + totalDiscount)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[#af2926]">
                  Descuento{discountPct > 0 ? ` (${discountPct}%)` : ''}
                </span>
                <span className="text-[12px] text-[#af2926]">- {formatCurrency(totalDiscount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[#7d7d87]">IVA (19%)</span>
              <span className="text-[12px] text-[#7d7d87]">{formatCurrency(tax)}</span>
            </div>
          </div>

          <div className="border-t border-[#e5e5e9] mx-4" />

          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-[15px] font-bold text-[#121212]">TOTAL</span>
            <span className="text-[18px] font-bold text-[#8753ef]">{formatCurrency(total)}</span>
          </div>
        </>
      )}
    </div>
  );
};

export default PurchaseSummary;
