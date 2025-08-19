<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\ApiFilterable;

class Warehouse extends Model
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
        'name',
        'code',
        'address',
        'city',
        'status',
        'notes',
    ];

    /**
     * Get the locations for the warehouse.
     */
    public function locations()
    {
        return $this->hasMany(WarehouseLocation::class);
    }

    /**
     * Get the inventory items for the warehouse.
     */
    public function inventoryItems()
    {
        return $this->hasMany(InventoryItem::class);
    }
} 