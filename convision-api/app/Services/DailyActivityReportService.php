<?php

namespace App\Services;

use App\Models\DailyActivityReport;
use App\Models\User;

class DailyActivityReportService
{
    public function create(array $validated, int $userId): DailyActivityReport
    {
        $validated['user_id'] = $userId;

        return DailyActivityReport::create($validated);
    }

    public function update(DailyActivityReport $report, array $validated): DailyActivityReport
    {
        $report->update($validated);

        return $report->fresh();
    }

    public function canEdit(DailyActivityReport $report, User $user): bool
    {
        if ($user->role === User::ROLE_ADMIN) {
            return true;
        }

        return $report->user_id === $user->id
            && $report->report_date->isToday();
    }
}
