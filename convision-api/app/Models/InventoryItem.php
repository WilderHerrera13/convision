<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\ApiFilterable;

class InventoryItem extends Model
{
    use HasFactory, ApiFilterable;

    const STATUS_AVAILABLE = 'available';
    const STATUS_RESERVED = 'reserved';
    const STATUS_DAMAGED = 'damaged';
    const STATUS_SOLD = 'sold';
    const STATUS_RETURNED = 'returned';
    const STATUS_LOST = 'lost';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'product_id',
        'warehouse_id',
        'warehouse_location_id',
        'quantity',
        'status',
        'notes',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'quantity' => 'integer',
    ];

    /**
     * Get the product that owns the inventory item.
     */
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Get the warehouse that owns the inventory item.
     */
    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    /**
     * Get the warehouse location that owns the inventory item.
     */
    public function warehouseLocation()
    {
        return $this->belongsTo(WarehouseLocation::class);
    }
} 