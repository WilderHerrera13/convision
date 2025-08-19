<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('patients', function (Blueprint $table) {
            // Add foreign key columns only if they don't exist
            if (!Schema::hasColumn('patients', 'identification_type_id')) {
                $table->foreignId('identification_type_id')->nullable()->after('identification')->constrained('identification_types');
            }
            
            if (!Schema::hasColumn('patients', 'health_insurance_id')) {
                $table->foreignId('health_insurance_id')->nullable()->after('status')->constrained('health_insurance_providers');
            }
            
            if (!Schema::hasColumn('patients', 'affiliation_type_id')) {
                $table->foreignId('affiliation_type_id')->nullable()->after('health_insurance_id')->constrained('affiliation_types');
            }
            
            if (!Schema::hasColumn('patients', 'coverage_type_id')) {
                $table->foreignId('coverage_type_id')->nullable()->after('affiliation_type_id')->constrained('coverage_types');
            }
            
            if (!Schema::hasColumn('patients', 'education_level_id')) {
                $table->foreignId('education_level_id')->nullable()->after('coverage_type_id')->constrained('education_levels');
            }
            
            if (!Schema::hasColumn('patients', 'country_id')) {
                $table->foreignId('country_id')->nullable()->after('postal_code')->constrained('countries');
            }
            
            if (!Schema::hasColumn('patients', 'department_id')) {
                $table->foreignId('department_id')->nullable()->after('country_id')->constrained('departments');
            }
            
            if (!Schema::hasColumn('patients', 'city_id')) {
                $table->foreignId('city_id')->nullable()->after('department_id')->constrained('cities');
            }
            
            if (!Schema::hasColumn('patients', 'district_id')) {
                $table->foreignId('district_id')->nullable()->after('city_id')->constrained('districts');
            }
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('patients', function (Blueprint $table) {
            // Drop foreign key columns if they exist
            $columnsToCheck = [
                'identification_type_id', 'health_insurance_id', 'affiliation_type_id',
                'coverage_type_id', 'education_level_id', 'country_id',
                'department_id', 'city_id', 'district_id'
            ];

            foreach ($columnsToCheck as $column) {
                if (Schema::hasColumn('patients', $column)) {
                    $table->dropConstrainedForeignId($column);
                }
            }
        });
    }
};
