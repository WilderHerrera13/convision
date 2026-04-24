import ApiService from './ApiService';
import { prescriptionService, Prescription } from './prescriptionService'; // Import prescriptionService and Prescription type

export interface Lens {
  id: number;
  internal_code: string;
  identifier: string;
  description: string;
  price: string;
  cost: string;
  sphere_min: string;
  sphere_max: string;
  cylinder_min: string;
  cylinder_max: string;
  addition_min?: string;
  addition_max?: string;
  diameter?: number;
  base_curve?: number;
  prism?: number;
  uv_protection?: boolean;
  engraving?: string;
  availability?: string;
  status: string;
  created_at: string;
  updated_at: string;
  type_id: number;
  brand_id: number;
  material_id: number;
  lens_class_id: number;
  treatment_id: number;
  photochromic_id: number;
  supplier_id: number;
  type?: {
    id: number;
    name: string;
  };
  brand?: {
    id: number;
    name: string;
  };
  material?: {
    id: number;
    name: string;
  };
  lens_class?: {
    id: number;
    name: string;
  };
  treatment?: {
    id: number;
    name: string;
  };
  photochromic?: {
    id: number;
    name: string;
  };
  supplier?: {
    id: number;
    name: string;
  };
  notes?: {
    id: number;
    content: string;
    created_at: string;
    user?: {
      id: number;
      name: string;
    }
  }[];
  has_discounts?: boolean;
}

export interface FilterOption {
  id: number;
  name: string;
}

export interface LensSearchParams {
  brandId?: number;
  materialId?: number;
  lensClassId?: number;
  treatmentId?: number;
  query?: string;
  page?: number;
  perPage?: number;
  sortField?: string;
  sortDirection?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

class LensService {
  async testFilterEndpoints(): Promise<{ 
    success: boolean; 
    results: Record<string, {
      success: boolean;
      type?: string;
      count?: number;
      sample?: FilterOption | null;
      error?: unknown;
    }> 
  }> {
    try {
      console.log("Testing all filter endpoints directly...");
      const results: Record<string, {
        success: boolean;
        type?: string;
        count?: number;
        sample?: FilterOption | null;
        error?: unknown;
      }> = {};
      
      try {
        const brands = await ApiService.get<FilterOption[]>('/api/v1/brands');
        results.brands = {
          success: true,
          type: Array.isArray(brands) ? 'array' : typeof brands,
          count: Array.isArray(brands) ? brands.length : 0,
          sample: Array.isArray(brands) && brands.length > 0 ? brands[0] : null
        };
      } catch (error) {
        results.brands = { success: false, error };
      }
      
      try {
        const materials = await ApiService.get<FilterOption[]>('/api/v1/materials');
        results.materials = {
          success: true,
          type: Array.isArray(materials) ? 'array' : typeof materials,
          count: Array.isArray(materials) ? materials.length : 0,
          sample: Array.isArray(materials) && materials.length > 0 ? materials[0] : null
        };
      } catch (error) {
        results.materials = { success: false, error };
      }
      
      try {
        const lensClasses = await ApiService.get<FilterOption[]>('/api/v1/lens-classes');
        results.lensClasses = {
          success: true,
          type: Array.isArray(lensClasses) ? 'array' : typeof lensClasses,
          count: Array.isArray(lensClasses) ? lensClasses.length : 0,
          sample: Array.isArray(lensClasses) && lensClasses.length > 0 ? lensClasses[0] : null
        };
      } catch (error) {
        results.lensClasses = { success: false, error };
      }
      
      try {
        const treatments = await ApiService.get<FilterOption[]>('/api/v1/treatments');
        results.treatments = {
          success: true,
          type: Array.isArray(treatments) ? 'array' : typeof treatments,
          count: Array.isArray(treatments) ? treatments.length : 0,
          sample: Array.isArray(treatments) && treatments.length > 0 ? treatments[0] : null
        };
      } catch (error) {
        results.treatments = { success: false, error };
      }
      
      console.log("Filter endpoint test results:", results);
      return { success: true, results };
    } catch (error) {
      console.error("Error testing filter endpoints:", error);
      return { success: false, results: { error } };
    }
  }

