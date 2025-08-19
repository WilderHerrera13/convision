<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddInvoiceFieldsToSuppliersTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // Crear la tabla suppliers si no existe
        if (!Schema::hasTable('suppliers')) {
            Schema::create('suppliers', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->timestamps();
            });
        }
        
        Schema::table('suppliers', function (Blueprint $table) {
            // Check if the fields don't already exist before adding them
            if (!Schema::hasColumn('suppliers', 'nit')) {
                $table->string('nit')->nullable();
            }
            
            if (!Schema::hasColumn('suppliers', 'legal_name')) {
                $table->string('legal_name')->nullable();
            }
            
            if (!Schema::hasColumn('suppliers', 'legal_representative')) {
                $table->string('legal_representative')->nullable();
            }
            
            if (!Schema::hasColumn('suppliers', 'legal_representative_id')) {
                $table->string('legal_representative_id')->nullable();
            }
            
            if (!Schema::hasColumn('suppliers', 'address')) {
                $table->string('address')->nullable();
            }
            
            if (!Schema::hasColumn('suppliers', 'phone')) {
                $table->string('phone')->nullable();
            }
            
            if (!Schema::hasColumn('suppliers', 'email')) {
                $table->string('email')->nullable();
            }
            
            if (!Schema::hasColumn('suppliers', 'city')) {
                $table->string('city')->nullable();
            }
            
            if (!Schema::hasColumn('suppliers', 'state')) {
                $table->string('state')->nullable();
            }
            
            if (!Schema::hasColumn('suppliers', 'country')) {
                $table->string('country')->nullable();
            }
            
            if (!Schema::hasColumn('suppliers', 'postal_code')) {
                $table->string('postal_code')->nullable();
            }
            
            if (!Schema::hasColumn('suppliers', 'website')) {
                $table->string('website')->nullable();
            }
            
            if (!Schema::hasColumn('suppliers', 'notes')) {
                $table->text('notes')->nullable();
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
        // Solo hacer drop de columnas si la tabla existe
        if (Schema::hasTable('suppliers')) {
            Schema::table('suppliers', function (Blueprint $table) {
                $table->dropColumn([
                    'nit',
                    'legal_name',
                    'legal_representative',
                    'legal_representative_id',
                    'address',
                    'phone',
                    'email',
                    'city',
                    'state',
                    'country',
                    'postal_code',
                    'website',
                    'notes',
                ]);
            });
        }
    }
} 