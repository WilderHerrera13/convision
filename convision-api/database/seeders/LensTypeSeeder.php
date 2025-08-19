<?php

namespace Database\Seeders;

use App\Models\LensType;
use Illuminate\Database\Seeder;

class LensTypeSeeder extends Seeder
{
    public function run()
    {
        $lensTypes = [
            ['name' => 'Monofocal'],
            ['name' => 'Bifocal'],
            ['name' => 'Progresivo'],
            ['name' => 'Ocupacional'],
            ['name' => 'Antifatiga'],
        ];

        foreach ($lensTypes as $lensType) {
            LensType::updateOrCreate(
                ['name' => $lensType['name']],
                $lensType
            );
        }
    }
} 