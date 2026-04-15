<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\DailyActivityReport\IndexDailyActivityReportRequest;
use App\Http\Requests\Api\V1\DailyActivityReport\QuickAttentionDailyActivityReportRequest;
use App\Http\Requests\Api\V1\DailyActivityReport\StoreDailyActivityReportRequest;
use App\Http\Requests\Api\V1\DailyActivityReport\UpdateDailyActivityReportRequest;
use App\Http\Resources\V1\DailyActivityReport\DailyActivityReportCollection;
use App\Http\Resources\V1\DailyActivityReport\DailyActivityReportResource;
use App\Models\DailyActivityReport;
use App\Services\DailyActivityReportService;

class DailyActivityReportController extends Controller
{
    public function __construct(private DailyActivityReportService $service)
    {
    }

    public function index(IndexDailyActivityReportRequest $request)
    {
        $query = DailyActivityReport::with('user')->apiFilter($request);

        if (auth()->user()->role !== 'admin') {
            $query->where('user_id', auth()->id());
        }

        $validated = $request->validated();

        if (! empty($validated['date_from'] ?? null)) {
            $query->whereDate('report_date', '>=', $validated['date_from']);
        }
        if (! empty($validated['date_to'] ?? null)) {
            $query->whereDate('report_date', '<=', $validated['date_to']);
        }
        if (auth()->user()->role === 'admin' && ! empty($validated['user_id'] ?? null)) {
            $query->where('user_id', (int) $validated['user_id']);
        }
        if (! empty($validated['shift'] ?? null)) {
            $query->where('shift', $validated['shift']);
        }

        $perPage = min(max(1, (int) $request->get('per_page', 15)), 100);

        return new DailyActivityReportCollection(
            $query->orderByDesc('report_date')->orderByDesc('updated_at')->paginate($perPage)
        );
    }

    public function show($id)
    {
        $report = DailyActivityReport::with('user')->findOrFail($id);

        if (auth()->user()->role !== 'admin' && $report->user_id !== auth()->id()) {
            abort(403);
        }

        return new DailyActivityReportResource($report);
    }

    public function store(StoreDailyActivityReportRequest $request)
    {
        $report = $this->service->create($request->validated(), auth()->id());

        return new DailyActivityReportResource($report->load('user'));
    }

    public function update(UpdateDailyActivityReportRequest $request, $id)
    {
        $report = DailyActivityReport::findOrFail($id);

        if (! $this->service->canEdit($report, auth()->user())) {
            abort(403);
        }

        $report = $this->service->update($report, $request->validated());

        return new DailyActivityReportResource($report->load('user'));
    }

    public function quickAttention(QuickAttentionDailyActivityReportRequest $request)
    {
        $report = $this->service->quickAttentionIncrement($request->validated(), auth()->id());

        return new DailyActivityReportResource($report->load('user'));
    }
}
