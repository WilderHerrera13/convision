<?php

namespace App\Http\Requests\Api\V1\Lens;

use Illuminate\Foundation\Http\FormRequest;

class BulkUploadLensRequest extends FormRequest
{
    public function authorize()
    {
        // return $this->user()->isAdmin(); // Or any other appropriate authorization logic
        return $this->user()->role === 'admin'; // Or any other appropriate authorization logic
    }

    public function rules()
    {
        return [
            'file' => 'required|file|mimes:xlsx,xls,csv|max:2048', // Max 2MB
        ];
    }

    public function messages()
    {
        return [
            'file.required' => 'El archivo es obligatorio.',
            'file.file' => 'Debe seleccionar un archivo válido.',
            'file.mimes' => 'El archivo debe ser de tipo: xlsx, xls, csv.',
            'file.max' => 'El archivo no debe ser mayor a 2MB.',
        ];
    }
} 