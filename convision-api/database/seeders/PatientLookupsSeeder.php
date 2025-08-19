<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PatientLookupsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // Lista de EPS colombianas
        $epsList = [
            'Nueva EPS',
            'Sura EPS',
            'Sanitas EPS',
            'Compensar EPS',
            'Famisanar EPS',
            'Salud Total EPS',
            'Medimás EPS',
            'Coomeva EPS',
            'Aliansalud EPS',
            'Coosalud EPS',
            'Comfenalco Valle EPS',
            'SOS EPS',
            'Emssanar EPS',
            'Mutual Ser EPS',
            'Asmet Salud EPS',
            'Capital Salud EPS',
            'Cajacopi EPS',
            'Comfachocó EPS',
            'Comfaoriente EPS',
            'Ecoopsos EPS'
        ];

        // Insertar EPS
        foreach ($epsList as $eps) {
            if (!DB::table('health_insurance_providers')->where('name', $eps)->exists()) {
                DB::table('health_insurance_providers')->insert([
                    'name' => $eps,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // Tipos de identificación colombianos
        $idTypes = [
            ['name' => 'Cédula de Ciudadanía', 'code' => 'cedula_ciudadania'],
            ['name' => 'Tarjeta de Identidad', 'code' => 'tarjeta_identidad'],
            ['name' => 'Cédula de Extranjería', 'code' => 'cedula_extranjeria'],
            ['name' => 'Pasaporte', 'code' => 'pasaporte'],
            ['name' => 'Permiso Especial de Permanencia', 'code' => 'pep'],
            ['name' => 'NIT', 'code' => 'nit'],
            ['name' => 'Registro Civil', 'code' => 'registro_civil']
        ];

        // Insertar tipos de identificación
        foreach ($idTypes as $type) {
            if (!DB::table('identification_types')->where('code', $type['code'])->exists()) {
                DB::table('identification_types')->insert([
                    'name' => $type['name'],
                    'code' => $type['code'],
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // Tipos de afiliación
        $affiliationTypes = [
            'Cotizante', 
            'Beneficiario', 
            'Adicional', 
            'Pensionado', 
            'Subsidiado'
        ];

        // Insertar tipos de afiliación
        foreach ($affiliationTypes as $type) {
            if (!DB::table('affiliation_types')->where('name', $type)->exists()) {
                DB::table('affiliation_types')->insert([
                    'name' => $type,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // Tipos de cobertura
        $coverageTypes = [
            'Plan Obligatorio de Salud (POS)', 
            'Plan Complementario', 
            'Medicina Prepagada', 
            'Póliza de Salud',
            'Régimen Subsidiado',
            'Régimen Contributivo',
            'Particular'
        ];

        // Insertar tipos de cobertura
        foreach ($coverageTypes as $type) {
            if (!DB::table('coverage_types')->where('name', $type)->exists()) {
                DB::table('coverage_types')->insert([
                    'name' => $type,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // Niveles educativos
        $educationLevels = [
            'Primaria',
            'Secundaria',
            'Técnico',
            'Tecnólogo',
            'Pregrado',
            'Especialización',
            'Maestría',
            'Doctorado',
            'Sin estudios'
        ];

        // Insertar niveles educativos
        foreach ($educationLevels as $level) {
            if (!DB::table('education_levels')->where('name', $level)->exists()) {
                DB::table('education_levels')->insert([
                    'name' => $level,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }
}
