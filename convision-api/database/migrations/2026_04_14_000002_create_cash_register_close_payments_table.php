<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateCashRegisterClosePaymentsTable extends Migration
{
    public function up()
    {
        Schema::create('cash_register_close_payments', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('cash_register_close_id');
            $table->string('payment_method_name');
            $table->decimal('registered_amount', 15, 2)->default(0);
            $table->decimal('counted_amount', 15, 2)->default(0);
            $table->decimal('difference', 15, 2)->default(0);
            $table->timestamps();

            $table->foreign('cash_register_close_id')
                ->references('id')
                ->on('cash_register_closes')
                ->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('cash_register_close_payments');
    }
}
