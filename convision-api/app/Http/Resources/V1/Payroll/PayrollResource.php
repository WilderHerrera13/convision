<?php

namespace App\Http\Resources\V1\Payroll;

use Illuminate\Http\Resources\Json\JsonResource;

class PayrollResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'employee_name' => $this->employee_name,
            'employee_identification' => $this->employee_identification,
            'employee_position' => $this->employee_position,
            'pay_period_start' => $this->pay_period_start,
            'pay_period_end' => $this->pay_period_end,
            'base_salary' => $this->base_salary,
            'overtime_hours' => $this->overtime_hours,
            'overtime_rate' => $this->overtime_rate,
            'overtime_amount' => $this->overtime_amount,
            'bonuses' => $this->bonuses,
            'commissions' => $this->commissions,
            'other_income' => $this->other_income,
            'gross_salary' => $this->gross_salary,
            'health_deduction' => $this->health_deduction,
            'pension_deduction' => $this->pension_deduction,
            'tax_deduction' => $this->tax_deduction,
            'other_deductions' => $this->other_deductions,
            'total_deductions' => $this->total_deductions,
            'net_salary' => $this->net_salary,
            'payment_date' => $this->payment_date,
            'payment_method_id' => $this->payment_method_id,
            'payment_method' => $this->whenLoaded('paymentMethod'),
            'reference' => $this->reference,
            'notes' => $this->notes,
            'status' => $this->status,
            'created_by_user_id' => $this->created_by_user_id,
            'created_by' => $this->whenLoaded('createdBy'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
} 