import React, { useState, useEffect, useRef, TouchEvent, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Eye,
  EyeOff,
  Check,
  List,
  Grid,
  Sun,
  Moon,
  ShoppingBag,
  Search,
  ArrowLeft,
  Filter,
  Share,
  X,
  Tag,
  ChevronLeft,
  ChevronRight,
  Percent as PercentIcon,
  Loader2,
  Sparkles,
  AlertCircle,
  Glasses,
  Info,
  Plus,
  FileText,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ApiService from '@/services/ApiService';
import SearchableSelect, { SelectOption } from '@/components/ui/SearchableSelect';
import { lensService } from '@/services/lensService';

import { formatCurrency } from '@/lib/utils';
import { discountService } from '@/services/discountService';
import { SessionLensPriceAdjustmentModal } from '@/components/sales/SessionLensPriceAdjustmentModal';
import { SessionLensPriceDisplay } from '@/components/sales/SessionLensPriceDisplay';
import { sessionPriceAdjustmentService } from '@/services/sessionPriceAdjustmentService';

// Use imported types instead of redefining
import type { Lens, FilterOption, LensSearchParams } from '@/services/lensService';
import type { Discount } from '@/services/discountService';

// Types
interface PaginatedResponse {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  data: Lens[]; // Replace any[] with Lens[]
}

// Extender la interfaz Lens para incluir el porcentaje de descuento
interface LensWithDiscount extends Lens {
  discount_percentage?: number;
}

interface ApiResponse<T> {
  data: T;
  message?: string;
  status?: number;
}



interface SaleData {
  appointmentId?: number;
  patientId?: number;
  patientName?: string;
  selectedLenses?: Lens[]; // Changed from selectedLens to selectedLenses array
}

// Format price as currency
const formatPrice = (price: string | number) => {
  return formatCurrency(price, 'COP');
};

const SalesCatalog: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [lenses, setLenses] = useState<LensWithDiscount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid');
  const [saleData, setSaleData] = useState<SaleData | null>(null);
  const [selectedLenses, setSelectedLenses] = useState<Lens[]>([]); // Changed to array for multiple selection
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageTransitioning, setPageTransitioning] = useState(false);
  
  // Cart management states
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedLensForDetails, setSelectedLensForDetails] = useState<Lens | null>(null);
  
  // Price adjustment states
  const [priceAdjustmentModalOpen, setPriceAdjustmentModalOpen] = useState(false);
  const [selectedLensForPriceAdjustment, setSelectedLensForPriceAdjustment] = useState<Lens | null>(null);
  
  // Filter states
  const [descriptionFilter, setDescriptionFilter] = useState('');
  const [selectedType, setSelectedType] = useState<FilterOption | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<FilterOption | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<FilterOption | null>(null);
  const [selectedLensClass, setSelectedLensClass] = useState<FilterOption | null>(null);
  const [selectedTreatment, setSelectedTreatment] = useState<FilterOption | null>(null);
  
  // Filter options
  const [types, setTypes] = useState<FilterOption[]>([]);
  const [brands, setBrands] = useState<FilterOption[]>([]);
  const [materials, setMaterials] = useState<FilterOption[]>([]);
  const [lensClasses, setLensClasses] = useState<FilterOption[]>([]);
  const [treatments, setTreatments] = useState<FilterOption[]>([]);
  const [activeTab, setActiveTab] = useState('all');

  

  
  // Loading states for filters
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);
  
  // Request tracking refs to prevent duplicate requests
  const pendingRequests = useRef<Record<string, boolean>>({});
  const filterTimers = useRef<Record<string, NodeJS.Timeout>>({});
  
  // Touch navigation states
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50; // Minimum distance required for a swipe

  // Nuevo estado para almacenar el porcentaje de descuento
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [loadingDiscount, setLoadingDiscount] = useState<boolean>(false);

  // Debounce search timer reference
  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Add state for search in progress indicator
  const [searchLoading, setSearchLoading] = useState<boolean>(false);

  // Get sale data from session storage
  useEffect(() => {
    const data = sessionStorage.getItem('pendingSale');
    if (data) {
      const parsedData = JSON.parse(data);
      setSaleData(parsedData);
      
      // Load existing selected lenses from sessionStorage
      if (parsedData.selectedLenses) {
        setSelectedLenses(parsedData.selectedLenses);
      }
    }
  }, []);
  
  // Load filter options with improved error handling
  useEffect(() => {
    loadFilterOptions();
    
    // Clear timers on unmount
    return () => {
      Object.values(filterTimers.current).forEach(timer => clearTimeout(timer));
    };
  }, []);
  
  // Helper function to convert filter IDs to strings to match SearchableSelect expected format
  const getFilterValueString = (filter: FilterOption | null): string => {
    return filter ? filter.id.toString() : "all";
  };
  
  const loadFilterOptions = async () => {
    try {
      setFiltersLoading(true);
      setFilterError(null);
      
      // Test filter endpoints to ensure they're working
      await lensService.testFilterEndpoints();
      
      // Then fetch all filter options
      const options = await lensService.getFilterOptions();
      console.log("Loaded filter options:", options);
      
      // Set the filter states - ensure we always provide an array even if API returns null/undefined
      setBrands(Array.isArray(options.brands) ? options.brands : []);
      setMaterials(Array.isArray(options.materials) ? options.materials : []);
      setLensClasses(Array.isArray(options.lensClasses) ? options.lensClasses : []);
      setTreatments(Array.isArray(options.treatments) ? options.treatments : []);
      
      // Fallback: If any filter category is empty, try to load it individually with empty search
      await loadEmptyFilters();
    } catch (error) {
      console.error('Error loading filter options:', error);
      setFilterError('No se pudieron cargar las opciones de filtrado');
      
      // Attempt fallback loading on error
      await loadEmptyFilters();
    } finally {
      setFiltersLoading(false);
    }
  };
  
  // Load empty filters as fallback
  const loadEmptyFilters = async () => {
    const loadPromises = [];
    
    if (!brands.length) {
      loadPromises.push(
        handleBrandSearch('').catch(err => 
          console.error('Failed to load brands in fallback:', err)
        )
      );
    }
    
    if (!materials.length) {
      loadPromises.push(
        handleMaterialSearch('').catch(err => 
          console.error('Failed to load materials in fallback:', err)
        )
      );
    }
    
    if (!lensClasses.length) {
      loadPromises.push(
        handleLensClassSearch('').catch(err => 
          console.error('Failed to load lens classes in fallback:', err)
        )
      );
    }
    
    if (!treatments.length) {
      loadPromises.push(
        handleTreatmentSearch('').catch(err => 
          console.error('Failed to load treatments in fallback:', err)
        )
      );
    }
    
    if (loadPromises.length > 0) {
      await Promise.allSettled(loadPromises);
      console.log('Fallback filter loading complete');
    }
  };
  
  // Filter search functions with debouncing
  const handleBrandSearch = async (inputValue: string) => {
    try {
      console.log(`Searching brands with query: "${inputValue}"`);
      const brandOptions = await lensService.searchBrands(inputValue);
      setBrands(brandOptions);
      return brandOptions;
    } catch (error) {
      console.error('Error searching brands:', error);
      return [];
    }
  };
  
  const handleMaterialSearch = async (inputValue: string) => {
    try {
      console.log(`Searching materials with query: "${inputValue}"`);
      const materialOptions = await lensService.searchMaterials(inputValue);
      setMaterials(materialOptions);
      return materialOptions;
    } catch (error) {
      console.error('Error searching materials:', error);
      return [];
    }
  };
  
  const handleLensClassSearch = async (inputValue: string) => {
    try {
      console.log(`Searching lens classes with query: "${inputValue}"`);
      const lensClassOptions = await lensService.searchLensClasses(inputValue);
      setLensClasses(lensClassOptions);
      return lensClassOptions;
    } catch (error) {
      console.error('Error searching lens classes:', error);
      return [];
    }
  };
  
  const handleTreatmentSearch = async (inputValue: string) => {
    try {
      console.log(`Searching treatments with query: "${inputValue}"`);
      const treatmentOptions = await lensService.searchTreatments(inputValue);
      setTreatments(treatmentOptions);
      return treatmentOptions;
    } catch (error) {
      console.error('Error searching treatments:', error);
      return [];
    }
  };
  
  // Reset all filters
  const resetFilters = () => {
    console.log('Resetting all filters');
    
    // Reset filter state values
    setSelectedBrand(null);
    setSelectedMaterial(null);
    setSelectedLensClass(null);
    setSelectedTreatment(null);
    setSearchQuery('');
    setCurrentPage(1);
    
    // Clear any errors
    setFilterError(null);
    
    // Load filter options to ensure dropdowns have data
    loadFilterOptions();
    
    // Perform a search with no filters to refresh the lens list
    setTimeout(() => {
      loadLenses();
    }, 0);
    
    // Close the filter drawer
    setFilterDrawerOpen(false);
  };
  
  // Convert FilterOption[] to SelectOption[] for SearchableSelect component
  const convertToSelectOptions = (filterOptions: FilterOption[]): SelectOption[] => {
    if (!Array.isArray(filterOptions)) {
      console.error("filterOptions is not an array:", filterOptions);
      return [];
    }
    return filterOptions.map(option => ({
      value: option.id.toString(),
      label: option.name
    }));
  };
  
  // Count active filters
  const getActiveFiltersCount = (): number => {
    let count = 0;
    if (selectedBrand) count++;
    if (selectedMaterial) count++;
    if (selectedLensClass) count++;
    if (selectedTreatment) count++;
    if (searchQuery) count++;
    return count;
  };
  
  // Load lenses function - simplified without prescription filtering
  const loadLenses = async () => {
    try {
      setLoading(true);
      setSearchLoading(false);
      console.log(`Cargando lentes con búsqueda: "${searchQuery}"`);

      const searchParams: LensSearchParams = {
        page: currentPage,
        perPage: perPage,
        query: searchQuery
      };
      
      if (selectedBrand) searchParams.brandId = selectedBrand.id;
      if (selectedMaterial) searchParams.materialId = selectedMaterial.id;
      if (selectedLensClass) searchParams.lensClassId = selectedLensClass.id;
      if (selectedTreatment) searchParams.treatmentId = selectedTreatment.id;
      
      console.log('Parámetros de búsqueda para lentes:', searchParams);
      const response = await lensService.searchLenses(searchParams);
      
      const lensesWithDiscount = await Promise.all(
        response.data.map(async (lens) => {
          if (lens.has_discounts) {
            try {
              const bestDiscount = await discountService.getBestDiscount(lens.id);
              return {
                ...lens,
                discount_percentage: bestDiscount?.discount_percentage || 0
              };
            } catch (error) {
              console.error(`Error al obtener descuento para lente ID ${lens.id}:`, error);
              return {
                ...lens,
                discount_percentage: 0
              };
            }
          }
          return lens;
        })
      );
      
      setLenses(lensesWithDiscount);
      setTotalPages(response.last_page);

      if (response.data.length === 0) {
        if (getActiveFiltersCount() > 0) {
          setFilterError('No se encontraron lentes con los filtros seleccionados. Prueba con diferentes criterios.');
        } else {
          setFilterError('No se encontraron lentes.');
        }
      } else {
        setFilterError(null);
      }
    } catch (error) {
      console.error('Error al cargar lentes:', error);
      setLenses([]);
      setTotalPages(1);
      toast({
        variant: 'destructive',
        title: 'Error al cargar lentes',
        description: 'No se pudieron cargar los lentes. Intente nuevamente.'
      });
    } finally {
      setLoading(false);
      setSearchLoading(false);
      const requestKey = `page_${currentPage}_filter_${getActiveFiltersCount() > 0 ? 'filtered' : 'all'}`;
      if (pendingRequests.current[requestKey]) {
        delete pendingRequests.current[requestKey];
      }
    }
  };
  
  // Load lenses when component mounts and when dependencies change
  useEffect(() => {
    loadLenses();
  }, [currentPage, perPage]);
  
  // Función para obtener el porcentaje de descuento de un lente específico
  const fetchDiscountPercentage = async (lensId: number) => {
    try {
      setLoadingDiscount(true);
      // Obtener el mejor descuento para este lente
      const bestDiscount = await discountService.getBestDiscount(lensId);
      if (bestDiscount) {
        setDiscountPercentage(bestDiscount.discount_percentage);
      } else {
        setDiscountPercentage(0);
      }
    } catch (error) {
      console.error('Error al obtener el porcentaje de descuento:', error);
      setDiscountPercentage(0);
    } finally {
      setLoadingDiscount(false);
    }
  };

  // Handle selecting a lens for purchase - Updated for cart system
  const handleSelectLens = (lens: Lens) => {
    setSelectedLensForDetails(lens);
    setDetailsOpen(true);
    
    // If lens has discounts, get the percentage
    if (lens.has_discounts) {
      fetchDiscountPercentage(lens.id);
    } else {
      setDiscountPercentage(0);
    }
  };
  
  // Complete sale with selected lenses (multiple)
  const handleCompleteSale = () => {
    if (selectedLenses.length === 0 || !saleData) {
      toast({
        title: "Sin lentes seleccionados",
        description: "Debe seleccionar al menos un lente para continuar con la venta.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      console.log('Lentes seleccionados para venta:', selectedLenses);
      
      // Update sale data with selected lenses
      const updatedSaleData = {
        ...saleData,
        selectedLenses: selectedLenses
      };
      
      console.log('Datos de venta actualizados:', updatedSaleData);
      
      // Save updated data to session storage
      sessionStorage.setItem('pendingSale', JSON.stringify(updatedSaleData));
      
      toast({
        title: "Lentes seleccionados",
        description: `Se han seleccionado ${selectedLenses.length} lente(s) para la venta`,
        duration: 3000,
      });
      
      navigate('/receptionist/sales/new');
    } catch (error) {
      console.error('Error al completar la selección:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo guardar la selección. Intente nuevamente.',
      });
    }
  };
  
  // Modificar handleSearch para usar la referencia actual de searchQuery
  const handleSearch = useCallback(() => {
    console.log('Realizando búsqueda con texto:', searchQuery);
    // Reiniciar a la primera página
    setCurrentPage(1);
    // Asegurarse de que se está usando el valor actual de searchQuery
    loadLenses();
  }, [searchQuery]); // Remove loadLenses from dependency array to avoid circular reference

  // Handle search input changes with debounce
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchQuery = e.target.value;
    setSearchQuery(newSearchQuery);
    
    // Show loading indicator immediately when typing, or hide it when query is empty
    if (newSearchQuery.trim().length > 0) {
      setSearchLoading(true);
    } else {
      setSearchLoading(false);
    }
    
    // Clear any existing timer
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }
    
    // Set a new timer to trigger search after 500ms of inactivity
    searchDebounceTimer.current = setTimeout(() => {
      console.log('Debounce timer triggered with query:', newSearchQuery);
      setCurrentPage(1);
      loadLenses();
    }, 500);
  };

  // Clear debounce timer on component unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
    };
  }, []);
  
  // Handle touch start
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    setTouchEnd(null); // Reset touch end
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  // Handle touch move
  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  // Handle touch end
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    // Navigate based on swipe direction
    if (isLeftSwipe && currentPage < totalPages) {
      // Swiped left, go to next page
      handlePageChange(currentPage + 1);
    } else if (isRightSwipe && currentPage > 1) {
      // Swiped right, go to previous page
      handlePageChange(currentPage - 1);
    }
    
    // Reset touch coordinates
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Handle changing the page with animation
  const handlePageChange = (page: number) => {
    if (page === currentPage) return;
    setPageTransitioning(true);
    setCurrentPage(page);
  };

  // Cart management functions
  const addToCart = (lens: Lens) => {
    const isAlreadySelected = selectedLenses.some(l => l.id === lens.id);
    if (isAlreadySelected) {
      toast({
        title: 'Este lente ya está en el carrito',
        variant: 'destructive',
      });
      return;
    }
    
    const updatedLenses = [...selectedLenses, lens];
    setSelectedLenses(updatedLenses);
    updateSessionStorage(updatedLenses);
    toast({
      title: 'Lente agregado al carrito',
    });
  };

  const removeFromCart = (lensId: number) => {
    const updatedLenses = selectedLenses.filter(l => l.id !== lensId);
    setSelectedLenses(updatedLenses);
    updateSessionStorage(updatedLenses);
    toast({
      title: 'Lente removido del carrito',
    });
  };

  const clearCart = () => {
    setSelectedLenses([]);
    updateSessionStorage([]);
    toast({
      title: 'Carrito vaciado',
    });
  };

  const updateSessionStorage = (lenses: Lens[]) => {
    if (saleData) {
      const updatedSaleData = {
        ...saleData,
        selectedLenses: lenses
      };
      sessionStorage.setItem('pendingSale', JSON.stringify(updatedSaleData));
      setSaleData(updatedSaleData);
    }
  };

  const isLensInCart = (lensId: number) => {
    return selectedLenses.some(l => l.id === lensId);
  };

  return (
    <div className="container max-w-[1400px] mx-auto py-6 px-4 space-y-6 min-h-screen relative">
      {/* Neutral circular gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-gray-50 to-white"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.8),rgba(241,245,249,0.6)_30%,rgba(226,232,240,0.4)_60%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(148,163,184,0.05)_70%,rgba(148,163,184,0.1)_100%)]"></div>
        <div className="absolute w-full h-full opacity-20 mix-blend-multiply bg-[repeating-linear-gradient(45deg,transparent,transparent_20px,rgba(226,232,240,0.5)_20px,rgba(226,232,240,0.5)_40px)]"></div>
      </div>
      
      {/* Header with back button and page title */}
      <div className="flex justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-full border-blue-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5 text-blue-600" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-blue-600" />
              Catálogo de Lentes
            </h1>
            {saleData?.patientName && (
              <p className="text-sm text-slate-600">
                Cliente: <span className="font-medium">{saleData.patientName}</span>
              </p>
            )}
          </div>
        </div>
        {selectedLenses.length > 0 && (
          <Button 
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white relative"
            onClick={handleCompleteSale}
          >
            <Check className="h-4 w-4" />
            Completar Venta ({selectedLenses.length})
            {selectedLenses.length > 0 && (
              <Badge className="ml-2 bg-white text-blue-600 hover:bg-gray-100">
                {selectedLenses.length}
              </Badge>
            )}
          </Button>
        )}
      </div>
      
      {/* Recommendation card - always visible regardless of active tab */}
      {/* Prescription information removed for receptionist access control */}
      
      {/* Search and filters */}
      <div className="flex gap-3 items-center">
        <div className="relative grow max-w-xl">
          {searchLoading ? (
            <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-500 animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          )}
          <Input
            type="search"
            placeholder="Buscar por descripción..."
            className="pl-10 border-blue-100 focus-visible:ring-blue-500 bg-white/80 backdrop-blur-sm"
            value={searchQuery}
            onChange={handleSearchInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
          />
        </div>
        
        <div>
          <Drawer open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
            <DrawerTrigger asChild>
              <Button variant="outline" className="gap-2 bg-white/80 backdrop-blur-sm border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-600">
                <Filter className="h-4 w-4" />
                <span className="hidden md:inline">Filtros</span>
              </Button>
            </DrawerTrigger>
            <DrawerContent className="p-6 max-h-[85vh] overflow-y-auto">
              <DrawerHeader className="flex justify-between items-center mb-2">
                <DrawerTitle className="text-xl font-bold">Filtros de búsqueda</DrawerTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={resetFilters}
                    className="h-9 px-3 text-sm"
                  >
                    Limpiar
                  </Button>
                  <DrawerClose asChild>
                    <Button variant="ghost" size="sm" className="h-9 px-3 text-sm">
                      Cancelar
                    </Button>
                  </DrawerClose>
                </div>
              </DrawerHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 py-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tipo</Label>
                  <Select
                    value={selectedType?.id.toString() || "all"}
                    onValueChange={(value) => {
                      if (value === "all") {
                        setSelectedType(null);
                      } else {
                        const type = types.find(t => t.id.toString() === value);
                        setSelectedType(type || null);
                      }
                    }}
                    disabled={filtersLoading}
                  >
                    <SelectTrigger className={filtersLoading ? "opacity-70" : ""}>
                      <SelectValue placeholder={filtersLoading ? "Cargando..." : "Seleccionar tipo"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      {Array.isArray(types) && types.length > 0 ? (
                        types.map(type => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem disabled value="no-data">
                          {filtersLoading ? "Cargando opciones..." : "No hay tipos disponibles"}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Marca</Label>
                  <Select
                    value={selectedBrand?.id.toString() || "all"}
                    onValueChange={(value) => {
                      if (value === "all") {
                        setSelectedBrand(null);
                      } else {
                        const brand = brands.find(b => b.id.toString() === value);
                        setSelectedBrand(brand || null);
                      }
                    }}
                    disabled={filtersLoading}
                  >
                    <SelectTrigger className={filtersLoading ? "opacity-70" : ""}>
                      <SelectValue placeholder={filtersLoading ? "Cargando..." : "Seleccionar marca"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las marcas</SelectItem>
                      {Array.isArray(brands) && brands.length > 0 ? (
                        brands.map(brand => (
                          <SelectItem key={brand.id} value={brand.id.toString()}>
                            {brand.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem disabled value="no-data">
                          {filtersLoading ? "Cargando opciones..." : "No hay marcas disponibles"}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Material</Label>
                  <Select
                    value={selectedMaterial?.id.toString() || "all"}
                    onValueChange={(value) => {
                      if (value === "all") {
                        setSelectedMaterial(null);
                      } else {
                        const material = materials.find(m => m.id.toString() === value);
                        setSelectedMaterial(material || null);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar material" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los materiales</SelectItem>
                      {Array.isArray(materials) && materials.map(material => (
                        <SelectItem key={material.id} value={material.id.toString()}>
                          {material.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Clase</Label>
                  <Select
                    value={selectedLensClass?.id.toString() || "all"}
                    onValueChange={(value) => {
                      if (value === "all") {
                        setSelectedLensClass(null);
                      } else {
                        const lensClass = lensClasses.find(lc => lc.id.toString() === value);
                        setSelectedLensClass(lensClass || null);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar clase" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las clases</SelectItem>
                      {Array.isArray(lensClasses) && lensClasses.map(lensClass => (
                        <SelectItem key={lensClass.id} value={lensClass.id.toString()}>
                          {lensClass.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tratamiento</Label>
                  <Select
                    value={selectedTreatment?.id.toString() || "all"}
                    onValueChange={(value) => {
                      if (value === "all") {
                        setSelectedTreatment(null);
                      } else {
                        const treatment = treatments.find(t => t.id.toString() === value);
                        setSelectedTreatment(treatment || null);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tratamiento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tratamientos</SelectItem>
                      {Array.isArray(treatments) && treatments.map(treatment => (
                        <SelectItem key={treatment.id} value={treatment.id.toString()}>
                          {treatment.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DrawerFooter className="flex flex-row justify-end gap-2 pt-4 border-t">
                <Button 
                  onClick={() => {
                    handleSearch();
                    setFilterDrawerOpen(false);
                  }}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                >
                  Aplicar filtros
                </Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
      
      {/* Tabs and display modes */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <div className="bg-white/60 backdrop-blur-sm p-1 border border-blue-100 rounded-lg shadow-sm">
            <div className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-sm rounded-md transition-all bg-blue-600 text-white px-3 py-2 flex items-center">
              <List className="h-4 w-4 mr-1.5" />
              Catálogo de Lentes
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 bg-white/60 backdrop-blur-sm p-1 border border-blue-100 rounded-lg shadow-sm">
          <Button
            variant={displayMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDisplayMode('grid')}
            className={`px-3 ${displayMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-transparent hover:text-blue-600'}`}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={displayMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDisplayMode('list')}
            className={`px-3 ${displayMode === 'list' ? 'bg-blue-600 text-white' : 'bg-transparent hover:text-blue-600'}`}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Active filters */}
      {(selectedType || selectedBrand || selectedMaterial || selectedLensClass || selectedTreatment) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedType && (
            <Badge variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1 bg-blue-100 text-blue-700 hover:bg-blue-200">
              Tipo: {selectedType.name}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => setSelectedType(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {selectedBrand && (
            <Badge variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1 bg-blue-100 text-blue-700 hover:bg-blue-200">
              Marca: {selectedBrand.name}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => setSelectedBrand(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {selectedMaterial && (
            <Badge variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100">
              Material: {selectedMaterial.name}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => setSelectedMaterial(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {selectedLensClass && (
            <Badge variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1 bg-amber-50 text-amber-600 hover:bg-amber-100">
              Clase: {selectedLensClass.name}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => setSelectedLensClass(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {selectedTreatment && (
            <Badge variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1 bg-sky-50 text-sky-600 hover:bg-sky-100">
              Tratamiento: {selectedTreatment.name}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => setSelectedTreatment(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-slate-600 hover:text-blue-600"
            onClick={resetFilters}
          >
            Limpiar todos
          </Button>
        </div>
      )}
      
      {/* Display lenses in grid or list view */}
      <div 
        className="mb-6 relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Page transition overlay */}
        {pageTransitioning && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl transition-all duration-300 ease-in-out">
            <div className="flex flex-col items-center">
              <div className="h-10 w-10 border-4 border-t-blue-600 border-blue-200 rounded-full animate-spin mb-3"></div>
              <p className="text-sm text-blue-700 font-medium">Cargando página {currentPage}...</p>
            </div>
          </div>
        )}
        
        {loading && !pageTransitioning ? (
          <div className="w-full py-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl border border-blue-100 shadow-lg">
            <div className="h-16 w-16 rounded-full border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent animate-spin mb-6"></div>
            <p className="text-slate-600 font-medium text-lg">Cargando lentes...</p>
            <p className="text-slate-500 text-sm mt-2">Estamos buscando las mejores opciones para ti</p>
          </div>
        ) : lenses.length === 0 ? (
          <div className="w-full py-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl border border-blue-100 shadow-lg">
            <div className="h-24 w-24 rounded-full bg-blue-600/10 flex items-center justify-center mb-6 animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-slate-800">No se encontraron lentes</h3>
            <p className="text-slate-600 text-center max-w-md mb-6 px-4">
              {activeTab === 'recommended' 
                ? 'No hay lentes recomendados que coincidan con la fórmula del cliente. Puede ver todas las opciones disponibles.'
                : 'No se encontraron lentes con los filtros seleccionados. Intente ajustar los criterios de búsqueda.'}
            </p>
            {activeTab === 'recommended' && (
              <Button 
                variant="default" 
                onClick={() => setActiveTab('all')}
                className="rounded-full px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all"
              >
                Ver todos los lentes
              </Button>
            )}
          </div>
        ) : displayMode === 'grid' ? (
          <div className="relative p-6 pt-8 pb-10 rounded-2xl overflow-hidden">
            {/* Blue transparent gradient background for card container */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-blue-300/10 to-indigo-500/5 backdrop-blur-sm rounded-2xl border border-blue-100/20 shadow-xl shadow-blue-900/5"></div>
            
            {/* Card grid with added padding to accommodate the background */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative transition-opacity duration-300">
              
              {Array.isArray(lenses) && lenses.map(lens => (
                                  <Card 
                    key={lens.id} 
                    className="group overflow-hidden border border-blue-200/30 transition-all duration-500 shadow-lg shadow-blue-900/10 hover:shadow-xl hover:shadow-blue-500/25 bg-white/95 backdrop-blur-md rounded-2xl hover:scale-[1.02] flex flex-col animate-fadeIn w-full relative cursor-pointer transform-gpu hover:border-blue-300/50"
                    onClick={() => handleSelectLens(lens)}
                  >
                    {/* Blue-Themed Badges */}
                    <div className="absolute top-2 right-2 z-30 flex flex-col gap-1">
                      {/* Cart Status Badge */}
                      {isLensInCart(lens.id) && (
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg py-1 px-2 rounded-full text-xs font-bold flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          EN CARRITO
                        </div>
                      )}
                      
                      {/* Discount Badge */}
                      {lens.has_discounts && (
                        <div className="bg-gradient-to-r from-indigo-600 to-blue-700 text-white shadow-lg py-1 px-2 rounded-full text-xs font-bold flex items-center gap-1">
                          <PercentIcon className="h-3 w-3" />
                          OFERTA
                        </div>
                      )}
                    </div>

                    {/* Beautiful Blue Header Section with Circular Forms */}
                    <div className="relative px-4 py-3 bg-gradient-to-br from-blue-100 via-indigo-100 to-blue-200 overflow-hidden border-b border-blue-300/60 shadow-sm">
                      {/* Circular Background Elements */}
                      <div className="absolute inset-0 opacity-40">
                        {/* Large primary circle */}
                        <div className="absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br from-blue-300 to-indigo-400 rounded-full blur-sm"></div>
                        {/* Medium secondary circle */}
                        <div className="absolute top-2 right-16 w-16 h-16 bg-gradient-to-bl from-indigo-200 to-blue-300 rounded-full blur-xs"></div>
                        {/* Small accent circle */}
                        <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-gradient-to-tr from-blue-200 to-indigo-200 rounded-full blur-sm"></div>
                        {/* Extra small circle */}
                        <div className="absolute bottom-6 left-12 w-8 h-8 bg-gradient-to-br from-indigo-300 to-blue-300 rounded-full blur-xs"></div>
                        {/* Floating top-left circle */}
                        <div className="absolute top-8 left-2 w-12 h-12 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-full blur-xs opacity-60"></div>
                      </div>
                      
                      <div className="relative z-10">
                        {/* Code and Type - Elegant Row */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-md">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 173 12V7a4 4 0 014-4z"/>
                            </svg>
                            L{lens.internal_code}
                          </div>
                          
                          {lens.type?.name && (
                            <Badge className={`text-xs font-medium px-2 py-0.5 border-0 shadow-sm ${
                              lens.type?.name === "Progresivo" 
                                ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white" 
                                : lens.type?.name.toLowerCase().includes('premium') || lens.type?.name.toLowerCase().includes('hd')
                                ? "bg-gradient-to-r from-indigo-500 to-blue-600 text-white"
                                : "bg-gradient-to-r from-blue-400 to-indigo-500 text-white"
                            }`}>
                              {lens.type?.name}
                            </Badge>
                          )}
                        </div>

                        {/* Elegant Title */}
                        <h3 className="font-semibold text-slate-800 text-sm leading-tight mb-1 line-clamp-2 group-hover:text-blue-800 transition-colors">
                          {lens.description}
                        </h3>

                        {/* Brand with Blue Accent */}
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500"></div>
                          <span className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                            {lens.brand?.name || 'Sin marca'}
                          </span>
                        </div>
                      </div>
                    </div>

                  {/* Elegant Content Section with Circular Background */}
                  <CardContent className="relative p-4 flex flex-col flex-grow space-y-3 bg-gradient-to-br from-white via-blue-50/70 to-indigo-50/70 overflow-hidden">
                    {/* Subtle Circular Background Elements */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none">
                      {/* Large background circle */}
                      <div className="absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br from-blue-200/60 to-indigo-200/60 rounded-full blur-lg"></div>
                      {/* Medium left circle */}
                      <div className="absolute top-1/2 -left-4 w-16 h-16 bg-gradient-to-tr from-indigo-100/70 to-blue-100/70 rounded-full blur-md"></div>
                      {/* Small bottom circle */}
                      <div className="absolute -bottom-4 right-8 w-12 h-12 bg-gradient-to-bl from-blue-200/50 to-slate-200/50 rounded-full blur-sm"></div>
                      {/* Tiny accent circles */}
                      <div className="absolute top-8 right-12 w-6 h-6 bg-gradient-to-r from-indigo-200/60 to-blue-200/60 rounded-full blur-xs"></div>
                      <div className="absolute bottom-12 left-8 w-8 h-8 bg-gradient-to-br from-blue-100/50 to-indigo-100/50 rounded-full blur-xs"></div>
                    </div>
                    
                    {/* Blue-Themed Material & Treatment Grid */}
                    <div className="relative z-10 grid grid-cols-2 gap-2">
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-2 rounded-lg border border-blue-200 shadow-md">
                        <p className="text-xs font-medium text-blue-700 mb-0.5">Material</p>
                        <p className="text-xs font-semibold text-slate-800 truncate">{lens.material?.name || 'N/A'}</p>
                      </div>
                      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-2 rounded-lg border border-indigo-200 shadow-md">
                        <p className="text-xs font-medium text-indigo-700 mb-0.5">Tratamiento</p>
                        <p className="text-xs font-semibold text-slate-800 truncate">{lens.treatment?.name || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Blue-Themed Optical Specifications */}
                    <div className="relative z-10 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 p-3 rounded-lg border border-blue-200 shadow-md">
                      <h4 className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-1">
                        <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        Especificaciones Ópticas
                      </h4>
                      
                      <div className="space-y-1.5">
                        {/* Blue-Themed Ranges */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="font-medium text-blue-800">Esfera:</span>
                          </div>
                          <span className="font-mono font-semibold text-slate-800 bg-white px-1.5 py-0.5 rounded border text-xs">
                            {lens.sphere_min !== null && lens.sphere_max !== null && 
                             lens.sphere_min !== undefined && lens.sphere_max !== undefined
                              ? `${parseFloat(lens.sphere_min.toString()).toFixed(2)} a ${parseFloat(lens.sphere_max.toString()).toFixed(2)}` 
                              : 'No especificado'}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                            <span className="font-medium text-indigo-800">Cilindro:</span>
                          </div>
                          <span className="font-mono font-semibold text-slate-800 bg-white px-1.5 py-0.5 rounded border text-xs">
                            {lens.cylinder_min !== null && lens.cylinder_max !== null && 
                             lens.cylinder_min !== undefined && lens.cylinder_max !== undefined
                              ? `${parseFloat(lens.cylinder_min.toString()).toFixed(2)} a ${parseFloat(lens.cylinder_max.toString()).toFixed(2)}` 
                              : 'No especificado'}
                          </span>
                        </div>
                        
                        {(lens.addition_min !== null && lens.addition_max !== null && 
                          lens.addition_min !== undefined && lens.addition_max !== undefined) && (
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                              <span className="font-medium text-blue-800">Adición:</span>
                            </div>
                            <span className="font-mono font-semibold text-slate-800 bg-white px-1.5 py-0.5 rounded border text-xs">
                              {`${parseFloat(lens.addition_min.toString()).toFixed(2)} a ${parseFloat(lens.addition_max.toString()).toFixed(2)}`}
                            </span>
                          </div>
                        )}
                        
                        {/* Lens Class */}
                        {lens.lens_class?.name && (
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                              <span className="font-medium text-indigo-800">Clase:</span>
                            </div>
                            <span className="font-semibold text-slate-800 bg-white px-1.5 py-0.5 rounded border text-xs">
                              {lens.lens_class.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Elegant Additional Features */}
                    {(lens.uv_protection || lens.photochromic?.name || lens.availability) && (
                      <div className="relative z-10 flex flex-wrap gap-1 mt-2">
                        {lens.uv_protection && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium border border-gray-200">
                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            UV
                          </span>
                        )}
                        
                        {lens.photochromic?.name && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs font-medium border border-slate-200">
                            <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                            Fotocromático
                          </span>
                        )}
                        
                        {lens.availability && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                            lens.availability === 'in_stock' 
                              ? 'bg-gray-100 text-gray-700 border-gray-200'
                              : lens.availability === 'low_stock'
                              ? 'bg-gray-200 text-gray-800 border-gray-300'
                              : 'bg-gray-300 text-gray-900 border-gray-400'
                          }`}>
                            <div className={`w-2 h-2 rounded-full ${
                              lens.availability === 'in_stock' 
                                ? 'bg-green-500'
                                : lens.availability === 'low_stock'
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}></div>
                            {lens.availability === 'in_stock' ? 'En Stock' : 
                             lens.availability === 'low_stock' ? 'Stock Bajo' : 
                             lens.availability === 'out_of_stock' ? 'Sin Stock' : 
                             lens.availability}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Blue-Themed Price and Actions Section */}
                    <div className="relative z-10 bg-gradient-to-br from-blue-50 to-indigo-100 p-3 rounded-lg border border-blue-200 shadow-md mt-3">
                      {lens.has_discounts ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600">Precio original</span>
                            <span className="text-xs line-through text-slate-500 font-medium">
                              {formatPrice(lens.price)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              <span className="text-xs font-medium text-green-700">Con descuento</span>
                            </div>
                            <span className="text-lg font-bold text-green-800">
                              {formatPrice(discountService.calculateDiscountedPrice(parseFloat(lens.price.toString()), lens.discount_percentage || 0))}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="text-xs font-medium text-blue-800">Precio</span>
                          </div>
                          <SessionLensPriceDisplay
                            lensId={lens.id}
                            basePrice={lens.price}
                            size="lg"
                            className="font-bold"
                          />
                        </div>
                      )}
                      
                      {/* Blue-Themed Action Buttons */}
                                              <div className="mt-3 space-y-2">
                          {/* Price Modification Button - Only for receptionist/admin */}
      
                          
                          {/* Cart Action Button */}
                        {isLensInCart(lens.id) ? (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromCart(lens.id);
                            }}
                            variant="outline"
                            size="sm"
                            className="w-full h-8 bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300 transition-all duration-300 text-xs"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Quitar del Carrito
                          </Button>
                        ) : (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(lens);
                            }}
                            variant="outline"
                            size="sm"
                            className="w-full h-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-800 hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 transition-all duration-300 text-xs font-medium"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Agregar al Carrito
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card className="bg-white/80 backdrop-blur-sm border border-blue-100/60 shadow-lg overflow-hidden rounded-xl animate-fadeIn w-full max-w-none mx-auto">
            <div className="divide-y divide-gray-100 relative">
              {/* Table header - Sticky */}
              <div className="grid grid-cols-12 p-5 gap-6 bg-gradient-to-r from-slate-100 to-gray-100 font-medium text-gray-700 sticky top-0 z-10 shadow-sm">
                <div className="col-span-5 text-slate-800">Descripción</div>
                <div className="col-span-3 text-slate-800">Tipo y Marca</div>
                <div className="col-span-2 text-slate-800">Material</div>
                <div className="col-span-2 text-right text-slate-800">Precio</div>
              </div>
              
              {/* Table rows */}
              {Array.isArray(lenses) && lenses.map((lens, index) => (
                <div 
                  key={lens.id}
                  className={`grid grid-cols-12 p-5 gap-6 hover:bg-slate-50 transition-all duration-300 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                  } relative`}
                >
                  {lens.has_discounts && (
                    <div className="absolute -right-12 top-6 transform rotate-45 z-10 w-[180px]">
                      <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-lg py-1 px-12 text-center text-xs font-bold animate-pulse">
                        DESCUENTO
                      </div>
                    </div>
                  )}
                  {/* Description Column */}
                  <div className="col-span-5">
                    <div className="font-normal text-sm text-slate-600 leading-normal break-words">
                      {lens.description}
                    </div>
                    <div className="text-sm text-slate-600 mt-1.5 flex flex-wrap gap-2">
                      <span className="inline-block text-xs font-medium text-slate-500">
                        L{lens.internal_code}
                      </span>
                    </div>
                    <div className="flex gap-1 mt-2">
                      <Button 
                        onClick={() => handleSelectLens(lens)}
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 gap-1 hover:bg-slate-100 hover:text-slate-800 rounded-full"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span className="text-xs">Ver</span>
                      </Button>
                      {/* Price Modification Button - Only for receptionist/admin */}
                      {(user?.role === 'receptionist' || user?.role === 'admin') && (
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLensForPriceAdjustment(lens);
                            setPriceAdjustmentModalOpen(true);
                          }}
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-2 gap-1 hover:bg-green-100 hover:text-green-700 rounded-full text-green-600"
                        >
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span className="text-xs">Modificar</span>
                        </Button>
                      )}
                      {isLensInCart(lens.id) ? (
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromCart(lens.id);
                          }}
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-2 gap-1 hover:bg-red-100 hover:text-red-700 rounded-full text-red-600"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span className="text-xs">Quitar</span>
                        </Button>
                      ) : (
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(lens);
                          }}
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-2 gap-1 hover:bg-green-100 hover:text-green-700 rounded-full text-green-600"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span className="text-xs">Agregar</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Type and Brand Column */}
                  <div className="col-span-3 flex flex-col justify-center">
                    {lens.type?.name && (
                      <Badge className={`w-fit text-xs px-2 py-0.5 mb-2 ${
                        lens.type.name === "Progresivo" 
                          ? "bg-green-100 text-green-700" 
                          : lens.type.name.toLowerCase().includes('hd') || lens.type.name.toLowerCase().includes('premium')
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {lens.type.name}
                      </Badge>
                    )}
                    <div className="text-sm font-medium text-slate-700">
                      {lens.brand?.name || 'Sin Marca'}
                    </div>
                    {lens.photochromic?.name && (
                      <div className="text-xs text-slate-600 mt-1">
                        {lens.photochromic.name}
                      </div>
                    )}
                  </div>

                  {/* Material Column */}
                  <div className="col-span-2 flex flex-col justify-center">
                    <div className="text-sm text-slate-700">
                      {lens.material?.name}
                    </div>
                    {lens.treatment?.name && (
                      <div className="text-xs text-slate-600 mt-1">
                        {lens.treatment.name}
                      </div>
                    )}
                    {lens.lens_class?.name && (
                      <div className="text-xs text-slate-600 mt-0.5">
                        {lens.lens_class.name}
                      </div>
                    )}
                    
                    {/* Additional technical info */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {lens.uv_protection && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          UV
                        </span>
                      )}
                      {lens.diameter && (
                        <span className="inline-block px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                          ⌀{lens.diameter.toFixed(1)}mm
                        </span>
                      )}
                      {lens.availability && lens.availability !== 'in_stock' && (
                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${
                          lens.availability === 'low_stock' 
                            ? 'bg-yellow-100 text-yellow-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {lens.availability === 'low_stock' ? 'Stock Bajo' : 'Sin Stock'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price Column */}
                  <div className="col-span-2 flex flex-col justify-center items-end">
                    {lens.has_discounts ? (
                      <div className="text-right px-3 py-1.5 rounded-full hover:bg-[#425e79]/10 transition-all duration-300 z-20 relative">
                        <div className="line-through text-sm text-gray-400 font-medium">
                          {formatPrice(lens.price)}
                        </div>
                        <div className="flex items-center justify-end gap-1">
                          <Tag className="h-4 w-4 text-green-600 mr-0.5" />
                          <span className="text-green-600 font-bold">
                            {formatPrice(discountService.calculateDiscountedPrice(parseFloat(lens.price.toString()), lens.discount_percentage || 0))}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-right font-bold relative group/price px-3 py-1.5 rounded-full hover:bg-[#425e79]/10 transition-all duration-300">
                        <div className="relative z-10 flex items-center justify-end">
                          <Tag className="h-4 w-4 text-[#425e79] mr-1.5 group-hover/price:text-[#425e79]/80 transition-colors" />
                          <span className="text-[#425e79]">
                            {formatPrice(lens.price)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
      
      {/* Pagination controls */}
      {!loading && Array.isArray(lenses) && lenses.length > 0 && (
        <div className="flex justify-center gap-1.5 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || pageTransitioning}
            className="h-9 w-9 p-0 rounded-lg bg-white/80 border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-600 disabled:opacity-50 transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            
            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePageChange(pageNum)}
                disabled={pageTransitioning}
                className={`h-9 w-9 p-0 rounded-lg font-medium transition-all ${
                  currentPage === pageNum 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' 
                    : 'bg-white/80 border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-600'
                }`}
              >
                {pageNum}
              </Button>
            );
          })}
          {totalPages > 5 && currentPage < totalPages - 2 && (
            <span className="flex items-center px-1 text-gray-400">...</span>
          )}
          {totalPages > 5 && currentPage < totalPages - 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={pageTransitioning}
              className="h-9 w-9 p-0 rounded-lg bg-white/80 border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-600 transition-all"
            >
              {totalPages}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || pageTransitioning}
            className="h-9 w-9 p-0 rounded-lg bg-white/80 border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-600 disabled:opacity-50 transition-all"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
       
      {/* Lens details modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedLensForDetails && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">
                  {selectedLensForDetails.description}
                </DialogTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="inline-block px-2 py-1 bg-gray-100 rounded text-sm">
                    Código: {selectedLensForDetails.internal_code}
                  </span>
                  <span className="inline-block px-2 py-1 bg-gray-100 rounded text-sm">
                    Tipo: {selectedLensForDetails.type?.name}
                  </span>
                  <span className="inline-block px-2 py-1 bg-gray-100 rounded text-sm">
                    Marca: {selectedLensForDetails.brand?.name}
                  </span>
                </div>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div className="space-y-6">
                   <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-md hover:shadow-lg transition-shadow duration-300">
                     <h3 className="text-lg font-semibold mb-4 text-emerald-600 flex items-center gap-2">
                       <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                         <path d="M12 20h9"></path>
                         <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                       </svg>
                       Especificaciones Técnicas
                     </h3>
                     <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                       <div className="text-sm font-medium text-gray-600">Código interno:</div>
                       <div className="text-sm text-gray-800 font-medium">{selectedLensForDetails.internal_code}</div>
                       
                       <div className="text-sm font-medium text-gray-600">Tipo:</div>
                       <div className="text-sm text-gray-800 font-medium">{selectedLensForDetails.type?.name}</div>
                       
                       <div className="text-sm font-medium text-gray-600">Marca:</div>
                       <div className="text-sm text-gray-800 font-medium">{selectedLensForDetails.brand?.name}</div>
                       
                       <div className="text-sm font-medium text-gray-600">Material:</div>
                       <div className="text-sm text-gray-800 font-medium">{selectedLensForDetails.material?.name}</div>
                       
                       <div className="text-sm font-medium text-gray-600">Clase:</div>
                       <div className="text-sm text-gray-800 font-medium">{selectedLensForDetails.lens_class?.name}</div>
                       
                       <div className="text-sm font-medium text-gray-600">Tratamiento:</div>
                       <div className="text-sm text-gray-800 font-medium">{selectedLensForDetails.treatment?.name}</div>
                       
                       <div className="text-sm font-medium text-gray-600">Proveedor:</div>
                       <div className="text-sm text-gray-800 font-medium">{selectedLensForDetails.supplier?.name}</div>
                     </div>
                   </div>
                   
                   <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-md hover:shadow-lg transition-shadow duration-300">
                     <h3 className="text-lg font-semibold mb-4 text-emerald-600 flex items-center gap-2">
                       <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                         <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                         <path d="M7 12s2.5-2.5 5-2.5 5 2.5 5 2.5"></path>
                         <path d="M7 12s2.5 2.5 5 2.5 5-2.5 5-2.5"></path>
                         <path d="M12 9.5V8"></path>
                         <path d="M12 16v-1.5"></path>
                       </svg>
                       Rangos Ópticos
                     </h3>
                     <div className="space-y-4">
                       <div className="flex flex-col">
                         <div className="text-sm font-medium text-gray-600 mb-1 flex items-center">
                           <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                           Rango de Esfera:
                         </div>
                         <div className="flex items-center bg-blue-50 p-2 rounded-lg border border-blue-100">
                           <div className="bg-white text-blue-600 font-medium text-sm px-3 py-1.5 rounded-md shadow-sm border border-blue-200 font-mono">
                             {selectedLensForDetails.sphere_min !== null && selectedLensForDetails.sphere_max !== null && 
                              selectedLensForDetails.sphere_min !== undefined && selectedLensForDetails.sphere_max !== undefined
                               ? `${parseFloat(selectedLensForDetails.sphere_min.toString()).toFixed(2)} a ${parseFloat(selectedLensForDetails.sphere_max.toString()).toFixed(2)}` 
                               : 'No especificado'}
                           </div>
                         </div>
                       </div>
                       
                       <div className="flex flex-col">
                         <div className="text-sm font-medium text-gray-600 mb-1 flex items-center">
                           <div className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></div>
                           Rango de Cilindro:
                         </div>
                         <div className="flex items-center bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                           <div className="bg-white text-indigo-600 font-medium text-sm px-3 py-1.5 rounded-md shadow-sm border border-indigo-200 font-mono">
                             {selectedLensForDetails.cylinder_min !== null && selectedLensForDetails.cylinder_max !== null && 
                              selectedLensForDetails.cylinder_min !== undefined && selectedLensForDetails.cylinder_max !== undefined
                               ? `${parseFloat(selectedLensForDetails.cylinder_min.toString()).toFixed(2)} a ${parseFloat(selectedLensForDetails.cylinder_max.toString()).toFixed(2)}` 
                               : 'No especificado'}
                           </div>
                         </div>
                       </div>
                       
                       <div className="flex flex-col">
                         <div className="text-sm font-medium text-gray-600 mb-1 flex items-center">
                           <div className="w-2 h-2 rounded-full bg-sky-500 mr-2"></div>
                           Rango de Adición:
                         </div>
                         <div className="flex items-center bg-sky-50 p-2 rounded-lg border border-sky-100">
                           <div className="bg-white text-sky-600 font-medium text-sm px-3 py-1.5 rounded-md shadow-sm border border-sky-200 font-mono">
                             {selectedLensForDetails.addition_min !== null && selectedLensForDetails.addition_max !== null && 
                              selectedLensForDetails.addition_min !== undefined && selectedLensForDetails.addition_max !== undefined
                               ? `${parseFloat(selectedLensForDetails.addition_min.toString()).toFixed(2)} a ${parseFloat(selectedLensForDetails.addition_max.toString()).toFixed(2)}` 
                               : 'No especificado'}
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>
                 
                 <div className="space-y-6">
                   <div className="bg-white p-6 rounded-xl border-2 border-emerald-300 shadow-lg relative overflow-hidden">
                     {selectedLensForDetails.has_discounts && (
                       <div className="absolute -right-12 top-6 transform rotate-45 z-20">
                         <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-lg py-1 px-12 text-center text-xs font-bold animate-pulse">
                           DESCUENTO
                         </div>
                       </div>
                     )}
                     
                     <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-200 to-purple-500/20 rounded-full -mr-6 -mt-6"></div>
                     
                     <div className="flex justify-between items-center relative z-10 mb-4">
                       <h3 className="text-xl font-bold text-gray-800">Precio</h3>
                       <div className="text-2xl font-bold text-slate-700">
                         {formatPrice(selectedLensForDetails.price)}
                       </div>
                     </div>
                     
                     <div className="w-full h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent my-4"></div>
                     
                     <div className="space-y-4 relative z-10">
                       <h4 className="font-medium text-gray-700">Características destacadas:</h4>
                       <ul className="space-y-3">
                         <li className="flex items-start gap-3 bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                           <div className="h-6 w-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                             <Check className="h-4 w-4 text-emerald-700" />
                           </div>
                           <span className="text-gray-600">Material: <strong className="text-gray-800">{selectedLensForDetails.material?.name}</strong></span>
                         </li>
                         <li className="flex items-start gap-3 bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                           <div className="h-6 w-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                             <Check className="h-4 w-4 text-emerald-700" />
                           </div>
                           <span className="text-gray-600">Tratamiento: <strong className="text-gray-800">{selectedLensForDetails.treatment?.name}</strong></span>
                         </li>
                         {selectedLensForDetails.photochromic && (
                           <li className="flex items-start gap-3 bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                             <div className="h-6 w-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                               <Check className="h-4 w-4 text-emerald-700" />
                             </div>
                             <span className="text-gray-600">Fotocromático: <strong className="text-gray-800">{selectedLensForDetails.photochromic?.name}</strong></span>
                           </li>
                         )}
                         <li className="flex items-start gap-3 bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                           <div className="h-6 w-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                             <Check className="h-4 w-4 text-emerald-700" />
                           </div>
                           <span className="text-gray-600">Marca de prestigio: <strong className="text-gray-800">{selectedLensForDetails.brand?.name}</strong></span>
                         </li>
                       </ul>
                     </div>
                     
                     <div className="flex gap-2 mt-6">
                       {isLensInCart(selectedLensForDetails.id) ? (
                         <Button
                           onClick={() => removeFromCart(selectedLensForDetails.id)}
                           variant="outline"
                           className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                         >
                           <X className="h-4 w-4 mr-2" />
                           Quitar del Carrito
                         </Button>
                       ) : (
                         <Button
                           onClick={() => addToCart(selectedLensForDetails)}
                           className="flex-1 bg-green-600 hover:bg-green-700"
                         >
                           <Plus className="h-4 w-4 mr-2" />
                           Agregar al Carrito
                         </Button>
                       )}
                     </div>
                   </div>
                   

                 </div>
               </div>
              
              <DialogFooter className="mt-6">
                <DialogClose asChild>
                  <Button variant="outline">Cerrar</Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>



      {/* Floating Cart Button */}
      {selectedLenses.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setCartOpen(true)}
            className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-white"
          >
            <div className="relative">
              <ShoppingBag className="h-6 w-6 text-white" />
              <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white p-0 flex items-center justify-center text-xs">
                {selectedLenses.length}
              </Badge>
            </div>
          </Button>
        </div>
      )}

      {/* Cart Drawer */}
      <Drawer open={cartOpen} onOpenChange={setCartOpen}>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Carrito de Compras ({selectedLenses.length} items)
            </DrawerTitle>
          </DrawerHeader>
          <div className="p-4 max-h-96 overflow-y-auto">
            {selectedLenses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No hay lentes en el carrito</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedLenses.map((lens) => (
                  <div key={lens.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{lens.description}</h4>
                      <p className="text-xs text-gray-600">Código: {lens.internal_code}</p>
                      <p className="text-xs text-gray-600">Marca: {lens.brand?.name}</p>
                      <p className="font-medium text-blue-600">{formatPrice(lens.price)}</p>
                    </div>
                    <Button
                      onClick={() => removeFromCart(lens.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DrawerFooter>
            <div className="flex gap-2">
              <Button
                onClick={clearCart}
                variant="outline"
                className="flex-1"
                disabled={selectedLenses.length === 0}
              >
                Vaciar Carrito
              </Button>
              <Button
                onClick={handleCompleteSale}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={selectedLenses.length === 0}
              >
                Continuar Venta
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

              {/* Session Price Adjustment Modal */}
        {selectedLensForPriceAdjustment && (
          <SessionLensPriceAdjustmentModal
            isOpen={priceAdjustmentModalOpen}
            onClose={() => {
              setPriceAdjustmentModalOpen(false);
              setSelectedLensForPriceAdjustment(null);
            }}
            lens={selectedLensForPriceAdjustment}
            onAdjustmentCreated={(adjustedPrice: number) => {
              toast({
                title: "Precio ajustado",
                description: "El precio del lente ha sido modificado para esta sesión de venta.",
              });
              // Optionally refresh the lens data or update local state
            }}
          />
        )}
    </div>
  );
};

export default SalesCatalog;
