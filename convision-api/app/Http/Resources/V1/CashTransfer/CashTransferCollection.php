<?php

namespace App\Http\Resources\V1\CashTransfer;

use Illuminate\Http\Resources\Json\ResourceCollection;

class CashTransferCollection extends ResourceCollection
{
    public function toArray($request): array
    {
        return parent::toArray($request);
    }
} 