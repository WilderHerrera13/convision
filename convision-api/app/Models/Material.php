<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\ApiFilterable;

class Material extends Model
{
    use HasFactory, ApiFilterable;

    protected $fillable = ['name'];

    public function lenses()
    {
        return $this->hasMany(Lens::class);
    }
}
