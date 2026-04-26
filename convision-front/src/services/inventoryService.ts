import ApiService from './ApiService';
import { Lens } from './lensService';

export interface Warehouse {
  id: number;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  status: 'active' | 'inactive';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WarehouseLocation {
  id: number;
  warehouse_id: number;
  name: string;
  code: string;
  type: string | null;
  status: 'active' | 'inactive';
  description: string | null;
  created_at: string;
  updated_at: string;
  warehouse?: Warehouse;
}

export interface InventoryItem {
  id: number;
  lens_id: number;
  warehouse_id: number;
  warehouse_location_id: number;
  quantity: number;
  status: 'available' | 'reserved' | 'damaged';
  notes: string | null;
  created_at: string;
  updated_at: string;
  lens?: Lens;
  warehouse?: Warehouse;
  warehouseLocation?: WarehouseLocation;
}

export interface InventoryTransfer {
  id: number;
  lens_id: number;
  source_location_id: number;
  destination_location_id: number;
  quantity: number;
  transferred_by: number;
  notes: string | null;
  status: 'pending' | 'completed' | 'cancelled';
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  lens?: Lens;
  sourceLocation?: WarehouseLocation;
  destinationLocation?: WarehouseLocation;
  transferredBy?: { id: number; name: string };
}

export interface LensInventory {
  lens: Lens;
  inventory: InventoryItem[];
  total_quantity: number;
}

interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface InventorySearchParams {
  warehouseId?: number;
  locationId?: number;
  status?: string;
  query?: string;
  page?: number;
  perPage?: number;
  sortField?: string;
  sortDirection?: string;
}

export interface LensWithInventory extends Lens {
  total_quantity: number;
}

export interface LensCatalogItem {
  id: number;
  internal_code: string;
  identifier: string;
  description?: string;
  cost?: number;
  price: number;
  product_type: string;
  tracks_stock: boolean;
  status: string;
  supplier_id?: number;
  brand?: { id: number; name: string };
  supplier?: { id: number; name: string };
  lens_attributes?: {
    id: number;
    product_id: number;
    lens_type_id?: number;
    material_id?: number;
    lens_class_id?: number;
    treatment_id?: number;
    photochromic_id?: number;
    sphere_min: number;
    sphere_max: number;
    cylinder_min: number;
    cylinder_max: number;
    addition_min: number;
    addition_max: number;
    diameter: number;
    base_curve: number;
    prism: number;
    uv_protection: boolean;
    engraving: string;
    availability: string;
    lens_type?: { id: number; name: string };
    material?: { id: number; name: string };
    lens_class?: { id: number; name: string };
    treatment?: { id: number; name: string };
    photochromic?: { id: number; name: string };
  };
}

export interface LensCatalogParams {
  page?: number;
  perPage?: number;
  search?: string;
  brand_id?: number;
  supplier_id?: number;
  status?: string;
}

export interface StockMovement {
  id: number;
  product_id: number;
  warehouse_id: number;
  movement_type: string;
  reference_type?: string;
  reference_id?: number;
  quantity_before: number;
  quantity_delta: number;
  quantity_after: number;
  unit_cost: number;
  notes?: string;
  created_at: string;
  product?: { id: number; internal_code: string; identifier: string };
  warehouse?: { id: number; name: string };
}

export interface CreateAdjustmentParams {
  inventory_item_id: number;
  adjustment_reason: string;
  quantity_delta: number;
  notes?: string;
  evidence_url?: string;
}

export interface InventoryAdjustment {
  id: number;
  inventory_item_id: number;
  adjustment_reason: string;
  quantity_delta: number;
  quantity_before: number;
  quantity_after: number;
  status: 'pending_approval' | 'approved' | 'rejected';
  requested_by: number;
  approved_by?: number;
  notes?: string;
  reviewed_at?: string;
  created_at: string;
}

class InventoryService {
  // Warehouse methods
  async getWarehouses(params?: { page?: number, perPage?: number, status?: string }): Promise<PaginatedResponse<Warehouse>> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.perPage) searchParams.append('per_page', params.perPage.toString());
    
    if (params?.status) {
      searchParams.append('s_f', JSON.stringify(['status']));
      searchParams.append('s_v', JSON.stringify([params.status]));
    }
    
