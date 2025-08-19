<?php

namespace App\Http\Resources\V1\Discount;

use App\Http\Resources\V1\Lens\LensResource;
use App\Http\Resources\V1\PatientResource;
use Illuminate\Http\Resources\Json\JsonResource;

class DiscountResource extends JsonResource
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
            'name' => $this->name,
            'discount_percentage' => $this->discount_percentage,
            'start_date' => $this->start_date,
            'end_date' => $this->end_date,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'lens' => new LensResource($this->whenLoaded('lens')),
            'patient' => new PatientResource($this->whenLoaded('patient')),
        ];
    }
} 