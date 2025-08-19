<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductLensAttributes extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'lens_type_id',
        'material_id',
        'lens_class_id',
        'treatment_id',
        'photochromic_id',
        'sphere_min',
        'sphere_max',
        'cylinder_min',
        'cylinder_max',
        'addition_min',
        'addition_max',
        'diameter',
        'base_curve',
        'prism',
        'uv_protection',
        'engraving',
        'availability'
    ];

    protected $casts = [
        'sphere_min' => 'decimal:2',
        'sphere_max' => 'decimal:2',
        'cylinder_min' => 'decimal:2',
        'cylinder_max' => 'decimal:2',
        'addition_min' => 'decimal:2',
        'addition_max' => 'decimal:2',
        'diameter' => 'decimal:2',
        'base_curve' => 'decimal:2',
        'prism' => 'decimal:2',
        'uv_protection' => 'boolean',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
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
} 