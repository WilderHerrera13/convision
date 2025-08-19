import ApiService from './ApiService';

export interface FilterOption {
  id: number;
  name: string;
}

export interface FilterResponse {
  data: FilterOption[];
}

// Helper function to ensure we always get a valid array of FilterOptions
const ensureFilterArray = (data: unknown): FilterOption[] => {
  // console.log('ensureFilterArray input:', data, 'type:', typeof data);

  if (
    data &&
    typeof data === 'object' &&
    'data' in data &&
    Array.isArray((data as { data: unknown }).data)
  ) {
    const paginatedData = (data as { data: unknown[] }).data;
    // console.log('Found data property:', paginatedData, 'type:', typeof paginatedData);
    // Further validation for paginated items
    const validPaginatedItems = paginatedData.filter(item => {
      if (typeof item === 'object' && item !== null && 'id' in item && 'name' in item) {
        const typedItem = item as Record<string, unknown>;
        return typeof typedItem.id === 'number' && typeof typedItem.name === 'string';
      }
      return false;
    }) as FilterOption[];
    // console.log('Filtered paginated data length:', validPaginatedItems.length);
    return validPaginatedItems;
  }

  if (Array.isArray(data)) {
    // console.log('Data is array with length:', data.length);
    // Validate individual items if it's a direct array
    const validItems = data.filter(item => {
      if (typeof item === 'object' && item !== null && 'id' in item && 'name' in item) {
        const typedItem = item as Record<string, unknown>;
        return typeof typedItem.id === 'number' && typeof typedItem.name === 'string';
      }
      return false;
    }) as FilterOption[];
    // console.log('Filtered array length:', validItems.length);
    return validItems;
  }

  // console.warn('ensureFilterArray: Data is not in expected format, returning empty array. Received:', data);
  return [];
};

class FilterService {
  async getLensTypes(): Promise<FilterOption[]> {
    try {
      const response = await ApiService.get<unknown>('/api/v1/lens-types?per_page=1000');
      return ensureFilterArray(response);
    } catch (error) {
      console.error('Error fetching lens types:', error);
      return [];
    }
  }

  async getBrands(): Promise<FilterOption[]> {
    try {
      const response = await ApiService.get<unknown>('/api/v1/brands?per_page=1000');
      return ensureFilterArray(response);
    } catch (error) {
      console.error('Error fetching brands:', error);
      return [];
    }
  }

  async getMaterials(): Promise<FilterOption[]> {
    try {
      const response = await ApiService.get<unknown>('/api/v1/materials?per_page=1000');
      return ensureFilterArray(response);
    } catch (error) {
      console.error('Error fetching materials:', error);
      return [];
    }
  }

  async getLensClasses(): Promise<FilterOption[]> {
    try {
      const response = await ApiService.get<unknown>('/api/v1/lens-classes?per_page=1000');
      return ensureFilterArray(response);
    } catch (error) {
      console.error('Error fetching lens classes:', error);
      return [];
    }
  }

  async getTreatments(): Promise<FilterOption[]> {
    try {
      const response = await ApiService.get<unknown>('/api/v1/treatments?per_page=1000');
      return ensureFilterArray(response);
    } catch (error) {
      console.error('Error fetching treatments:', error);
      return [];
    }
  }

  async getSuppliers(): Promise<FilterOption[]> {
    try {
      const response = await ApiService.get<unknown>('/api/v1/suppliers?per_page=1000');
      return ensureFilterArray(response);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      return [];
    }
  }

  async getPhotochromics(): Promise<FilterOption[]> {
    try {
      const response = await ApiService.get<unknown>('/api/v1/photochromics?per_page=1000');
      return ensureFilterArray(response);
    } catch (error) {
      console.error('Error fetching photochromics:', error);
      return [];
    }
  }

  async getAllFilters(): Promise<{
    types: FilterOption[];
    brands: FilterOption[];
    materials: FilterOption[];
    lensClasses: FilterOption[];
    treatments: FilterOption[];
    suppliers: FilterOption[];
    photochromics: FilterOption[];
  }> {
    try {
      console.log('Loading all filter options...');
      
      const [types, brands, materials, lensClasses, treatments, suppliers, photochromics] = await Promise.allSettled([
        this.getLensTypes(),
        this.getBrands(),
        this.getMaterials(),
        this.getLensClasses(),
        this.getTreatments(),
        this.getSuppliers(),
        this.getPhotochromics()
      ]);

      const result = {
        types: types.status === 'fulfilled' ? types.value : [],
        brands: brands.status === 'fulfilled' ? brands.value : [],
        materials: materials.status === 'fulfilled' ? materials.value : [],
        lensClasses: lensClasses.status === 'fulfilled' ? lensClasses.value : [],
        treatments: treatments.status === 'fulfilled' ? treatments.value : [],
        suppliers: suppliers.status === 'fulfilled' ? suppliers.value : [],
        photochromics: photochromics.status === 'fulfilled' ? photochromics.value : []
      };

      console.log('Filter options loaded successfully:', {
        types: result.types.length,
        brands: result.brands.length,
        materials: result.materials.length,
        lensClasses: result.lensClasses.length,
        treatments: result.treatments.length,
        suppliers: result.suppliers.length,
        photochromics: result.photochromics.length
      });

      return result;
    } catch (error) {
      console.error('Error fetching all filters:', error);
      return {
        types: [],
        brands: [],
        materials: [],
        lensClasses: [],
        treatments: [],
        suppliers: [],
        photochromics: []
      };
    }
  }
}

export default new FilterService(); 