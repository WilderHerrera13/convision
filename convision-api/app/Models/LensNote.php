<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LensNote extends Model
{
    use HasFactory;

    protected $fillable = [
        'lens_id',
        'user_id',
        'content'
    ];

    public function lens()
    {
        return $this->belongsTo(Lens::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
