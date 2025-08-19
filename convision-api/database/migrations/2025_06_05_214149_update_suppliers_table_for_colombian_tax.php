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
    public function up(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            $table->enum('person_type', ['natural', 'juridica'])->default('natural')->after('legal_representative_id');
            $table->string('tax_responsibility')->nullable()->after('person_type');
            $table->enum('regime_type', ['simple', 'common'])->default('simple')->after('tax_responsibility');
            $table->string('document_type')->default('NIT')->after('regime_type');
            $table->string('commercial_name')->nullable()->after('document_type');
            $table->string('responsible_person')->nullable()->after('commercial_name');
            
            $table->dropColumn('city');
            $table->foreignId('city_id')->nullable()->constrained()->onDelete('set null')->after('email');
            
            $table->string('bank_name')->nullable()->after('website');
            $table->string('bank_account_type')->nullable()->after('bank_name');
            $table->string('bank_account_number')->nullable()->after('bank_account_type');
            $table->string('invima_registration')->nullable()->after('bank_account_number');
            $table->text('fiscal_responsibility')->nullable()->after('invima_registration');
            $table->boolean('is_self_withholding')->default(false)->after('fiscal_responsibility');
            $table->boolean('is_vat_agent')->default(false)->after('is_self_withholding');
            $table->boolean('is_great_contributor')->default(false)->after('is_vat_agent');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropColumn([
                'person_type',
                'tax_responsibility',
                'regime_type',
                'document_type',
                'commercial_name',
                'responsible_person',
                'city_id',
                'bank_name',
                'bank_account_type',
                'bank_account_number',
                'invima_registration',
                'fiscal_responsibility',
                'is_self_withholding',
                'is_vat_agent',
                'is_great_contributor'
            ]);
            
            $table->string('city')->nullable()->after('email');
        });
    }
};
