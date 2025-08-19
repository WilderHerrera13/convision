<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateClinicalEvolutionsTable extends Migration
{
    public function up()
    {
        Schema::create('clinical_evolutions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinical_history_id')->constrained('clinical_histories')->onDelete('cascade');
            $table->foreignId('appointment_id')->nullable()->constrained('appointments')->nullOnDelete();
            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('updated_by')->constrained('users');
            
            // Evolution data
            $table->date('evolution_date');
            $table->text('subjective'); // What patient reports
            $table->text('objective'); // Professional findings
            $table->text('assessment'); // Evaluation/diagnosis
            $table->text('plan'); // Treatment plan
            $table->text('recommendations')->nullable();
            
            // Visual acuity
            $table->string('right_far_vision')->nullable();
            $table->string('left_far_vision')->nullable();
            $table->string('right_near_vision')->nullable();
            $table->string('left_near_vision')->nullable();
            
            // Clinical measurements
            $table->string('right_eye_sphere')->nullable();
            $table->string('right_eye_cylinder')->nullable();
            $table->string('right_eye_axis')->nullable();
            $table->string('right_eye_visual_acuity')->nullable();
            $table->string('left_eye_sphere')->nullable();
            $table->string('left_eye_cylinder')->nullable();
            $table->string('left_eye_axis')->nullable();
            $table->string('left_eye_visual_acuity')->nullable();
            
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('clinical_evolutions');
    }
} 