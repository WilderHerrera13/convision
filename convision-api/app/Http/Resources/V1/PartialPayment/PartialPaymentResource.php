<?php

namespace App\Http\Resources\V1\PartialPayment;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PartialPaymentResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'sale_id' => $this->sale_id,
            'payment_method_id' => $this->payment_method_id,
            'amount' => $this->amount,
            'reference_number' => $this->reference_number,
            'payment_date' => $this->payment_date,
            'notes' => $this->notes,
            'created_by' => $this->created_by,
            'payment_method' => $this->whenLoaded('paymentMethod'),
            'created_by_user' => $this->whenLoaded('createdBy'),
            'sale' => $this->whenLoaded('sale'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
} 