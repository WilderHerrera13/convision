<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Patient\StorePatientRequest;
use App\Http\Requests\Api\V1\Patient\UpdatePatientRequest;
use App\Http\Requests\Api\V1\Patient\UploadPatientProfileImageRequest;
use App\Http\Resources\V1\Patient\PatientCollection;
use App\Http\Resources\V1\Patient\PatientResource;
use App\Models\Patient;
use App\Services\PatientService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * @OA\Schema(
 *     schema="Patient",
 *     type="object",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="first_name", type="string", example="John"),
 *     @OA\Property(property="last_name", type="string", example="Doe"),
 *     @OA\Property(property="email", type="string", format="email", example="john@example.com"),
 *     @OA\Property(property="phone", type="string", example="1234567890"),
 *     @OA\Property(property="identification", type="string", example="1234567890"),
 *     @OA\Property(property="identification_type", type="string", example="dni"),
 *     @OA\Property(property="birth_date", type="string", format="date", example="1990-01-01"),
 *     @OA\Property(property="gender", type="string", enum={"male","female","other"}, example="male"),
 *     @OA\Property(property="address", type="string", nullable=true, example="123 Main St"),
 *     @OA\Property(property="city", type="string", nullable=true, example="New York"),
 *     @OA\Property(property="district", type="string", nullable=true, example="Villavicencio"),
 *     @OA\Property(property="state", type="string", nullable=true, example="NY"),
 *     @OA\Property(property="country", type="string", nullable=true, example="Colombia"),
 *     @OA\Property(property="neighborhood", type="string", nullable=true, example="Downtown"),
 *     @OA\Property(property="postal_code", type="string", nullable=true, example="10001"),
 *     @OA\Property(property="eps", type="string", nullable=true, example="EPS/ARS"),
 *     @OA\Property(property="affiliation", type="string", nullable=true, example="Titular"),
 *     @OA\Property(property="coverage", type="string", nullable=true, example="PLAN_DE_BENEFICIOS"),
 *     @OA\Property(property="occupation", type="string", nullable=true, example="Engineer"),
 *     @OA\Property(property="education", type="string", nullable=true, example="University"),
 *     @OA\Property(property="position", type="string", nullable=true, example="Senior Developer"),
 *     @OA\Property(property="company", type="string", nullable=true, example="Acme Inc"),
 *     @OA\Property(property="notes", type="string", nullable=true),
 *     @OA\Property(property="status", type="string", enum={"active","inactive"}, example="active"),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 */
class PatientController extends Controller
{
    protected $patientService;

    public function __construct(PatientService $patientService)
    {
        $this->middleware('auth:api');
        $this->patientService = $patientService;
    }

