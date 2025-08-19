<?php

namespace Database\Seeders;

use App\Models\Treatment;
use Illuminate\Database\Seeder;

class TreatmentsTableSeeder extends Seeder
{
    public function run()
    {
        $treatments = [
            ['name' => 'Antireflejante'],
            ['name' => 'UV'],
            ['name' => 'Blue Light'],
            ['name' => 'Scratch Resistant'],
            ['name' => 'Sin Tratamiento'],
        ];

        foreach ($treatments as $treatment) {
            Treatment::updateOrCreate(
                ['name' => $treatment['name']],
                $treatment
            );
        }
    }
} 