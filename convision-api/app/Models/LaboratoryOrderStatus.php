<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LaboratoryOrderStatus extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'laboratory_order_id',
        'status',
        'notes',
        'user_id'
    ];

    /**
     * Get the laboratory order this status belongs to.
     */
    public function laboratoryOrder()
    {
        return $this->belongsTo(LaboratoryOrder::class);
    }

    /**
     * Get the user who created this status.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
