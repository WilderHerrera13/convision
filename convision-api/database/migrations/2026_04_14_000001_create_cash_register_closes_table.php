<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateCashRegisterClosesTable extends Migration
{
    public function up()
    {
        Schema::create('cash_register_closes', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('user_id');
            $table->date('close_date');
            $table->enum('status', ['draft', 'submitted', 'approved'])->default('draft');
            $table->decimal('total_registered', 15, 2)->default(0);
            $table->decimal('total_counted', 15, 2)->default(0);
            $table->decimal('total_difference', 15, 2)->default(0);
            $table->text('admin_notes')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users');
            $table->foreign('approved_by')->references('id')->on('users');
            $table->unique(['user_id', 'close_date']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('cash_register_closes');
    }
}
