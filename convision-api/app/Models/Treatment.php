<?php

namespace App\Models;

use App\Traits\ApiFilterable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Treatment extends Model
{
    use HasFactory, ApiFilterable;

    protected $fillable = ['name'];

    public function lenses()
    {
        return $this->hasMany(Lens::class);
    }
}
