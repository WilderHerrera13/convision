<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Prescription\StorePrescriptionRequest;
use App\Http\Requests\Api\V1\Prescription\UpdatePrescriptionRequest;
use App\Models\Prescription;
use App\Models\Appointment;
use App\Http\Resources\V1\Clinical\PrescriptionResource;
use App\Http\Resources\V1\Clinical\PrescriptionCollection;
use App\Services\PrescriptionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class PrescriptionController extends Controller
{
    protected $prescriptionService;

    public function __construct(PrescriptionService $prescriptionService)
    {
        $this->middleware('auth:api');
        $this->prescriptionService = $prescriptionService;
    }

    public function index(Request $request)
    {
        $user = Auth::user();
        $query = $this->prescriptionService->getFilteredPrescriptions($request, $user);
        
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $prescriptions = $query->paginate($perPage);
        
        return new PrescriptionCollection($prescriptions);
    }

    public function store(StorePrescriptionRequest $request)
    {
        $validatedData = $request->validated();
        $user = Auth::user();
        
        $prescription = $this->prescriptionService->createPrescription($validatedData, $user);
        return new PrescriptionResource($prescription);
    }

    public function show($id)
    {
        $user = Auth::user();
        $prescription = $this->prescriptionService->getPrescriptionForUser($id, $user);
        return new PrescriptionResource($prescription);
    }

    public function update(UpdatePrescriptionRequest $request, $id)
    {
        $validatedData = $request->validated();
        $user = Auth::user();
        
        $prescription = $this->prescriptionService->updatePrescription($id, $validatedData, $user);
        return new PrescriptionResource($prescription);
    }

    public function destroy($id)
    {
        $user = Auth::user();
        $this->prescriptionService->deletePrescription($id, $user);
        return response()->json(null, 204);
    }

    public function uploadAnnotation(Request $request, $id)
    {
        $request->validate([
            'annotation' => 'required|string',
            'paths' => 'nullable|string'
        ]);

        $user = Auth::user();
        $prescription = $this->prescriptionService->getPrescriptionForUser($id, $user);

        $annotationData = $request->input('annotation');
        
        if (preg_match('/^data:image\/(\w+);base64,/', $annotationData, $type)) {
            $data = substr($annotationData, strpos($annotationData, ',') + 1);
            $type = strtolower($type[1]);
            
            if (!in_array($type, ['jpg', 'jpeg', 'gif', 'png'])) {
                return response()->json(['error' => 'Invalid image type'], 422);
            }
            
            $data = base64_decode($data);
            
            if ($data === false) {
                return response()->json(['error' => 'Failed to decode image'], 422);
            }
            
            $fileName = 'prescription_annotation_' . $id . '_' . time() . '.' . $type;
            $filePath = 'annotations/' . $fileName;
            
            \Storage::disk('public')->put($filePath, $data);
            
            $prescription->update([
                'attachment' => $filePath,
                'annotation_paths' => $request->input('paths')
            ]);
            
            return new PrescriptionResource($prescription->fresh());
        }
        
        return response()->json(['error' => 'Invalid image format'], 422);
    }

    public function getAnnotation($id)
    {
        $user = Auth::user();
        $prescription = $this->prescriptionService->getPrescriptionForUser($id, $user);
        
        if (!$prescription->attachment) {
            return response()->json(['annotation' => null, 'paths' => null]);
        }
        
        $filePath = $prescription->attachment;
        
        if (\Storage::disk('public')->exists($filePath)) {
            $fileContent = \Storage::disk('public')->get($filePath);
            $mimeType = \Storage::disk('public')->mimeType($filePath);
            $base64 = 'data:' . $mimeType . ';base64,' . base64_encode($fileContent);
            
            return response()->json([
                'annotation' => $base64,
                'paths' => $prescription->annotation_paths
            ]);
        }
        
        return response()->json(['annotation' => null, 'paths' => null]);
    }
} 