<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductContactLensAttributes extends Model
{
    use HasFactory;

    protected $table = 'product_contact_lens_attributes'; // Explicitly define table name

    protected $fillable = [
        'product_id',
        'contact_type',
        'replacement_schedule',
        'base_curve',
        'diameter',
        'material_contact',
        'water_content',
        'uv_protection',
    ];

    protected $casts = [
        'base_curve' => 'decimal:2',
        'diameter' => 'decimal:2',
        'water_content' => 'decimal:2',
        'uv_protection' => 'boolean',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
} 