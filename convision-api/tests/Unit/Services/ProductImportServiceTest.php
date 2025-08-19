<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\ProductImportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Brand;
use App\Models\Supplier;
use App\Models\LensType;
use App\Models\Material;
use App\Models\LensClass;
use App\Models\Treatment;
use App\Models\Photochromic;

class ProductImportServiceTest extends TestCase
{
    use RefreshDatabase;

    protected $productImportService;
    protected $logFake;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Mock the Log facade
        $this->logFake = new \Illuminate\Support\Testing\Fakes\LogFake();
        Log::swap($this->logFake);

        // Create the 'lens' product category as the constructor requires it
        ProductCategory::factory()->create(['slug' => 'lens', 'name' => 'Lenses']);

        // Partially mock the service to isolate the processRow method
        $this->productImportService = $this->partialMock(ProductImportService::class, function ($mock) {
            // Mock methods that processRow calls but we don't want to test in this unit test
            $mock->shouldReceive('getOrCreateBrand')->andReturn((object)['id' => 1]);
            $mock->shouldReceive('getOrCreateSupplier')->andReturn((object)['id' => 1]);
            $mock->shouldReceive('getOrCreateLensType')->andReturn((object)['id' => 1]);
            $mock->shouldReceive('getOrCreateMaterial')->andReturn((object)['id' => 1]);
            $mock->shouldReceive('getOrCreateLensClass')->andReturn((object)['id' => 1]);
            $mock->shouldReceive('getOrCreateTreatment')->andReturn((object)['id' => 1]);
            $mock->shouldReceive('getOrCreatePhotochromic')->andReturn((object)['id' => 1]);
            $mock->shouldReceive('parseNumericValue')->andReturnUsing(function ($value) { return (float) $value; }); // Keep parseNumericValue working
            $mock->shouldReceive('validateRangeValues')->andReturn(null); // Assume validation passes for now
        });
    }

    /**
     * Test processing a new row (creating a product).
     *
     * @return void
     */
    public function test_process_row_creates_new_product()
    {
        // Arrange
        $rowData = [
            'codigo_interno' => 'TEST-001',
            'identificador' => 'ID-001',
            'marca' => 'Brand A',
            'proveedor' => 'Supplier X',
            'precio' => '100.00',
            'costo' => '50.00',
            'tipo_de_lente' => 'Single Vision',
            'material' => 'Plastic',
            'clase_de_lente' => 'Standard',
            'descripcion' => 'Test Lens',
            'esfera_min' => '-5.00',
            'esfera_max' => '+3.00',
            'cilindro_min' => '-2.00',
            'cilindro_max' => '+0.00',
            'adicion_min' => '0.75',
            'adicion_max' => '2.50',
            'diametro' => '70',
            'curva_base' => '8.0',
            'prisma' => '0.5',
            'proteccion_uv' => 'Yes',
            'grabado' => 'Some Engraving',
            'disponibilidad' => 'Available',
        ];

        // Mock the Product model to ensure create is called and first is not found
        $productMock = $this->mock(Product::class);
        $productMock->shouldReceive('where')->once()->with('internal_code', 'TEST-001')->andReturnSelf();
        $productMock->shouldReceive('orWhere')->once()->with('identifier', 'ID-001')->andReturnSelf();
        $productMock->shouldReceive('first')->once()->andReturn(null); // Product does not exist

        $productMock->shouldReceive('create')->once()->andReturn((object)['id' => 1, 'lensProductAttributes' => (object)['id' => 1]]); // Mock creation

        // Act
        $status = $this->productImportService->processRow($rowData, ProductImportService::UPDATE_MODE_UPDATE);

        // Assert
        $this->assertEquals('created', $status);
        // Add assertions to verify the product and lens attributes were created with correct data
    }

    // Add tests for update, skip, and error modes for processRow

    /**
     * Test that headers are normalized correctly.
     *
     * @return void
     */
    public function test_normalize_headers_correctly()
    {
        $headers = [
            'Código Interno',
            'Identificador',
            'Tipo Lente',
            'Marca',
            'Material',
            'Clase Lente',
            'Tratamiento',
            'Fotocromático',
            'Descripción',
            'Proveedor',
            'Precio',
            'Costo',
            'Esfera Min',
            'Esfera Max',
            'Cilindro Min',
            'Cilindro Max',
            'Adición Min',
            'Adición Max',
            'Diámetro',
            'Curva Base',
            'Prisma',
            'Protección UV',
            'Grabado',
            'Disponibilidad',
            'Unknown Column',
            null // Test null header
        ];

        $expected = [
            'codigo_interno',
            'identificador',
            'tipo_de_lente',
            'marca',
            'material',
            'clase_de_lente',
            'tratamiento',
            'fotocromatico',
            'descripcion',
            'proveedor',
            'precio',
            'costo',
            'esfera_min',
            'esfera_max',
            'cilindro_min',
            'cilindro_max',
            'adicion_min',
            'adicion_max',
            'diametro',
            'curva_base',
            'prisma',
            'proteccion_uv',
            'grabado',
            'disponibilidad',
            'unknown_column',
        ];

        // Use reflection to access the protected method
        $reflection = new \ReflectionClass($this->productImportService);
        $method = $reflection->getMethod('normalizeHeaders');
        $method->setAccessible(true);

        $normalized = $method->invoke($this->productImportService, $headers);

        $this->assertEquals($expected, $normalized);
    }

    /**
     * Test that numeric values are parsed correctly.
     *
     * @return void
     */
    public function test_parse_numeric_value_correctly()
    {
         // Use reflection to access the protected method
         $reflection = new \ReflectionClass($this->productImportService);
         $method = $reflection->getMethod('parseNumericValue');
         $method->setAccessible(true);

        $this->assertEquals(123.45, $method->invoke($this->productImportService, '123.45'));
        $this->assertEquals(1000.00, $method->invoke($this->productImportService, '1,000'));
        $this->assertEquals(50.00, $method->invoke($this->productImportService, '$50'));
        $this->assertEquals(75.50, $method->invoke($this->productImportService, '€75.5'));
        $this->assertEquals(0.00, $method->invoke($this->productImportService, '0'));
        $this->assertNull($method->invoke($this->productImportService, ''));
        $this->assertNull($method->invoke($this->productImportService, null));
        $this->assertNull($method->invoke($this->productImportService, 'abc'));
        $this->assertEquals(1234.56, $method->invoke($this->productImportService, '1.234,56')); // Test comma as decimal separator
    }

    // Add other test methods for different functionalities of the service
} 