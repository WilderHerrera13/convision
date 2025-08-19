<?php

namespace App\Http\Resources\V1\Order;

use App\Http\Resources\V1\Product\ProductResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderItemResource extends JsonResource
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
            'order_id' => $this->order_id,
            'product_id' => $this->product_id,
            'product_type' => $this->product_type,
            'name' => $this->name,
            'description' => $this->description,
            'quantity' => (int) $this->quantity,
            'price' => (float) $this->price,
            'original_price' => (float) $this->original_price,
            'discount_percentage' => (float) $this->discount_percentage,
            'discount_id' => $this->discount_id,
            'total' => (float) $this->total,
            'notes' => $this->notes,
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
            'product' => new ProductResource($this->whenLoaded('product')),
        ];
    }
} 