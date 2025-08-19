<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class LocationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // Verificar que Colombia no exista ya para evitar duplicados
        $colombiaExists = DB::table('countries')->where('code', 'COL')->exists();
        
        if (!$colombiaExists) {
            // Agregar Colombia como país
            $colombiaId = DB::table('countries')->insertGetId([
                'name' => 'Colombia',
                'code' => 'COL',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ]);
            
            // Lista de departamentos colombianos
            $departments = [
                'Amazonas',
                'Antioquia',
                'Arauca',
                'Atlántico',
                'Bolívar',
                'Boyacá',
                'Caldas',
                'Caquetá',
                'Casanare',
                'Cauca',
                'Cesar',
                'Chocó',
                'Córdoba',
                'Cundinamarca',
                'Guainía',
                'Guaviare',
                'Huila',
                'La Guajira',
                'Magdalena',
                'Meta',
                'Nariño',
                'Norte de Santander',
                'Putumayo',
                'Quindío',
                'Risaralda',
                'San Andrés y Providencia',
                'Santander',
                'Sucre',
                'Tolima',
                'Valle del Cauca',
                'Vaupés',
                'Vichada'
            ];
            
            // Agregar los departamentos
            foreach ($departments as $department) {
                $departmentId = DB::table('departments')->insertGetId([
                    'name' => $department,
                    'country_id' => $colombiaId,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
                
                // Si es Cundinamarca, agregar Bogotá como ciudad
                if ($department === 'Cundinamarca') {
                    $bogotaId = DB::table('cities')->insertGetId([
                        'name' => 'Bogotá D.C.',
                        'department_id' => $departmentId,
                        'is_active' => true,
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                    
                    // Agregar algunos distritos de Bogotá
                    $bogotaDistricts = [
                        'Chapinero',
                        'Usaquén',
                        'Suba',
                        'Kennedy',
                        'Teusaquillo',
                        'Santa Fe',
                        'Fontibón',
                        'Engativá',
                        'Barrios Unidos',
                        'Puente Aranda'
                    ];
                    
                    foreach ($bogotaDistricts as $district) {
                        DB::table('districts')->insert([
                            'name' => $district,
                            'city_id' => $bogotaId,
                            'is_active' => true,
                            'created_at' => now(),
                            'updated_at' => now()
                        ]);
                    }
                }
                
                // Si es Antioquia, agregar Medellín
                if ($department === 'Antioquia') {
                    $medellinId = DB::table('cities')->insertGetId([
                        'name' => 'Medellín',
                        'department_id' => $departmentId,
                        'is_active' => true,
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                    
                    // Distritos de Medellín
                    $medellinDistricts = [
                        'El Poblado',
                        'Laureles',
                        'Belén',
                        'La Candelaria',
                        'Robledo',
                        'Envigado',
                        'Itagüí',
                        'Sabaneta'
                    ];
                    
                    foreach ($medellinDistricts as $district) {
                        DB::table('districts')->insert([
                            'name' => $district,
                            'city_id' => $medellinId,
                            'is_active' => true,
                            'created_at' => now(),
                            'updated_at' => now()
                        ]);
                    }
                }
            }
        }
    }
}