  async searchLenses(params: LensSearchParams): Promise<PaginatedResponse<Lens>> {
    console.log('LensService.searchLenses called with params:', params);
    
    const searchParams = new URLSearchParams();
    
    // Set pagination
    searchParams.append('per_page', params.perPage?.toString() || '10');
    searchParams.append('page', params.page?.toString() || '1');
    
    // Build search fields and values arrays
    const searchFields: string[] = []; 
    const searchValues: string[] = []; 
    
    // Always filter by lens category - this is handled by ApiFilterable's dot notation
    searchFields.push('category.slug');
    searchValues.push('lens');
    
    // Add direct filter params that are actual columns on products table
    if (params.brandId) {
      searchParams.append('brand_id', params.brandId.toString());
      // Optionally, ApiFilterable can also pick it up if it's also in s_f/s_v for complex OR conditions,
      // but for simple AND, direct param is fine and handled by ApiFilterable's directIdFilters.
      // For consistency with how other attributes will be handled via s_f/s_v for lensAttributes,
      // we can add it here too.
      searchFields.push('brand_id');
      searchValues.push(params.brandId.toString());
    }
    
    // For attributes on product_lens_attributes, use dot notation for ApiFilterable
    if (params.materialId) {
      searchFields.push('lensAttributes.material_id');
      searchValues.push(params.materialId.toString());
    }
    
    if (params.lensClassId) {
      searchFields.push('lensAttributes.lens_class_id');
      searchValues.push(params.lensClassId.toString());
    }
    
    if (params.treatmentId) {
      searchFields.push('lensAttributes.treatment_id');
      searchValues.push(params.treatmentId.toString());
    }

    // Assuming LensSearchParams might get a photochromicId or typeId (lens_type_id)
    // if (params.photochromicId) {
    //   searchFields.push('lensAttributes.photochromic_id');
    //   searchValues.push(params.photochromicId.toString());
    // }
    // if (params.typeId) { // Assuming typeId maps to lens_type_id
    //   searchFields.push('lensAttributes.lens_type_id');
    //   searchValues.push(params.typeId.toString());
    // }
    
    if (params.query && params.query.trim() !== '') {
      searchParams.append('search', params.query.trim()); // General text search
      // For ApiFilterable's s_f/s_v, if you want specific field text search:
      searchFields.push('description'); 
      searchValues.push(params.query.trim());
    }
    
    // Only append if we have search parameters - ALWAYS use proper JSON strings
    if (searchFields.length > 0) {
      const fieldsJson = JSON.stringify(searchFields);
      const valuesJson = JSON.stringify(searchValues);
      
      console.log('Filter parameters being sent:', { 
        fields: fieldsJson, 
        values: valuesJson 
      });
      
      searchParams.append('s_f', fieldsJson);
      searchParams.append('s_v', valuesJson);
    }
    
    // Add sorting if provided
    if (params.sortField) {
      const sortDirection = params.sortDirection || 'asc';
      searchParams.append('sort', `${params.sortField},${sortDirection}`);
    } else {
      // Default sort by created_at,desc
      searchParams.append('sort', 'created_at,desc');
    }
    
    // Add timestamp to prevent caching
    searchParams.append('_t', Date.now().toString());
    
    const url = `/api/v1/products?${searchParams.toString()}`; // Changed from /lenses to /products
    console.log('API request URL:', url);
    
    try {
      console.log('Sending network request...');
      const start = performance.now();
      const response = await ApiService.get<PaginatedResponse<Lens>>(url);
      const end = performance.now();
      console.log(`API response received in ${Math.round(end - start)}ms:`, response);
      
      // Check if we've got the expected data structure
      if (!response || !response.data || !Array.isArray(response.data)) {
        console.error('Invalid response format received:', response);
        throw new Error('Invalid response format from API');
      }
      
      // Check if we've applied the filters correctly
      if (params.brandId) {
        const filteredResults = response.data.filter(lens => lens.brand_id === params.brandId);
        console.log(`Filter validation: ${filteredResults.length} of ${response.data.length} lenses match brand_id ${params.brandId}`);
        
        if (filteredResults.length !== response.data.length) {
          console.warn('Some lenses do not match the brand_id filter!');
        }
      }
      
      return response;
    } catch (error) {
      console.error('Error in API call for searchLenses:', error);
      throw error;
    }
  }
  
