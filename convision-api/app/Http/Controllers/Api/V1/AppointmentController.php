<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Appointment\RescheduleAppointmentRequest;
use App\Http\Requests\Api\V1\Appointment\StoreAppointmentRequest;
use App\Http\Requests\Api\V1\Appointment\UpdateAppointmentRequest;
use App\Http\Resources\V1\Appointment\AppointmentCollection;
use App\Http\Resources\V1\Appointment\AppointmentResource;
use App\Models\Appointment;
use App\Services\AppointmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * @OA\Info(
 *     version="1.0.0",
 *     title="Convision API Documentation",
 *     description="API documentation for the Convision application",
 *     @OA\Contact(
 *         email="admin@convision.com",
 *         name="Convision Support"
 *     ),
 *     @OA\License(
 *         name="Apache 2.0",
 *         url="http://www.apache.org/licenses/LICENSE-2.0.html"
 *     )
 * )
 */

/**
 * @OA\SecurityScheme(
 *     type="http",
 *     scheme="bearer",
 *     bearerFormat="JWT",
 *     securityScheme="bearerAuth",
 *     description="Enter token in format (Bearer <token>)"
 * )
 */

/**
 * @OA\Tag(
 *     name="Appointments",
 *     description="API Endpoints for managing appointments"
 * )
 */

/**
 * @OA\Schema(
 *     schema="User",
 *     type="object",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="name", type="string", example="John Doe"),
 *     @OA\Property(property="email", type="string", format="email", example="john@example.com"),
 *     @OA\Property(property="role", type="string", example="specialist")
 * )
 */

/**
 * @OA\Schema(
 *     schema="Patient",
 *     type="object",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="first_name", type="string", example="Jane"),
 *     @OA\Property(property="last_name", type="string", example="Smith"),
 *     @OA\Property(property="email", type="string", format="email", example="jane@example.com"),
 *     @OA\Property(property="phone", type="string", example="123-456-7890"),
 *     @OA\Property(property="identification", type="string", example="ABC123456"),
 *     @OA\Property(property="identification_type", type="string", example="ID Card"),
 *     @OA\Property(property="birth_date", type="string", format="date", example="1990-01-01"),
 *     @OA\Property(property="gender", type="string", example="female"),
 *     @OA\Property(property="address", type="string", example="123 Main St"),
 *     @OA\Property(property="city", type="string", example="Anytown"),
 *     @OA\Property(property="state", type="string", example="State"),
 *     @OA\Property(property="postal_code", type="string", example="12345"),
 *     @OA\Property(property="notes", type="string", nullable=true, example="Patient notes go here"),
 *     @OA\Property(property="status", type="string", example="active")
 * )
 */

/**
 * @OA\Schema(
 *     schema="Appointment",
 *     type="object",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="patient_id", type="integer", example=1),
 *     @OA\Property(property="specialist_id", type="integer", example=1),
 *     @OA\Property(property="receptionist_id", type="integer", example=1),
 *     @OA\Property(property="scheduled_at", type="string", format="date-time", example="2024-03-20 14:30:00"),
 *     @OA\Property(property="notes", type="string", nullable=true, example="Regular checkup"),
 *     @OA\Property(property="status", type="string", enum={"scheduled","completed","cancelled"}, example="scheduled"),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 */
class AppointmentController extends Controller
{
    protected $appointmentService;

    public function __construct(AppointmentService $appointmentService)
    {
        $this->appointmentService = $appointmentService;
    }

