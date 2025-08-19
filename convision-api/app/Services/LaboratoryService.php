<?php

namespace App\Services;

use App\Models\Laboratory;

class LaboratoryService
{
    public function createLaboratory(array $data): Laboratory
    {
        return Laboratory::create($data);
    }

    public function updateLaboratory(Laboratory $laboratory, array $data): Laboratory
    {
        $laboratory->update($data);
        return $laboratory->fresh();
    }

    public function deleteLaboratory(Laboratory $laboratory): bool
    {
        return $laboratory->delete();
    }
} 