<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoPatientsSeeder extends Seeder
{
    /**
     * 15 pacientes colombianos de demo con datos realistas para una óptica.
     * Cubre distintas ciudades, EPS, rangos de edad y diagnósticos comunes.
     */
    public function run(): void
    {
        // ── IDs de referencia ────────────────────────────────────────────
        $ccId    = DB::table('identification_types')->where('code', 'cedula_ciudadania')->value('id');
        $tiId    = DB::table('identification_types')->where('code', 'tarjeta_identidad')->value('id');
        $pasId   = DB::table('identification_types')->where('code', 'pasaporte')->value('id');

        $colId   = DB::table('countries')->where('name', 'Colombia')->value('id');
        $cundId  = DB::table('departments')->where('name', 'Cundinamarca')->value('id');
        $antId   = DB::table('departments')->where('name', 'Antioquia')->value('id');
        $valId   = DB::table('departments')->where('name', 'Valle del Cauca')->value('id');
        $sanId   = DB::table('departments')->where('name', 'Santander')->value('id');
        $atlId   = DB::table('departments')->where('name', 'Atlántico')->value('id');

        $bogId   = DB::table('cities')->where('name', 'Bogotá D.C.')->where('department_id', $cundId)->value('id');
        $medId   = DB::table('cities')->where('name', 'Medellín')->where('department_id', $antId)->value('id');
        $caliId  = DB::table('cities')->where('name', 'Cali')->where('department_id', $valId)->value('id');
        $bucarId = DB::table('cities')->where('name', 'Bucaramanga')->where('department_id', $sanId)->value('id');
        $barranId = DB::table('cities')->where('name', 'Barranquilla')->where('department_id', $atlId)->value('id');

        // Fallback a Bogotá si alguna ciudad no existe en el seed de ciudades
        $bogId    = $bogId    ?: DB::table('cities')->first()?->id;
        $medId    = $medId    ?: $bogId;
        $caliId   = $caliId   ?: $bogId;
        $bucarId  = $bucarId  ?: $bogId;
        $barranId = $barranId ?: $bogId;

        $eps = [
            'sura'    => DB::table('health_insurance_providers')->where('name', 'Sura EPS')->value('id'),
            'sanitas' => DB::table('health_insurance_providers')->where('name', 'Sanitas EPS')->value('id'),
            'nueva'   => DB::table('health_insurance_providers')->where('name', 'Nueva EPS')->value('id'),
            'famisanar'=> DB::table('health_insurance_providers')->where('name', 'Famisanar EPS')->value('id'),
            'coosalud'=> DB::table('health_insurance_providers')->where('name', 'Coosalud EPS')->value('id'),
        ];

        $cotizante   = DB::table('affiliation_types')->where('name', 'Cotizante')->value('id');
        $beneficiario = DB::table('affiliation_types')->where('name', 'Beneficiario')->value('id');
        $pensionado   = DB::table('affiliation_types')->where('name', 'Pensionado')->value('id');

        $pos          = DB::table('coverage_types')->where('name', 'POS')->value('id');
        $prepagada    = DB::table('coverage_types')->where('name', 'Medicina Prepagada')->value('id');
        $complementario = DB::table('coverage_types')->where('name', 'Plan Complementario')->value('id');

        $pregrado     = DB::table('education_levels')->where('name', 'Pregrado')->value('id');
        $bachillerato = DB::table('education_levels')->where('name', 'Bachillerato')->value('id');
        $posgrado     = DB::table('education_levels')->where('name', 'Posgrado')->value('id');
        $primaria     = DB::table('education_levels')->where('name', 'Primaria')->value('id');

        $patients = [
            // 1 ─ Bogotá, joven universitaria
            [
                'first_name'          => 'Natalia',
                'last_name'           => 'Suárez Bernal',
                'identification'      => '1016095432',
                'identification_type_id' => $ccId,
                'email'               => 'natalia.suarez@gmail.com',
                'phone'               => '3214567891',
                'birth_date'          => '2001-04-18',
                'gender'              => 'female',
                'address'             => 'Calle 53 # 14-25 Apto 401',
                'neighborhood'        => 'La Soledad',
                'postal_code'         => '111311',
                'country_id'          => $colId,
                'department_id'       => $cundId,
                'city_id'             => $bogId,
                'health_insurance_id' => $eps['sura'],
                'affiliation_type_id' => $beneficiario,
                'coverage_type_id'    => $pos,
                'occupation'          => 'Estudiante',
                'position'            => 'Estudiante Universitaria',
                'company'             => 'Universidad de los Andes',
                'education_level_id'  => $pregrado,
                'notes'               => 'Miopía leve (-1.50). Primer par de gafas. Prefiere armazones delgadas.',
                'status'              => 'active',
            ],
            // 2 ─ Bogotá, profesional TI
            [
                'first_name'          => 'Sebastián',
                'last_name'           => 'Ríos Castellanos',
                'identification'      => '1020478963',
                'identification_type_id' => $ccId,
                'email'               => 'srios.it@outlook.com',
                'phone'               => '3107896541',
                'birth_date'          => '1993-08-24',
                'gender'              => 'male',
                'address'             => 'Carrera 9 # 71-33 Of. 502',
                'neighborhood'        => 'Chapinero',
                'postal_code'         => '110231',
                'country_id'          => $colId,
                'department_id'       => $cundId,
                'city_id'             => $bogId,
                'health_insurance_id' => $eps['sanitas'],
                'affiliation_type_id' => $cotizante,
                'coverage_type_id'    => $prepagada,
                'occupation'          => 'Ingeniería de Software',
                'position'            => 'Tech Lead',
                'company'             => 'Rappi Colombia',
                'education_level_id'  => $pregrado,
                'notes'               => 'Astigmatismo mixto. Fatiga visual por pantallas. Interesado en lentes Blue Light.',
                'status'              => 'active',
            ],
            // 3 ─ Bogotá, adulto mayor pensionado
            [
                'first_name'          => 'Álvaro',
                'last_name'           => 'Jiménez Pedraza',
                'identification'      => '19456789',
                'identification_type_id' => $ccId,
                'email'               => 'alvaro.jimenez55@hotmail.com',
                'phone'               => '3003219876',
                'birth_date'          => '1955-11-30',
                'gender'              => 'male',
                'address'             => 'Avenida 19 # 103-45 Casa 7',
                'neighborhood'        => 'Niza',
                'postal_code'         => '111166',
                'country_id'          => $colId,
                'department_id'       => $cundId,
                'city_id'             => $bogId,
                'health_insurance_id' => $eps['nueva'],
                'affiliation_type_id' => $pensionado,
                'coverage_type_id'    => $pos,
                'occupation'          => 'Pensionado',
                'position'            => 'Jubilado',
                'company'             => '',
                'education_level_id'  => $bachillerato,
                'notes'               => 'Presbicia avanzada. Usa lentes progresivos hace 10 años. Hipertensión controlada.',
                'status'              => 'active',
            ],
            // 4 ─ Medellín, diseñadora
            [
                'first_name'          => 'Isabella',
                'last_name'           => 'Arroyave Vélez',
                'identification'      => '1036521478',
                'identification_type_id' => $ccId,
                'email'               => 'isabella.arroyave@yahoo.com',
                'phone'               => '3127894563',
                'birth_date'          => '1990-02-14',
                'gender'              => 'female',
                'address'             => 'Calle 10 Sur # 43A-150 Apto 802',
                'neighborhood'        => 'El Poblado',
                'postal_code'         => '050021',
                'country_id'          => $colId,
                'department_id'       => $antId,
                'city_id'             => $medId,
                'health_insurance_id' => $eps['sura'],
                'affiliation_type_id' => $cotizante,
                'coverage_type_id'    => $complementario,
                'occupation'          => 'Diseño Gráfico',
                'position'            => 'Directora Creativa',
                'company'             => 'Agencia Nexo',
                'education_level_id'  => $pregrado,
                'notes'               => 'Hipermetropía +2.00. Lentes de contacto blandas. Alergia a conservantes en soluciones.',
                'status'              => 'active',
            ],
            // 5 ─ Medellín, niño (con tutor)
            [
                'first_name'          => 'Mateo',
                'last_name'           => 'García Lopera',
                'identification'      => '11223344',
                'identification_type_id' => $tiId ?: $ccId,
                'email'               => 'familia.garcia.medellin@gmail.com',
                'phone'               => '3186541234',
                'birth_date'          => '2015-07-09',
                'gender'              => 'male',
                'address'             => 'Carrera 65 # 48-20 Casa',
                'neighborhood'        => 'Laureles',
                'postal_code'         => '050034',
                'country_id'          => $colId,
                'department_id'       => $antId,
                'city_id'             => $medId,
                'health_insurance_id' => $eps['sura'],
                'affiliation_type_id' => $beneficiario,
                'coverage_type_id'    => $pos,
                'occupation'          => 'Estudiante',
                'position'            => 'Estudiante Primaria',
                'company'             => 'Colegio San José',
                'education_level_id'  => $primaria,
                'notes'               => 'Miopía progresiva. Primer control anual. Tutor: Carmen Lopera (madre). Tel: 3196541234.',
                'status'              => 'active',
            ],
            // 6 ─ Cali, médica internista
            [
                'first_name'          => 'Patricia',
                'last_name'           => 'Salcedo Mina',
                'identification'      => '31789654',
                'identification_type_id' => $ccId,
                'email'               => 'dra.salcedo@clinicareina.com.co',
                'phone'               => '3144521369',
                'birth_date'          => '1978-05-22',
                'gender'              => 'female',
                'address'             => 'Avenida 6N # 23-45 Apto 301',
                'neighborhood'        => 'Granada',
                'postal_code'         => '760042',
                'country_id'          => $colId,
                'department_id'       => $valId,
                'city_id'             => $caliId,
                'health_insurance_id' => $eps['famisanar'],
                'affiliation_type_id' => $cotizante,
                'coverage_type_id'    => $prepagada,
                'occupation'          => 'Medicina',
                'position'            => 'Internista',
                'company'             => 'Clínica Reina Isabel',
                'education_level_id'  => $posgrado,
                'notes'               => 'Astigmatismo -1.25. Usa lentes de contacto tóricas. Revisión semestral.',
                'status'              => 'active',
            ],
            // 7 ─ Cali, empleado logística
            [
                'first_name'          => 'Kevin Stiven',
                'last_name'           => 'Palacios Rentería',
                'identification'      => '1144332211',
                'identification_type_id' => $ccId,
                'email'               => 'kpalacios.cali@gmail.com',
                'phone'               => '3209874563',
                'birth_date'          => '1997-12-03',
                'gender'              => 'male',
                'address'             => 'Calle 72 # 1A-15',
                'neighborhood'        => 'Alameda',
                'postal_code'         => '760044',
                'country_id'          => $colId,
                'department_id'       => $valId,
                'city_id'             => $caliId,
                'health_insurance_id' => $eps['coosalud'],
                'affiliation_type_id' => $cotizante,
                'coverage_type_id'    => $pos,
                'occupation'          => 'Logística',
                'position'            => 'Auxiliar de Bodega',
                'company'             => 'Alpina Productos Alimenticios',
                'education_level_id'  => $bachillerato,
                'notes'               => 'Visión normal. Consulta preventiva. Interesado en gafas de sol con protección UV.',
                'status'              => 'active',
            ],
            // 8 ─ Bucaramanga, abogada
            [
                'first_name'          => 'Paola Andrea',
                'last_name'           => 'Cárdenas Villamizar',
                'identification'      => '63591234',
                'identification_type_id' => $ccId,
                'email'               => 'pcardenas.abogada@gmail.com',
                'phone'               => '3174561234',
                'birth_date'          => '1984-09-11',
                'gender'              => 'female',
                'address'             => 'Calle 35 # 26-45 Of. 204',
                'neighborhood'        => 'Cabecera del Llano',
                'postal_code'         => '680001',
                'country_id'          => $colId,
                'department_id'       => $sanId,
                'city_id'             => $bucarId,
                'health_insurance_id' => $eps['sanitas'],
                'affiliation_type_id' => $cotizante,
                'coverage_type_id'    => $complementario,
                'occupation'          => 'Derecho',
                'position'            => 'Abogada Senior',
                'company'             => 'Cardenas & Asociados',
                'education_level_id'  => $posgrado,
                'notes'               => 'Presbicia incipiente. Primera vez con lentes de lectura +1.25. Dolores de cabeza frecuentes.',
                'status'              => 'active',
            ],
            // 9 ─ Barranquilla, empresario
            [
                'first_name'          => 'Roberto Carlos',
                'last_name'           => 'Echeverría Blanco',
                'identification'      => '72456789',
                'identification_type_id' => $ccId,
                'email'               => 'recheverria@grupoatlantic.co',
                'phone'               => '3005671234',
                'birth_date'          => '1970-03-07',
                'gender'              => 'male',
                'address'             => 'Carrera 54 # 72-110',
                'neighborhood'        => 'El Prado',
                'postal_code'         => '080020',
                'country_id'          => $colId,
                'department_id'       => $atlId,
                'city_id'             => $barranId,
                'health_insurance_id' => $eps['sanitas'],
                'affiliation_type_id' => $cotizante,
                'coverage_type_id'    => $prepagada,
                'occupation'          => 'Empresarial',
                'position'            => 'Gerente General',
                'company'             => 'Grupo Atlantic S.A.',
                'education_level_id'  => $posgrado,
                'notes'               => 'Miopía -3.75 en ambos ojos. Lentes de alta definición. Diabetes tipo 2 controlada — revisión anual obligatoria.',
                'status'              => 'active',
            ],
            // 10 ─ Bogotá, profesora
            [
                'first_name'          => 'Gloria Estela',
                'last_name'           => 'Pinzón Mahecha',
                'identification'      => '39854321',
                'identification_type_id' => $ccId,
                'email'               => 'gpinzon.docente@gmail.com',
                'phone'               => '3118761234',
                'birth_date'          => '1968-01-25',
                'gender'              => 'female',
                'address'             => 'Transversal 17 # 120-34 Casa',
                'neighborhood'        => 'Cedritos',
                'postal_code'         => '111156',
                'country_id'          => $colId,
                'department_id'       => $cundId,
                'city_id'             => $bogId,
                'health_insurance_id' => $eps['nueva'],
                'affiliation_type_id' => $cotizante,
                'coverage_type_id'    => $pos,
                'occupation'          => 'Educación',
                'position'            => 'Docente',
                'company'             => 'Secretaría de Educación de Bogotá',
                'education_level_id'  => $posgrado,
                'notes'               => 'Presbicia +2.50. Lentes bifocales. Reseca los ojos — posible síndrome de ojo seco.',
                'status'              => 'active',
            ],
            // 11 ─ Bogotá, joven deportista
            [
                'first_name'          => 'Samuel',
                'last_name'           => 'Herrera Quintero',
                'identification'      => '1000456789',
                'identification_type_id' => $ccId,
                'email'               => 'samuel.herrera.bici@gmail.com',
                'phone'               => '3215439876',
                'birth_date'          => '2000-06-14',
                'gender'              => 'male',
                'address'             => 'Carrera 30 # 22-45',
                'neighborhood'        => 'Palermo',
                'postal_code'         => '111411',
                'country_id'          => $colId,
                'department_id'       => $cundId,
                'city_id'             => $bogId,
                'health_insurance_id' => $eps['sura'],
                'affiliation_type_id' => $cotizante,
                'coverage_type_id'    => $pos,
                'occupation'          => 'Deportes',
                'position'            => 'Ciclista Amateur',
                'company'             => '',
                'education_level_id'  => $pregrado,
                'notes'               => 'Miopía -2.00. Busca lentes envolventes para ciclismo. Prefiere lentes fotosensibles.',
                'status'              => 'active',
            ],
            // 12 ─ Medellín, ama de casa
            [
                'first_name'          => 'Adriana',
                'last_name'           => 'Betancur Cano',
                'identification'      => '43125678',
                'identification_type_id' => $ccId,
                'email'               => 'adriana.betancur@gmail.com',
                'phone'               => '3185432198',
                'birth_date'          => '1975-10-08',
                'gender'              => 'female',
                'address'             => 'Circular 1 # 70-12',
                'neighborhood'        => 'Estadio',
                'postal_code'         => '050036',
                'country_id'          => $colId,
                'department_id'       => $antId,
                'city_id'             => $medId,
                'health_insurance_id' => $eps['famisanar'],
                'affiliation_type_id' => $beneficiario,
                'coverage_type_id'    => $pos,
                'occupation'          => 'Hogar',
                'position'            => 'Ama de Casa',
                'company'             => '',
                'education_level_id'  => $bachillerato,
                'notes'               => 'Astigmatismo -0.75. Primer control. No tolera lentes de contacto.',
                'status'              => 'active',
            ],
            // 13 ─ Cali, ingeniero civil
            [
                'first_name'          => 'Mauricio',
                'last_name'           => 'Ospina Orozco',
                'identification'      => '94321654',
                'identification_type_id' => $ccId,
                'email'               => 'mospina.ing@gmail.com',
                'phone'               => '3163219874',
                'birth_date'          => '1982-07-17',
                'gender'              => 'male',
                'address'             => 'Calle 5 # 38A-10 Apto 302',
                'neighborhood'        => 'San Fernando',
                'postal_code'         => '760043',
                'country_id'          => $colId,
                'department_id'       => $valId,
                'city_id'             => $caliId,
                'health_insurance_id' => $eps['nueva'],
                'affiliation_type_id' => $cotizante,
                'coverage_type_id'    => $pos,
                'occupation'          => 'Ingeniería Civil',
                'position'            => 'Residente de Obra',
                'company'             => 'Constructora Ospina & Cía',
                'education_level_id'  => $pregrado,
                'notes'               => 'Miopía -4.50. Trabaja en campo — necesita gafas con protección UV y antireflex.',
                'status'              => 'active',
            ],
            // 14 ─ Bogotá, extranjer (pasaporte)
            [
                'first_name'          => 'Émilie',
                'last_name'           => 'Dupont Leblanc',
                'identification'      => 'YH789456',
                'identification_type_id' => $pasId ?: $ccId,
                'email'               => 'emilie.dupont@consulfrance.co',
                'phone'               => '3001234987',
                'birth_date'          => '1988-03-30',
                'gender'              => 'female',
                'address'             => 'Calle 102 # 14-37 Apto 601',
                'neighborhood'        => 'Chicó Norte',
                'postal_code'         => '110111',
                'country_id'          => $colId,
                'department_id'       => $cundId,
                'city_id'             => $bogId,
                'health_insurance_id' => $eps['sanitas'],
                'affiliation_type_id' => $cotizante,
                'coverage_type_id'    => $prepagada,
                'occupation'          => 'Diplomacia',
                'position'            => 'Attachée Cultural',
                'company'             => 'Embajada de Francia',
                'education_level_id'  => $posgrado,
                'notes'               => 'Hipermetropía +1.25. Prefiere marcas europeas. Habla francés y español.',
                'status'              => 'active',
            ],
            // 15 ─ Bogotá, adulto mayor
            [
                'first_name'          => 'Carmen Rosa',
                'last_name'           => 'Beltrán Uribe',
                'identification'      => '20456789',
                'identification_type_id' => $ccId,
                'email'               => 'carmen.beltran1948@hotmail.com',
                'phone'               => '3012349876',
                'birth_date'          => '1948-12-05',
                'gender'              => 'female',
                'address'             => 'Calle 127 # 6-22 Casa',
                'neighborhood'        => 'Santa Bárbara',
                'postal_code'         => '110121',
                'country_id'          => $colId,
                'department_id'       => $cundId,
                'city_id'             => $bogId,
                'health_insurance_id' => $eps['nueva'],
                'affiliation_type_id' => $pensionado,
                'coverage_type_id'    => $pos,
                'occupation'          => 'Pensionada',
                'position'            => 'Jubilada',
                'company'             => '',
                'education_level_id'  => $primaria,
                'notes'               => 'Cataratas iniciales en ojo derecho. Presbicia +3.00. Control cada 6 meses. Hipertensión.',
                'status'              => 'active',
            ],
        ];

        foreach ($patients as $data) {
            $exists = DB::table('patients')->where('identification', $data['identification'])->exists();

            if (!$exists) {
                DB::table('patients')->insert(array_merge($data, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ]));
                $this->command->info("Paciente creado: {$data['first_name']} {$data['last_name']}");
            } else {
                $this->command->info("Paciente ya existe: {$data['first_name']} {$data['last_name']}");
            }
        }

        $this->command->info('Siembra de pacientes demo completada.');
    }
}
