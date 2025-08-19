<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('sale_lens_price_adjustments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained()->onDelete('cascade');
            $table->foreignId('lens_id')->constrained('products')->onDelete('cascade');
            $table->decimal('base_price', 10, 2);
            $table->decimal('adjusted_price', 10, 2);
            $table->decimal('adjustment_amount', 10, 2);
            $table->text('reason')->nullable();
            $table->foreignId('adjusted_by')->constrained('users')->onDelete('restrict');
            $table->timestamps();
            
            $table->unique(['sale_id', 'lens_id']);
            $table->index(['sale_id']);
            $table->index(['lens_id']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('sale_lens_price_adjustments');
    }
};
