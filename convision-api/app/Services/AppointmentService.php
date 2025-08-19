<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\User;
use App\Exceptions\AppointmentInProgressException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class AppointmentService
{
    public function getFilteredAppointments(Request $request, User $user)
    {
        $query = Appointment::with(['patient', 'specialist', 'receptionist', 'prescription', 'takenBy']);

        $this->applyRoleBasedFiltering($query, $user, $request);
        $this->applyDateFilters($query, $request);
        $this->applyUserFilters($query, $user, $request);
        $this->applySearchFilters($query, $request);

        return $query->apiFilter($request);
    }

    public function createAppointment(array $validatedData, User $user): Appointment
    {
        DB::beginTransaction();

        try {
            $appointment = Appointment::create([
                'patient_id' => $validatedData['patient_id'],
                'specialist_id' => $validatedData['specialist_id'],
                'receptionist_id' => $user->id,
                'scheduled_at' => $validatedData['scheduled_at'],
                'notes' => $validatedData['notes'] ?? null,
                'status' => Appointment::STATUS_SCHEDULED
            ]);

            DB::commit();
            $appointment->load(['patient', 'specialist', 'receptionist', 'prescription', 'takenBy']);
            
            return $appointment;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating appointment: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'validated_data' => $validatedData
            ]);
            throw $e;
        }
    }

    public function getAppointmentForUser($id, User $user): Appointment
    {
        $query = Appointment::with(['patient', 'specialist', 'receptionist', 'prescription', 'takenBy']);
        
        if ($user->role === User::ROLE_SPECIALIST) {
            $query->where('specialist_id', $user->id);
        } elseif ($user->role === User::ROLE_RECEPTIONIST) {
            // Receptionists can see all appointments, no additional filtering needed
        } elseif ($user->role === User::ROLE_ADMIN) {
            // Admins can see all appointments, no additional filtering needed
        } else {
            // For any other role, deny access
            $query->whereRaw('1 = 0');
        }
        
        $appointment = $query->findOrFail($id);
        
        return $appointment;
    }

    public function deleteAppointment($id, User $user): void
    {
        $appointment = $this->getAppointmentForUser($id, $user);
        
        if ($appointment->status === Appointment::STATUS_COMPLETED) {
            throw new \Exception('Las citas completadas no pueden ser eliminadas.');
        }
        
        if ($appointment->status === Appointment::STATUS_IN_PROGRESS) {
            throw new \Exception('Las citas en progreso no pueden ser eliminadas.');
        }
        
        $appointment->delete();
    }

    public function updateAppointment(Appointment $appointment, array $validatedData): Appointment
    {
        DB::beginTransaction();

        try {
            $appointment->update($validatedData);
            DB::commit();
            
            return $appointment->fresh()->load(['patient', 'specialist', 'receptionist', 'prescription', 'takenBy']);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating appointment: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'appointment_id' => $appointment->id,
                'validated_data' => $validatedData
            ]);
            throw $e;
        }
    }

    public function takeAppointment(Appointment $appointment, User $user): Appointment
    {
        if ($appointment->status !== Appointment::STATUS_SCHEDULED) {
            throw new \Exception('Solo las citas programadas pueden ser tomadas.');
        }

        // Check if the specialist already has an appointment in progress
        $existingInProgressAppointment = Appointment::where('taken_by_id', $user->id)
            ->where('status', Appointment::STATUS_IN_PROGRESS)
            ->where('id', '!=', $appointment->id)
            ->first();

        if ($existingInProgressAppointment) {
            throw new AppointmentInProgressException(
                'Ya tienes una cita en progreso. Debes completar o pausar la cita actual antes de tomar otra.',
                $existingInProgressAppointment->id
            );
        }

        DB::beginTransaction();

        try {
            $appointment->update([
                'status' => Appointment::STATUS_IN_PROGRESS,
                'taken_by_id' => $user->id,
                'taken_at' => now()
            ]);

            DB::commit();
            return $appointment->fresh()->load(['patient', 'specialist', 'receptionist', 'prescription', 'takenBy']);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error taking appointment: ' . $e->getMessage(), [
                'appointment_id' => $appointment->id,
                'user_id' => $user->id
            ]);
            throw $e;
        }
    }

    public function pauseAppointment(Appointment $appointment, User $user): Appointment
    {
        if ($appointment->status !== Appointment::STATUS_IN_PROGRESS) {
            throw new \Exception('Solo las citas en progreso pueden ser pausadas.');
        }

        if ($appointment->taken_by_id !== $user->id) {
            throw new \Exception('Solo el especialista que tomó la cita puede pausarla.');
        }

        DB::beginTransaction();

        try {
            $appointment->update([
                'status' => Appointment::STATUS_PAUSED,
                'paused_at' => now()
            ]);

            DB::commit();
            return $appointment->fresh()->load(['patient', 'specialist', 'receptionist', 'prescription', 'takenBy']);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error pausing appointment: ' . $e->getMessage(), [
                'appointment_id' => $appointment->id,
                'user_id' => $user->id
            ]);
            throw $e;
        }
    }

    public function resumeAppointment(Appointment $appointment, User $user): Appointment
    {
        if ($appointment->status !== Appointment::STATUS_PAUSED) {
            throw new \Exception('Solo las citas pausadas pueden ser reanudadas.');
        }

        if ($appointment->taken_by_id !== $user->id) {
            throw new \Exception('Solo el especialista que pausó la cita puede reanudarla.');
        }

        // Check if the specialist already has another appointment in progress
        $existingInProgressAppointment = Appointment::where('taken_by_id', $user->id)
            ->where('status', Appointment::STATUS_IN_PROGRESS)
            ->where('id', '!=', $appointment->id)
            ->first();

        if ($existingInProgressAppointment) {
            throw new AppointmentInProgressException(
                'Ya tienes una cita en progreso. Debes completar o pausar la cita actual antes de reanudar otra.',
                $existingInProgressAppointment->id
            );
        }

        DB::beginTransaction();

        try {
            $appointment->update([
                'status' => Appointment::STATUS_IN_PROGRESS,
                'resumed_at' => now()
            ]);

            DB::commit();
            return $appointment->fresh()->load(['patient', 'specialist', 'receptionist', 'prescription', 'takenBy']);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error resuming appointment: ' . $e->getMessage(), [
                'appointment_id' => $appointment->id,
                'user_id' => $user->id
            ]);
            throw $e;
        }
    }

    public function rescheduleAppointment(Appointment $appointment, array $validatedData): Appointment
    {
        if ($appointment->status === Appointment::STATUS_COMPLETED) {
            throw new \Exception('Las citas completadas no pueden ser reprogramadas.');
        }

        DB::beginTransaction();

        try {
            $appointment->update([
                'scheduled_at' => $validatedData['scheduled_at'],
                'notes' => $validatedData['notes'] ?? $appointment->notes,
                'status' => Appointment::STATUS_SCHEDULED
            ]);

            DB::commit();
            return $appointment->fresh()->load(['patient', 'specialist', 'receptionist', 'prescription', 'takenBy']);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error rescheduling appointment: ' . $e->getMessage(), [
                'appointment_id' => $appointment->id,
                'validated_data' => $validatedData
            ]);
            throw $e;
        }
    }

    protected function applyRoleBasedFiltering($query, User $user, Request $request)
    {
        if ($user->role === User::ROLE_SPECIALIST) {
            if ($request->has('view') && $request->view === 'in_progress') {
                $query->where('specialist_id', $user->id)
                      ->inProgress()
                      ->where('taken_by_id', $user->id);
            } else {
                $query->where('specialist_id', $user->id);
                
                // Apply additional filtering for specialists if no specific status is requested
                if (!$request->has('status')) {
                    $query->where(function($q) use ($user) {
                        $q->scheduled()
                          ->orWhere(function($q2) use ($user) {
                              $q2->whereIn('status', [Appointment::STATUS_IN_PROGRESS, Appointment::STATUS_PAUSED])
                                 ->where('taken_by_id', $user->id);
                          })
                          ->orWhere('status', Appointment::STATUS_COMPLETED);
                    });
                }
            }
        } elseif (in_array($user->role, [User::ROLE_ADMIN, User::ROLE_RECEPTIONIST])) {
            // Admin and Receptionist can see all appointments
            // Apply is_billed filter if include_billed is not present
            if (!$request->has('include_billed')) {
                $query->where(function($q) {
                    $q->where('is_billed', false)
                      ->orWhereNull('is_billed');
                });
            }
            // No additional role-based filtering needed for admin/receptionist to see all appointments.
            // Other filters (date, user, search) will be applied in subsequent methods.
        } else {
            // If the role is not specialist, admin, or receptionist, deny access by returning no results.
            // This is a security measure for unhandled roles.
            $query->whereRaw('1 = 0'); // Ensures no records are returned
        }

        // Apply status filter if present for all roles
        if ($request->has('status')) {
            $query->withStatus($request->status);
        }
    }

    protected function applyDateFilters($query, Request $request)
    {
        if ($request->has('start_date')) {
            $query->whereDate('scheduled_at', '>=', $request->start_date);
        }
        if ($request->has('end_date')) {
            $query->whereDate('scheduled_at', '<=', $request->end_date);
        }
    }

    protected function applyUserFilters($query, User $user, Request $request)
    {
        if (in_array($user->role, [User::ROLE_ADMIN, User::ROLE_RECEPTIONIST]) && $request->has('patient_id')) {
            $query->where('patient_id', $request->patient_id);
        }

        if (in_array($user->role, [User::ROLE_ADMIN, User::ROLE_RECEPTIONIST]) && $request->has('specialist_id')) {
            $query->where('specialist_id', $request->specialist_id);
        }
    }

    protected function applySearchFilters($query, Request $request)
    {
        if ($request->has('search')) {
            $searchTerm = $request->search;
            $query->where(function($q) use ($searchTerm) {
                $q->whereHas('patient', function($q) use ($searchTerm) {
                    $q->where('first_name', 'like', "%{$searchTerm}%")
                      ->orWhere('last_name', 'like', "%{$searchTerm}%")
                      ->orWhere('identification', 'like', "%{$searchTerm}%");
                })
                ->orWhereHas('specialist', function($q) use ($searchTerm) {
                    $q->where('name', 'like', "%{$searchTerm}%");
                });
            });
        }
    }
} 