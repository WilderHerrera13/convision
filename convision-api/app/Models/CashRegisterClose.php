<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\ApiFilterable;

class CashRegisterClose extends Model
{
    use HasFactory, ApiFilterable;

    const STATUS_DRAFT = 'draft';
    const STATUS_SUBMITTED = 'submitted';
    const STATUS_APPROVED = 'approved';

    const PAYMENT_METHODS = [
        'efectivo',
        'voucher',
        'bancolombia',
        'daviplata',
        'nequi',
        'addi',
        'sistecredito',
        'anticipo',
        'bono',
        'pago_sistecredito',
    ];

    const DENOMINATIONS = [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50];

    protected $fillable = [
        'user_id',
        'close_date',
        'status',
        'total_counted',
        'total_actual_amount',
        'admin_actuals_recorded_at',
        'admin_notes',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'close_date' => 'date',
        'total_counted' => 'decimal:2',
        'total_actual_amount' => 'decimal:2',
        'admin_actuals_recorded_at' => 'datetime',
        'approved_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function payments()
    {
        return $this->hasMany(CashRegisterClosePayment::class);
    }

    public function denominations()
    {
        return $this->hasMany(CashCountDenomination::class);
    }

    public function actualPayments()
    {
        return $this->hasMany(CashRegisterCloseActualPayment::class);
    }
}
