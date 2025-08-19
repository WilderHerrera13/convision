<?php

namespace App\Http\Resources\V1\LaboratoryOrder;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LaboratoryOrderStatsResource extends JsonResource
{
    public function toArray($request): array
    {
        // Assuming $this->resource contains the stats data directly
        return $this->resource;
    }
} 