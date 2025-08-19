<?php

namespace App\Services;

use App\Models\ClinicalEvolution;
use App\Models\Appointment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Builder;

class ClinicalEvolutionService
{
    public function getFilteredEvolutions(Request $request, int $historyId, User $user): Builder
    {
        $query = ClinicalEvolution::where('clinical_history_id', $historyId)
            ->with(['creator', 'appointment']);
        
        if ($user->role !== 'admin') {
            $query->where('created_by', $user->id);
        }
        
        return $query->apiFilter($request);
    }

    public function createEvolution(array $data, User $user): ClinicalEvolution
    {
        $data['created_by'] = $user->id;
        $data['updated_by'] = $user->id;
        
        return ClinicalEvolution::create($data);
    }

    public function getEvolutionForUser(int $id, User $user): ClinicalEvolution
    {
        $query = ClinicalEvolution::query();
        
        if ($user->role !== 'admin') {
            $query->where('created_by', $user->id);
        }
        
        return $query->findOrFail($id);
    }

    public function updateEvolution(ClinicalEvolution $evolution, array $data, User $user): ClinicalEvolution
    {
        if ($user->role !== 'admin' && $evolution->created_by !== $user->id) {
            abort(403, 'Unauthorized to update this clinical evolution');
        }
        
        $data['updated_by'] = $user->id;
        
        $evolution->update($data);
        return $evolution->fresh();
    }

    public function deleteEvolution(int $id, User $user): bool
    {
        $evolution = $this->getEvolutionForUser($id, $user);
        return $evolution->delete();
    }

    public function createEvolutionFromAppointment(Appointment $appointment, array $data, User $user): ClinicalEvolution
    {
        $data['appointment_id'] = $appointment->id;
        
        if (!isset($data['evolution_date'])) {
            $data['evolution_date'] = now()->format('Y-m-d');
        }
        
        $clinicalHistory = $appointment->patient->clinicalHistories()->first();
        if (!$clinicalHistory) {
            throw new \Exception('El paciente debe tener una historia clínica antes de crear una evolución. Por favor, cree primero la historia clínica del paciente.');
        }
        
        $data['clinical_history_id'] = $clinicalHistory->id;
        $data['created_by'] = $user->id;
        $data['updated_by'] = $user->id;
        
        return ClinicalEvolution::create($data);
    }
} 