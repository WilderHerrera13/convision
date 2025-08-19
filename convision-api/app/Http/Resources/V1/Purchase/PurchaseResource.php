<?php

namespace App\Http\Resources\V1\Purchase;

use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseResource extends JsonResource
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
            'purchase_date' => $this->purchase_date ? $this->purchase_date->format('Y-m-d') : null,
            'invoice_number' => $this->invoice_number,
            'concept' => $this->concept,
            'subtotal' => $this->subtotal,
            'tax_amount' => $this->tax_amount,
            'retention_amount' => $this->retention_amount,
            'total_amount' => $this->total_amount,
            'payment_amount' => $this->payment_amount,
            'balance' => $this->balance,
            'payment_status' => $this->payment_status,
            'status' => $this->status,
            'tax_excluded' => $this->tax_excluded,
            'invoice_file' => $this->invoice_file,
            'notes' => $this->notes,
            'payment_due_date' => $this->payment_due_date ? $this->payment_due_date->format('Y-m-d') : null,
            'created_by_user_id' => $this->created_by_user_id,
            'created_by' => $this->whenLoaded('createdBy', function () {
                return [
                    'id' => $this->createdBy->id,
                    'name' => $this->createdBy->name,
                ];
            }),
            'items' => PurchaseItemResource::collection($this->whenLoaded('items')),
            'payments' => PurchasePaymentResource::collection($this->whenLoaded('payments')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
} 