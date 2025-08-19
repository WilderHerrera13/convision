<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Product\StoreProductRequest;
use App\Http\Requests\Api\V1\Product\UpdateProductRequest;
use App\Http\Requests\Api\V1\Product\LensesByPrescriptionRequest;
use App\Http\Requests\Api\V1\Product\BulkUpdateStatusRequest;
use App\Http\Requests\Api\V1\Product\SearchProductRequest;
use App\Http\Requests\Api\V1\Product\CalculatePriceRequest;
use App\Http\Resources\V1\Product\ProductCollection;
use App\Http\Resources\V1\Product\ProductResource;
use App\Http\Resources\V1\Product\ProductStockResource;
use App\Http\Resources\V1\Product\ProductDiscountCollection;
use App\Http\Resources\V1\Product\ProductInventoryResource;
use App\Http\Resources\V1\Product\ProductDiscountInfoResource;
use App\Http\Resources\V1\Product\ProductActiveDiscountCollection;
use App\Http\Resources\V1\Product\CalculatedPriceResource;
use App\Http\Resources\V1\Shared\ActionStatusResource;
use App\Models\Product;
use App\Services\ProductService;
use App\Services\ProductDiscountService;
use Illuminate\Http\Request;

/**
 * @OA\Tag(
 *     name="Products",
 *     description="API Endpoints for product management"
 * )
 */
class ProductController extends Controller
{
    protected $productService;
    protected $discountService;

    public function __construct(ProductService $productService, ProductDiscountService $discountService)
    {
        $this->middleware('auth:api');
        $this->productService = $productService;
        $this->discountService = $discountService;
    }

