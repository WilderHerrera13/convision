<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\ApiFilterable;

class Purchase extends Model
{
    use HasFactory, ApiFilterable;

    protected $fillable = [
        'supplier_id',
        'purchase_date',
        'invoice_number',
        'concept',
        'subtotal',
        'tax_amount',
        'retention_amount',
        'total_amount',
        'payment_amount',
        'balance',
        'payment_status',
        'tax_excluded',
        'invoice_file',
        'notes',
        'payment_due_date',
        'created_by_user_id',
    ];

    protected $casts = [
        'purchase_date' => 'date',
        'payment_due_date' => 'date',
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'retention_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'payment_amount' => 'decimal:2',
        'balance' => 'decimal:2',
        'tax_excluded' => 'boolean',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function items()
    {
        return $this->hasMany(PurchaseItem::class);
    }

    public function payments()
    {
        return $this->hasMany(PurchasePayment::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function getStatusAttribute()
    {
        if ($this->balance <= 0) {
            return 'paid';
        } elseif ($this->payment_amount > 0) {
            return 'partial';
        } else {
            return 'pending';
        }
    }
} 