<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateClinicalHistoriesTable extends Migration
{
    public function up()
    {
        Schema::create('clinical_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients')->onDelete('cascade');
            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('updated_by')->constrained('users');
            
            // Datos básicos
            $table->string('reason_for_consultation');
            $table->text('current_illness')->nullable();
            $table->text('personal_history')->nullable();
            $table->text('family_history')->nullable();
            $table->text('occupational_history')->nullable();
            
            // Antecedentes visuales
            $table->boolean('uses_optical_correction')->default(false);
            $table->string('optical_correction_type')->nullable();
            $table->text('last_control_detail')->nullable();
            $table->text('ophthalmological_diagnosis')->nullable();
            $table->text('eye_surgery')->nullable();
            $table->boolean('has_systemic_disease')->default(false);
            $table->text('systemic_disease_detail')->nullable();
            $table->text('medications')->nullable();
            $table->text('allergies')->nullable();
            
            // Agudeza visual
            $table->string('right_far_vision_no_correction')->nullable();
            $table->string('left_far_vision_no_correction')->nullable();
            $table->string('right_near_vision_no_correction')->nullable();
            $table->string('left_near_vision_no_correction')->nullable();
            $table->string('right_far_vision_with_correction')->nullable();
            $table->string('left_far_vision_with_correction')->nullable();
            $table->string('right_near_vision_with_correction')->nullable();
            $table->string('left_near_vision_with_correction')->nullable();
            
            // Examen externo
            $table->text('right_eye_external_exam')->nullable();
            $table->text('left_eye_external_exam')->nullable();
            
            // Oftalmoscopía
            $table->text('right_eye_ophthalmoscopy')->nullable();
            $table->text('left_eye_ophthalmoscopy')->nullable();
            
            // Keratometry
            $table->string('right_eye_horizontal_k')->nullable();
            $table->string('right_eye_vertical_k')->nullable();
            $table->string('left_eye_horizontal_k')->nullable();
            $table->string('left_eye_vertical_k')->nullable();
            
            // Refracción y Motilidad
            $table->text('refraction_technique')->nullable();
            $table->string('right_eye_static_sphere')->nullable();
            $table->string('right_eye_static_cylinder')->nullable();
            $table->string('right_eye_static_axis')->nullable();
            $table->string('right_eye_static_visual_acuity')->nullable();
            $table->string('left_eye_static_sphere')->nullable();
            $table->string('left_eye_static_cylinder')->nullable();
            $table->string('left_eye_static_axis')->nullable();
            $table->string('left_eye_static_visual_acuity')->nullable();
            
            $table->string('right_eye_subjective_sphere')->nullable();
            $table->string('right_eye_subjective_cylinder')->nullable();
            $table->string('right_eye_subjective_axis')->nullable();
            $table->string('right_eye_subjective_visual_acuity')->nullable();
            $table->string('left_eye_subjective_sphere')->nullable();
            $table->string('left_eye_subjective_cylinder')->nullable();
            $table->string('left_eye_subjective_axis')->nullable();
            $table->string('left_eye_subjective_visual_acuity')->nullable();
            
            // Diagnóstico y conducta
            $table->text('diagnostic')->nullable();
            $table->text('treatment_plan')->nullable();
            $table->text('observations')->nullable();
            
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('clinical_histories');
    }
} 