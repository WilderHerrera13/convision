<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\ApiFilterable;

class PaymentMethod extends Model
{
    use HasFactory, ApiFilterable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'code',
        'description',
        'icon',
        'is_active',
        'requires_reference',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'is_active' => 'boolean',
        'requires_reference' => 'boolean',
    ];

    /**
     * Get the sale payments that use this payment method.
     */
    public function salePayments()
    {
        return $this->hasMany(SalePayment::class);
    }
}
