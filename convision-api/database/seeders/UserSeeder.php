<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $users = [
            [
                'name' => 'Admin',
                'last_name' => 'Test',
                'email' => 'admin@test.com',
                'identification' => 'ADMIN001',
                'phone' => '3001234567',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Specialist',
                'last_name' => 'Test',
                'email' => 'specialist@test.com',
                'identification' => 'SPEC001',
                'phone' => '3001234568',
                'password' => Hash::make('password'),
                'role' => 'specialist',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Receptionist',
                'last_name' => 'Test',
                'email' => 'receptionist@test.com',
                'identification' => 'RECEP001',
                'phone' => '3001234569',
                'password' => Hash::make('password'),
                'role' => 'receptionist',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        // Insertar o actualizar usuarios
        foreach ($users as $userData) {
            // Comprobar si el usuario ya existe
            $existingUser = DB::table('users')->where('email', $userData['email'])->first();
            
            if ($existingUser) {
                // Actualizar usuario existente
                DB::table('users')
                    ->where('email', $userData['email'])
                    ->update($userData);
                $this->command->info("Usuario actualizado: {$userData['name']} {$userData['last_name']} ({$userData['role']})");
            } else {
                // Crear nuevo usuario
                DB::table('users')->insert($userData);
                $this->command->info("Usuario creado: {$userData['name']} {$userData['last_name']} ({$userData['role']})");
            }
        }
    }
} 