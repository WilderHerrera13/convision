<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\ApiFilterable;

class Product extends Model
{
    use HasFactory, ApiFilterable;

    const STATUS_ENABLED = 'enabled';
    const STATUS_DISABLED = 'disabled';

    protected $fillable = [
        'internal_code',
        'identifier',
        'description',
        'cost',
        'price',
        'product_category_id',
        'brand_id',
        'supplier_id',
        'status'
    ];

    protected $casts = [
        'cost' => 'decimal:2',
        'price' => 'decimal:2',
    ];

    protected static function boot()
    {
        parent::boot();
        
        static::saving(function ($product) {
            if ($product->price <= 0) {
                throw new \Illuminate\Validation\ValidationException(
                    \Illuminate\Validation\Validator::make(
                        ['price' => $product->price],
                        ['price' => 'numeric|min:0.01'],
                        ['price.min' => 'The price must be greater than 0.']
                    )
                );
            }
        });
    }

    public function category()
    {
        return $this->belongsTo(ProductCategory::class, 'product_category_id');
    }

    public function brand()
    {
        return $this->belongsTo(Brand::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function notes()
    {
        return $this->morphMany(Note::class, 'notable');
    }

    public function inventoryItems()
    {
        return $this->hasMany(InventoryItem::class);
    }

    public function inventoryTransfers()
    {
        return $this->hasMany(InventoryTransfer::class);
    }

    public function discountRequests()
    {
        return $this->hasMany(DiscountRequest::class);
    }

    public function lensAttributes()
    {
        return $this->hasOne(ProductLensAttributes::class);
    }

    public function frameAttributes()
    {
        return $this->hasOne(ProductFrameAttributes::class);
    }

    public function contactLensAttributes()
    {
        return $this->hasOne(ProductContactLensAttributes::class);
    }

    public function getSpecificAttributes()
    {
        $category = $this->category;
        if (!$category) return null;

        switch ($category->slug) {
            case 'lens':
                return $this->lensAttributes;
            case 'frame':
                return $this->frameAttributes;
            case 'contact_lens':
                return $this->contactLensAttributes;
            default:
                return null;
        }
    }

    public function getTotalQuantityAttribute()
    {
        return $this->inventoryItems()->sum('quantity');
    }

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

    public function scopeByCategory($query, $categorySlug)
    {
        return $query->whereHas('category', function($q) use ($categorySlug) {
            $q->where('slug', $categorySlug);
        });
    }

    public function isLens()
    {
        return $this->category && $this->category->slug === 'lens';
    }

    public function isFrame()
    {
        return $this->category && $this->category->slug === 'frame';
    }

    public function isContactLens()
    {
        return $this->category && $this->category->slug === 'contact_lens';
    }
} 