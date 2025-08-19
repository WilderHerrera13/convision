<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\ApiFilterable;

class SaleLensPriceAdjustment extends Model
{
    use HasFactory, ApiFilterable;

    protected $fillable = [
        'sale_id',
        'lens_id',
        'base_price',
        'adjusted_price',
        'adjustment_amount',
        'reason',
        'adjusted_by'
    ];

    protected $casts = [
        'base_price' => 'decimal:2',
        'adjusted_price' => 'decimal:2',
        'adjustment_amount' => 'decimal:2'
    ];

    protected static function boot()
    {
        parent::boot();
        
        static::saving(function ($adjustment) {
            if ($adjustment->adjusted_price <= $adjustment->base_price) {
                throw new \InvalidArgumentException(
                    'No se permite disminuir el precio. Utilice el flujo de descuentos si desea aplicar una reducción.'
                );
            }
            
            $adjustment->adjustment_amount = $adjustment->adjusted_price - $adjustment->base_price;
        });
    }

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    public function lens()
    {
        return $this->belongsTo(Product::class, 'lens_id');
    }

    public function adjustedBy()
    {
        return $this->belongsTo(User::class, 'adjusted_by');
    }
}
