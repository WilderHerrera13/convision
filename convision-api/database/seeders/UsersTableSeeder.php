<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UsersTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // Create admin user
        User::updateOrCreate(
            ['email' => 'admin@convision.com'],
            [
                'name' => 'Admin',
                'last_name' => 'User',
                'identification' => '12345678',
                'password' => Hash::make('password'),
                'role' => 'admin',
            ]
        );

        // Create specialist user
        User::updateOrCreate(
            ['email' => 'specialist@convision.com'],
            [
                'name' => 'Specialist',
                'last_name' => 'User',
                'identification' => '87654321',
                'password' => Hash::make('password'),
                'role' => 'specialist',
            ]
        );

        // Create receptionist user
        User::updateOrCreate(
            ['email' => 'receptionist@convision.com'],
            [
                'name' => 'Receptionist',
                'last_name' => 'User',
                'identification' => '11111111',
                'password' => Hash::make('password'),
                'role' => 'receptionist',
            ]
        );
    }
}
