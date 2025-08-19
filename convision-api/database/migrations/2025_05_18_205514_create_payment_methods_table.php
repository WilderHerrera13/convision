<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class CreatePaymentMethodsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->text('description')->nullable();
            $table->string('icon')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('requires_reference')->default(false);
            $table->timestamps();
        });

        // Insert default payment methods
        DB::table('payment_methods')->insert([
            ['name' => 'Cash', 'code' => 'cash', 'description' => 'Cash payment', 'requires_reference' => false, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Credit Card', 'code' => 'credit_card', 'description' => 'Credit card payment', 'requires_reference' => true, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Debit Card', 'code' => 'debit_card', 'description' => 'Debit card payment', 'requires_reference' => true, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Bank Transfer', 'code' => 'bank_transfer', 'description' => 'Bank transfer payment', 'requires_reference' => true, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Check', 'code' => 'check', 'description' => 'Check payment', 'requires_reference' => true, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('payment_methods');
    }
}
