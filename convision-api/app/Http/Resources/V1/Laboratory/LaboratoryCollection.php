<?php

namespace App\Http\Resources\V1\Laboratory;

use Illuminate\Http\Resources\Json\ResourceCollection;

class LaboratoryCollection extends ResourceCollection
{
    /**
     * Transform the resource collection into an array.
     *
     * @return array<int|string, mixed>
     */
    public function toArray($request)
    {
        return parent::toArray($request);
    }
} 