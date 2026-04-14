<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CashRegisterClosePayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'cash_register_close_id',
        'payment_method_name',
        'registered_amount',
        'counted_amount',
        'difference',
    ];

    protected $casts = [
        'registered_amount' => 'decimal:2',
        'counted_amount' => 'decimal:2',
        'difference' => 'decimal:2',
    ];

    public function cashRegisterClose()
    {
        return $this->belongsTo(CashRegisterClose::class);
    }
}
