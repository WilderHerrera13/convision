<?php

namespace App\Http\Resources\V1; // Placing it directly under V1

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Http\Resources\V1\Product\ProductResource; // Use the main ProductResource
use App\Http\Resources\V1\WarehouseResource; // Assuming this exists
use App\Http\Resources\V1\WarehouseLocationResource; // Assuming this exists

class InventoryItemResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'quantity' => (int) $this->quantity,
            'status' => $this->status,
            'notes' => $this->notes,
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
            'product' => new ProductResource($this->whenLoaded('product')),
            'warehouse' => new WarehouseResource($this->whenLoaded('warehouse')),
            'warehouse_location' => new WarehouseLocationResource($this->whenLoaded('warehouseLocation')),
        ];
    }
} 