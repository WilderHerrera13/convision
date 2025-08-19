<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\ApiFilterable;

class ClinicalEvolution extends Model
{
    use HasFactory, ApiFilterable;

    protected $fillable = [
        'clinical_history_id',
        'appointment_id',
        'created_by',
        'updated_by',
        'evolution_date',
        'subjective',
        'objective',
        'assessment',
        'plan',
        'recommendations',
        'right_far_vision',
        'left_far_vision',
        'right_near_vision',
        'left_near_vision',
        'right_eye_sphere',
        'right_eye_cylinder',
        'right_eye_axis',
        'right_eye_visual_acuity',
        'left_eye_sphere',
        'left_eye_cylinder',
        'left_eye_axis',
        'left_eye_visual_acuity',
    ];

    protected $casts = [
        'evolution_date' => 'date',
    ];

    public function clinicalHistory()
    {
        return $this->belongsTo(ClinicalHistory::class);
    }

    public function appointment()
    {
        return $this->belongsTo(Appointment::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
} 