<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateCashCountDenominationsTable extends Migration
{
    public function up()
    {
        Schema::create('cash_count_denominations', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('cash_register_close_id');
            $table->integer('denomination');
            $table->integer('quantity')->default(0);
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->timestamps();

            $table->foreign('cash_register_close_id')
                ->references('id')
                ->on('cash_register_closes')
                ->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('cash_count_denominations');
    }
}
