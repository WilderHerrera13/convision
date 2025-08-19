import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter 
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription,
  AlertTitle
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Glasses, 
  Search, 
  X, 
  Filter, 
  Check, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  ShoppingBag,
  Sparkles,
  ListFilter,
  ArrowUpDown
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { lensService, Lens, FilterOption, LensSearchParams } from '@/services/lensService';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import Pagination from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import SearchableSelect, { SelectOption } from '@/components/ui/SearchableSelect';
import { prescriptionService } from '@/services/prescriptionService';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';

interface LensRecommendationProps {
  onSelectLens: (lens: Lens | null) => void;
  selectedLens: Lens | null;
  prescriptionId?: number;
}

const LensRecommendation: React.FC<LensRecommendationProps> = ({ onSelectLens, selectedLens, prescriptionId }) => {
  // Filter states
  const [brands, setBrands] = useState<FilterOption[]>([]);
  const [materials, setMaterials] = useState<FilterOption[]>([]);
  const [lensClasses, setLensClasses] = useState<FilterOption[]>([]);
  const [treatments, setTreatments] = useState<FilterOption[]>([]);
  
  // Selected filter states
  const [selectedBrandId, setSelectedBrandId] = useState<number | undefined>(undefined);
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | undefined>(undefined);
  const [selectedLensClassId, setSelectedLensClassId] = useState<number | undefined>(undefined);
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<number | undefined>(undefined);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{field: string, direction: string}>({
    field: 'created_at',
    direction: 'desc'
  });
  
  // Lenses data and pagination
  const [lenses, setLenses] = useState<Lens[]>([]);
  const [recommendedLenses, setRecommendedLenses] = useState<Lens[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(10);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFilteringByPrescription, setIsFilteringByPrescription] = useState(false);
  const { user } = useAuth();
  const isSpecialist = user?.role === 'specialist';
  
  // Request tracking refs to prevent duplicate requests
  const pendingRequests = useRef<Record<string, boolean>>({});
  const filterTimers = useRef<Record<string, NodeJS.Timeout>>({});
  
  // Load filter options when component mounts
  useEffect(() => {
    loadFilterOptions();
    
    // Clear timers on unmount
    return () => {
      Object.values(filterTimers.current).forEach(timer => clearTimeout(timer));
    };
  }, []);
  
  // Load lenses when filters change or search query changes
  useEffect(() => {
    if (searchQuery.length > 2 || (searchQuery === '' && searchQuery !== undefined)) {
      const delayDebounceFn = setTimeout(() => {
        searchLenses();
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [searchQuery]);
  
  useEffect(() => {
    console.log('Filter or pagination changed, refreshing lenses...');
    // Reset to page 1 when filters change
    if (currentPage !== 1 && 
        (selectedBrandId !== undefined || 
         selectedMaterialId !== undefined || 
         selectedLensClassId !== undefined || 
         selectedTreatmentId !== undefined)) {
      setCurrentPage(1);
      return; // The page change will trigger another useEffect that calls searchLenses
    }
    searchLenses();
  }, [selectedBrandId, selectedMaterialId, selectedLensClassId, selectedTreatmentId, currentPage, perPage, sortConfig]);
  
  // Enable prescription filtering when prescription ID is available
  useEffect(() => {
    if (prescriptionId) {
      setIsFilteringByPrescription(true);
      searchLenses();
    } else {
      setIsFilteringByPrescription(false);
    }
  }, [prescriptionId]);
  
  const loadFilterOptions = async () => {
    try {
      setFiltersLoading(true);
      setError(null);
      
      // First test all endpoints directly to diagnose issues
      await lensService.testFilterEndpoints();
      
      // Then fetch the filter options
      const options = await lensService.getFilterOptions();
      console.log("Loaded filter options:", options);
      
      // Add debug information to understand what's happening with each filter type
      console.log("Brands:", Array.isArray(options.brands), options.brands.length);
      console.log("Materials:", Array.isArray(options.materials), options.materials.length);
      console.log("LensClasses:", Array.isArray(options.lensClasses), options.lensClasses.length);
      console.log("Treatments:", Array.isArray(options.treatments), options.treatments.length);
      
      // Sample entries from each category if available
      if (options.brands.length > 0) console.log("Sample brand:", options.brands[0]);
      if (options.materials.length > 0) console.log("Sample material:", options.materials[0]);
      if (options.lensClasses.length > 0) console.log("Sample lens class:", options.lensClasses[0]);
      if (options.treatments.length > 0) console.log("Sample treatment:", options.treatments[0]);
      
      // Set the filter states - ensure we always provide an array even if API returns null/undefined
      setBrands(Array.isArray(options.brands) ? options.brands : []);
      setMaterials(Array.isArray(options.materials) ? options.materials : []);
      setLensClasses(Array.isArray(options.lensClasses) ? options.lensClasses : []);
      setTreatments(Array.isArray(options.treatments) ? options.treatments : []);
      
      // Debug the state after setting
      console.log("State after setting brands:", options.brands);
      
      // Fallback: If any filter category is empty, try to load it individually with empty search
      await loadEmptyFilters();
    } catch (error) {
      console.error('Error loading filter options:', error);
      setError('No se pudieron cargar las opciones de filtrado');
      
      // Attempt fallback loading on error
      await loadEmptyFilters();
    } finally {
      setFiltersLoading(false);
    }
  };
  
  // New function to load empty filters as fallback
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
  
  const searchLenses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Reset the lenses state to ensure we don't display stale data
      setLenses([]);
      setRecommendedLenses([]);
      
      // Log the filter values being used
      console.log('Searching lenses with filters:', {
        brandId: selectedBrandId,
        materialId: selectedMaterialId,
        lensClassId: selectedLensClassId,
        treatmentId: selectedTreatmentId,
        query: searchQuery,
        page: currentPage,
        perPage,
        sortField: sortConfig.field,
        sortDirection: sortConfig.direction
      });
      
      const searchParams: LensSearchParams = {
        brandId: selectedBrandId,
        materialId: selectedMaterialId,
        lensClassId: selectedLensClassId,
        treatmentId: selectedTreatmentId,
        query: searchQuery || undefined,
        page: currentPage,
        perPage: perPage,
        sortField: sortConfig.field,
        sortDirection: sortConfig.direction
      };
      
      const response = await lensService.searchLenses(searchParams);
      console.log('Search response:', response);
      
      if (isFilteringByPrescription && prescriptionId) {
        await filterLensesByPrescription(response.data, prescriptionId);
      } else {
        setLenses(response.data);
        
        // Check if we got results even though filters were applied
        if (response.data.length === 0) {
          if ((selectedBrandId || selectedMaterialId || selectedLensClassId || selectedTreatmentId)) {
            console.log('No results found with the applied filters');
            setError('No se encontraron lentes con los filtros seleccionados. Prueba con diferentes criterios.');
          } else if (searchQuery) {
            console.log('No results found for search query:', searchQuery);
            setError(`No se encontraron resultados para: "${searchQuery}"`);
          } else {
            console.log('No lenses found with default search');
            setError('No se encontraron lentes. Contacta al administrador del sistema.');
          }
        } else {
          console.log(`Found ${response.data.length} lenses with the applied filters`);
          
          // Verify the filters were actually applied by checking the response
          if ((selectedBrandId || selectedMaterialId || selectedLensClassId || selectedTreatmentId)) {
            let filtersApplied = true;
            
            // Check that the returned lenses match the brand filter
            if (selectedBrandId && response.data.some(lens => lens.brand_id !== selectedBrandId)) {
              console.warn('Brand filter may not have been applied properly!');
              filtersApplied = false;
            }
            
            // Check that the returned lenses match the material filter
            if (selectedMaterialId && response.data.some(lens => lens.material_id !== selectedMaterialId)) {
              console.warn('Material filter may not have been applied properly!');
              filtersApplied = false;
            }
            
            // Check that the returned lenses match the lens class filter
            if (selectedLensClassId && response.data.some(lens => lens.lens_class_id !== selectedLensClassId)) {
              console.warn('Lens class filter may not have been applied properly!');
              filtersApplied = false;
            }
            
            // Check that the returned lenses match the treatment filter
            if (selectedTreatmentId && response.data.some(lens => lens.treatment_id !== selectedTreatmentId)) {
              console.warn('Treatment filter may not have been applied properly!');
              filtersApplied = false;
            }
            
            if (!filtersApplied) {
              console.error('Filters may not have been applied correctly by the API!');
              toast({
                title: "Advertencia",
                description: "Es posible que los filtros no se hayan aplicado correctamente. Por favor, intenta recargar.",
                variant: "default",
              });
            }
          }
        }
      }
      
      setTotalPages(response.last_page);
      
    } catch (error) {
      console.error('Error searching lenses:', error);
      setError('No se pudieron cargar los lentes. Intenta nuevamente más tarde.');
      setLenses([]);
    } finally {
      setLoading(false);
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
      
      console.log('Prescription values for filtering:');
      console.log(`Sphere: min=${sphereMin}, max=${sphereMax}`);
      console.log(`Cylinder: min=${cylinderMin}, max=${cylinderMax}`);
      console.log(`Addition: min=${additionMin}, max=${additionMax}`);
      
      // Filter lenses that match the prescription values
      const filteredLenses = lensData.filter(lens => {
        // Skip lenses that don't have sphere or cylinder range defined
        if (!lens.sphere_min || !lens.sphere_max || 
            !lens.cylinder_min || !lens.cylinder_max) {
          return false;
        }
        
        // Parse lens range values, ensuring we have valid numbers
        const lensSphereMin = parseFloat(lens.sphere_min.toString()) || 0;
        const lensSphereMax = parseFloat(lens.sphere_max.toString()) || 0;
        const lensCylinderMin = parseFloat(lens.cylinder_min.toString()) || 0;
        const lensCylinderMax = parseFloat(lens.cylinder_max.toString()) || 0;
        const lensAdditionMin = lens.addition_min ? parseFloat(lens.addition_min.toString()) || 0 : null;
        const lensAdditionMax = lens.addition_max ? parseFloat(lens.addition_max.toString()) || 0 : null;
        
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
          if (!lensAdditionMin || !lensAdditionMax) {
            matchesAddition = false;
          } else {
            matchesAddition = 
              (additionMin >= lensAdditionMin && additionMin <= lensAdditionMax) ||
              (additionMax >= lensAdditionMin && additionMax <= lensAdditionMax) ||
              (lensAdditionMin >= additionMin && lensAdditionMax <= additionMax);
          }
        } else {
          // If no addition is needed, prefer lenses without addition values
          matchesAddition = !lensAdditionMin && !lensAdditionMax;
        }
        
        return matchesSphere && matchesCylinder && matchesAddition;
      });
      
      console.log(`Filtered ${lensData.length} lenses down to ${filteredLenses.length} matching the prescription`);
      
      setLenses(filteredLenses);
      setRecommendedLenses(filteredLenses);
      
      if (filteredLenses.length === 0) {
        setError('No se encontraron lentes que coincidan con la prescripción');
        toast({
          title: "Sin coincidencias",
          description: "No se encontraron lentes que coincidan con la prescripción",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error filtering lenses by prescription:', error);
      setError('Error al filtrar lentes por prescripción');
      setLenses(lensData); // Fall back to unfiltered lenses
    }
  };
  
  const resetFilters = () => {
    console.log('Resetting all filters');
    
    // Reset filter state values
    setSelectedBrandId(undefined);
    setSelectedMaterialId(undefined);
    setSelectedLensClassId(undefined);
    setSelectedTreatmentId(undefined);
    setSearchQuery('');
    setSortConfig({ field: 'created_at', direction: 'desc' });
    setCurrentPage(1);
    
    // Clear any errors
    setError(null);
    
    // Load filter options to ensure dropdowns have data
    loadFilterOptions();
    
    // Perform a search with no filters to refresh the lens list
    setTimeout(() => {
      searchLenses();
    }, 0);
    
    // Close the filter popover
    setIsFilterOpen(false);
  };
  
  const getActiveFiltersCount = (): number => {
    let count = 0;
    if (selectedBrandId) count++;
    if (selectedMaterialId) count++;
    if (selectedLensClassId) count++;
    if (selectedTreatmentId) count++;
    if (searchQuery) count++;
    if (sortConfig.field !== 'created_at' || sortConfig.direction !== 'desc') count++;
    return count;
  };
  
  // Helper function to convert FilterOption[] to SelectOption[] for the SearchableSelect
  const convertToSelectOptions = (filterOptions: FilterOption[]): SelectOption[] => {
    console.log("Converting filter options:", filterOptions);
    if (!Array.isArray(filterOptions)) {
      console.error("filterOptions is not an array:", filterOptions);
      return [];
    }
    return filterOptions.map(option => ({
      value: option.id.toString(),
      label: option.name
    }));
  };
  
  // Filter search functions with debouncing and duplicate prevention
  const handleBrandSearch = async (inputValue: string) => {
    // Avoid duplicate searches
    const requestKey = `brand:${inputValue}`;
    if (pendingRequests.current[requestKey]) {
      return;
    }
    
    try {
      pendingRequests.current[requestKey] = true;
      
      if (filterTimers.current.brandSearch) {
        clearTimeout(filterTimers.current.brandSearch);
      }
      
      filterTimers.current.brandSearch = setTimeout(async () => {
        try {
          console.log(`Searching brands with query: "${inputValue}"`);
          
          // Set loading state if this is a user-initiated search, not a background loading
          if (inputValue.length > 0) {
            setFiltersLoading(true);
          }
          
          const results = await lensService.searchBrands(inputValue);
          console.log(`Brand search results:`, results);
          
          if (Array.isArray(results)) {
            setBrands(results);
          } else {
            console.error('Brand search did not return an array:', results);
            // Try to recover if we get bad data
            setBrands([]);
          }
        } catch (error) {
          console.error('Error searching brands:', error);
        } finally {
          delete pendingRequests.current[requestKey];
          setFiltersLoading(false);
        }
      }, inputValue ? 300 : 0); // Immediate for empty searches (initial load)
    } catch (error) {
      delete pendingRequests.current[requestKey];
      console.error('Error in brand search:', error);
    }
  };

  const handleMaterialSearch = async (inputValue: string) => {
    // Avoid duplicate searches
    const requestKey = `material:${inputValue}`;
    if (pendingRequests.current[requestKey]) {
      return;
    }
    
    try {
      pendingRequests.current[requestKey] = true;
      
      if (filterTimers.current.materialSearch) {
        clearTimeout(filterTimers.current.materialSearch);
      }
      
      filterTimers.current.materialSearch = setTimeout(async () => {
        try {
          console.log(`Searching materials with query: "${inputValue}"`);
          
          // Set loading state if this is a user-initiated search
          if (inputValue.length > 0) {
            setFiltersLoading(true);
          }
          
          const results = await lensService.searchMaterials(inputValue);
          console.log(`Material search results:`, results);
          
          if (Array.isArray(results)) {
            setMaterials(results);
          } else {
            console.error('Material search did not return an array:', results);
            setMaterials([]);
          }
        } catch (error) {
          console.error('Error searching materials:', error);
        } finally {
          delete pendingRequests.current[requestKey];
          setFiltersLoading(false);
        }
      }, inputValue ? 300 : 0);
    } catch (error) {
      delete pendingRequests.current[requestKey];
      console.error('Error in material search:', error);
    }
  };

  const handleLensClassSearch = async (inputValue: string) => {
    // Avoid duplicate searches
    const requestKey = `lensClass:${inputValue}`;
    if (pendingRequests.current[requestKey]) {
      return;
    }
    
    try {
      pendingRequests.current[requestKey] = true;
      
      if (filterTimers.current.lensClassSearch) {
        clearTimeout(filterTimers.current.lensClassSearch);
      }
      
      filterTimers.current.lensClassSearch = setTimeout(async () => {
        try {
          console.log(`Searching lens classes with query: "${inputValue}"`);
          
          // Set loading state if this is a user-initiated search
          if (inputValue.length > 0) {
            setFiltersLoading(true);
          }
          
          const results = await lensService.searchLensClasses(inputValue);
          console.log(`Lens class search results:`, results);
          
          if (Array.isArray(results)) {
            setLensClasses(results);
          } else {
            console.error('Lens class search did not return an array:', results);
            setLensClasses([]);
          }
        } catch (error) {
          console.error('Error searching lens classes:', error);
        } finally {
          delete pendingRequests.current[requestKey];
          setFiltersLoading(false);
        }
      }, inputValue ? 300 : 0);
    } catch (error) {
      delete pendingRequests.current[requestKey];
      console.error('Error in lens class search:', error);
    }
  };

  const handleTreatmentSearch = async (inputValue: string) => {
    // Avoid duplicate searches
    const requestKey = `treatment:${inputValue}`;
    if (pendingRequests.current[requestKey]) {
      return;
    }
    
    try {
      pendingRequests.current[requestKey] = true;
      
      if (filterTimers.current.treatmentSearch) {
        clearTimeout(filterTimers.current.treatmentSearch);
      }
      
      filterTimers.current.treatmentSearch = setTimeout(async () => {
        try {
          console.log(`Searching treatments with query: "${inputValue}"`);
          
          // Set loading state if this is a user-initiated search
          if (inputValue.length > 0) {
            setFiltersLoading(true);
          }
          
          const results = await lensService.searchTreatments(inputValue);
          console.log(`Treatment search results:`, results);
          
          if (Array.isArray(results)) {
            setTreatments(results);
          } else {
            console.error('Treatment search did not return an array:', results);
            setTreatments([]);
          }
        } catch (error) {
          console.error('Error searching treatments:', error);
        } finally {
          delete pendingRequests.current[requestKey];
          setFiltersLoading(false);
        }
      }, inputValue ? 300 : 0);
    } catch (error) {
      delete pendingRequests.current[requestKey];
      console.error('Error in treatment search:', error);
    }
  };
  
  // Add a function to force reload of filter options with throttling
  const forceReloadFilters = async () => {
    // Prevent multiple simultaneous reloads
    if (pendingRequests.current['reloadFilters']) {
      console.log('Filter reload already in progress, skipping');
      return;
    }
    
    console.log("Force reloading filter options...");
    setBrands([]);
    setMaterials([]);
    setLensClasses([]);
    setTreatments([]);
    setFiltersLoading(true);
    
    try {
      pendingRequests.current['reloadFilters'] = true;
      
      // Test direct API call first
      const testResults = await lensService.testFilterEndpoints();
      console.log("Direct API test results:", testResults);
      
      // Then try normal filter loading
      const options = await lensService.getFilterOptions();
      console.log("Reloaded filter options:", options);
      
      setBrands(options.brands);
      setMaterials(options.materials);
      setLensClasses(options.lensClasses);
      setTreatments(options.treatments);
    } catch (error) {
      console.error("Error force reloading filters:", error);
    } finally {
      setFiltersLoading(false);
      pendingRequests.current['reloadFilters'] = false;
    }
  };
  
  // Render the header of the lens recommendation section
  const renderHeader = () => {
    return (
      <div className="mb-6 border border-slate-200 rounded-lg p-6 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-blue-800 mb-2 flex items-center">
              <Glasses className="mr-2 h-5 w-5 text-blue-600" />
              Recomendación de Lentes
            </h2>
            <p className="text-slate-600">
              Encuentre y seleccione los lentes más adecuados para esta prescripción
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Buscar lentes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border-slate-200 focus:ring-blue-400 w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className={`border-slate-200 ${getActiveFiltersCount() > 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}`}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filtros
                  {getActiveFiltersCount() > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 px-2 py-1 h-5">
                      {getActiveFiltersCount()}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4 p-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h3 className="font-medium text-slate-700">Filtros</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={resetFilters}
                      className="h-8 px-2 text-slate-500 hover:text-slate-700"
                    >
                      Limpiar
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="brand" className="text-xs">Marca</Label>
                      <SearchableSelect
                        options={convertToSelectOptions(brands || [])}
                        value={selectedBrandId?.toString()}
                        onChange={(value) => setSelectedBrandId(value ? parseInt(value) : undefined)}
                        placeholder="Buscar o seleccionar marca..."
                        allOptionLabel="Todas las marcas"
                        isLoading={filtersLoading}
                        onSearch={handleBrandSearch}
                      />
                      {brands.length === 0 && !filtersLoading && (
                        <div className="text-xs text-red-500 mt-1">No se cargaron marcas</div>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="material" className="text-xs">Material</Label>
                      <SearchableSelect
                        options={convertToSelectOptions(materials || [])}
                        value={selectedMaterialId?.toString()}
                        onChange={(value) => setSelectedMaterialId(value ? parseInt(value) : undefined)}
                        placeholder="Buscar o seleccionar material..."
                        allOptionLabel="Todos los materiales"
                        isLoading={filtersLoading}
                        onSearch={handleMaterialSearch}
                      />
                      {materials.length === 0 && !filtersLoading && (
                        <div className="text-xs text-red-500 mt-1">No se cargaron materiales</div>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="lensClass" className="text-xs">Clase de Lente</Label>
                      <SearchableSelect
                        options={convertToSelectOptions(lensClasses || [])}
                        value={selectedLensClassId?.toString()}
                        onChange={(value) => setSelectedLensClassId(value ? parseInt(value) : undefined)}
                        placeholder="Buscar o seleccionar clase..."
                        allOptionLabel="Todas las clases"
                        isLoading={filtersLoading}
                        onSearch={handleLensClassSearch}
                      />
                      {lensClasses.length === 0 && !filtersLoading && (
                        <div className="text-xs text-red-500 mt-1">No se cargaron clases</div>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="treatment" className="text-xs">Tratamiento</Label>
                      <SearchableSelect
                        options={convertToSelectOptions(treatments || [])}
                        value={selectedTreatmentId?.toString()}
                        onChange={(value) => setSelectedTreatmentId(value ? parseInt(value) : undefined)}
                        placeholder="Buscar o seleccionar tratamiento..."
                        allOptionLabel="Todos los tratamientos"
                        isLoading={filtersLoading}
                        onSearch={handleTreatmentSearch}
                      />
                      {treatments.length === 0 && !filtersLoading && (
                        <div className="text-xs text-red-500 mt-1">No se cargaron tratamientos</div>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="sort" className="text-xs">Ordenar Por</Label>
                      <SearchableSelect
                        options={[
                          { value: "created_at,desc", label: "Más recientes primero" },
                          { value: "created_at,asc", label: "Más antiguos primero" },
                          { value: "price,asc", label: "Precio (menor a mayor)" },
                          { value: "price,desc", label: "Precio (mayor a menor)" },
                          { value: "description,asc", label: "Descripción (A-Z)" },
                          { value: "description,desc", label: "Descripción (Z-A)" }
                        ]}
                        value={`${sortConfig.field},${sortConfig.direction}`}
                        onChange={(value) => {
                          if (value) {
                            const [field, direction] = value.split(',');
                            setSortConfig({ field, direction });
                          }
                        }}
                        placeholder="Ordenar por..."
                        allOptionLabel="Sin ordenamiento específico"
                      />
                    </div>
                  </div>
                  
                  <div className="border-t pt-3 mt-2">
                    <Button 
                      className="w-full" 
                      size="sm"
                      onClick={() => {
                        searchLenses();
                        setIsFilterOpen(false);
                      }}
                      disabled={filtersLoading}
                    >
                      {filtersLoading ? (
                        <>
                          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                          Cargando...
                        </>
                      ) : (
                        <>
                          <Filter className="h-4 w-4 mr-2" />
                          Aplicar Filtros
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {error && (
                    <div className="text-red-500 text-xs p-2 border-t mt-2">
                      <AlertCircle className="h-3 w-3 inline-block mr-1" />
                      {error}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        {isFilteringByPrescription && (
          <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-md p-3 flex items-start">
            <Sparkles className="h-5 w-5 text-indigo-600 mt-0.5 mr-2 shrink-0" />
            <div>
              <p className="text-sm text-indigo-700 font-medium">Filtrado automático por prescripción</p>
              <p className="text-xs text-indigo-600 mt-1">
                Los lentes se están filtrando automáticamente según los valores de la prescripción para mostrar las mejores opciones.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render a single lens item
  const renderLensItem = (lens: Lens) => {
    const isSelected = selectedLens?.id === lens.id;
    
    return (
      <Card 
        key={lens.id} 
        className={`mb-4 transition-all border ${isSelected ? 'border-blue-400 ring-2 ring-blue-200 bg-blue-50' : 'border-slate-200 hover:border-blue-200 hover:shadow-md'}`}
      >
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex-1">
              <div className="flex items-start gap-3">
                <div className="shrink-0 bg-gradient-to-br from-blue-100 to-indigo-100 w-12 h-12 rounded-full flex items-center justify-center">
                  <Glasses className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{lens.description}</h3>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {lens.brand && (
                      <Badge variant="outline" className="bg-white">
                        Marca: {lens.brand.name}
                      </Badge>
                    )}
                    {lens.material && (
                      <Badge variant="outline" className="bg-white">
                        Material: {lens.material.name}
                      </Badge>
                    )}
                    {lens.lens_class && (
                      <Badge variant="outline" className="bg-white">
                        Clase: {lens.lens_class.name}
                      </Badge>
                    )}
                    {lens.treatment && (
                      <Badge variant="outline" className="bg-white">
                        Tratamiento: {lens.treatment.name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Esfera:</p>
                  <p className="text-sm">
                    {lens.sphere_min !== null && lens.sphere_max !== null 
                      ? `${lens.sphere_min} a ${lens.sphere_max}` 
                      : 'No especificado'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Cilindro:</p>
                  <p className="text-sm">
                    {lens.cylinder_min !== null && lens.cylinder_max !== null 
                      ? `${lens.cylinder_min} a ${lens.cylinder_max}` 
                      : 'No especificado'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Adición:</p>
                  <p className="text-sm">
                    {lens.addition_min !== null && lens.addition_max !== null 
                      ? `${lens.addition_min} a ${lens.addition_max}` 
                      : 'No especificado'}
                  </p>
                </div>
              </div>
              
              {lens.notes && (
                <div className="mt-3 text-sm text-slate-600 italic">
                  {Array.isArray(lens.notes) 
                    ? lens.notes.map(note => (
                        <div key={note.id} className="mb-1">
                          {note.content}
                        </div>
                      ))
                    : lens.notes}
                </div>
              )}
            </div>
            
            <div className="flex flex-col justify-between items-end">
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-1">Precio:</p>
                <p className="text-lg font-semibold text-slate-800">
                  {formatCurrency(lens.price, 'COP')}
                </p>
              </div>
              
              <Button
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => onSelectLens(isSelected ? null : lens)}
                className={isSelected 
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }
              >
                {isSelected ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Seleccionado
                  </>
                ) : (
                  <>
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    Seleccionar
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {renderHeader()}
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}
      
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="mb-4">
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row gap-4 justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="w-full">
                        <Skeleton className="h-5 w-40 mb-2" />
                        <div className="flex gap-2">
                          <Skeleton className="h-6 w-24" />
                          <Skeleton className="h-6 w-24" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  </div>
                  
                  <div className="flex flex-col justify-between items-end">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-9 w-32 mt-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {lenses.length === 0 ? (
            <div className="text-center p-8 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Glasses className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-700 mb-2">No se encontraron lentes</h3>
              <p className="text-slate-500 max-w-md mx-auto mb-6">
                No se encontraron lentes que coincidan con los criterios de búsqueda o con los parámetros de la prescripción.
              </p>
              <Button 
                variant="outline"
                onClick={resetFilters}
                className="border-slate-200"
              >
                <X className="mr-2 h-4 w-4" />
                Limpiar filtros
              </Button>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-slate-500">
                  Mostrando {lenses.length} resultados
                </p>
                <Select 
                  value={`${sortConfig.field}:${sortConfig.direction}`}
                  onValueChange={(value) => {
                    const [field, direction] = value.split(':');
                    setSortConfig({ field, direction });
                  }}
                >
                  <SelectTrigger className="w-[180px] bg-white border-slate-200">
                    <div className="flex items-center">
                      <ArrowUpDown className="mr-2 h-3.5 w-3.5 text-slate-500" />
                      <span>Ordenar por</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price:asc">Precio: Menor a Mayor</SelectItem>
                    <SelectItem value="price:desc">Precio: Mayor a Menor</SelectItem>
                    <SelectItem value="created_at:desc">Más Recientes</SelectItem>
                    <SelectItem value="description:asc">Nombre A-Z</SelectItem>
                    <SelectItem value="description:desc">Nombre Z-A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-4">
                {lenses.map(renderLensItem)}
              </div>
              
              {totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LensRecommendation; 