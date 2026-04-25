import React from 'react';
import { formatCurrency } from '@/lib/utils';

interface SaleItem {
  id: string;
  lens: { id: number; name: string; price: string };
  description: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
  has_discounts?: boolean;
  meta?: string;
}

interface ProductListProps {
  items: SaleItem[];
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
}

const ProductList: React.FC<ProductListProps> = ({ items, onRemove, onUpdateQuantity }) => {
  if (items.length === 0) return null;

  return (
    <div className="mx-4 mb-4 space-y-2">
      {items.map((item) => {
        const discountPct =
          item.discount > 0 && item.price > 0
            ? Math.round((item.discount / (item.price * item.quantity)) * 100)
            : 0;

        return (
          <div
            key={item.id}
            className="bg-[#f9f9fa] border border-[#e5e5e9] rounded-[8px] h-[88px] flex overflow-hidden"
          >
            <div className="w-[4px] bg-[#8753ef] shrink-0" />

            <div className="flex-1 min-w-0 pl-[11px] pr-2 pt-[10px] pb-[10px] flex flex-col justify-between">
              {item.meta ? (
                <p className="text-[9px] font-semibold tracking-[0.7px] text-[#b4b5bc] uppercase leading-none truncate">
                  {item.meta}
                </p>
              ) : (
                <span className="h-[11px]" />
              )}
              <p className="text-[14px] font-semibold text-[#121215] leading-tight truncate">
                {item.description}
              </p>
              <div className="flex items-center gap-2">
                {discountPct > 0 && (
                  <span className="bg-[#fff6e3] rounded-[99px] h-[18px] px-[8px] flex items-center shrink-0 text-[9px] font-semibold text-[#b57218] tracking-[0.3px] whitespace-nowrap">
                    {discountPct}% DESC.
                  </span>
                )}
                {item.discount > 0 && (
                  <span className="text-[10px] text-[#b4b5bc] line-through whitespace-nowrap">
                    Precio base: {formatCurrency(item.price * item.quantity)}
                  </span>
                )}
              </div>
            </div>

            <div className="w-px bg-[#e5e5e9] my-[13px] shrink-0" />

            <div className="w-[110px] shrink-0 flex flex-col items-center justify-center gap-1 px-2">
              <span className="text-[10px] text-[#7d7d87]">Cant.</span>
              <div className="bg-white border border-[#e0e0e4] rounded-[6px] h-[28px] w-[84px] flex items-center overflow-hidden">
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                  className="w-[27px] h-full flex items-center justify-center text-[#7d7d87] text-[15px] hover:bg-[#f5f5f6] transition-colors select-none"
                >
                  −
                </button>
                <div className="w-px bg-[#e0e0e4] h-full shrink-0" />
                <span className="flex-1 text-center text-[13px] font-semibold text-[#121215]">
                  {item.quantity}
                </span>
                <div className="w-px bg-[#e0e0e4] h-full shrink-0" />
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  className="w-[27px] h-full flex items-center justify-center text-[#8753ef] text-[15px] hover:bg-[#f5f5f6] transition-colors select-none"
                >
                  +
                </button>
              </div>
            </div>

            <div className="w-px bg-[#e5e5e9] my-[13px] shrink-0" />

            <div className="w-[160px] shrink-0 flex flex-col justify-center pl-4 pr-2">
              <span className="text-[10px] text-[#7d7d87]">Precio final</span>
              <span className="text-[18px] font-bold text-[#8753ef] leading-tight">
                {formatCurrency(item.total)}
              </span>
              {item.discount > 0 && (
                <span className="text-[10px] text-[#228b52]">
                  Ahorraste: {formatCurrency(item.discount)}
                </span>
              )}
            </div>

            <div className="flex items-center pr-3 shrink-0">
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="bg-[#fff0f0] border border-[#f5baba] rounded-full size-[24px] flex items-center justify-center text-[13px] font-semibold text-[#b82626] hover:bg-[#ffe4e4] transition-colors select-none"
              >
                ×
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProductList;
