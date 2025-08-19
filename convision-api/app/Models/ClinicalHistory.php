<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\ApiFilterable;

class ClinicalHistory extends Model
{
    use HasFactory, ApiFilterable;

    protected $fillable = [
        'patient_id',
        'created_by',
        'updated_by',
        'reason_for_consultation',
        'current_illness',
        'personal_history',
        'family_history',
        'occupational_history',
        'uses_optical_correction',
        'optical_correction_type',
        'last_control_detail',
        'ophthalmological_diagnosis',
        'eye_surgery',
        'has_systemic_disease',
        'systemic_disease_detail',
        'medications',
        'allergies',
        'right_far_vision_no_correction',
        'left_far_vision_no_correction',
        'right_near_vision_no_correction',
        'left_near_vision_no_correction',
        'right_far_vision_with_correction',
        'left_far_vision_with_correction',
        'right_near_vision_with_correction',
        'left_near_vision_with_correction',
        'right_eye_external_exam',
        'left_eye_external_exam',
        'right_eye_ophthalmoscopy',
        'left_eye_ophthalmoscopy',
        'right_eye_horizontal_k',
        'right_eye_vertical_k',
        'left_eye_horizontal_k',
        'left_eye_vertical_k',
        'refraction_technique',
        'right_eye_static_sphere',
        'right_eye_static_cylinder',
        'right_eye_static_axis',
        'right_eye_static_visual_acuity',
        'left_eye_static_sphere',
        'left_eye_static_cylinder',
        'left_eye_static_axis',
        'left_eye_static_visual_acuity',
        'right_eye_subjective_sphere',
        'right_eye_subjective_cylinder',
        'right_eye_subjective_axis',
        'right_eye_subjective_visual_acuity',
        'left_eye_subjective_sphere',
        'left_eye_subjective_cylinder',
        'left_eye_subjective_axis',
        'left_eye_subjective_visual_acuity',
        'diagnostic',
        'treatment_plan',
        'observations',
    ];

    protected $casts = [
        'uses_optical_correction' => 'boolean',
        'has_systemic_disease' => 'boolean',
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function evolutions()
    {
        return $this->hasMany(ClinicalEvolution::class);
    }

    public function getLatestEvolutionAttribute()
    {
        return $this->evolutions()->latest()->first();
    }
} 