<?php

namespace App\Http\Requests\Api\V1\Product;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'internal_code' => 'required|string|max:255|unique:products',
            'identifier' => 'required|string|max:255',
            'description' => 'required|string',
            'cost' => 'required|numeric|min:0',
            'price' => 'required|numeric|min:0',
            'product_category_id' => 'required|exists:product_categories,id',
            'brand_id' => 'required|exists:brands,id',
            'supplier_id' => 'required|exists:suppliers,id',
            'status' => 'required|in:enabled,disabled',
            
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
            'lens_attributes.array' => 'Los atributos del lente deben ser un array',
            'lens_attributes.lens_type_id.exists' => 'El tipo de lente seleccionado no existe',
            'lens_attributes.material_id.exists' => 'El material del lente seleccionado no existe',
            'lens_attributes.lens_class_id.exists' => 'La clase del lente seleccionado no existe',
            'lens_attributes.treatment_id.exists' => 'El tratamiento seleccionado no existe',
            'lens_attributes.photochromic_id.exists' => 'El fotochromico seleccionado no existe',
            'lens_attributes.sphere_min.numeric' => 'El campo sphere_min debe ser numérico',
            'lens_attributes.sphere_max.numeric' => 'El campo sphere_max debe ser numérico',
            'lens_attributes.cylinder_min.numeric' => 'El campo cylinder_min debe ser numérico',
            'lens_attributes.cylinder_max.numeric' => 'El campo cylinder_max debe ser numérico',
            'lens_attributes.addition_min.numeric' => 'El campo addition_min debe ser numérico',
            'lens_attributes.addition_max.numeric' => 'El campo addition_max debe ser numérico',
            'lens_attributes.diameter.numeric' => 'El campo diameter debe ser numérico',
            'lens_attributes.base_curve.numeric' => 'El campo base_curve debe ser numérico',
            'lens_attributes.prism.numeric' => 'El campo prism debe ser numérico',
            'lens_attributes.uv_protection.boolean' => 'El campo uv_protection debe ser booleano',
            'lens_attributes.engraving.string' => 'El campo engraving debe ser una cadena de texto',
            'lens_attributes.availability.string' => 'El campo availability debe ser una cadena de texto',
            'frame_attributes.array' => 'Los atributos del marco deben ser un array',
            'frame_attributes.frame_type.string' => 'El campo frame_type debe ser una cadena de texto',
            'frame_attributes.material_frame.string' => 'El campo material_frame debe ser una cadena de texto',
            'frame_attributes.gender.string' => 'El campo gender debe ser una cadena de texto',
            'frame_attributes.lens_width.numeric' => 'El campo lens_width debe ser numérico',
            'frame_attributes.bridge_width.numeric' => 'El campo bridge_width debe ser numérico',
            'frame_attributes.temple_length.numeric' => 'El campo temple_length debe ser numérico',
            'frame_attributes.color.string' => 'El campo color debe ser una cadena de texto',
            'frame_attributes.shape.string' => 'El campo shape debe ser una cadena de texto',
            'contact_lens_attributes.array' => 'Los atributos del lente de contacto deben ser un array',
            'contact_lens_attributes.contact_type.string' => 'El campo contact_type debe ser una cadena de texto',
            'contact_lens_attributes.replacement_schedule.string' => 'El campo replacement_schedule debe ser una cadena de texto',
            'contact_lens_attributes.base_curve.numeric' => 'El campo base_curve debe ser numérico',
            'contact_lens_attributes.diameter.numeric' => 'El campo diameter debe ser numérico',
            'contact_lens_attributes.material_contact.string' => 'El campo material_contact debe ser una cadena de texto',
            'contact_lens_attributes.water_content.numeric' => 'El campo water_content debe ser numérico',
            'contact_lens_attributes.uv_protection.boolean' => 'El campo uv_protection debe ser booleano',
        ];
    }
} 