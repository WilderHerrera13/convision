<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\InventoryTransfer\StoreInventoryTransferRequest;
use App\Http\Requests\Api\V1\InventoryTransfer\UpdateInventoryTransferRequest;
use App\Http\Resources\V1\Inventory\InventoryTransferResource;
use App\Http\Resources\V1\Inventory\InventoryTransferCollection;
use App\Models\InventoryTransfer;
use App\Services\InventoryTransferService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class InventoryTransferController extends Controller
{
    protected $inventoryTransferService;

    public function __construct(InventoryTransferService $inventoryTransferService)
    {
        $this->middleware('auth:api');
        $this->inventoryTransferService = $inventoryTransferService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = InventoryTransfer::with([
                'lens',
                'sourceLocation.warehouse',
                'destinationLocation.warehouse',
                'transferredBy'
            ])
            ->apiFilter($request);
        
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $transfers = $query->paginate($perPage);
        
        return new InventoryTransferCollection($transfers);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreInventoryTransferRequest $request)
    {
        $validatedData = $request->validated();
        $user = Auth::user();
        
        $transfer = $this->inventoryTransferService->createTransfer($validatedData, $user);
        return new InventoryTransferResource($transfer);
    }

    /**
     * Display the specified resource.
     */
    public function show(InventoryTransfer $transfer)
    {
        $transfer->load([
            'lens',
            'sourceLocation.warehouse',
            'destinationLocation.warehouse',
            'transferredBy'
        ]);
        
        return new InventoryTransferResource($transfer);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateInventoryTransferRequest $request, InventoryTransfer $transfer)
    {
        $validatedData = $request->validated();
        
        $transfer = $this->inventoryTransferService->updateTransfer($transfer, $validatedData);
        return new InventoryTransferResource($transfer);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(InventoryTransfer $transfer)
    {
        $this->inventoryTransferService->deleteTransfer($transfer);
        return response()->json(null, 204);
    }
} 