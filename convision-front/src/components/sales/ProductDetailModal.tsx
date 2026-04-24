import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ShoppingCart, Minus, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { discountService } from '@/services/discountService';
import type { Lens } from '@/services/lensService';
import type { Discount } from '@/services/discountService';

interface ProductDetailModalProps {
  product: Lens | null;
  isOpen: boolean;
  onClose: () => void;
  cartQuantity: number;
  onAddToCart: (product: Lens, qty: number) => void;
  onRemoveFromCart: (productId: number) => void;
  onOpenGallery: (product: Lens) => void;
  discount?: Discount | null;
}

const LensIconLarge = () => (
  <svg width="160" height="80" viewBox="0 0 160 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="16" width="56" height="48" rx="14" stroke="currentColor" strokeWidth="2.5" fill="rgba(255,255,255,0.08)" opacity="0.85" />
    <rect x="96" y="16" width="56" height="48" rx="14" stroke="currentColor" strokeWidth="2.5" fill="rgba(255,255,255,0.08)" opacity="0.85" />
    <line x1="64" y1="40" x2="96" y2="40" stroke="currentColor" strokeWidth="2.5" />
    <circle cx="30" cy="30" r="4" fill="currentColor" opacity="0.25" />
    <circle cx="118" cy="30" r="4" fill="currentColor" opacity="0.25" />
  </svg>
);

const gradientMap: Record<string, string> = {
  Progresivo: 'from-violet-100 via-violet-200 to-violet-300',
  Bifocal: 'from-amber-100 via-amber-200 to-amber-300',
  Monofocal: 'from-sky-100 via-sky-200 to-sky-300',
};

const iconColorMap: Record<string, string> = {
  Progresivo: 'text-violet-400',
  Bifocal: 'text-amber-400',
  Monofocal: 'text-sky-400',
};

const badgeColorMap: Record<string, string> = {
  Progresivo: 'bg-white/80 text-violet-700',
  Bifocal: 'bg-white/80 text-amber-700',
  Monofocal: 'bg-white/80 text-sky-700',
};

type TabKey = 'descripcion' | 'especificaciones' | 'compatibilidad';

