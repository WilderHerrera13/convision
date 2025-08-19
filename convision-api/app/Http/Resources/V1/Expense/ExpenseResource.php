<?php

namespace App\Http\Resources\V1\Expense;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExpenseResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'supplier_id' => $this->supplier_id,
            'supplier' => $this->whenLoaded('supplier', function () {
                return [
                    'id' => $this->supplier->id,
                    'name' => $this->supplier->name,
                    'nit' => $this->supplier->nit,
                ];
            }),
            'invoice_number' => $this->invoice_number,
            'concept' => $this->concept,
            'description' => $this->description,
            'expense_date' => $this->expense_date ? $this->expense_date->format('Y-m-d') : null,
            'amount' => $this->amount,
            'payment_amount' => $this->payment_amount,
            'balance' => $this->balance,
            'status' => $this->status,
            'tax_excluded' => $this->tax_excluded,
            'payment_method_id' => $this->payment_method_id,
            'payment_method' => $this->whenLoaded('paymentMethod', function () {
                return [
                    'id' => $this->paymentMethod->id,
                    'name' => $this->paymentMethod->name,
                ];
            }),
            'reference' => $this->reference,
            'notes' => $this->notes,
            'created_by_user_id' => $this->created_by_user_id,
            'created_by' => $this->whenLoaded('createdBy', function () {
                return [
                    'id' => $this->createdBy->id,
                    'name' => $this->createdBy->name,
                ];
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
} 