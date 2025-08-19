<?php

namespace App\Http\Resources\V1\Product;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductDiscountInfoResource extends JsonResource
{
    public function toArray($request): array
    {
        // Assuming $this->resource contains the discount information array
        return $this->resource;
    }
} 