const SpecCard: React.FC<{ label: string; value: string; alt?: boolean }> = ({ label, value, alt }) => (
  <div className={`rounded-lg border border-slate-200 p-3 flex flex-col gap-1 ${alt ? 'bg-slate-50/60' : 'bg-white/60'}`}>
    <div className="flex items-center gap-1.5">
      <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
    </div>
    <span className="text-[12px] font-semibold text-slate-800 pl-3">{value || '—'}</span>
  </div>
);

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  cartQuantity,
  onAddToCart,
  onRemoveFromCart,
  onOpenGallery,
  discount,
}) => {
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<TabKey>('especificaciones');

  if (!product) return null;

  const typeName = product.type?.name ?? '';
  const gradient = gradientMap[typeName] ?? 'from-slate-100 via-slate-200 to-slate-300';
  const iconColor = iconColorMap[typeName] ?? 'text-slate-400';
  const badgeColor = badgeColorMap[typeName] ?? 'bg-white/80 text-slate-600';

  const basePrice = parseFloat(product.price?.toString() ?? '0');
  const discountedPrice = discount
    ? discountService.calculateDiscountedPrice(basePrice, discount.discount_percentage)
    : null;
  const savings = discountedPrice != null ? basePrice - discountedPrice : 0;

  const inCart = cartQuantity > 0;

  const handleShare = () => {
    const text = `${product.brand?.name ?? ''} ${product.description} — ${formatCurrency(discountedPrice ?? basePrice, 'COP')}`;
    if (navigator.share) {
      navigator.share({ title: product.description, text });
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  const specs = [
    { label: 'Tipo de lente', value: product.type?.name ?? '' },
    { label: 'Tratamiento', value: product.treatment?.name ?? '' },
    { label: 'Marca', value: product.brand?.name ?? '' },
    { label: 'Esfera', value: product.sphere_min != null ? `${product.sphere_min} a ${product.sphere_max}` : '' },
    { label: 'Material', value: product.material?.name ?? '' },
    { label: 'Cilindro', value: product.cylinder_min != null ? `${product.cylinder_min} a ${product.cylinder_max}` : '' },
    { label: 'Clase', value: product.lens_class?.name ?? '' },
    { label: 'Fotocromático', value: product.photochromic?.name ?? '' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[860px] h-[624px] p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-[0px_24px_64px_-8px_rgba(0,0,0,0.28)]">
        <div className="flex h-full">
          <VisualPanel
            product={product}
            gradient={gradient}
            iconColor={iconColor}
            badgeColor={badgeColor}
            typeName={typeName}
            discount={discount}
            onOpenGallery={() => onOpenGallery(product)}
          />
          <div className="w-px bg-slate-200 shrink-0" />
          <InfoPanel
            product={product}
            basePrice={basePrice}
            discountedPrice={discountedPrice}
            savings={savings}
            inCart={inCart}
            qty={qty}
            activeTab={activeTab}
            specs={specs}
            onClose={onClose}
            onTabChange={setActiveTab}
            onQtyDown={() => setQty((q) => Math.max(1, q - 1))}
            onQtyUp={() => setQty((q) => q + 1)}
            onAddToCart={() => onAddToCart(product, qty)}
            onRemoveFromCart={() => onRemoveFromCart(product.id)}
            onShare={handleShare}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface VisualPanelProps {
  product: Lens;
  gradient: string;
  iconColor: string;
  badgeColor: string;
  typeName: string;
  discount?: Discount | null;
  onOpenGallery: () => void;
}

const VisualPanel: React.FC<VisualPanelProps> = ({ product, gradient, iconColor, badgeColor, typeName, discount, onOpenGallery }) => (
  <div
    className={`relative w-[340px] shrink-0 bg-gradient-to-b ${gradient} cursor-pointer overflow-hidden flex flex-col`}
    onClick={onOpenGallery}
    title="Ver galería"
  >
    <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-white/20" />
    <div className="absolute bottom-24 right-[-50px] w-48 h-48 rounded-full bg-white/15" />
    <div className="absolute top-24 right-0 w-28 h-28 rounded-full bg-white/10" />
    <div className="absolute top-16 left-16 w-16 h-16 rounded-full bg-white/10" />

    {discount && (
      <div className="absolute top-6 right-6 w-20 h-20 rounded-full bg-amber-500 shadow-[0px_6px_18px_0px_rgba(224,138,0,0.45)] flex flex-col items-center justify-center z-10">
        <span className="text-white text-[8px] font-bold opacity-90">HASTA</span>
        <span className="text-white text-[22px] font-bold leading-none">{discount.discount_percentage}%</span>
        <span className="text-white text-[9px] font-bold opacity-90">OFF</span>
      </div>
    )}

    <div className="flex-1 flex items-center justify-center relative z-0">
      <div className={`${iconColor}`}>
        <LensIconLarge />
      </div>
    </div>

    <div className="px-6 pb-6 flex flex-col gap-2 relative z-10">
      {typeName && (
        <span className={`inline-block self-start px-3 py-1 rounded-full text-[10px] font-semibold ${badgeColor}`}>
          {typeName}
        </span>
      )}
      <p className="text-[10px] font-semibold opacity-60 text-violet-700">REF: {product.internal_code}</p>
      <span className="inline-block self-start px-3 py-1 rounded-full text-[10px] font-medium bg-violet-600/15 text-violet-700">
        ✓ Garantía 12 meses
      </span>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-[10px] font-medium text-violet-700 opacity-75">
          En stock
        </span>
      </div>
    </div>
  </div>
);

interface InfoPanelProps {
  product: Lens;
  basePrice: number;
  discountedPrice: number | null;
  savings: number;
  inCart: boolean;
  qty: number;
  activeTab: TabKey;
  specs: { label: string; value: string }[];
  onClose: () => void;
  onTabChange: (tab: TabKey) => void;
  onQtyDown: () => void;
  onQtyUp: () => void;
  onAddToCart: () => void;
  onRemoveFromCart: () => void;
  onShare: () => void;
}

const InfoPanel: React.FC<InfoPanelProps> = ({
  product, basePrice, discountedPrice, savings, inCart, qty, activeTab, specs,
  onClose, onTabChange, onQtyDown, onQtyUp, onAddToCart, onRemoveFromCart, onShare,
}) => (
  <div className="flex-1 flex flex-col overflow-hidden bg-white">
    <div className="h-[72px] border-b border-slate-200 bg-white flex items-center px-7 gap-2 shrink-0">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{product.brand?.name ?? ''}</p>
        <p className="text-xl font-bold text-slate-900 leading-tight truncate">{product.description}</p>
      </div>
      <button
        onClick={onClose}
        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center shrink-0 transition-colors"
      >
        <X size={14} className="text-slate-500" />
      </button>
    </div>

    <div className="h-[56px] bg-violet-50/50 px-7 flex items-center gap-4 shrink-0">
      {discountedPrice != null ? (
        <>
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 line-through leading-none">{formatCurrency(basePrice, 'COP')}</span>
            <div className="flex items-baseline gap-1">
              <span className="text-[28px] font-bold text-slate-900 leading-none">{formatCurrency(discountedPrice, 'COP')}</span>
              <span className="text-[11px] font-semibold text-slate-400">COP</span>
            </div>
          </div>
          <div className="h-6 px-2 rounded-full bg-green-50 border border-green-200 flex items-center">
            <span className="text-[9px] font-semibold text-green-700">Ahorras {formatCurrency(savings, 'COP')}</span>
          </div>
        </>
      ) : (
        <div className="flex items-baseline gap-1">
          <span className="text-[28px] font-bold text-slate-900 leading-none">{formatCurrency(basePrice, 'COP')}</span>
          <span className="text-[11px] font-semibold text-slate-400">COP</span>
        </div>
      )}
    </div>

    <TabBar activeTab={activeTab} onTabChange={onTabChange} />

    <div className="flex-1 overflow-y-auto px-7 py-5">
      {activeTab === 'descripcion' && (
        <p className="text-sm text-slate-600 leading-relaxed">{product.description || 'Sin descripción disponible.'}</p>
      )}
      {activeTab === 'especificaciones' && (
        <div className="grid grid-cols-2 gap-2">
          {specs.map((s, i) => <SpecCard key={s.label} label={s.label} value={s.value} alt={i % 2 === 0} />)}
        </div>
      )}
      {activeTab === 'compatibilidad' && (
        <div className="space-y-3 text-sm text-slate-600">
          {product.sphere_min != null && (
            <p>Esfera: <span className="font-semibold text-slate-800">{product.sphere_min} a {product.sphere_max}</span></p>
          )}
          {product.cylinder_min != null && (
            <p>Cilindro: <span className="font-semibold text-slate-800">{product.cylinder_min} a {product.cylinder_max}</span></p>
          )}
          {product.addition_min != null && (
            <p>Adición: <span className="font-semibold text-slate-800">{product.addition_min} a {product.addition_max}</span></p>
          )}
        </div>
      )}
    </div>

    <div className="border-t border-slate-200 bg-white px-7 py-4 shrink-0">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Cantidad</span>
        <div className="flex items-center border-[1.5px] border-violet-300 bg-violet-50 rounded-[10px] overflow-hidden h-10">
          <button onClick={onQtyDown} className="w-10 h-10 flex items-center justify-center bg-violet-100/70 hover:bg-violet-200/70 transition-colors">
            <Minus size={12} className="text-violet-700" />
          </button>
          <span className="w-10 text-center text-base font-bold text-violet-700">{qty}</span>
          <button onClick={onQtyUp} className="w-10 h-10 flex items-center justify-center bg-violet-100/70 hover:bg-violet-200/70 transition-colors">
            <Plus size={12} className="text-violet-700" />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-[9px] text-slate-500">disponibles</span>
        </div>
      </div>
      <div className="flex gap-3">
        {inCart ? (
          <Button
            onClick={onRemoveFromCart}
            variant="outline"
            className="w-60 h-11 rounded-[10px] border-red-200 text-red-600 hover:bg-red-50 gap-2"
          >
            <ShoppingCart size={15} />
            Quitar del Carrito
          </Button>
        ) : (
          <Button
            onClick={onAddToCart}
            className="w-60 h-11 rounded-[10px] bg-violet-600 hover:bg-violet-700 text-white shadow-[0px_6px_16px_0px_rgba(135,83,239,0.35)] gap-2"
          >
            <ShoppingCart size={15} />
            Agregar al Carrito
          </Button>
        )}
        <Button
          onClick={onShare}
          variant="outline"
          className="flex-1 h-11 rounded-[10px] border-slate-200 text-slate-500 hover:bg-slate-50"
        >
          Compartir ficha
        </Button>
      </div>
    </div>
  </div>
);

interface TabBarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'descripcion', label: 'Descripción' },
    { key: 'especificaciones', label: 'Especificaciones' },
    { key: 'compatibilidad', label: 'Compatibilidad' },
  ];
  return (
    <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
      {tabs.map((tab, i) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`relative flex-1 h-10 text-[12px] font-medium transition-colors ${
            activeTab === tab.key
              ? 'bg-white text-violet-600 font-semibold'
              : 'text-slate-400 hover:text-slate-600'
          } ${i < tabs.length - 1 ? 'border-r border-slate-200' : ''}`}
        >
          {tab.label}
          {activeTab === tab.key && (
            <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-violet-600 rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
};

export default ProductDetailModal;