    /**
     * @OA\Get(
     *     path="/api/v1/products",
     *     summary="Get list of products",
     *     tags={"Products"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="page", in="query", description="Page number", @OA\Schema(type="integer", default=1)),
     *     @OA\Parameter(name="per_page", in="query", description="Items per page", @OA\Schema(type="integer", default=15)),
     *     @OA\Parameter(name="s_f", in="query", description="Search fields", @OA\Schema(type="string")),
     *     @OA\Parameter(name="s_v", in="query", description="Search values", @OA\Schema(type="string")),
     *     @OA\Parameter(name="sort_by", in="query", description="Sort by field", @OA\Schema(type="string")),
     *     @OA\Parameter(name="sort_direction", in="query", description="Sort direction (asc/desc)", @OA\Schema(type="string")),
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="data", type="array", @OA\Items(
     *                 @OA\Property(property="id", type="integer"),
     *                 @OA\Property(property="internal_code", type="string"),
     *                 @OA\Property(property="identifier", type="string"),
     *                 @OA\Property(property="name", type="string"),
     *                 @OA\Property(property="description", type="string"),
     *                 @OA\Property(property="price", type="number", format="float"),
     *                 @OA\Property(property="cost", type="number", format="float"),
     *                 @OA\Property(property="status", type="string", enum={"active","inactive"}),
     *                 @OA\Property(property="category", type="object"),
     *                 @OA\Property(property="brand", type="object"),
     *                 @OA\Property(property="supplier", type="object"),
     *                 @OA\Property(property="created_at", type="string", format="date-time"),
     *                 @OA\Property(property="updated_at", type="string", format="date-time")
     *             )),
     *             @OA\Property(property="links", type="object"),
     *             @OA\Property(property="meta", type="object")
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function index(Request $request)
    {
        $query = Product::with([
            'category', 
            'brand', 
            'supplier',
            'lensAttributes.lensType',
            'lensAttributes.material',
            'lensAttributes.lensClass',
            'lensAttributes.treatment',
            'lensAttributes.photochromic',
            'frameAttributes',
            'contactLensAttributes'
        ])
            ->apiFilter($request)
            ->orderBy('created_at', 'desc');
        
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $products = $query->paginate($perPage);
        
        return new ProductCollection($products);
    }

    /**
     * @OA\Get(
     *     path="/api/v1/products/{id}",
     *     summary="Get product details",
     *     tags={"Products"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, description="Product ID", @OA\Schema(type="integer")),
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(
     *             @OA\Property(property="id", type="integer"),
     *             @OA\Property(property="internal_code", type="string"),
     *             @OA\Property(property="identifier", type="string"),
     *             @OA\Property(property="name", type="string"),
     *             @OA\Property(property="description", type="string"),
     *             @OA\Property(property="price", type="number", format="float"),
     *             @OA\Property(property="cost", type="number", format="float"),
     *             @OA\Property(property="status", type="string"),
     *             @OA\Property(property="category", type="object"),
     *             @OA\Property(property="brand", type="object"),
     *             @OA\Property(property="supplier", type="object"),
     *             @OA\Property(property="created_at", type="string", format="date-time"),
     *             @OA\Property(property="updated_at", type="string", format="date-time")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Product not found"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function show($id)
    {
        $product = $this->productService->findProduct($id);
        return new ProductResource($product);
    }

    /**
     * @OA\Post(
     *     path="/api/v1/products",
     *     summary="Create a new product",
     *     tags={"Products"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"internal_code","identifier","name","price","category_id","brand_id","supplier_id"},
     *             @OA\Property(property="internal_code", type="string", example="PROD-001"),
     *             @OA\Property(property="identifier", type="string", example="ESS-SV-PREMIUM"),
     *             @OA\Property(property="name", type="string", example="Essilor Single Vision Premium"),
     *             @OA\Property(property="description", type="string", nullable=true, example="High quality single vision lens"),
     *             @OA\Property(property="price", type="number", format="float", example=199.99),
     *             @OA\Property(property="cost", type="number", format="float", nullable=true, example=99.99),
     *             @OA\Property(property="category_id", type="integer", example=1),
     *             @OA\Property(property="brand_id", type="integer", example=1),
     *             @OA\Property(property="supplier_id", type="integer", example=1),
     *             @OA\Property(property="status", type="string", enum={"active","inactive"}, example="active")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Product created successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="id", type="integer"),
     *             @OA\Property(property="internal_code", type="string"),
     *             @OA\Property(property="name", type="string"),
     *             @OA\Property(property="price", type="number", format="float"),
     *             @OA\Property(property="created_at", type="string", format="date-time")
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function store(StoreProductRequest $request)
    {
        $validatedData = $request->validated();
        $product = $this->productService->createProduct($validatedData);
        return new ProductResource($product);
    }

    /**
     * @OA\Put(
     *     path="/api/v1/products/{id}",
     *     summary="Update product details",
     *     tags={"Products"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, description="Product ID", @OA\Schema(type="integer")),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="internal_code", type="string", example="PROD-001"),
     *             @OA\Property(property="identifier", type="string", example="ESS-SV-PREMIUM"),
     *             @OA\Property(property="name", type="string", example="Essilor Single Vision Premium"),
     *             @OA\Property(property="description", type="string", nullable=true, example="High quality single vision lens"),
     *             @OA\Property(property="price", type="number", format="float", example=199.99),
     *             @OA\Property(property="cost", type="number", format="float", nullable=true, example=99.99),
     *             @OA\Property(property="category_id", type="integer", example=1),
     *             @OA\Property(property="brand_id", type="integer", example=1),
     *             @OA\Property(property="supplier_id", type="integer", example=1),
     *             @OA\Property(property="status", type="string", enum={"active","inactive"}, example="active")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Product updated successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="id", type="integer"),
     *             @OA\Property(property="name", type="string"),
     *             @OA\Property(property="price", type="number", format="float"),
     *             @OA\Property(property="updated_at", type="string", format="date-time")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Product not found"
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function update(UpdateProductRequest $request, $id)
    {
        $productInstance = $this->productService->findProduct($id);
        $validatedData = $request->validated();
        $product = $this->productService->updateProduct($productInstance, $validatedData);
        return new ProductResource($product);
    }

    /**
     * @OA\Delete(
     *     path="/api/v1/products/{id}",
     *     summary="Delete a product",
     *     tags={"Products"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, description="Product ID", @OA\Schema(type="integer")),
     *     @OA\Response(
     *         response=204,
     *         description="Product deleted successfully"
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Product not found"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function destroy($id)
    {
        $productInstance = $this->productService->findProduct($id);
        $this->productService->deleteProduct($productInstance);
        return response()->json(null, 204);
    }

    /**
     * @OA\Get(
     *     path="/api/v1/products/{id}/stock",
     *     summary="Get product stock information",
     *     tags={"Products"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, description="Product ID", @OA\Schema(type="integer")),
     *     @OA\Response(
     *         response=200,
     *         description="Product stock information",
     *         @OA\JsonContent(
     *             @OA\Property(property="product_id", type="integer"),
     *             @OA\Property(property="available_stock", type="integer"),
     *             @OA\Property(property="reserved_stock", type="integer"),
     *             @OA\Property(property="total_stock", type="integer")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Product not found"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function stock(Product $product)
    {
        $stock = $this->productService->getProductStock($product);
        return new ProductStockResource($stock);
    }

    /**
     * @OA\Get(
     *     path="/api/v1/products/{id}/discounts",
     *     summary="Get product discounts",
     *     tags={"Products"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, description="Product ID", @OA\Schema(type="integer")),
     *     @OA\Response(
     *         response=200,
     *         description="Product discounts",
     *         @OA\JsonContent(
     *             type="array",
     *             @OA\Items(
     *                 @OA\Property(property="id", type="integer"),
     *                 @OA\Property(property="discount_percentage", type="number", format="float"),
     *                 @OA\Property(property="start_date", type="string", format="date"),
     *                 @OA\Property(property="end_date", type="string", format="date"),
     *                 @OA\Property(property="is_active", type="boolean")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Product not found"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function discounts(Product $product)
    {
        $discounts = $this->productService->getProductDiscounts($product);
        return new ProductDiscountCollection($discounts);
    }

    /**
     * @OA\Get(
     *     path="/api/v1/products/{id}/inventory",
     *     summary="Get product inventory information",
     *     tags={"Products"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, description="Product ID", @OA\Schema(type="integer")),
     *     @OA\Response(
     *         response=200,
     *         description="Product inventory information",
     *         @OA\JsonContent(
     *             @OA\Property(property="product_id", type="integer"),
     *             @OA\Property(property="warehouse_locations", type="array", @OA\Items(type="object")),
     *             @OA\Property(property="total_quantity", type="integer"),
     *             @OA\Property(property="last_updated", type="string", format="date-time")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Product not found"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function inventory(Product $product)
    {
        $inventory = $this->productService->getProductInventory($product);
        return new ProductInventoryResource($inventory);
    }

    /**
     * @OA\Get(
     *     path="/api/v1/products/category/{categorySlug}",
     *     summary="Get products by category",
     *     tags={"Products"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="categorySlug", in="path", required=true, description="Category slug", @OA\Schema(type="string")),
     *     @OA\Parameter(name="brand_id", in="query", description="Filter by brand", @OA\Schema(type="integer")),
     *     @OA\Parameter(name="supplier_id", in="query", description="Filter by supplier", @OA\Schema(type="integer")),
     *     @OA\Parameter(name="search", in="query", description="Search term", @OA\Schema(type="string")),
     *     @OA\Parameter(name="per_page", in="query", description="Items per page", @OA\Schema(type="integer", default=15)),
     *     @OA\Response(
     *         response=200,
     *         description="Products by category",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="data", type="array", @OA\Items(
     *                 @OA\Property(property="id", type="integer"),
     *                 @OA\Property(property="name", type="string"),
     *                 @OA\Property(property="price", type="number", format="float"),
     *                 @OA\Property(property="category", type="object"),
     *                 @OA\Property(property="brand", type="object")
     *             )),
     *             @OA\Property(property="links", type="object"),
     *             @OA\Property(property="meta", type="object")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Category not found"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function category(Request $request, string $categorySlug)
    {
        $filters = $request->only([
            'brand_id', 'supplier_id', 'search',
            'lens_type_id', 'material_id', 'lens_class_id', 'treatment_id', 'photochromic_id',
            'frame_type', 'gender', 'color', 'shape',
            'contact_type', 'replacement_schedule'
        ]);
        $perPage = min(max(1, (int)$request->get('per_page', 15)), 100);
        
        $products = $this->productService->getProductsByCategory($categorySlug, $filters, $perPage);
        return new ProductCollection($products);
    }

    /**
     * @OA\Post(
     *     path="/api/v1/products/lenses-by-prescription",
     *     summary="Get lenses filtered by prescription",
     *     tags={"Products"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="sphere_od", type="number", format="float", nullable=true, example=-2.5),
     *             @OA\Property(property="cylinder_od", type="number", format="float", nullable=true, example=-1.0),
     *             @OA\Property(property="sphere_os", type="number", format="float", nullable=true, example=-2.0),
     *             @OA\Property(property="cylinder_os", type="number", format="float", nullable=true, example=-0.5),
     *             @OA\Property(property="correction_type", type="string", nullable=true, example="single_vision")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Filtered lenses",
     *         @OA\JsonContent(
     *             type="array",
     *             @OA\Items(
     *                 @OA\Property(property="id", type="integer"),
     *                 @OA\Property(property="name", type="string"),
     *                 @OA\Property(property="price", type="number", format="float"),
     *                 @OA\Property(property="lens_type", type="object"),
     *                 @OA\Property(property="material", type="object")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function lensesByPrescription(LensesByPrescriptionRequest $request)
    {
        $prescriptionData = $request->validated();
        $lenses = $this->productService->getLensesByPrescriptionFilter($prescriptionData);
        return ProductResource::collection($lenses);
    }

    /**
     * @OA\Patch(
     *     path="/api/v1/products/bulk-update-status",
     *     summary="Bulk update product status",
     *     tags={"Products"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"product_ids","status"},
     *             @OA\Property(property="product_ids", type="array", @OA\Items(type="integer"), example={1,2,3}),
     *             @OA\Property(property="status", type="string", enum={"active","inactive"}, example="active")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Products status updated successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string"),
     *             @OA\Property(property="updated_count", type="integer")
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function bulkUpdateStatus(BulkUpdateStatusRequest $request)
    {
        $validatedData = $request->validated();
        $updatedCount = $this->productService->bulkUpdateStatus(
            $validatedData['product_ids'], 
            $validatedData['status']
        );
        
        return new ActionStatusResource(
            null,
            'Estados de productos actualizados correctamente.',
            ['updated_count' => $updatedCount]
        );
    }

    /**
     * @OA\Get(
     *     path="/api/v1/products/search",
     *     summary="Search products",
     *     tags={"Products"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="query", in="query", required=true, description="Search query", @OA\Schema(type="string")),
     *     @OA\Parameter(name="category", in="query", description="Filter by category", @OA\Schema(type="string")),
     *     @OA\Parameter(name="limit", in="query", description="Limit results", @OA\Schema(type="integer", default=20)),
     *     @OA\Response(
     *         response=200,
     *         description="Search results",
     *         @OA\JsonContent(
     *             type="array",
     *             @OA\Items(
     *                 @OA\Property(property="id", type="integer"),
     *                 @OA\Property(property="name", type="string"),
     *                 @OA\Property(property="internal_code", type="string"),
     *                 @OA\Property(property="price", type="number", format="float"),
     *                 @OA\Property(property="category", type="object"),
     *                 @OA\Property(property="brand", type="object")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function search(SearchProductRequest $request)
    {
        $validatedData = $request->validated();
        $products = $this->productService->searchProducts(
            $validatedData['query'],
            $validatedData['category'] ?? null,
            $validatedData['limit'] ?? 20
        );
        return ProductResource::collection($products);
    }

    /**
     * @OA\Get(
     *     path="/api/v1/products/{id}/discount-info",
     *     summary="Get product discount information",
     *     tags={"Products"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, description="Product ID", @OA\Schema(type="integer")),
     *     @OA\Parameter(name="patient_id", in="query", description="Patient ID for personalized discounts", @OA\Schema(type="integer")),
     *     @OA\Response(
     *         response=200,
     *         description="Product discount information",
     *         @OA\JsonContent(
     *             @OA\Property(property="has_discounts", type="boolean"),
     *             @OA\Property(property="best_discount", type="object"),
     *             @OA\Property(property="applicable_discounts", type="array", @OA\Items(type="object"))
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Product not found"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function discountInfo(Request $request, Product $product)
    {
        $patientId = $request->get('patient_id');
        $discountInfo = $this->discountService->getProductDiscountInfo($product, $patientId);
        
        return new ProductDiscountInfoResource($discountInfo);
    }

    /**
     * @OA\Get(
     *     path="/api/v1/products/{id}/active-discounts",
     *     summary="Get active discounts for product",
     *     tags={"Products"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, description="Product ID", @OA\Schema(type="integer")),
     *     @OA\Response(
     *         response=200,
     *         description="Active discounts for product",
     *         @OA\JsonContent(
     *             type="array",
     *             @OA\Items(
     *                 @OA\Property(property="id", type="integer"),
     *                 @OA\Property(property="discount_percentage", type="number", format="float"),
     *                 @OA\Property(property="start_date", type="string", format="date"),
     *                 @OA\Property(property="end_date", type="string", format="date"),
     *                 @OA\Property(property="description", type="string")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Product not found"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function activeDiscounts(Product $product)
    {
        $discounts = $this->discountService->getActiveDiscountsForProduct($product);
        return new ProductActiveDiscountCollection($discounts);
    }

    /**
     * @OA\Post(
     *     path="/api/v1/products/{id}/calculate-price",
     *     summary="Calculate product price with discounts",
     *     tags={"Products"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, description="Product ID", @OA\Schema(type="integer")),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="quantity", type="integer", example=2),
     *             @OA\Property(property="patient_id", type="integer", nullable=true, example=1)
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Calculated price information",
     *         @OA\JsonContent(
     *             @OA\Property(property="unit_price", type="number", format="float"),
     *             @OA\Property(property="quantity", type="integer"),
     *             @OA\Property(property="subtotal", type="number", format="float"),
     *             @OA\Property(property="discount_percentage", type="number", format="float"),
     *             @OA\Property(property="discount_amount", type="number", format="float"),
     *             @OA\Property(property="final_price", type="number", format="float")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Product not found"
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function calculatePrice(CalculatePriceRequest $request, Product $product)
    {
        $validatedData = $request->validated();
        $quantity = $validatedData['quantity'] ?? 1;
        $patientId = $validatedData['patient_id'] ?? null;

        $priceInfo = $this->discountService->applyDiscountToPrice(
            $product->price * $quantity, 
            $product->id, 
            $patientId
        );
        
        $responseData = array_merge($priceInfo, [
            'quantity' => $quantity,
            'unit_price' => $product->price
        ]);

        return new CalculatedPriceResource($responseData);
    }
} 