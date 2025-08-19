<?php

namespace App\Http\Resources\V1\DiscountRequest;

use Illuminate\Http\Resources\Json\ResourceCollection;
use Illuminate\Http\Request;

class DiscountRequestCollection extends ResourceCollection
{
    public function toArray($request)
    {
        return parent::toArray($request);
    }
} 