<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateQuoteItemsTable extends Migration
{
    public function up(): void
    {
        Schema::create('quote_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quote_id')->constrained('quotes')->onDelete('cascade');
            $table->unsignedBigInteger('product_id');
            $table->string('product_type'); // Polymorphic type for morphTo relationship
            
            $table->string('name'); // Denormalized product name/identifier
            $table->text('description')->nullable(); // Denormalized product description
            
            $table->integer('quantity');
            $table->decimal('price', 10, 2); // Unit price for the item (after product-level discount, before item-level discount)
            $table->decimal('original_price', 10, 2)->nullable(); // Original unit price before any discounts
            
            $table->decimal('discount_percentage', 5, 2)->nullable(); // Item-specific discount percentage
            $table->decimal('discount_amount', 10, 2)->default(0.00); 
            
            $table->decimal('total', 10, 2); // Final total for this line item
            
            $table->text('notes')->nullable();
            $table->foreignId('discount_id')->nullable()->constrained('discount_requests')->onDelete('set null');

            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quote_items');
    }
}; 