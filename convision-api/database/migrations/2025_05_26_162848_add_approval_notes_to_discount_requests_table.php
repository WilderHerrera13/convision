<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddApprovalNotesToDiscountRequestsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up(): void
    {
        Schema::table('discount_requests', function (Blueprint $table) {
            $table->text('approval_notes')->nullable()->after('rejection_reason');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down(): void
    {
        Schema::table('discount_requests', function (Blueprint $table) {
            $table->dropColumn('approval_notes');
        });
    }
}
