<?php

namespace App\Http\Resources\V1\Purchase;

use Illuminate\Http\Resources\Json\ResourceCollection;

class PurchaseCollection extends ResourceCollection
{
    public function toArray($request): array
    {
        return parent::toArray($request);
    }
} 