    /**
     * @OA\Get(
     *     path="/api/v1/appointments",
     *     summary="Get list of appointments",
     *     tags={"Appointments"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="page", in="query", description="Page number", @OA\Schema(type="integer", default=1)),
     *     @OA\Parameter(name="per_page", in="query", description="Items per page", @OA\Schema(type="integer", default=15)),
     *     @OA\Parameter(name="s_f", in="query", description="Search fields", @OA\Schema(type="string")),
     *     @OA\Parameter(name="s_v", in="query", description="Search values", @OA\Schema(type="string")),
     *     @OA\Parameter(name="sort", in="query", description="Sort order", @OA\Schema(type="string")),
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/Appointment")),
     *             @OA\Property(property="current_page", type="integer"),
     *             @OA\Property(property="per_page", type="integer"),
     *             @OA\Property(property="total", type="integer")
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
        $user = Auth::user();
        $query = $this->appointmentService->getFilteredAppointments($request, $user);
        
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $appointments = $query->paginate($perPage);
        
        return new AppointmentCollection($appointments);
    }

    /**
     * @OA\Post(
     *     path="/api/v1/appointments",
     *     summary="Create a new appointment",
     *     tags={"Appointments"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"patient_id","date","time"},
     *             @OA\Property(property="patient_id", type="integer", example=1),
     *             @OA\Property(property="date", type="string", format="date", example="2024-03-20"),
     *             @OA\Property(property="time", type="string", format="time", example="14:30"),
     *             @OA\Property(property="notes", type="string", nullable=true, example="Regular checkup"),
     *             @OA\Property(property="status", type="string", enum={"scheduled","completed","cancelled"}, example="scheduled")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Appointment created successfully",
     *         @OA\JsonContent(ref="#/components/schemas/Appointment")
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
    public function store(StoreAppointmentRequest $request)
    {
        $validatedData = $request->validated();
        $user = Auth::user();

        $appointment = $this->appointmentService->createAppointment($validatedData, $user);
        return new AppointmentResource($appointment);
    }

    /**
     * @OA\Get(
     *     path="/api/v1/appointments/{id}",
     *     summary="Get appointment details",
     *     tags={"Appointments"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Appointment ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(ref="#/components/schemas/Appointment")
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Appointment not found"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function show($id)
    {
        $user = Auth::user();
        $appointment = $this->appointmentService->getAppointmentForUser($id, $user);
        return new AppointmentResource($appointment);
    }

    /**
     * @OA\Put(
     *     path="/api/v1/appointments/{id}",
     *     summary="Update appointment details",
     *     tags={"Appointments"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Appointment ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="patient_id", type="integer", example=1),
     *             @OA\Property(property="date", type="string", format="date", example="2024-03-20"),
     *             @OA\Property(property="time", type="string", format="time", example="14:30"),
     *             @OA\Property(property="notes", type="string", nullable=true, example="Regular checkup"),
     *             @OA\Property(property="status", type="string", enum={"scheduled","completed","cancelled"}, example="scheduled")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Appointment updated successfully",
     *         @OA\JsonContent(ref="#/components/schemas/Appointment")
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Appointment not found"
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
    public function update(UpdateAppointmentRequest $request, $id)
    {
        $appointment = Appointment::findOrFail($id);

        // Authorization: Ensure the user can update this appointment (e.g., is the assigned specialist or admin)
        // This might involve a Policy: $this->authorize('update', $appointment);
        // For now, assuming specialist can update their own, or admin can update any
        $user = auth()->user();
        if ($user->role === 'specialist' && $appointment->specialist_id !== $user->id && $appointment->taken_by_id !== $user->id) {
            return response()->json(['message' => 'No tienes permiso para actualizar esta cita.'], 403);
        }

        $validatedData = $request->validated();
        $appointment->update($validatedData);

        return new AppointmentResource($appointment->fresh());
    }

    public function saveAnnotations(Request $request, $id)
    {
        $request->validate([
            'left_eye_paths' => 'nullable|string',
            'left_eye_image' => 'nullable|string',
            'right_eye_paths' => 'nullable|string',
            'right_eye_image' => 'nullable|string',
        ]);

        $user = Auth::user();
        $appointment = Appointment::findOrFail($id);

        // Check authorization - admin can access all, specialist only their own
        if ($user->role !== 'admin' && $user->role !== 'receptionist' && 
            $appointment->specialist_id !== $user->id && $appointment->taken_by_id !== $user->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $appointment->update([
            'left_eye_annotation_paths' => $request->left_eye_paths,
            'left_eye_annotation_image' => $request->left_eye_image,
            'right_eye_annotation_paths' => $request->right_eye_paths,
            'right_eye_annotation_image' => $request->right_eye_image,
        ]);

        return new AppointmentResource($appointment->fresh());
    }

    public function uploadLensAnnotation(Request $request, $id)
    {
        $request->validate([
            'annotation' => 'required|string',
            'paths' => 'nullable|string'
        ]);

        $user = Auth::user();
        $appointment = Appointment::findOrFail($id);

        // Check authorization - admin can access all, specialist only their own
        if ($user->role !== 'admin' && $user->role !== 'receptionist' && 
            $appointment->specialist_id !== $user->id && $appointment->taken_by_id !== $user->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

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
            
            $fileName = 'lens_annotation_' . $id . '_' . time() . '.' . $type;
            $filePath = 'annotations/' . $fileName;
            
            \Storage::disk('public')->put($filePath, $data);
            
            $appointment->update([
                'lens_annotation_image' => $filePath,
                'lens_annotation_paths' => $request->input('paths')
            ]);
            
            return new AppointmentResource($appointment->fresh());
        }
        
        return response()->json(['error' => 'Invalid image format'], 422);
    }

    public function getLensAnnotation($id)
    {
        $user = Auth::user();
        $appointment = Appointment::findOrFail($id);

        // Check authorization - admin can access all, specialist only their own
        if ($user->role !== 'admin' && $user->role !== 'receptionist' && 
            $appointment->specialist_id !== $user->id && $appointment->taken_by_id !== $user->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        
        if (!$appointment->lens_annotation_image) {
            return response()->json(['annotation' => null, 'paths' => null]);
        }
        
        $filePath = $appointment->lens_annotation_image;
        
        if (\Storage::disk('public')->exists($filePath)) {
            $fileContent = \Storage::disk('public')->get($filePath);
            $mimeType = \Storage::disk('public')->mimeType($filePath);
            $base64 = 'data:' . $mimeType . ';base64,' . base64_encode($fileContent);
            
            return response()->json([
                'annotation' => $base64,
                'paths' => $appointment->lens_annotation_paths
            ]);
        }
        
        return response()->json(['annotation' => null, 'paths' => null]);
    }

    /**
     * @OA\Delete(
     *     path="/api/v1/appointments/{id}",
     *     summary="Delete an appointment",
     *     tags={"Appointments"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Appointment ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=204,
     *         description="Appointment deleted successfully"
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Appointment not found"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function destroy($id)
    {
        $user = Auth::user();
        $this->appointmentService->deleteAppointment($id, $user);
        return response()->json(null, 204);
    }

    /**
     * @OA\Post(
     *     path="/api/v1/appointments/{id}/take",
     *     summary="Specialist takes an appointment",
     *     tags={"Appointments"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Appointment ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Appointment taken successfully",
     *         @OA\JsonContent(ref="#/components/schemas/Appointment")
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Appointment already taken or not in scheduled status"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Not authorized to take this appointment"
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Appointment not found"
     *     )
     * )
     */
    public function takeAppointment($id)
    {
        $user = Auth::user();
        $appointment = $this->appointmentService->getAppointmentForUser($id, $user);
        $takenAppointment = $this->appointmentService->takeAppointment($appointment, $user);
        return new AppointmentResource($takenAppointment);
    }

