<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddControlSeguimientoToDailyActivityReportsTable extends Migration
{
    public function up()
    {
        Schema::table('daily_activity_reports', function (Blueprint $table) {
            $table->integer('control_seguimiento')->default(0)->after('addi_realizados');
        });
    }

    public function down()
    {
        Schema::table('daily_activity_reports', function (Blueprint $table) {
            $table->dropColumn('control_seguimiento');
        });
    }
}
