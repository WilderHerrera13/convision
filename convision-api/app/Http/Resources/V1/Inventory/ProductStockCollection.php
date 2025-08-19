<?php

namespace App\Http\Resources\V1\Inventory;

use Illuminate\Http\Resources\Json\ResourceCollection;
use App\Http\Resources\V1\Product\ProductResource; // To format individual product data

class ProductStockCollection extends ResourceCollection
{
    public function toArray($request)
    {
        return [
            'data' => $this->collection->map(function ($product) use ($request) {
                // The ProductResource will handle the base product data.
                // We add the total_quantity from the aggregated query.
                $productData = (new ProductResource($product))->toArray($request);
                return array_merge($productData, [
                    'total_stock_quantity' => (int) $product->total_quantity, // from DB::raw()
                ]);
            }),
            'links' => [
                'first' => $this->url(1),
                'last' => $this->url($this->lastPage()),
                'prev' => $this->previousPageUrl(),
                'next' => $this->nextPageUrl(),
            ],
            'meta' => [
                'current_page' => $this->currentPage(),
                'from' => $this->firstItem(),
                'last_page' => $this->lastPage(),
                'path' => $this->path(),
                'per_page' => $this->perPage(),
                'to' => $this->lastItem(),
                'total' => $this->total(),
            ],
        ];
    }
} 