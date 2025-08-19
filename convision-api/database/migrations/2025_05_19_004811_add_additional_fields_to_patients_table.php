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
            // Only add columns that don't exist already
            if (!Schema::hasColumn('patients', 'country')) {
                $table->string('country')->nullable();
            }
            
            if (!Schema::hasColumn('patients', 'district')) {
                $table->string('district')->nullable();
            }
            
            if (!Schema::hasColumn('patients', 'neighborhood')) {
                $table->string('neighborhood')->nullable();
            }
            
            if (!Schema::hasColumn('patients', 'eps')) {
                $table->string('eps')->nullable()->comment('Health insurance provider');
            }
            
            if (!Schema::hasColumn('patients', 'affiliation')) {
                $table->string('affiliation')->nullable();
            }
            
            if (!Schema::hasColumn('patients', 'coverage')) {
                $table->string('coverage')->nullable();
            }
            
            if (!Schema::hasColumn('patients', 'occupation')) {
                $table->string('occupation')->nullable();
            }
            
            if (!Schema::hasColumn('patients', 'education')) {
                $table->string('education')->nullable();
            }
            
            if (!Schema::hasColumn('patients', 'position')) {
                $table->string('position')->nullable();
            }
            
            if (!Schema::hasColumn('patients', 'company')) {
                $table->string('company')->nullable();
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
            $columns = [
                'country',
                'district',
                'neighborhood',
                'eps',
                'affiliation',
                'coverage',
                'occupation',
                'education',
                'position',
                'company'
            ];
            
            // Eliminar solo las columnas que existen
            foreach ($columns as $column) {
                if (Schema::hasColumn('patients', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
}; 