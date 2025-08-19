<?php

namespace App\Http\Resources\V1\Lens;

use Illuminate\Http\Resources\Json\ResourceCollection;

class LensClassCollection extends ResourceCollection
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