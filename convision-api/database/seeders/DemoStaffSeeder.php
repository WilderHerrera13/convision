<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoStaffSeeder extends Seeder
{
    /**
     * Personal médico y administrativo de demo para una óptica colombiana.
     * Contraseña de todos: password
     */
    public function run(): void
    {
        $staff = [
            // ── Administradores ──────────────────────────────────────────
            [
                'name'           => 'Claudia Patricia',
                'last_name'      => 'Vargas Ospina',
                'email'          => 'cvargas@convision.com',
                'identification' => '52789123',
                'phone'          => '3124567890',
                'role'           => 'admin',
                'is_active'      => true,
            ],

            // ── Optómetras / Especialistas ───────────────────────────────
            [
                'name'           => 'Andrés Felipe',
                'last_name'      => 'Bermúdez Londoño',
                'email'          => 'abermudez@convision.com',
                'identification' => '79456321',
                'phone'          => '3201234567',
                'role'           => 'specialist',
                'is_active'      => true,
            ],
            [
                'name'           => 'Sandra Milena',
                'last_name'      => 'Torres Herrera',
                'email'          => 'storres@convision.com',
                'identification' => '51987654',
                'phone'          => '3112345678',
                'role'           => 'specialist',
                'is_active'      => true,
            ],
            [
                'name'           => 'Diego Alejandro',
                'last_name'      => 'Montoya Ríos',
                'email'          => 'dmontoya@convision.com',
                'identification' => '1090112233',
                'phone'          => '3183456789',
                'role'           => 'specialist',
                'is_active'      => true,
            ],

            // ── Recepcionistas ───────────────────────────────────────────
            [
                'name'           => 'Valentina',
                'last_name'      => 'Castillo Díaz',
                'email'          => 'vcastillo@convision.com',
                'identification' => '1015334455',
                'phone'          => '3007654321',
                'role'           => 'receptionist',
                'is_active'      => true,
            ],
            [
                'name'           => 'Julián Camilo',
                'last_name'      => 'Nieto Cárdenas',
                'email'          => 'jnieto@convision.com',
                'identification' => '1020556677',
                'phone'          => '3153216547',
                'role'           => 'receptionist',
                'is_active'      => true,
            ],

            // ── Laboratorio ──────────────────────────────────────────────
            [
                'name'           => 'Hernán Darío',
                'last_name'      => 'Quintero Salazar',
                'email'          => 'hquintero@convision.com',
                'identification' => '80778899',
                'phone'          => '3169871234',
                'role'           => 'laboratory',
                'is_active'      => true,
            ],
        ];

        foreach ($staff as $data) {
            User::updateOrCreate(
                ['email' => $data['email']],
                array_merge($data, ['password' => Hash::make('password')])
            );
            $this->command->info("Usuario creado/actualizado: {$data['name']} {$data['last_name']} ({$data['role']})");
        }

        $this->command->info('Personal médico y administrativo sembrado correctamente.');
    }
}
