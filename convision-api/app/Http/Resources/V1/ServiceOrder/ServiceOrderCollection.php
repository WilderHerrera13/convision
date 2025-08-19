<?php

namespace App\Http\Resources\V1\ServiceOrder;

use Illuminate\Http\Resources\Json\ResourceCollection;

class ServiceOrderCollection extends ResourceCollection
{
    public function toArray($request): array
    {
        return parent::toArray($request);
    }
} 