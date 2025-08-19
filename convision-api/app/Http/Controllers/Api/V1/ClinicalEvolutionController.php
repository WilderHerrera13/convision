<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ClinicalEvolution\StoreClinicalEvolutionRequest;
use App\Http\Requests\Api\V1\ClinicalEvolution\UpdateClinicalEvolutionRequest;
use App\Http\Requests\Api\V1\ClinicalEvolution\CreateClinicalEvolutionFromAppointmentRequest;
use App\Models\ClinicalEvolution;
use App\Models\Appointment;
use App\Services\ClinicalEvolutionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Http\Resources\V1\Clinical\ClinicalEvolutionResource;
use App\Http\Resources\V1\Clinical\ClinicalEvolutionCollection;

class ClinicalEvolutionController extends Controller
{
    protected $clinicalEvolutionService;

    public function __construct(ClinicalEvolutionService $clinicalEvolutionService)
    {
        $this->middleware('auth:api');
        $this->clinicalEvolutionService = $clinicalEvolutionService;
    }

    public function index(Request $request, $historyId)
    {
        // Validate that historyId is a valid integer
        if (!is_numeric($historyId) || (int)$historyId <= 0) {
            return response()->json([
                'message' => 'Invalid clinical history ID provided'
            ], 400);
        }
        
        $user = Auth::user();
        $query = $this->clinicalEvolutionService->getFilteredEvolutions($request, (int)$historyId, $user);
        
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $evolutions = $query->paginate($perPage);
        return new ClinicalEvolutionCollection($evolutions);
    }

    public function store(StoreClinicalEvolutionRequest $request)
    {
        $validatedData = $request->validated();
        $user = Auth::user();

        $evolution = $this->clinicalEvolutionService->createEvolution($validatedData, $user);
        return new ClinicalEvolutionResource($evolution);
    }

    public function show($id)
    {
        $user = Auth::user();
        $evolution = $this->clinicalEvolutionService->getEvolutionForUser($id, $user);
        return new ClinicalEvolutionResource($evolution);
    }

    public function update(UpdateClinicalEvolutionRequest $request, ClinicalEvolution $clinical_evolution)
    {
        $validatedData = $request->validated();
        $user = Auth::user();

        $evolution = $this->clinicalEvolutionService->updateEvolution($clinical_evolution, $validatedData, $user);
        return new ClinicalEvolutionResource($evolution);
    }

    public function destroy($id)
    {
        $user = Auth::user();
        $this->clinicalEvolutionService->deleteEvolution($id, $user);
        return response()->json(null, 204);
    }

    public function createFromAppointment(CreateClinicalEvolutionFromAppointmentRequest $request, $appointmentId)
    {
        $validatedData = $request->validated();
        $user = Auth::user();

        // Manually find the appointment with patient relationship loaded
        $appointment = Appointment::with('patient')->findOrFail($appointmentId);

        $evolution = $this->clinicalEvolutionService->createEvolutionFromAppointment($appointment, $validatedData, $user);
        return new ClinicalEvolutionResource($evolution);
    }
} 