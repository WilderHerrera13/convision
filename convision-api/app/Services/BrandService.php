<?php

namespace App\Services;

use App\Models\Brand;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BrandService
{
    public function getFilteredBrands(Request $request)
    {
        return Brand::apiFilter($request);
    }

    public function createBrand(array $validatedData): Brand
    {
        DB::beginTransaction();

        try {
            $brand = Brand::create($validatedData);
            
            DB::commit();
            
            return $brand;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating brand: ' . $e->getMessage(), [
                'validated_data' => $validatedData
            ]);
            throw $e;
        }
    }

    public function updateBrand(Brand $brand, array $validatedData): Brand
    {
        DB::beginTransaction();

        try {
            $brand->update($validatedData);
            
            DB::commit();
            
            return $brand->fresh();

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating brand: ' . $e->getMessage(), [
                'brand_id' => $brand->id,
                'validated_data' => $validatedData
            ]);
            throw $e;
        }
    }

    public function deleteBrand(Brand $brand): bool
    {
        DB::beginTransaction();

        try {
            if ($brand->lenses()->exists()) {
                throw new \Exception('No se puede eliminar la marca porque está siendo utilizada por lentes.');
            }

            $brand->delete();
            
            DB::commit();
            
            return true;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting brand: ' . $e->getMessage(), [
                'brand_id' => $brand->id
            ]);
            throw $e;
        }
    }
} 