<?php

namespace App\Services;

use App\Models\Material;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MaterialService
{
    public function getFilteredMaterials(Request $request)
    {
        return Material::apiFilter($request);
    }

    public function createMaterial(array $validatedData): Material
    {
        DB::beginTransaction();
        try {
            $material = Material::create($validatedData);
            DB::commit();
            return $material;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating material: ' . $e->getMessage(), [
                'validated_data' => $validatedData,
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    public function updateMaterial(Material $material, array $validatedData): Material
    {
        DB::beginTransaction();
        try {
            $material->update($validatedData);
            DB::commit();
            return $material->fresh();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating material: ' . $e->getMessage(), [
                'material_id' => $material->id,
                'validated_data' => $validatedData,
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    public function deleteMaterial(Material $material): bool
    {
        DB::beginTransaction();
        try {
            if ($material->lenses()->exists()) {
                throw new \Exception('No se puede eliminar el material porque está siendo utilizado por lentes.');
            }
            $material->delete();
            DB::commit();
            return true;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting material: ' . $e->getMessage(), [
                'material_id' => $material->id,
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }
} 