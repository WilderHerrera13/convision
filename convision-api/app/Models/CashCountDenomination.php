<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CashCountDenomination extends Model
{
    use HasFactory;

    protected $fillable = [
        'cash_register_close_id',
        'denomination',
        'quantity',
        'subtotal',
    ];

    protected $casts = [
        'denomination' => 'integer',
        'quantity' => 'integer',
        'subtotal' => 'decimal:2',
    ];

    public function cashRegisterClose()
    {
        return $this->belongsTo(CashRegisterClose::class);
    }
}