  async getFilterOptions(): Promise<{
    brands: FilterOption[];
    materials: FilterOption[];
    lensClasses: FilterOption[];
    treatments: FilterOption[];
  }> {
    try {
      console.log("Fetching filter options...");
      
      // Use individual try/catch for each endpoint to prevent one failure from breaking all filters
      let brands: FilterOption[] = [];
      let materials: FilterOption[] = [];
      let lensClasses: FilterOption[] = [];
      let treatments: FilterOption[] = [];
      
      try {
        const brandsResponse = await ApiService.get<FilterOption[]>('/api/v1/brands');
        brands = Array.isArray(brandsResponse) ? brandsResponse : [];
        console.log('Successfully loaded brands:', brands.length);
      } catch (error) {
        console.error('Error loading brands:', error);
      }
      
      try {
        const materialsResponse = await ApiService.get<FilterOption[]>('/api/v1/materials');
        materials = Array.isArray(materialsResponse) ? materialsResponse : [];
        console.log('Successfully loaded materials:', materials.length);
      } catch (error) {
        console.error('Error loading materials:', error);
      }
      
      try {
        const lensClassesResponse = await ApiService.get<FilterOption[]>('/api/v1/lens-classes');
        lensClasses = Array.isArray(lensClassesResponse) ? lensClassesResponse : [];
        console.log('Successfully loaded lens classes:', lensClasses.length);
      } catch (error) {
        console.error('Error loading lens classes:', error);
      }
      
      try {
        const treatmentsResponse = await ApiService.get<FilterOption[]>('/api/v1/treatments');
        treatments = Array.isArray(treatmentsResponse) ? treatmentsResponse : [];
        console.log('Successfully loaded treatments:', treatments.length);
      } catch (error) {
        console.error('Error loading treatments:', error);
      }
      
      // Log the combined result
      console.log('Filter options after processing:');
      console.log('- Brands:', brands.length);
      console.log('- Materials:', materials.length);
      console.log('- Lens Classes:', lensClasses.length);
      console.log('- Treatments:', treatments.length);
      
      return {
        brands,
        materials,
        lensClasses,
        treatments
      };
    } catch (error) {
      console.error('Error fetching filter options:', error);
      return {
        brands: [],
        materials: [],
        lensClasses: [],
        treatments: []
      };
    }
  }
  
  async getLensById(id: number): Promise<Lens> {
    try {
      console.log(`LensService.getLensById called with id: ${id}`);
      const response = await ApiService.get<Lens>(`/api/v1/products/${id}`); // Changed from /lenses to /products
      console.log('API response for getLensById:', response);
      
      if (!response) { // Check if response is null or undefined
        throw new Error('No response received from API for getLensById');
      }
      
      return response; // Directly return the response if it's expected to be Lens
    } catch (error) {
      console.error('Error fetching lens by id:', error);
      throw error;
    }
  }
  
