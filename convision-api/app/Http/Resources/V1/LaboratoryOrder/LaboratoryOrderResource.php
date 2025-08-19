<?php

namespace App\Http\Resources\V1\LaboratoryOrder;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LaboratoryOrderResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'order_id' => $this->order_id,
            'sale_id' => $this->sale_id,
            'laboratory_id' => $this->laboratory_id,
            'patient_id' => $this->patient_id,
            'status' => $this->status,
            'priority' => $this->priority,
            'estimated_completion_date' => $this->estimated_completion_date,
            'notes' => $this->notes,
            'created_by' => $this->created_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            
            'laboratory' => $this->whenLoaded('laboratory'),
            'patient' => $this->whenLoaded('patient'),
            'created_by_user' => $this->whenLoaded('createdBy'),
            'order' => $this->whenLoaded('order'),
            'sale' => $this->whenLoaded('sale'),
            'status_history' => $this->whenLoaded('statusHistory'),
        ];
    }
} 