<?php

namespace App\Services;

use App\Models\ProductCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Http\Resources\V1\ProductCategory\ProductCategoryResource;

class ProductCategoryService
{
    public function getFilteredProductCategories(Request $request)
    {
        $query = ProductCategory::apiFilter($request);
        // Ensure is_active filtering is handled by apiFilter or add it here if necessary
        // Example: if ($request->has('is_active')) {
        //    $query->where('is_active', $request->boolean('is_active'));
        // }
        return $query->orderBy('name');
    }

    public function createProductCategory(array $validatedData): ProductCategory
    {
        DB::beginTransaction();
        try {
            $productCategory = ProductCategory::create($validatedData);
            DB::commit();
            return $productCategory;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating product category: ' . $e->getMessage(), [
                'validated_data' => $validatedData,
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    public function updateProductCategory(ProductCategory $productCategory, array $validatedData): ProductCategory
    {
        DB::beginTransaction();
        try {
            $productCategory->update($validatedData);
            DB::commit();
            return $productCategory->fresh();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating product category: ' . $e->getMessage(), [
                'product_category_id' => $productCategory->id,
                'validated_data' => $validatedData,
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    public function deleteProductCategory(ProductCategory $productCategory): bool
    {
        DB::beginTransaction();
        try {
            if ($productCategory->products()->exists()) {
                throw new \Exception('No se puede eliminar la categoría porque está siendo utilizada por productos.');
            }
            $productCategory->delete();
            DB::commit();
            return true;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting product category: ' . $e->getMessage(), [
                'product_category_id' => $productCategory->id,
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    public function getAllActiveCategories()
    {
        return ProductCategory::where('is_active', true)
            ->orderBy('name')
            ->get();
    }

    public function getCategoriesWithProductsCount()
    {
        return ProductCategory::withCount('products')
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(function($category) {
                return [
                    'id' => $category->id,
                    'name' => $category->name,
                    'slug' => $category->slug,
                    'icon' => $category->icon,
                    'products_count' => $category->products_count
                ];
            });
    }
} 