<?php

namespace App\Http\Resources\V1\CashRegisterClose;

use Illuminate\Http\Resources\Json\JsonResource;

class CashRegisterCloseResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'close_date' => $this->close_date?->format('Y-m-d'),
            'status' => $this->status,
            'total_registered' => $this->total_registered,
            'total_counted' => $this->total_counted,
            'total_difference' => $this->total_difference,
            'admin_notes' => $this->admin_notes,
            'approved_at' => $this->approved_at?->toIso8601String(),
            'user' => $this->when($this->relationLoaded('user'), fn() => [
                'id' => $this->user->id,
                'name' => $this->user->name,
            ]),
            'approved_by' => $this->whenLoaded('approvedBy', fn() => [
                'id' => $this->approvedBy->id,
                'name' => $this->approvedBy->name,
            ]),
            'payments' => CashRegisterClosePaymentResource::collection($this->whenLoaded('payments')),
            'denominations' => CashCountDenominationResource::collection($this->whenLoaded('denominations')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
