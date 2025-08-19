<?php

namespace App\Http\Requests\Api\V1\Payroll;

use Illuminate\Foundation\Http\FormRequest;

class StorePayrollRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'employee_name' => 'required|string|max:255',
            'employee_identification' => 'required|string|max:255',
            'employee_position' => 'required|string|max:255',
            'pay_period_start' => 'required|date',
            'pay_period_end' => 'required|date|after_or_equal:pay_period_start',
            'base_salary' => 'required|numeric|min:0',
            'overtime_hours' => 'nullable|numeric|min:0',
            'overtime_rate' => 'nullable|numeric|min:0',
            'bonuses' => 'nullable|numeric|min:0',
            'commissions' => 'nullable|numeric|min:0',
            'other_income' => 'nullable|numeric|min:0',
            'health_deduction' => 'nullable|numeric|min:0',
            'pension_deduction' => 'nullable|numeric|min:0',
            'tax_deduction' => 'nullable|numeric|min:0',
            'other_deductions' => 'nullable|numeric|min:0',
            'payment_date' => 'nullable|date',
            'payment_method_id' => 'nullable|exists:payment_methods,id',
            'reference' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'status' => 'nullable|in:pending,paid,cancelled',
        ];
    }

    public function messages(): array
    {
        return [
            'employee_name.required' => 'El nombre del empleado es obligatorio.',
            'employee_identification.required' => 'La identificación del empleado es obligatoria.',
            'employee_position.required' => 'El cargo del empleado es obligatorio.',
            'pay_period_start.required' => 'La fecha de inicio del período es obligatoria.',
            'pay_period_end.required' => 'La fecha de fin del período es obligatoria.',
            'pay_period_end.after_or_equal' => 'La fecha de fin debe ser posterior o igual a la fecha de inicio.',
            'base_salary.required' => 'El salario base es obligatorio.',
            'base_salary.min' => 'El salario base debe ser mayor o igual a 0.',
            'payment_method_id.exists' => 'El método de pago seleccionado no existe.',
        ];
    }
} 