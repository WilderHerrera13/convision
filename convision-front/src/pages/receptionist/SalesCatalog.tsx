import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Building2,
  ShoppingCart,
  Minus,
  Plus,
  Share2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { lensService } from '@/services/lensService';
import { formatCurrency } from '@/lib/utils';
import { discountService } from '@/services/discountService';
import { SessionLensPriceAdjustmentModal } from '@/components/sales/SessionLensPriceAdjustmentModal';
import { sessionPriceAdjustmentService } from '@/services/sessionPriceAdjustmentService';
import type { Lens, FilterOption, LensSearchParams } from '@/services/lensService';

interface LensWithDiscount extends Lens {
  discount_percentage?: number;
}

interface SaleData {
  appointmentId?: number;
  patientId?: number;
  patientName?: string;
  selectedLenses?: Lens[];
}

const formatPrice = (price: string | number) => formatCurrency(price, 'COP');

function getCardTheme(lens: LensWithDiscount) {
  const t = lens.type?.name?.toLowerCase() ?? '';
  if (t.includes('bifocal')) {
    return {
      from: '#ebf5ef',
      to: '#f0f8f3',
      fill: 'rgba(34,139,82,0.14)',
      stroke: 'rgba(34,139,82,0.48)',
      badge: 'bg-[rgba(34,139,82,0.12)] text-[#228b52]',
    };
  }
  if (
    t.includes('armazón') ||
    t.includes('armazon') ||
    t.includes('monturas') ||
    t.includes('frame') ||
    t.includes('marco')
  ) {
    return {
      from: '#e8eeff',
      to: '#f4f6ff',
      fill: 'rgba(91,138,240,0.14)',
      stroke: 'rgba(91,138,240,0.48)',
      badge: 'bg-[rgba(91,138,240,0.12)] text-[#5b8af0]',
    };
  }
  if (lens.has_discounts) {
    return {
      from: '#fff6e3',
      to: '#fff8ed',
      fill: 'rgba(181,114,24,0.14)',
      stroke: 'rgba(181,114,24,0.44)',
      badge: 'bg-[rgba(181,114,24,0.12)] text-[#b57218]',
    };
  }
  return {
    from: '#ede8ff',
    to: '#f5f2ff',
    fill: 'rgba(135,83,239,0.14)',
    stroke: 'rgba(135,83,239,0.48)',
    badge: 'bg-[rgba(135,83,239,0.12)] text-[#8753ef]',
  };
}

