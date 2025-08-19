import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Glasses, Search, Filter, ChevronLeft, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDistanceToNow, parseISO } from 'date-fns';
import Pagination from '@/components/ui/pagination';

import { catalogService, type Lens, type Note } from '@/services/catalogService';
import filterService, { type FilterOption } from '@/services/filterService';
import SearchableSelect, { type SelectOption as SearchableSelectOption } from '@/components/ui/SearchableSelect';

const Catalog: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we came from the quote creation page
  const isQuoteSelection = location.pathname.includes('/receptionist/catalog') && 
                           sessionStorage.getItem('pendingQuote') !== null;
  
  const [lenses, setLenses] = useState<Lens[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [paginationMeta, setPaginationMeta] = useState<{
    total: number;
    from: number;
    to: number;
  }>({ total: 0, from: 0, to: 0 });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  
  // Filter states
  const [descriptionFilter, setDescriptionFilter] = useState('');
  const [debouncedDescription, setDebouncedDescription] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState<string | undefined>(undefined);
  const [selectedBrandId, setSelectedBrandId] = useState<string | undefined>(undefined);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | undefined>(undefined);
  const [selectedLensClassId, setSelectedLensClassId] = useState<string | undefined>(undefined);
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string | undefined>(undefined);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | undefined>(undefined);

  // Filter options - Initialize with empty arrays to prevent undefined errors
  const [types, setTypes] = useState<FilterOption[]>([]);
  const [brands, setBrands] = useState<FilterOption[]>([]);
  const [materials, setMaterials] = useState<FilterOption[]>([]);
  const [lensClasses, setLensClasses] = useState<FilterOption[]>([]);
  const [treatments, setTreatments] = useState<FilterOption[]>([]);
  const [suppliers, setSuppliers] = useState<FilterOption[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [filterLoadError, setFilterLoadError] = useState(false);

  // Memoized safe filter arrays to ensure they're never undefined
  const safeTypes = useMemo(() => Array.isArray(types) ? types : [], [types]);
  const safeBrands = useMemo(() => Array.isArray(brands) ? brands : [], [brands]);
  const safeMaterials = useMemo(() => Array.isArray(materials) ? materials : [], [materials]);
  const safeLensClasses = useMemo(() => Array.isArray(lensClasses) ? lensClasses : [], [lensClasses]);
  const safeTreatments = useMemo(() => Array.isArray(treatments) ? treatments : [], [treatments]);
  const safeSuppliers = useMemo(() => Array.isArray(suppliers) ? suppliers : [], [suppliers]);

  const [selectedLens, setSelectedLens] = useState<Lens | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Debounce description filter
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDescription(descriptionFilter);
    }, 500);

    return () => clearTimeout(timer);
  }, [descriptionFilter]);

  // Load filter options function that can be called for retry
  const loadFilterOptions = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setFiltersLoading(true);
      setFilterLoadError(false);
      console.log('Starting to load filter options...');
      
      const filters = await filterService.getAllFilters();
      console.log('Raw filter response:', filters);
      
      // Ensure all filter arrays are properly initialized with additional validation
      const safeTypes = Array.isArray(filters.types) ? filters.types.filter(item => item && item.id && item.name) : [];
      const safeBrands = Array.isArray(filters.brands) ? filters.brands.filter(item => item && item.id && item.name) : [];
      const safeMaterials = Array.isArray(filters.materials) ? filters.materials.filter(item => item && item.id && item.name) : [];
      const safeLensClasses = Array.isArray(filters.lensClasses) ? filters.lensClasses.filter(item => item && item.id && item.name) : [];
      const safeTreatments = Array.isArray(filters.treatments) ? filters.treatments.filter(item => item && item.id && item.name) : [];
      const safeSuppliers = Array.isArray(filters.suppliers) ? filters.suppliers.filter(item => item && item.id && item.name) : [];
      
      console.log('Processed filter arrays:', {
        types: safeTypes.length,
        brands: safeBrands.length,
        materials: safeMaterials.length,
        lensClasses: safeLensClasses.length,
        treatments: safeTreatments.length,
        suppliers: safeSuppliers.length
      });
      
      console.log('Sample data from each filter:', {
        types: safeTypes.slice(0, 2),
        brands: safeBrands.slice(0, 2),
        materials: safeMaterials.slice(0, 2),
        lensClasses: safeLensClasses.slice(0, 2),
        treatments: safeTreatments.slice(0, 2),
        suppliers: safeSuppliers.slice(0, 2)
      });
      
      // Use functional updates to ensure state consistency
      setTypes(safeTypes);
      setBrands(safeBrands);
      setMaterials(safeMaterials);
      setLensClasses(safeLensClasses);
      setTreatments(safeTreatments);
      setSuppliers(safeSuppliers);
      
      console.log('Filter options loaded successfully');
    } catch (error) {
      console.error('Error loading filter options:', error);
      setFilterLoadError(true);
      // Ensure arrays are still initialized even on error
      setTypes([]);
      setBrands([]);
      setMaterials([]);
      setLensClasses([]);
      setTreatments([]);
      setSuppliers([]);
    } finally {
      setFiltersLoading(false);
    }
  }, [isAuthenticated]);

  // Load filter options only once
  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  // Load lenses data with debounced description
  const loadLenses = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      const params: { 
        per_page: number;
        page: number;
        description?: string;
        lens_type_id?: number;
        brand_id?: number;
        material_id?: number;
        lens_class_id?: number;
        treatment_id?: number;
        supplier_id?: number;
      } = {
        per_page: perPage,
        page: currentPage,
        description: debouncedDescription || undefined,
        lens_type_id: selectedTypeId ? parseInt(selectedTypeId) : undefined,
        brand_id: selectedBrandId ? parseInt(selectedBrandId) : undefined,
        material_id: selectedMaterialId ? parseInt(selectedMaterialId) : undefined,
        lens_class_id: selectedLensClassId ? parseInt(selectedLensClassId) : undefined,
        treatment_id: selectedTreatmentId ? parseInt(selectedTreatmentId) : undefined,
        supplier_id: selectedSupplierId ? parseInt(selectedSupplierId) : undefined,
      };

      const response = await catalogService.getLenses(params);
      setLenses(response.data);
      setTotalPages(response.meta.last_page);
      setPaginationMeta({
        total: response.meta.total,
        from: response.meta.from,
        to: response.meta.to,
      });
    } catch (error) {
      console.error('Error loading lenses:', error);
      setLenses([]);
      setTotalPages(1);
      setPaginationMeta({ total: 0, from: 0, to: 0 });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, perPage, currentPage, debouncedDescription, selectedTypeId, selectedBrandId, selectedMaterialId, selectedLensClassId, selectedTreatmentId, selectedSupplierId]);

  useEffect(() => {
    loadLenses();
  }, [loadLenses]);

  // Format price as currency
  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(parseFloat(price));
  };

  // Fetch notes when modal opens and lens changes
  useEffect(() => {
    if (!isAuthenticated || !modalOpen || !selectedLens) return;
    
    const fetchNotes = async () => {
      setNotesLoading(true);
      try {
        const lensNotes = await catalogService.getLensNotes(selectedLens.id);
        setNotes(lensNotes);
      } catch (error) {
        console.error('Error fetching notes:', error);
        setNotes([]);
      } finally {
        setNotesLoading(false);
      }
    };
    
    fetchNotes();
  }, [modalOpen, selectedLens, isAuthenticated]);

  // Add note handler
  const handleAddNote = async () => {
    if (!noteContent.trim() || !selectedLens || !isAuthenticated) return;
    setAddingNote(true);
    try {
      await catalogService.addLensNote(selectedLens.id, noteContent);
      setNoteContent('');
      // Refresh notes
      const lensNotes = await catalogService.getLensNotes(selectedLens.id);
      setNotes(lensNotes);
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setAddingNote(false);
    }
  };

  // Handle lens selection for quotes
  const handleSelectLensForQuote = () => {
    if (selectedLens && isQuoteSelection) {
      sessionStorage.setItem('selectedLens', JSON.stringify(selectedLens));
      setModalOpen(false);
      navigate('/receptionist/quotes/new');
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setDescriptionFilter('');
    setDebouncedDescription('');
    setSelectedTypeId(undefined);
    setSelectedBrandId(undefined);
    setSelectedMaterialId(undefined);
    setSelectedLensClassId(undefined);
    setSelectedTreatmentId(undefined);
    setSelectedSupplierId(undefined);
    setCurrentPage(1);
  };

  // Count active filters
  const activeFiltersCount = [
    debouncedDescription,
    selectedTypeId,
    selectedBrandId,
    selectedMaterialId,
    selectedLensClassId,
    selectedTreatmentId,
    selectedSupplierId
  ].filter(Boolean).length;

  // Helper to convert FilterOption to SearchableSelectOption
  const toSearchableSelectOptions = (options: FilterOption[]): SearchableSelectOption[] => {
    if (!Array.isArray(options)) return [];
    return options.map(opt => ({ value: opt.id.toString(), label: opt.name }));
  };

  // Show login prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-convision-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Glasses className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Catálogo de Lentes</CardTitle>
              <CardDescription>
                Inicia sesión para acceder al catálogo completo de lentes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => navigate('/login')} 
                className="w-full"
              >
                Iniciar Sesión
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                ¿No tienes una cuenta? Contacta al administrador.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Lens Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl w-full rounded-xl p-0 overflow-hidden shadow-xl">
          {selectedLens && (
            <div className="bg-white">
              {/* Header */}
              <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold leading-tight mb-1 break-words">{selectedLens.description}</h2>
                  <div className="text-xs text-muted-foreground">Código: <span className="font-medium">{selectedLens.internal_code}</span></div>
                </div>
                <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium ml-3 flex-shrink-0">Activo</span>
              </div>

              {/* Main Info - Compact Grid */}
              <div className="px-4 py-3">
                <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <div className="text-muted-foreground font-medium mb-1">Tipo</div>
                    <span className="inline-block px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-medium">{selectedLens.lens_attributes?.lens_type?.name || selectedLens.type?.name}</span>
                  </div>
                  <div>
                    <div className="text-muted-foreground font-medium mb-1">Marca</div>
                    <span className="inline-block px-2 py-1 rounded bg-purple-50 text-purple-700 text-xs font-medium">{selectedLens.brand?.name}</span>
                  </div>
                  <div>
                    <div className="text-muted-foreground font-medium mb-1">Material</div>
                    <span className="inline-block px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-medium">{selectedLens.lens_attributes?.material?.name || selectedLens.material?.name}</span>
                  </div>
                  <div>
                    <div className="text-muted-foreground font-medium mb-1">Clase</div>
                    <span className="inline-block px-2 py-1 rounded bg-orange-50 text-orange-700 text-xs font-medium">{selectedLens.lens_attributes?.lens_class?.name || selectedLens.lens_class?.name}</span>
                  </div>
                  <div>
                    <div className="text-muted-foreground font-medium mb-1">Tratamiento</div>
                    <span className="inline-block px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-xs font-medium">{selectedLens.lens_attributes?.treatment?.name || selectedLens.treatment?.name || 'Sin tratamiento'}</span>
                  </div>
                  <div>
                    <div className="text-muted-foreground font-medium mb-1">Proveedor</div>
                    <span className="inline-block px-2 py-1 rounded bg-gray-50 text-gray-700 text-xs font-medium truncate max-w-full">{selectedLens.supplier?.name}</span>
                  </div>
                </div>
                
                {/* Price Section - Horizontal Layout */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Precio</div>
                      <div className="text-lg font-bold text-primary">{formatPrice(selectedLens.price)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Costo</div>
                      <div className="text-sm font-semibold text-gray-600">{formatPrice(selectedLens.cost)}</div>
                    </div>
                  </div>
                  {isQuoteSelection && (
                    <Button onClick={handleSelectLensForQuote} size="sm">
                      Seleccionar para Cotización
                    </Button>
                  )}
                </div>
              </div>

              {/* Notes Section */}
              <div className="border-t">
                <div className="px-4 py-2 bg-gray-50 border-b">
                  <h3 className="text-sm font-medium text-gray-700">Notas del Producto</h3>
                </div>
                <div className="px-4 py-3 max-h-48 overflow-y-auto">
                  {notesLoading ? (
                    <div className="text-muted-foreground text-xs text-center py-2">Cargando notas...</div>
                  ) : notes.length === 0 ? (
                    <div className="text-muted-foreground text-xs text-center py-2">No hay notas aún.</div>
                  ) : (
                    <div className="space-y-3">
                      {notes.map((note) => (
                        <div key={note.id} className="flex gap-2 items-start">
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center font-bold text-xs text-primary flex-shrink-0">
                            {note.user?.name ? note.user.name[0] : 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-xs">{note.user?.name || 'Sin Usuario'}</span>
                              <span className="text-xs text-muted-foreground">• {formatDistanceToNow(parseISO(note.created_at), { addSuffix: true })}</span>
                            </div>
                            <div className="text-xs text-gray-600 break-words">{note.content}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Add Note Form - Compact */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex gap-2 items-start">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center font-bold text-xs text-primary flex-shrink-0">
                        {user?.name ? user.name[0] : 'U'}
                      </div>
                      <div className="flex-1">
                        <textarea
                          className="w-full border rounded p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                          placeholder="Agregar una nota..."
                          value={noteContent}
                          onChange={e => setNoteContent(e.target.value)}
                          rows={2}
                          disabled={addingNote}
                        />
                        <div className="flex justify-end mt-1">
                          <Button size="sm" onClick={handleAddNote} disabled={addingNote || !noteContent.trim()} className="text-xs px-3 py-1 h-auto">
                            {addingNote ? 'Agregando...' : 'Agregar'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions - Only for non-quote selection */}
              {!isQuoteSelection && (
                <div className="px-4 py-2 border-t bg-gray-50 flex justify-end">
                  <Button variant="outline" onClick={() => setModalOpen(false)} size="sm">
                    Cerrar
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="space-y-4 w-full max-w-none">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isQuoteSelection ? 'Seleccionar Lentes para Cotización' : 'Catálogo de Lentes'}
            </h1>
            <p className="text-muted-foreground">
              {isQuoteSelection 
                ? 'Selecciona los lentes que deseas incluir en la cotización' 
                : 'Explora nuestra colección de lentes disponibles'}
            </p>
          </div>
          {isQuoteSelection && (
            <Button variant="outline" onClick={() => navigate('/receptionist/quotes/new')}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Volver a la Cotización
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Filtros</CardTitle>
                {activeFiltersCount > 0 && (
                  <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeFiltersCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-xs"
                  >
                    Limpiar filtros
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                  className="flex items-center gap-2"
                >
                  {isFiltersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      isFiltersOpen ? 'rotate-180' : ''
                    }`}
                  />
                </Button>
              </div>
            </div>
          </CardHeader>
          <div
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-hidden transition-all duration-300 ease-in-out ${
              isFiltersOpen ? 'max-h-[500px] opacity-100 p-4' : 'max-h-0 opacity-0 p-0'
            }`}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <Input
                placeholder="Buscar por descripción..."
                value={descriptionFilter}
                onChange={(e) => setDescriptionFilter(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <SearchableSelect
                options={toSearchableSelectOptions(safeTypes)}
                value={selectedTypeId}
                onChange={setSelectedTypeId}
                placeholder="Seleccionar tipo"
                searchPlaceholder="Buscar tipo..."
                isLoading={filtersLoading}
                disabled={filtersLoading || filterLoadError}
                allOptionLabel="Todos los tipos"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Marca</label>
              <SearchableSelect
                options={toSearchableSelectOptions(safeBrands)}
                value={selectedBrandId}
                onChange={setSelectedBrandId}
                placeholder="Seleccionar marca"
                searchPlaceholder="Buscar marca..."
                isLoading={filtersLoading}
                disabled={filtersLoading || filterLoadError}
                allOptionLabel="Todas las marcas"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Material</label>
              <SearchableSelect
                options={toSearchableSelectOptions(safeMaterials)}
                value={selectedMaterialId}
                onChange={setSelectedMaterialId}
                placeholder="Seleccionar material"
                searchPlaceholder="Buscar material..."
                isLoading={filtersLoading}
                disabled={filtersLoading || filterLoadError}
                allOptionLabel="Todos los materiales"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Clase de Lente</label>
              <SearchableSelect
                options={toSearchableSelectOptions(safeLensClasses)}
                value={selectedLensClassId}
                onChange={setSelectedLensClassId}
                placeholder="Seleccionar clase"
                searchPlaceholder="Buscar clase..."
                isLoading={filtersLoading}
                disabled={filtersLoading || filterLoadError}
                allOptionLabel="Todas las clases"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tratamiento</label>
              <SearchableSelect
                options={toSearchableSelectOptions(safeTreatments)}
                value={selectedTreatmentId}
                onChange={setSelectedTreatmentId}
                placeholder="Seleccionar tratamiento"
                searchPlaceholder="Buscar tratamiento..."
                isLoading={filtersLoading}
                disabled={filtersLoading || filterLoadError}
                allOptionLabel="Todos los tratamientos"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Proveedor</label>
              <SearchableSelect
                options={toSearchableSelectOptions(safeSuppliers)}
                value={selectedSupplierId}
                onChange={setSelectedSupplierId}
                placeholder="Seleccionar proveedor"
                searchPlaceholder="Buscar proveedor..."
                isLoading={filtersLoading}
                disabled={filtersLoading || filterLoadError}
                allOptionLabel="Todos los proveedores"
              />
            </div>
          </div>
        </Card>

        {/* Lenses Table */}
        <Card>
          <CardContent className="p-0">
            {/* Top Pagination */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Mostrando</span>
                <Select
                  value={perPage.toString()}
                  onValueChange={(value) => {
                    setPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue placeholder={perPage} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">elementos por página</span>
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
              <div className="text-sm text-muted-foreground">
                Mostrando {paginationMeta.from || 0} a {paginationMeta.to || 0} de {paginationMeta.total} resultados
              </div>
            </div>
            <div className="overflow-x-auto w-full">
              <Table className="w-full min-w-[1200px]">
                <TableHeader>
                  <TableRow className="bg-primary/5 hover:bg-primary/10">
                    <TableHead className="font-semibold text-primary">Código</TableHead>
                    <TableHead className="font-semibold text-primary">Descripción</TableHead>
                    <TableHead className="font-semibold text-primary">Tipo</TableHead>
                    <TableHead className="font-semibold text-primary">Marca</TableHead>
                    <TableHead className="font-semibold text-primary">Material</TableHead>
                    <TableHead className="font-semibold text-primary">Proveedor</TableHead>
                    <TableHead className="font-semibold text-primary text-right">Precio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          <span className="ml-2">Cargando...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : Array.isArray(lenses) && lenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No se encontraron lentes
                      </TableCell>
                    </TableRow>
                  ) : (
                    Array.isArray(lenses) && lenses.map((lens, index) => (
                      <TableRow
                        key={lens.id}
                        className={`
                          transition-colors duration-200 cursor-pointer
                          ${index % 2 === 0 
                            ? 'bg-white hover:bg-gray-50' 
                            : 'bg-primary/5 hover:bg-primary/10'
                          }
                        `}
                        onClick={() => {
                          setSelectedLens(lens);
                          setModalOpen(true);
                        }}
                      >
                        <TableCell className="align-middle px-4 py-3 font-medium whitespace-nowrap overflow-hidden text-ellipsis capitalize" title={lens.internal_code}>{lens.internal_code}</TableCell>
                        <TableCell className="capitalize truncate max-w-xs align-middle px-4 py-3 whitespace-nowrap overflow-hidden text-ellipsis" title={lens.description}>{lens.description}</TableCell>
                        <TableCell className="align-middle px-4 py-3 whitespace-nowrap overflow-hidden text-ellipsis capitalize">
                          <Badge variant="secondary" className="font-normal whitespace-nowrap overflow-hidden text-ellipsis capitalize" title={lens.lens_attributes?.lens_type?.name || lens.type?.name || ''}>{lens.lens_attributes?.lens_type?.name || lens.type?.name || ''}</Badge>
                        </TableCell>
                        <TableCell className="align-middle px-4 py-3 whitespace-nowrap overflow-hidden text-ellipsis capitalize">
                          <Badge variant="outline" className="font-normal whitespace-nowrap overflow-hidden text-ellipsis capitalize" title={lens.brand?.name || ''}>{lens.brand?.name || ''}</Badge>
                        </TableCell>
                        <TableCell className="align-middle px-4 py-3 whitespace-nowrap overflow-hidden text-ellipsis capitalize">
                          <Badge variant="secondary" className="font-normal whitespace-nowrap overflow-hidden text-ellipsis capitalize" title={lens.lens_attributes?.material?.name || lens.material?.name || ''}>{lens.lens_attributes?.material?.name || lens.material?.name || ''}</Badge>
                        </TableCell>
                        <TableCell className="align-middle px-4 py-3 whitespace-nowrap overflow-hidden text-ellipsis capitalize">
                          <Badge variant="outline" className="font-normal whitespace-nowrap overflow-hidden text-ellipsis capitalize max-w-[100px]" title={lens.supplier?.name || ''} style={{ textOverflow: 'ellipsis' }}>{lens.supplier?.name || ''}</Badge>
                        </TableCell>
                        <TableCell className="text-right align-middle px-4 py-3 font-semibold text-primary whitespace-nowrap overflow-hidden text-ellipsis capitalize" title={formatPrice(lens.price)}>{formatPrice(lens.price)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Catalog; 