<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Location\GetCitiesRequest;
use App\Http\Requests\Api\V1\Location\GetDepartmentsRequest;
use App\Http\Requests\Api\V1\Location\GetDistrictsRequest;
use App\Services\LocationService;
use Illuminate\Http\Request;

class LocationController extends Controller
{
    protected $locationService;

    public function __construct(LocationService $locationService)
    {
        $this->locationService = $locationService;
    }

    /**
     * Get all active countries
     */
    public function countries()
    {
        return $this->locationService->getActiveCountries();
    }

    /**
     * Get departments by country
     */
    public function departments(GetDepartmentsRequest $request)
    {
        $validatedData = $request->validated();
        $countryId = $validatedData['country_id'] ?? null;
        
        return $this->locationService->getDepartmentsByCountry($countryId);
    }

    /**
     * Get cities by department
     */
    public function cities(GetCitiesRequest $request)
    {
        $validatedData = $request->validated();
        $departmentId = $validatedData['department_id'];
        
        return $this->locationService->getCitiesByDepartment($departmentId);
    }

    /**
     * Get districts by city
     */
    public function districts(GetDistrictsRequest $request)
    {
        $validatedData = $request->validated();
        $cityId = $validatedData['city_id'];
        
        return $this->locationService->getDistrictsByCity($cityId);
    }
}
