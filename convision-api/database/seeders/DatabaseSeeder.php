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
            // ── Catálogos base ──────────────────────────────────────
            UsersTableSeeder::class,
            AdminUserSeeder::class,
            BrandSeeder::class,
            TreatmentsTableSeeder::class,
            LensTypeSeeder::class,
            ProductCategorySeeder::class,
            SuppliersTableSeeder::class,
            PaymentMethodSeeder::class,
            PatientLookupsSeeder::class,

            // ── Datos de demo ───────────────────────────────────────
            DemoStaffSeeder::class,      // Médicos, recepcionistas, laboratorio
            DemoPatientsSeeder::class,   // 15 pacientes colombianos
            InventorySeeder::class,      // Bodega, productos y stock
            AdminNotificationsSeeder::class,
        ]);
    }
}
