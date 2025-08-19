<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\ApiFilterable;

class Expense extends Model
{
    use HasFactory, ApiFilterable;

    protected $fillable = [
        'supplier_id',
        'invoice_number',
        'concept',
        'description',
        'expense_date',
        'amount',
        'payment_amount',
        'balance',
        'tax_excluded',
        'payment_method_id',
        'reference',
        'notes',
        'created_by_user_id',
    ];

    protected $casts = [
        'expense_date' => 'date',
        'amount' => 'decimal:2',
        'payment_amount' => 'decimal:2',
        'balance' => 'decimal:2',
        'tax_excluded' => 'boolean',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function paymentMethod()
    {
        return $this->belongsTo(PaymentMethod::class);
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