<?php

namespace App\Services;

use App\Models\Product;
use App\Models\DiscountRequest;
use Illuminate\Support\Facades\Log;

class ProductDiscountService
{
    public function getBestDiscount(int $productId, int $patientId = null)
    {
        $query = DiscountRequest::where('product_id', $productId)
            ->where('status', 'approved')
            ->where(function($q) {
                $q->whereNull('expiry_date')
                  ->orWhere('expiry_date', '>=', now());
            });

        if ($patientId) {
            $query->where(function($q) use ($patientId) {
                $q->whereNull('patient_id')
                  ->orWhere('patient_id', $patientId);
            })->orderByRaw('CASE WHEN patient_id = ? THEN 0 ELSE 1 END', [$patientId]);
        } else {
            $query->whereNull('patient_id');
        }

        return $query->orderBy('discount_percentage', 'desc')->first();
    }

    public function calculateDiscountedPrice(float $originalPrice, float $discountPercentage): float
    {
        if ($discountPercentage <= 0 || $discountPercentage > 100) {
            return $originalPrice;
        }

        $discountAmount = ($originalPrice * $discountPercentage) / 100;
        return $originalPrice - $discountAmount;
    }

    public function getProductDiscountInfo(Product $product, int $patientId = null): array
    {
        $hasDiscounts = $product->has_discounts ?? false;
        
        if (!$hasDiscounts) {
            return [
                'has_discounts' => false,
                'best_discount' => null,
                'original_price' => $product->price,
                'discounted_price' => $product->price,
                'savings' => 0
            ];
        }

        $bestDiscount = $this->getBestDiscount($product->id, $patientId);
        
        if (!$bestDiscount) {
            return [
                'has_discounts' => true,
                'best_discount' => null,
                'original_price' => $product->price,
                'discounted_price' => $product->price,
                'savings' => 0
            ];
        }

        $discountedPrice = $this->calculateDiscountedPrice($product->price, $bestDiscount->discount_percentage);
        $savings = $product->price - $discountedPrice;

        return [
            'has_discounts' => true,
            'best_discount' => [
                'id' => $bestDiscount->id,
                'discount_percentage' => $bestDiscount->discount_percentage,
                'expiry_date' => $bestDiscount->expiry_date,
                'is_patient_specific' => !is_null($bestDiscount->patient_id)
            ],
            'original_price' => $product->price,
            'discounted_price' => $discountedPrice,
            'savings' => $savings
        ];
    }

    public function getActiveDiscountsForProduct(Product $product): array
    {
        $discounts = DiscountRequest::where('product_id', $product->id)
            ->where('status', 'approved')
            ->where(function($q) {
                $q->whereNull('expiry_date')
                  ->orWhere('expiry_date', '>=', now());
            })
            ->with('patient:id,first_name,last_name')
            ->orderBy('discount_percentage', 'desc')
            ->get();

        return $discounts->map(function($discount) {
            return [
                'id' => $discount->id,
                'discount_percentage' => $discount->discount_percentage,
                'expiry_date' => $discount->expiry_date,
                'patient' => $discount->patient ? [
                    'id' => $discount->patient->id,
                    'name' => $discount->patient->first_name . ' ' . $discount->patient->last_name
                ] : null,
                'is_general' => is_null($discount->patient_id)
            ];
        })->toArray();
    }

    public function validateDiscountApplication(int $productId, int $discountId, int $patientId = null): bool
    {
        $discount = DiscountRequest::where('id', $discountId)
            ->where('product_id', $productId)
            ->where('status', 'approved')
            ->first();

        if (!$discount) {
            return false;
        }

        if ($discount->expiry_date && $discount->expiry_date < now()) {
            return false;
        }

        if ($discount->patient_id && $discount->patient_id !== $patientId) {
            return false;
        }

        return true;
    }

    public function applyDiscountToPrice(float $price, int $productId, int $patientId = null): array
    {
        $bestDiscount = $this->getBestDiscount($productId, $patientId);
        
        if (!$bestDiscount) {
            return [
                'original_price' => $price,
                'discounted_price' => $price,
                'discount_applied' => false,
                'discount_percentage' => 0,
                'savings' => 0
            ];
        }

        $discountedPrice = $this->calculateDiscountedPrice($price, $bestDiscount->discount_percentage);
        
        return [
            'original_price' => $price,
            'discounted_price' => $discountedPrice,
            'discount_applied' => true,
            'discount_percentage' => $bestDiscount->discount_percentage,
            'savings' => $price - $discountedPrice,
            'discount_id' => $bestDiscount->id
        ];
    }
} 