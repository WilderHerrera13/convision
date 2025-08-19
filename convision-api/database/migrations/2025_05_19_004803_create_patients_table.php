<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePatientsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('patients', function (Blueprint $table) {
            $table->id();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('identification')->unique();
            $table->foreignId('identification_type_id')->nullable()->constrained('identification_types');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->date('birth_date')->nullable();
            $table->enum('gender', ['male', 'female', 'other'])->nullable();
            $table->string('address')->nullable();
            
            // Relaciones de ubicación
            $table->foreignId('country_id')->nullable()->constrained('countries');
            $table->foreignId('department_id')->nullable()->constrained('departments');
            $table->foreignId('city_id')->nullable()->constrained('cities');
            $table->foreignId('district_id')->nullable()->constrained('districts');
            $table->string('neighborhood')->nullable();
            $table->string('postal_code')->nullable();
            
            // Relaciones de salud
            $table->foreignId('health_insurance_id')->nullable()->constrained('health_insurance_providers');
            $table->foreignId('affiliation_type_id')->nullable()->constrained('affiliation_types');
            $table->foreignId('coverage_type_id')->nullable()->constrained('coverage_types');
            
            // Información adicional
            $table->string('occupation')->nullable();
            $table->foreignId('education_level_id')->nullable()->constrained('education_levels');
            $table->string('position')->nullable();
            $table->string('company')->nullable();
            $table->string('profile_image')->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('patients');
    }
} 