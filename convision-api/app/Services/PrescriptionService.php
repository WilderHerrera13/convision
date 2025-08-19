<?php

namespace App\Services;

use App\Models\Prescription;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Builder;

class PrescriptionService
{
    public function getFilteredPrescriptions(Request $request, User $user): Builder
    {
        $query = Prescription::query();
        
        if ($user->role !== 'admin') {
            $query->whereHas('appointment', function ($q) use ($user) {
                $q->where('specialist_id', $user->id);
            });
        }
        
        return $query->apiFilter($request);
    }

    public function createPrescription(array $data, User $user): Prescription
    {
        return Prescription::create($data);
    }

    public function getPrescriptionForUser(int $id, User $user): Prescription
    {
        $query = Prescription::query();
        
        if ($user->role !== 'admin') {
            $query->whereHas('appointment', function ($q) use ($user) {
                $q->where('specialist_id', $user->id);
            });
        }
        
        return $query->findOrFail($id);
    }

    public function updatePrescription(int $id, array $data, User $user): Prescription
    {
        $prescription = $this->getPrescriptionForUser($id, $user);
        $prescription->update($data);
        return $prescription->fresh();
    }

    public function deletePrescription(int $id, User $user): bool
    {
        $prescription = $this->getPrescriptionForUser($id, $user);
        return $prescription->delete();
    }
} 