  async searchBrands(query: string): Promise<FilterOption[]> {
    try {
      console.log(`Searching brands with query: "${query}"`);
      const searchParams = new URLSearchParams();
      if (query && query.trim() !== '') {
        searchParams.append('s_f', JSON.stringify(['name']));
        searchParams.append('s_v', JSON.stringify([query.trim()]));
      }
      
      try {
        // Add specific validation for this endpoint
        const response = await ApiService.get<unknown>(`/api/v1/brands?${searchParams.toString()}`);
        
        // Log the response for debugging
        console.log('Search Brands Response:', response);
        
        // Handle multiple possible response formats
        let brands: FilterOption[] = [];
        
        if (Array.isArray(response)) {
          // Direct array response
          brands = response as FilterOption[];
        } else if (response && typeof response === 'object') {
          // Check if response has a data property that is an array
          if (response !== null && 'data' in response && Array.isArray((response as Record<string, unknown>).data)) {
            brands = (response as Record<string, unknown>).data as FilterOption[];
          } else {
            // Check if any property contains an array we can use
            const arrayProps = Object.values(response as Record<string, unknown>).filter(val => Array.isArray(val));
            if (arrayProps.length > 0) {
              // Use the first array property found
              brands = arrayProps[0] as FilterOption[];
            }
          }
        }
        
        console.log(`Found ${brands.length} brands matching query:`, query);
        return brands;
      } catch (error) {
        console.error('API Error searching brands:', error);
        // Return empty array but don't break the UI
        return [];
      }
    } catch (error) {
      console.error('Error searching brands:', error);
      return [];
    }
  }
  
  async searchMaterials(query: string): Promise<FilterOption[]> {
    try {
      console.log(`Searching materials with query: "${query}"`);
      const searchParams = new URLSearchParams();
      if (query && query.trim() !== '') {
        searchParams.append('s_f', JSON.stringify(['name']));
        searchParams.append('s_v', JSON.stringify([query.trim()]));
      }
      
      try {
        // Add specific validation for this endpoint
        const response = await ApiService.get<unknown>(`/api/v1/materials?${searchParams.toString()}`);
        
        // Log the response for debugging
        console.log('Search Materials Response:', response);
        
        // Handle multiple possible response formats
        let materials: FilterOption[] = [];
        
        if (Array.isArray(response)) {
          // Direct array response
          materials = response as FilterOption[];
        } else if (response && typeof response === 'object') {
          // Check if response has a data property that is an array
          if (response !== null && 'data' in response && Array.isArray((response as Record<string, unknown>).data)) {
            materials = (response as Record<string, unknown>).data as FilterOption[];
          } else {
            // Check if any property contains an array we can use
            const arrayProps = Object.values(response as Record<string, unknown>).filter(val => Array.isArray(val));
            if (arrayProps.length > 0) {
              // Use the first array property found
              materials = arrayProps[0] as FilterOption[];
            }
          }
        }
        
        console.log(`Found ${materials.length} materials matching query:`, query);
        return materials;
      } catch (error) {
        console.error('API Error searching materials:', error);
        // Return empty array but don't break the UI
        return [];
      }
    } catch (error) {
      console.error('Error searching materials:', error);
      return [];
    }
  }
  
  async searchLensClasses(query: string): Promise<FilterOption[]> {
    try {
      console.log(`Searching lens classes with query: "${query}"`);
      const searchParams = new URLSearchParams();
      if (query && query.trim() !== '') {
        searchParams.append('s_f', JSON.stringify(['name']));
        searchParams.append('s_v', JSON.stringify([query.trim()]));
      }
      
      try {
        // Add specific validation for this endpoint
        const response = await ApiService.get<unknown>(`/api/v1/lens-classes?${searchParams.toString()}`);
        
        // Log the response for debugging
        console.log('Search Lens Classes Response:', response);
        
        // Handle multiple possible response formats
        let lensClasses: FilterOption[] = [];
        
        if (Array.isArray(response)) {
          // Direct array response
          lensClasses = response as FilterOption[];
        } else if (response && typeof response === 'object') {
          // Check if response has a data property that is an array
          if (response !== null && 'data' in response && Array.isArray((response as Record<string, unknown>).data)) {
            lensClasses = (response as Record<string, unknown>).data as FilterOption[];
          } else {
            // Check if any property contains an array we can use
            const arrayProps = Object.values(response as Record<string, unknown>).filter(val => Array.isArray(val));
            if (arrayProps.length > 0) {
              // Use the first array property found
              lensClasses = arrayProps[0] as FilterOption[];
            }
          }
        }
        
        console.log(`Found ${lensClasses.length} lens classes matching query:`, query);
        return lensClasses;
      } catch (error) {
        console.error('API Error searching lens classes:', error);
        // Return empty array but don't break the UI
        return [];
      }
    } catch (error) {
      console.error('Error searching lens classes:', error);
      return [];
    }
  }
  
