<?php

namespace Database\Seeders;

use App\Models\Lens;
use Illuminate\Database\Seeder;

class LensesTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $lenses = [
            [
                'internal_code' => 'SV-001',
                'identifier' => 'ESS-SV-PREMIUM',
                'type' => 'Single Vision',
                'brand' => 'Essilor',
                'material' => 'CR-39',
                'lens_class' => 'Premium',
                'treatment' => 'Anti-Reflective',
                'photochromic' => null,
                'description' => 'High-quality single vision lenses with anti-reflective coating.',
                'supplier' => 'Essilor International',
                'price' => 199.99,
                'cost' => 89.99,
            ],
            [
                'internal_code' => 'PR-001',
                'identifier' => 'ZSS-PR-DIGITAL',
                'type' => 'Progressive',
                'brand' => 'Zeiss',
                'material' => 'High Index 1.67',
                'lens_class' => 'Digital',
                'treatment' => 'Blue Light Protection',
                'photochromic' => null,
                'description' => 'Advanced progressive lenses with digital optimization.',
                'supplier' => 'Carl Zeiss Vision',
                'price' => 299.99,
                'cost' => 149.99,
            ],
            [
                'internal_code' => 'BL-001',
                'identifier' => 'HOY-BL-PRO',
                'type' => 'Single Vision',
                'brand' => 'Hoya',
                'material' => 'Polycarbonate',
                'lens_class' => 'Professional',
                'treatment' => 'Blue Control',
                'photochromic' => null,
                'description' => 'Special lenses that block harmful blue light from digital devices.',
                'supplier' => 'Hoya Vision Care',
                'price' => 249.99,
                'cost' => 119.99,
            ],
            [
                'internal_code' => 'PH-001',
                'identifier' => 'TRS-PH-SIG',
                'type' => 'Single Vision',
                'brand' => 'Transitions',
                'material' => 'Trivex',
                'lens_class' => 'Signature',
                'treatment' => 'Anti-Reflective',
                'photochromic' => 'Gen 8',
                'description' => 'Photochromic lenses that adapt to light conditions.',
                'supplier' => 'Transitions Optical',
                'price' => 349.99,
                'cost' => 179.99,
            ],
            [
                'internal_code' => 'SP-001',
                'identifier' => 'OAK-SP-PERF',
                'type' => 'Sports',
                'brand' => 'Oakley',
                'material' => 'Plutonite',
                'lens_class' => 'Performance',
                'treatment' => 'Polarized',
                'photochromic' => null,
                'description' => 'High-performance lenses designed for sports activities.',
                'supplier' => 'Oakley Inc.',
                'price' => 399.99,
                'cost' => 199.99,
            ],
        ];

        foreach ($lenses as $lens) {
            Lens::create($lens);
        }
    }
}
