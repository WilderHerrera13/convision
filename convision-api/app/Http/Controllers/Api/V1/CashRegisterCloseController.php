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
use App\Models\User;
use App\Services\CashRegisterCloseService;
use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;
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
        } else {
            if ($request->filled('user_id')) {
                $query->where('user_id', (int) $request->query('user_id'));
            }
            if ($request->filled('date_from')) {
                $query->whereDate('close_date', '>=', $request->query('date_from'));
            }
            if ($request->filled('date_to')) {
                $query->whereDate('close_date', '<=', $request->query('date_to'));
            }
        }

        if ($request->filled('close_date')) {
            $query->whereDate('close_date', $request->query('close_date'));
        }

        if (!$request->has('sort')) {
            $query->orderByDesc('close_date')->orderByDesc('id');
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

    public function calendarForAdvisor(Request $request)
    {
        $userId = (int) $request->query('user_id');
        abort_unless($userId > 0, 422, 'user_id es requerido.');

        $today = CarbonImmutable::today();
        $to = $request->filled('date_to')
            ? CarbonImmutable::parse($request->query('date_to'))->startOfDay()
            : $today;
        $from = $request->filled('date_from')
            ? CarbonImmutable::parse($request->query('date_from'))->startOfDay()
            : $to->subDays(13);

        if ($from->gt($to)) {
            [$from, $to] = [$to, $from];
        }

        $advisor = User::findOrFail($userId);

        $closes = CashRegisterClose::with(['user', 'payments', 'denominations', 'actualPayments', 'approvedBy'])
            ->where('user_id', $userId)
            ->whereBetween('close_date', [$from->toDateString(), $to->toDateString()])
            ->orderBy('close_date', 'asc')
            ->get();

        $byDate = $closes->keyBy(fn ($c) => $c->close_date?->format('Y-m-d'));

        $locale = 'es';
        $days = [];
        foreach (CarbonPeriod::create($from, $to) as $day) {
            $dateKey = $day->format('Y-m-d');
            $close = $byDate->get($dateKey);
            $days[] = [
                'date' => $dateKey,
                'day_number' => $day->format('d'),
                'day_name' => ucfirst(mb_substr($day->locale($locale)->isoFormat('ddd'), 0, 3)),
                'month_name' => ucfirst(mb_substr($day->locale($locale)->isoFormat('MMM'), 0, 3)),
                'is_today' => $day->isSameDay($today),
                'close' => $close ? $this->formatCloseForCalendar($close) : null,
            ];
        }

        $approved = $closes->where('status', CashRegisterClose::STATUS_APPROVED);
        $pending = $closes->where('status', CashRegisterClose::STATUS_SUBMITTED);

        $approvedDays = $approved->values()->map(function (CashRegisterClose $c, int $i) {
            $advisorTotal = (float) $c->total_counted;
            if ($c->admin_actuals_recorded_at !== null) {
                $actualTotal = (float) $c->total_actual_amount;
                $variance = round($advisorTotal - $actualTotal, 2);
            } else {
                $actualTotal = null;
                $variance = null;
            }

            return [
                'id' => $c->id,
                'index' => $i + 1,
                'close_date' => $c->close_date?->format('Y-m-d'),
                'total_counted' => $advisorTotal,
                'total_actual_amount' => $actualTotal,
                'variance' => $variance,
            ];
        })->all();

        $approvedTotal = array_sum(array_column($approvedDays, 'total_counted'));
        if ($approvedDays === []) {
            $approvedActualTotal = 0;
            $approvedVarianceTotal = 0;
        } else {
            $nonNullActuals = array_values(array_filter(
                array_column($approvedDays, 'total_actual_amount'),
                static fn ($v) => $v !== null
            ));
            $approvedActualTotal = $nonNullActuals === []
                ? null
                : array_sum($nonNullActuals);

            $nonNullVariances = array_values(array_filter(
                array_column($approvedDays, 'variance'),
                static fn ($v) => $v !== null
            ));
            $approvedVarianceTotal = $nonNullVariances === []
                ? null
                : round(array_sum($nonNullVariances), 2);
        }

        return response()->json([
            'data' => [
                'advisor' => [
                    'id' => $advisor->id,
                    'name' => $advisor->name,
                    'last_name' => $advisor->last_name,
                    'role' => $advisor->role,
                ],
                'date_from' => $from->format('Y-m-d'),
                'date_to' => $to->format('Y-m-d'),
                'days' => $days,
                'summary' => [
                    'approved_count' => $approved->count(),
                    'pending_count' => $pending->count(),
                    'approved_total' => $approvedTotal,
                    'approved_actual_total' => $approvedActualTotal === null ? null : round($approvedActualTotal, 2),
                    'approved_variance_total' => $approvedVarianceTotal === null ? null : round($approvedVarianceTotal, 2),
                    'approved_days' => $approvedDays,
                ],
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function formatCloseForCalendar(CashRegisterClose $close): array
    {
        $advisorTotal = (float) $close->total_counted;
        $variance = $close->admin_actuals_recorded_at !== null
            ? round($advisorTotal - (float) $close->total_actual_amount, 2)
            : null;

        return [
            'id' => $close->id,
            'status' => $close->status,
            'total_counted' => $advisorTotal,
            'total_actual_amount' => $close->admin_actuals_recorded_at !== null
                ? (float) $close->total_actual_amount
                : null,
            'cash_counted' => (float) $close->denominations->sum('subtotal'),
            'variance' => $variance,
            'advisor_notes' => $close->advisor_notes,
            'admin_notes' => $close->admin_notes,
            'approved_at' => $close->approved_at?->toIso8601String(),
            'submitted_at' => $close->updated_at?->toIso8601String(),
            'payment_methods' => $close->payments->map(fn ($p) => [
                'name' => $p->payment_method_name,
                'counted_amount' => (float) $p->counted_amount,
            ])->values()->all(),
            'denominations' => $close->denominations->map(fn ($d) => [
                'denomination' => (int) $d->denomination,
                'quantity' => (int) $d->quantity,
                'subtotal' => (float) $d->subtotal,
            ])->values()->all(),
        ];
    }
}
