<?php

namespace App\Http\Resources\V1\CashRegisterClose;

use Illuminate\Http\Resources\Json\JsonResource;

class CashRegisterClosePaymentResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'name' => $this->payment_method_name,
            'counted_amount' => $this->counted_amount,
        ];
    }
}