    /**
     * @OA\Post(
     *     path="/api/v1/appointments/{id}/pause",
     *     summary="Specialist pauses an in-progress appointment",
     *     tags={"Appointments"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Appointment ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Appointment paused successfully",
     *         @OA\JsonContent(ref="#/components/schemas/Appointment")
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Appointment is not in in_progress status"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Not authorized to pause this appointment"
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Appointment not found"
     *     )
     * )
     */
    public function pauseAppointment($id)
    {
        $user = Auth::user();
        $appointment = $this->appointmentService->getAppointmentForUser($id, $user);
        $pausedAppointment = $this->appointmentService->pauseAppointment($appointment, $user);
        return new AppointmentResource($pausedAppointment);
    }

    /**
     * @OA\Post(
     *     path="/api/v1/appointments/{id}/resume",
     *     summary="Specialist resumes a paused appointment",
     *     tags={"Appointments"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Appointment ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Appointment resumed successfully",
     *         @OA\JsonContent(ref="#/components/schemas/Appointment")
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Appointment is not in paused status or specialist already has an active appointment"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Not authorized to resume this appointment"
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Appointment not found"
     *     )
     * )
     */
    public function resumeAppointment($id)
    {
        $user = Auth::user();
        $appointment = $this->appointmentService->getAppointmentForUser($id, $user);
        $resumedAppointment = $this->appointmentService->resumeAppointment($appointment, $user);
        return new AppointmentResource($resumedAppointment);
    }

