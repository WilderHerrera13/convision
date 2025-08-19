<?php

namespace App\Http\Resources\V1\Lens;

use Illuminate\Http\Resources\Json\ResourceCollection;

class LensStockCollection extends ResourceCollection
{
    /**
     * Transform the resource collection into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array|\Illuminate\Contracts\Support\Arrayable|\JsonSerializable
     */
    public function toArray($request)
    {
        return [
            'data' => $this->collection->transform(function ($lensStock) {
                return [
                    'id' => $lensStock->id,
                    'quantity' => $lensStock->quantity,
                    'min_quantity' => $lensStock->min_quantity,
                    'max_quantity' => $lensStock->max_quantity,
                    'created_at' => $lensStock->created_at,
                    'updated_at' => $lensStock->updated_at,
                    'lens' => new LensResource($lensStock->whenLoaded('lens')),
                    'warehouse' => new \App\Http\Resources\V1\Inventory\WarehouseResource($lensStock->whenLoaded('warehouse')),
                    'location' => new \App\Http\Resources\V1\Inventory\WarehouseLocationResource($lensStock->whenLoaded('location')),
                ];
            }),
            'meta' => [
                'current_page' => $this->currentPage(),
                'from' => $this->firstItem(),
                'last_page' => $this->lastPage(),
                'path' => $this->path(),
                'per_page' => $this->perPage(),
                'to' => $this->lastItem(),
                'total' => $this->total(),
            ],
            'links' => [
                'first' => $this->url(1),
                'last' => $this->url($this->lastPage()),
                'prev' => $this->previousPageUrl(),
                'next' => $this->nextPageUrl(),
            ],
        ];
    }
} 