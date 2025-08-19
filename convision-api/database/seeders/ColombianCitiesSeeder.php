<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ColombianCitiesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // Mapa de departamentos a ciudades
        $citiesByDepartment = [
            'Amazonas' => ['Leticia', 'Puerto Nariño'],
            'Antioquia' => [
                'Medellín', 'Bello', 'Envigado', 'Itagüí', 'Rionegro', 'Sabaneta', 
                'Apartadó', 'Turbo', 'Caucasia', 'La Estrella'
            ],
            'Arauca' => ['Arauca', 'Saravena', 'Tame', 'Arauquita'],
            'Atlántico' => [
                'Barranquilla', 'Soledad', 'Malambo', 'Sabanalarga', 'Puerto Colombia', 
                'Galapa', 'Baranoa'
            ],
            'Bolívar' => [
                'Cartagena', 'Magangué', 'El Carmen de Bolívar', 'Turbaco', 'Arjona', 
                'San Juan Nepomuceno'
            ],
            'Boyacá' => [
                'Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá', 'Paipa', 'Villa de Leyva', 
                'Moniquirá', 'Puerto Boyacá'
            ],
            'Caldas' => [
                'Manizales', 'La Dorada', 'Chinchiná', 'Villamaría', 'Anserma', 
                'Aguadas', 'Riosucio'
            ],
            'Caquetá' => ['Florencia', 'San Vicente del Caguán', 'El Doncello', 'Belén de los Andaquíes'],
            'Casanare' => ['Yopal', 'Aguazul', 'Villanueva', 'Tauramena', 'Paz de Ariporo'],
            'Cauca' => [
                'Popayán', 'Santander de Quilichao', 'Puerto Tejada', 'Patía', 'Miranda', 
                'Piendamó', 'Timbío'
            ],
            'Cesar' => [
                'Valledupar', 'Aguachica', 'Agustín Codazzi', 'La Jagua de Ibirico', 
                'Bosconia', 'El Copey'
            ],
            'Chocó' => ['Quibdó', 'Istmina', 'Tadó', 'Bahía Solano', 'Acandí'],
            'Córdoba' => [
                'Montería', 'Lorica', 'Cereté', 'Planeta Rica', 'Sahagún', 'Montelíbano', 
                'Tierralta'
            ],
            'Cundinamarca' => [
                'Bogotá D.C.', 'Soacha', 'Facatativá', 'Zipaquirá', 'Chía', 'Mosquera', 'Madrid', 
                'Funza', 'Cajicá', 'Girardot', 'Fusagasugá', 'Cota'
            ],
            'Guainía' => ['Inírida'],
            'Guaviare' => ['San José del Guaviare', 'El Retorno', 'Calamar'],
            'Huila' => [
                'Neiva', 'Pitalito', 'Garzón', 'La Plata', 'Campoalegre', 'Palermo', 
                'Aipe', 'Rivera'
            ],
            'La Guajira' => [
                'Riohacha', 'Maicao', 'Uribia', 'Manaure', 'San Juan del Cesar', 
                'Fonseca', 'Villanueva'
            ],
            'Magdalena' => [
                'Santa Marta', 'Ciénaga', 'Fundación', 'Zona Bananera', 'El Banco', 
                'Plato', 'Pivijay'
            ],
            'Meta' => [
                'Villavicencio', 'Acacías', 'Granada', 'Puerto López', 'La Macarena', 
                'San Martín', 'Puerto Gaitán'
            ],
            'Nariño' => [
                'Pasto', 'Ipiales', 'Tumaco', 'La Unión', 'Túquerres', 'Sandoná', 
                'Samaniego'
            ],
            'Norte de Santander' => [
                'Cúcuta', 'Ocaña', 'Villa del Rosario', 'Los Patios', 'Pamplona', 
                'Tibú', 'El Zulia'
            ],
            'Putumayo' => [
                'Mocoa', 'Puerto Asís', 'Valle del Guamuez', 'Orito', 'Puerto Leguízamo'
            ],
            'Quindío' => [
                'Armenia', 'Calarcá', 'Montenegro', 'Quimbaya', 'La Tebaida', 
                'Circasia', 'Filandia'
            ],
            'Risaralda' => [
                'Pereira', 'Dosquebradas', 'Santa Rosa de Cabal', 'La Virginia', 
                'Belén de Umbría', 'Quinchía'
            ],
            'San Andrés y Providencia' => ['San Andrés', 'Providencia'],
            'Santander' => [
                'Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja', 
                'San Gil', 'Socorro', 'Málaga', 'Barbosa'
            ],
            'Sucre' => [
                'Sincelejo', 'Corozal', 'San Marcos', 'Tolú', 'San Onofre', 
                'Sampués', 'Sincé'
            ],
            'Tolima' => [
                'Ibagué', 'Espinal', 'Melgar', 'Líbano', 'Chaparral', 'Mariquita', 
                'Honda', 'Flandes', 'Fresno'
            ],
            'Valle del Cauca' => [
                'Cali', 'Buenaventura', 'Palmira', 'Tuluá', 'Yumbo', 'Jamundí', 
                'Buga', 'Cartago', 'Zarzal', 'Florida', 'Pradera', 'Candelaria'
            ],
            'Vaupés' => ['Mitú', 'Carurú'],
            'Vichada' => ['Puerto Carreño', 'La Primavera', 'Cumaribo']
        ];
        
        // Procesar cada departamento y sus ciudades
        foreach ($citiesByDepartment as $departmentName => $cities) {
            // Buscar ID del departamento
            $departmentId = DB::table('departments')
                ->where('name', $departmentName)
                ->value('id');
            
            if (!$departmentId) {
                $this->command->info("Departamento no encontrado: {$departmentName}");
                continue;
            }

            // Insertar ciudades si no existen ya
            foreach ($cities as $cityName) {
                // Verificar si la ciudad ya existe
                $exists = DB::table('cities')
                    ->where('name', $cityName)
                    ->where('department_id', $departmentId)
                    ->exists();
                
                if (!$exists) {
                    DB::table('cities')->insert([
                        'name' => $cityName,
                        'department_id' => $departmentId,
                        'is_active' => true,
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                    $this->command->info("Ciudad agregada: {$cityName} ({$departmentName})");
                } else {
                    $this->command->info("Ciudad ya existe: {$cityName} ({$departmentName})");
                }
            }
        }
        
        $this->command->info("¡Sembrado de ciudades colombianas completado!");
    }
}
