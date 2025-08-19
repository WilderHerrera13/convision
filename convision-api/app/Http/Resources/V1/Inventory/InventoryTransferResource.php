<?php

namespace App\Http\Resources\V1\Inventory;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Http\Resources\V1\Lens\LensResource;
use App\Http\Resources\V1\Warehouse\WarehouseLocationResource;
use App\Http\Resources\V1\User\UserResource;

class InventoryTransferResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'lens_id' => $this->lens_id,
            'source_location_id' => $this->source_location_id,
            'destination_location_id' => $this->destination_location_id,
            'quantity' => $this->quantity,
            'transferred_by' => $this->transferred_by,
            'notes' => $this->notes,
            'status' => $this->status,
            'completed_at' => $this->completed_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'lens' => new LensResource($this->whenLoaded('lens')),
            'sourceLocation' => new WarehouseLocationResource($this->whenLoaded('sourceLocation')),
            'destinationLocation' => new WarehouseLocationResource($this->whenLoaded('destinationLocation')),
            'transferredBy' => new UserResource($this->whenLoaded('transferredBy')),
        ];
    }
} 