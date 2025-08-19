<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\LensClass;
use App\Http\Requests\Api\V1\LensClass\StoreLensClassRequest;
use App\Http\Requests\Api\V1\LensClass\UpdateLensClassRequest;
use App\Http\Resources\V1\Lens\LensClassResource;
use App\Http\Resources\V1\Lens\LensClassCollection;
use App\Services\LensClassService;

/**
 * @OA\Tag(
 *     name="Lens Classes",
 *     description="API Endpoints for lens class management"
 * )
 */
class LensClassController extends Controller
{
    protected $lensClassService;

    public function __construct(LensClassService $lensClassService)
    {
        // Apply auth middleware. Adjust as needed for specific roles if 'admin.or.specialist.role' middleware is defined elsewhere.
        $this->middleware('auth:api'); 
        $this->lensClassService = $lensClassService;
    }

    /**
     * @OA\Get(
     *     path="/api/v1/lens-classes",
     *     operationId="getLensClasses",
     *     summary="Get list of lens classes",
     *     tags={"Lens Classes"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
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
     *     @OA\Parameter(
     *         name="s_o",
     *         in="query",
     *         description="Search operator (and/or) for multiple conditions",
     *         required=false,
     *         @OA\Schema(
     *             type="string",
     *             enum={"and", "or"}
     *         )
     *     ),
     *     @OA\Parameter(
     *         name="sort",
     *         in="query",
     *         description="Sort by field and direction (format: field,direction)",
     *         required=false,
     *         @OA\Schema(type="string")
     *     ),
     *     @OA\Parameter(
     *         name="per_page",
     *         in="query",
     *         description="Number of items per page",
     *         required=false,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Parameter(
     *         name="page",
     *         in="query",
     *         description="Page number for pagination",
     *         required=false,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="List of lens classes retrieved successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(
     *                 property="data",
     *                 type="array",
     *                 @OA\Items(ref="#/components/schemas/LensClass")
     *             ),
     *             @OA\Property(property="current_page", type="integer"),
     *             @OA\Property(property="per_page", type="integer"),
     *             @OA\Property(property="total", type="integer"),
     *             @OA\Property(property="last_page", type="integer")
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
        $query = LensClass::apiFilter($request);
        
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $lensClasses = $query->paginate($perPage);
        
        return new LensClassCollection($lensClasses);
    }

    /**
     * @OA\Post(
     *     path="/api/v1/lens-classes",
     *     summary="Create a new lens class",
     *     tags={"Lens Classes"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"name"},
     *             @OA\Property(property="name", type="string", example="Premium"),
     *             @OA\Property(property="description", type="string", example="High-end lens class")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Lens class created successfully",
     *         @OA\JsonContent(ref="#/components/schemas/LensClass")
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
    public function store(StoreLensClassRequest $request)
    {
        $validatedData = $request->validated();
        $lensClass = $this->lensClassService->createLensClass($validatedData);
        return new LensClassResource($lensClass);
    }

    /**
     * @OA\Get(
     *     path="/api/v1/lens-classes/{lens_class}",
     *     summary="Get lens class details",
     *     tags={"Lens Classes"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="lens_class",
     *         in="path",
     *         required=true,
     *         description="Lens class ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Lens class details retrieved successfully",
     *         @OA\JsonContent(ref="#/components/schemas/LensClass")
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Lens class not found"
     *     )
     * )
     */
    public function show(LensClass $lens_class) // Route model binding
    {
        return new LensClassResource($lens_class);
    }

    /**
     * @OA\Put(
     *     path="/api/v1/lens-classes/{lens_class}",
     *     summary="Update lens class details",
     *     tags={"Lens Classes"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="lens_class",
     *         in="path",
     *         required=true,
     *         description="Lens class ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="name", type="string", example="Premium"),
     *             @OA\Property(property="description", type="string", example="High-end lens class")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Lens class updated successfully",
     *         @OA\JsonContent(ref="#/components/schemas/LensClass")
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
     *         description="Lens class not found"
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     )
     * )
     */
    public function update(UpdateLensClassRequest $request, LensClass $lens_class) // Route model binding
    {
        $validatedData = $request->validated();
        $updatedLensClass = $this->lensClassService->updateLensClass($lens_class, $validatedData);
        return new LensClassResource($updatedLensClass);
    }

    /**
     * @OA\Delete(
     *     path="/api/v1/lens-classes/{lens_class}",
     *     summary="Delete a lens class",
     *     tags={"Lens Classes"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="lens_class",
     *         in="path",
     *         required=true,
     *         description="Lens class ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=204,
     *         description="Lens class deleted successfully"
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
     *         description="Lens class not found"
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Deletion failed (e.g., in use)"
     *     )
     * )
     */
    public function destroy(LensClass $lens_class) // Route model binding
    {
        $this->lensClassService->deleteLensClass($lens_class);
        return response()->json(null, 204);
    }
}
