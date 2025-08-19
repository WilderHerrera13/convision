<?php

namespace App\Http\Resources\V1\Product;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductStockResource extends JsonResource
{
    public function toArray($request): array
    {
        // Assuming $this->resource directly contains the stock data
        return [
            'stock' => $this->resource,
        ];
    }
} 