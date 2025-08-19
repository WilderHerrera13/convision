<?php

namespace App\Http\Requests\Api\V1\Product;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        $productId = $this->route('product') ?? $this->route('id');
        
        return [
            'internal_code' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('products')->ignore($productId)
            ],
            'identifier' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|required|string',
            'cost' => 'sometimes|required|numeric|min:0',
            'price' => 'sometimes|required|numeric|min:0',
            'product_category_id' => 'sometimes|required|exists:product_categories,id',
            'brand_id' => 'sometimes|required|exists:brands,id',
            'supplier_id' => 'sometimes|required|exists:suppliers,id',
            'status' => 'sometimes|required|in:enabled,disabled',
            
            'lens_attributes' => 'sometimes|array',
            'lens_attributes.lens_type_id' => 'nullable|exists:lens_types,id',
            'lens_attributes.material_id' => 'nullable|exists:materials,id',
            'lens_attributes.lens_class_id' => 'nullable|exists:lens_classes,id',
            'lens_attributes.treatment_id' => 'nullable|exists:treatments,id',
            'lens_attributes.photochromic_id' => 'nullable|exists:photochromics,id',
            'lens_attributes.sphere_min' => 'nullable|numeric',
            'lens_attributes.sphere_max' => 'nullable|numeric',
            'lens_attributes.cylinder_min' => 'nullable|numeric',
            'lens_attributes.cylinder_max' => 'nullable|numeric',
            'lens_attributes.addition_min' => 'nullable|numeric',
            'lens_attributes.addition_max' => 'nullable|numeric',
            'lens_attributes.diameter' => 'nullable|numeric',
            'lens_attributes.base_curve' => 'nullable|numeric',
            'lens_attributes.prism' => 'nullable|numeric',
            'lens_attributes.uv_protection' => 'nullable|boolean',
            'lens_attributes.engraving' => 'nullable|string',
            'lens_attributes.availability' => 'nullable|string',
            
            'frame_attributes' => 'sometimes|array',
            'frame_attributes.frame_type' => 'nullable|string',
            'frame_attributes.material_frame' => 'nullable|string',
            'frame_attributes.gender' => 'nullable|string',
            'frame_attributes.lens_width' => 'nullable|numeric',
            'frame_attributes.bridge_width' => 'nullable|numeric',
            'frame_attributes.temple_length' => 'nullable|numeric',
            'frame_attributes.color' => 'nullable|string',
            'frame_attributes.shape' => 'nullable|string',
            
            'contact_lens_attributes' => 'sometimes|array',
            'contact_lens_attributes.contact_type' => 'nullable|string',
            'contact_lens_attributes.replacement_schedule' => 'nullable|string',
            'contact_lens_attributes.base_curve' => 'nullable|numeric',
            'contact_lens_attributes.diameter' => 'nullable|numeric',
            'contact_lens_attributes.material_contact' => 'nullable|string',
            'contact_lens_attributes.water_content' => 'nullable|numeric',
            'contact_lens_attributes.uv_protection' => 'nullable|boolean',
        ];
    }

    public function messages()
    {
        return [
            'internal_code.required' => 'El código es requerido',
            'internal_code.unique' => 'El código ya está en uso',
            'identifier.required' => 'El identificador es requerido',
            'description.required' => 'La descripción es requerida',
            'cost.required' => 'El costo es requerido',
            'cost.min' => 'El costo debe ser mayor o igual a 0',
            'price.required' => 'El precio es requerido',
            'price.min' => 'El precio debe ser mayor o igual a 0',
            'product_category_id.required' => 'La categoría es requerida',
            'product_category_id.exists' => 'La categoría seleccionada no existe',
            'brand_id.required' => 'La marca es requerida',
            'brand_id.exists' => 'La marca seleccionada no existe',
            'supplier_id.required' => 'El proveedor es requerido',
            'supplier_id.exists' => 'El proveedor seleccionado no existe',
            'status.required' => 'El estado es requerido',
            'status.in' => 'El estado debe ser enabled o disabled',
        ];
    }

    protected function prepareForValidation()
    {
        // Add category slug for validation based on category_id
        if ($this->has('product_category_id')) {
            $category = \App\Models\ProductCategory::find($this->product_category_id);
            if ($category) {
                $this->merge(['category_slug' => $category->slug]);
            }
        } else {
            // If no category provided, get it from the existing product
            $productId = $this->route('product') ?? $this->route('id');
            if ($productId) {
                $product = \App\Models\Product::with('category')->find($productId);
                if ($product && $product->category) {
                    $this->merge(['category_slug' => $product->category->slug]);
                }
            }
        }
    }
} 