<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HealthInsuranceProvider extends Model
{
    use HasFactory;
    
    protected $fillable = [
        'name',
        'code',
        'is_active'
    ];
    
    protected $casts = [
        'is_active' => 'boolean',
    ];
    
    public function patients()
    {
        return $this->hasMany(Patient::class, 'health_insurance_id');
    }
}
