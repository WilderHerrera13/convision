<?php

namespace App\Http\Resources\V1\DiscountRequest;

use App\Http\Resources\V1\Product\ProductResource;
use App\Http\Resources\V1\Patient\PatientResource;
use App\Http\Resources\V1\User\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DiscountRequestResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'status' => $this->status,
            'discount_percentage' => (float) $this->discount_percentage,
            'original_price' => (float) $this->original_price,
            'discounted_price' => (float) $this->discounted_price,
            'reason' => $this->reason,
            'rejection_reason' => $this->rejection_reason,
            'approval_notes' => $this->approval_notes,
            'is_global' => (bool) $this->is_global,
            'expiry_date' => $this->expiry_date ? $this->expiry_date->toDateString() : null,
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
            'approved_at' => $this->approved_at ? $this->approved_at->toIso8601String() : null,
            
            'product' => new ProductResource($this->whenLoaded('product')),
            'patient' => new PatientResource($this->whenLoaded('patient')),
            'user' => new UserResource($this->whenLoaded('user')),
            'approver' => new UserResource($this->whenLoaded('approver')),
        ];
    }
} 