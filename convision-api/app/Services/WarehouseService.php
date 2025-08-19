<?php

namespace App\Services;

use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class WarehouseService
{
    public function getFilteredWarehouses(Request $request)
    {
        return Warehouse::apiFilter($request);
    }

    public function createWarehouse(array $validatedData): Warehouse
    {
        DB::beginTransaction();
        try {
            $warehouse = Warehouse::create($validatedData);
            DB::commit();
            return $warehouse;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating warehouse: ' . $e->getMessage(), [
                'validated_data' => $validatedData,
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    public function updateWarehouse(Warehouse $warehouse, array $validatedData): Warehouse
    {
        DB::beginTransaction();
        try {
            $warehouse->update($validatedData);
            DB::commit();
            return $warehouse->fresh(); // Use fresh() to get updated attributes
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating warehouse: ' . $e->getMessage(), [
                'warehouse_id' => $warehouse->id,
                'validated_data' => $validatedData,
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    public function deleteWarehouse(Warehouse $warehouse): bool
    {
        DB::beginTransaction();
        try {
            if ($warehouse->inventoryItems()->exists()) { // Use exists() for efficiency
                throw new \Exception('No se puede eliminar el almacén porque tiene artículos de inventario.');
            }
            $warehouse->delete();
            DB::commit();
            return true;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting warehouse: ' . $e->getMessage(), [
                'warehouse_id' => $warehouse->id,
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    public function getWarehouseLocations(Warehouse $warehouse, Request $request)
    {
        $perPage = min(max(1, (int)$request->get('per_page', 15)), 100);
        return $warehouse->locations()->paginate($perPage);
    }

    public function findWarehouse(int $warehouseId): Warehouse
    {
        return Warehouse::findOrFail($warehouseId);
    }
} 