<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\LensType\StoreLensTypeRequest;
use App\Http\Requests\Api\V1\LensType\UpdateLensTypeRequest;
use App\Http\Resources\V1\Lens\LensTypeCollection;
use App\Http\Resources\V1\Lens\LensTypeResource;
use App\Models\LensType;
use App\Services\LensTypeService;
use Illuminate\Http\Request;

/**
 * @OA\Tag(
 *     name="Lens Types",
 *     description="API Endpoints for lens type management"
 * )
 */
class LensTypeController extends Controller
{
    protected $lensTypeService;

    public function __construct(LensTypeService $lensTypeService)
    {
        $this->middleware('auth:api');
        // $this->middleware('admin.or.specialist.role')->except(['index', 'show']); // TODO: uncomment and implement role middleware
        $this->lensTypeService = $lensTypeService;
    }

    /**
     * @OA\Get(
     *     path="/api/v1/lens-types",
     *     summary="Get list of lens types",
     *     tags={"Lens Types"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="per_page",
     *         in="query",
     *         description="Number of items per page",
     *         @OA\Schema(type="integer", default=15)
     *     ),
     *     @OA\Parameter(
     *         name="page",
     *         in="query",
     *         description="Page number for pagination",
     *         @OA\Schema(type="integer", default=1)
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="List of lens types retrieved successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/LensType")),
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
        $query = LensType::apiFilter($request);
        
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $lensTypes = $query->paginate($perPage);
        
        return new LensTypeCollection($lensTypes);
    }

    /**
     * @OA\Post(
     *     path="/api/v1/lens-types",
     *     summary="Create a new lens type",
     *     tags={"Lens Types"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"name"},
     *             @OA\Property(property="name", type="string", example="Single Vision"),
     *             @OA\Property(property="description", type="string", example="Standard single vision lenses")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Lens type created successfully",
     *         @OA\JsonContent(ref="#/components/schemas/LensType")
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
    public function store(StoreLensTypeRequest $request)
    {
        $validatedData = $request->validated();
        $lensType = $this->lensTypeService->createLensType($validatedData);
        return new LensTypeResource($lensType);
    }

    /**
     * @OA\Get(
     *     path="/api/v1/lens-types/{id}",
     *     summary="Get lens type details",
     *     tags={"Lens Types"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Lens type ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Lens type details retrieved successfully",
     *         @OA\JsonContent(ref="#/components/schemas/LensType")
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Lens type not found"
     *     )
     * )
     */
    public function show(LensType $lensType)
    {
        return new LensTypeResource($lensType);
    }

    /**
     * @OA\Put(
     *     path="/api/v1/lens-types/{id}",
     *     summary="Update lens type details",
     *     tags={"Lens Types"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Lens type ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="name", type="string", example="Single Vision"),
     *             @OA\Property(property="description", type="string", example="Standard single vision lenses")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Lens type updated successfully",
     *         @OA\JsonContent(ref="#/components/schemas/LensType")
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
     *         description="Lens type not found"
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     )
     * )
     */
    public function update(UpdateLensTypeRequest $request, LensType $lensType)
    {
        $validatedData = $request->validated();
        $updatedLensType = $this->lensTypeService->updateLensType($lensType, $validatedData);
        return new LensTypeResource($updatedLensType);
    }

    /**
     * @OA\Delete(
     *     path="/api/v1/lens-types/{id}",
     *     summary="Delete a lens type",
     *     tags={"Lens Types"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Lens type ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=204,
     *         description="Lens type deleted successfully"
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
     *         description="Lens type not found"
     *     )
     * )
     */
    public function destroy(LensType $lensType)
    {
        $this->lensTypeService->deleteLensType($lensType);
        return response()->json(null, 204);
    }
}
