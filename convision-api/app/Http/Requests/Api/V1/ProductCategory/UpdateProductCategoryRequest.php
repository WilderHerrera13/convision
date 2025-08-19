<?php

namespace App\Http\Requests\Api\V1\ProductCategory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductCategoryRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Or use auth()->check() or a policy
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $categoryId = $this->route('product_category') ? $this->route('product_category')->id : null;

        return [
            'name' => ['sometimes', 'string', 'max:255', Rule::unique('product_categories')->ignore($categoryId)],
            'slug' => ['sometimes', 'string', 'max:255', Rule::unique('product_categories')->ignore($categoryId)],
            'description' => ['nullable', 'string'],
            'icon' => ['nullable', 'string', 'max:255'],
            'required_attributes' => ['nullable', 'json'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
} 