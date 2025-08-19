<?php

namespace App\Http\Resources\V1\Clinical;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Http\Controllers\Api\V1\GuestPDFController;
use App\Http\Resources\V1\Patient\PatientResource;
use App\Http\Resources\V1\User\UserResource;
use App\Http\Resources\V1\Clinical\ClinicalEvolutionResource;

class ClinicalHistoryResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray($request)
    {
        $pdfToken = GuestPDFController::generateToken('clinical_history', $this->id);
        $pdfUrl = url("/api/v1/guest/clinical-histories/{$this->id}/pdf?token={$pdfToken}");

        return [
            'id' => $this->id,
            'patient_id' => $this->patient_id,
            'patient' => new PatientResource($this->whenLoaded('patient')),
            'creator' => new UserResource($this->whenLoaded('creator')),
            'updater' => new UserResource($this->whenLoaded('updater')),
            'evolutions' => ClinicalEvolutionResource::collection($this->whenLoaded('evolutions')),
            
            // Basic data
            'reason_for_consultation' => $this->reason_for_consultation,
            'current_illness' => $this->current_illness,
            'personal_history' => $this->personal_history,
            'family_history' => $this->family_history,
            'occupational_history' => $this->occupational_history,
            
            // Optical correction
            'uses_optical_correction' => $this->uses_optical_correction,
            'optical_correction_type' => $this->optical_correction_type,
            'last_control_detail' => $this->last_control_detail,
            'ophthalmological_diagnosis' => $this->ophthalmological_diagnosis,
            'eye_surgery' => $this->eye_surgery,
            
            // Systemic conditions
            'has_systemic_disease' => $this->has_systemic_disease,
            'systemic_disease_detail' => $this->systemic_disease_detail,
            'medications' => $this->medications,
            'allergies' => $this->allergies,
            
            // Visual acuity
            'right_far_vision_no_correction' => $this->right_far_vision_no_correction,
            'left_far_vision_no_correction' => $this->left_far_vision_no_correction,
            'right_near_vision_no_correction' => $this->right_near_vision_no_correction,
            'left_near_vision_no_correction' => $this->left_near_vision_no_correction,
            'right_far_vision_with_correction' => $this->right_far_vision_with_correction,
            'left_far_vision_with_correction' => $this->left_far_vision_with_correction,
            'right_near_vision_with_correction' => $this->right_near_vision_with_correction,
            'left_near_vision_with_correction' => $this->left_near_vision_with_correction,
            
            // External exam
            'right_eye_external_exam' => $this->right_eye_external_exam,
            'left_eye_external_exam' => $this->left_eye_external_exam,
            
            // Ophthalmoscopy
            'right_eye_ophthalmoscopy' => $this->right_eye_ophthalmoscopy,
            'left_eye_ophthalmoscopy' => $this->left_eye_ophthalmoscopy,
            
            // Keratometry
            'right_eye_horizontal_k' => $this->right_eye_horizontal_k,
            'right_eye_vertical_k' => $this->right_eye_vertical_k,
            'left_eye_horizontal_k' => $this->left_eye_horizontal_k,
            'left_eye_vertical_k' => $this->left_eye_vertical_k,
            
            // Refraction
            'refraction_technique' => $this->refraction_technique,
            'right_eye_static_sphere' => $this->right_eye_static_sphere,
            'right_eye_static_cylinder' => $this->right_eye_static_cylinder,
            'right_eye_static_axis' => $this->right_eye_static_axis,
            'right_eye_static_visual_acuity' => $this->right_eye_static_visual_acuity,
            'left_eye_static_sphere' => $this->left_eye_static_sphere,
            'left_eye_static_cylinder' => $this->left_eye_static_cylinder,
            'left_eye_static_axis' => $this->left_eye_static_axis,
            'left_eye_static_visual_acuity' => $this->left_eye_static_visual_acuity,
            'right_eye_subjective_sphere' => $this->right_eye_subjective_sphere,
            'right_eye_subjective_cylinder' => $this->right_eye_subjective_cylinder,
            'right_eye_subjective_axis' => $this->right_eye_subjective_axis,
            'right_eye_subjective_visual_acuity' => $this->right_eye_subjective_visual_acuity,
            'left_eye_subjective_sphere' => $this->left_eye_subjective_sphere,
            'left_eye_subjective_cylinder' => $this->left_eye_subjective_cylinder,
            'left_eye_subjective_axis' => $this->left_eye_subjective_axis,
            'left_eye_subjective_visual_acuity' => $this->left_eye_subjective_visual_acuity,
            
            // Diagnosis and treatment
            'diagnostic' => $this->diagnostic,
            'treatment_plan' => $this->treatment_plan,
            'observations' => $this->observations,
            
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'pdf_token' => $pdfToken,
            'guest_pdf_url' => $pdfUrl,
        ];
    }
} 