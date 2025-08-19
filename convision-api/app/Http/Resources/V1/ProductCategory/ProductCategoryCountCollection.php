<?php

namespace App\Http\Resources\V1\ProductCategory;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\ResourceCollection;

class ProductCategoryCountCollection extends ResourceCollection
{
    /**
     * Transform the resource collection into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array<int|string, mixed>
     */
    public function toArray($request): array
    {
        // Assuming $this->collection contains the array of category data with counts
        return parent::toArray($request);
        // If each item needs specific transformation, you can map it:
        // return $this->collection->map(function ($item) {
        //     return ['id' => $item->id, 'name' => $item->name, 'products_count' => $item->products_count]; // Adjust to actual structure
        // })->all();
    }
} 