<?php

namespace App\Http\Requests\Api\V1\Note;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use App\Models\Product;
use App\Models\Appointment;

class StoreNoteRequest extends FormRequest
{
    public function authorize()
    {
        // Authorize if the user is authenticated and the resource exists.
        // Further authorization (e.g., can user add note to *this* specific resource) 
        // can be handled in the controller or via policies if needed.
        if (!Auth::check()) {
            return false;
        }

        $type = $this->route('type');
        $id = $this->route('id');
        $modelClass = $this->getModelClass($type);

        if (!$modelClass) {
            return false; // Invalid type
        }
        
        // Check if the resource exists
        return $modelClass::where('id', $id)->exists();
    }

    public function rules()
    {
        return [
            'content' => 'required|string|max:1000',
        ];
    }

    public function messages()
    {
        return [
            'content.required' => 'El contenido de la nota es obligatorio.',
            'content.max' => 'El contenido de la nota no debe exceder los 1000 caracteres.',
        ];
    }

    /**
     * Get the model class based on the type parameter.
     *
     * @param string $type
     * @return string|null
     */
    private function getModelClass(string $type): ?string
    {
        $map = [
            'lenses' => Product::class,
            'products' => Product::class,
            'appointments' => Appointment::class,
            // Add other noteable models here
        ];
        return $map[$type] ?? null;
    }
} 