function LensIllustration({
  fill,
  stroke,
  isFrame = false,
}: {
  fill: string;
  stroke: string;
  isFrame?: boolean;
}) {
  if (isFrame) {
    return (
      <svg viewBox="0 0 88 44" className="w-[88px] h-[44px]" fill="none">
        <ellipse cx="22" cy="22" rx="16" ry="14" stroke={stroke} strokeWidth="1.8" fill={fill} />
        <ellipse cx="66" cy="22" rx="16" ry="14" stroke={stroke} strokeWidth="1.8" fill={fill} />
        <rect x="38" y="20.5" width="12" height="3" rx="1.5" fill={stroke} />
        <rect x="0" y="20.5" width="6" height="2.5" rx="1.2" fill={stroke} />
        <rect x="82" y="20.5" width="6" height="2.5" rx="1.2" fill={stroke} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 88 40" className="w-[88px] h-[40px]" fill="none">
      <rect x="4" y="5" width="34" height="24" rx="7" stroke={stroke} strokeWidth="1.8" fill={fill} />
      <rect x="50" y="5" width="34" height="24" rx="7" stroke={stroke} strokeWidth="1.8" fill={fill} />
      <rect x="38" y="15.5" width="12" height="3" rx="1.5" fill={stroke} />
      <rect x="0" y="15.5" width="4" height="2.5" rx="1.2" fill={stroke} />
      <rect x="84" y="15.5" width="4" height="2.5" rx="1.2" fill={stroke} />
    </svg>
  );
}

interface LensCardProps {
  lens: LensWithDiscount;
  inCart: boolean;
  qty: number;
  onQtyChange: (id: number, qty: number) => void;
  onAdd: (lens: LensWithDiscount) => void;
  onRemove: (id: number) => void;
  onClick: (lens: LensWithDiscount) => void;
}

function LensCard({ lens, inCart, qty, onQtyChange, onAdd, onRemove, onClick }: LensCardProps) {
  const theme = getCardTheme(lens);
  const typeName = lens.type?.name ?? '';
  const isFrame =
    typeName.toLowerCase().includes('armazón') ||
    typeName.toLowerCase().includes('armazon') ||
    typeName.toLowerCase().includes('monturas') ||
    typeName.toLowerCase().includes('marco');

  const sphereRange =
    lens.sphere_min && lens.sphere_max
      ? `${Number(lens.sphere_min).toFixed(2)} a ${Number(lens.sphere_max).toFixed(2)}`
      : null;
  const cylRange =
    lens.cylinder_min && lens.cylinder_max
      ? `${Number(lens.cylinder_min).toFixed(2)} a ${Number(lens.cylinder_max).toFixed(2)}`
      : null;

  const discPct = lens.discount_percentage ?? 0;
  const basePrice = parseFloat(lens.price?.toString() ?? '0');
  const finalPrice =
    discPct > 0 ? discountService.calculateDiscountedPrice(basePrice, discPct) : basePrice;

  return (
    <div
      className="bg-white rounded-[8px] overflow-hidden flex flex-col hover:shadow-md transition-shadow duration-200 cursor-pointer"
      style={{
        border: inCart ? '1px solid rgba(135,83,239,0.4)' : '1px solid #e5e5e9',
      }}
    >
      {/* Image area */}
      <div
        className="relative flex flex-col items-center justify-center overflow-hidden"
        style={{
          background: `linear-gradient(160deg, ${theme.from}, ${theme.to})`,
          minHeight: 164,
        }}
        onClick={() => onClick(lens)}
      >
        <div
          className="absolute top-3 left-3 opacity-20 w-20 h-20 rounded-full"
          style={{ background: theme.stroke }}
        />
        <div
          className="absolute bottom-6 right-2 opacity-10 w-14 h-14 rounded-full"
          style={{ background: theme.stroke }}
        />

        <div className="relative z-10 flex flex-col items-center gap-2 py-6">
          <LensIllustration fill={theme.fill} stroke={theme.stroke} isFrame={isFrame} />
          {typeName && (
            <span className={`text-[8px] font-semibold px-[6px] py-[2px] rounded-[3px] ${theme.badge}`}>
              {typeName}
            </span>
          )}
        </div>

        {/* Top-right badge: EN CARRITO > discount circle > code */}
        {inCart ? (
          <span className="absolute top-2 right-2 bg-[#228b52] text-white text-[8px] font-bold px-[6px] py-[2px] rounded-[3px] tracking-[0.3px] z-10">
            EN CARRITO
          </span>
        ) : discPct > 0 ? (
          <div
            className="absolute top-2 right-2 flex flex-col items-center justify-center rounded-full text-white font-bold shadow-sm z-10"
            style={{ background: '#e87c2e', width: 48, height: 48 }}
          >
            <span className="text-[7px] leading-none">HASTA</span>
            <span className="text-[14px] leading-tight">{discPct}%</span>
            <span className="text-[7px] leading-none">OFF</span>
          </div>
        ) : (
          <span className="absolute top-2 right-2 text-[9px] font-medium text-[#b4b5bc] z-10">
            {lens.internal_code}
          </span>
        )}

        {/* OFERTA ESPECIAL banner */}
        {lens.has_discounts && (
          <div
            className="absolute bottom-0 inset-x-0 py-1 text-center text-[8px] font-semibold tracking-[0.4px] text-white"
            style={{ background: '#e87c2e' }}
          >
            ★ OFERTA ESPECIAL ★
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1" onClick={() => onClick(lens)}>
        <p className="text-[9px] font-semibold tracking-[0.6px] text-[#b4b5bc] uppercase leading-none mb-[5px]">
          {lens.brand?.name}
        </p>
        <p className="text-[13px] font-semibold text-[#121215] leading-tight mb-[6px] line-clamp-2">
          {lens.description}
        </p>

        <div className="flex flex-wrap gap-[4px] mb-[5px]">
          {lens.material?.name && (
            <span className="bg-[#f5f5f6] border border-[#dcdce0] rounded-[3px] text-[10px] text-[#7d7d87] px-[5px] py-[1px]">
              {lens.material.name}
            </span>
          )}
          {lens.treatment?.name && (
            <span className="bg-[#f5f5f6] border border-[#dcdce0] rounded-[3px] text-[10px] text-[#7d7d87] px-[5px] py-[1px]">
              {lens.treatment.name}
            </span>
          )}
        </div>

        {(sphereRange || cylRange) && (
          <p className="text-[10px] text-[#b4b5bc] leading-snug mb-[8px]">
            {sphereRange && `Esf. ${sphereRange}`}
            {sphereRange && cylRange && ' · '}
            {cylRange && `Cil. ${cylRange}`}
          </p>
        )}

        <div className="mt-auto">
          {discPct > 0 && (
            <p className="text-[10px] text-[#b4b5bc] line-through leading-none mb-[2px]">
              {formatPrice(basePrice)}
            </p>
          )}
          <div className="flex items-baseline gap-[4px] mb-[10px]">
            <span className="text-[18px] font-bold text-[#121215] leading-none">
              {formatPrice(finalPrice)}
            </span>
            <span className="text-[10px] font-semibold text-[#7d7d87]">COP</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-3 pb-3 flex flex-col gap-[6px]">
        <div
          className="flex items-center rounded-[6px] overflow-hidden self-start"
          style={{
            border: `1px solid ${inCart ? 'rgba(135,83,239,0.35)' : '#dcdce0'}`,
            height: 28,
            width: 80,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => onQtyChange(lens.id, Math.max(1, qty - 1))}
            className="w-[26px] h-full flex items-center justify-center text-[#7d7d87] hover:bg-[#f5f5f6] transition-colors"
          >
            <Minus className="w-2.5 h-2.5" />
          </button>
          <div className="w-px h-full bg-[#dcdce0]" />
          <span
            className="flex-1 text-center text-[12px] font-semibold"
            style={{ color: inCart ? '#8753ef' : '#121215' }}
          >
            {qty}
          </span>
          <div className="w-px h-full bg-[#dcdce0]" />
          <button
            type="button"
            onClick={() => onQtyChange(lens.id, qty + 1)}
            className="w-[26px] h-full flex items-center justify-center hover:bg-[#f5f5f6] transition-colors"
            style={{ color: inCart ? '#8753ef' : '#7d7d87' }}
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
        </div>

        {inCart ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(lens.id);
            }}
            className="w-full h-[34px] rounded-[6px] text-[11px] font-semibold flex items-center justify-center gap-[5px] transition-colors"
            style={{
              background: '#ffeeed',
              border: '1px solid rgba(184,38,38,0.25)',
              color: '#b82626',
            }}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Quitar del Carrito
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAdd(lens);
            }}
            className="w-full h-[34px] rounded-[6px] text-[11px] font-semibold flex items-center justify-center gap-[5px] transition-colors hover:bg-[#f1edff]"
            style={{
              background: 'white',
              border: '1px solid rgba(135,83,239,0.35)',
              color: '#8753ef',
            }}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Agregar al Carrito
          </button>
        )}
      </div>
    </div>
  );
}