    /**
     * @OA\Post(
     *     path="/api/v1/appointments/{id}/reschedule",
     *     summary="Reschedule an appointment",
     *     tags={"Appointments"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Appointment ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="date", type="string", format="date", example="2024-03-20"),
     *             @OA\Property(property="time", type="string", format="time", example="14:30"),
     *             @OA\Property(property="notes", type="string", nullable=true, example="Regular checkup"),
     *             @OA\Property(property="specialist_id", type="integer", example=1)
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Appointment rescheduled successfully",
     *         @OA\JsonContent(ref="#/components/schemas/Appointment")
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Invalid reschedule request"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Not authorized to reschedule this appointment"
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Appointment not found"
     *     )
     * )
     */
    public function reschedule(RescheduleAppointmentRequest $request, $id)
    {
        $validatedData = $request->validated();
        $user = Auth::user();
        $appointment = $this->appointmentService->getAppointmentForUser($id, $user);
        $rescheduledAppointment = $this->appointmentService->rescheduleAppointment($appointment, $validatedData);
        return new AppointmentResource($rescheduledAppointment);
    }
}

/**
 * @OA\Schema(
 *     schema="Prescription",
 *     type="object",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="appointment_id", type="integer", example=1),
 *     @OA\Property(property="date", type="string", format="date", example="2024-04-01"),
 *     @OA\Property(property="document", type="string", example="prescription-doc"),
 *     @OA\Property(property="patient_name", type="string", example="Jane Smith"),
 *     @OA\Property(property="right_sphere", type="string", nullable=true),
 *     @OA\Property(property="right_cylinder", type="string", nullable=true),
 *     @OA\Property(property="right_axis", type="string", nullable=true),
 *     @OA\Property(property="right_addition", type="string", nullable=true),
 *     @OA\Property(property="right_height", type="string", nullable=true),
 *     @OA\Property(property="right_distance_p", type="string", nullable=true),
 *     @OA\Property(property="right_visual_acuity_far", type="string", nullable=true),
 *     @OA\Property(property="right_visual_acuity_near", type="string", nullable=true),
 *     @OA\Property(property="left_sphere", type="string", nullable=true),
 *     @OA\Property(property="left_cylinder", type="string", nullable=true),
 *     @OA\Property(property="left_axis", type="string", nullable=true),
 *     @OA\Property(property="left_addition", type="string", nullable=true),
 *     @OA\Property(property="left_height", type="string", nullable=true),
 *     @OA\Property(property="left_distance_p", type="string", nullable=true),
 *     @OA\Property(property="left_visual_acuity_far", type="string", nullable=true),
 *     @OA\Property(property="left_visual_acuity_near", type="string", nullable=true),
 *     @OA\Property(property="correction_type", type="string", nullable=true),
 *     @OA\Property(property="usage_type", type="string", nullable=true),
 *     @OA\Property(property="recommendation", type="string", nullable=true),
 *     @OA\Property(property="professional", type="string", nullable=true),
 *     @OA\Property(property="observation", type="string", nullable=true),
 *     @OA\Property(property="attachment", type="string", nullable=true)
 * )
 */

/**
 * @OA\Schema(
 *     schema="Order",
 *     type="object",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="order_number", type="string", example="ORD-001")
 * )
 */ 