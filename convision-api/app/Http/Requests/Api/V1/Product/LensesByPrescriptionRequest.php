<?php

namespace App\Http\Requests\Api\V1\Product;

use Illuminate\Foundation\Http\FormRequest;

class LensesByPrescriptionRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'sphere_od' => 'nullable|numeric',
            'cylinder_od' => 'nullable|numeric', 
            'addition_od' => 'nullable|numeric',
            'sphere_os' => 'nullable|numeric',
            'cylinder_os' => 'nullable|numeric',
            'addition_os' => 'nullable|numeric'
        ];
    }

    public function messages()
    {
        return [
            'sphere_od.numeric' => 'El valor de esfera del ojo derecho debe ser numérico.',
            'cylinder_od.numeric' => 'El valor de cilindro del ojo derecho debe ser numérico.',
            'addition_od.numeric' => 'El valor de adición del ojo derecho debe ser numérico.',
            'sphere_os.numeric' => 'El valor de esfera del ojo izquierdo debe ser numérico.',
            'cylinder_os.numeric' => 'El valor de cilindro del ojo izquierdo debe ser numérico.',
            'addition_os.numeric' => 'El valor de adición del ojo izquierdo debe ser numérico.',
        ];
    }
} 