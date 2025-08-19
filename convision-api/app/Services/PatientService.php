<?php

namespace App\Services;

use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PatientService
{
    public function getFilteredPatients(Request $request)
    {
        return Patient::apiFilter($request);
    }

    public function findPatient(int $id): Patient
    {
        return Patient::findOrFail($id);
    }

    public function createPatient(array $validatedData, ?UploadedFile $profileImage = null): Patient
    {
        DB::beginTransaction();

        try {
            if ($profileImage) {
                $validatedData['profile_image'] = $this->storeProfileImage($profileImage);
            }
            
            $patient = Patient::create($validatedData);
            
            $this->clearPatientCache();
            DB::commit();
            
            return $patient;

        } catch (\Exception $e) {
            DB::rollBack();
            if (isset($validatedData['profile_image'])) {
                $this->deleteProfileImage($validatedData['profile_image']);
            }
            Log::error('Error creating patient: ' . $e->getMessage(), [
                'validated_data' => $validatedData
            ]);
            throw $e;
        }
    }

    public function updatePatient(Patient $patient, array $validatedData, ?UploadedFile $profileImage = null): Patient
    {
        DB::beginTransaction();

        try {
            $oldProfileImage = $patient->profile_image;

            if ($profileImage) {
                $validatedData['profile_image'] = $this->storeProfileImage($profileImage);
                if ($oldProfileImage) {
                    $this->deleteProfileImage($oldProfileImage);
                }
            }

            $patient->update($validatedData);
            
            $this->clearPatientCache($patient->id);
            DB::commit();
            
            return $patient->fresh();

        } catch (\Exception $e) {
            DB::rollBack();
            if (isset($validatedData['profile_image']) && $validatedData['profile_image'] !== $oldProfileImage) {
                $this->deleteProfileImage($validatedData['profile_image']);
            }
            Log::error('Error updating patient: ' . $e->getMessage(), [
                'patient_id' => $patient->id,
                'validated_data' => $validatedData
            ]);
            throw $e;
        }
    }

    public function deletePatient(Patient $patient): bool
    {
        DB::beginTransaction();

        try {
            if ($patient->profile_image) {
                $this->deleteProfileImage($patient->profile_image);
            }
            
            $patient->delete();
            
            $this->clearPatientCache($patient->id);
            DB::commit();
            
            return true;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting patient: ' . $e->getMessage(), [
                'patient_id' => $patient->id
            ]);
            throw $e;
        }
    }

    public function restorePatient(int $patientId): Patient
    {
        DB::beginTransaction();

        try {
            $patient = Patient::onlyTrashed()->findOrFail($patientId);
            $patient->restore();
            
            $this->clearPatientCache($patientId);
            DB::commit();
            
            return $patient;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error restoring patient: ' . $e->getMessage(), [
                'patient_id' => $patientId
            ]);
            throw $e;
        }
    }

    public function uploadProfileImage(Patient $patient, UploadedFile $profileImage): Patient
    {
        DB::beginTransaction();

        try {
            $oldProfileImage = $patient->profile_image;

            $patient->profile_image = $this->storeProfileImage($profileImage);
            $patient->save();

            if ($oldProfileImage) {
                $this->deleteProfileImage($oldProfileImage);
            }
            
            $this->clearPatientCache($patient->id);
            DB::commit();
            
            return $patient->fresh();

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error uploading patient profile image: ' . $e->getMessage(), [
                'patient_id' => $patient->id
            ]);
            throw $e;
        }
    }

    public function getCachedPatient(int $patientId, int $cacheTTLMinutes = 10): Patient
    {
        $cacheKey = "patient_show_{$patientId}";
        
        return Cache::remember($cacheKey, $cacheTTLMinutes * 60, function () use ($patientId) {
            return Patient::findOrFail($patientId);
        });
    }

    protected function storeProfileImage(UploadedFile $profileImage): string
    {
        return $profileImage->store('patient_profiles', 'public');
    }

    protected function deleteProfileImage(string $imagePath): void
    {
        Storage::disk('public')->delete($imagePath);
    }

    protected function clearPatientCache(?int $patientId = null): void
    {
        Cache::forget('patients_index');
        
        if ($patientId) {
            Cache::forget("patient_show_{$patientId}");
        }
    }
} 