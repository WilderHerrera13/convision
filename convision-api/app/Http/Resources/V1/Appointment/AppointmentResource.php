<?php

namespace App\Http\Resources\V1\Appointment;

use App\Http\Resources\V1\Patient\PatientResource;
use App\Http\Resources\V1\User\UserResource;
use App\Http\Resources\V1\Clinical\PrescriptionResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class AppointmentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'patient_id' => $this->patient_id,
            'specialist_id' => $this->specialist_id,
            'receptionist_id' => $this->receptionist_id,
            'scheduled_at' => $this->scheduled_at,
            'notes' => $this->notes,
            'status' => $this->status,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'patient' => new PatientResource($this->whenLoaded('patient')),
            'specialist' => new UserResource($this->whenLoaded('specialist')),
            'receptionist' => new UserResource($this->whenLoaded('receptionist')),
            'prescription' => new PrescriptionResource($this->whenLoaded('prescription')),
            'taken_by' => new UserResource($this->whenLoaded('takenBy')),
            'is_billed' => $this->is_billed,
            'billing' => $this->whenLoaded('billing'),
            'sale_id' => $this->sale_id,
            'left_eye_annotation_paths' => $this->left_eye_annotation_paths,
            'left_eye_annotation_image_url' => $this->left_eye_annotation_image ? Storage::url($this->left_eye_annotation_image) : null,
            'right_eye_annotation_paths' => $this->right_eye_annotation_paths,
            'right_eye_annotation_image_url' => $this->right_eye_annotation_image ? Storage::url($this->right_eye_annotation_image) : null,
            'lens_annotation_image' => $this->lens_annotation_image,
            'lens_annotation_paths' => $this->lens_annotation_paths,
        ];
    }
} 