<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->text('left_eye_annotation_paths')->nullable()->after('status'); // Example: place after status column
            $table->string('left_eye_annotation_image')->nullable()->after('left_eye_annotation_paths');
            $table->text('right_eye_annotation_paths')->nullable()->after('left_eye_annotation_image');
            $table->string('right_eye_annotation_image')->nullable()->after('right_eye_annotation_paths');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn([
                'left_eye_annotation_paths',
                'left_eye_annotation_image',
                'right_eye_annotation_paths',
                'right_eye_annotation_image',
            ]);
        });
    }
};
