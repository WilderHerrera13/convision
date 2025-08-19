<?php

namespace App\Http\Resources\V1\Product;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\ResourceCollection;

class ProductActiveDiscountCollection extends ResourceCollection
{
    public function toArray($request): array
    {
        return parent::toArray($request);
    }
} 