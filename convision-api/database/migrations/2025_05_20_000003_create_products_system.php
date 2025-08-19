<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateProductsSystem extends Migration
{
    public function up()
    {
        Schema::create('lens_types', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        Schema::create('product_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('icon')->nullable();
            $table->json('required_attributes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('internal_code')->unique();
            $table->string('identifier');
            $table->foreignId('product_category_id')->constrained('product_categories');
            $table->foreignId('brand_id')->constrained('brands');
            $table->foreignId('supplier_id')->constrained('suppliers');
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2);
            $table->decimal('cost', 10, 2);
            $table->enum('status', ['enabled', 'disabled'])->default('enabled');
            $table->timestamps();
            
            $table->index(['product_category_id', 'status']);
            $table->index(['brand_id']);
            $table->index(['internal_code']);
        });

        Schema::create('product_lens_attributes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->foreignId('lens_type_id')->constrained('lens_types');
            $table->foreignId('material_id')->constrained('materials');
            $table->foreignId('lens_class_id')->constrained('lens_classes');
            $table->foreignId('treatment_id')->nullable()->constrained('treatments');
            $table->foreignId('photochromic_id')->nullable()->constrained('photochromics');
            $table->decimal('sphere_min', 5, 2)->nullable();
            $table->decimal('sphere_max', 5, 2)->nullable();
            $table->decimal('cylinder_min', 5, 2)->nullable();
            $table->decimal('cylinder_max', 5, 2)->nullable();
            $table->decimal('addition_min', 5, 2)->nullable();
            $table->decimal('addition_max', 5, 2)->nullable();
            $table->timestamps();
            
            $table->unique('product_id');
        });

        Schema::create('product_frame_attributes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->string('frame_type')->nullable();
            $table->string('material_frame')->nullable();
            $table->string('gender')->nullable();
            $table->decimal('lens_width', 5, 2)->nullable();
            $table->decimal('bridge_width', 5, 2)->nullable();
            $table->decimal('temple_length', 5, 2)->nullable();
            $table->string('color')->nullable();
            $table->string('shape')->nullable();
            $table->timestamps();
            
            $table->unique('product_id');
        });

        Schema::create('product_contact_lens_attributes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->string('contact_type');
            $table->string('replacement_schedule');
            $table->decimal('base_curve', 4, 2)->nullable();
            $table->decimal('diameter', 4, 2)->nullable();
            $table->string('material_contact')->nullable();
            $table->decimal('water_content', 5, 2)->nullable();
            $table->boolean('uv_protection')->default(false);
            $table->timestamps();
            
            $table->unique('product_id');
        });

        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products');
            $table->foreignId('warehouse_id')->constrained('warehouses');
            $table->foreignId('warehouse_location_id')->nullable()->constrained('warehouse_locations');
            $table->integer('quantity')->default(0);
            $table->enum('status', ['available', 'reserved', 'damaged'])->default('available');
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->index(['product_id', 'warehouse_id']);
            $table->index('status');
        });

        Schema::create('inventory_transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products');
            $table->foreignId('source_location_id')->constrained('warehouse_locations');
            $table->foreignId('destination_location_id')->constrained('warehouse_locations');
            $table->integer('quantity');
            $table->foreignId('transferred_by')->constrained('users');
            $table->text('notes')->nullable();
            $table->enum('status', ['pending', 'completed', 'cancelled'])->default('pending');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            
            $table->index(['product_id', 'status']);
        });

        Schema::create('discount_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->foreignId('product_id')->constrained('products');
            $table->foreignId('patient_id')->nullable()->constrained('patients');
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->decimal('discount_percentage', 5, 2);
            $table->decimal('original_price', 10, 2);
            $table->decimal('discounted_price', 10, 2);
            $table->text('reason')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->date('expiry_date')->nullable();
            $table->boolean('is_global')->default(false);
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['product_id', 'status']);
            $table->index(['patient_id', 'status']);
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders');
            $table->unsignedBigInteger('product_id');
            $table->string('product_type')->nullable();
            $table->integer('quantity');
            $table->decimal('price', 10, 2);
            $table->decimal('discount', 10, 2)->default(0);
            $table->decimal('total', 10, 2);
            $table->text('notes')->nullable();
            $table->string('name')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
            
            $table->index(['order_id', 'product_id']);
            $table->index(['product_id', 'product_type']);
        });

        Schema::create('notes', function (Blueprint $table) {
            $table->id();
            $table->morphs('notable');
            $table->foreignId('user_id')->constrained('users');
            $table->text('content');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('notes');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('discount_requests');
        Schema::dropIfExists('inventory_transfers');
        Schema::dropIfExists('inventory_items');
        Schema::dropIfExists('product_contact_lens_attributes');
        Schema::dropIfExists('product_frame_attributes');
        Schema::dropIfExists('product_lens_attributes');
        Schema::dropIfExists('products');
        Schema::dropIfExists('product_categories');
        Schema::dropIfExists('lens_types');
    }
} 