<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\ApiFilterable;

class Payroll extends Model
{
    use HasFactory, ApiFilterable;
    
    protected $table = 'payroll';

    protected $fillable = [
        'employee_name',
        'employee_identification',
        'employee_position',
        'pay_period_start',
        'pay_period_end',
        'base_salary',
        'overtime_hours',
        'overtime_rate',
        'overtime_amount',
        'bonuses',
        'commissions',
        'other_income',
        'gross_salary',
        'health_deduction',
        'pension_deduction',
        'tax_deduction',
        'other_deductions',
        'total_deductions',
        'net_salary',
        'payment_date',
        'payment_method_id',
        'reference',
        'notes',
        'status',
        'created_by_user_id',
    ];

    protected $casts = [
        'pay_period_start' => 'date',
        'pay_period_end' => 'date',
        'payment_date' => 'date',
        'base_salary' => 'decimal:2',
        'overtime_hours' => 'decimal:2',
        'overtime_rate' => 'decimal:2',
        'overtime_amount' => 'decimal:2',
        'bonuses' => 'decimal:2',
        'commissions' => 'decimal:2',
        'other_income' => 'decimal:2',
        'gross_salary' => 'decimal:2',
        'health_deduction' => 'decimal:2',
        'pension_deduction' => 'decimal:2',
        'tax_deduction' => 'decimal:2',
        'other_deductions' => 'decimal:2',
        'total_deductions' => 'decimal:2',
        'net_salary' => 'decimal:2',
    ];

    public function paymentMethod()
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function getStatusColorAttribute()
    {
        switch($this->status) {
            case 'paid':
                return 'success';
            case 'pending':
                return 'warning';
            case 'cancelled':
                return 'destructive';
            default:
                return 'default';
        }
    }
} 