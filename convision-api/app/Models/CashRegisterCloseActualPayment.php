<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CashRegisterCloseActualPayment extends Model
{
    protected $fillable = [
        'cash_register_close_id',
        'payment_method_name',
        'actual_amount',
    ];

    protected $casts = [
        'actual_amount' => 'decimal:2',
    ];

    public function cashRegisterClose()
    {
        return $this->belongsTo(CashRegisterClose::class);
    }
}
