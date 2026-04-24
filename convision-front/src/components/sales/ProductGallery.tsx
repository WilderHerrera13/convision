import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { discountService } from '@/services/discountService';
import type { Lens } from '@/services/lensService';
import type { Discount } from '@/services/discountService';

interface ProductGalleryProps {
  product: Lens | null;
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  onAddToCart: (product: Lens, qty: number) => void;
  cartQuantity: number;
  discount?: Discount | null;
}

interface GalleryImage {
  label: string;
  bgFrom: string;
  bgTo: string;
  borderColor: string;
  lensColor: string;
}

const GALLERY_IMAGES: GalleryImage[] = [
  { label: 'Vista frontal', bgFrom: 'from-[#2a1a4e]', bgTo: 'to-[#1a0f34]', borderColor: 'border-violet-500', lensColor: 'rgba(196,168,248,0.85)' },
  { label: 'Vista lateral', bgFrom: 'from-[#0f1a3a]', bgTo: 'to-[#0a1228]', borderColor: 'border-blue-400', lensColor: 'rgba(138,180,248,0.85)' },
  { label: 'Detalle lente', bgFrom: 'from-[#0a2420]', bgTo: 'to-[#071816]', borderColor: 'border-emerald-400', lensColor: 'rgba(110,200,168,0.85)' },
  { label: 'Ambiente', bgFrom: 'from-[#2a1a08]', bgTo: 'to-[#1a1006]', borderColor: 'border-amber-400', lensColor: 'rgba(244,199,120,0.85)' },
];

const LensIllustration: React.FC<{ color: string; size?: number }> = ({ color, size = 1 }) => (
  <svg width={220 * size} height={110 * size} viewBox="0 0 220 110" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="20" width="80" height="70" rx="20" stroke={color} strokeWidth="3" fill={color.replace('0.85', '0.12')} />
    <rect x="132" y="20" width="80" height="70" rx="20" stroke={color} strokeWidth="3" fill={color.replace('0.85', '0.12')} />
    <line x1="88" y1="55" x2="132" y2="55" stroke={color} strokeWidth="3" />
    <rect x="26" y="30" width="20" height="14" rx="6" fill="rgba(255,255,255,0.18)" />
    <rect x="150" y="30" width="20" height="14" rx="6" fill="rgba(255,255,255,0.18)" />
  </svg>
);