    /**
     * @OA\Get(
     *     path="/api/v1/patients",
     *     summary="Get list of patients",
     *     tags={"Patients"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="page", in="query", description="Page number", @OA\Schema(type="integer", default=1)),
     *     @OA\Parameter(name="per_page", in="query", description="Items per page", @OA\Schema(type="integer", default=15)),
     *     @OA\Parameter(name="s_f", in="query", description="Search fields", @OA\Schema(type="string")),
     *     @OA\Parameter(name="s_v", in="query", description="Search values", @OA\Schema(type="string")),
     *     @OA\Parameter(name="sort_by", in="query", description="Sort by field", @OA\Schema(type="string")),
     *     @OA\Parameter(name="sort_direction", in="query", description="Sort direction (asc/desc)", @OA\Schema(type="string")),
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/Patient")),
     *             @OA\Property(property="links", type="object"),
     *             @OA\Property(property="meta", type="object")
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function index(Request $request)
    {
        $query = Patient::apiFilter($request);
        
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $items = $query->paginate($perPage);
        
        return new PatientCollection($items);
    }

    /**
     * @OA\Post(
     *     path="/api/v1/patients",
     *     summary="Create a new patient",
     *     tags={"Patients"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"first_name","last_name","email","phone","identification","identification_type","birth_date","gender"},
     *             @OA\Property(property="first_name", type="string", example="John"),
     *             @OA\Property(property="last_name", type="string", example="Doe"),
     *             @OA\Property(property="email", type="string", format="email", example="john@example.com"),
     *             @OA\Property(property="phone", type="string", example="1234567890"),
     *             @OA\Property(property="identification", type="string", example="1234567890"),
     *             @OA\Property(property="identification_type", type="string", example="dni"),
     *             @OA\Property(property="birth_date", type="string", format="date", example="1990-01-01"),
     *             @OA\Property(property="gender", type="string", enum={"male","female","other"}, example="male"),
     *             @OA\Property(property="address", type="string", nullable=true, example="123 Main St"),
     *             @OA\Property(property="city", type="string", nullable=true, example="New York"),
     *             @OA\Property(property="district", type="string", nullable=true, example="Villavicencio"),
     *             @OA\Property(property="state", type="string", nullable=true, example="NY"),
     *             @OA\Property(property="country", type="string", nullable=true, example="Colombia"),
     *             @OA\Property(property="neighborhood", type="string", nullable=true, example="Downtown"),
     *             @OA\Property(property="postal_code", type="string", nullable=true, example="10001"),
     *             @OA\Property(property="eps", type="string", nullable=true, example="EPS/ARS"),
     *             @OA\Property(property="affiliation", type="string", nullable=true, example="Titular"),
     *             @OA\Property(property="coverage", type="string", nullable=true, example="PLAN_DE_BENEFICIOS"),
     *             @OA\Property(property="occupation", type="string", nullable=true, example="Engineer"),
     *             @OA\Property(property="education", type="string", nullable=true, example="University"),
     *             @OA\Property(property="position", type="string", nullable=true, example="Senior Developer"),
     *             @OA\Property(property="company", type="string", nullable=true, example="Acme Inc"),
     *             @OA\Property(property="notes", type="string", nullable=true),
     *             @OA\Property(property="status", type="string", enum={"active","inactive"}, nullable=true, example="active"),
     *             @OA\Property(property="profile_image", type="string", nullable=true, format="binary")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Patient created successfully",
     *         @OA\JsonContent(ref="#/components/schemas/Patient")
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function store(StorePatientRequest $request)
    {
        $validatedData = $request->validated();
        $profileImage = $request->hasFile('profile_image') ? $request->file('profile_image') : null;

        $patient = $this->patientService->createPatient($validatedData, $profileImage);
        return new PatientResource($patient);
    }

    /**
     * @OA\Get(
     *     path="/api/v1/patients/{id}",
     *     summary="Get patient details",
     *     tags={"Patients"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, description="Patient ID", @OA\Schema(type="integer")),
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(ref="#/components/schemas/Patient")
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Patient not found"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function show($id)
    {
        $patient = $this->patientService->findPatient($id);
        return new PatientResource($patient);
    }

    /**
     * @OA\Put(
     *     path="/api/v1/patients/{id}",
     *     summary="Update patient details",
     *     tags={"Patients"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, description="Patient ID", @OA\Schema(type="integer")),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"first_name","last_name","email","phone","identification","identification_type","birth_date","gender"},
     *             @OA\Property(property="first_name", type="string", example="John"),
     *             @OA\Property(property="last_name", type="string", example="Doe"),
     *             @OA\Property(property="email", type="string", format="email", example="john@example.com"),
     *             @OA\Property(property="phone", type="string", example="1234567890"),
     *             @OA\Property(property="identification", type="string", example="1234567890"),
     *             @OA\Property(property="identification_type", type="string", example="dni"),
     *             @OA\Property(property="birth_date", type="string", format="date", example="1990-01-01"),
     *             @OA\Property(property="gender", type="string", enum={"male","female","other"}, example="male"),
     *             @OA\Property(property="address", type="string", nullable=true, example="123 Main St"),
     *             @OA\Property(property="city", type="string", nullable=true, example="New York"),
     *             @OA\Property(property="district", type="string", nullable=true, example="Villavicencio"),
     *             @OA\Property(property="state", type="string", nullable=true, example="NY"),
     *             @OA\Property(property="country", type="string", nullable=true, example="Colombia"),
     *             @OA\Property(property="neighborhood", type="string", nullable=true, example="Downtown"),
     *             @OA\Property(property="postal_code", type="string", nullable=true, example="10001"),
     *             @OA\Property(property="eps", type="string", nullable=true, example="EPS/ARS"),
     *             @OA\Property(property="affiliation", type="string", nullable=true, example="Titular"),
     *             @OA\Property(property="coverage", type="string", nullable=true, example="PLAN_DE_BENEFICIOS"),
     *             @OA\Property(property="occupation", type="string", nullable=true, example="Engineer"),
     *             @OA\Property(property="education", type="string", nullable=true, example="University"),
     *             @OA\Property(property="position", type="string", nullable=true, example="Senior Developer"),
     *             @OA\Property(property="company", type="string", nullable=true, example="Acme Inc"),
     *             @OA\Property(property="notes", type="string", nullable=true),
     *             @OA\Property(property="status", type="string", enum={"active","inactive"}, nullable=true, example="active"),
     *             @OA\Property(property="profile_image", type="string", nullable=true, format="binary")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Patient updated successfully",
     *         @OA\JsonContent(ref="#/components/schemas/Patient")
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Patient not found"
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function update(UpdatePatientRequest $request, $id)
    {
        $patient = $this->patientService->findPatient($id);
        $validatedData = $request->validated();
        $profileImage = $request->hasFile('profile_image') ? $request->file('profile_image') : null;

        $updatedPatient = $this->patientService->updatePatient($patient, $validatedData, $profileImage);
        return new PatientResource($updatedPatient);
    }

    /**
     * @OA\Delete(
     *     path="/api/v1/patients/{id}",
     *     summary="Delete a patient",
     *     tags={"Patients"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, description="Patient ID", @OA\Schema(type="integer")),
     *     @OA\Response(
     *         response=204,
     *         description="Patient deleted successfully"
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Patient not found"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function destroy($id)
    {
        $patient = $this->patientService->findPatient($id);
        $this->patientService->deletePatient($patient);
        return response()->json(null, 204);
    }

    /**
     * @OA\Post(
     *     path="/api/v1/patients/{id}/restore",
     *     summary="Restore a soft-deleted patient",
     *     tags={"Patients"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Patient ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Patient restored successfully",
     *         @OA\JsonContent(ref="#/components/schemas/Patient")
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Patient not found"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function restore($id)
    {
        $patient = $this->patientService->restorePatient($id);
        return new PatientResource($patient);
    }

    /**
     * @OA\Post(
     *     path="/api/v1/patients/{id}/profile-image",
     *     summary="Upload a profile image for a patient",
     *     tags={"Patients"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Patient ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *             @OA\Schema(
     *                 @OA\Property(
     *                     property="profile_image",
     *                     type="string",
     *                     format="binary",
     *                     description="Profile image file (JPEG, PNG, JPG)"
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Image uploaded successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string", example="Profile image uploaded successfully"),
     *             @OA\Property(property="profile_image", type="string")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Patient not found"
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function uploadProfileImage(UploadPatientProfileImageRequest $request, $id)
    {
        $patient = $this->patientService->findPatient($id);
        $image = $request->file('profile_image');

        $updatedPatient = $this->patientService->uploadProfileImage($patient, $image);
        return new PatientResource($updatedPatient);
    }
} 