<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\ApiFilterable;

class InventoryTransfer extends Model
{
    use HasFactory, ApiFilterable;

    const STATUS_PENDING = 'pending';
    const STATUS_COMPLETED = 'completed';
    const STATUS_CANCELLED = 'cancelled';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'lens_id',
        'source_location_id',
        'destination_location_id',
        'quantity',
        'transferred_by',
        'notes',
        'status',
        'completed_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'quantity' => 'integer',
        'completed_at' => 'datetime',
    ];

    /**
     * Get the lens that is being transferred.
     */
    public function lens()
    {
        return $this->belongsTo(Lens::class);
    }

    /**
     * Get the source location for the transfer.
     */
    public function sourceLocation()
    {
        return $this->belongsTo(WarehouseLocation::class, 'source_location_id');
    }

    /**
     * Get the destination location for the transfer.
     */
    public function destinationLocation()
    {
        return $this->belongsTo(WarehouseLocation::class, 'destination_location_id');
    }

    /**
     * Get the user who transferred the item.
     */
    public function transferredBy()
    {
        return $this->belongsTo(User::class, 'transferred_by');
    }
} 