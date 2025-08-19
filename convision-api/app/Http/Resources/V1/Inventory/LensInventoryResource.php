<?php

namespace App\Http\Resources\V1\Inventory;

use App\Http\Resources\V1\Lens\LensStockResource;
use Illuminate\Http\Resources\Json\JsonResource;

class LensInventoryResource extends JsonResource
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
            'lens' => new LensStockResource($this->whenLoaded('lens')),
            'inventory' => InventoryItemResource::collection($this->whenLoaded('inventoryItems')),
            'total_quantity' => $this->whenLoaded('inventoryItems', function () {
                return $this->inventoryItems->sum('quantity');
            }),
        ];
    }
} 