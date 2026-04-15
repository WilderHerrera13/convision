<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\CashRegisterClose\ApproveCashRegisterCloseRequest;
use App\Http\Requests\Api\V1\CashRegisterClose\PutCashRegisterCloseAdminActualsRequest;
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

    public function show(Request $request, $id)
    {
        $with = ['user', 'approvedBy', 'payments', 'denominations'];
        if ($request->user() && $request->user()->role === 'admin') {
            $with[] = 'actualPayments';
        }

        $close = CashRegisterClose::with($with)->findOrFail($id);

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

    public function returnToDraft(ApproveCashRegisterCloseRequest $request, $id)
    {
        $close = CashRegisterClose::findOrFail($id);

        return new CashRegisterCloseResource(
            $this->service->returnToDraft($close, $request->admin_notes)
        );
    }

    public function putAdminActuals(PutCashRegisterCloseAdminActualsRequest $request, $id)
    {
        $close = CashRegisterClose::findOrFail($id);

        $this->authorize('view', $close);

        $close = $this->service->syncAdminActualAmounts(
            $close,
            $request->validated()['actual_payment_methods']
        );

        return new CashRegisterCloseResource($close);
    }

    public function advisorsPending(Request $request)
    {
        $closes = CashRegisterClose::with(['user'])
            ->whereIn('status', [CashRegisterClose::STATUS_SUBMITTED, CashRegisterClose::STATUS_DRAFT])
            ->orderBy('close_date', 'desc')
            ->get();

        $grouped = $closes->groupBy('user_id')->map(function ($userCloses) {
            $user = $userCloses->first()->user;
            $latestClose = $userCloses->first();
            $previousClose = $userCloses->skip(1)->first();

            $accumulatedVariance = $userCloses
                ->filter(fn($c) => $c->total_actual_amount !== null)
                ->sum(fn($c) => (float) $c->total_actual_amount - (float) $c->total_counted);

            $hasVariance = $userCloses->contains(fn($c) => $c->total_actual_amount !== null);

            return [
                'user_id' => $user?->id,
                'user_name' => $user ? trim($user->name . ' ' . ($user->last_name ?? '')) : 'Sin nombre',
                'pending_count' => $userCloses->count(),
                'close_dates' => $userCloses->pluck('close_date')->map(fn($d) => is_string($d) ? $d : $d->toDateString())->toArray(),
                'total_today' => (float) ($latestClose->total_counted ?? 0),
                'total_yesterday' => $previousClose ? (float) ($previousClose->total_counted ?? 0) : null,
                'accumulated_variance' => $hasVariance ? $accumulatedVariance : null,
                'latest_status' => $latestClose->status,
                'closes' => $userCloses->map(fn($c) => [
                    'id' => $c->id,
                    'close_date' => is_string($c->close_date) ? $c->close_date : $c->close_date->toDateString(),
                    'status' => $c->status,
                    'total_counted' => (float) $c->total_counted,
                ])->values(),
            ];
        })->values();

        return response()->json(['data' => $grouped]);
    }
}
