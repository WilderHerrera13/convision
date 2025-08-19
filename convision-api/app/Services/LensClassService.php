<?php

namespace App\Services;

use App\Models\LensClass;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LensClassService
{
    public function getFilteredLensClasses(Request $request)
    {
        return LensClass::apiFilter($request);
    }

    public function createLensClass(array $validatedData): LensClass
    {
        DB::beginTransaction();

        try {
            $lensClass = LensClass::create($validatedData);
            
            DB::commit();
            
            return $lensClass;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating lens class: ' . $e->getMessage(), [
                'validated_data' => $validatedData
            ]);
            throw $e;
        }
    }

    public function updateLensClass(LensClass $lensClass, array $validatedData): LensClass
    {
        DB::beginTransaction();

        try {
            $lensClass->update($validatedData);
            
            DB::commit();
            
            return $lensClass->fresh();

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating lens class: ' . $e->getMessage(), [
                'lens_class_id' => $lensClass->id,
                'validated_data' => $validatedData
            ]);
            throw $e;
        }
    }

    public function deleteLensClass(LensClass $lensClass): bool
    {
        DB::beginTransaction();

        try {
            if ($lensClass->lenses()->exists()) {
                throw new \Exception('No se puede eliminar la clase de lente porque está en uso.');
            }

            $lensClass->delete();
            
            DB::commit();
            
            return true;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting lens class: ' . $e->getMessage(), [
                'lens_class_id' => $lensClass->id
            ]);
            throw $e;
        }
    }
} 