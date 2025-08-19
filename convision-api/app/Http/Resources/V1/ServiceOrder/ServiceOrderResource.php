<?php

namespace App\Http\Resources\V1\ServiceOrder;

use Illuminate\Http\Resources\Json\JsonResource;

class ServiceOrderResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'customer_name' => $this->customer_name,
            'customer_phone' => $this->customer_phone,
            'customer_email' => $this->customer_email,
            'service_type' => $this->service_type,
            'problem_description' => $this->problem_description,
            'estimated_cost' => $this->estimated_cost,
            'actual_cost' => $this->actual_cost,
            'deadline' => $this->deadline,
            'priority' => $this->priority,
            'status' => $this->status,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
} 