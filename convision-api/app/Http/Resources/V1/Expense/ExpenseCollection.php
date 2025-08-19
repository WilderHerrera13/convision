<?php

namespace App\Http\Resources\V1\Expense;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\ResourceCollection;

class ExpenseCollection extends ResourceCollection
{
    public function toArray($request): array
    {
        return parent::toArray($request);
    }
} 