<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddAdvisorNotesToCashRegisterClosesTable extends Migration
{
    public function up()
    {
        Schema::table('cash_register_closes', function (Blueprint $table) {
            $table->text('advisor_notes')->nullable()->after('admin_notes');
        });
    }

    public function down()
    {
        Schema::table('cash_register_closes', function (Blueprint $table) {
            $table->dropColumn('advisor_notes');
        });
    }
}
