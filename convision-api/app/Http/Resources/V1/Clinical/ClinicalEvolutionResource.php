<?php

namespace App\Http\Resources\V1\Clinical;

use App\Http\Resources\V1\Appointment\AppointmentResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Http\Resources\V1\User\UserResource;

class ClinicalEvolutionResource extends JsonResource
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
            'clinical_history_id' => $this->clinical_history_id,
            'appointment_id' => $this->appointment_id,
            'evolution_date' => $this->evolution_date,
            'subjective' => $this->subjective,
            'objective' => $this->objective,
            'assessment' => $this->assessment,
            'plan' => $this->plan,
            'recommendations' => $this->recommendations,
            'right_far_vision' => $this->right_far_vision,
            'left_far_vision' => $this->left_far_vision,
            'right_near_vision' => $this->right_near_vision,
            'left_near_vision' => $this->left_near_vision,
            'right_eye_sphere' => $this->right_eye_sphere,
            'right_eye_cylinder' => $this->right_eye_cylinder,
            'right_eye_axis' => $this->right_eye_axis,
            'right_eye_visual_acuity' => $this->right_eye_visual_acuity,
            'left_eye_sphere' => $this->left_eye_sphere,
            'left_eye_cylinder' => $this->left_eye_cylinder,
            'left_eye_axis' => $this->left_eye_axis,
            'left_eye_visual_acuity' => $this->left_eye_visual_acuity,
            'created_by' => $this->created_by,
            'updated_by' => $this->updated_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'creator' => new UserResource($this->whenLoaded('creator')),
            'updater' => new UserResource($this->whenLoaded('updater')),
            'appointment' => new AppointmentResource($this->whenLoaded('appointment')),
            'clinical_history' => new ClinicalHistoryResource($this->whenLoaded('clinicalHistory')),
        ];
    }
} 