<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\ApiFilterable;

class LensClass extends Model
{
    use HasFactory, ApiFilterable;

    protected $fillable = ['name', 'description'];

    public function lenses()
    {
        return $this->hasMany(Lens::class);
    }
}
