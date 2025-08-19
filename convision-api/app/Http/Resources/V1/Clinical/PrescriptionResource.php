<?php

namespace App\Http\Resources\V1\Clinical;

use App\Http\Resources\V1\Appointment\AppointmentResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PrescriptionResource extends JsonResource
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
            'appointment_id' => $this->appointment_id,
            'date' => $this->date,
            'document' => $this->document,
            'patient_name' => $this->patient_name,
            'right_sphere' => $this->right_sphere,
            'right_cylinder' => $this->right_cylinder,
            'right_axis' => $this->right_axis,
            'right_addition' => $this->right_addition,
            'right_height' => $this->right_height,
            'right_distance_p' => $this->right_distance_p,
            'right_visual_acuity_far' => $this->right_visual_acuity_far,
            'right_visual_acuity_near' => $this->right_visual_acuity_near,
            'left_sphere' => $this->left_sphere,
            'left_cylinder' => $this->left_cylinder,
            'left_axis' => $this->left_axis,
            'left_addition' => $this->left_addition,
            'left_height' => $this->left_height,
            'left_distance_p' => $this->left_distance_p,
            'left_visual_acuity_far' => $this->left_visual_acuity_far,
            'left_visual_acuity_near' => $this->left_visual_acuity_near,
            'correction_type' => $this->correction_type,
            'usage_type' => $this->usage_type,
            'recommendation' => $this->recommendation,
            'professional' => $this->professional,
            'observation' => $this->observation,
            'attachment' => $this->attachment,
            'annotation_paths' => $this->annotation_paths,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'appointment' => new AppointmentResource($this->whenLoaded('appointment')),
        ];
    }
} 