<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\ProductLensAttributes;
use App\Models\Brand;
use App\Models\Material;
use App\Models\LensClass;
use App\Models\Treatment;
use App\Models\Photochromic;
use App\Models\Supplier;
use App\Models\LensType;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ProductImportService
{
    const UPDATE_MODE_SKIP = 'skip';
    const UPDATE_MODE_UPDATE = 'update';
    const UPDATE_MODE_ERROR = 'error';

    private $lensCategory;

    public function __construct()
    {
        $this->lensCategory = ProductCategory::where('slug', 'lens')->first();
        if (!$this->lensCategory) {
            Log::error('Lens product category not found. Please seed product categories.');
            // Or create it if it doesn't exist
            // $this->lensCategory = ProductCategory::create(['name' => 'Lenses', 'slug' => 'lens', 'is_active' => true]);
        }
    }

    public function import(string $filePath, string $updateMode = self::UPDATE_MODE_UPDATE, ?string $originalFilename = null): array
    {
        try {
            if (!in_array($updateMode, [self::UPDATE_MODE_SKIP, self::UPDATE_MODE_UPDATE, self::UPDATE_MODE_ERROR])) {
                $updateMode = self::UPDATE_MODE_UPDATE;
            }

            Log::info('Importing product file: ' . $filePath . ' with update mode: ' . $updateMode);

            if (!file_exists($filePath) || !is_readable($filePath)) {
                throw new \Exception("File does not exist or is not readable: $filePath");
            }
            
            $fileSize = filesize($filePath);
            if ($fileSize === 0) {
                throw new \Exception("File is empty: $filePath");
            }
            Log::info('File exists and is readable, size: ' . $fileSize . ' bytes');

            $fileExtension = strtolower(pathinfo($originalFilename ?: $filePath, PATHINFO_EXTENSION));
            Log::info('File extension: ' . $fileExtension);

            if (!in_array($fileExtension, ['xlsx', 'xls', 'csv', 'txt'])) {
                throw new \Exception("Unsupported file type: $fileExtension. Please upload an XLSX, XLS, CSV, or TXT file.");
            }
            
            $spreadsheet = IOFactory::load($filePath);
            $worksheet = $spreadsheet->getActiveSheet();
            $allData = $worksheet->toArray(null, true, true, true);

            if (empty($allData)) {
                throw new \Exception('No data found in the file');
            }

            $headerRow = array_shift($allData);
            $headers = $this->normalizeHeaders(array_values($headerRow));
            
            Log::info('Normalized Headers:', $headers);

            $results = [
                'success' => 0,
                'errors' => [],
                'updated' => 0,
                'skipped' => 0,
            ];
            
            DB::beginTransaction();

            foreach ($allData as $rowIndex => $row) {
                // $rowIndex will be 2, 3, 4... (spreadsheet row number)
                $rowData = [];
                $cellIndex = 0;
                foreach($row as $cellValue) {
                    if (isset($headers[$cellIndex])) {
                         $rowData[$headers[$cellIndex]] = trim($cellValue);
                    }
                    $cellIndex++;
                }

                // Skip empty rows more reliably
                if (count(array_filter($rowData)) === 0) {
                    continue;
                }

                try {
                    Log::debug('Processing row ' . $rowIndex . ':', $rowData);
                    $status = $this->processRow($rowData, $updateMode);
                    if ($status === 'created') $results['success']++;
                    if ($status === 'updated') $results['updated']++;
                    if ($status === 'skipped') $results['skipped']++;

                } catch (\Illuminate\Validation\ValidationException $e) {
                    Log::error('Validation error processing row ' . $rowIndex . ': ' . $e->getMessage(), $e->errors());
                    $results['errors'][] = [
                        'row' => $rowIndex,
                        'error' => 'Validation failed',
                        'messages' => $e->errors()
                    ];
                } catch (\Exception $e) {
                    Log::error('Error processing row ' . $rowIndex . ': ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
                    $results['errors'][] = [
                        'row' => $rowIndex,
                        'error' => $e->getMessage()
                    ];
                }
            }
            
            DB::commit();
            return $results;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Exception during product import: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return [
                'success' => 0, 'updated' => 0, 'skipped' => 0,
                'errors' => [['row' => 'File', 'error' => 'File import error: ' . $e->getMessage()]]
            ];
        }
    }

    protected function normalizeHeaders(array $headers): array
    {
        $headerMapping = [
            'codigointerno' => 'codigo_interno',
            'identificador' => 'identificador',
            'tipolente' => 'tipo_de_lente',
            'marca' => 'marca',
            'material' => 'material',
            'claselente' => 'clase_de_lente',
            'tratamiento' => 'tratamiento',
            'fotocromatico' => 'fotocromatico',
            'descripcion' => 'descripcion',
            'proveedor' => 'proveedor',
            'precio' => 'precio',
            'costo' => 'costo',
            'esferamin' => 'esfera_min',
            'esferamax' => 'esfera_max',
            'cilindromin' => 'cilindro_min',
            'cilindromax' => 'cilindro_max',
            'adicionmin' => 'adicion_min',
            'adicionmax' => 'adicion_max',
            'diametro' => 'diametro',
            'curvabase' => 'curva_base',
            'prisma' => 'prisma',
            'proteccionuv' => 'proteccion_uv',
            'grabado' => 'grabado',
            'disponibilidad' => 'disponibilidad',
        ];

        $normalized = [];
        foreach ($headers as $header) {
            if ($header === null) continue;
            
            $cleanHeader = trim(preg_replace('/[^\w\s-]/u', '', $header));
            $lowerHeader = strtolower($cleanHeader);
            $snakeHeader = str_replace(' ', '_', $lowerHeader);
            $snakeHeader = str_replace('-', '_', $snakeHeader);
            
            $mappedHeader = $headerMapping[$snakeHeader] ?? $snakeHeader;
            $normalized[] = $mappedHeader;
        }
        
        Log::info('Header mapping result:', $normalized);
        return $normalized;
    }

    protected function processRow(array $rowData, string $updateMode): string
    {
        if (!$this->lensCategory) {
            throw new \Exception('Lens product category not found. Migration cannot proceed.');
        }

        // Validate common product fields
        $validator = Validator::make($rowData, [
            'codigo_interno' => 'required|string|max:255',
            'identificador' => 'required|string|max:255',
            'marca' => 'nullable|string|max:255',
            'proveedor' => 'required|string|max:255',
            'precio' => 'required|numeric|min:0',
            'costo' => 'required|numeric|min:0',
            'tipo_de_lente' => 'required|string|max:255', // Specific to lens
            'material' => 'required|string|max:255',      // Specific to lens
            'clase_de_lente' => 'required|string|max:255',// Specific to lens
        ]);

        if ($validator->fails()) {
            throw new \Illuminate\Validation\ValidationException($validator);
        }
        
        $internalCode = $rowData['codigo_interno'];
        $identifier = $rowData['identificador'];

        $product = Product::where('internal_code', $internalCode)->orWhere('identifier', $identifier)->first();

        if ($product) {
            if ($updateMode === self::UPDATE_MODE_SKIP) {
                Log::info("Skipping existing product with internal_code: {$internalCode}");
                return 'skipped';
            }
            if ($updateMode === self::UPDATE_MODE_ERROR) {
                throw new \Exception("Product with internal_code: {$internalCode} or identifier: {$identifier} already exists.");
            }
            // Proceed to update (UPDATE_MODE_UPDATE)
        }

        $brand = $this->getOrCreateBrand($rowData['marca'] ?? null);
        $supplier = $this->getOrCreateSupplier($rowData['proveedor']);

        $productData = [
            'internal_code' => $internalCode,
            'identifier' => $identifier,
            'product_category_id' => $this->lensCategory->id,
            'brand_id' => $brand ? $brand->id : null,
            'supplier_id' => $supplier->id,
            'description' => $rowData['descripcion'] ?? null,
            'price' => $this->parseNumericValue($rowData['precio']),
            'cost' => $this->parseNumericValue($rowData['costo']),
            'status' => 'enabled', // Default to enabled
        ];
        
        // Lens specific attributes
        $lensType = $this->getOrCreateLensType($rowData['tipo_de_lente']);
        $material = $this->getOrCreateMaterial($rowData['material']);
        $lensClass = $this->getOrCreateLensClass($rowData['clase_de_lente']);
        $treatment = $this->getOrCreateTreatment($rowData['tratamiento'] ?? null);
        $photochromic = $this->getOrCreatePhotochromic($rowData['fotocromatico'] ?? null);

        $lensAttributesData = [
            'lens_type_id' => $lensType->id,
            'material_id' => $material->id,
            'lens_class_id' => $lensClass->id,
            'treatment_id' => $treatment ? $treatment->id : null,
            'photochromic_id' => $photochromic ? $photochromic->id : null,
            'sphere_min' => $this->parseNumericValue($rowData['esfera_min'] ?? null),
            'sphere_max' => $this->parseNumericValue($rowData['esfera_max'] ?? null),
            'cylinder_min' => $this->parseNumericValue($rowData['cilindro_min'] ?? null),
            'cylinder_max' => $this->parseNumericValue($rowData['cilindro_max'] ?? null),
            'addition_min' => $this->parseNumericValue($rowData['adicion_min'] ?? null),
            'addition_max' => $this->parseNumericValue($rowData['adicion_max'] ?? null),
            'diameter' => $this->parseNumericValue($rowData['diametro'] ?? null),
            'base_curve' => $this->parseNumericValue($rowData['curva_base'] ?? null),
            'prism' => $this->parseNumericValue($rowData['prisma'] ?? null),
            'uv_protection' => $rowData['proteccion_uv'] ?? null,
            'engraving' => $rowData['grabado'] ?? null,
            'availability' => $rowData['disponibilidad'] ?? 'in_stock',
        ];
        
        $this->validateRangeValues($lensAttributesData);

        if ($product) {
            $product->update($productData);
            $product->lensAttributes()->updateOrCreate(['product_id' => $product->id], $lensAttributesData);
            Log::info("Updated product ID: {$product->id} with internal_code: {$internalCode}");
            return 'updated';
        } else {
            $newProduct = Product::create($productData);
            $newProduct->lensAttributes()->create($lensAttributesData);
            Log::info("Created new product ID: {$newProduct->id} with internal_code: {$internalCode}");
            return 'created';
        }
    }

    protected function parseNumericValue($value)
    {
        if ($value === null || $value === '') {
            return null;
        }
        $cleanedValue = str_replace(',', '.', (string)$value); // Replace comma with dot for decimals
        if (!is_numeric($cleanedValue)) {
           // Log::warning("Non-numeric value encountered after cleaning: {$value} (cleaned: {$cleanedValue})");
            return null; // Or throw an exception, or handle as 0
        }
        return (float)$cleanedValue;
    }

    protected function validateRangeValues(array &$data): void
    {
        $ranges = [
            ['min' => 'sphere_min', 'max' => 'sphere_max'],
            ['min' => 'cylinder_min', 'max' => 'cylinder_max'],
            ['min' => 'addition_min', 'max' => 'addition_max'],
        ];

        foreach ($ranges as $range) {
            $minKey = $range['min'];
            $maxKey = $range['max'];

            $min = $data[$minKey] ?? null;
            $max = $data[$maxKey] ?? null;

            if ($min !== null && $max !== null && $min > $max) {
                // Swap values if min is greater than max
                //Log::warning("Swapping range values for {$minKey} and {$maxKey}: min={$min}, max={$max}");
                $data[$minKey] = $max;
                $data[$maxKey] = $min;
            }
        }
    }
    
    protected function getOrCreateByName(string $modelClass, ?string $name, array $defaults = [])
    {
        if (empty(trim($name ?? ''))) {
            return null;
        }
        return $modelClass::firstOrCreate(['name' => trim($name)], $defaults);
    }

    protected function getOrCreateBrand(?string $name): ?Brand
    {
        return $this->getOrCreateByName(Brand::class, $name);
    }

    protected function getOrCreateMaterial(string $name): Material
    {
        return $this->getOrCreateByName(Material::class, $name, ['is_active' => true]);
    }

    protected function getOrCreateLensClass(string $name): LensClass
    {
        return $this->getOrCreateByName(LensClass::class, $name, ['is_active' => true]);
    }

    protected function getOrCreateTreatment(?string $name): ?Treatment
    {
        return $this->getOrCreateByName(Treatment::class, $name, ['is_active' => true]);
    }

    protected function getOrCreatePhotochromic(?string $name): ?Photochromic
    {
        return $this->getOrCreateByName(Photochromic::class, $name, ['is_active' => true]);
    }

    protected function getOrCreateSupplier(string $name): Supplier
    {
        return $this->getOrCreateByName(Supplier::class, $name, ['is_active' => true]);
    }

    protected function getOrCreateLensType(string $name): LensType
    {
        return $this->getOrCreateByName(LensType::class, $name, ['is_active' => true]);
    }
} 