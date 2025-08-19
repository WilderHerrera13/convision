<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\ProductLensAttributes;
use App\Models\ProductFrameAttributes;
use App\Models\ProductContactLensAttributes;
use App\Models\InventoryItem;
use App\Models\DiscountRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;

class ProductService
{
    public function getAllProducts(array $filters = [], int $perPage = 15)
    {
        $query = Product::with(['category', 'brand', 'supplier', 'lensAttributes', 'frameAttributes', 'contactLensAttributes'])
            ->orderBy('created_at', 'desc');

        if (!empty($filters['category'])) {
            $query->whereHas('category', function($q) use ($filters) {
                $q->where('slug', $filters['category']);
            });
        }

        if (!empty($filters['brand_id'])) {
            $query->where('brand_id', $filters['brand_id']);
        }

        if (!empty($filters['supplier_id'])) {
            $query->where('supplier_id', $filters['supplier_id']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function($q) use ($search) {
                $q->where('internal_code', 'LIKE', "%{$search}%")
                  ->orWhere('identifier', 'LIKE', "%{$search}%")
                  ->orWhere('description', 'LIKE', "%{$search}%");
            });
        }

        return $query->apiFilter(request())->paginate($perPage);
    }

    public function getProductById(int $id)
    {
        return Product::with([
            'category', 
            'brand', 
            'supplier', 
            'lensAttributes.lensType', 
            'lensAttributes.material', 
            'lensAttributes.lensClass', 
            'lensAttributes.treatment', 
            'lensAttributes.photochromic',
            'frameAttributes', 
            'contactLensAttributes',
            'inventoryItems.warehouse',
            'inventoryItems.warehouseLocation',
            'discountRequests'
        ])->findOrFail($id);
    }

    public function getProductsByCategory(string $categorySlug, array $filters = [], int $perPage = 15)
    {
        $category = ProductCategory::where('slug', $categorySlug)->firstOrFail();
        
        $query = Product::where('product_category_id', $category->id)
            ->with([
                'category', 'brand', 'supplier', 
                'lensAttributes.lensType', 'lensAttributes.material', 'lensAttributes.lensClass', 
                'lensAttributes.treatment', 'lensAttributes.photochromic',
                'frameAttributes', 'contactLensAttributes'
            ]);

        $originalRequest = request(); // Store the original request

        // Apply category-specific filters
        if ($categorySlug === 'lens') {
            $this->applyLensFilters($query, $filters);
        } elseif ($categorySlug === 'frame') {
            $this->applyFrameFilters($query, $filters);
        } elseif ($categorySlug === 'contact_lens') {
            $this->applyContactLensFilters($query, $filters);
        }

        // Apply common filters
        if (!empty($filters['brand_id'])) {
            $query->where('brand_id', $filters['brand_id']);
        }

        if (!empty($filters['supplier_id'])) {
            $query->where('supplier_id', $filters['supplier_id']);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function($q) use ($search) {
                $q->where('internal_code', 'LIKE', "%{$search}%")
                  ->orWhere('identifier', 'LIKE', "%{$search}%")
                  ->orWhere('description', 'LIKE', "%{$search}%");
            });
        }

        // Prepare a sanitized request for ApiFilterable
        $apiFilterRequest = new Request();
        $allowedApiFilterParams = ['s_f', 's_v', 's_o', 'sort', 'status'];
        
        foreach ($allowedApiFilterParams as $param) {
            if ($originalRequest->has($param)) {
                $apiFilterRequest->query->set($param, $originalRequest->query($param));
            }
        }
        
        // If category is 'lens', ensure that lens-specific attributes are not passed to apiFilter
        // as direct parameters, as they are handled by applyLensFilters via whereHas.
        // ApiFilterable would try to apply them on the `products` table directly.
        // Other directIdFilters like brand_id, supplier_id are fine because they are actual
        // columns on the products table and are also handled before this call.
        // The s_f/s_v parameters are for general text search, handled by ApiFilterable.
        
