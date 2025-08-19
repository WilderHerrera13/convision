<?php

namespace App\Http\Resources\V1\Product;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductInventoryResource extends JsonResource
{
    public function toArray($request): array
    {
        // Assuming $this->resource directly contains the inventory data
        return [
            'inventory' => $this->resource,
        ];
    }
} 