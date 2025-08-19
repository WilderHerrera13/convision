<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\ApiFilterable;

class ProductCategory extends Model
{
    use HasFactory, ApiFilterable;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'icon',
        'required_attributes',
        'is_active'
    ];

    protected $casts = [
        'required_attributes' => 'array',
        'is_active' => 'boolean'
    ];

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function getAttributeTableName()
    {
        return "product_{$this->slug}_attributes";
    }

    public function getAttributeModelClass()
    {
        $className = 'Product' . str_replace('_', '', ucwords($this->slug, '_')) . 'Attributes';
        return "App\\Models\\{$className}";
    }
} 