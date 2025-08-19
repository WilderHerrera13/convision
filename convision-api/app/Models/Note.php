<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Note extends Model
{
    use HasFactory;

    protected $fillable = [
        'content',
        'user_id',
        'notable_type',
        'notable_id'
    ];

    protected $visible = [
        'id',
        'content',
        'user_id',
        'notable_type',
        'notable_id',
        'created_at',
        'updated_at'
    ];

    public function notable()
    {
        return $this->morphTo();
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
} 