<?php

namespace App\Http\Resources\V1\SaleLensPriceAdjustment;

use Illuminate\Http\Resources\Json\JsonResource;
use App\Http\Resources\V1\Product\ProductResource;
use App\Http\Resources\V1\User\UserResource;

class SaleLensPriceAdjustmentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array|\Illuminate\Contracts\Support\Arrayable|\JsonSerializable
     */
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'sale_id' => $this->sale_id,
            'lens_id' => $this->lens_id,
            'base_price' => $this->base_price,
            'adjusted_price' => $this->adjusted_price,
            'adjustment_amount' => $this->adjustment_amount,
            'reason' => $this->reason,
            'adjusted_by' => $this->adjusted_by,
            'lens' => new ProductResource($this->whenLoaded('lens')),
            'adjustedBy' => new UserResource($this->whenLoaded('adjustedBy')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
