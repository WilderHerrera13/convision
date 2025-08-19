<?php

namespace App\Http\Resources\V1\Sale;

use App\Http\Resources\V1\Lens\LensResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SaleItemResource extends JsonResource
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
            'sale_id' => $this->sale_id,
            'lens_id' => $this->lens_id,
            'description' => $this->whenLoaded('lens', function() {
                return $this->lens->description ?? 'Producto sin descripción';
            }, 'Producto sin descripción'),
            'quantity' => $this->quantity,
            'unit_price' => $this->price,
            'price' => $this->price,
            'discount' => $this->discount,
            'total' => $this->total,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'lens' => new LensResource($this->whenLoaded('lens')),
        ];
    }
} 