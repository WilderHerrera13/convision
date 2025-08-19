<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        if (!User::where('email', 'admin@convision.com')->exists()) {
            User::create([
                'name' => 'Admin',
                'email' => 'admin@convision.com',
                'password' => Hash::make('password'),
                'role' => 'admin'
            ]);
        }

        // Create a specialist user
        if (!User::where('email', 'specialist@convision.com')->exists()) {
            User::create([
                'name' => 'Specialist',
                'email' => 'specialist@convision.com',
                'password' => Hash::make('password'),
                'role' => 'specialist'
            ]);
        }

        // Create a receptionist user
        if (!User::where('email', 'receptionist@convision.com')->exists()) {
            User::create([
                'name' => 'Receptionist',
                'email' => 'receptionist@convision.com',
                'password' => Hash::make('password'),
                'role' => 'receptionist'
            ]);
        }
    }
}
