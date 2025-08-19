<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Treatment;
use App\Http\Requests\Api\V1\Treatment\StoreTreatmentRequest;
use App\Http\Requests\Api\V1\Treatment\UpdateTreatmentRequest;
use App\Http\Resources\V1\Treatment\TreatmentResource;
use App\Http\Resources\V1\Treatment\TreatmentCollection;
use App\Services\TreatmentService;

class TreatmentController extends Controller
{
    protected $treatmentService;

    public function __construct(TreatmentService $treatmentService)
    {
        // Apply auth middleware. Adjust as needed for specific roles.
        $this->middleware('auth:api');
        $this->treatmentService = $treatmentService;
    }

    /**
     * Display a listing of the resource.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        $query = Treatment::apiFilter($request);
        
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $treatments = $query->paginate($perPage);
        
        return new TreatmentCollection($treatments);
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  StoreTreatmentRequest  $request
     * @return \Illuminate\Http\Response
     */
    public function store(StoreTreatmentRequest $request)
    {
        $validatedData = $request->validated();
        $treatment = $this->treatmentService->createTreatment($validatedData);
        return new TreatmentResource($treatment);
    }

    /**
     * Display the specified resource.
     *
     * @param  Treatment $treatment
     * @return \Illuminate\Http\Response
     */
    public function show(Treatment $treatment)
    {
        return new TreatmentResource($treatment);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  UpdateTreatmentRequest  $request
     * @param  Treatment $treatment
     * @return \Illuminate\Http\Response
     */
    public function update(UpdateTreatmentRequest $request, Treatment $treatment)
    {
        $validatedData = $request->validated();
        $treatment = $this->treatmentService->updateTreatment($treatment, $validatedData);
        return new TreatmentResource($treatment);
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  Treatment $treatment
     * @return \Illuminate\Http\Response
     */
    public function destroy(Treatment $treatment)
    {
        $this->treatmentService->deleteTreatment($treatment);
        return response()->json(null, 204);
    }
}
