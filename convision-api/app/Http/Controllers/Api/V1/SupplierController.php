<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Supplier\StoreSupplierRequest;
use App\Http\Requests\Api\V1\Supplier\UpdateSupplierRequest;
use App\Http\Resources\V1\Supplier\SupplierCollection;
use App\Http\Resources\V1\Supplier\SupplierResource;
use App\Models\Supplier;
use App\Services\SupplierService;
use Illuminate\Http\Request;

/**
 * @OA\Tag(
 *     name="Suppliers",
 *     description="API Endpoints for supplier management"
 * )
 */
class SupplierController extends Controller
{
    protected $supplierService;

    public function __construct(SupplierService $supplierService)
    {
        $this->middleware('auth:api');
        $this->supplierService = $supplierService;
    }

    /**
     * @OA\Get(
     *     path="/api/v1/suppliers",
     *     summary="Get list of suppliers",
     *     tags={"Suppliers"},
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
     *                 @OA\Property(property="name", type="string"),
     *                 @OA\Property(property="contact_person", type="string", nullable=true),
     *                 @OA\Property(property="email", type="string", nullable=true),
     *                 @OA\Property(property="phone", type="string", nullable=true),
     *                 @OA\Property(property="address", type="string", nullable=true),
     *                 @OA\Property(property="city", type="string", nullable=true),
     *                 @OA\Property(property="country", type="string", nullable=true),
     *                 @OA\Property(property="status", type="string", enum={"active","inactive"}),
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
        $query = Supplier::apiFilter($request);
        
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $suppliers = $query->paginate($perPage);
        
        return new SupplierCollection($suppliers);
    }

    /**
     * @OA\Post(
     *     path="/api/v1/suppliers",
     *     summary="Create a new supplier",
     *     tags={"Suppliers"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"name"},
     *             @OA\Property(property="name", type="string", example="Essilor International"),
     *             @OA\Property(property="contact_person", type="string", nullable=true, example="John Smith"),
     *             @OA\Property(property="email", type="string", format="email", nullable=true, example="contact@essilor.com"),
     *             @OA\Property(property="phone", type="string", nullable=true, example="+1234567890"),
     *             @OA\Property(property="address", type="string", nullable=true, example="123 Main Street"),
     *             @OA\Property(property="city", type="string", nullable=true, example="Paris"),
     *             @OA\Property(property="state", type="string", nullable=true, example="Île-de-France"),
     *             @OA\Property(property="country", type="string", nullable=true, example="France"),
     *             @OA\Property(property="postal_code", type="string", nullable=true, example="75001"),
     *             @OA\Property(property="website", type="string", nullable=true, example="https://www.essilor.com"),
     *             @OA\Property(property="tax_id", type="string", nullable=true, example="FR123456789"),
     *             @OA\Property(property="notes", type="string", nullable=true, example="Premium lens supplier"),
     *             @OA\Property(property="status", type="string", enum={"active","inactive"}, example="active")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Supplier created successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="id", type="integer"),
     *             @OA\Property(property="name", type="string"),
     *             @OA\Property(property="email", type="string"),
     *             @OA\Property(property="status", type="string"),
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
    public function store(StoreSupplierRequest $request)
    {
        $validatedData = $request->validated();
        $supplier = $this->supplierService->createSupplier($validatedData);
        return new SupplierResource($supplier);
    }

    /**
     * @OA\Get(
     *     path="/api/v1/suppliers/{id}",
     *     summary="Get supplier details",
     *     tags={"Suppliers"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, description="Supplier ID", @OA\Schema(type="integer")),
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(
     *             @OA\Property(property="id", type="integer"),
     *             @OA\Property(property="name", type="string"),
     *             @OA\Property(property="contact_person", type="string", nullable=true),
     *             @OA\Property(property="email", type="string", nullable=true),
     *             @OA\Property(property="phone", type="string", nullable=true),
     *             @OA\Property(property="address", type="string", nullable=true),
     *             @OA\Property(property="city", type="string", nullable=true),
     *             @OA\Property(property="state", type="string", nullable=true),
     *             @OA\Property(property="country", type="string", nullable=true),
     *             @OA\Property(property="postal_code", type="string", nullable=true),
     *             @OA\Property(property="website", type="string", nullable=true),
     *             @OA\Property(property="tax_id", type="string", nullable=true),
     *             @OA\Property(property="notes", type="string", nullable=true),
     *             @OA\Property(property="status", type="string"),
     *             @OA\Property(property="created_at", type="string", format="date-time"),
     *             @OA\Property(property="updated_at", type="string", format="date-time")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Supplier not found"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function show(Supplier $supplier)
    {
        return new SupplierResource($supplier);
    }

    /**
     * @OA\Put(
     *     path="/api/v1/suppliers/{id}",
     *     summary="Update supplier details",
     *     tags={"Suppliers"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, description="Supplier ID", @OA\Schema(type="integer")),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="name", type="string", example="Essilor International"),
     *             @OA\Property(property="contact_person", type="string", nullable=true, example="John Smith"),
     *             @OA\Property(property="email", type="string", format="email", nullable=true, example="contact@essilor.com"),
     *             @OA\Property(property="phone", type="string", nullable=true, example="+1234567890"),
     *             @OA\Property(property="address", type="string", nullable=true, example="123 Main Street"),
     *             @OA\Property(property="city", type="string", nullable=true, example="Paris"),
     *             @OA\Property(property="state", type="string", nullable=true, example="Île-de-France"),
     *             @OA\Property(property="country", type="string", nullable=true, example="France"),
     *             @OA\Property(property="postal_code", type="string", nullable=true, example="75001"),
     *             @OA\Property(property="website", type="string", nullable=true, example="https://www.essilor.com"),
     *             @OA\Property(property="tax_id", type="string", nullable=true, example="FR123456789"),
     *             @OA\Property(property="notes", type="string", nullable=true, example="Premium lens supplier"),
     *             @OA\Property(property="status", type="string", enum={"active","inactive"}, example="active")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Supplier updated successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="id", type="integer"),
     *             @OA\Property(property="name", type="string"),
     *             @OA\Property(property="email", type="string"),
     *             @OA\Property(property="status", type="string"),
     *             @OA\Property(property="updated_at", type="string", format="date-time")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Supplier not found"
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
    public function update(UpdateSupplierRequest $request, Supplier $supplier)
    {
        $validatedData = $request->validated();
        $supplier = $this->supplierService->updateSupplier($supplier, $validatedData);
        return new SupplierResource($supplier);
    }

    /**
     * @OA\Delete(
     *     path="/api/v1/suppliers/{id}",
     *     summary="Delete a supplier",
     *     tags={"Suppliers"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, description="Supplier ID", @OA\Schema(type="integer")),
     *     @OA\Response(
     *         response=204,
     *         description="Supplier deleted successfully"
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Supplier not found"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function destroy(Supplier $supplier)
    {
        $this->supplierService->deleteSupplier($supplier);
        return response()->json(null, 204);
    }
}
