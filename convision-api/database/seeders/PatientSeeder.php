<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PatientSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // Pacientes colombianos de prueba
        $patients = [
            [
                'first_name' => 'Carlos',
                'last_name' => 'Rodríguez Gómez',
                'identification' => '1020345678',
                'phone' => '3101234567',
                'email' => 'carlos.rodriguez@example.com',
                'birth_date' => Carbon::parse('1985-06-15'),
                'gender' => 'male',
                'address' => 'Calle 45 # 23-67, Apto 502',
                'neighborhood' => 'Chapinero Alto',
                'postal_code' => '110231',
                'occupation' => 'Ingeniero de Sistemas',
                'position' => 'Desarrollador Senior',
                'company' => 'TechSoft Colombia',
                'notes' => 'Paciente con antecedentes de miopía desde los 15 años.',
                'status' => 'active',
            ],
            [
                'first_name' => 'María',
                'last_name' => 'López Martínez',
                'identification' => '52456789',
                'phone' => '3157654321',
                'email' => 'maria.lopez@example.com',
                'birth_date' => Carbon::parse('1992-03-28'),
                'gender' => 'female',
                'address' => 'Carrera 78 # 45-23',
                'neighborhood' => 'Los Rosales',
                'postal_code' => '110111',
                'occupation' => 'Contadora',
                'position' => 'Jefe de Contabilidad',
                'company' => 'Financiera Nacional',
                'notes' => 'Paciente con astigmatismo y uso de lentes desde la adolescencia.',
                'status' => 'active',
            ],
            [
                'first_name' => 'Juan',
                'last_name' => 'Pérez Ramírez',
                'identification' => '79123456',
                'phone' => '3003456789',
                'email' => 'juan.perez@example.com',
                'birth_date' => Carbon::parse('1978-11-02'),
                'gender' => 'male',
                'address' => 'Avenida Suba # 145-67',
                'neighborhood' => 'Niza',
                'postal_code' => '111166',
                'occupation' => 'Médico',
                'position' => 'Especialista en Cardiología',
                'company' => 'Hospital San Rafael',
                'notes' => 'Paciente con hipermetropía. Usa lentes progresivos.',
                'status' => 'active',
            ],
            [
                'first_name' => 'Ana',
                'last_name' => 'Moreno García',
                'identification' => '1015789654',
                'phone' => '3209876543',
                'email' => 'ana.moreno@example.com',
                'birth_date' => Carbon::parse('1998-07-21'),
                'gender' => 'female',
                'address' => 'Diagonal 54 # 23-45',
                'neighborhood' => 'Cedritos',
                'postal_code' => '111156',
                'occupation' => 'Estudiante',
                'position' => 'Estudiante Universitaria',
                'company' => 'Universidad Nacional',
                'notes' => 'Primera consulta. Síntomas de fatiga visual al usar dispositivos electrónicos.',
                'status' => 'active',
            ],
        ];

        foreach ($patients as $patientData) {
            // Obtener IDs de referencia
            $identificationTypeId = DB::table('identification_types')
                ->where('code', 'cedula_ciudadania')
                ->value('id');
            
            $countryId = DB::table('countries')
                ->where('name', 'Colombia')
                ->value('id');
            
            $departmentId = DB::table('departments')
                ->where('name', 'Cundinamarca')
                ->value('id');
            
            $cityId = DB::table('cities')
                ->where('name', 'Bogotá D.C.')
                ->where('department_id', $departmentId)
                ->value('id');
            
            $districtId = DB::table('districts')
                ->where('name', 'Usaquén')
                ->where('city_id', $cityId)
                ->value('id');
            
            $healthInsuranceId = DB::table('health_insurance_providers')
                ->where('name', 'Sura EPS')
                ->value('id');
            
            $affiliationTypeId = DB::table('affiliation_types')
                ->where('name', 'Cotizante')
                ->value('id');
            
            $coverageTypeId = DB::table('coverage_types')
                ->where('name', 'Plan Complementario')
                ->value('id');
            
            $educationLevelId = DB::table('education_levels')
                ->where('name', 'Pregrado')
                ->value('id');

            // Agregar los IDs de referencia al conjunto de datos del paciente
            $patientData = array_merge($patientData, [
                'identification_type_id' => $identificationTypeId,
                'country_id' => $countryId,
                'department_id' => $departmentId,
                'city_id' => $cityId,
                'district_id' => $districtId,
                'health_insurance_id' => $healthInsuranceId,
                'affiliation_type_id' => $affiliationTypeId,
                'coverage_type_id' => $coverageTypeId,
                'education_level_id' => $educationLevelId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Verificar si el paciente ya existe
            $exists = DB::table('patients')
                ->where('identification', $patientData['identification'])
                ->exists();
            
            if (!$exists) {
                DB::table('patients')->insert($patientData);
                $this->command->info("Paciente creado: {$patientData['first_name']} {$patientData['last_name']}");
            } else {
                $this->command->info("Paciente ya existe: {$patientData['first_name']} {$patientData['last_name']}");
            }
        }

        $this->command->info('¡Sembrado de pacientes completado!');
    }
} 