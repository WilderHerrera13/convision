<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * El valor “registrado en sistema” no lo ingresa el asesor: se elimina del modelo
 * hasta integrar un cálculo automático aparte.
 */
class RemoveRegisteredTotalsFromCashRegisterCloses extends Migration
{
    public function up()
    {
        Schema::table('cash_register_close_payments', function (Blueprint $table) {
            $table->dropColumn(['registered_amount', 'difference']);
        });

        Schema::table('cash_register_closes', function (Blueprint $table) {
            $table->dropColumn(['total_registered', 'total_difference']);
        });
    }

    public function down()
    {
        Schema::table('cash_register_closes', function (Blueprint $table) {
            $table->decimal('total_registered', 15, 2)->default(0);
            $table->decimal('total_difference', 15, 2)->default(0);
        });

        Schema::table('cash_register_close_payments', function (Blueprint $table) {
            $table->decimal('registered_amount', 15, 2)->default(0);
            $table->decimal('difference', 15, 2)->default(0);
        });
    }
}
