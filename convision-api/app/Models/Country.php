<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Country extends Model
{
    use HasFactory;
    
    protected $fillable = [
        'name',
        'code',
        'code2',
        'is_active'
    ];
    
    protected $casts = [
        'is_active' => 'boolean',
    ];
    
    public function departments()
    {
        return $this->hasMany(Department::class);
    }
    
    public function patients()
    {
        return $this->hasMany(Patient::class);
    }
}
