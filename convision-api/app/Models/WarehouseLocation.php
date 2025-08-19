<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\ApiFilterable;

class WarehouseLocation extends Model
{
    use HasFactory, ApiFilterable;

    const STATUS_ACTIVE = 'active';
    const STATUS_INACTIVE = 'inactive';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'warehouse_id',
        'name',
        'code',
        'type',
        'status',
        'description',
    ];

    /**
     * Get the warehouse that owns the location.
     */
    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    /**
     * Get the inventory items for the location.
     */
    public function inventoryItems()
    {
        return $this->hasMany(InventoryItem::class);
    }

    /**
     * Get the source transfers for the location.
     */
    public function sourceTransfers()
    {
        return $this->hasMany(InventoryTransfer::class, 'source_location_id');
    }

    /**
     * Get the destination transfers for the location.
     */
    public function destinationTransfers()
    {
        return $this->hasMany(InventoryTransfer::class, 'destination_location_id');
    }
} 