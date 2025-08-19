<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class City extends Model
{
    use HasFactory;
    
    protected $fillable = [
        'department_id',
        'name',
        'code',
        'is_active'
    ];
    
    protected $casts = [
        'is_active' => 'boolean',
    ];
    
    public function department()
    {
        return $this->belongsTo(Department::class);
    }
    
    public function districts()
    {
        return $this->hasMany(District::class);
    }
    
    public function patients()
    {
        return $this->hasMany(Patient::class);
    }
}
