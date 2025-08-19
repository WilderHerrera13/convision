<?php

namespace App\Services;

use App\Models\ClinicalHistory;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Builder;

class ClinicalHistoryService
{
    public function getFilteredHistories(Request $request, User $user): Builder
    {
        $query = ClinicalHistory::query();
        
        if ($user->role !== 'admin') {
            $patientIds = $user->appointments()
                ->distinct()
                ->pluck('patient_id');
            
            $query->whereIn('patient_id', $patientIds);
        }
        
        return $query->apiFilter($request);
    }

    public function createHistory(array $data, User $user): ClinicalHistory
    {
        $data['created_by'] = $user->id;
        $data['updated_by'] = $user->id;
        
        return ClinicalHistory::create($data);
    }

    public function getHistoryForUser(int $id, User $user): ClinicalHistory
    {
        $query = ClinicalHistory::query();
        
        if ($user->role !== 'admin') {
            $history = ClinicalHistory::find($id);
            if (!$history) {
                abort(404, 'Clinical history not found');
            }
            
            $canAccessPatient = $user->appointments()
                ->where('patient_id', $history->patient_id)
                ->exists();
            
            if (!$canAccessPatient) {
                abort(403, 'Unauthorized to access this clinical history');
            }
            
            return $history;
        }
        
        return $query->findOrFail($id);
    }

    public function updateHistory(ClinicalHistory $history, array $data, User $user): ClinicalHistory
    {
        if ($user->role !== 'admin') {
            $canAccessPatient = $user->appointments()
                ->where('patient_id', $history->patient_id)
                ->exists();
            
            if (!$canAccessPatient) {
                abort(403, 'Unauthorized to update this clinical history');
            }
        }
        
        $data['updated_by'] = $user->id;
        
        $history->update($data);
        return $history->fresh();
    }

    public function getPatientHistory(int $patientId, User $user): ?ClinicalHistory
    {
        $query = ClinicalHistory::where('patient_id', $patientId);
        
        if ($user->role !== 'admin') {
            $canAccessPatient = $user->appointments()
                ->where('patient_id', $patientId)
                ->exists();
            
            if (!$canAccessPatient) {
                return null;
            }
        }
        
        return $query->first();
    }
} 