<?php

namespace App\Services;

use App\Models\Treatment;

class TreatmentService
{
    public function createTreatment(array $data): Treatment
    {
        return Treatment::create($data);
    }

    public function updateTreatment(Treatment $treatment, array $data): Treatment
    {
        $treatment->update($data);
        return $treatment->fresh();
    }

    public function deleteTreatment(Treatment $treatment): bool
    {
        return $treatment->delete();
    }
} 