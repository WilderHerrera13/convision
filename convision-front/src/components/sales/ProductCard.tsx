import React, { useState } from 'react';
import { ShoppingCart, Trash2, Minus, Plus } from 'lucide-react';
import type { Lens } from '@/services/lensService';
import type { Discount } from '@/services/discountService';
import { discountService } from '@/services/discountService';
import { formatCurrency } from '@/lib/utils';

interface ProductCardProps {
  product: Lens;
  cartQuantity: number;
  onAddToCart: (product: Lens, qty: number) => void;
  onRemoveFromCart: (productId: number) => void;
  onViewDetail: (product: Lens) => void;
  discount?: Discount | null;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

const GlassIcon = ({ color }: { color: string }) => {
  const [r, g, b] = hexToRgb(color);
  const fill = `rgba(${r},${g},${b},0.18)`;
  const stroke = `rgba(${r},${g},${b},0.5)`;
  const bridge = `rgba(${r},${g},${b},0.5)`;
  const temple = `rgba(${r},${g},${b},0.4)`;

  return (
    <div style={{ position: 'relative', width: '72px', height: '28px' }}>
      <div style={{ position: 'absolute', left: '-10px', top: '13px', width: '10px', height: '2px', background: temple, borderRadius: '1px' }} />
      <div style={{ position: 'absolute', left: 0, top: '3px', width: '30px', height: '22px', background: fill, border: `1.5px solid ${stroke}`, borderRadius: '8px' }} />
      <div style={{ position: 'absolute', left: '30px', top: '12px', width: '12px', height: '3px', background: bridge, borderRadius: '2px' }} />
      <div style={{ position: 'absolute', left: '42px', top: '3px', width: '30px', height: '22px', background: fill, border: `1.5px solid ${stroke}`, borderRadius: '8px' }} />
      <div style={{ position: 'absolute', left: '72px', top: '13px', width: '10px', height: '2px', background: temple, borderRadius: '1px' }} />
    </div>
  );
};

type TypeConfig = {
  gradientFrom: string;
  gradientTo: string;
  iconColor: string;
};

const typeConfigMap: Record<string, TypeConfig> = {
  progresivo: {
    gradientFrom: '#ede8ff',
    gradientTo: '#f5f2ff',
    iconColor: '#8753ef',
  },
  bifocal: {
    gradientFrom: '#e8f6ee',
    gradientTo: '#f2faf5',
    iconColor: '#0f8f64',
  },
  monofocal: {
    gradientFrom: '#fff9ee',
    gradientTo: '#fffdf5',
    iconColor: '#b57218',
  },
  armazon: {
    gradientFrom: '#e8eeff',
    gradientTo: '#f4f6ff',
    iconColor: '#5b8af0',
  },
  marcos: {
    gradientFrom: '#e8eeff',
    gradientTo: '#f4f6ff',
    iconColor: '#5b8af0',
  },
};

const defaultConfig: TypeConfig = {
  gradientFrom: '#ede8ff',
  gradientTo: '#f5f2ff',
  iconColor: '#8753ef',
};

function getTypeConfig(product: Lens): { config: TypeConfig; label: string } {
  const rawName = product.lens_type?.name ?? product.type?.name ?? '';
  const key = rawName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  const config = typeConfigMap[key] ?? defaultConfig;
  return { config, label: rawName };
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  cartQuantity,
  onAddToCart,
  onRemoveFromCart,
  onViewDetail,
  discount,
}) => {
  const [qty, setQty] = useState(1);

  const inCart = cartQuantity > 0;
  const { config, label: typeName } = getTypeConfig(product);
  const [r, g, b] = hexToRgb(config.iconColor);

  const basePrice = parseFloat(product.price?.toString() ?? '0');
  const discountedPrice = discount
    ? discountService.calculateDiscountedPrice(basePrice, discount.discount_percentage)
    : null;

  const promoColor = discount && discount.discount_percentage >= 20 ? '#c0392b' : '#e08a00';

  const handleQtyDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQty((q) => Math.max(1, q - 1));
  };

  const handleQtyUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQty((q) => q + 1);
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product, qty);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemoveFromCart(product.id);
  };

  return (
    <div
      className="w-full bg-white rounded-xl border border-[#e5e5e9] flex flex-col overflow-hidden"
      style={{ boxShadow: '0px 2px 12px 0px rgba(0,0,0,0.06)', minHeight: '368px' }}
    >
      {/* ── Image Zone (116 px, matches Figma node 1172:658) ── */}
      <div
        className="relative flex-shrink-0 overflow-hidden cursor-pointer"
        style={{
          height: '116px',
          background: `linear-gradient(to bottom, ${config.gradientFrom}, ${config.gradientTo})`,
        }}
        onClick={() => onViewDetail(product)}
      >
        {/* Decorative ellipse — top-right bleeds out */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            right: '-16px',
            top: '-20px',
            width: '80px',
            height: '80px',
            background: `radial-gradient(circle, rgba(${r},${g},${b},0.18) 0%, rgba(${r},${g},${b},0.06) 65%, transparent 100%)`,
          }}
        />
        {/* Decorative ellipse — bottom-left bleeds out */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            left: '-16px',
            bottom: '-8px',
            width: '48px',
            height: '48px',
            background: `radial-gradient(circle, rgba(${r},${g},${b},0.15) 0%, rgba(${r},${g},${b},0.05) 65%, transparent 100%)`,
          }}
        />

        {/* Glasses icon — centered */}
        <div className="absolute inset-0 flex items-center justify-center">
          <GlassIcon color={config.iconColor} />
        </div>

        {/* Type badge — top-left, always visible */}
        {typeName && (
          <span
            className="absolute text-[9px] font-semibold"
            style={{
              top: '10px',
              left: '10px',
              background: 'rgba(255,255,255,0.85)',
              color: config.iconColor,
              height: '20px',
              lineHeight: '20px',
              padding: '0 8px',
              borderRadius: '10px',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            {typeName}
          </span>
        )}

        {/* EN CARRITO badge — top-right */}
        {inCart && (
          <div
            className="absolute flex items-center px-2 text-[8px] font-bold rounded-full border"
            style={{
              top: '8px',
              right: '8px',
              height: '22px',
              background: '#e8f6ee',
              borderColor: '#a3dab8',
              color: '#0f8f64',
            }}
          >
            EN CARRITO
          </div>
        )}

        {/* SKU — bottom-right, plain text, no badge */}
        {product.internal_code && (
          <span
            className="absolute bottom-2 right-2 text-[9px] font-semibold font-mono"
            style={{ color: '#b4b5bc' }}
          >
            {product.internal_code}
          </span>
        )}

        {/* Promo circle badge — top-right corner, overflows card */}
        {discount && (
          <div
            className="absolute flex flex-col items-center justify-center leading-tight text-center z-10"
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: promoColor,
              boxShadow: `0px 4px 14px 0px ${promoColor}73`,
              top: '-10px',
              right: '-10px',
            }}
          >
            <span className="text-white font-bold" style={{ fontSize: '7px', opacity: 0.9 }}>HASTA</span>
            <span className="text-white font-bold" style={{ fontSize: '18px', lineHeight: '20px' }}>
              {discount.discount_percentage}%
            </span>
            <span className="text-white font-bold" style={{ fontSize: '8px', opacity: 0.9 }}>OFF</span>
          </div>
        )}

        {/* OFERTA ESPECIAL banner — bottom stripe */}
        {discount && (
          <div
            className="absolute bottom-0 inset-x-0 flex items-center justify-center text-white font-bold"
            style={{ background: promoColor, height: '22px', fontSize: '9px', letterSpacing: '0.05em' }}
          >
            ★ OFERTA ESPECIAL ★
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-[#f0f0f4] flex-shrink-0" />

      {/* Card body */}
      <div className="flex flex-col flex-1 px-3 pt-3 pb-3 gap-1">
        <p
          className="text-[9px] font-semibold uppercase tracking-widest cursor-pointer"
          style={{ color: '#b4b5bc' }}
          onClick={() => onViewDetail(product)}
        >
          {product.brand?.name ?? ''}
        </p>
        <h3
          className="text-[12px] font-semibold leading-[17px] line-clamp-2 cursor-pointer"
          style={{ color: '#0f0f12' }}
          onClick={() => onViewDetail(product)}
        >
          {product.description}
        </h3>

        {(product.material?.name || product.treatment?.name) && (
          <p className="text-[10px]" style={{ color: '#7d7d87' }}>
            {[product.material?.name, product.treatment?.name].filter(Boolean).join(' · ')}
          </p>
        )}

        {(product.sphere_min != null && product.sphere_max != null) && (
          <p className="text-[9px] font-mono" style={{ color: '#b4b5bc' }}>
            Esf {product.sphere_min} / {product.sphere_max}
            {product.cylinder_min != null ? ` · Cil ${product.cylinder_min}` : ''}
          </p>
        )}

        <div className="mt-2">
          {discount && discountedPrice != null ? (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] line-through" style={{ color: '#b4b5bc' }}>
                {formatCurrency(basePrice, 'COP')}
              </span>
              <span className="text-[18px] font-bold" style={{ color: '#0f0f12' }}>
                {formatCurrency(discountedPrice, 'COP')}
              </span>
            </div>
          ) : (
            <span className="text-[18px] font-bold" style={{ color: '#0f0f12' }}>
              {formatCurrency(basePrice, 'COP')}
            </span>
          )}
        </div>

        <div className="flex items-center mt-auto pt-2">
          <div
            className="flex items-center rounded-lg overflow-hidden"
            style={{
              background: inCart ? '#f1edff' : '#f5f5f7',
              border: inCart
                ? '1px solid rgba(135,83,239,0.4)'
                : '1px solid rgba(156,156,168,0.4)',
              width: '96px',
              height: '32px',
              flexShrink: 0,
            }}
          >
            <button
              onClick={handleQtyDown}
              className="flex items-center justify-center"
              style={{
                width: '32px',
                height: '32px',
                background: inCart ? 'rgba(135,83,239,0.08)' : 'rgba(156,156,168,0.08)',
                borderRight: inCart
                  ? '1px solid rgba(135,83,239,0.2)'
                  : '1px solid rgba(156,156,168,0.2)',
                color: inCart ? '#8753ef' : '#9c9ca8',
              }}
            >
              <Minus size={10} />
            </button>
            <span
              className="flex-1 text-center text-[13px] font-semibold"
              style={{ color: inCart ? '#8753ef' : '#9c9ca8' }}
            >
              {qty}
            </span>
            <button
              onClick={handleQtyUp}
              className="flex items-center justify-center"
              style={{
                width: '32px',
                height: '32px',
                background: inCart ? 'rgba(135,83,239,0.08)' : 'rgba(156,156,168,0.08)',
                borderLeft: inCart
                  ? '1px solid rgba(135,83,239,0.2)'
                  : '1px solid rgba(156,156,168,0.2)',
                color: inCart ? '#8753ef' : '#9c9ca8',
              }}
            >
              <Plus size={10} />
            </button>
          </div>
        </div>

        {inCart ? (
          <button
            onClick={handleRemove}
            className="w-full mt-2 flex items-center justify-center gap-1.5 rounded-[6px] text-[12px] font-medium"
            style={{
              background: '#fff0f0',
              border: '1px solid #f5baba',
              color: '#b82626',
              height: '32px',
            }}
          >
            <Trash2 size={12} />
            Quitar del Carrito
          </button>
        ) : (
          <button
            onClick={handleAdd}
            className="w-full mt-2 flex items-center justify-center gap-1.5 rounded-[6px] text-[12px] font-medium"
            style={{
              background: '#f1edff',
              border: '1px solid #8753ef',
              color: '#8753ef',
              height: '32px',
            }}
          >
            <ShoppingCart size={12} />
            Agregar al Carrito
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
