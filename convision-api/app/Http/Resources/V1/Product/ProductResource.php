<?php

namespace App\Http\Resources\V1\Product;

use App\Services\ProductDiscountService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray($request): array
    {
        $productDiscountService = app(ProductDiscountService::class);
        // Try to get patient_id from request if available, for patient-specific discounts
        $patientId = $request->get('patient_id'); 

        $baseData = [
            'id' => $this->id,
            'internal_code' => $this->internal_code,
            'identifier' => $this->identifier,
            'description' => $this->description,
            'cost' => $this->cost,
            'price' => $this->price,
            'category' => $this->whenLoaded('category', function () {
                return [
                    'id' => $this->category->id,
                    'name' => $this->category->name,
                    'slug' => $this->category->slug,
                ];
            }),
            'brand' => $this->whenLoaded('brand', function () {
                return [
                    'id' => $this->brand->id,
                    'name' => $this->brand->name,
                ];
            }),
            'supplier' => $this->whenLoaded('supplier', function () {
                return [
                    'id' => $this->supplier->id,
                    'name' => $this->supplier->name,
                ];
            }),
            'lens_attributes' => $this->whenLoaded('lensAttributes'),
            'frame_attributes' => $this->whenLoaded('frameAttributes'),
            'contact_lens_attributes' => $this->whenLoaded('contactLensAttributes'),
            'has_discounts' => $this->has_discounts,
            'status' => $this->status,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'discount_info' => $this->when($this->has_discounts, 
                $productDiscountService->getProductDiscountInfo($this->resource, $patientId)
            )
        ];

        if ($this->relationLoaded('lensAttributes') && $this->lensAttributes) {
            $baseData = array_merge($baseData, [
                'type_id' => $this->lensAttributes->lens_type_id,
                'brand_id' => $this->brand_id,
                'material_id' => $this->lensAttributes->material_id,
                'lens_class_id' => $this->lensAttributes->lens_class_id,
                'treatment_id' => $this->lensAttributes->treatment_id,
                'photochromic_id' => $this->lensAttributes->photochromic_id,
                'supplier_id' => $this->supplier_id,
                'sphere_min' => $this->lensAttributes->sphere_min,
                'sphere_max' => $this->lensAttributes->sphere_max,
                'cylinder_min' => $this->lensAttributes->cylinder_min,
                'cylinder_max' => $this->lensAttributes->cylinder_max,
                'addition_min' => $this->lensAttributes->addition_min,
                'addition_max' => $this->lensAttributes->addition_max,
                'diameter' => $this->lensAttributes->diameter,
                'base_curve' => $this->lensAttributes->base_curve,
                'prism' => $this->lensAttributes->prism,
                'uv_protection' => $this->lensAttributes->uv_protection,
                'engraving' => $this->lensAttributes->engraving,
                'availability' => $this->lensAttributes->availability,
                'type' => $this->lensAttributes->lensType ? [
                    'id' => $this->lensAttributes->lensType->id,
                    'name' => $this->lensAttributes->lensType->name,
                ] : null,
                'material' => $this->lensAttributes->material ? [
                    'id' => $this->lensAttributes->material->id,
                    'name' => $this->lensAttributes->material->name,
                ] : null,
                'lens_class' => $this->lensAttributes->lensClass ? [
                    'id' => $this->lensAttributes->lensClass->id,
                    'name' => $this->lensAttributes->lensClass->name,
                ] : null,
                'treatment' => $this->lensAttributes->treatment ? [
                    'id' => $this->lensAttributes->treatment->id,
                    'name' => $this->lensAttributes->treatment->name,
                ] : null,
                'photochromic' => $this->lensAttributes->photochromic ? [
                    'id' => $this->lensAttributes->photochromic->id,
                    'name' => $this->lensAttributes->photochromic->name,
                ] : null,
            ]);
        }

        return $baseData;
    }
} 