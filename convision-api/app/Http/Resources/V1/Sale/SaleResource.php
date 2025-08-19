<?php

namespace App\Http\Resources\V1\Sale;

use App\Http\Resources\V1\Patient\PatientResource;
use App\Http\Resources\V1\User\UserResource;
use App\Http\Resources\V1\Appointment\AppointmentResource;
use App\Http\Resources\V1\Laboratory\LaboratoryResource;
use App\Http\Resources\V1\LaboratoryOrder\LaboratoryOrderResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Http\Controllers\Api\V1\GuestPDFController; // For PDF token generation

class SaleResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray($request)
    {
        $pdfToken = GuestPDFController::generateToken('sale', $this->id);

        return [
            'id' => $this->id,
            'sale_number' => $this->sale_number,
            'patient_id' => $this->patient_id,
            'appointment_id' => $this->appointment_id,
            'laboratory_id' => $this->laboratory_id,
            'quote_id' => $this->quote_id, // If a sale can be from a quote
            'subtotal' => $this->subtotal,
            'tax' => $this->tax,
            'discount' => $this->discount, // If sales have discounts
            'total' => $this->total,
            'status' => $this->status,
            'payment_status' => $this->payment_status,
            'notes' => $this->notes,
            'created_by' => $this->created_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'patient' => $this->when($this->resource->relationLoaded('patient') && $this->resource->patient, new PatientResource($this->resource->patient)),
            'items' => SaleItemResource::collection($this->resource->relationLoaded('items') ? $this->resource->items : collect()),
            'createdBy' => $this->when($this->resource->relationLoaded('createdBy') && $this->resource->createdBy, new UserResource($this->resource->createdBy)),
            'appointment' => $this->when($this->resource->relationLoaded('appointment') && $this->resource->appointment, new AppointmentResource($this->resource->appointment)),
            'laboratory' => $this->when($this->resource->relationLoaded('laboratory') && $this->resource->laboratory, new LaboratoryResource($this->resource->laboratory)),
            'quote' => $this->when($this->resource->relationLoaded('quote') && $this->resource->quote, new \App\Http\Resources\V1\Quote\QuoteResource($this->resource->quote)),
            'laboratoryOrders' => LaboratoryOrderResource::collection($this->whenLoaded('laboratoryOrders')),
            'pdf_token' => $pdfToken,
            'guest_pdf_url' => url("/api/v1/guest/sales/{$this->id}/pdf?token={$pdfToken}"),
        ];
    }
} 