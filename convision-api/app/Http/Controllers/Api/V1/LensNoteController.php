<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\LensNote\StoreLensNoteRequest;
use App\Http\Resources\V1\Lens\LensNoteResource;
use App\Http\Resources\V1\Lens\LensNoteCollection;
use App\Models\Lens;
use App\Services\LensNoteService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * @OA\Tag(
 *     name="Lens Notes",
 *     description="API Endpoints for lens notes management"
 * )
 */
class LensNoteController extends Controller
{
    protected $lensNoteService;

    public function __construct(LensNoteService $lensNoteService)
    {
        $this->middleware('auth:api');
        $this->lensNoteService = $lensNoteService;
    }

    /**
     * @OA\Get(
     *     path="/api/v1/lenses/{lens_id}/notes",
     *     summary="Get notes for a specific lens",
     *     tags={"Lens Notes"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="lens_id",
     *         in="path",
     *         required=true,
     *         description="Lens ID",
     *         @OA\Schema(type="integer")
     *     ),
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
     *         description="List of notes retrieved successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="data", type="array", @OA\Items(
     *                 @OA\Property(property="id", type="integer"),
     *                 @OA\Property(property="content", type="string"),
     *                 @OA\Property(property="user", type="object",
     *                     @OA\Property(property="id", type="integer"),
     *                     @OA\Property(property="name", type="string")
     *                 ),
     *                 @OA\Property(property="created_at", type="string", format="date-time")
     *             )),
     *             @OA\Property(property="current_page", type="integer"),
     *             @OA\Property(property="per_page", type="integer"),
     *             @OA\Property(property="total", type="integer"),
     *             @OA\Property(property="last_page", type="integer")
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Lens not found"
     *     )
     * )
     */
    public function index(Request $request, Lens $lens)
    {
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $notes = $this->lensNoteService->getNotesForLens($lens, $perPage);
        return new LensNoteCollection($notes);
    }

    /**
     * @OA\Post(
     *     path="/api/v1/lenses/{lens_id}/notes",
     *     summary="Create a new note for a lens",
     *     tags={"Lens Notes"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="lens_id",
     *         in="path",
     *         required=true,
     *         description="Lens ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"content"},
     *             @OA\Property(property="content", type="string", example="This lens has been updated with new features")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Note created successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="id", type="integer"),
     *             @OA\Property(property="content", type="string"),
     *             @OA\Property(property="user", type="object",
     *                 @OA\Property(property="id", type="integer"),
     *                 @OA\Property(property="name", type="string")
     *             ),
     *             @OA\Property(property="created_at", type="string", format="date-time")
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Lens not found"
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     )
     * )
     */
    public function store(StoreLensNoteRequest $request, Lens $lens)
    {
        $validatedData = $request->validated();
        $user = Auth::user();
        
        $note = $this->lensNoteService->createNoteForLens($lens, $validatedData['content'], $user);
        return new LensNoteResource($note);
    }
}
