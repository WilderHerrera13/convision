import ApiService from './ApiService';

export interface Lens {
  id: number;
  internal_code: string;
  identifier: string;
  description: string;
  price: string;
  cost: string;
  category: {
    id: number;
    name: string;
    slug: string;
  };
  brand: {
    id: number;
    name: string;
  };
  supplier: {
    id: number;
    name: string;
  };
  lens_attributes: {
    id: number;
    product_id: number;
    lens_type_id: number;
    material_id: number;
    lens_class_id: number;
    treatment_id: number | null;
    photochromic_id: number | null;
    sphere_min: string;
    sphere_max: string;
    cylinder_min: string;
    cylinder_max: string;
    addition_min: string;
    addition_max: string;
    diameter?: number;
    base_curve?: number;
    prism?: number;
    uv_protection?: boolean;
    engraving?: string;
    availability?: string;
    lens_type: { id: number; name: string };
    material: { id: number; name: string };
    lens_class: { id: number; name: string; description?: string };
    treatment: { id: number; name: string } | null;
    photochromic: { id: number; name: string } | null;
  };
  sphere_min?: string;
  sphere_max?: string;
  cylinder_min?: string;
  cylinder_max?: string;
  addition_min?: string;
  addition_max?: string;
  diameter?: number;
  base_curve?: number;
  prism?: number;
  uv_protection?: boolean;
  engraving?: string;
  availability?: string;
  type_id: number;
  brand_id: number;
  material_id: number;
  lens_class_id: number;
  treatment_id: number | null;
  photochromic_id: number | null;
  supplier_id: number;
  type: { id: number; name: string };
  material: { id: number; name: string };
  lens_class: { id: number; name: string };
  treatment: { id: number; name: string } | null;
  photochromic: { id: number; name: string } | null;
  has_discounts: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse {
  data: Lens[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    links: {
      url: string | null;
      label: string;
      active: boolean;
    }[];
    path: string;
    per_page: number;
    to: number;
    total: number;
  };
}

export interface Note {
  id: number;
  lens_id: number;
  user_id: number;
  content: string;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    name: string;
    email: string | null;
    role: string | null;
    created_at: string | null;
    updated_at: string | null;
  };
}

export interface LensSearchParams {
  per_page?: number;
  page?: number;
  description?: string;
  lens_type_id?: number;
  brand_id?: number;
  material_id?: number;
  lens_class_id?: number;
  treatment_id?: number;
  supplier_id?: number;
  sort?: string;
}

class CatalogService {
  async getLenses(params: LensSearchParams = {}): Promise<PaginatedResponse> {
    try {
      const searchParams = new URLSearchParams({
        per_page: params.per_page?.toString() || '15',
        page: params.page?.toString() || '1',
      });

      if (params.lens_type_id) searchParams.append('lens_type_id', params.lens_type_id.toString());
      if (params.brand_id) searchParams.append('brand_id', params.brand_id.toString());
      if (params.material_id) searchParams.append('material_id', params.material_id.toString());
      if (params.lens_class_id) searchParams.append('lens_class_id', params.lens_class_id.toString());
      if (params.treatment_id) searchParams.append('treatment_id', params.treatment_id.toString());
      if (params.supplier_id) searchParams.append('supplier_id', params.supplier_id.toString());

      const searchFields: string[] = [];
      const searchValues: string[] = [];

      if (params.description) {
        searchFields.push('description');
        searchValues.push(params.description);
      }

      if (searchFields.length > 0) {
        searchParams.append('s_f', JSON.stringify(searchFields));
        searchParams.append('s_v', JSON.stringify(searchValues));
      }

      if (params.sort) {
        searchParams.append('sort', params.sort);
      } else {
        searchParams.append('sort', 'created_at,asc');
      }

      const response = await ApiService.get<PaginatedResponse>(
        `/api/v1/products/category/lens?${searchParams.toString()}`
      );

      return response;
    } catch (error) {
      console.error('Error fetching lenses:', error);
      throw error;
    }
  }

  async getLensById(id: number): Promise<Lens> {
    try {
      const response = await ApiService.get<{ data: Lens }>(`/api/v1/products/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching lens by ID:', error);
      throw error;
    }
  }

  async getLensNotes(lensId: number): Promise<Note[]> {
    try {
      const response = await ApiService.get<{ data: Note[] }>(`/api/v1/products/${lensId}/notes`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching lens notes:', error);
      return [];
    }
  }

  async addLensNote(lensId: number, content: string): Promise<void> {
    try {
      await ApiService.post(`/api/v1/products/${lensId}/notes`, { content });
    } catch (error) {
      console.error('Error adding lens note:', error);
      throw error;
    }
  }
}

export const catalogService = new CatalogService();
export default catalogService; 