    return await ApiService.get<PaginatedResponse<Warehouse>>(`/api/v1/warehouses?${searchParams.toString()}`);
  }
  
  async getWarehouse(id: number): Promise<Warehouse> {
    return await ApiService.get<Warehouse>(`/api/v1/warehouses/${id}`);
  }
  
  async createWarehouse(data: Partial<Warehouse>): Promise<Warehouse> {
    return await ApiService.post<Warehouse>('/api/v1/warehouses', data);
  }
  
  async updateWarehouse(id: number, data: Partial<Warehouse>): Promise<Warehouse> {
    return await ApiService.put<Warehouse>(`/api/v1/warehouses/${id}`, data);
  }
  
  async deleteWarehouse(id: number): Promise<void> {
    return await ApiService.delete<void>(`/api/v1/warehouses/${id}`);
  }
  
  async getWarehouseLocations(warehouseId: number, params?: { page?: number, perPage?: number }): Promise<PaginatedResponse<WarehouseLocation>> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.perPage) searchParams.append('per_page', params.perPage.toString());
    
    return await ApiService.get<PaginatedResponse<WarehouseLocation>>(
      `/api/v1/warehouses/${warehouseId}/locations?${searchParams.toString()}`
    );
  }
  
  // Warehouse Location methods
  async getLocations(params?: { page?: number, perPage?: number, warehouseId?: number }): Promise<PaginatedResponse<WarehouseLocation>> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.perPage) searchParams.append('per_page', params.perPage.toString());
    
    if (params?.warehouseId) {
      searchParams.append('s_f', JSON.stringify(['warehouse_id']));
      searchParams.append('s_v', JSON.stringify([params.warehouseId.toString()]));
    }
    
    return await ApiService.get<PaginatedResponse<WarehouseLocation>>(`/api/v1/warehouse-locations?${searchParams.toString()}`);
  }
  
  async getLocation(id: number): Promise<WarehouseLocation> {
    return await ApiService.get<WarehouseLocation>(`/api/v1/warehouse-locations/${id}`);
  }
  
  async createLocation(data: Partial<WarehouseLocation>): Promise<WarehouseLocation> {
    return await ApiService.post<WarehouseLocation>('/api/v1/warehouse-locations', data);
  }
  
  async updateLocation(id: number, data: Partial<WarehouseLocation>): Promise<WarehouseLocation> {
    return await ApiService.put<WarehouseLocation>(`/api/v1/warehouse-locations/${id}`, data);
  }
  
  async deleteLocation(id: number): Promise<void> {
    return await ApiService.delete<void>(`/api/v1/warehouse-locations/${id}`);
  }
  
  async getLocationInventory(locationId: number, params?: { page?: number, perPage?: number }): Promise<PaginatedResponse<InventoryItem>> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.perPage) searchParams.append('per_page', params.perPage.toString());
    
    return await ApiService.get<PaginatedResponse<InventoryItem>>(
      `/api/v1/warehouse-locations/${locationId}/inventory?${searchParams.toString()}`
    );
  }
  
  // Inventory Item methods
  async getInventoryItems(params?: InventorySearchParams): Promise<PaginatedResponse<InventoryItem>> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.perPage) searchParams.append('per_page', params.perPage.toString());
    
    const searchFields: string[] = [];
    const searchValues: string[] = [];
    
    if (params?.warehouseId) {
      searchFields.push('warehouse_id');
      searchValues.push(params.warehouseId.toString());
    }
    
    if (params?.locationId) {
      searchFields.push('warehouse_location_id');
      searchValues.push(params.locationId.toString());
    }
    
    if (params?.status) {
      searchFields.push('status');
      searchValues.push(params.status);
    }
    
    if (searchFields.length > 0) {
      searchParams.append('s_f', JSON.stringify(searchFields));
      searchParams.append('s_v', JSON.stringify(searchValues));
    }
    
    if (params?.sortField) {
      const sortDirection = params.sortDirection || 'asc';
      searchParams.append('sort', `${params.sortField},${sortDirection}`);
    }
    
    return await ApiService.get<PaginatedResponse<InventoryItem>>(`/api/v1/inventory-items?${searchParams.toString()}`);
  }
  
  async getInventoryItem(id: number): Promise<InventoryItem> {
    return await ApiService.get<InventoryItem>(`/api/v1/inventory-items/${id}`);
  }
  
  async createInventoryItem(data: Partial<InventoryItem>): Promise<InventoryItem> {
    return await ApiService.post<InventoryItem>('/api/v1/inventory-items', data);
  }
  
  async updateInventoryItem(id: number, data: Partial<InventoryItem>): Promise<InventoryItem> {
    return await ApiService.put<InventoryItem>(`/api/v1/inventory-items/${id}`, data);
  }
  
  async deleteInventoryItem(id: number): Promise<void> {
    return await ApiService.delete<void>(`/api/v1/inventory-items/${id}`);
  }
  
  async getTotalStock(params?: { warehouseId?: number; locationId?: number; page?: number; perPage?: number }): Promise<PaginatedResponse<LensWithInventory>> {
    const searchParams = new URLSearchParams();

    if (params?.warehouseId) searchParams.append('warehouse_id', params.warehouseId.toString());
    if (params?.locationId) searchParams.append('warehouse_location_id', params.locationId.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.perPage) searchParams.append('per_page', params.perPage.toString());

    return await ApiService.get<PaginatedResponse<LensWithInventory>>(`/api/v1/inventory/total-stock?${searchParams.toString()}`);
  }
  
  async getLensInventory(lensId: number): Promise<LensInventory> {
    return await ApiService.get<LensInventory>(`/api/v1/lenses/${lensId}/inventory`);
  }
  
  // Inventory Transfer methods
  async getTransfers(params?: { page?: number; perPage?: number; status?: string }): Promise<PaginatedResponse<InventoryTransfer>> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.perPage) searchParams.append('per_page', params.perPage.toString());
    if (params?.status) {
      searchParams.append('s_f', JSON.stringify(['status']));
      searchParams.append('s_v', JSON.stringify([params.status]));
    }

    return await ApiService.get<PaginatedResponse<InventoryTransfer>>(`/api/v1/inventory-transfers?${searchParams.toString()}`);
  }
  
  async getTransfer(id: number): Promise<InventoryTransfer> {
    return await ApiService.get<InventoryTransfer>(`/api/v1/inventory-transfers/${id}`);
  }
  
  async createTransfer(data: Partial<InventoryTransfer>): Promise<InventoryTransfer> {
    return await ApiService.post<InventoryTransfer>('/api/v1/inventory-transfers', data);
  }
  
  async updateTransfer(id: number, data: Partial<InventoryTransfer>): Promise<InventoryTransfer> {
    return await ApiService.put<InventoryTransfer>(`/api/v1/inventory-transfers/${id}`, data);
  }

  async getLensProduct(id: number): Promise<LensCatalogItem> {
    return await ApiService.get<LensCatalogItem>(`/api/v1/products/${id}`);
  }

  async getLensCatalog(params: LensCatalogParams = {}): Promise<PaginatedResponse<LensCatalogItem>> {
    const { page = 1, perPage = 15, search, brand_id, supplier_id, status } = params;
    const query = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (search) query.set('search', search);
    if (brand_id) query.set('brand_id', String(brand_id));
    if (supplier_id) query.set('supplier_id', String(supplier_id));
    if (status) query.set('status', status);
    return await ApiService.get<PaginatedResponse<LensCatalogItem>>(`/api/v1/inventory/lens-catalog?${query.toString()}`);
  }

  async getStockMovements(params: { page?: number; perPage?: number; product_id?: number; warehouse_id?: number; movement_type?: string } = {}): Promise<PaginatedResponse<StockMovement>> {
    const { page = 1, perPage = 20, product_id, warehouse_id, movement_type } = params;
    const query = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (product_id) query.set('product_id', String(product_id));
    if (warehouse_id) query.set('warehouse_id', String(warehouse_id));
    if (movement_type) query.set('movement_type', movement_type);
    return await ApiService.get<PaginatedResponse<StockMovement>>(`/api/v1/inventory/movements?${query.toString()}`);
  }

  async createAdjustment(data: CreateAdjustmentParams): Promise<InventoryAdjustment> {
    return await ApiService.post<InventoryAdjustment>('/api/v1/inventory/adjustments', data);
  }

  async approveAdjustment(id: number): Promise<InventoryAdjustment> {
    return await ApiService.patch<InventoryAdjustment>(`/api/v1/inventory/adjustments/${id}/approve`);
  }

  async rejectAdjustment(id: number, notes?: string): Promise<InventoryAdjustment> {
    return await ApiService.patch<InventoryAdjustment>(`/api/v1/inventory/adjustments/${id}/reject`, { notes });
  }
}

export const inventoryService = new InventoryService(); 