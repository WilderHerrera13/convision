<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Supplier;

class SuppliersTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $suppliers = [
            [
                'name' => 'Essilor International',
                'nit' => '900123456-7',
                'legal_name' => 'Essilor International S.A.',
                'legal_representative' => 'Maria Rodriguez',
                'legal_representative_id' => '79123456',
                'address' => 'Calle 100 #15-20, Edificio Essilor',
                'phone' => '+57 601 456 7890',
                'email' => 'contacto@essilor.com.co',
                'postal_code' => '110111',
                'website' => 'https://www.essilor.com.co',
                'notes' => 'Proveedor principal de lentes oftálmicos',
            ],
            [
                'name' => 'Carl Zeiss Vision',
                'nit' => '900234567-8',
                'legal_name' => 'Carl Zeiss Vision Colombia S.A.S.',
                'legal_representative' => 'Carlos Sanchez',
                'legal_representative_id' => '80234567',
                'address' => 'Avenida El Dorado #85-75, Torre 2, Oficina 401',
                'phone' => '+57 601 678 9012',
                'email' => 'servicio@zeiss.com.co',
                'postal_code' => '110911',
                'website' => 'https://www.zeiss.com.co',
                'notes' => 'Especialista en lentes de alta precisión',
            ],
            [
                'name' => 'Hoya Vision Care',
                'nit' => '900345678-9',
                'legal_name' => 'Hoya Vision Care Colombia Ltda.',
                'legal_representative' => 'Ana Martinez',
                'legal_representative_id' => '51345678',
                'address' => 'Carrera 7 #71-21, Torre B, Piso 5',
                'phone' => '+57 601 789 0123',
                'email' => 'info@hoya.com.co',
                'postal_code' => '110231',
                'website' => 'https://www.hoya.com.co',
                'notes' => 'Proveedor de lentes progresivos de última generación',
            ],
            [
                'name' => 'Transitions Optical',
                'nit' => '900456789-0',
                'legal_name' => 'Transitions Optical Colombia S.A.',
                'legal_representative' => 'Pedro Lopez',
                'legal_representative_id' => '80456789',
                'address' => 'Calle 93 #11-30, Oficina 302',
                'phone' => '+57 601 890 1234',
                'email' => 'ventas@transitions.com.co',
                'postal_code' => '110221',
                'website' => 'https://www.transitions.com',
                'notes' => 'Especialista en lentes fotosensibles',
            ],
            [
                'name' => 'Shamir Optical',
                'nit' => '900567890-1',
                'legal_name' => 'Shamir Optical Industry Colombia S.A.S.',
                'legal_representative' => 'Laura Gomez',
                'legal_representative_id' => '52567890',
                'address' => 'Avenida Carrera 19 #114-65, Oficina 501',
                'phone' => '+57 601 901 2345',
                'email' => 'contacto@shamir.com.co',
                'postal_code' => '110111',
                'website' => 'https://www.shamir.com',
                'notes' => 'Proveedor de lentes personalizados de alto rendimiento',
            ],
        ];

        foreach ($suppliers as $supplier) {
            Supplier::create($supplier);
        }
    }
} 