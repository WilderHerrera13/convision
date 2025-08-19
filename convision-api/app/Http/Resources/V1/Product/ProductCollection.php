<?php

namespace App\Http\Resources\V1\Product;

use Illuminate\Http\Resources\Json\ResourceCollection;

class ProductCollection extends ResourceCollection
{
    public function toArray($request): array
    {
        return parent::toArray($request);
    }
} 