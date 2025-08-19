<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\CashTransfer\StoreCashTransferRequest;
use App\Http\Requests\Api\V1\CashTransfer\UpdateCashTransferRequest;
use App\Http\Resources\V1\CashTransfer\CashTransferCollection;
use App\Http\Resources\V1\CashTransfer\CashTransferResource;
use App\Models\CashTransfer;
use App\Services\CashTransferService;
use Illuminate\Http\Request;

class CashTransferController extends Controller
{
    protected $cashTransferService;

    public function __construct(CashTransferService $cashTransferService)
    {
        $this->middleware('auth:api');
        $this->cashTransferService = $cashTransferService;
    }

    public function index(Request $request)
    {
        $query = CashTransfer::with(['createdBy', 'approvedBy'])
            ->apiFilter($request);
        
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $cashTransfers = $query->paginate($perPage);
        
        return new CashTransferCollection($cashTransfers);
    }

    public function store(StoreCashTransferRequest $request)
    {
        $validatedData = $request->validated();
        $cashTransfer = $this->cashTransferService->createCashTransfer($validatedData);
        return new CashTransferResource($cashTransfer);
    }

    public function show(CashTransfer $cashTransfer)
    {
        $cashTransfer->load(['createdBy', 'approvedBy']);
        return new CashTransferResource($cashTransfer);
    }

    public function update(UpdateCashTransferRequest $request, CashTransfer $cashTransfer)
    {
        $validatedData = $request->validated();
        $cashTransfer = $this->cashTransferService->updateCashTransfer($cashTransfer, $validatedData);
        return new CashTransferResource($cashTransfer);
    }

    public function destroy(CashTransfer $cashTransfer)
    {
        $this->cashTransferService->deleteCashTransfer($cashTransfer);
        return response()->json(null, 204);
    }

    public function approve(Request $request, CashTransfer $cashTransfer)
    {
        $request->validate([
            'notes' => 'nullable|string',
        ]);

        $cashTransfer = $this->cashTransferService->approve($cashTransfer, $request->notes);
        
        return new CashTransferResource($cashTransfer);
    }

    public function cancel(Request $request, CashTransfer $cashTransfer)
    {
        $request->validate([
            'notes' => 'nullable|string',
        ]);

        $cashTransfer = $this->cashTransferService->cancel($cashTransfer, $request->notes);
        
        return new CashTransferResource($cashTransfer);
    }

    public function stats(Request $request)
    {
        $stats = $this->cashTransferService->getCashTransferStats();
        return response()->json($stats);
    }
} 