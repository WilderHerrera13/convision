<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Material;
use App\Http\Requests\Api\V1\Material\StoreMaterialRequest;
use App\Http\Requests\Api\V1\Material\UpdateMaterialRequest;
use App\Http\Resources\V1\Material\MaterialResource;
use App\Http\Resources\V1\Material\MaterialCollection;
use App\Services\MaterialService;

class MaterialController extends Controller
{
    protected $materialService;

    public function __construct(MaterialService $materialService)
    {
        // Apply auth middleware. Adjust as needed for specific roles.
        $this->middleware('auth:api');
        $this->materialService = $materialService;
    }

    /**
     * Display a listing of the resource.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        $query = Material::apiFilter($request);
        
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $materials = $query->paginate($perPage);
        
        return new MaterialCollection($materials);
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  StoreMaterialRequest  $request
     * @return \Illuminate\Http\Response
     */
    public function store(StoreMaterialRequest $request)
    {
        $validatedData = $request->validated();
        $material = $this->materialService->createMaterial($validatedData);
        return new MaterialResource($material);
    }

    /**
     * Display the specified resource.
     *
     * @param  Material $material
     * @return \Illuminate\Http\Response
     */
    public function show(Material $material)
    {
        return new MaterialResource($material);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  UpdateMaterialRequest  $request
     * @param  Material $material
     * @return \Illuminate\Http\Response
     */
    public function update(UpdateMaterialRequest $request, Material $material)
    {
        $validatedData = $request->validated();
        $updatedMaterial = $this->materialService->updateMaterial($material, $validatedData);
        return new MaterialResource($updatedMaterial);
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  Material $material
     * @return \Illuminate\Http\Response
     */
    public function destroy(Material $material)
    {
        $this->materialService->deleteMaterial($material);
        return response()->json(null, 204);
    }
}
