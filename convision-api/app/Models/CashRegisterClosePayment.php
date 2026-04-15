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
        'counted_amount',
    ];

    protected $casts = [
        'counted_amount' => 'decimal:2',
    ];

    public function cashRegisterClose()
    {
        return $this->belongsTo(CashRegisterClose::class);
    }
}
