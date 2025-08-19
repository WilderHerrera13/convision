<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * @return void
     */
    public function run()
    {
        $this->call([
            UsersTableSeeder::class,
            AdminUserSeeder::class,
            BrandSeeder::class,
            TreatmentsTableSeeder::class,
            LensTypeSeeder::class,
            ProductCategorySeeder::class,
            SuppliersTableSeeder::class,
            PaymentMethodSeeder::class,
            PatientLookupsSeeder::class,
            UserSeeder::class,
            PatientSeeder::class,
        ]);
    }
}
