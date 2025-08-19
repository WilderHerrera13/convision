<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\ApiFilterable;
use Illuminate\Database\Eloquent\Builder;

class Appointment extends Model
{
    use HasFactory, ApiFilterable;

    const STATUS_SCHEDULED = 'scheduled';
    const STATUS_IN_PROGRESS = 'in_progress';
    const STATUS_PAUSED = 'paused';
    const STATUS_COMPLETED = 'completed';
    const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'patient_id',
        'specialist_id',
        'receptionist_id',
        'scheduled_at',
        'status',
        'notes',
        'taken_by_id',
        'is_billed',
        'billed_at',
        'sale_id',
        'appointment_date',
        'appointment_time',
        'duration',
        'reason',
        'payment_status',
        'total_amount',
        'payment_method',
        'left_eye_annotation_paths',
        'left_eye_annotation_image',
        'right_eye_annotation_paths',
        'right_eye_annotation_image',
        'lens_annotation_image',
        'lens_annotation_paths',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'is_billed' => 'boolean',
        'billed_at' => 'datetime',
    ];

    /**
     * Scope a query to only include scheduled appointments.
     */
    public function scopeScheduled(Builder $query): Builder
    {
        return $query->where('status', 'scheduled');
    }

    /**
     * Scope a query to only include in progress appointments.
     */
    public function scopeInProgress(Builder $query): Builder
    {
        return $query->where('status', 'in_progress');
    }

    /**
     * Scope a query to only include paused appointments.
     */
    public function scopePaused(Builder $query): Builder
    {
        return $query->where('status', 'paused');
    }

    /**
     * Scope a query to only include completed appointments.
     */
    public function scopeCompleted(Builder $query): Builder
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope a query to only include appointments with the given status.
     */
    public function scopeWithStatus(Builder $query, string $status): Builder
    {
        return $query->where('status', $status);
    }

    /**
     * Scope a query to filter specialist appointments by status and user
     */
    public function scopeForSpecialist(Builder $query, $userId, $status = null): Builder
    {
        $query->where('specialist_id', $userId);
        
        if ($status) {
            $query->where('status', $status);
            
            // Add additional conditions for in_progress and paused
            if (in_array($status, ['in_progress', 'paused'])) {
                $query->where('taken_by_id', $userId);
            }
        }
        
        return $query;
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function specialist()
    {
        return $this->belongsTo(User::class, 'specialist_id');
    }

    public function receptionist()
    {
        return $this->belongsTo(User::class, 'receptionist_id');
    }

    public function takenBy()
    {
        return $this->belongsTo(User::class, 'taken_by_id');
    }

    public function prescription()
    {
        return $this->hasOne(Prescription::class);
    }

    /**
     * Get the sale associated with this appointment.
     */
    public function sale()
    {
        return $this->hasOne(Sale::class);
    }

    public function clinicalEvolution()
    {
        return $this->hasOne(ClinicalEvolution::class);
    }

    public function notes()
    {
        return $this->morphMany(Note::class, 'notable');
    }
} 