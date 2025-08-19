<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\DocumentItemTrait;

class QuoteItem extends Model
{
    use HasFactory, DocumentItemTrait;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'quote_id',
        'product_id',
        'product_type',
        'name',
        'description',
        'quantity',
        'price',
        'original_price',
        'discount_percentage',
        'total',
        'notes',
        'discount_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'quantity' => 'integer',
        'price' => 'float',
        'original_price' => 'float',
        'discount_percentage' => 'float',
        'discount_amount' => 'float',
        'tax_amount' => 'float',
        'total' => 'float',
    ];

    /**
     * Get the quote that owns the item.
     */
    public function quote()
    {
        return $this->belongsTo(Quote::class);
    }

    /**
     * Get the itemable that is included in this quote item.
     */
    public function itemable()
    {
        return $this->morphTo(__FUNCTION__, 'product_type', 'product_id');
    }

    /**
     * Get the product that is included in this quote item.
     */
    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function discount()
    {
        return $this->belongsTo(DiscountRequest::class, 'discount_id');
    }
} 