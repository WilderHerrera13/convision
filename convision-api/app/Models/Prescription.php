<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\ApiFilterable;

class Prescription extends Model
{
    use HasFactory, ApiFilterable;

    protected $fillable = [
        'appointment_id',
        'date',
        'document',
        'patient_name',
        'right_sphere',
        'right_cylinder',
        'right_axis',
        'right_addition',
        'right_height',
        'right_distance_p',
        'right_visual_acuity_far',
        'right_visual_acuity_near',
        'left_sphere',
        'left_cylinder',
        'left_axis',
        'left_addition',
        'left_height',
        'left_distance_p',
        'left_visual_acuity_far',
        'left_visual_acuity_near',
        'correction_type',
        'usage_type',
        'recommendation',
        'professional',
        'observation',
        'attachment',
        'annotation_paths',
    ];

    public function appointment()
    {
        return $this->belongsTo(Appointment::class);
    }
} 