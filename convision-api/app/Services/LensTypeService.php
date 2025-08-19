<?php

namespace App\Services;

use App\Models\LensType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LensTypeService
{
    public function getFilteredLensTypes(Request $request)
    {
        return LensType::apiFilter($request);
    }

    public function createLensType(array $validatedData): LensType
    {
        DB::beginTransaction();

        try {
            $lensType = LensType::create($validatedData);
            
            DB::commit();
            
            return $lensType;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating lens type: ' . $e->getMessage(), [
                'validated_data' => $validatedData
            ]);
            throw $e;
        }
    }

    public function updateLensType(LensType $lensType, array $validatedData): LensType
    {
        DB::beginTransaction();

        try {
            $lensType->update($validatedData);
            
            DB::commit();
            
            return $lensType->fresh();

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating lens type: ' . $e->getMessage(), [
                'lens_type_id' => $lensType->id,
                'validated_data' => $validatedData
            ]);
            throw $e;
        }
    }

    public function deleteLensType(LensType $lensType): bool
    {
        DB::beginTransaction();

        try {
            if ($lensType->lenses()->exists()) {
                throw new \Exception('No se puede eliminar el tipo de lente porque está en uso.');
            }

            $lensType->delete();
            
            DB::commit();
            
            return true;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting lens type: ' . $e->getMessage(), [
                'lens_type_id' => $lensType->id
            ]);
            throw $e;
        }
    }

    public function findLensType(int $lensTypeId): LensType
    {
        return LensType::findOrFail($lensTypeId);
    }
} 