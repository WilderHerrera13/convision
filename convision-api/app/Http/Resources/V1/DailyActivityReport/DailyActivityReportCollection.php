<?php

namespace App\Http\Resources\V1\DailyActivityReport;

use Illuminate\Http\Resources\Json\ResourceCollection;

class DailyActivityReportCollection extends ResourceCollection
{
    public function toArray($request): array
    {
        return parent::toArray($request);
    }
}
