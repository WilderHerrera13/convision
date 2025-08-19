import React, { useState, useEffect, useRef, TouchEvent } from 'react';
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
  Percent as PercentIcon
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ApiService from '@/services/ApiService';
import SearchableSelect, { SelectOption } from '@/components/ui/SearchableSelect';
import { lensService } from '@/services/lensService';
import { prescriptionService } from '@/services/prescriptionService';
import { formatCurrency } from '@/lib/utils';
import { discountService } from '@/services/discountService';

// Use imported types instead of redefining
import type { Lens, FilterOption, LensSearchParams } from '@/services/lensService';

// Types
interface PaginatedResponse {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  data: Lens[]; // Replace any[] with Lens[]
}

interface ApiResponse<T> {
  data: T;
  message?: string;
  status?: number;
}

interface ApiPrescriptionResponse {
  data: {
    id: number;
    right_sphere: string;
    left_sphere: string;
    right_cylinder: string;
    left_cylinder: string;
    right_addition: string;
    left_addition: string;
    right_axis: string;
    left_axis: string;
    [key: string]: string | number; // Replace any with union of allowed types
  };
}

interface SaleData {
  appointmentId?: number;
  patientId?: number;
  patientName?: string;
  prescription?: {
    id: number;
    recommendation?: string;
    observation?: string;
  };
  selectedLens?: Lens | null;
}

// Format price as currency
const formatPrice = (price: string | number) => {
  return formatCurrency(price, 'COP');
};

