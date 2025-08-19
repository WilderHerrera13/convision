<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Department extends Model
{
    use HasFactory;
    
    protected $fillable = [
        'country_id',
        'name',
        'code',
        'is_active'
    ];
    
    protected $casts = [
        'is_active' => 'boolean',
    ];
    
    public function country()
    {
        return $this->belongsTo(Country::class);
    }
    
    public function cities()
    {
        return $this->hasMany(City::class);
    }
    
    public function patients()
    {
        return $this->hasMany(Patient::class);
    }
}
