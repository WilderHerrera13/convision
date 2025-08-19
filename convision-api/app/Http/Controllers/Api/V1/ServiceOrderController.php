<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ServiceOrder\StoreServiceOrderRequest;
use App\Http\Requests\Api\V1\ServiceOrder\UpdateServiceOrderRequest;
use App\Http\Resources\V1\ServiceOrder\ServiceOrderCollection;
use App\Http\Resources\V1\ServiceOrder\ServiceOrderResource;
use App\Models\ServiceOrder;
use App\Services\ServiceOrderService;
use Illuminate\Http\Request;

class ServiceOrderController extends Controller
{
    protected $serviceOrderService;

    public function __construct(ServiceOrderService $serviceOrderService)
    {
        $this->middleware('auth:api');
        $this->serviceOrderService = $serviceOrderService;
    }

    public function index(Request $request)
    {
        $query = ServiceOrder::with(['supplier', 'createdBy'])
            ->apiFilter($request);
        
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $serviceOrders = $query->paginate($perPage);
        
        return new ServiceOrderCollection($serviceOrders);
    }

    public function store(StoreServiceOrderRequest $request)
    {
        $validatedData = $request->validated();
        $serviceOrder = $this->serviceOrderService->createServiceOrder($validatedData);
        return new ServiceOrderResource($serviceOrder);
    }

    public function show(ServiceOrder $serviceOrder)
    {
        $serviceOrder->load(['supplier', 'createdBy']);
        return new ServiceOrderResource($serviceOrder);
    }

    public function update(UpdateServiceOrderRequest $request, ServiceOrder $serviceOrder)
    {
        $validatedData = $request->validated();
        $serviceOrder = $this->serviceOrderService->updateServiceOrder($serviceOrder, $validatedData);
        return new ServiceOrderResource($serviceOrder);
    }

    public function destroy(ServiceOrder $serviceOrder)
    {
        $this->serviceOrderService->deleteServiceOrder($serviceOrder);
        return response()->json(null, 204);
    }

    public function updateStatus(Request $request, ServiceOrder $serviceOrder)
    {
        $request->validate([
            'status' => 'required|in:pending,in_progress,completed,cancelled',
            'observations' => 'nullable|string',
        ]);

        $serviceOrder = $this->serviceOrderService->updateStatus(
            $serviceOrder, 
            $request->status, 
            $request->observations
        );
        
        return new ServiceOrderResource($serviceOrder);
    }

    public function stats(Request $request)
    {
        $stats = $this->serviceOrderService->getServiceOrderStats();
        return response()->json($stats);
    }
} 