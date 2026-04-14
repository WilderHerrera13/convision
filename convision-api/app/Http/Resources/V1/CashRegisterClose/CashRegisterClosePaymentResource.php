<?php

namespace App\Http\Resources\V1\CashRegisterClose;

use Illuminate\Http\Resources\Json\JsonResource;

class CashRegisterClosePaymentResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'payment_method_name' => $this->payment_method_name,
            'registered_amount' => $this->registered_amount,
            'counted_amount' => $this->counted_amount,
            'difference' => $this->difference,
        ];
    }
}
