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
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained()->onDelete('cascade');
            $table->string('invoice_number');
            $table->string('concept');
            $table->text('description')->nullable();
            $table->date('expense_date');
            $table->decimal('amount', 15, 2);
            $table->decimal('payment_amount', 15, 2)->default(0);
            $table->decimal('balance', 15, 2)->default(0);
            $table->boolean('tax_excluded')->default(false);
            $table->foreignId('payment_method_id')->nullable()->constrained()->onDelete('set null');
            $table->string('reference')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            $table->index('supplier_id');
            $table->index('expense_date');
            $table->index('payment_method_id');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
