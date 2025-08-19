<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Brand;

class BrandSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        Brand::create(['name' => 'Ray-Ban', 'description' => 'Popular eyewear brand']);
        Brand::create(['name' => 'Oakley', 'description' => 'Sport performance brand']);
        Brand::create(['name' => 'Persol', 'description' => 'Italian luxury eyewear']);
        Brand::create(['name' => 'Generic', 'description' => 'Generic brand']);
    }
} 