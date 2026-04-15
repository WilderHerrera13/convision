<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateCashRegisterCloseActualPaymentsTable extends Migration
{
    public function up()
    {
        Schema::create('cash_register_close_actual_payments', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('cash_register_close_id');
            $table->string('payment_method_name');
            $table->decimal('actual_amount', 15, 2)->default(0);
            $table->timestamps();

            $table->foreign('cash_register_close_id', 'crc_actual_payments_close_fk')
                ->references('id')
                ->on('cash_register_closes')
                ->onDelete('cascade');
            $table->unique(['cash_register_close_id', 'payment_method_name'], 'crc_actual_payments_close_method_unique');
        });

        Schema::table('cash_register_closes', function (Blueprint $table) {
            $table->decimal('total_actual_amount', 15, 2)->nullable()->after('total_counted');
            $table->timestamp('admin_actuals_recorded_at')->nullable()->after('total_actual_amount');
        });
    }

    public function down()
    {
        Schema::table('cash_register_closes', function (Blueprint $table) {
            $table->dropColumn(['total_actual_amount', 'admin_actuals_recorded_at']);
        });
        Schema::dropIfExists('cash_register_close_actual_payments');
    }
}
