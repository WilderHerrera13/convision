<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use Illuminate\Http\Request;
use App\Http\Requests\Api\V1\Brand\StoreBrandRequest;
use App\Http\Requests\Api\V1\Brand\UpdateBrandRequest;
use App\Http\Resources\V1\Brand\BrandResource;
use App\Http\Resources\V1\Brand\BrandCollection;
use App\Services\BrandService;

/**
 * @OA\Tag(
 *     name="Brands",
 *     description="API Endpoints for brand management"
 * )
 */
class BrandController extends Controller
{
    protected $brandService;

    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public function __construct(BrandService $brandService)
    {
        // Apply auth middleware. Adjust as needed for specific roles.
        $this->middleware('auth:api'); 
        $this->brandService = $brandService;
    }

    /**
     * @OA\Get(
     *     path="/api/v1/brands",
     *     summary="Get list of brands",
     *     tags={"Brands"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="per_page",
     *         in="query",
     *         description="Number of items per page",
     *         required=false,
     *         @OA\Schema(type="integer", default=15)
     *     ),
     *      @OA\Parameter(
     *         name="s_f",
     *         in="query",
     *         description="Search fields (JSON array or comma-separated string)",
     *         required=false,
     *         @OA\Schema(type="string")
     *     ),
     *     @OA\Parameter(
     *         name="s_v",
     *         in="query",
     *         description="Search values corresponding to search_fields",
     *         required=false,
     *         @OA\Schema(type="string")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="List of brands retrieved successfully",
     *         @OA\JsonContent(
     *             type="array",
     *             @OA\Items(
     *                 type="object",
     *                 @OA\Property(property="id", type="integer"),
     *                 @OA\Property(property="name", type="string"),
     *                 @OA\Property(property="description", type="string"),
     *                 @OA\Property(property="created_at", type="string", format="date-time"),
     *                 @OA\Property(property="updated_at", type="string", format="date-time")
     *             )
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
        $query = Brand::apiFilter($request);
        
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $brands = $query->paginate($perPage);
        
        return new BrandCollection($brands);
    }

    /**
     * @OA\Post(
     *     path="/api/v1/brands",
     *     summary="Create a new brand",
     *     tags={"Brands"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"name"},
     *             @OA\Property(property="name", type="string", example="Essilor"),
     *             @OA\Property(property="description", type="string", example="High quality lenses")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Brand created successfully"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Unauthorized"
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     )
     * )
     */
    public function store(StoreBrandRequest $request)
    {
        $validatedData = $request->validated();
        $brand = $this->brandService->createBrand($validatedData);
        return new BrandResource($brand);
    }

    /**
     * @OA\Get(
     *     path="/api/v1/brands/{brand}",
     *     summary="Get brand details",
     *     tags={"Brands"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="brand",
     *         in="path",
     *         required=true,
     *         description="Brand ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Brand details retrieved successfully"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Brand not found"
     *     )
     * )
     */
    public function show(Brand $brand)
    {
        return new BrandResource($brand);
    }

    /**
     * @OA\Put(
     *     path="/api/v1/brands/{brand}",
     *     summary="Update brand details",
     *     tags={"Brands"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="brand",
     *         in="path",
     *         required=true,
     *         description="Brand ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"name"},
     *             @OA\Property(property="name", type="string", example="Essilor"),
     *             @OA\Property(property="description", type="string", example="High quality lenses")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Brand updated successfully"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Unauthorized"
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Brand not found"
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     )
     * )
     */
    public function update(UpdateBrandRequest $request, Brand $brand)
    {
        $validatedData = $request->validated();
        $updatedBrand = $this->brandService->updateBrand($brand, $validatedData);
        return new BrandResource($updatedBrand);
    }

    /**
     * @OA\Delete(
     *     path="/api/v1/brands/{brand}",
     *     summary="Delete a brand",
     *     tags={"Brands"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="brand",
     *         in="path",
     *         required=true,
     *         description="Brand ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=204,
     *         description="Brand deleted successfully"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Unauthorized"
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Brand not found"
     *     ),
     *     @OA\Response(
     *         response=422, 
     *         description="Cannot delete, brand is in use"
     *     )
     * )
     */
    public function destroy(Brand $brand)
    {
        $this->brandService->deleteBrand($brand);
        return response()->json(null, 204);
    }
}
