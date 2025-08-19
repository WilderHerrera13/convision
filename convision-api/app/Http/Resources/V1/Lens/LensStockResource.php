<?php

namespace App\Http\Resources\V1\Lens;

use Illuminate\Http\Resources\Json\JsonResource;

class LensStockResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array|\Illuminate\Contracts\Support\Arrayable|\JsonSerializable
     */
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'quantity' => $this->quantity,
            'min_quantity' => $this->min_quantity,
            'max_quantity' => $this->max_quantity,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'lens' => new LensResource($this->whenLoaded('lens')),
            'warehouse' => new \App\Http\Resources\V1\Inventory\WarehouseResource($this->whenLoaded('warehouse')),
            'location' => new \App\Http\Resources\V1\Inventory\WarehouseLocationResource($this->whenLoaded('location')),
        ];
    }
} 