const ThumbLens: React.FC<{ image: GalleryImage; active: boolean; onClick: () => void }> = ({ image, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1 group`}
  >
    <div className={`w-[120px] h-[68px] rounded-lg bg-gradient-to-b ${image.bgFrom} ${image.bgTo} border-2 overflow-hidden flex items-center justify-center transition-all ${active ? image.borderColor : 'border-white/10 opacity-60 hover:opacity-80'}`}>
      <LensIllustration color={image.lensColor} size={0.45} />
    </div>
    <span className={`text-[9px] ${active ? 'text-violet-300 font-semibold' : 'text-slate-500'}`}>
      {image.label}
    </span>
    {active && <div className="h-0.5 w-6 rounded-full bg-violet-500" />}
  </button>
);

const GalleryInfoPanel: React.FC<{
  product: Lens;
  basePrice: number;
  discountedPrice: number | null;
  savings: number;
  inCart: boolean;
  onAddToCart: () => void;
  onBack: () => void;
  onShare: () => void;
  discount?: Discount | null;
}> = ({ product, basePrice, discountedPrice, savings, inCart, onAddToCart, onBack, onShare, discount }) => (
  <div className="w-[280px] shrink-0 bg-[#0d0d1a] border-l border-white/[0.06] flex flex-col overflow-hidden">
    <div className="h-1 w-full bg-gradient-to-r from-violet-600 to-violet-400" />
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
      <div className="bg-violet-600/15 rounded-md h-8 flex items-center justify-center">
        <span className="text-[9px] font-bold text-violet-300 tracking-widest opacity-90">MODO GALERÍA</span>
      </div>

      <div>
        <p className="text-lg font-bold text-white leading-tight">{product.description}</p>
        <p className="text-[10px] font-bold text-slate-400 opacity-70 uppercase tracking-widest mt-0.5">{product.brand?.name ?? ''}</p>
      </div>

      <div className="border-t border-white/[0.07]" />

      <div>
        {discountedPrice != null ? (
          <>
            <p className="text-[11px] text-slate-400 opacity-50 line-through">{formatCurrency(basePrice, 'COP')}</p>
            <p className="text-2xl font-bold text-white leading-none">{formatCurrency(discountedPrice, 'COP')}</p>
            <p className="text-[11px] text-slate-400 opacity-60 mt-0.5">COP</p>
            <div className="mt-2 bg-[#0f4a2a] rounded-md px-2 py-1 inline-block">
              <span className="text-[9px] font-semibold text-green-400">✓ Ahorras {formatCurrency(savings, 'COP')}</span>
            </div>
          </>
        ) : (
          <>
            <p className="text-2xl font-bold text-white leading-none">{formatCurrency(basePrice, 'COP')}</p>
            <p className="text-[11px] text-slate-400 opacity-60 mt-0.5">COP</p>
          </>
        )}
      </div>

      <div className="border-t border-white/[0.07]" />

      <div className="space-y-1">
        {[
          { label: 'Tipo', value: product.type?.name ?? '' },
          { label: 'Material', value: product.material?.name ?? '' },
          { label: 'Tratamiento', value: product.treatment?.name ?? '' },
          { label: 'Garantía', value: '12 meses' },
        ].map((row) => (
          <div key={row.label} className="flex items-center h-7 bg-white/[0.03] rounded px-2">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mr-2 shrink-0" />
            <span className="text-[9px] text-slate-400 opacity-70 flex-1">{row.label}</span>
            <span className="text-[10px] font-semibold text-white opacity-85">{row.value || '—'}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-white/[0.07]" />

      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-400" />
        <span className="text-[10px] text-white opacity-60">En stock</span>
      </div>
    </div>

    <div className="p-4 flex flex-col gap-2 border-t border-white/[0.06]">
      <Button
        onClick={onAddToCart}
        className={`w-full h-11 rounded-[10px] gap-2 shadow-[0px_8px_20px_0px_rgba(135,83,239,0.4)] ${inCart ? 'bg-red-600 hover:bg-red-700' : 'bg-violet-600 hover:bg-violet-700'}`}
      >
        <ShoppingCart size={14} />
        {inCart ? 'Quitar del Carrito' : 'Agregar al Carrito'}
      </Button>
      <button
        onClick={onBack}
        className="w-full h-9 rounded-lg bg-white/[0.06] border border-white/[0.12] text-[11px] text-white opacity-65 hover:opacity-90 transition-opacity"
      >
        ← Volver al detalle
      </button>
      <button
        onClick={onShare}
        className="w-full h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] text-white opacity-40 hover:opacity-60 transition-opacity"
      >
        Compartir galería
      </button>
    </div>
  </div>
);

export const ProductGallery: React.FC<ProductGalleryProps> = ({
  product,
  isOpen,
  onClose,
  onBack,
  onAddToCart,
  cartQuantity,
  discount,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!product) return null;

  const basePrice = parseFloat(product.price?.toString() ?? '0');
  const discountedPrice = discount
    ? discountService.calculateDiscountedPrice(basePrice, discount.discount_percentage)
    : null;
  const savings = discountedPrice != null ? basePrice - discountedPrice : 0;
  const inCart = cartQuantity > 0;

  const handlePrev = () => setCurrentIndex((i) => (i === 0 ? GALLERY_IMAGES.length - 1 : i - 1));
  const handleNext = () => setCurrentIndex((i) => (i === GALLERY_IMAGES.length - 1 ? 0 : i + 1));

  const handleShare = () => {
    const text = `Galería: ${product.brand?.name ?? ''} ${product.description}`;
    if (navigator.share) navigator.share({ title: product.description, text });
    else navigator.clipboard.writeText(text);
  };

  const currentImage = GALLERY_IMAGES[currentIndex];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-screen-2xl w-screen h-screen p-0 m-0 rounded-none border-0 bg-[#0a0a14] overflow-hidden flex flex-col">
        <div className="h-[72px] bg-[#0d0d1c] border-b border-white/[0.08] flex items-center px-6 gap-3 shrink-0">
          <div className="flex items-center gap-1 text-[12px]">
            <span className="text-slate-400">Catálogo de Lentes</span>
            <span className="text-slate-600 mx-1">/</span>
            <span className="text-slate-300">{product.description}</span>
            <span className="text-slate-600 mx-1">/</span>
            <span className="text-white font-semibold">Galería</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="px-4 h-6 rounded-full bg-violet-600/20 border border-violet-300/50 flex items-center">
              <span className="text-[10px] font-semibold text-violet-300">{GALLERY_IMAGES.length} fotos</span>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-[10px] bg-white/10 border border-white/15 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className={`flex-1 relative bg-gradient-to-br ${currentImage.bgFrom} ${currentImage.bgTo} flex items-center justify-center overflow-hidden`}>
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-violet-800 blur-3xl opacity-40" />
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-violet-600 blur-3xl opacity-30" />
              </div>

              <div className="relative z-10">
                <LensIllustration color={currentImage.lensColor} size={1.4} />
              </div>

              <button
                onClick={handlePrev}
                className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl bg-white/[0.08] border border-white/15 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <ChevronLeft size={20} className="text-white" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl bg-white/[0.08] border border-white/15 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <ChevronRight size={20} className="text-white" />
              </button>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/45 rounded-full px-4 h-7 flex items-center">
                <span className="text-[11px] font-semibold text-white">{currentIndex + 1} / {GALLERY_IMAGES.length}</span>
              </div>

              <button
                onClick={() => window.open(`#gallery-${product.id}`, '_blank')}
                className="absolute bottom-4 right-6 bg-black/45 rounded-full px-3 h-7 flex items-center gap-1"
              >
                <span className="text-[10px] font-medium text-white opacity-80">⊕ Ampliar</span>
              </button>

              <div className="absolute bottom-4 left-6 flex gap-1.5">
                {GALLERY_IMAGES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${i === currentIndex ? 'w-8 bg-white' : 'w-4 bg-white/30'}`}
                  />
                ))}
              </div>
            </div>

            <div className="h-[100px] bg-[#0d0d1a] border-t border-white/[0.08] flex items-center justify-center gap-3 px-6 overflow-x-auto">
              {GALLERY_IMAGES.map((img, i) => (
                <ThumbLens
                  key={i}
                  image={img}
                  active={i === currentIndex}
                  onClick={() => setCurrentIndex(i)}
                />
              ))}
            </div>
          </div>

          <GalleryInfoPanel
            product={product}
            basePrice={basePrice}
            discountedPrice={discountedPrice}
            savings={savings}
            inCart={inCart}
            onAddToCart={() => inCart ? undefined : onAddToCart(product, 1)}
            onBack={onBack}
            onShare={handleShare}
            discount={discount}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductGallery;
