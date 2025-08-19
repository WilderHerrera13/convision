<?php

namespace App\Http\Requests\Api\V1\Order;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Order; // For status constants

class StoreOrderRequest extends FormRequest
{
    public function authorize()
    {
        return true; // Assuming authorization is handled by middleware or controller constructor
    }

    public function rules()
    {
        return [
            'patient_id' => 'required|exists:patients,id',
            'appointment_id' => 'nullable|exists:appointments,id',
            'laboratory_id' => 'nullable|exists:laboratories,id',
            
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id', // Changed from lens_id
            'items.*.quantity' => 'required|integer|min:1',
            // 'items.*.price' is no longer needed here, it will be calculated by the controller
            // 'items.*.discount' is no longer needed here, it will be calculated by the controller
            // 'items.*.total' is no longer needed here, it will be calculated by the controller
            'items.*.notes' => 'nullable|string|max:500',
            
            // Subtotal, tax, and total will be calculated by the controller.
            // Client can send suggested tax_percentage or tax_amount if applicable.
            'tax_percentage' => 'nullable|numeric|min:0|max:100',
            'tax_amount' => 'nullable|numeric|min:0',

            'status' => 'nullable|string|in:'.implode(',', Order::getAllStatuses()),
            'payment_status' => 'nullable|string|in:'.implode(',', Order::getAllPaymentStatuses()),
            'notes' => 'nullable|string|max:1000',
        ];
    }

    public function messages()
    {
        return [
            'patient_id.required' => 'El paciente es obligatorio.',
            'patient_id.exists' => 'El paciente seleccionado no es válido.',
            'appointment_id.exists' => 'La cita seleccionada no es válida.',
            'laboratory_id.exists' => 'El laboratorio seleccionado no es válido.',
            
            'items.required' => 'Se requiere al menos un ítem en la orden.',
            'items.array' => 'Los ítems deben ser un arreglo.',
            'items.min' => 'La orden debe contener al menos un ítem.',
            
            'items.*.product_id.required' => 'El producto es obligatorio para cada ítem.',
            'items.*.product_id.exists' => 'El producto seleccionado para un ítem no es válido.',
            'items.*.quantity.required' => 'La cantidad es obligatoria para cada ítem.',
            'items.*.quantity.integer' => 'La cantidad debe ser un número entero.',
            'items.*.quantity.min' => 'La cantidad debe ser al menos 1.',
            'items.*.notes.string' => 'Las notas del ítem deben ser texto.',
            'items.*.notes.max' => 'Las notas del ítem no deben exceder los :max caracteres.',

            'tax_percentage.numeric' => 'El porcentaje de impuesto debe ser numérico.',
            'tax_percentage.min' => 'El porcentaje de impuesto no puede ser negativo.',
            'tax_percentage.max' => 'El porcentaje de impuesto no puede ser mayor a 100.',
            'tax_amount.numeric' => 'El monto del impuesto debe ser numérico.',
            'tax_amount.min' => 'El monto del impuesto no puede ser negativo.',

            'status.in' => 'El estado de la orden no es válido.',
            'payment_status.in' => 'El estado de pago de la orden no es válido.',
            'notes.string' => 'Las notas generales deben ser texto.',
            'notes.max' => 'Las notas generales no deben exceder los :max caracteres.',
        ];
    }
} 