<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Models\Appointment;
use App\Models\Prescription;
use App\Models\User;
use App\Models\Patient;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PrescriptionObserverTest extends TestCase
{
    use RefreshDatabase;
    
    /** @test */
    public function creating_prescription_marks_appointment_as_completed()
    {
        // Create a specialist user
        $specialist = User::factory()->create([
            'role' => 'specialist'
        ]);
        
        // Create a receptionist user
        $receptionist = User::factory()->create([
            'role' => 'receptionist'
        ]);

        // Create a patient
        $patient = Patient::factory()->create();
        
        // Create an appointment
        $appointment = Appointment::create([
            'patient_id' => $patient->id,
            'specialist_id' => $specialist->id,
            'receptionist_id' => $receptionist->id,
            'scheduled_at' => now()->addDay(),
            'status' => 'scheduled',
        ]);
        
        // Assert that the initial status is 'scheduled'
        $this->assertEquals('scheduled', $appointment->status);
        
        // Create a prescription for the appointment
        Prescription::create([
            'appointment_id' => $appointment->id,
            'date' => now()->format('Y-m-d'),
            'document' => 'Test Document',
            'patient_name' => $patient->first_name . ' ' . $patient->last_name,
            // Add other required fields as needed
        ]);
        
        // Refresh the appointment from database
        $appointment->refresh();
        
        // Assert that the status was updated to 'completed'
        $this->assertEquals('completed', $appointment->status);
    }
} 