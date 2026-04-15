<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class InventorySeeder extends Seeder
{
    /**
     * Inventario completo de demostración para una óptica colombiana.
     *
     * Crea en orden:
     *  1. Materiales de lentes
     *  2. Clases de lentes (gama)
     *  3. Fotosensibles
     *  4. Bodegas y ubicaciones
     *  5. Productos: lentes, monturas, lentes de contacto, accesorios
     *  6. Stock en bodega (inventory_items)
     */
    public function run(): void
    {
        // ────────────────────────────────────────────────────────────────
        // 1. MATERIALES DE LENTES
        // ────────────────────────────────────────────────────────────────
        $materialesData = [
            ['name' => 'CR-39'],
            ['name' => 'Policarbonato'],
            ['name' => 'Trivex'],
            ['name' => 'Alto Índice 1.60'],
            ['name' => 'Alto Índice 1.67'],
            ['name' => 'Alto Índice 1.74'],
            ['name' => 'Glass'],
        ];

        foreach ($materialesData as $m) {
            DB::table('materials')->updateOrInsert(['name' => $m['name']], array_merge($m, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }

        $mat = fn(string $n) => DB::table('materials')->where('name', $n)->value('id');

        // ────────────────────────────────────────────────────────────────
        // 2. CLASES DE LENTES
        // ────────────────────────────────────────────────────────────────
        $clasesData = [
            ['name' => 'Económica',    'description' => 'Lentes de entrada, buena relación precio-calidad'],
            ['name' => 'Estándar',     'description' => 'Lentes con tecnología de diseño convencional'],
            ['name' => 'Premium',      'description' => 'Lentes de alta definición y mayor campo visual'],
            ['name' => 'Ultra Premium','description' => 'Tecnología de trazado de rayos personalizado'],
        ];

        foreach ($clasesData as $c) {
            DB::table('lens_classes')->updateOrInsert(['name' => $c['name']], array_merge($c, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }

        $clase = fn(string $n) => DB::table('lens_classes')->where('name', $n)->value('id');

        // ────────────────────────────────────────────────────────────────
        // 3. FOTOSENSIBLES
        // ────────────────────────────────────────────────────────────────
        $fotosensiblesData = [
            ['name' => 'Transitions Signature Gen 8'],
            ['name' => 'Transitions XTRActive'],
            ['name' => 'Transitions Vantage (Polarizado)'],
            ['name' => 'Sensity (Hoya)'],
            ['name' => 'PhotoFusion X (Zeiss)'],
        ];

        foreach ($fotosensiblesData as $f) {
            DB::table('photochromics')->updateOrInsert(['name' => $f['name']], array_merge($f, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }

        $foto = fn(string $n) => DB::table('photochromics')->where('name', $n)->value('id');

        // ────────────────────────────────────────────────────────────────
        // 4. BODEGAS Y UBICACIONES
        // ────────────────────────────────────────────────────────────────
        $warehouseId = DB::table('warehouses')->where('code', 'SEDE-PRINCIPAL')->value('id');

        if (!$warehouseId) {
            $warehouseId = DB::table('warehouses')->insertGetId([
                'name'       => 'Sede Principal - Bogotá',
                'code'       => 'SEDE-PRINCIPAL',
                'address'    => 'Calle 72 # 10-34 Local 2, Bogotá',
                'city'       => 'Bogotá',
                'status'     => 'active',
                'notes'      => 'Punto principal de venta y almacenamiento',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $locations = [
            ['code' => 'VITRINA-LENTES',   'name' => 'Vitrina — Lentes Oftálmicos',      'type' => 'shelf',   'description' => 'Expositor de lentes oftálmicos terminados'],
            ['code' => 'VITRINA-MONTURAS', 'name' => 'Vitrina — Monturas',                'type' => 'shelf',   'description' => 'Expositor de monturas graduadas y de sol'],
            ['code' => 'VITRINA-LC',       'name' => 'Vitrina — Lentes de Contacto',      'type' => 'shelf',   'description' => 'Refrigerador y expositor de LC'],
            ['code' => 'ALMACEN-GENERAL',  'name' => 'Almacén General',                   'type' => 'storage', 'description' => 'Bodega trasera para stock de seguridad'],
            ['code' => 'ACCESORIOS',       'name' => 'Mueble Accesorios',                 'type' => 'shelf',   'description' => 'Soluciones, estuches y accesorios'],
        ];

        $locMap = [];
        foreach ($locations as $loc) {
            $locId = DB::table('warehouse_locations')->where('code', $loc['code'])->value('id');
            if (!$locId) {
                $locId = DB::table('warehouse_locations')->insertGetId(array_merge($loc, [
                    'warehouse_id' => $warehouseId,
                    'status'       => 'active',
                    'created_at'   => now(),
                    'updated_at'   => now(),
                ]));
            }
            $locMap[$loc['code']] = $locId;
        }

        // ────────────────────────────────────────────────────────────────
        // 5. IDs de catálogos ya sembrados
        // ────────────────────────────────────────────────────────────────
        $cat   = fn(string $slug) => DB::table('product_categories')->where('slug', $slug)->value('id');
        $brand = fn(string $n)    => DB::table('brands')->where('name', $n)->value('id');
        $supp  = fn(string $n)    => DB::table('suppliers')->where('name', $n)->value('id');
        $treat = fn(string $n)    => DB::table('treatments')->where('name', $n)->value('id');
        $ltype = fn(string $n)    => DB::table('lens_types')->where('name', $n)->value('id');

        $catLente    = $cat('lens');
        $catMontura  = $cat('frame');
        $catLC       = $cat('contact_lens');
        $catSolucion = $cat('cleaning_solutions');
        $catAccs     = $cat('accessories');

        $brandGenerico = $brand('Generic');
        $brandRayBan   = $brand('Ray-Ban');
        $brandOakley   = $brand('Oakley');
        $brandPersol   = $brand('Persol');

        $suppEssilor   = $supp('Essilor International');
        $suppZeiss     = $supp('Carl Zeiss Vision');
        $suppHoya      = $supp('Hoya Vision Care');
        $suppTransit   = $supp('Transitions Optical');
        $suppShamir    = $supp('Shamir Optical');

        $tratAR     = $treat('Antireflejante');
        $tratUV     = $treat('UV');
        $tratBL     = $treat('Blue Light');
        $tratScratch = $treat('Scratch Resistant');
        $tratSin    = $treat('Sin Tratamiento');

        $ltMonofocal  = $ltype('Monofocal');
        $ltBifocal    = $ltype('Bifocal');
        $ltProgresivo = $ltype('Progresivo');
        $ltOcupacional = $ltype('Ocupacional');
        $ltAntifatiga = $ltype('Antifatiga');

        // ────────────────────────────────────────────────────────────────
        // 6. PRODUCTOS + ATRIBUTOS
        // ────────────────────────────────────────────────────────────────

        // Helper: crea o recupera un producto y devuelve su id
        $upsertProduct = function (array $p) use ($catLente, $catMontura, $catLC, $catSolucion, $catAccs): int {
            $existing = DB::table('products')->where('internal_code', $p['internal_code'])->value('id');
            if ($existing) {
                return $existing;
            }
            return DB::table('products')->insertGetId(array_merge($p, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        };

        // ── 6.1 LENTES OFTÁLMICOS ──────────────────────────────────────
        $lentes = [
            // Monofocales económicos
            [
                'product' => [
                    'internal_code'       => 'LE-MNF-ECO-001',
                    'identifier'          => 'Monofocal CR-39 Económico Antireflejante',
                    'product_category_id' => $catLente,
                    'brand_id'            => $brandGenerico,
                    'supplier_id'         => $suppEssilor,
                    'description'         => 'Lente monofocal en CR-39 con tratamiento antireflejante básico. Ideal para miopía e hipermetropía leve a moderada.',
                    'price'               => 85000,
                    'cost'                => 38000,
                    'status'              => 'enabled',
                ],
                'lens' => [
                    'lens_type_id'   => $ltMonofocal,
                    'material_id'    => $mat('CR-39'),
                    'lens_class_id'  => $clase('Económica'),
                    'treatment_id'   => $tratAR,
                    'photochromic_id'=> null,
                    'sphere_min'     => -8.00,
                    'sphere_max'     => 6.00,
                    'cylinder_min'   => -4.00,
                    'cylinder_max'   => 0.00,
                ],
                'location' => 'VITRINA-LENTES',
                'qty'      => 20,
            ],
            // Monofocal policarbonato Blue Light
            [
                'product' => [
                    'internal_code'       => 'LE-MNF-PC-BL-002',
                    'identifier'          => 'Monofocal Policarbonato Blue Control',
                    'product_category_id' => $catLente,
                    'brand_id'            => $brandGenerico,
                    'supplier_id'         => $suppHoya,
                    'description'         => 'Lente monofocal en policarbonato con filtro Blue Light. Recomendado para trabajo prolongado frente a pantallas.',
                    'price'               => 165000,
                    'cost'                => 72000,
                    'status'              => 'enabled',
                ],
                'lens' => [
                    'lens_type_id'   => $ltMonofocal,
                    'material_id'    => $mat('Policarbonato'),
                    'lens_class_id'  => $clase('Estándar'),
                    'treatment_id'   => $tratBL,
                    'photochromic_id'=> null,
                    'sphere_min'     => -10.00,
                    'sphere_max'     => 8.00,
                    'cylinder_min'   => -4.00,
                    'cylinder_max'   => 0.00,
                ],
                'location' => 'VITRINA-LENTES',
                'qty'      => 15,
            ],
            // Monofocal alto índice premium
            [
                'product' => [
                    'internal_code'       => 'LE-MNF-HI67-003',
                    'identifier'          => 'Monofocal Alto Índice 1.67 Premium AR',
                    'product_category_id' => $catLente,
                    'brand_id'            => $brandGenerico,
                    'supplier_id'         => $suppZeiss,
                    'description'         => 'Lente monofocal ultradelgado en alto índice 1.67 con antireflejante premium. Para graduaciones altas.',
                    'price'               => 320000,
                    'cost'                => 145000,
                    'status'              => 'enabled',
                ],
                'lens' => [
                    'lens_type_id'   => $ltMonofocal,
                    'material_id'    => $mat('Alto Índice 1.67'),
                    'lens_class_id'  => $clase('Premium'),
                    'treatment_id'   => $tratAR,
                    'photochromic_id'=> null,
                    'sphere_min'     => -14.00,
                    'sphere_max'     => 10.00,
                    'cylinder_min'   => -6.00,
                    'cylinder_max'   => 0.00,
                ],
                'location' => 'ALMACEN-GENERAL',
                'qty'      => 10,
            ],
            // Progresivo estándar
            [
                'product' => [
                    'internal_code'       => 'LE-PRG-EST-004',
                    'identifier'          => 'Progresivo Estándar CR-39 AR',
                    'product_category_id' => $catLente,
                    'brand_id'            => $brandGenerico,
                    'supplier_id'         => $suppEssilor,
                    'description'         => 'Lente progresivo de diseño convencional. Transición suave entre distancias. Para presbicia leve a moderada.',
                    'price'               => 380000,
                    'cost'                => 170000,
                    'status'              => 'enabled',
                ],
                'lens' => [
                    'lens_type_id'   => $ltProgresivo,
                    'material_id'    => $mat('CR-39'),
                    'lens_class_id'  => $clase('Estándar'),
                    'treatment_id'   => $tratAR,
                    'photochromic_id'=> null,
                    'sphere_min'     => -8.00,
                    'sphere_max'     => 6.00,
                    'cylinder_min'   => -4.00,
                    'cylinder_max'   => 0.00,
                    'addition_min'   => 0.75,
                    'addition_max'   => 3.50,
                ],
                'location' => 'VITRINA-LENTES',
                'qty'      => 8,
            ],
            // Progresivo premium digitalizado
            [
                'product' => [
                    'internal_code'       => 'LE-PRG-PREM-005',
                    'identifier'          => 'Progresivo Premium Digital 1.60 AR',
                    'product_category_id' => $catLente,
                    'brand_id'            => $brandGenerico,
                    'supplier_id'         => $suppZeiss,
                    'description'         => 'Progresivo de diseño digital con corredor ampliado. Alta tolerancia, visión natural en todas las distancias.',
                    'price'               => 680000,
                    'cost'                => 295000,
                    'status'              => 'enabled',
                ],
                'lens' => [
                    'lens_type_id'   => $ltProgresivo,
                    'material_id'    => $mat('Alto Índice 1.60'),
                    'lens_class_id'  => $clase('Premium'),
                    'treatment_id'   => $tratAR,
                    'photochromic_id'=> null,
                    'sphere_min'     => -10.00,
                    'sphere_max'     => 8.00,
                    'cylinder_min'   => -4.00,
                    'cylinder_max'   => 0.00,
                    'addition_min'   => 0.75,
                    'addition_max'   => 3.50,
                ],
                'location' => 'VITRINA-LENTES',
                'qty'      => 6,
            ],
            // Fotosensible monofocal
            [
                'product' => [
                    'internal_code'       => 'LE-MNF-FOTO-006',
                    'identifier'          => 'Monofocal Transitions Signature Gen 8 1.50',
                    'product_category_id' => $catLente,
                    'brand_id'            => $brandGenerico,
                    'supplier_id'         => $suppTransit,
                    'description'         => 'Lente monofocal fotosensible Transitions Gen 8. Se oscurece en 30 segundos, aclara en 3 minutos. Protección UV total.',
                    'price'               => 420000,
                    'cost'                => 185000,
                    'status'              => 'enabled',
                ],
                'lens' => [
                    'lens_type_id'   => $ltMonofocal,
                    'material_id'    => $mat('CR-39'),
                    'lens_class_id'  => $clase('Premium'),
                    'treatment_id'   => $tratAR,
                    'photochromic_id'=> $foto('Transitions Signature Gen 8'),
                    'sphere_min'     => -8.00,
                    'sphere_max'     => 6.00,
                    'cylinder_min'   => -4.00,
                    'cylinder_max'   => 0.00,
                ],
                'location' => 'VITRINA-LENTES',
                'qty'      => 8,
            ],
            // Ocupacional (oficina)
            [
                'product' => [
                    'internal_code'       => 'LE-OCP-PC-007',
                    'identifier'          => 'Ocupacional Policarbonato Blue Light Premium',
                    'product_category_id' => $catLente,
                    'brand_id'            => $brandGenerico,
                    'supplier_id'         => $suppShamir,
                    'description'         => 'Lente ocupacional para trabajo de oficina. Zona intermedia amplia, visión de cerca optimizada. Ideal para teletrabajo.',
                    'price'               => 490000,
                    'cost'                => 215000,
                    'status'              => 'enabled',
                ],
                'lens' => [
                    'lens_type_id'   => $ltOcupacional,
                    'material_id'    => $mat('Policarbonato'),
                    'lens_class_id'  => $clase('Premium'),
                    'treatment_id'   => $tratBL,
                    'photochromic_id'=> null,
                    'sphere_min'     => -6.00,
                    'sphere_max'     => 6.00,
                    'cylinder_min'   => -3.00,
                    'cylinder_max'   => 0.00,
                    'addition_min'   => 0.50,
                    'addition_max'   => 2.50,
                ],
                'location' => 'VITRINA-LENTES',
                'qty'      => 6,
            ],
            // Antifatiga para millennials
            [
                'product' => [
                    'internal_code'       => 'LE-AFG-CR39-008',
                    'identifier'          => 'Antifatiga CR-39 Digital Life AR',
                    'product_category_id' => $catLente,
                    'brand_id'            => $brandGenerico,
                    'supplier_id'         => $suppHoya,
                    'description'         => 'Lente con adición en la zona inferior para aliviar la fatiga visual en jóvenes que usan pantallas. No requiere receta progresiva.',
                    'price'               => 195000,
                    'cost'                => 85000,
                    'status'              => 'enabled',
                ],
                'lens' => [
                    'lens_type_id'   => $ltAntifatiga,
                    'material_id'    => $mat('CR-39'),
                    'lens_class_id'  => $clase('Estándar'),
                    'treatment_id'   => $tratAR,
                    'photochromic_id'=> null,
                    'sphere_min'     => -4.00,
                    'sphere_max'     => 4.00,
                    'cylinder_min'   => -2.00,
                    'cylinder_max'   => 0.00,
                    'addition_min'   => 0.50,
                    'addition_max'   => 1.00,
                ],
                'location' => 'VITRINA-LENTES',
                'qty'      => 12,
            ],
        ];

        foreach ($lentes as $item) {
            $prodId = $upsertProduct($item['product']);

            // Atributos de lente
            if (!DB::table('product_lens_attributes')->where('product_id', $prodId)->exists()) {
                DB::table('product_lens_attributes')->insert(array_merge(
                    ['product_id' => $prodId],
                    $item['lens'],
                    ['created_at' => now(), 'updated_at' => now()]
                ));
            }

            // Inventario
            $locId = $locMap[$item['location']];
            if (!DB::table('inventory_items')->where('product_id', $prodId)->where('warehouse_id', $warehouseId)->exists()) {
                DB::table('inventory_items')->insert([
                    'product_id'           => $prodId,
                    'warehouse_id'         => $warehouseId,
                    'warehouse_location_id'=> $locId,
                    'quantity'             => $item['qty'],
                    'status'               => 'available',
                    'created_at'           => now(),
                    'updated_at'           => now(),
                ]);
            }

            $this->command->info("Lente creado: {$item['product']['identifier']}");
        }

        // ── 6.2 MONTURAS ──────────────────────────────────────────────
        $monturas = [
            [
                'internal_code'       => 'MO-RB-3025-001',
                'identifier'          => 'Ray-Ban Aviator Classic RB3025',
                'product_category_id' => $catMontura,
                'brand_id'            => $brandRayBan,
                'supplier_id'         => $suppZeiss,
                'description'         => 'Montura aviador clásica Ray-Ban en metal dorado. Icono de la moda ocular desde 1937.',
                'price'               => 650000,
                'cost'                => 290000,
                'status'              => 'enabled',
                'frame' => [
                    'frame_type'     => 'aviador',
                    'material_frame' => 'metal',
                    'gender'         => 'unisex',
                    'lens_width'     => 58.00,
                    'bridge_width'   => 14.00,
                    'temple_length'  => 135.00,
                    'color'          => 'Dorado / Cristal Verde',
                    'shape'          => 'Gota',
                ],
                'location' => 'VITRINA-MONTURAS',
                'qty'      => 5,
            ],
            [
                'internal_code'       => 'MO-RB-5228-002',
                'identifier'          => 'Ray-Ban Wayfarer Acetato RB5228',
                'product_category_id' => $catMontura,
                'brand_id'            => $brandRayBan,
                'supplier_id'         => $suppZeiss,
                'description'         => 'Wayfarer en acetato negro, clásico atemporal apto para todo tipo de rostro.',
                'price'               => 580000,
                'cost'                => 255000,
                'status'              => 'enabled',
                'frame' => [
                    'frame_type'     => 'full-rim',
                    'material_frame' => 'acetato',
                    'gender'         => 'unisex',
                    'lens_width'     => 52.00,
                    'bridge_width'   => 18.00,
                    'temple_length'  => 145.00,
                    'color'          => 'Negro Mate',
                    'shape'          => 'Rectangular',
                ],
                'location' => 'VITRINA-MONTURAS',
                'qty'      => 6,
            ],
            [
                'internal_code'       => 'MO-OAK-PRG-003',
                'identifier'          => 'Oakley Prizm Sport Wrap OX8062',
                'product_category_id' => $catMontura,
                'brand_id'            => $brandOakley,
                'supplier_id'         => $suppEssilor,
                'description'         => 'Montura deportiva envolvente Oakley. Resistente a impactos, ideal para ciclismo y deportes al aire libre.',
                'price'               => 780000,
                'cost'                => 340000,
                'status'              => 'enabled',
                'frame' => [
                    'frame_type'     => 'wraparound',
                    'material_frame' => 'nylon-o-matter',
                    'gender'         => 'male',
                    'lens_width'     => 56.00,
                    'bridge_width'   => 17.00,
                    'temple_length'  => 138.00,
                    'color'          => 'Negro / Rojo',
                    'shape'          => 'Envolvente',
                ],
                'location' => 'VITRINA-MONTURAS',
                'qty'      => 4,
            ],
            [
                'internal_code'       => 'MO-PER-714-004',
                'identifier'          => 'Persol PO714 Plegable Steve McQueen',
                'product_category_id' => $catMontura,
                'brand_id'            => $brandPersol,
                'supplier_id'         => $suppHoya,
                'description'         => 'Montura plegable Persol en acetato havana. La misma gafa que usó Steve McQueen. Hecha en Italia.',
                'price'               => 1150000,
                'cost'                => 510000,
                'status'              => 'enabled',
                'frame' => [
                    'frame_type'     => 'full-rim',
                    'material_frame' => 'acetato',
                    'gender'         => 'male',
                    'lens_width'     => 54.00,
                    'bridge_width'   => 21.00,
                    'temple_length'  => 145.00,
                    'color'          => 'Havana / Cristal Brown',
                    'shape'          => 'Redonda',
                ],
                'location' => 'VITRINA-MONTURAS',
                'qty'      => 3,
            ],
            [
                'internal_code'       => 'MO-GEN-SLIM-005',
                'identifier'          => 'Montura Metal Slim Fina Hombre',
                'product_category_id' => $catMontura,
                'brand_id'            => $brandGenerico,
                'supplier_id'         => $suppEssilor,
                'description'         => 'Armazón metálico ultrafino para hombre. Perfil bajo, elegante para uso corporativo.',
                'price'               => 185000,
                'cost'                => 72000,
                'status'              => 'enabled',
                'frame' => [
                    'frame_type'     => 'semi-rimless',
                    'material_frame' => 'titanio',
                    'gender'         => 'male',
                    'lens_width'     => 54.00,
                    'bridge_width'   => 17.00,
                    'temple_length'  => 140.00,
                    'color'          => 'Plateado',
                    'shape'          => 'Rectangular',
                ],
                'location' => 'VITRINA-MONTURAS',
                'qty'      => 8,
            ],
            [
                'internal_code'       => 'MO-GEN-CAT-006',
                'identifier'          => 'Montura Acetato Cat Eye Mujer',
                'product_category_id' => $catMontura,
                'brand_id'            => $brandGenerico,
                'supplier_id'         => $suppEssilor,
                'description'         => 'Armazón ojo de gato en acetato para mujer. Estilo retro y femenino.',
                'price'               => 195000,
                'cost'                => 78000,
                'status'              => 'enabled',
                'frame' => [
                    'frame_type'     => 'full-rim',
                    'material_frame' => 'acetato',
                    'gender'         => 'female',
                    'lens_width'     => 52.00,
                    'bridge_width'   => 16.00,
                    'temple_length'  => 140.00,
                    'color'          => 'Carey / Tortuga',
                    'shape'          => 'Cat Eye',
                ],
                'location' => 'VITRINA-MONTURAS',
                'qty'      => 10,
            ],
            [
                'internal_code'       => 'MO-GEN-INF-007',
                'identifier'          => 'Montura Flexible Infantil TR-90',
                'product_category_id' => $catMontura,
                'brand_id'            => $brandGenerico,
                'supplier_id'         => $suppHoya,
                'description'         => 'Armazón para niños en TR-90, material irrompible y ligero. Apta para niños de 5 a 12 años.',
                'price'               => 145000,
                'cost'                => 55000,
                'status'              => 'enabled',
                'frame' => [
                    'frame_type'     => 'full-rim',
                    'material_frame' => 'TR-90',
                    'gender'         => 'child',
                    'lens_width'     => 46.00,
                    'bridge_width'   => 15.00,
                    'temple_length'  => 125.00,
                    'color'          => 'Azul / Rojo',
                    'shape'          => 'Rectangular',
                ],
                'location' => 'VITRINA-MONTURAS',
                'qty'      => 7,
            ],
            [
                'internal_code'       => 'MO-GEN-RIM-008',
                'identifier'          => 'Montura Acetato Redonda Unisex',
                'product_category_id' => $catMontura,
                'brand_id'            => $brandGenerico,
                'supplier_id'         => $suppEssilor,
                'description'         => 'Armazón redondo estilo John Lennon en acetato negro. Muy popular en el segmento joven.',
                'price'               => 170000,
                'cost'                => 65000,
                'status'              => 'enabled',
                'frame' => [
                    'frame_type'     => 'full-rim',
                    'material_frame' => 'acetato',
                    'gender'         => 'unisex',
                    'lens_width'     => 48.00,
                    'bridge_width'   => 22.00,
                    'temple_length'  => 145.00,
                    'color'          => 'Negro',
                    'shape'          => 'Redonda',
                ],
                'location' => 'VITRINA-MONTURAS',
                'qty'      => 9,
            ],
        ];

        foreach ($monturas as $item) {
            $frame = $item['frame'];
            $location = $item['location'];
            $qty = $item['qty'];
            unset($item['frame'], $item['location'], $item['qty']);

            $prodId = $upsertProduct($item);

            if (!DB::table('product_frame_attributes')->where('product_id', $prodId)->exists()) {
                DB::table('product_frame_attributes')->insert(array_merge(
                    ['product_id' => $prodId],
                    $frame,
                    ['created_at' => now(), 'updated_at' => now()]
                ));
            }

            $locId = $locMap[$location];
            if (!DB::table('inventory_items')->where('product_id', $prodId)->where('warehouse_id', $warehouseId)->exists()) {
                DB::table('inventory_items')->insert([
                    'product_id'           => $prodId,
                    'warehouse_id'         => $warehouseId,
                    'warehouse_location_id'=> $locId,
                    'quantity'             => $qty,
                    'status'               => 'available',
                    'created_at'           => now(),
                    'updated_at'           => now(),
                ]);
            }

            $this->command->info("Montura creada: {$item['identifier']}");
        }

        // ── 6.3 LENTES DE CONTACTO ────────────────────────────────────
        $contactLenses = [
            [
                'product' => [
                    'internal_code'       => 'LC-BD-SIL-001',
                    'identifier'          => 'Acuvue Oasys Silicona Hidrogel Diario',
                    'product_category_id' => $catLC,
                    'brand_id'            => $brandGenerico,
                    'supplier_id'         => $suppEssilor,
                    'description'         => 'Lente de contacto diario en silicona hidrogel de alta permeabilidad. Máxima comodidad para uso prolongado.',
                    'price'               => 95000,
                    'cost'                => 42000,
                    'status'              => 'enabled',
                ],
                'contact' => [
                    'contact_type'         => 'esférica',
                    'replacement_schedule' => 'diario',
                    'base_curve'           => 8.50,
                    'diameter'             => 14.30,
                    'material_contact'     => 'Silicona Hidrogel',
                    'water_content'        => 38.00,
                    'uv_protection'        => true,
                ],
                'location' => 'VITRINA-LC',
                'qty'      => 30,
            ],
            [
                'product' => [
                    'internal_code'       => 'LC-MN-SIL-002',
                    'identifier'          => 'Biofinity Mensual Silicona Hidrogel',
                    'product_category_id' => $catLC,
                    'brand_id'            => $brandGenerico,
                    'supplier_id'         => $suppHoya,
                    'description'         => 'Lente mensual en silicona hidrogel Aquaform. Alta retención de humedad, apta para uso continuo hasta 6 noches.',
                    'price'               => 145000,
                    'cost'                => 63000,
                    'status'              => 'enabled',
                ],
                'contact' => [
                    'contact_type'         => 'esférica',
                    'replacement_schedule' => 'mensual',
                    'base_curve'           => 8.60,
                    'diameter'             => 14.00,
                    'material_contact'     => 'Comfilcon A',
                    'water_content'        => 48.00,
                    'uv_protection'        => false,
                ],
                'location' => 'VITRINA-LC',
                'qty'      => 20,
            ],
            [
                'product' => [
                    'internal_code'       => 'LC-TOR-QN-003',
                    'identifier'          => 'Acuvue Oasys for Astigmatism Quincenal Tórica',
                    'product_category_id' => $catLC,
                    'brand_id'            => $brandGenerico,
                    'supplier_id'         => $suppEssilor,
                    'description'         => 'Lente de contacto tórica quincenal para astigmatismo. Estabilización 4 puntos para visión estable.',
                    'price'               => 185000,
                    'cost'                => 81000,
                    'status'              => 'enabled',
                ],
                'contact' => [
                    'contact_type'         => 'tórica',
                    'replacement_schedule' => 'quincenal',
                    'base_curve'           => 8.60,
                    'diameter'             => 14.50,
                    'material_contact'     => 'Senofilcon A',
                    'water_content'        => 38.00,
                    'uv_protection'        => true,
                ],
                'location' => 'VITRINA-LC',
                'qty'      => 15,
            ],
            [
                'product' => [
                    'internal_code'       => 'LC-MF-MN-004',
                    'identifier'          => 'Proclear Multifocal Mensual Presbicia',
                    'product_category_id' => $catLC,
                    'brand_id'            => $brandGenerico,
                    'supplier_id'         => $suppHoya,
                    'description'         => 'Lente de contacto multifocal mensual para presbicia. Tecnología de zona concéntrica D y N.',
                    'price'               => 225000,
                    'cost'                => 98000,
                    'status'              => 'enabled',
                ],
                'contact' => [
                    'contact_type'         => 'multifocal',
                    'replacement_schedule' => 'mensual',
                    'base_curve'           => 8.70,
                    'diameter'             => 14.40,
                    'material_contact'     => 'Omafilcon A',
                    'water_content'        => 62.00,
                    'uv_protection'        => false,
                ],
                'location' => 'VITRINA-LC',
                'qty'      => 10,
            ],
        ];

        foreach ($contactLenses as $item) {
            $contact = $item['contact'];
            $location = $item['location'];
            $qty = $item['qty'];
            unset($item['contact'], $item['location'], $item['qty']);

            $prodId = $upsertProduct($item['product']);

            if (!DB::table('product_contact_lens_attributes')->where('product_id', $prodId)->exists()) {
                DB::table('product_contact_lens_attributes')->insert(array_merge(
                    ['product_id' => $prodId],
                    $contact,
                    ['created_at' => now(), 'updated_at' => now()]
                ));
            }

            $locId = $locMap[$location];
            if (!DB::table('inventory_items')->where('product_id', $prodId)->where('warehouse_id', $warehouseId)->exists()) {
                DB::table('inventory_items')->insert([
                    'product_id'           => $prodId,
                    'warehouse_id'         => $warehouseId,
                    'warehouse_location_id'=> $locId,
                    'quantity'             => $qty,
                    'status'               => 'available',
                    'created_at'           => now(),
                    'updated_at'           => now(),
                ]);
            }

            $this->command->info("Lente de contacto creado: {$item['product']['identifier']}");
        }

        // ── 6.4 SOLUCIONES Y ACCESORIOS ───────────────────────────────
        $accesorios = [
            [
                'internal_code'       => 'ACC-SOL-360-001',
                'identifier'          => 'Solución Multipropósito Renu 360ml',
                'product_category_id' => $catSolucion ?: $catAccs,
                'brand_id'            => $brandGenerico,
                'supplier_id'         => $suppHoya,
                'description'         => 'Solución multipropósito para limpieza, enjuague, desinfección y almacenamiento de lentes de contacto blandas.',
                'price'               => 42000,
                'cost'                => 18000,
                'status'              => 'enabled',
                'location'            => 'ACCESORIOS',
                'qty'                 => 25,
            ],
            [
                'internal_code'       => 'ACC-ESTUCHE-001',
                'identifier'          => 'Estuche Rígido para Gafas Premium',
                'product_category_id' => $catAccs,
                'brand_id'            => $brandGenerico,
                'supplier_id'         => $suppEssilor,
                'description'         => 'Estuche rígido con tapa magnética y paño de microfibra incluido.',
                'price'               => 28000,
                'cost'                => 11000,
                'status'              => 'enabled',
                'location'            => 'ACCESORIOS',
                'qty'                 => 30,
            ],
            [
                'internal_code'       => 'ACC-SPRAY-001',
                'identifier'          => 'Spray Limpiador de Lentes con Microfibra',
                'product_category_id' => $catAccs,
                'brand_id'            => $brandGenerico,
                'supplier_id'         => $suppZeiss,
                'description'         => 'Spray limpiador Zeiss + paño de microfibra. Sin alcohol, seguro para tratamientos antireflejantes.',
                'price'               => 35000,
                'cost'                => 14000,
                'status'              => 'enabled',
                'location'            => 'ACCESORIOS',
                'qty'                 => 20,
            ],
            [
                'internal_code'       => 'ACC-GOTAS-001',
                'identifier'          => 'Lágrimas Artificiales Systane Ultra 10ml',
                'product_category_id' => $catAccs,
                'brand_id'            => $brandGenerico,
                'supplier_id'         => $suppEssilor,
                'description'         => 'Gotas lubricantes para alivio del ojo seco. Compatible con lentes de contacto.',
                'price'               => 48000,
                'cost'                => 20000,
                'status'              => 'enabled',
                'location'            => 'ACCESORIOS',
                'qty'                 => 18,
            ],
        ];

        foreach ($accesorios as $item) {
            $location = $item['location'];
            $qty      = $item['qty'];
            unset($item['location'], $item['qty']);

            $prodId = $upsertProduct($item);

            $locId = $locMap[$location];
            if (!DB::table('inventory_items')->where('product_id', $prodId)->where('warehouse_id', $warehouseId)->exists()) {
                DB::table('inventory_items')->insert([
                    'product_id'           => $prodId,
                    'warehouse_id'         => $warehouseId,
                    'warehouse_location_id'=> $locId,
                    'quantity'             => $qty,
                    'status'               => 'available',
                    'created_at'           => now(),
                    'updated_at'           => now(),
                ]);
            }

            $this->command->info("Accesorio/solución creado: {$item['identifier']}");
        }

        $this->command->info('Inventario completo sembrado correctamente.');
    }
}
