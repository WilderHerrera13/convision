<?php

namespace App\Http\Resources\V1\Quote;

use App\Http\Resources\V1\Patient\PatientResource;
use App\Http\Resources\V1\User\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Http\Controllers\Api\V1\GuestPDFController; // For PDF token generation

class QuoteResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray($request)
    {
        $pdfToken = GuestPDFController::generateToken('quote', $this->id);

        return [
            'id' => $this->id,
            'quote_number' => $this->quote_number,
            'patient_id' => $this->patient_id,
            'subtotal' => $this->subtotal,
            'tax_amount' => $this->tax_amount,
            'tax_percentage' => $this->tax_percentage,
            'discount_amount' => $this->discount_amount,
            'total' => $this->total,
            'status' => $this->status,
            'expiration_date' => $this->expiration_date,
            'notes' => $this->notes,
            'created_by' => $this->created_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'patient' => new PatientResource($this->whenLoaded('patient')),
            'items' => QuoteItemResource::collection($this->whenLoaded('items')),
            'createdBy' => new UserResource($this->whenLoaded('createdBy')),
            'pdf_token' => $pdfToken,
            'guest_pdf_url' => url("/api/v1/guest/quotes/{$this->id}/pdf?token={$pdfToken}"),
        ];
    }
} 