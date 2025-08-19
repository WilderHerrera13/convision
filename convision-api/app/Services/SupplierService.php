<?php

namespace App\Services;

use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SupplierService
{
    public function getFilteredSuppliers(Request $request)
    {
        // The apiFilter method on the model should handle all search/filter logic
        return Supplier::apiFilter($request)->orderBy('name');
    }

    public function createSupplier(array $validatedData): Supplier
    {
        DB::beginTransaction();
        try {
            $supplier = Supplier::create($validatedData);
            DB::commit();
            return $supplier;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating supplier: ' . $e->getMessage(), [
                'validated_data' => $validatedData,
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    public function updateSupplier(Supplier $supplier, array $validatedData): Supplier
    {
        DB::beginTransaction();
        try {
            $supplier->update($validatedData);
            DB::commit();
            return $supplier->fresh();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating supplier: ' . $e->getMessage(), [
                'supplier_id' => $supplier->id,
                'validated_data' => $validatedData,
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    public function deleteSupplier(Supplier $supplier): bool
    {
        DB::beginTransaction();
        try {
            if ($supplier->lenses()->exists() || $supplier->inventoryItems()->exists()) {
                throw new \Exception('No se puede eliminar el proveedor porque tiene lentes o artículos de inventario relacionados.');
            }
            $supplier->delete();
            DB::commit();
            return true;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting supplier: ' . $e->getMessage(), [
                'supplier_id' => $supplier->id,
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    public function findSupplier(int $supplierId): Supplier
    {
        return Supplier::findOrFail($supplierId);
    }
} 