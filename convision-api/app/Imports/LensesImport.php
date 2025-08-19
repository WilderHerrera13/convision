<?php

namespace App\Imports;

use App\Models\Lens;
use App\Models\Brand;
use App\Models\LensType;
use App\Models\Material;
use App\Models\LensClass;
use App\Models\Treatment;
use App\Models\Photochromic;
use App\Models\Supplier;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;

class LensesImport implements ToModel, WithHeadingRow, WithValidation
{
    /**
     * Number of rows imported
     *
     * @var int
     */
    protected $rowCount = 0;

    /**
     * @param array $row
     *
     * @return \Illuminate\Database\Eloquent\Model|null
     */
    public function model(array $row)
    {
        // Skip if required fields are empty
        if (empty($row['codigointerno']) || empty($row['identificador']) || empty($row['tipo'])) {
            return null;
        }

        $this->rowCount++;

        // Find or create related models
        $brand = $row['marca'] ? Brand::firstOrCreate(['name' => $row['marca']]) : null;
        $lensType = LensType::firstOrCreate(['name' => $row['tipo']]);
        $material = $row['material'] ? Material::firstOrCreate(['name' => $row['material']]) : null;
        $lensClass = $row['clase'] ? LensClass::firstOrCreate(['name' => $row['clase']]) : null;
        $treatment = $row['tratamiento'] ? Treatment::firstOrCreate(['name' => $row['tratamiento']]) : null;
        $photochromic = $row['fotocromatico'] ? Photochromic::firstOrCreate(['name' => $row['fotocromatico']]) : null;
        $supplier = $row['proveedor'] ? Supplier::firstOrCreate(['name' => $row['proveedor']]) : null;

        // Ensure we have all required fields
        if (!$lensType || !$brand || !$material || !$lensClass || !$supplier) {
            return null;
        }

        return new Lens([
            'internal_code' => $row['codigointerno'],
            'identifier' => $row['identificador'],
            'type_id' => $lensType->id,
            'brand_id' => $brand->id,
            'material_id' => $material->id,
            'lens_class_id' => $lensClass->id,
            'treatment_id' => $treatment ? $treatment->id : null,
            'photochromic_id' => $photochromic ? $photochromic->id : null,
            'description' => $row['descripcion'] ?? null,
            'supplier_id' => $supplier->id,
            'price' => $row['precio'] ?? 0,
            'cost' => $row['costo'] ?? 0,
        ]);
    }

    /**
     * @return array
     */
    public function rules(): array
    {
        return [
            'codigointerno' => 'required|string|max:50',
            'identificador' => 'required|string|max:50',
            'tipo' => 'required|string|max:50',
            'marca' => 'nullable|string|max:100',
            'material' => 'nullable|string|max:50',
            'clase' => 'nullable|string|max:50',
            'tratamiento' => 'nullable|string|max:50',
            'fotocromatico' => 'nullable|string|max:50',
            'descripcion' => 'nullable|string',
            'proveedor' => 'nullable|string|max:100',
            'precio' => 'nullable|numeric|min:0',
            'costo' => 'nullable|numeric|min:0',
        ];
    }

    /**
     * Get the number of rows imported
     *
     * @return int
     */
    public function getRowCount(): int
    {
        return $this->rowCount;
    }
} 