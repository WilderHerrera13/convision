<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ClinicalHistory\StoreClinicalHistoryRequest;
use App\Http\Requests\Api\V1\ClinicalHistory\UpdateClinicalHistoryRequest;
use App\Models\ClinicalHistory;
use App\Services\ClinicalHistoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Http\Resources\V1\Clinical\ClinicalHistoryResource;
use App\Http\Resources\V1\Clinical\ClinicalHistoryCollection;

class ClinicalHistoryController extends Controller
{
    protected $clinicalHistoryService;

    public function __construct(ClinicalHistoryService $clinicalHistoryService)
    {
        $this->middleware('auth:api');
        $this->clinicalHistoryService = $clinicalHistoryService;
    }

    public function index(Request $request)
    {
        $user = Auth::user();
        $query = $this->clinicalHistoryService->getFilteredHistories($request, $user);
        
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $histories = $query->paginate($perPage);
        return new ClinicalHistoryCollection($histories);
    }

    public function store(StoreClinicalHistoryRequest $request)
    {
        $validatedData = $request->validated();
        $user = Auth::user();

        $history = $this->clinicalHistoryService->createHistory($validatedData, $user);
        return new ClinicalHistoryResource($history);
    }

    public function show($id)
    {
        $user = Auth::user();
        $history = $this->clinicalHistoryService->getHistoryForUser($id, $user);
        return new ClinicalHistoryResource($history);
    }

    public function update(UpdateClinicalHistoryRequest $request, ClinicalHistory $clinical_history)
    {
        $validatedData = $request->validated();
        $user = Auth::user();
        
        $history = $this->clinicalHistoryService->updateHistory($clinical_history, $validatedData, $user);
        return new ClinicalHistoryResource($history);
    }

    public function patientHistory($patientId)
    {
        $user = Auth::user();
        $history = $this->clinicalHistoryService->getPatientHistory($patientId, $user);
        
        if (!$history) {
            return response()->json([
                'message' => 'No clinical history found for this patient'
            ], 404);
        }
        
        return new ClinicalHistoryResource($history);
    }
} 