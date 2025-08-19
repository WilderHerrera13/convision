<?php

namespace App\Services;

use App\Models\InventoryItem;
use App\Models\Product;
use App\Models\WarehouseLocation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class InventoryItemService
{
    public function getFilteredInventoryItems(Request $request)
    {
        $query = InventoryItem::with(['product', 'warehouse', 'warehouseLocation']);
        
        $this->applyFilters($query, $request);
        
        return $query->apiFilter($request)->orderBy('created_at', 'desc');
    }

    public function createInventoryItem(array $validatedData): InventoryItem
    {
        DB::beginTransaction();

        try {
            $this->validateLocationWarehouse($validatedData['warehouse_location_id'], $validatedData['warehouse_id']);
            $this->checkExistingInventoryItem($validatedData['product_id'], $validatedData['warehouse_location_id']);

            $item = InventoryItem::create($validatedData);
            
            DB::commit();
            return $item->load(['product', 'warehouse', 'warehouseLocation']);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating inventory item: ' . $e->getMessage(), [
                'validated_data' => $validatedData
            ]);
            throw $e;
        }
    }

    public function updateInventoryItem(InventoryItem $inventoryItem, array $validatedData): InventoryItem
    {
        DB::beginTransaction();

        try {
            if (isset($validatedData['warehouse_location_id'])) {
                $targetWarehouseId = $validatedData['warehouse_id'] ?? $inventoryItem->warehouse_id;
                $this->validateLocationWarehouse($validatedData['warehouse_location_id'], $targetWarehouseId);
            }

            $this->checkDuplicateInventoryItem($inventoryItem, $validatedData);

            $inventoryItem->update($validatedData);
            
            DB::commit();
            return $inventoryItem->load(['product', 'warehouse', 'warehouseLocation']);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating inventory item: ' . $e->getMessage(), [
                'inventory_item_id' => $inventoryItem->id,
                'validated_data' => $validatedData
            ]);
            throw $e;
        }
    }

    public function deleteInventoryItem(InventoryItem $inventoryItem): bool
    {
        if ($inventoryItem->quantity > 0) {
            throw new \Exception('No se puede eliminar un ítem de inventario con cantidad mayor a cero.');
        }

        DB::beginTransaction();

        try {
            $inventoryItem->delete();
            DB::commit();
            return true;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting inventory item: ' . $e->getMessage(), [
                'inventory_item_id' => $inventoryItem->id
            ]);
            throw $e;
        }
    }

    public function getTotalStock(Request $request)
    {
        $query = Product::with(['brand', 'supplier', 'category']);
        
        $query->leftJoin('inventory_items', 'products.id', '=', 'inventory_items.product_id')
            ->select(
                'products.*',
                DB::raw('COALESCE(SUM(inventory_items.quantity), 0) as total_quantity')
            )
            ->groupBy('products.id');
            
        $this->applyStockFilters($query, $request);

        return $query->apiFilter($request);
    }

    public function getProductInventory(Product $product): Product
    {
        return $product->load(['brand', 'supplier', 'category', 'inventoryItems.warehouse', 'inventoryItems.warehouseLocation']);
    }

    protected function applyFilters($query, Request $request)
    {
        if ($request->has('product_id')) {
            $query->where('product_id', $request->product_id);
        }
        
        if ($request->has('warehouse_id')) {
            $query->where('warehouse_id', $request->warehouse_id);
        }
        
        if ($request->has('warehouse_location_id')) {
            $query->where('warehouse_location_id', $request->warehouse_location_id);
        }
        
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
    }

    protected function applyStockFilters($query, Request $request)
    {
        if ($request->has('warehouse_id')) {
            $query->where('inventory_items.warehouse_id', $request->warehouse_id);
        }
        
        if ($request->has('warehouse_location_id')) {
            $query->where('inventory_items.warehouse_location_id', $request->warehouse_location_id);
        }

        if ($request->has('category_id')) {
            $query->where('products.product_category_id', $request->category_id);
        }
        
        if ($request->has('brand_id')) {
            $query->where('products.brand_id', $request->brand_id);
        }

        if ($request->has('supplier_id')) {
            $query->where('products.supplier_id', $request->supplier_id);
        }
    }

    protected function validateLocationWarehouse(int $warehouseLocationId, int $warehouseId)
    {
        $location = WarehouseLocation::find($warehouseLocationId);
        if (!$location || $location->warehouse_id != $warehouseId) {
            throw new \Exception('La ubicación especificada no pertenece al almacén indicado.');
        }
    }

    protected function checkExistingInventoryItem(int $productId, int $warehouseLocationId)
    {
        $existingItem = InventoryItem::where('product_id', $productId)
            ->where('warehouse_location_id', $warehouseLocationId)
            ->first();

        if ($existingItem) {
            throw new \Exception('Ya existe un ítem de inventario para este producto en esta ubicación. Considere actualizar el existente.');
        }
    }

    protected function checkDuplicateInventoryItem(InventoryItem $inventoryItem, array $validatedData)
    {
        $newProductId = $validatedData['product_id'] ?? $inventoryItem->product_id;
        $newLocationId = $validatedData['warehouse_location_id'] ?? $inventoryItem->warehouse_location_id;

        if ((isset($validatedData['product_id']) && $newProductId != $inventoryItem->product_id) || 
            (isset($validatedData['warehouse_location_id']) && $newLocationId != $inventoryItem->warehouse_location_id)) {
            
            $existingItem = InventoryItem::where('product_id', $newProductId)
                ->where('warehouse_location_id', $newLocationId)
                ->where('id', '!=', $inventoryItem->id)
                ->first();

            if ($existingItem) {
                throw new \Exception('Ya existe otro ítem de inventario para este producto en esta ubicación.');
            }
        }
    }
} 