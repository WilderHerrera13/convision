<?php

namespace App\Services;

use App\Models\Country;
use App\Models\Department;
use App\Models\City;
use App\Models\District;
use Illuminate\Database\Eloquent\Collection;

class LocationService
{
    public function getActiveCountries(): Collection
    {
        return Country::where('is_active', true)
            ->orderBy('name')
            ->get();
    }

    public function getDepartmentsByCountry(?int $countryId = null): Collection
    {
        $query = Department::where('is_active', true);
        
        if ($countryId) {
            $query->where('country_id', $countryId);
        }
        
        return $query->orderBy('name')->get();
    }

    public function getCitiesByDepartment(int $departmentId): Collection
    {
        return City::where('department_id', $departmentId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get();
    }

    public function getDistrictsByCity(int $cityId): Collection
    {
        return District::where('city_id', $cityId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get();
    }
} 