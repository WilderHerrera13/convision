<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Photochromic extends Model
{
    use HasFactory;

    protected $fillable = ['name'];

    public function lenses()
    {
        return $this->hasMany(Lens::class);
    }
}