const SalesCatalog: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [lenses, setLenses] = useState<LensWithDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [saleData, setSaleData] = useState<SaleData | null>(null);
  const [selectedLenses, setSelectedLenses] = useState<Lens[]>([]);
  const [localQuantities, setLocalQuantities] = useState<Record<number, number>>({});

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedLensForDetails, setSelectedLensForDetails] = useState<LensWithDiscount | null>(null);
  const [detailTab, setDetailTab] = useState('especificaciones');
  const [discountPercentage, setDiscountPercentage] = useState(0);

  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  const [priceAdjustmentModalOpen, setPriceAdjustmentModalOpen] = useState(false);
  const [selectedLensForPriceAdjustment, setSelectedLensForPriceAdjustment] = useState<Lens | null>(null);

  const [selectedBrand, setSelectedBrand] = useState<FilterOption | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<FilterOption | null>(null);
  const [selectedLensClass, setSelectedLensClass] = useState<FilterOption | null>(null);
  const [selectedTreatment, setSelectedTreatment] = useState<FilterOption | null>(null);
  const [selectedType, setSelectedType] = useState<FilterOption | null>(null);

  const [brands, setBrands] = useState<FilterOption[]>([]);
  const [materials, setMaterials] = useState<FilterOption[]>([]);
  const [lensClasses, setLensClasses] = useState<FilterOption[]>([]);
  const [treatments, setTreatments] = useState<FilterOption[]>([]);
  const [types] = useState<FilterOption[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(false);

  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const data = sessionStorage.getItem('pendingSale');
    if (data) {
      const parsed = JSON.parse(data);
      setSaleData(parsed);
      if (parsed.selectedLenses) setSelectedLenses(parsed.selectedLenses);
    }
    loadFilterOptions();
    return () => {
      if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
    };
  }, []);

  const loadFilterOptions = async () => {
    try {
      setFiltersLoading(true);
      const options = await lensService.getFilterOptions();
      setBrands(Array.isArray(options.brands) ? options.brands : []);
      setMaterials(Array.isArray(options.materials) ? options.materials : []);
      setLensClasses(Array.isArray(options.lensClasses) ? options.lensClasses : []);
      setTreatments(Array.isArray(options.treatments) ? options.treatments : []);
    } catch {
      setBrands([]);
      setMaterials([]);
      setLensClasses([]);
      setTreatments([]);
    } finally {
      setFiltersLoading(false);
    }
  };

  const loadLenses = useCallback(async () => {
    try {
      setLoading(true);
      setSearchLoading(false);
      const params: LensSearchParams = {
        page: currentPage,
        perPage: 12,
        query: searchQuery,
      };
      if (selectedBrand) params.brandId = selectedBrand.id;
      if (selectedMaterial) params.materialId = selectedMaterial.id;
      if (selectedLensClass) params.lensClassId = selectedLensClass.id;
      if (selectedTreatment) params.treatmentId = selectedTreatment.id;

      const response = await lensService.searchLenses(params);
      const withDiscount = await Promise.all(
        response.data.map(async (lens) => {
          if (lens.has_discounts) {
            try {
              const best = await discountService.getBestDiscount(lens.id);
              return { ...lens, discount_percentage: best?.discount_percentage ?? 0 };
            } catch {
              return { ...lens, discount_percentage: 0 };
            }
          }
          return lens;
        })
      );
      setLenses(withDiscount);
      setTotalPages(response.last_page);
    } catch {
      setLenses([]);
      setTotalPages(1);
      toast({
        variant: 'destructive',
        title: 'Error al cargar lentes',
        description: 'No se pudieron cargar los lentes.',
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, selectedBrand, selectedMaterial, selectedLensClass, selectedTreatment]);

  useEffect(() => {
    loadLenses();
  }, [loadLenses]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setSearchQuery(v);
    setSearchLoading(v.trim().length > 0);
    if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
    searchDebounceTimer.current = setTimeout(() => {
      setCurrentPage(1);
    }, 500);
  };

  const addToCart = (lens: Lens) => {
    if (selectedLenses.some((l) => l.id === lens.id)) {
      toast({ title: 'Este lente ya está en el carrito', variant: 'destructive' });
      return;
    }
    const updated = [...selectedLenses, lens];
    setSelectedLenses(updated);
    updateSession(updated);
    toast({ title: 'Lente agregado al carrito' });
  };

  const removeFromCart = (id: number) => {
    const updated = selectedLenses.filter((l) => l.id !== id);
    setSelectedLenses(updated);
    updateSession(updated);
  };

  const clearCart = () => {
    setSelectedLenses([]);
    updateSession([]);
    toast({ title: 'Carrito vaciado' });
  };

  const updateSession = (lenses: Lens[]) => {
    if (saleData) {
      const updated = { ...saleData, selectedLenses: lenses };
      sessionStorage.setItem('pendingSale', JSON.stringify(updated));
      setSaleData(updated);
    }
  };

  const isLensInCart = (id: number) => selectedLenses.some((l) => l.id === id);
  const getQty = (id: number) => localQuantities[id] ?? 1;
  const setQty = (id: number, qty: number) => {
    if (qty < 1) return;
    setLocalQuantities((prev) => ({ ...prev, [id]: qty }));
  };

  const handleCompleteSale = () => {
    if (selectedLenses.length === 0 || !saleData) {
      toast({
        title: 'Sin lentes seleccionados',
        description: 'Debe seleccionar al menos un lente.',
        variant: 'destructive',
      });
      return;
    }
    sessionStorage.setItem('pendingSale', JSON.stringify({ ...saleData, selectedLenses }));
    toast({ title: 'Lentes seleccionados', description: `${selectedLenses.length} lente(s) seleccionados`, duration: 2000 });
    navigate('/receptionist/sales/new');
  };

  const handleOpenDetails = async (lens: LensWithDiscount) => {
    setSelectedLensForDetails(lens);
    setDetailsOpen(true);
    setDetailTab('especificaciones');
    if (lens.has_discounts) {
      try {
        const best = await discountService.getBestDiscount(lens.id);
        setDiscountPercentage(best?.discount_percentage ?? 0);
      } catch {
        setDiscountPercentage(0);
      }
    } else {
      setDiscountPercentage(0);
    }
  };

  const resetFilters = () => {
    setSelectedBrand(null);
    setSelectedMaterial(null);
    setSelectedLensClass(null);
    setSelectedTreatment(null);
    setSelectedType(null);
    setSearchQuery('');
    setCurrentPage(1);
    setFilterDrawerOpen(false);
  };

  const cartTotal = selectedLenses.reduce(
    (acc, l) => acc + parseFloat(l.price?.toString() ?? '0'),
    0
  );

  const branchName =
    (user as unknown as { branch?: { name?: string } })?.branch?.name ??
    (user as unknown as { branch_name?: string })?.branch_name ??
    'Sede Principal';

  const filterGroups = [
    {
      label: 'Tipo',
      value: selectedType?.id.toString() ?? 'all',
      options: types,
      set: (v: string) => setSelectedType(types.find((x) => x.id.toString() === v) ?? null),
    },
    {
      label: 'Marca',
      value: selectedBrand?.id.toString() ?? 'all',
      options: brands,
      set: (v: string) => setSelectedBrand(brands.find((x) => x.id.toString() === v) ?? null),
    },
    {
      label: 'Material',
      value: selectedMaterial?.id.toString() ?? 'all',
      options: materials,
      set: (v: string) => setSelectedMaterial(materials.find((x) => x.id.toString() === v) ?? null),
    },
    {
      label: 'Clase',
      value: selectedLensClass?.id.toString() ?? 'all',
      options: lensClasses,
      set: (v: string) => setSelectedLensClass(lensClasses.find((x) => x.id.toString() === v) ?? null),
    },
    {
      label: 'Tratamiento',
      value: selectedTreatment?.id.toString() ?? 'all',
      options: treatments,
      set: (v: string) => setSelectedTreatment(treatments.find((x) => x.id.toString() === v) ?? null),
    },
  ];

  return (
    <div className="flex flex-col h-screen bg-[#f5f5f6] overflow-hidden">
      {/* ── Topbar ── */}
      <div className="bg-white border-b border-[#e5e5e9] h-[60px] flex items-center px-6 shrink-0 gap-6">
        <div className="flex flex-col gap-[2px] min-w-0">
          <span className="text-[11px] text-[#7d7d87] leading-none truncate">
            Ventas / Nueva Venta ·{' '}
            <span className="text-[#0f0f12]">Catálogo de Lentes</span>
          </span>
          <span className="text-[17px] font-semibold text-[#0f0f12] leading-none">
            Catálogo de Lentes
          </span>
        </div>

        {saleData?.patientName && (
          <span className="text-[13px] text-[#7d7d87] shrink-0">
            Cliente:{' '}
            <span className="font-semibold text-[#0f0f12]">{saleData.patientName}</span>
          </span>
        )}

        <div className="ml-auto flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-[6px] h-[36px] px-3 border border-[#e5e5e9] rounded-[6px] bg-[#f7f7f8]">
            <Building2 className="w-3.5 h-3.5 text-[#7d7d87]" />
            <span className="text-[12px] text-[#0f0f12] font-medium">{branchName}</span>
          </div>
          {selectedLenses.length > 0 && (
            <button
              type="button"
              onClick={handleCompleteSale}
              className="h-[36px] px-4 rounded-[6px] bg-[#8753ef] text-white text-[13px] font-semibold hover:bg-[#7340d4] transition-colors flex items-center gap-2"
            >
              Continuar Venta
              <span className="bg-white text-[#8753ef] text-[10px] font-bold w-[18px] h-[18px] rounded-full flex items-center justify-center">
                {selectedLenses.length}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ── Body: catalog + cart ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: catalog ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search + filter bar */}
          <div className="bg-white border-b border-[#e5e5e9] px-6 py-3 flex items-center gap-3 shrink-0">
            <div className="relative flex-1 max-w-[480px]">
              {searchLoading ? (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8753ef] animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#b4b5bc]" />
              )}
              <Input
                placeholder="Buscar por descripción..."
                className="pl-9 h-[36px] text-[13px] border-[#e5e5e9] bg-white focus-visible:ring-[#8753ef] focus-visible:ring-1"
                value={searchQuery}
                onChange={handleSearchInputChange}
              />
            </div>

            <Drawer open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
              <DrawerTrigger asChild>
                <button
                  type="button"
                  className="h-[36px] px-4 border border-[#e5e5e9] rounded-[6px] text-[13px] font-medium text-[#0f0f12] flex items-center gap-2 hover:bg-[#f5f5f6] transition-colors bg-white"
                >
                  <Filter className="w-4 h-4 text-[#7d7d87]" />
                  Filtros
                </button>
              </DrawerTrigger>
              <DrawerContent className="p-6 max-h-[85vh] overflow-y-auto">
                <DrawerHeader className="flex justify-between items-center mb-2">
                  <DrawerTitle className="text-[16px] font-semibold">Filtros de búsqueda</DrawerTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={resetFilters}>
                      Limpiar
                    </Button>
                    <DrawerClose asChild>
                      <Button variant="ghost" size="sm">Cancelar</Button>
                    </DrawerClose>
                  </div>
                </DrawerHeader>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 py-4">
                  {filterGroups.map(({ label, value, options, set }) => (
                    <div key={label} className="space-y-1.5">
                      <label className="text-[12px] font-medium text-[#0f0f12]">{label}</label>
                      <Select value={value} onValueChange={set} disabled={filtersLoading}>
                        <SelectTrigger className="h-[34px] text-[12px]">
                          <SelectValue
                            placeholder={filtersLoading ? 'Cargando...' : `Seleccionar ${label.toLowerCase()}`}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {options.map((o) => (
                            <SelectItem key={o.id} value={o.id.toString()}>
                              {o.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                <DrawerFooter className="flex flex-row justify-end gap-2 pt-4 border-t">
                  <Button
                    onClick={() => {
                      setCurrentPage(1);
                      setFilterDrawerOpen(false);
                    }}
                    className="bg-[#8753ef] hover:bg-[#7340d4]"
                  >
                    Aplicar filtros
                  </Button>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>

          {/* Category pill */}
          <div className="px-6 pt-4 pb-2 shrink-0">
            <span className="inline-flex items-center px-3 py-[5px] rounded-[6px] bg-[#f1edff] text-[#8753ef] text-[12px] font-semibold">
              Catálogo de Lentes
            </span>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-10 h-10 border-[3px] border-t-[#8753ef] border-[#e5e5e9] rounded-full animate-spin" />
                <p className="text-[13px] text-[#7d7d87]">Cargando catálogo...</p>
              </div>
            ) : lenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <p className="text-[14px] font-semibold text-[#0f0f12]">No se encontraron lentes</p>
                <p className="text-[12px] text-[#7d7d87]">Ajusta los filtros de búsqueda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {lenses.map((lens) => (
                  <LensCard
                    key={lens.id}
                    lens={lens}
                    inCart={isLensInCart(lens.id)}
                    qty={getQty(lens.id)}
                    onQtyChange={setQty}
                    onAdd={addToCart}
                    onRemove={removeFromCart}
                    onClick={handleOpenDetails}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {!loading && lenses.length > 0 && (
              <div className="flex items-center justify-center gap-1 mt-6">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center border border-[#e5e5e9] rounded-[6px] text-[#7d7d87] hover:bg-[#f5f5f6] disabled:opacity-40 transition-colors bg-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p = i + 1;
                  if (totalPages > 5) {
                    if (currentPage <= 3) p = i + 1;
                    else if (currentPage >= totalPages - 2) p = totalPages - 4 + i;
                    else p = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className="w-8 h-8 flex items-center justify-center border rounded-[6px] text-[12px] font-medium transition-colors"
                      style={{
                        background: currentPage === p ? '#8753ef' : 'white',
                        color: currentPage === p ? 'white' : '#0f0f12',
                        borderColor: currentPage === p ? '#8753ef' : '#e5e5e9',
                      }}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 flex items-center justify-center border border-[#e5e5e9] rounded-[6px] text-[#7d7d87] hover:bg-[#f5f5f6] disabled:opacity-40 transition-colors bg-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: cart sidebar ── */}
        <div className="w-[220px] bg-white border-l border-[#e5e5e9] flex flex-col shrink-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e5e9]">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-[#0f0f12]">Carrito de Venta</span>
              {selectedLenses.length > 0 && (
                <span className="bg-[#8753ef] text-white text-[10px] font-bold w-[18px] h-[18px] rounded-full flex items-center justify-center">
                  {selectedLenses.length}
                </span>
              )}
            </div>
            {selectedLenses.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-[#b4b5bc] hover:text-[#7d7d87] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2">
            {selectedLenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <ShoppingCart className="w-8 h-8 text-[#dcdce0]" />
                <p className="text-[11px] text-[#b4b5bc] text-center">El carrito está vacío</p>
              </div>
            ) : (
              <div>
                {selectedLenses.map((lens, idx) => {
                  const theme = getCardTheme(lens);
                  const isFrame =
                    lens.type?.name?.toLowerCase().includes('armazón') ||
                    lens.type?.name?.toLowerCase().includes('armazon') ||
                    lens.type?.name?.toLowerCase().includes('marco') ||
                    false;
                  return (
                    <div
                      key={lens.id}
                      className={`flex items-start gap-2 py-2.5 ${
                        idx < selectedLenses.length - 1 ? 'border-b border-[#f0f0f2]' : ''
                      }`}
                    >
                      <div
                        className="w-[46px] h-[34px] rounded-[4px] shrink-0 flex items-center justify-center overflow-hidden"
                        style={{ background: `linear-gradient(160deg, ${theme.from}, ${theme.to})` }}
                      >
                        <LensIllustration
                          fill={theme.fill}
                          stroke={theme.stroke}
                          isFrame={isFrame}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-[#0f0f12] leading-tight truncate">
                          {lens.description}
                        </p>
                        <p className="text-[9px] text-[#7d7d87] leading-tight mt-[2px] truncate">
                          {lens.brand?.name}
                          {lens.type?.name ? ` · ${lens.type.name}` : ''}
                        </p>
                        <p className="text-[11px] font-semibold text-[#0f0f12] mt-[3px]">
                          {formatPrice(lens.price)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(lens.id)}
                        className="text-[#b4b5bc] hover:text-[#b82626] transition-colors shrink-0 mt-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {selectedLenses.length > 0 && (
            <div className="px-4 pb-4 pt-3 border-t border-[#e5e5e9] space-y-3 shrink-0">
              <div>
                <p className="text-[10px] text-[#7d7d87] mb-[2px]">Total a pagar</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-[16px] font-bold text-[#0f0f12]">
                    {formatPrice(cartTotal)}
                  </span>
                  <span className="text-[10px] text-[#7d7d87] font-medium">COP</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCompleteSale}
                className="w-full h-[38px] rounded-[6px] bg-[#8753ef] text-white text-[12px] font-semibold hover:bg-[#7340d4] transition-colors"
              >
                Continuar Venta →
              </button>
              <button
                type="button"
                onClick={clearCart}
                className="w-full h-[34px] rounded-[6px] border border-[#e5e5e9] text-[#0f0f12] text-[12px] font-medium hover:bg-[#f5f5f6] transition-colors"
              >
                Vaciar Carrito
              </button>
              <p className="text-[10px] text-[#b4b5bc] text-center leading-snug">
                Transacción segura · Solo efectivo y tarjeta
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Product detail modal ── */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-[860px] p-0 gap-0 overflow-hidden rounded-[12px]">
          {selectedLensForDetails &&
            (() => {
              const lens = selectedLensForDetails;
              const theme = getCardTheme(lens);
              const isFrame =
                lens.type?.name?.toLowerCase().includes('armazón') ||
                lens.type?.name?.toLowerCase().includes('armazon') ||
                lens.type?.name?.toLowerCase().includes('marco') ||
                false;

              const basePrice = parseFloat(lens.price?.toString() ?? '0');
              const pct =
                discountPercentage || (lens as LensWithDiscount).discount_percentage || 0;
              const finalPrice =
                pct > 0
                  ? discountService.calculateDiscountedPrice(basePrice, pct)
                  : basePrice;
              const savings = basePrice - finalPrice;

              const sphereRange =
                lens.sphere_min && lens.sphere_max
                  ? `${Number(lens.sphere_min).toFixed(2)} a ${Number(lens.sphere_max).toFixed(2)}`
                  : null;
              const cylRange =
                lens.cylinder_min && lens.cylinder_max
                  ? `${Number(lens.cylinder_min).toFixed(2)} a ${Number(lens.cylinder_max).toFixed(2)}`
                  : null;
              const addRange =
                lens.addition_min && lens.addition_max
                  ? `${Number(lens.addition_min).toFixed(2)} a ${Number(lens.addition_max).toFixed(2)}`
                  : null;

              const specs = [
                { label: 'Tipo de lente', value: lens.type?.name },
                { label: 'Tratamiento', value: lens.treatment?.name },
                { label: 'Marca', value: lens.brand?.name },
                { label: 'Esfera', value: sphereRange },
                { label: 'Material', value: lens.material?.name },
                { label: 'Cilindro', value: cylRange },
                { label: 'Diámetro', value: lens.diameter ? `${lens.diameter.toFixed(1)} mm` : null },
                { label: 'Clase', value: lens.lens_class?.name },
                ...(addRange ? [{ label: 'Adición', value: addRange }] : []),
                ...(lens.supplier?.name ? [{ label: 'Proveedor', value: lens.supplier.name }] : []),
              ].filter((s) => s.value);

              return (
                <div className="flex" style={{ minHeight: 460 }}>
                  {/* Left panel */}
                  <div
                    className="w-[320px] shrink-0 flex flex-col items-center justify-center relative overflow-hidden p-8"
                    style={{
                      background: `linear-gradient(160deg, ${theme.from}, ${theme.to})`,
                    }}
                  >
                    <div
                      className="absolute top-4 left-4 opacity-20 w-28 h-28 rounded-full"
                      style={{ background: theme.stroke }}
                    />
                    <div
                      className="absolute bottom-8 right-4 opacity-10 w-20 h-20 rounded-full"
                      style={{ background: theme.stroke }}
                    />

                    {pct > 0 && (
                      <div
                        className="absolute top-4 right-4 flex flex-col items-center justify-center rounded-full text-white font-bold shadow-md z-10"
                        style={{ background: '#e87c2e', width: 58, height: 58 }}
                      >
                        <span className="text-[8px] leading-none">HASTA</span>
                        <span className="text-[17px] leading-tight">{pct}%</span>
                        <span className="text-[8px] leading-none">OFF</span>
                      </div>
                    )}

                    <div className="relative z-10 flex items-center justify-center mb-4 w-[160px] h-[120px]">
                      <LensIllustration
                        fill={theme.fill}
                        stroke={theme.stroke}
                        isFrame={isFrame}
                      />
                    </div>

                    <div className="relative z-10 flex flex-col items-center gap-2 mt-2">
                      {lens.type?.name && (
                        <span className={`text-[10px] font-semibold px-3 py-1 rounded-[4px] ${theme.badge}`}>
                          {lens.type.name}
                        </span>
                      )}
                      {lens.internal_code && (
                        <span className="text-[11px] text-[#7d7d87]">REF: {lens.internal_code}</span>
                      )}
                      <div className="flex items-center gap-[5px] text-[10px] text-[#228b52] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#228b52] inline-block" />
                        En stock
                      </div>
                    </div>
                  </div>

                  {/* Right panel */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-start justify-between p-5 pb-3">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-[10px] font-semibold tracking-[0.6px] text-[#b4b5bc] uppercase mb-[4px]">
                          {lens.brand?.name}
                        </p>
                        <h2 className="text-[20px] font-bold text-[#0f0f12] leading-tight">
                          {lens.description}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDetailsOpen(false)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[#7d7d87] hover:bg-[#f5f5f6] transition-colors shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="px-5 mb-3">
                      {pct > 0 && (
                        <p className="text-[12px] text-[#b4b5bc] line-through leading-none mb-[3px]">
                          {formatPrice(basePrice)} COP
                        </p>
                      )}
                      <div className="flex items-baseline gap-2">
                        <span className="text-[26px] font-bold text-[#0f0f12] leading-none">
                          {formatPrice(finalPrice)}
                        </span>
                        <span className="text-[13px] font-medium text-[#7d7d87]">COP</span>
                        {pct > 0 && savings > 0 && (
                          <span className="ml-1 px-2 py-0.5 rounded-[4px] bg-[#ebf5ef] text-[#228b52] text-[11px] font-semibold">
                            Ahorras {formatPrice(savings)}
                          </span>
                        )}
                      </div>
                    </div>

                    <Tabs
                      value={detailTab}
                      onValueChange={setDetailTab}
                      className="flex-1 flex flex-col overflow-hidden px-5"
                    >
                      <TabsList className="h-[34px] bg-transparent border-b border-[#e5e5e9] rounded-none p-0 gap-0 w-full justify-start mb-0">
                        {[
                          { id: 'descripcion', label: 'Descripción' },
                          { id: 'especificaciones', label: 'Especificaciones' },
                          { id: 'compatibilidad', label: 'Compatibilidad' },
                        ].map(({ id, label }) => (
                          <TabsTrigger
                            key={id}
                            value={id}
                            className="h-full px-4 text-[12px] font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-[#8753ef] data-[state=active]:text-[#8753ef] data-[state=active]:bg-transparent text-[#7d7d87] hover:text-[#0f0f12] transition-colors"
                          >
                            {label}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      <TabsContent value="descripcion" className="mt-3 flex-1 overflow-y-auto">
                        <p className="text-[13px] text-[#7d7d87] leading-relaxed">
                          {lens.description}.{' '}
                          {lens.brand?.name && `Fabricado por ${lens.brand.name}.`}
                        </p>
                      </TabsContent>

                      <TabsContent
                        value="especificaciones"
                        className="mt-3 flex-1 overflow-y-auto"
                      >
                        <div className="grid grid-cols-2 gap-[6px]">
                          {specs.map(({ label, value }) => (
                            <div
                              key={label}
                              className="border border-[#e5e5e9] rounded-[6px] px-3 py-2"
                            >
                              <p className="text-[9px] font-medium text-[#7d7d87] mb-[2px] leading-none">
                                {label}
                              </p>
                              <p className="text-[12px] font-semibold text-[#0f0f12] leading-tight">
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="compatibilidad" className="mt-3 flex-1 overflow-y-auto">
                        <p className="text-[13px] text-[#7d7d87] leading-relaxed">
                          Consultar disponibilidad con el especialista para verificar compatibilidad
                          con la prescripción del paciente.
                        </p>
                      </TabsContent>
                    </Tabs>

                    <div className="px-5 py-4 border-t border-[#e5e5e9] flex items-center gap-3 shrink-0">
                      <div
                        className="flex items-center rounded-[6px] overflow-hidden"
                        style={{ border: '1px solid #e5e5e9', height: 36, width: 96 }}
                      >
                        <button
                          type="button"
                          onClick={() => setQty(lens.id, Math.max(1, getQty(lens.id) - 1))}
                          className="w-[30px] h-full flex items-center justify-center text-[#7d7d87] hover:bg-[#f5f5f6] transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <div className="w-px h-full bg-[#e5e5e9]" />
                        <span className="flex-1 text-center text-[13px] font-semibold text-[#0f0f12]">
                          {getQty(lens.id)}
                        </span>
                        <div className="w-px h-full bg-[#e5e5e9]" />
                        <button
                          type="button"
                          onClick={() => setQty(lens.id, getQty(lens.id) + 1)}
                          className="w-[30px] h-full flex items-center justify-center text-[#7d7d87] hover:bg-[#f5f5f6] transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {isLensInCart(lens.id) ? (
                        <button
                          type="button"
                          onClick={() => {
                            removeFromCart(lens.id);
                            setDetailsOpen(false);
                          }}
                          className="flex-1 h-[36px] rounded-[6px] text-[12px] font-semibold flex items-center justify-center gap-2 transition-colors"
                          style={{
                            background: '#ffeeed',
                            border: '1px solid rgba(184,38,38,0.25)',
                            color: '#b82626',
                          }}
                        >
                          <ShoppingCart className="w-4 h-4" />
                          Quitar del Carrito
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            addToCart(lens);
                            setDetailsOpen(false);
                          }}
                          className="flex-1 h-[36px] rounded-[6px] bg-[#8753ef] text-white text-[12px] font-semibold flex items-center justify-center gap-2 hover:bg-[#7340d4] transition-colors"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          Agregar al Carrito
                        </button>
                      )}

                      <button
                        type="button"
                        className="h-[36px] px-3 border border-[#e5e5e9] rounded-[6px] text-[#7d7d87] hover:bg-[#f5f5f6] transition-colors flex items-center gap-1.5"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Compartir ficha</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>

      {/* Price adjustment modal */}
      {selectedLensForPriceAdjustment && (
        <SessionLensPriceAdjustmentModal
          isOpen={priceAdjustmentModalOpen}
          onClose={() => {
            setPriceAdjustmentModalOpen(false);
            setSelectedLensForPriceAdjustment(null);
          }}
          lens={selectedLensForPriceAdjustment}
          onAdjustmentCreated={() => {
            toast({ title: 'Precio ajustado', description: 'El precio ha sido modificado para esta sesión.' });
          }}
        />
      )}
    </div>
  );
};

export default SalesCatalog;
