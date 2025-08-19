<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePrescriptionsTable extends Migration
{
    public function up()
    {
        Schema::create('prescriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appointment_id')->constrained('appointments');
            $table->date('date');
            $table->string('document');
            $table->string('patient_name');
            // Right eye (OD)
            $table->string('right_sphere')->nullable();
            $table->string('right_cylinder')->nullable();
            $table->string('right_axis')->nullable();
            $table->string('right_addition')->nullable();
            $table->string('right_height')->nullable();
            $table->string('right_distance_p')->nullable();
            $table->string('right_visual_acuity_far')->nullable();
            $table->string('right_visual_acuity_near')->nullable();
            // Left eye (OI)
            $table->string('left_sphere')->nullable();
            $table->string('left_cylinder')->nullable();
            $table->string('left_axis')->nullable();
            $table->string('left_addition')->nullable();
            $table->string('left_height')->nullable();
            $table->string('left_distance_p')->nullable();
            $table->string('left_visual_acuity_far')->nullable();
            $table->string('left_visual_acuity_near')->nullable();
            $table->string('correction_type')->nullable();
            $table->string('usage_type')->nullable();
            $table->string('recommendation')->nullable();
            $table->string('professional')->nullable();
            $table->text('observation')->nullable();
            $table->string('attachment')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('prescriptions');
    }
} 