  async searchTreatments(query: string): Promise<FilterOption[]> {
    try {
      console.log(`Searching treatments with query: "${query}"`);
      const searchParams = new URLSearchParams();
      if (query && query.trim() !== '') {
        searchParams.append('s_f', JSON.stringify(['name']));
        searchParams.append('s_v', JSON.stringify([query.trim()]));
      }
      
      try {
        // Add specific validation for this endpoint
        const response = await ApiService.get<unknown>(`/api/v1/treatments?${searchParams.toString()}`);
        
        // Log the response for debugging
        console.log('Search Treatments Response:', response);
        
        // Handle multiple possible response formats
        let treatments: FilterOption[] = [];
        
        if (Array.isArray(response)) {
          // Direct array response
          treatments = response as FilterOption[];
        } else if (response && typeof response === 'object') {
          // Check if response has a data property that is an array
          if (response !== null && 'data' in response && Array.isArray((response as Record<string, unknown>).data)) {
            treatments = (response as Record<string, unknown>).data as FilterOption[];
          } else {
            // Check if any property contains an array we can use
            const arrayProps = Object.values(response as Record<string, unknown>).filter(val => Array.isArray(val));
            if (arrayProps.length > 0) {
              // Use the first array property found
              treatments = arrayProps[0] as FilterOption[];
            }
          }
        }
        
        console.log(`Found ${treatments.length} treatments matching query:`, query);
        return treatments;
      } catch (error) {
        console.error('API Error searching treatments:', error);
        // Return empty array but don't break the UI
        return [];
      }
    } catch (error) {
      console.error('Error searching treatments:', error);
      return [];
    }
  }

  // New method to get recommended lenses based on prescription
  async getRecommendedLenses(prescriptionData: Prescription): Promise<Lens[]> { // Accept full prescription data
    try {
      console.log(`LensService.getRecommendedLenses called with prescription data:`, prescriptionData);
      
      const params = new URLSearchParams();
      // Map prescription fields to expected query parameters
      // Ensure to handle cases where values might be null, undefined or need specific formatting if required by backend
      if (prescriptionData.right_sphere) params.append('sphere_od', prescriptionData.right_sphere);
      if (prescriptionData.right_cylinder) params.append('cylinder_od', prescriptionData.right_cylinder);
      if (prescriptionData.right_addition) params.append('addition_od', prescriptionData.right_addition);
      if (prescriptionData.left_sphere) params.append('sphere_os', prescriptionData.left_sphere);
      if (prescriptionData.left_cylinder) params.append('cylinder_os', prescriptionData.left_cylinder);
      if (prescriptionData.left_addition) params.append('addition_os', prescriptionData.left_addition);

      // Add a timestamp to prevent caching, if desired for this endpoint
      params.append('_t', Date.now().toString());

      const url = `/api/v1/products/lenses/by-prescription?${params.toString()}`;
      console.log('API request URL for getRecommendedLenses:', url);
      
      const response = await ApiService.get<{ data: Lens[] }>(url); 
      
      console.log('API response for getRecommendedLenses:', response);
      
      if (!response || !response.data || !Array.isArray(response.data)) {
        console.error('Invalid response structure for recommended lenses:', response);
        throw new Error('Invalid response structure for recommended lenses');
      }
      return response.data;
    } catch (error) {
      console.error('Error fetching recommended lenses:', error);
      throw error;
    }
  }
}

export const lensService = new LensService(); 