<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\CashRegisterClose\ApproveCashRegisterCloseRequest;
use App\Http\Requests\Api\V1\CashRegisterClose\StoreCashRegisterCloseRequest;
use App\Http\Requests\Api\V1\CashRegisterClose\UpdateCashRegisterCloseRequest;
use App\Http\Resources\V1\CashRegisterClose\CashRegisterCloseCollection;
use App\Http\Resources\V1\CashRegisterClose\CashRegisterCloseResource;
use App\Models\CashRegisterClose;
use App\Services\CashRegisterCloseService;
use Illuminate\Http\Request;

class CashRegisterCloseController extends Controller
{
    protected CashRegisterCloseService $service;

    public function __construct(CashRegisterCloseService $service)
    {
        $this->middleware('auth:api');
        $this->service = $service;
    }

    public function index(Request $request)
    {
        $query = CashRegisterClose::with(['user', 'approvedBy'])
            ->apiFilter($request);

        if (auth()->user()->role !== 'admin') {
            $query->where('user_id', auth()->id());
        }

        $perPage = min(max(1, (int) $request->get('per_page', 15)), 100);

        return new CashRegisterCloseCollection($query->paginate($perPage));
    }

    public function show($id)
    {
        $close = CashRegisterClose::with(['user', 'approvedBy', 'payments', 'denominations'])
            ->findOrFail($id);

        $this->authorize('view', $close);

        return new CashRegisterCloseResource($close);
    }

    public function store(StoreCashRegisterCloseRequest $request)
    {
        $close = $this->service->createWithDetails($request->validated(), auth()->id());

        return new CashRegisterCloseResource($close->load(['user', 'payments', 'denominations']));
    }

    public function update(UpdateCashRegisterCloseRequest $request, $id)
    {
        $close = CashRegisterClose::findOrFail($id);

        $this->authorize('update', $close);

        $close = $this->service->updateWithDetails($close, $request->validated());

        return new CashRegisterCloseResource($close->load(['user', 'payments', 'denominations']));
    }

    public function destroy($id)
    {
        $close = CashRegisterClose::findOrFail($id);

        $this->authorize('update', $close);

        $close->delete();

        return response()->json(null, 204);
    }

    public function submit($id)
    {
        $close = CashRegisterClose::findOrFail($id);

        $this->authorize('update', $close);

        return new CashRegisterCloseResource($this->service->submit($close));
    }

    public function approve(ApproveCashRegisterCloseRequest $request, $id)
    {
        $close = CashRegisterClose::findOrFail($id);

        return new CashRegisterCloseResource(
            $this->service->approve($close, auth()->id(), $request->admin_notes)
        );
    }
}
