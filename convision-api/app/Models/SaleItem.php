<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SaleItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'sale_id',
        'lens_id',
        'quantity',
        'price',
        'discount',
        'total',
        'notes'
    ];

    protected $casts = [
        'quantity' => 'integer',
        'price' => 'float',
        'discount' => 'float',
        'total' => 'float',
    ];

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    public function lens()
    {
        return $this->belongsTo(Product::class, 'lens_id');
    }
} 