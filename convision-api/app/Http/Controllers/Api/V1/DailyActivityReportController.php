<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\DailyActivityReport\StoreDailyActivityReportRequest;
use App\Http\Requests\Api\V1\DailyActivityReport\UpdateDailyActivityReportRequest;
use App\Http\Resources\V1\DailyActivityReport\DailyActivityReportCollection;
use App\Http\Resources\V1\DailyActivityReport\DailyActivityReportResource;
use App\Models\DailyActivityReport;
use App\Services\DailyActivityReportService;
use Illuminate\Http\Request;

class DailyActivityReportController extends Controller
{
    public function __construct(private DailyActivityReportService $service)
    {
    }

    public function index(Request $request)
    {
        $query = DailyActivityReport::with('user')->apiFilter($request);

        if (auth()->user()->role !== 'admin') {
            $query->where('user_id', auth()->id());
        }

        $perPage = min(max(1, (int) $request->get('per_page', 15)), 100);

        return new DailyActivityReportCollection($query->latest('report_date')->paginate($perPage));
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

        if (auth()->user()->role !== 'admin' && $report->user_id !== auth()->id()) {
            abort(403);
        }

        $report = $this->service->update($report, $request->validated());

        return new DailyActivityReportResource($report->load('user'));
    }
}
