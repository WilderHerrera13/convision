<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\ApiFilterable;

class Supplier extends Model
{
    use HasFactory, ApiFilterable;

    protected $fillable = [
        'name',
        'nit',
        'legal_name',
        'legal_representative',
        'legal_representative_id',
        'person_type',
        'tax_responsibility',
        'regime_type',
        'document_type',
        'commercial_name',
        'responsible_person',
        'address',
        'phone',
        'email',
        'city_id',
        'state',
        'country',
        'postal_code',
        'website',
        'bank_name',
        'bank_account_type',
        'bank_account_number',
        'invima_registration',
        'fiscal_responsibility',
        'is_self_withholding',
        'is_vat_agent',
        'is_great_contributor',
        'notes',
    ];

    protected $casts = [
        'is_self_withholding' => 'boolean',
        'is_vat_agent' => 'boolean',
        'is_great_contributor' => 'boolean',
    ];

    public function city()
    {
        return $this->belongsTo(City::class);
    }

    public function lenses()
    {
        return $this->hasMany(Lens::class);
    }

    public function purchases()
    {
        return $this->hasMany(Purchase::class);
    }

    public function serviceOrders()
    {
        return $this->hasMany(ServiceOrder::class);
    }

    public function expenses()
    {
        return $this->hasMany(Expense::class);
    }
}
