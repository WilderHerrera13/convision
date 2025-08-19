<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddBillingFieldsToAppointmentsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->boolean('is_billed')->default(false)->after('status');
            $table->timestamp('billed_at')->nullable()->after('is_billed');
            $table->foreignId('sale_id')->nullable()->after('billed_at')->constrained()->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropForeign(['sale_id']);
            $table->dropColumn(['is_billed', 'billed_at', 'sale_id']);
        });
    }
}
