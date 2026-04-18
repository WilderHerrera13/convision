<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddRecepcionesDineroToDailyActivityReportsTable extends Migration
{
    public function up()
    {
        Schema::table('daily_activity_reports', function (Blueprint $table) {
            $table->json('recepciones_dinero')->nullable()->after('observations');
        });
    }

    public function down()
    {
        Schema::table('daily_activity_reports', function (Blueprint $table) {
            $table->dropColumn('recepciones_dinero');
        });
    }
}
