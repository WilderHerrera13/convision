<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PaymentMethodSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // Default payment methods
        $methods = [
            [
                'name' => 'Efectivo',
                'code' => 'cash',
                'requires_reference' => false,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Tarjeta de Crédito',
                'code' => 'credit_card',
                'requires_reference' => true,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Tarjeta de Débito',
                'code' => 'debit_card',
                'requires_reference' => true,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Transferencia Bancaria',
                'code' => 'bank_transfer',
                'requires_reference' => true,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Nequi',
                'code' => 'nequi',
                'requires_reference' => true,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Daviplata',
                'code' => 'daviplata',
                'requires_reference' => true,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($methods as $method) {
            // Check if the payment method already exists
            $exists = DB::table('payment_methods')->where('code', $method['code'])->exists();
            
            if (!$exists) {
                DB::table('payment_methods')->insert($method);
            }
        }
    }
} 