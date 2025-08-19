<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Laboratory\StoreLaboratoryRequest;
use App\Http\Requests\Api\V1\Laboratory\UpdateLaboratoryRequest;
use App\Http\Resources\V1\Laboratory\LaboratoryCollection;
use App\Http\Resources\V1\Laboratory\LaboratoryResource;
use App\Models\Laboratory;
use App\Services\LaboratoryService;
use Illuminate\Http\Request;

class LaboratoryController extends Controller
{
    protected $laboratoryService;

    public function __construct(LaboratoryService $laboratoryService)
    {
        $this->middleware('auth:api');
        $this->middleware('admin.role')->except(['index', 'show']);
        $this->laboratoryService = $laboratoryService;
    }

    /**
     * Display a listing of laboratories.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        $query = Laboratory::apiFilter($request);
        
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $laboratories = $query->paginate($perPage);
        
        return new LaboratoryCollection($laboratories);
    }

    /**
     * Store a newly created laboratory.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(StoreLaboratoryRequest $request)
    {
        $validatedData = $request->validated();
        $laboratory = $this->laboratoryService->createLaboratory($validatedData);
        return new LaboratoryResource($laboratory);
    }

    /**
     * Display the specified laboratory.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show(Laboratory $laboratory)
    {
        return new LaboratoryResource($laboratory);
    }

    /**
     * Update the specified laboratory.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function update(UpdateLaboratoryRequest $request, Laboratory $laboratory)
    {
        $validatedData = $request->validated();
        $laboratory = $this->laboratoryService->updateLaboratory($laboratory, $validatedData);
        return new LaboratoryResource($laboratory);
    }

    /**
     * Remove the specified laboratory.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy(Laboratory $laboratory)
    {
        $this->laboratoryService->deleteLaboratory($laboratory);
        return response()->json(null, 204);
    }
} 