import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Search, Grid, List, ShoppingCart, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { lensService } from '@/services/lensService';
import { discountService } from '@/services/discountService';
import { formatCurrency } from '@/lib/utils';
import { SessionLensPriceAdjustmentModal } from '@/components/sales/SessionLensPriceAdjustmentModal';
import { ProductCard } from '@/components/sales/ProductCard';
import { CartDrawer } from '@/components/sales/CartDrawer';
import { ProductFilters } from '@/components/sales/ProductFilters';
import { ProductDetailModal } from '@/components/sales/ProductDetailModal';
import { ProductGallery } from '@/components/sales/ProductGallery';

import type { Lens, FilterOption, LensSearchParams } from '@/services/lensService';
import type { Discount } from '@/services/discountService';

interface SaleData {
  appointmentId?: number;
  patientId?: number;
  patientName?: string;
  selectedLenses?: Lens[];
}

interface LensWithDiscount extends Lens {
  discount_percentage?: number;
  bestDiscount?: Discount | null;
}

const CATEGORY_TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'lens', label: 'Lentes Oftálmicos' },
  { id: 'frame', label: 'Marcos' },
  { id: 'contact', label: 'Lentes de Contacto' },
  { id: 'accessory', label: 'Accesorios' },
];

const SalesCatalog: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [lenses, setLenses] = useState<LensWithDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage] = useState(20);
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid');
  const [saleData, setSaleData] = useState<SaleData | null>(null);
  const [cartItems, setCartItems] = useState<Lens[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  const [selectedType, setSelectedType] = useState<FilterOption | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<FilterOption | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<FilterOption | null>(null);
  const [selectedLensClass, setSelectedLensClass] = useState<FilterOption | null>(null);
  const [selectedTreatment, setSelectedTreatment] = useState<FilterOption | null>(null);

  const [types, setTypes] = useState<FilterOption[]>([]);
  const [brands, setBrands] = useState<FilterOption[]>([]);
  const [materials, setMaterials] = useState<FilterOption[]>([]);
  const [lensClasses, setLensClasses] = useState<FilterOption[]>([]);
  const [treatments, setTreatments] = useState<FilterOption[]>([]);

  const [priceAdjustmentModalOpen, setPriceAdjustmentModalOpen] = useState(false);
  const [selectedLensForPriceAdjustment, setSelectedLensForPriceAdjustment] = useState<Lens | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<Lens | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('pendingSale');
    if (raw) {
      const parsed: SaleData = JSON.parse(raw);
      setSaleData(parsed);
      if (parsed.selectedLenses) setCartItems(parsed.selectedLenses);
    }
  }, []);

  useEffect(() => {
    loadFilterOptions();
    return () => {
      if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
    };
  }, []);

  const loadFilterOptions = async () => {
    try {
      setFiltersLoading(true);
      await lensService.testFilterEndpoints();
      const options = await lensService.getFilterOptions();
      setBrands(Array.isArray(options.brands) ? options.brands : []);
      setMaterials(Array.isArray(options.materials) ? options.materials : []);
      setLensClasses(Array.isArray(options.lensClasses) ? options.lensClasses : []);
      setTreatments(Array.isArray(options.treatments) ? options.treatments : []);
    } catch {
      try { setBrands(await lensService.searchBrands('')); } catch (_) { /* intentional */ }
      try { setMaterials(await lensService.searchMaterials('')); } catch (_) { /* intentional */ }
      try { setLensClasses(await lensService.searchLensClasses('')); } catch (_) { /* intentional */ }
      try { setTreatments(await lensService.searchTreatments('')); } catch (_) { /* intentional */ }
    } finally {
      setFiltersLoading(false);
    }
  };

  const getActiveFiltersCount = useCallback((): number => {
    let n = 0;
    if (selectedBrand) n++;
    if (selectedMaterial) n++;
    if (selectedLensClass) n++;
    if (selectedTreatment) n++;
    if (selectedType) n++;
    if (searchQuery) n++;
    return n;
  }, [selectedBrand, selectedMaterial, selectedLensClass, selectedTreatment, selectedType, searchQuery]);

  const loadLenses = useCallback(async () => {
    setLoading(true);
    setSearchLoading(false);
    try {
      const params: LensSearchParams = {
        page: currentPage,
        perPage,
        query: searchQuery,
        categorySlug: activeCategory !== 'all' ? activeCategory : undefined,
      };
      if (selectedBrand) params.brandId = selectedBrand.id;
      if (selectedMaterial) params.materialId = selectedMaterial.id;
      if (selectedLensClass) params.lensClassId = selectedLensClass.id;
      if (selectedTreatment) params.treatmentId = selectedTreatment.id;

      const response = await lensService.searchLenses(params);

      const withDiscounts: LensWithDiscount[] = await Promise.all(
        response.data.map(async (lens) => {
          if (lens.has_discounts) {
            try {
              const best = await discountService.getBestDiscount(lens.id);
              return { ...lens, discount_percentage: best?.discount_percentage ?? 0, bestDiscount: best };
            } catch {
              return { ...lens, discount_percentage: 0, bestDiscount: null };
            }
          }
          return { ...lens, bestDiscount: null };
        })
      );

      setLenses(withDiscounts);
      setTotalPages(response.last_page);
    } catch {
      setLenses([]);
      setTotalPages(1);
      toast({ variant: 'destructive', title: 'Error al cargar lentes', description: 'Intente nuevamente.' });
    } finally {
      setLoading(false);
    }
  }, [currentPage, perPage, searchQuery, selectedBrand, selectedMaterial, selectedLensClass, selectedTreatment, activeCategory]);

  useEffect(() => {
    loadLenses();
  }, [currentPage]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim()) setSearchLoading(true); else setSearchLoading(false);
    if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
    searchDebounceTimer.current = setTimeout(() => {
      setCurrentPage(1);
      loadLenses();
    }, 500);
  };

  const handleCategoryChange = useCallback((categoryId: string) => {
    setActiveCategory(categoryId);
    setCurrentPage(1);
  }, []);

  const handleApplyFilters = () => {
    setCurrentPage(1);
    loadLenses();
  };

  const handleResetFilters = () => {
    setSelectedBrand(null);
    setSelectedMaterial(null);
    setSelectedLensClass(null);
    setSelectedTreatment(null);
    setSelectedType(null);
    setSearchQuery('');
    setActiveCategory('all');
    setCurrentPage(1);
    setTimeout(loadLenses, 0);
    setFilterDrawerOpen(false);
  };

  const updateSessionStorage = (items: Lens[]) => {
    if (saleData) {
      const updated = { ...saleData, selectedLenses: items };
      sessionStorage.setItem('pendingSale', JSON.stringify(updated));
      setSaleData(updated);
    }
  };

  const addToCart = (lens: Lens) => {
    if (cartItems.some((l) => l.id === lens.id)) {
      toast({ title: 'Este lente ya está en el carrito', variant: 'destructive' });
      return;
    }
    const updated = [...cartItems, lens];
    setCartItems(updated);
    updateSessionStorage(updated);
    toast({ title: 'Lente agregado al carrito' });
  };

  const removeFromCart = (lensId: number) => {
    const updated = cartItems.filter((l) => l.id !== lensId);
    setCartItems(updated);
    updateSessionStorage(updated);
  };

  const clearCart = () => {
    setCartItems([]);
    updateSessionStorage([]);
    toast({ title: 'Carrito vaciado' });
  };

  const handleViewDetail = (product: Lens) => {
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
  };

  const handleOpenGallery = (product: Lens) => {
    setSelectedProduct(product);
    setIsGalleryOpen(true);
    setIsDetailModalOpen(false);
  };

  const handleBackToDetail = () => {
    setIsGalleryOpen(false);
    setIsDetailModalOpen(true);
  };

  const handleCompleteSale = () => {
    if (cartItems.length === 0) {
      toast({ title: 'Sin lentes seleccionados', variant: 'destructive' });
      return;
    }
    const updated = { ...saleData, selectedLenses: cartItems };
    sessionStorage.setItem('pendingSale', JSON.stringify(updated));
    navigate('/receptionist/sales/new');
  };

  const cartQty = (lensId: number) => cartItems.some((l) => l.id === lensId) ? 1 : 0;

  const handlePageChange = (page: number) => {
    if (page !== currentPage) setCurrentPage(page);
  };

  const activeFilterCount = getActiveFiltersCount();

  const gridColsClass = cartOpen
    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4';

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#f5f5f6' }}>
      <div className="h-[60px] bg-white flex items-center px-6 gap-4 flex-shrink-0" style={{ borderBottom: '1px solid #e5e5e9' }}>
        <div className="flex-1">
          <p className="text-xs" style={{ color: '#7d7d87' }}>Ventas / Nueva Venta / Catálogo de Productos</p>
          <h1 className="text-base font-semibold leading-tight" style={{ color: '#0f0f12' }}>Catálogo de Productos</h1>
        </div>
        {saleData?.patientName && (
          <span className="text-[13px]" style={{ color: '#7d7d87' }}>
            Cliente: <span className="font-medium" style={{ color: '#121215' }}>{saleData.patientName}</span>
          </span>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/receptionist/sales')}
            className="text-[13px] font-semibold"
            style={{ border: '1px solid #e5e5e9', color: '#121215', background: '#ffffff' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCompleteSale}
            disabled={cartItems.length === 0}
            className="text-[14px] font-medium text-white gap-2 disabled:opacity-40"
            style={{ background: '#8753ef', border: 'none', borderRadius: '8px' }}
          >
            Agregar {cartItems.length > 0 ? cartItems.length : ''} producto{cartItems.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-[600px]">
              {searchLoading
                ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-500 animate-spin" />
                : <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              }
              <Input
                type="search"
                placeholder="Buscar por descripción..."
                className="pl-9 bg-white focus-visible:ring-[#8753ef]"
                style={{ border: '1px solid #e5e5e9' }}
                value={searchQuery}
                onChange={handleSearchInputChange}
                onKeyDown={(e) => { if (e.key === 'Enter') { setCurrentPage(1); loadLenses(); } }}
              />
            </div>

            <ProductFilters
              open={filterDrawerOpen}
              onOpenChange={setFilterDrawerOpen}
              types={types}
              brands={brands}
              materials={materials}
              lensClasses={lensClasses}
              treatments={treatments}
              selectedType={selectedType}
              selectedBrand={selectedBrand}
              selectedMaterial={selectedMaterial}
              selectedLensClass={selectedLensClass}
              selectedTreatment={selectedTreatment}
              loading={filtersLoading}
              onTypeChange={setSelectedType}
              onBrandChange={setSelectedBrand}
              onMaterialChange={setSelectedMaterial}
              onLensClassChange={setSelectedLensClass}
              onTreatmentChange={setSelectedTreatment}
              onApply={handleApplyFilters}
              onReset={handleResetFilters}
              activeCount={activeFilterCount}
            />

            <div
              className="flex items-center bg-white rounded-lg overflow-hidden"
              style={{ border: '1px solid #e5e5e9' }}
            >
              <button
                onClick={() => setDisplayMode('grid')}
                className="px-3 h-9 flex items-center justify-center gap-1.5 text-[13px] font-medium transition-colors rounded-lg"
                style={displayMode === 'grid'
                  ? { background: '#f0edff', color: '#8753ef' }
                  : { color: '#7d7d87' }}
              >
                <Grid size={15} />
                <span>Grid</span>
              </button>
              <button
                onClick={() => setDisplayMode('list')}
                className="px-3 h-9 flex items-center justify-center gap-1.5 text-[13px] transition-colors rounded-lg"
                style={displayMode === 'list'
                  ? { background: '#f0edff', color: '#8753ef', fontWeight: 500 }
                  : { color: '#7d7d87' }}
              >
                <List size={15} />
                <span>Lista</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleCategoryChange(tab.id)}
                className="px-3 py-1 rounded-full text-[12px] font-medium transition-colors"
                style={activeCategory === tab.id
                  ? { background: '#f0edff', border: '1px solid #8753ef', color: '#8753ef' }
                  : { background: '#ffffff', border: '1px solid #e5e5e9', color: '#7d7d87' }}
              >
                {tab.label}
              </button>
            ))}
            {selectedBrand && (
              <Badge variant="secondary" className="pl-2 pr-1 py-1 gap-1 bg-violet-50 text-violet-700">
                Marca: {selectedBrand.name}
                <button onClick={() => setSelectedBrand(null)}><X size={11} /></button>
              </Badge>
            )}
            {selectedMaterial && (
              <Badge variant="secondary" className="pl-2 pr-1 py-1 gap-1 bg-violet-50 text-violet-700">
                Material: {selectedMaterial.name}
                <button onClick={() => setSelectedMaterial(null)}><X size={11} /></button>
              </Badge>
            )}
            {selectedLensClass && (
              <Badge variant="secondary" className="pl-2 pr-1 py-1 gap-1 bg-violet-50 text-violet-700">
                Clase: {selectedLensClass.name}
                <button onClick={() => setSelectedLensClass(null)}><X size={11} /></button>
              </Badge>
            )}
            {selectedTreatment && (
              <Badge variant="secondary" className="pl-2 pr-1 py-1 gap-1 bg-violet-50 text-violet-700">
                Tratamiento: {selectedTreatment.name}
                <button onClick={() => setSelectedTreatment(null)}><X size={11} /></button>
              </Badge>
            )}
            {activeFilterCount > 1 && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-slate-500 hover:text-violet-600 transition-colors"
              >
                Limpiar todos
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 size={40} className="text-violet-400 animate-spin" />
              <p className="text-slate-500 text-sm">Cargando productos...</p>
            </div>
          ) : lenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white rounded-2xl border border-slate-200">
              <Search size={40} className="text-slate-200" />
              <p className="text-slate-500 text-sm">No se encontraron productos</p>
              {activeFilterCount > 0 && (
                <Button variant="outline" size="sm" onClick={handleResetFilters}>
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : displayMode === 'grid' ? (
            <div className={`grid ${gridColsClass} gap-5`}>
              {lenses.map((lens) => (
                <ProductCard
                  key={lens.id}
                  product={lens}
                  cartQuantity={cartQty(lens.id)}
                  onAddToCart={(p) => addToCart(p)}
                  onRemoveFromCart={removeFromCart}
                  onViewDetail={handleViewDetail}
                  discount={lens.bestDiscount}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-12 px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <div className="col-span-5">Descripción</div>
                <div className="col-span-3">Tipo / Marca</div>
                <div className="col-span-2">Material</div>
                <div className="col-span-2 text-right">Precio</div>
              </div>
              {lenses.map((lens, idx) => (
                <div
                  key={lens.id}
                  className={`grid grid-cols-12 px-5 py-4 gap-4 border-b border-slate-100 last:border-b-0 ${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}
                >
                  <div className="col-span-5">
                    <p className="text-sm font-medium text-slate-800">{lens.description}</p>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{lens.internal_code}</p>
                    <div className="flex gap-2 mt-2">
                      {cartQty(lens.id) > 0 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => removeFromCart(lens.id)}
                        >
                          <X size={11} className="mr-1" />Quitar
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-violet-600 hover:bg-violet-700 text-white"
                          onClick={() => addToCart(lens)}
                        >
                          <ShoppingCart size={11} className="mr-1" />Agregar
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="col-span-3 flex flex-col justify-center gap-1">
                    {lens.type?.name && (
                      <span className="text-xs font-medium px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full w-fit">
                        {lens.type.name}
                      </span>
                    )}
                    <span className="text-sm text-slate-600">{lens.brand?.name ?? '—'}</span>
                  </div>
                  <div className="col-span-2 flex flex-col justify-center">
                    <span className="text-sm text-slate-700">{lens.material?.name ?? '—'}</span>
                    {lens.treatment?.name && (
                      <span className="text-xs text-slate-400">{lens.treatment.name}</span>
                    )}
                  </div>
                  <div className="col-span-2 flex flex-col items-end justify-center">
                    {lens.has_discounts && lens.discount_percentage ? (
                      <>
                        <span className="text-xs text-slate-400 line-through">
                          {formatCurrency(parseFloat(lens.price?.toString() ?? '0'), 'COP')}
                        </span>
                        <span className="text-sm font-bold text-slate-800">
                          {formatCurrency(
                            discountService.calculateDiscountedPrice(
                              parseFloat(lens.price?.toString() ?? '0'),
                              lens.discount_percentage
                            ),
                            'COP'
                          )}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm font-bold text-slate-800">
                        {formatCurrency(parseFloat(lens.price?.toString() ?? '0'), 'COP')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && lenses.length > 0 && (
            <div className="flex justify-center gap-1.5 pb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-9 w-9 p-0"
              >
                <ChevronLeft size={16} />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page = i + 1;
                if (totalPages > 5) {
                  if (currentPage <= 3) page = i + 1;
                  else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                  else page = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className={`h-9 w-9 p-0 ${currentPage === page ? 'bg-violet-600 hover:bg-violet-700 text-white' : ''}`}
                  >
                    {page}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="h-9 w-9 p-0"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </div>

        <CartDrawer
          isOpen={cartOpen}
          onClose={() => setCartOpen(false)}
          items={cartItems}
          onRemoveItem={removeFromCart}
          onClear={clearCart}
          onContinue={handleCompleteSale}
          patientName={saleData?.patientName}
        />
      </div>

      {!cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
          style={{ background: '#8753ef' }}
        >
          <ShoppingCart size={22} className="text-white" />
          {cartItems.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {cartItems.length}
            </span>
          )}
        </button>
      )}

      {selectedLensForPriceAdjustment && (
        <SessionLensPriceAdjustmentModal
          isOpen={priceAdjustmentModalOpen}
          onClose={() => { setPriceAdjustmentModalOpen(false); setSelectedLensForPriceAdjustment(null); }}
          lens={selectedLensForPriceAdjustment}
          onAdjustmentCreated={() => {
            toast({ title: 'Precio ajustado', description: 'El precio del lente ha sido modificado para esta sesión.' });
          }}
        />
      )}

      <ProductDetailModal
        product={selectedProduct}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        cartQuantity={selectedProduct ? cartQty(selectedProduct.id) : 0}
        onAddToCart={(p, qty) => { addToCart(p); void qty; }}
        onRemoveFromCart={removeFromCart}
        onOpenGallery={handleOpenGallery}
        discount={selectedProduct ? (lenses.find((l) => l.id === selectedProduct.id) as LensWithDiscount | undefined)?.bestDiscount : null}
      />

      <ProductGallery
        product={selectedProduct}
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        onBack={handleBackToDetail}
        onAddToCart={(p, qty) => { addToCart(p); void qty; }}
        cartQuantity={selectedProduct ? cartQty(selectedProduct.id) : 0}
        discount={selectedProduct ? (lenses.find((l) => l.id === selectedProduct.id) as LensWithDiscount | undefined)?.bestDiscount : null}
      />
    </div>
  );
};

export default SalesCatalog;
