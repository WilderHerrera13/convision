<?php

namespace Database\Seeders;

use App\Models\ProductCategory;
use Illuminate\Database\Seeder;

class ProductCategorySeeder extends Seeder
{
    public function run()
    {
        $categories = [
            [
                'name' => 'Lentes',
                'slug' => 'lens',
                'description' => 'Lentes oftálmicos con diferentes características y tratamientos',
                'icon' => 'lens',
                'is_active' => true,
                'required_attributes' => json_encode([
                    'lens_type_id',
                    'material_id',
                    'lens_class_id',
                    'sphere_min',
                    'sphere_max',
                    'cylinder_min',
                    'cylinder_max'
                ])
            ],
            [
                'name' => 'Monturas',
                'slug' => 'frame',
                'description' => 'Monturas y armazones para lentes',
                'icon' => 'frame',
                'is_active' => true,
                'required_attributes' => json_encode([
                    'frame_type',
                    'material_frame',
                    'lens_width',
                    'bridge_width',
                    'temple_length'
                ])
            ],
            [
                'name' => 'Lentes de Contacto',
                'slug' => 'contact_lens',
                'description' => 'Lentes de contacto y productos relacionados',
                'icon' => 'contact',
                'is_active' => true,
                'required_attributes' => json_encode([
                    'contact_type',
                    'replacement_schedule',
                    'base_curve',
                    'diameter'
                ])
            ],
            [
                'name' => 'Gotas Oftálmicas',
                'slug' => 'eye_drops',
                'description' => 'Gotas y lubricantes para los ojos',
                'icon' => 'droplet',
                'is_active' => true,
                'required_attributes' => json_encode([])
            ],
            [
                'name' => 'Soluciones de Limpieza',
                'slug' => 'cleaning_solutions',
                'description' => 'Soluciones para limpieza y mantenimiento de lentes',
                'icon' => 'spray',
                'is_active' => true,
                'required_attributes' => json_encode([])
            ],
            [
                'name' => 'Accesorios',
                'slug' => 'accessories',
                'description' => 'Estuches, cordones, paños y otros accesorios',
                'icon' => 'package',
                'is_active' => true,
                'required_attributes' => json_encode([])
            ],
            [
                'name' => 'Equipos y Herramientas',
                'slug' => 'equipment',
                'description' => 'Equipos de medición y herramientas para óptica',
                'icon' => 'tool',
                'is_active' => true,
                'required_attributes' => json_encode([])
            ]
        ];

        foreach ($categories as $category) {
            ProductCategory::updateOrCreate(
                ['slug' => $category['slug']],
                $category
            );
        }
    }
} 