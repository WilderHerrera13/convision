<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\WarehouseLocation\StoreWarehouseLocationRequest;
use App\Http\Requests\Api\V1\WarehouseLocation\UpdateWarehouseLocationRequest;
use App\Models\WarehouseLocation;
use App\Http\Resources\V1\Inventory\WarehouseLocationResource;
use App\Http\Resources\V1\Inventory\WarehouseLocationCollection;
use App\Http\Resources\V1\Inventory\InventoryItemCollection;
use App\Services\WarehouseLocationService;
use Illuminate\Http\Request;

class WarehouseLocationController extends Controller
{
    protected $warehouseLocationService;

    public function __construct(WarehouseLocationService $warehouseLocationService)
    {
        $this->middleware('auth:api');
        $this->warehouseLocationService = $warehouseLocationService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = WarehouseLocation::with('warehouse')->apiFilter($request);
        
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $locations = $query->paginate($perPage);
        return new WarehouseLocationCollection($locations);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreWarehouseLocationRequest $request)
    {
        $validatedData = $request->validated();
        $location = $this->warehouseLocationService->createLocation($validatedData);
        return new WarehouseLocationResource($location);
    }

    /**
     * Display the specified resource.
     */
    public function show(WarehouseLocation $location)
    {
        $location->load('warehouse');
        return new WarehouseLocationResource($location);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateWarehouseLocationRequest $request, WarehouseLocation $location)
    {
        $validatedData = $request->validated();
        $location = $this->warehouseLocationService->updateLocation($location, $validatedData);
        return new WarehouseLocationResource($location);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(WarehouseLocation $location)
    {
        $this->warehouseLocationService->deleteLocation($location);
        return response()->json(null, 204);
    }

    /**
     * Get all inventory items for a specific location.
     */
    public function inventoryItems(Request $request, WarehouseLocation $location)
    {
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $items = $this->warehouseLocationService->getLocationInventoryItems($location, $perPage);
        return new InventoryItemCollection($items);
    }
} 