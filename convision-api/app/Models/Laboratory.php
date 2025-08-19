<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\ApiFilterable;

class Laboratory extends Model
{
    use HasFactory, ApiFilterable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'address',
        'phone',
        'email',
        'contact_person',
        'status',
        'notes'
    ];

    /**
     * Get the orders associated with the laboratory.
     */
    public function orders()
    {
        return $this->hasMany(Order::class);
    }
} 