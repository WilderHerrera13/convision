<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\ApiFilterable;

class CashTransfer extends Model
{
    use HasFactory, ApiFilterable;

    protected $fillable = [
        'transfer_number',
        'type',
        'from_account',
        'to_account',
        'amount',
        'currency',
        'transfer_date',
        'concept',
        'description',
        'reference_number',
        'status',
        'notes',
        'created_by_user_id',
        'approved_by_user_id',
        'approved_at',
    ];

    protected $casts = [
        'transfer_date' => 'date',
        'amount' => 'decimal:2',
        'approved_at' => 'datetime',
    ];

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    public function getStatusColorAttribute()
    {
        switch($this->status) {
            case 'completed':
                return 'success';
            case 'pending':
                return 'warning';
            case 'cancelled':
                return 'destructive';
            default:
                return 'default';
        }
    }

    public function getTypeDisplayAttribute()
    {
        switch($this->type) {
            case 'internal':
                return 'Transferencia Interna';
            case 'bank_deposit':
                return 'Depósito Bancario';
            case 'bank_withdrawal':
                return 'Retiro Bancario';
            case 'petty_cash':
                return 'Caja Menor';
            default:
                return $this->type;
        }
    }
} 