<?php

namespace App\Http\Resources\V1\CashTransfer;

use Illuminate\Http\Resources\Json\JsonResource;

class CashTransferResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'transfer_number' => $this->transfer_number,
            'origin_type' => $this->origin_type,
            'origin_description' => $this->origin_description,
            'destination_type' => $this->destination_type,
            'destination_description' => $this->destination_description,
            'amount' => $this->amount,
            'reason' => $this->reason,
            'requested_by' => $this->requested_by,
            'approved_by' => $this->approved_by,
            'status' => $this->status,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
} 