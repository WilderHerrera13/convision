<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class District extends Model
{
    use HasFactory;
    
    protected $fillable = [
        'city_id',
        'name',
        'code',
        'is_active'
    ];
    
    protected $casts = [
        'is_active' => 'boolean',
    ];
    
    public function city()
    {
        return $this->belongsTo(City::class);
    }
    
    public function patients()
    {
        return $this->hasMany(Patient::class);
    }
}
