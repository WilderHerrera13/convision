<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Warehouse\StoreWarehouseRequest;
use App\Http\Requests\Api\V1\Warehouse\UpdateWarehouseRequest;
use App\Models\Warehouse;
use App\Services\WarehouseService;
use App\Http\Resources\V1\Inventory\WarehouseResource;
use App\Http\Resources\V1\Inventory\WarehouseCollection;
use App\Http\Resources\V1\Inventory\WarehouseLocationCollection;
use Illuminate\Http\Request;

class WarehouseController extends Controller
{
    protected $warehouseService;

    public function __construct(WarehouseService $warehouseService)
    {
        $this->middleware('auth:api');
        $this->warehouseService = $warehouseService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Warehouse::apiFilter($request);
        
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $warehouses = $query->paginate($perPage);
        
        return new WarehouseCollection($warehouses);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreWarehouseRequest $request)
    {
        $validatedData = $request->validated();
        $warehouse = $this->warehouseService->createWarehouse($validatedData);
        return new WarehouseResource($warehouse);
    }

    /**
     * Display the specified resource.
     */
    public function show(Warehouse $warehouse)
    {
        return new WarehouseResource($warehouse);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateWarehouseRequest $request, Warehouse $warehouse)
    {
        $validatedData = $request->validated();
        $warehouse = $this->warehouseService->updateWarehouse($warehouse, $validatedData);
        return new WarehouseResource($warehouse);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Warehouse $warehouse)
    {
        $this->warehouseService->deleteWarehouse($warehouse);
        return response()->json(null, 204);
    }

    /**
     * Get all locations for a specific warehouse.
     */
    public function locations(Request $request, Warehouse $warehouse)
    {
        $locations = $this->warehouseService->getWarehouseLocations($warehouse, $request);
        return new WarehouseLocationCollection($locations);
    }
} 