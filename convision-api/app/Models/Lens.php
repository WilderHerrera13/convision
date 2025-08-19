<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\ApiFilterable;

class Lens extends Model
{
    use HasFactory, ApiFilterable;

    const STATUS_ENABLED = 'enabled';
    const STATUS_DISABLED = 'disabled';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'internal_code',
        'identifier',
        'type_id',
        'brand_id',
        'material_id',
        'lens_class_id',
        'treatment_id',
        'photochromic_id',
        'description',
        'supplier_id',
        'price',
        'cost',
        'sphere_min',
        'sphere_max',
        'cylinder_min',
        'cylinder_max',
        'addition_min',
        'addition_max',
        'status'
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'price' => 'decimal:2',
        'cost' => 'decimal:2',
        'sphere_min' => 'decimal:2',
        'sphere_max' => 'decimal:2',
        'cylinder_min' => 'decimal:2',
        'cylinder_max' => 'decimal:2',
        'addition_min' => 'decimal:2',
        'addition_max' => 'decimal:2',
    ];

    /**
     * Boot the model.
     *
     * @return void
     */
    protected static function boot()
    {
        parent::boot();
        
        static::saving(function ($lens) {
            // Ensure price is greater than 0
            if ($lens->price <= 0) {
                throw new \Illuminate\Validation\ValidationException(
                    \Illuminate\Validation\Validator::make(
                        ['price' => $lens->price],
                        ['price' => 'numeric|min:0.01'],
                        ['price.min' => 'The price must be greater than 0.']
                    )
                );
            }
        });
    }

    public function brand()
    {
        return $this->belongsTo(Brand::class);
    }

    public function type()
    {
        return $this->belongsTo(LensType::class, 'type_id');
    }

    public function lensType()
    {
        return $this->belongsTo(LensType::class);
    }

    public function material()
    {
        return $this->belongsTo(Material::class);
    }

    public function lensClass()
    {
        return $this->belongsTo(LensClass::class);
    }

    public function treatment()
    {
        return $this->belongsTo(Treatment::class);
    }

    public function photochromic()
    {
        return $this->belongsTo(Photochromic::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function notes()
    {
        return $this->morphMany(Note::class, 'notable');
    }

    /**
     * Get the inventory items for the lens.
     */
    public function inventoryItems()
    {
        return $this->hasMany(InventoryItem::class);
    }

    /**
     * Get the inventory transfers for the lens.
     */
    public function inventoryTransfers()
    {
        return $this->hasMany(InventoryTransfer::class);
    }

    /**
     * Get the total quantity of this lens across all warehouses.
     */
    public function getTotalQuantityAttribute()
    {
        return $this->inventoryItems()->sum('quantity');
    }

    /**
     * Get the discount requests for this lens
     */
    public function discountRequests()
    {
        return $this->hasMany(DiscountRequest::class);
    }

    /**
     * Scope to check if a lens has any active approved discounts
     */
    public function scopeHasActiveDiscounts($query)
    {
        return $query->whereHas('discountRequests', function($q) {
            $q->where('status', 'approved')
              ->where(function($q) {
                  $q->whereNull('expiry_date')
                    ->orWhere('expiry_date', '>=', now());
              });
        });
    }

    /**
     * Check if the lens has any active approved discounts
     */
    public function getHasDiscountsAttribute()
    {
        return $this->discountRequests()
            ->where('status', 'approved')
            ->where(function($q) {
                $q->whereNull('expiry_date')
                  ->orWhere('expiry_date', '>=', now());
            })
            ->exists();
    }
}
