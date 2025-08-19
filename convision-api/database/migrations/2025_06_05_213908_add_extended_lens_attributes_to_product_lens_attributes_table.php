<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddExtendedLensAttributesToProductLensAttributesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('product_lens_attributes', function (Blueprint $table) {
            $table->decimal('diameter', 5, 2)->nullable()->after('addition_max');
            $table->decimal('base_curve', 5, 2)->nullable()->after('diameter');
            $table->decimal('prism', 5, 2)->nullable()->after('base_curve');
            $table->boolean('uv_protection')->default(false)->after('prism');
            $table->string('engraving')->nullable()->after('uv_protection');
            $table->string('availability')->default('in_stock')->after('engraving');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('product_lens_attributes', function (Blueprint $table) {
            $table->dropColumn([
                'diameter',
                'base_curve', 
                'prism',
                'uv_protection',
                'engraving',
                'availability'
            ]);
        });
    }
}
