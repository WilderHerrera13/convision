<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use App\Models\IdentificationType;
use App\Models\HealthInsuranceProvider;
use App\Models\AffiliationType;
use App\Models\CoverageType;
use App\Models\EducationLevel;

class PatientLookupController extends Controller
{
    /**
     * Get all active identification types
     */
    public function identificationTypes()
    {
        return Cache::remember('identification_types_list', 60 * 24, function () {
            return IdentificationType::where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'code']);
        });
    }

    /**
     * Get all active health insurance providers
     */
    public function healthInsuranceProviders()
    {
        return Cache::remember('health_insurance_list', 60 * 24, function () {
            return HealthInsuranceProvider::where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name']);
        });
    }

    /**
     * Get all active affiliation types
     */
    public function affiliationTypes()
    {
        return Cache::remember('affiliation_types_list', 60 * 24, function () {
            return AffiliationType::where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name']);
        });
    }

    /**
     * Get all active coverage types
     */
    public function coverageTypes()
    {
        return Cache::remember('coverage_types_list', 60 * 24, function () {
            return CoverageType::where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name']);
        });
    }

    /**
     * Get all active education levels
     */
    public function educationLevels()
    {
        return Cache::remember('education_levels_list', 60 * 24, function () {
            return EducationLevel::where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name']);
        });
    }

    /**
     * Get all patient lookup data in a single request
     */
    public function all()
    {
        return response()->json([
            'identification_types' => $this->identificationTypes(),
            'health_insurance_providers' => $this->healthInsuranceProviders(),
            'affiliation_types' => $this->affiliationTypes(),
            'coverage_types' => $this->coverageTypes(),
            'education_levels' => $this->educationLevels(),
        ]);
    }
}
