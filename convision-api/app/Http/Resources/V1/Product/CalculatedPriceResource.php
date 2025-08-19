<?php

namespace App\Http\Resources\V1\Product;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CalculatedPriceResource extends JsonResource
{
    public function toArray($request): array
    {
        // Assuming $this->resource is the array from the service
        // which includes 'original_price', 'discount_applied', 'final_price', 'discount_percentage', 'quantity', 'unit_price'
        return $this->resource;
    }
} 