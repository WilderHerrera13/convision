<?php

namespace App\Http\Resources\V1\CashRegisterClose;

use Illuminate\Http\Resources\Json\JsonResource;

class CashCountDenominationResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'denomination' => $this->denomination,
            'quantity' => $this->quantity,
            'subtotal' => $this->subtotal,
        ];
    }
}
