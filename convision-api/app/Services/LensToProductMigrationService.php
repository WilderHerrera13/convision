<?php

namespace App\Services;

use App\Models\Lens;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\ProductLensAttributes;
use App\Models\DiscountRequest;
use App\Models\InventoryItem;
use App\Models\InventoryTransfer;
use App\Models\Note;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LensToProductMigrationService
{
    public function migrateAllLensesToProducts(): array
    {
        $stats = [
            'lenses_migrated' => 0,
            'attributes_created' => 0,
            'discount_requests_updated' => 0,
            'inventory_items_updated' => 0,
            'inventory_transfers_updated' => 0,
            'notes_updated' => 0,
            'errors' => []
        ];

        try {
            DB::beginTransaction();

            // Ensure lens category exists
            $lensCategory = $this->ensureLensCategoryExists();

            // Get all lenses to migrate
            $lenses = Lens::with([
                'brand', 'type', 'material', 'lensClass', 
                'treatment', 'photochromic', 'supplier'
            ])->get();

            Log::info("Starting migration of {$lenses->count()} lenses to products system");

            foreach ($lenses as $lens) {
                try {
                    $product = $this->migrateLensToProduct($lens, $lensCategory);
                    $this->migrateLensAttributes($lens, $product);
                    $this->updateRelatedRecords($lens, $product);
                    
                    $stats['lenses_migrated']++;
                    $stats['attributes_created']++;
                    
                    Log::info("Successfully migrated lens {$lens->id} to product {$product->id}");
                } catch (\Exception $e) {
                    $stats['errors'][] = "Error migrating lens {$lens->id}: " . $e->getMessage();
                    Log::error("Error migrating lens {$lens->id}: " . $e->getMessage());
                }
            }

            // Update related records
            $stats['discount_requests_updated'] = $this->updateDiscountRequests();
            $stats['inventory_items_updated'] = $this->updateInventoryItems();
            $stats['inventory_transfers_updated'] = $this->updateInventoryTransfers();
            $stats['notes_updated'] = $this->updateNotes();

            DB::commit();
            Log::info("Migration completed successfully", $stats);

        } catch (\Exception $e) {
            DB::rollBack();
            $stats['errors'][] = "Migration failed: " . $e->getMessage();
            Log::error("Migration failed: " . $e->getMessage());
            throw $e;
        }

        return $stats;
    }

    private function ensureLensCategoryExists(): ProductCategory
    {
        return ProductCategory::firstOrCreate(
            ['slug' => 'lens'],
            [
                'name' => 'Lentes',
                'description' => 'Lentes oftálmicos de diferentes tipos y materiales',
                'icon' => 'glasses',
                'required_attributes' => [
                    'lens_type_id', 'material_id', 'lens_class_id', 
                    'sphere_min', 'sphere_max', 'cylinder_min', 
                    'cylinder_max', 'addition_min', 'addition_max'
                ],
                'is_active' => true
            ]
        );
    }

    private function migrateLensToProduct(Lens $lens, ProductCategory $category): Product
    {
        // Check if product already exists with this internal_code
        $existingProduct = Product::where('internal_code', $lens->internal_code)->first();
        
        if ($existingProduct) {
            Log::warning("Product with internal_code {$lens->internal_code} already exists, updating...");
            
            $existingProduct->update([
                'identifier' => $lens->identifier,
                'product_category_id' => $category->id,
                'brand_id' => $lens->brand_id,
                'supplier_id' => $lens->supplier_id,
                'description' => $lens->description,
                'price' => $lens->price,
                'cost' => $lens->cost,
                'status' => $lens->status ?? 'enabled'
            ]);
            
            return $existingProduct;
        }

        return Product::create([
            'internal_code' => $lens->internal_code,
            'identifier' => $lens->identifier,
            'product_category_id' => $category->id,
            'brand_id' => $lens->brand_id,
            'supplier_id' => $lens->supplier_id,
            'description' => $lens->description,
            'price' => $lens->price,
            'cost' => $lens->cost,
            'status' => $lens->status ?? 'enabled'
        ]);
    }

    private function migrateLensAttributes(Lens $lens, Product $product): void
    {
        // Check if attributes already exist
        $existingAttributes = ProductLensAttributes::where('product_id', $product->id)->first();
        
        $attributeData = [
            'product_id' => $product->id,
            'lens_type_id' => $lens->type_id,
            'material_id' => $lens->material_id,
            'lens_class_id' => $lens->lens_class_id,
            'treatment_id' => $lens->treatment_id,
            'photochromic_id' => $lens->photochromic_id,
            'sphere_min' => $lens->sphere_min,
            'sphere_max' => $lens->sphere_max,
            'cylinder_min' => $lens->cylinder_min,
            'cylinder_max' => $lens->cylinder_max,
            'addition_min' => $lens->addition_min,
            'addition_max' => $lens->addition_max
        ];

        if ($existingAttributes) {
            $existingAttributes->update($attributeData);
        } else {
            ProductLensAttributes::create($attributeData);
        }
    }

    private function updateRelatedRecords(Lens $lens, Product $product): void
    {
        // Update any existing records that reference the lens to reference the product
        
        // Update discount requests
        DiscountRequest::where('lens_id', $lens->id)
            ->update(['product_id' => $product->id]);

        // Update inventory items
        InventoryItem::where('lens_id', $lens->id)
            ->update(['product_id' => $product->id]);

        // Update inventory transfers
        InventoryTransfer::where('lens_id', $lens->id)
            ->update(['product_id' => $product->id]);

        // Update polymorphic notes
        Note::where('notable_type', 'App\Models\Lens')
            ->where('notable_id', $lens->id)
            ->update([
                'notable_type' => 'App\Models\Product',
                'notable_id' => $product->id
            ]);
    }

    private function updateDiscountRequests(): int
    {
        return DB::table('discount_requests')
            ->whereNotNull('lens_id')
            ->whereNull('product_id')
            ->update([
                'product_id' => DB::raw('lens_id'),
                'updated_at' => now()
            ]);
    }

    private function updateInventoryItems(): int
    {
        return DB::table('inventory_items')
            ->whereNotNull('lens_id')
            ->whereNull('product_id')
            ->update([
                'product_id' => DB::raw('lens_id'),
                'updated_at' => now()
            ]);
    }

    private function updateInventoryTransfers(): int
    {
        return DB::table('inventory_transfers')
            ->whereNotNull('lens_id')
            ->whereNull('product_id')
            ->update([
                'product_id' => DB::raw('lens_id'),
                'updated_at' => now()
            ]);
    }

    private function updateNotes(): int
    {
        return Note::where('notable_type', 'App\Models\Lens')
            ->update(['notable_type' => 'App\Models\Product']);
    }

    public function createMissingProductCategories(): void
    {
        $categories = [
            [
                'name' => 'Lentes',
                'slug' => 'lens',
                'description' => 'Lentes oftálmicos de diferentes tipos y materiales',
                'icon' => 'glasses',
                'required_attributes' => [
                    'lens_type_id', 'material_id', 'lens_class_id'
                ]
            ],
            [
                'name' => 'Monturas',
                'slug' => 'frame',
                'description' => 'Monturas y armazones para lentes',
                'icon' => 'frame',
                'required_attributes' => [
                    'frame_type', 'material_frame', 'gender'
                ]
            ],
            [
                'name' => 'Lentes de Contacto',
                'slug' => 'contact_lens',
                'description' => 'Lentes de contacto blandos y rígidos',
                'icon' => 'contact',
                'required_attributes' => [
                    'contact_type', 'replacement_schedule', 'base_curve'
                ]
            ]
        ];

        foreach ($categories as $categoryData) {
            ProductCategory::firstOrCreate(
                ['slug' => $categoryData['slug']],
                array_merge($categoryData, [
                    'required_attributes' => json_encode($categoryData['required_attributes']),
                    'is_active' => true
                ])
            );
        }
    }
} 