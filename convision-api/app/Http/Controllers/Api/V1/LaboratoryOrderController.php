<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\LaboratoryOrder\StoreLaboratoryOrderRequest;
use App\Http\Requests\Api\V1\LaboratoryOrder\UpdateLaboratoryOrderRequest;
use App\Http\Requests\Api\V1\LaboratoryOrder\UpdateLaboratoryOrderStatusRequest;
use App\Models\LaboratoryOrder;
use App\Services\LaboratoryOrderService;
use App\Http\Resources\V1\LaboratoryOrder\LaboratoryOrderResource;
use App\Http\Resources\V1\LaboratoryOrder\LaboratoryOrderCollection;
use App\Http\Resources\V1\LaboratoryOrder\LaboratoryOrderStatsResource;
use Illuminate\Http\Request;

class LaboratoryOrderController extends Controller
{
    protected $laboratoryOrderService;

    /**
     * Constructor to apply middleware
     */
    public function __construct(LaboratoryOrderService $laboratoryOrderService)
    {
        $this->middleware('auth:api');
        $this->laboratoryOrderService = $laboratoryOrderService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = LaboratoryOrder::with(['laboratory', 'patient', 'createdBy', 'order.items.lens', 'sale'])
            ->apiFilter($request)
            ->orderBy('created_at', 'desc');
        
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $laboratoryOrders = $query->paginate($perPage);
        
        return new LaboratoryOrderCollection($laboratoryOrders);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreLaboratoryOrderRequest $request)
    {
        $validatedData = $request->validated();
        $laboratoryOrder = $this->laboratoryOrderService->createLaboratoryOrder($validatedData);
        return new LaboratoryOrderResource($laboratoryOrder);
    }

    /**
     * Display the specified resource.
     */
    public function show(LaboratoryOrder $laboratoryOrder)
    {
        $laboratoryOrder->load([
            'laboratory', 
            'patient', 
            'createdBy', 
            'order.items.lens', 
            'sale',
            'statusHistory.user'
        ]);
        
        return new LaboratoryOrderResource($laboratoryOrder);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateLaboratoryOrderRequest $request, LaboratoryOrder $laboratoryOrder)
    {
        $validatedData = $request->validated();
        $updatedOrder = $this->laboratoryOrderService->updateLaboratoryOrder($laboratoryOrder, $validatedData);
        return new LaboratoryOrderResource($updatedOrder);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(LaboratoryOrder $laboratoryOrder)
    {
        $this->laboratoryOrderService->deleteLaboratoryOrder($laboratoryOrder);
        return response()->json(null, 204);
    }

    /**
     * Update the status of a laboratory order.
     */
    public function updateStatus(UpdateLaboratoryOrderStatusRequest $request, LaboratoryOrder $laboratoryOrder)
    {
        $validatedData = $request->validated();
        $updatedOrder = $this->laboratoryOrderService->updateLaboratoryOrderStatus(
            $laboratoryOrder,
            $validatedData['status'],
            $validatedData['notes'] ?? null
        );
        
        return new LaboratoryOrderResource($updatedOrder);
    }

    /**
     * Get statistics for laboratory orders.
     */
    public function stats()
    {
        $stats = $this->laboratoryOrderService->getLaboratoryOrderStats();
        return new LaboratoryOrderStatsResource($stats);
    }
}
