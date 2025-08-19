<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\ApiFilterable;

class Patient extends Model
{
    use HasFactory, SoftDeletes, ApiFilterable;

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'phone',
        'identification',
        'identification_type_id',
        'birth_date',
        'gender',
        'address',
        'city_id',
        'district_id',
        'department_id',
        'country_id',
        'neighborhood',
        'postal_code',
        'notes',
        'status',
        'health_insurance_id',
        'affiliation_type_id',
        'coverage_type_id',
        'occupation',
        'education_level_id',
        'position',
        'company',
        'profile_image'
    ];

    protected $casts = [
        'birth_date' => 'date',
    ];

    public function country()
    {
        return $this->belongsTo(Country::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function city()
    {
        return $this->belongsTo(City::class);
    }

    public function district()
    {
        return $this->belongsTo(District::class);
    }

    public function identificationType()
    {
        return $this->belongsTo(IdentificationType::class);
    }

    public function healthInsurance()
    {
        return $this->belongsTo(HealthInsuranceProvider::class, 'health_insurance_id');
    }

    public function affiliationType()
    {
        return $this->belongsTo(AffiliationType::class);
    }

    public function coverageType()
    {
        return $this->belongsTo(CoverageType::class);
    }

    public function educationLevel()
    {
        return $this->belongsTo(EducationLevel::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function sales()
    {
        return $this->hasMany(Sale::class);
    }

    public function prescriptions()
    {
        return $this->hasManyThrough(
            Prescription::class,
            Appointment::class,
            'patient_id', // Foreign key on appointments table
            'appointment_id', // Foreign key on prescriptions table
            'id', // Local key on patients table
            'id' // Local key on appointments table
        );
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    public function clinicalHistories()
    {
        return $this->hasMany(ClinicalHistory::class);
    }

    public function latestClinicalHistory()
    {
        return $this->hasOne(ClinicalHistory::class)->latest();
    }

    public function getFullNameAttribute()
    {
        return "{$this->first_name} {$this->last_name}";
    }
} 