const SalesCatalog: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [lenses, setLenses] = useState<Lens[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid');
  const [saleData, setSaleData] = useState<SaleData | null>(null);
  const [selectedLens, setSelectedLens] = useState<Lens | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageTransitioning, setPageTransitioning] = useState(false);
  
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
  const [recommendedLenses, setRecommendedLenses] = useState<Lens[]>([]);
  
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

  // Get sale data from session storage
  useEffect(() => {
    const storedSaleData = sessionStorage.getItem('pendingSale');
    if (storedSaleData) {
      const parsedData = JSON.parse(storedSaleData) as SaleData;
      setSaleData(parsedData);
      
      // If there's a prescription with recommendation, default to the recommended tab
      if (parsedData.prescription?.recommendation) {
        setActiveTab('recommended');
      }
    } else {
      // No sale data, navigate back
      toast({
        title: "No hay venta en progreso",
        description: "No se encontró información de venta en progreso.",
        variant: "destructive",
      });
      navigate('/receptionist/appointments');
    }
  }, [navigate]);
  
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
  
  // Load lenses with filters
  const loadLenses = async (tab: string = activeTab) => {
    try {
      setLoading(true);
      console.log(`Loading lenses for tab: ${tab}`);
      
      // Build search parameters
      const searchParams: LensSearchParams = {
        page: currentPage,
        perPage: perPage,
        query: searchQuery || undefined
      };
      
      // Apply filters if they're selected
      if (selectedBrand) searchParams.brandId = selectedBrand.id;
      if (selectedMaterial) searchParams.materialId = selectedMaterial.id;
      if (selectedLensClass) searchParams.lensClassId = selectedLensClass.id;
      if (selectedTreatment) searchParams.treatmentId = selectedTreatment.id;
      
      // Search for lenses
      const response = await lensService.searchLenses(searchParams);
      
      // Handle recommended tab
      if (tab === 'recommended' && saleData?.prescription?.id) {
        await filterLensesByPrescription(response.data, saleData.prescription.id);
      } else {
        setLenses(response.data);
        
        // Show error if no results with applied filters
        if (response.data.length === 0) {
          if (getActiveFiltersCount() > 0) {
            setFilterError('No se encontraron lentes con los filtros seleccionados. Prueba con diferentes criterios.');
          } else {
            setFilterError('No se encontraron lentes.');
          }
        } else {
          setFilterError(null);
        }
      }
      
      setTotalPages(response.last_page);
      
    } catch (error) {
      console.error('Error loading lenses:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los lentes. Intenta nuevamente más tarde.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setPageTransitioning(false);
    }
  };
  
  // Filter lenses based on prescription values
  const filterLensesByPrescription = async (lensData: Lens[], prescriptionId: number) => {
    try {
      console.log(`Filtering lenses by prescription ID: ${prescriptionId}`);
      
      // Get prescription details
      const prescriptionResponse = await prescriptionService.getPrescription(prescriptionId);
      const prescription = prescriptionResponse;
      
      console.log('Prescription data:', prescription);
      
      // Get values from prescription to filter lenses
      const rightSphere = parseFloat(prescription.right_sphere || '0');
      const leftSphere = parseFloat(prescription.left_sphere || '0');
      const rightCylinder = parseFloat(prescription.right_cylinder || '0');
      const leftCylinder = parseFloat(prescription.left_cylinder || '0');
      const rightAddition = parseFloat(prescription.right_addition || '0');
      const leftAddition = parseFloat(prescription.left_addition || '0');
      
      // Get min and max values for filtering
      const sphereMin = Math.min(rightSphere, leftSphere);
      const sphereMax = Math.max(rightSphere, leftSphere);
      const cylinderMin = Math.min(rightCylinder, leftCylinder);
      const cylinderMax = Math.max(rightCylinder, leftCylinder);
      const additionMin = Math.min(rightAddition, leftAddition);
      const additionMax = Math.max(rightAddition, leftAddition);
      
      // Filter lenses that match the prescription values
      const filteredLenses = lensData.filter(lens => {
        // Skip lenses that don't have sphere or cylinder range defined
        if (!lens.sphere_min || !lens.sphere_max || 
            !lens.cylinder_min || !lens.cylinder_max) {
          return false;
        }
        
        // Parse lens range values - ensure we're working with numbers
        const lensSphereMin = parseFloat(String(lens.sphere_min)) || 0;
        const lensSphereMax = parseFloat(String(lens.sphere_max)) || 0;
        const lensCylinderMin = parseFloat(String(lens.cylinder_min)) || 0;
        const lensCylinderMax = parseFloat(String(lens.cylinder_max)) || 0;
        
        // Handle addition values which may be null
        let lensAdditionMin = null;
        if (lens.addition_min !== null && lens.addition_min !== undefined) {
          lensAdditionMin = parseFloat(String(lens.addition_min)) || 0;
        }
        
        let lensAdditionMax = null;
        if (lens.addition_max !== null && lens.addition_max !== undefined) {
          lensAdditionMax = parseFloat(String(lens.addition_max)) || 0;
        }
        
        // Check if lens ranges include the prescription values
        const matchesSphere = 
          (sphereMin >= lensSphereMin && sphereMin <= lensSphereMax) ||
          (sphereMax >= lensSphereMin && sphereMax <= lensSphereMax) ||
          (lensSphereMin >= sphereMin && lensSphereMax <= sphereMax);
        
        const matchesCylinder = 
          (cylinderMin >= lensCylinderMin && cylinderMin <= lensCylinderMax) ||
          (cylinderMax >= lensCylinderMin && cylinderMax <= lensCylinderMax) ||
          (lensCylinderMin >= cylinderMin && lensCylinderMax <= cylinderMax);
        
        // Only check addition if it's greater than 0
        let matchesAddition = true;
        if (additionMax > 0) {
          // If lens doesn't have addition values, it can't be a progressive/bifocal lens
          if (lensAdditionMin === null || lensAdditionMax === null) {
            matchesAddition = false;
          } else {
            matchesAddition = 
              (additionMin >= lensAdditionMin && additionMin <= lensAdditionMax) ||
              (additionMax >= lensAdditionMin && additionMax <= lensAdditionMax) ||
              (lensAdditionMin >= additionMin && lensAdditionMax <= additionMax);
          }
        } else {
          // If no addition is needed, prefer lenses without addition values
          matchesAddition = lensAdditionMin === null && lensAdditionMax === null;
        }
        
        return matchesSphere && matchesCylinder && matchesAddition;
      });
      
      console.log(`Filtered ${lensData.length} lenses down to ${filteredLenses.length} matching the prescription`);
      
      setLenses(filteredLenses);
      setRecommendedLenses(filteredLenses);
      
      if (filteredLenses.length === 0) {
        setFilterError('No se encontraron lentes que coincidan con la prescripción');
        toast({
          title: "Sin coincidencias",
          description: "No se encontraron lentes que coincidan con la prescripción",
          variant: "destructive",
        });
      } else {
        setFilterError(null);
      }
    } catch (error) {
      console.error('Error filtering lenses by prescription:', error);
      toast({
        title: "Error",
        description: "Error al filtrar lentes por prescripción",
        variant: "destructive",
      });
      setLenses(lensData); // Fall back to unfiltered lenses
    }
  };
  
  // Load lenses when component mounts and when tab changes
  useEffect(() => {
    loadLenses(activeTab);
  }, [currentPage, activeTab]);
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1);
  };
  
  // Handle selecting a lens for purchase
  const handleSelectLens = (lens: Lens) => {
    setSelectedLens(lens);
    setDetailsOpen(true);
  };
  
  // Complete sale with selected lens
  const handleCompleteSale = () => {
    if (!selectedLens || !saleData) return;
    
    try {
      console.log('Lens seleccionado para venta:', selectedLens);
      
      // Update sale data with selected lens and explicitly include has_discounts
      const updatedSaleData = {
        ...saleData,
        selectedLens: {
          ...selectedLens,
          has_discounts: selectedLens.has_discounts || false,
        }
      };
      
      console.log('Datos de venta actualizados a guardar:', updatedSaleData);
      
      // Save updated data to session storage
      sessionStorage.setItem('pendingSale', JSON.stringify(updatedSaleData));
      
      toast({
        title: "Lente seleccionado",
        description: `Se ha seleccionado el lente ${selectedLens.description}`,
      });
      
      // Navigate to the sales form
      navigate('/receptionist/sales/new');
    } catch (error) {
      console.error('Error completing sale:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Ocurrió un error al seleccionar el lente. Inténtalo de nuevo.',
      });
    }
  };
  
  // Handle search - Updated to use debounce pattern
  const handleSearch = () => {
    console.log('Ejecutando búsqueda con query:', searchQuery);
    setCurrentPage(1);
    loadLenses();
  };

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
        {selectedLens && (
          <Button 
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleCompleteSale}
          >
            <Check className="h-4 w-4" />
            Completar Venta
          </Button>
        )}
      </div>
      
      {/* Search and filters */}
      <div className="flex gap-3 items-center">
        <div className="relative grow max-w-xl">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Buscar por descripción..."
            className="pl-10 border-blue-100 focus-visible:ring-blue-500 pr-12 bg-white/80 backdrop-blur-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
          />
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute right-0 top-0 h-full px-3 text-blue-600 hover:text-blue-700 hover:bg-transparent"
            onClick={handleSearch}
          >
            Buscar
          </Button>
        </div>
        
        <div>
          <Drawer open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
                              <h4 className="font-bold text-lg text-emerald-800">¡Ahorra con este descuento!</h4>
                              <p className="text-sm text-emerald-700">Descuento especial aprobado para este producto</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 mt-3">
                            <div className="bg-white p-3 rounded-lg border border-green-100 flex flex-col items-center">
                              <span className="text-xs text-gray-500 mb-1">Precio original</span>
                              <span className="text-sm font-medium text-gray-700 line-through">{formatPrice(selectedLens.price)}</span>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-green-100 flex flex-col items-center">
                              <span className="text-xs text-gray-500 mb-1">Ahorras</span>
                              <span className="text-sm font-medium text-red-600">{formatPrice(Number(selectedLens.price) * 0.15)}</span>
                            </div>
                            <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-3 rounded-lg border border-green-200 flex flex-col items-center shadow-sm">
                              <span className="text-xs text-emerald-700 mb-1 font-medium">Precio final</span>
                              <span className="text-base font-bold text-emerald-700">{formatPrice(Number(selectedLens.price) * 0.85)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent my-4"></div>
                    
                    <div className="space-y-4 relative z-10">
                      <h4 className="font-medium text-gray-700">Características destacadas:</h4>
                      <ul className="space-y-3">
                        <li className="flex items-start gap-3 bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                          <div className="h-6 w-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="h-4 w-4 text-emerald-700" />
                          </div>
                          <span className="text-gray-600">Material: <strong className="text-gray-800">{selectedLens.material?.name}</strong></span>
                        </li>
                        <li className="flex items-start gap-3 bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                          <div className="h-6 w-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="h-4 w-4 text-emerald-700" />
                          </div>
                          <span className="text-gray-600">Tratamiento: <strong className="text-gray-800">{selectedLens.treatment?.name}</strong></span>
                        </li>
                        {selectedLens.photochromic && (
                          <li className="flex items-start gap-3 bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                            <div className="h-6 w-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Check className="h-4 w-4 text-emerald-700" />
                            </div>
                            <span className="text-gray-600">Fotocromático: <strong className="text-gray-800">{selectedLens.photochromic?.name}</strong></span>
                          </li>
                        )}
                        <li className="flex items-start gap-3 bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                          <div className="h-6 w-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="h-4 w-4 text-emerald-700" />
                          </div>
                          <span className="text-gray-600">Marca de prestigio: <strong className="text-gray-800">{selectedLens.brand?.name}</strong></span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="flex flex-col gap-2 mt-6">
                      <button 
                        onClick={handleCompleteSale}
                        className="w-full py-6 px-4 text-lg font-medium flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white shadow-lg hover:shadow-emerald-700/30 transition-all rounded-xl relative overflow-hidden group"
                      >
                        <span className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-yellow-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                        <ShoppingBag className="h-5 w-5 relative z-10" />
                        <span className="relative z-10">Seleccionar este lente</span>
                      </button>
                      <p className="text-xs text-center mt-2 flex justify-center items-center gap-1">
                        <span className="text-gray-500">Al seleccionar este lente continuará al proceso de venta</span>
                        <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-emerald-100">
                          <Check className="h-2.5 w-2.5 text-emerald-700" />
                        </span>
                      </p>
                    </div>
                  </div>
                  
                  {saleData?.prescription?.recommendation && (
                    <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100 shadow-md">
                      <h3 className="font-medium text-emerald-800 mb-3 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        Recomendación del Especialista
                      </h3>
                      <p className="text-emerald-700 text-sm bg-emerald-100/50 p-3 rounded-lg border border-emerald-200/50">{saleData.prescription.recommendation}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <DialogFooter className="px-6 py-4 bg-gray-50 border-t flex-shrink-0 sticky bottom-0 z-10">
                <DialogClose asChild>
                  <Button variant="outline" className="rounded-full px-6 border-gray-300 hover:bg-gray-100">Cancelar</Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesCatalog;