        return $query->apiFilter($apiFilterRequest)->paginate($perPage);
    }

    public function createProduct(array $data)
    {
        try {
            DB::beginTransaction();

            $product = Product::create([
                'internal_code' => $data['internal_code'],
                'identifier' => $data['identifier'],
                'product_category_id' => $data['product_category_id'],
                'brand_id' => $data['brand_id'],
                'supplier_id' => $data['supplier_id'],
                'description' => $data['description'] ?? null,
                'price' => $data['price'],
                'cost' => $data['cost'],
                'status' => $data['status'] ?? 'enabled'
            ]);

            $this->createProductAttributes($product, $data);

            DB::commit();
            return $product->load(['category', 'brand', 'supplier', 'lensAttributes', 'frameAttributes', 'contactLensAttributes']);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating product: ' . $e->getMessage());
            throw $e;
        }
    }

    public function updateProduct(Product $product, array $data)
    {
        try {
            DB::beginTransaction();

            $product->update([
                'internal_code' => $data['internal_code'] ?? $product->internal_code,
                'identifier' => $data['identifier'] ?? $product->identifier,
                'product_category_id' => $data['product_category_id'] ?? $product->product_category_id,
                'brand_id' => $data['brand_id'] ?? $product->brand_id,
                'supplier_id' => $data['supplier_id'] ?? $product->supplier_id,
                'description' => $data['description'] ?? $product->description,
                'price' => $data['price'] ?? $product->price,
                'cost' => $data['cost'] ?? $product->cost,
                'status' => $data['status'] ?? $product->status
            ]);

            $this->updateProductAttributes($product, $data);

            DB::commit();
            return $product->fresh(['category', 'brand', 'supplier', 'lensAttributes', 'frameAttributes', 'contactLensAttributes']);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating product: ' . $e->getMessage());
            throw $e;
        }
    }

    public function deleteProduct(Product $product)
    {
        try {
            DB::beginTransaction();

            if ($product->inventoryItems()->count() > 0) {
                throw new \Exception('No se puede eliminar el producto porque tiene elementos en inventario');
            }

            if ($product->discountRequests()->where('status', 'approved')->count() > 0) {
                throw new \Exception('No se puede eliminar el producto porque tiene descuentos activos');
            }

            $product->delete();

            DB::commit();
            return true;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting product: ' . $e->getMessage());
            throw $e;
        }
    }

    public function getProductStock(Product $product)
    {
        return $product->inventoryItems()
            ->with(['warehouse', 'warehouseLocation'])
            ->get()
            ->groupBy('warehouse.name')
            ->map(function ($items) {
                return [
                    'total' => $items->sum('quantity'),
                    'locations' => $items->groupBy('warehouseLocation.name')
                        ->map(function ($locationItems) {
                            return [
                                'quantity' => $locationItems->sum('quantity'),
                                'status' => $locationItems->pluck('status')->unique()->values()
                            ];
                        })
                ];
            });
    }

    public function getProductDiscounts(Product $product)
    {
        return $product->discountRequests()
            ->where('status', 'approved')
            ->where(function($query) {
                $query->whereNull('expiry_date')
                    ->orWhere('expiry_date', '>=', now());
            })
            ->get();
    }

    public function getProductInventory(Product $product)
    {
        return $product->inventoryItems()
            ->with(['warehouse', 'warehouseLocation'])
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'warehouse' => [
                        'id' => $item->warehouse->id,
                        'name' => $item->warehouse->name,
                        'code' => $item->warehouse->code
                    ],
                    'location' => $item->warehouseLocation ? [
                        'id' => $item->warehouseLocation->id,
                        'name' => $item->warehouseLocation->name,
                        'code' => $item->warehouseLocation->code
                    ] : null,
                    'quantity' => $item->quantity,
                    'status' => $item->status,
                    'notes' => $item->notes
                ];
            });
    }

    public function getLensesByPrescriptionFilter(array $prescriptionData)
    {
        $query = Product::byCategory('lens')
            ->with([
                'category', 'brand', 'supplier', 
                'lensAttributes.lensType', 'lensAttributes.material', 
                'lensAttributes.lensClass', 'lensAttributes.treatment', 
                'lensAttributes.photochromic'
            ])
            ->whereHas('lensAttributes', function($q) use ($prescriptionData) {
                // Filter by sphere range
                if (isset($prescriptionData['sphere_od'])) {
                    $sphere = $prescriptionData['sphere_od'];
                    $q->where('sphere_min', '<=', $sphere)
                      ->where('sphere_max', '>=', $sphere);
                }

                // Filter by cylinder range
                if (isset($prescriptionData['cylinder_od'])) {
                    $cylinder = $prescriptionData['cylinder_od'];
                    $q->where('cylinder_min', '<=', $cylinder)
                      ->where('cylinder_max', '>=', $cylinder);
                }

                // Filter by addition range
                if (isset($prescriptionData['addition_od'])) {
                    $addition = $prescriptionData['addition_od'];
                    $q->where('addition_min', '<=', $addition)
                      ->where('addition_max', '>=', $addition);
                }
            });

        return $query->get();
    }

    private function applyLensFilters($query, array $filters)
    {
        if (!empty($filters['lens_type_id'])) {
            $query->whereHas('lensAttributes', function($q) use ($filters) {
                $q->where('lens_type_id', $filters['lens_type_id']);
            });
        }

        if (!empty($filters['material_id'])) {
            $query->whereHas('lensAttributes', function($q) use ($filters) {
                $q->where('material_id', $filters['material_id']);
            });
        }

        if (!empty($filters['lens_class_id'])) {
            $query->whereHas('lensAttributes', function($q) use ($filters) {
                $q->where('lens_class_id', $filters['lens_class_id']);
            });
        }

        if (!empty($filters['treatment_id'])) {
            $query->whereHas('lensAttributes', function($q) use ($filters) {
                $q->where('treatment_id', $filters['treatment_id']);
            });
        }

        if (!empty($filters['photochromic_id'])) {
            $query->whereHas('lensAttributes', function($q) use ($filters) {
                $q->where('photochromic_id', $filters['photochromic_id']);
            });
        }
    }

    private function applyFrameFilters($query, array $filters)
    {
        if (!empty($filters['frame_type'])) {
            $query->whereHas('frameAttributes', function($q) use ($filters) {
                $q->where('frame_type', 'LIKE', "%{$filters['frame_type']}%");
            });
        }

        if (!empty($filters['gender'])) {
            $query->whereHas('frameAttributes', function($q) use ($filters) {
                $q->where('gender', $filters['gender']);
            });
        }

        if (!empty($filters['color'])) {
            $query->whereHas('frameAttributes', function($q) use ($filters) {
                $q->where('color', 'LIKE', "%{$filters['color']}%");
            });
        }

        if (!empty($filters['shape'])) {
            $query->whereHas('frameAttributes', function($q) use ($filters) {
                $q->where('shape', 'LIKE', "%{$filters['shape']}%");
            });
        }
    }

    private function applyContactLensFilters($query, array $filters)
    {
        if (!empty($filters['contact_type'])) {
            $query->whereHas('contactLensAttributes', function($q) use ($filters) {
                $q->where('contact_type', $filters['contact_type']);
            });
        }

        if (!empty($filters['replacement_schedule'])) {
            $query->whereHas('contactLensAttributes', function($q) use ($filters) {
                $q->where('replacement_schedule', $filters['replacement_schedule']);
            });
        }
    }

    private function createProductAttributes(Product $product, array $data)
    {
        $category = $product->category;
        if (!$category) return;

        switch ($category->slug) {
            case 'lens':
                if (isset($data['lens_attributes'])) {
                    ProductLensAttributes::create(array_merge(
                        ['product_id' => $product->id],
                        $data['lens_attributes']
                    ));
                }
                break;

            case 'frame':
                if (isset($data['frame_attributes'])) {
                    ProductFrameAttributes::create(array_merge(
                        ['product_id' => $product->id],
                        $data['frame_attributes']
                    ));
                }
                break;

            case 'contact_lens':
                if (isset($data['contact_lens_attributes'])) {
                    ProductContactLensAttributes::create(array_merge(
                        ['product_id' => $product->id],
                        $data['contact_lens_attributes']
                    ));
                }
                break;
        }
    }

    private function updateProductAttributes(Product $product, array $data)
    {
        $category = $product->category;
        if (!$category) return;

        switch ($category->slug) {
            case 'lens':
                if (isset($data['lens_attributes'])) {
                    $product->lensAttributes()->updateOrCreate(
                        ['product_id' => $product->id],
                        $data['lens_attributes']
                    );
                }
                break;

            case 'frame':
                if (isset($data['frame_attributes'])) {
                    $product->frameAttributes()->updateOrCreate(
                        ['product_id' => $product->id],
                        $data['frame_attributes']
                    );
                }
                break;

            case 'contact_lens':
                if (isset($data['contact_lens_attributes'])) {
                    $product->contactLensAttributes()->updateOrCreate(
                        ['product_id' => $product->id],
                        $data['contact_lens_attributes']
                    );
                }
                break;
        }
    }

    public function getFilteredProducts(Request $request)
    {
        return Product::with(['category', 'brand', 'supplier', 'lensAttributes', 'frameAttributes', 'contactLensAttributes'])
            ->apiFilter($request);
    }

    public function findProduct(int $productId): Product
    {
        return Product::with(['category', 'brand', 'supplier', 'lensAttributes', 'frameAttributes', 'contactLensAttributes'])
            ->findOrFail($productId);
    }

    public function bulkUpdateStatus(array $productIds, string $status): int
    {
        DB::beginTransaction();
        try {
            $count = Product::whereIn('id', $productIds)
                ->update(['status' => $status]);
            
            DB::commit();
            Log::info('Bulk status update completed', [
                'product_ids' => $productIds,
                'status' => $status,
                'updated_count' => $count
            ]);
            
            return $count;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error in bulk status update: ' . $e->getMessage(), [
                'product_ids' => $productIds,
                'status' => $status,
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    public function searchProducts(string $query, ?string $category = null, int $limit = 20): Collection
    {
        $queryBuilder = Product::with(['category', 'brand', 'supplier'])
            ->where(function($q) use ($query) {
                $q->where('internal_code', 'LIKE', "%{$query}%")
                  ->orWhere('identifier', 'LIKE', "%{$query}%")
                  ->orWhere('description', 'LIKE', "%{$query}%");
            });

        if (!empty($category)) {
            $queryBuilder->whereHas('category', function($q) use ($category) {
                $q->where('slug', $category);
            });
        }

        return $queryBuilder->limit($limit)->get();
    }
} 