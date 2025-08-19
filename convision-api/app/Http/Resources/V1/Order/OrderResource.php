<?php

namespace App\Http\Resources\V1\Order;

use App\Http\Resources\V1\Appointment\AppointmentResource;
use App\Http\Resources\V1\Laboratory\LaboratoryResource;
use App\Http\Resources\V1\Patient\PatientResource;
use App\Http\Resources\V1\User\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Http\Controllers\Api\V1\GuestPDFController; // For PDF token generation

class OrderResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray($request)
    {
        $pdfToken = GuestPDFController::generateToken('order', $this->id);
        $labPdfToken = $this->laboratory_id ? GuestPDFController::generateToken('laboratory_order', $this->id) : null;

        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'patient_id' => $this->patient_id,
            'appointment_id' => $this->appointment_id,
            'laboratory_id' => $this->laboratory_id,
            'subtotal' => $this->subtotal,
            'tax' => $this->tax,
            'total' => $this->total,
            'status' => $this->status,
            'payment_status' => $this->payment_status,
            'notes' => $this->notes,
            'created_by' => $this->created_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'patient' => new PatientResource($this->whenLoaded('patient')),
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'createdBy' => new UserResource($this->whenLoaded('createdBy')),
            'appointment' => new AppointmentResource($this->whenLoaded('appointment')),
            'laboratory' => new LaboratoryResource($this->whenLoaded('laboratory')),
            'pdf_token' => $pdfToken,
            'lab_pdf_token' => $labPdfToken,
            'guest_pdf_url' => url("/api/v1/guest/orders/{$this->id}/pdf?token={$pdfToken}"),
            'guest_lab_pdf_url' => $labPdfToken ? url("/api/v1/guest/orders/{$this->id}/laboratory-pdf?token={$labPdfToken}") : null,
        ];
    }
} 