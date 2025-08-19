<?php

namespace Tests\Feature\Api\V1;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Patient;
use App\Models\Appointment;
use Illuminate\Foundation\Testing\WithFaker;

class AppointmentControllerTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected function getAuthToken($email = 'testuser@example.com', $password = 'password')
    {
        $user = User::factory()->create([
            'email' => $email,
            'password' => bcrypt($password),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $email,
            'password' => $password,
            'newPassword' => null,
            'confirmNewPassword' => null,
            'verificationCode' => null,
            'forgotPasswordFlg' => false,
            'confirmForgotPasswordFlg' => false,
            'newPasswordFlg' => false,
            'verifyEmailFlg' => false,
        ]);

        return $response->json('access_token');
    }

    /**
     * Test listing appointments.
     *
     * @return void
     */
    public function test_can_list_appointments()
    {
        $token = $this->getAuthToken();

        // Create necessary data for appointments
        $patient = Patient::factory()->create();
        $specialist = User::factory()->create(['role' => 'specialist']);
        $receptionist = User::factory()->create(['role' => 'receptionist']);

        Appointment::factory()->count(3)->create([
            'patient_id' => $patient->id,
            'specialist_id' => $specialist->id,
            'receptionist_id' => $receptionist->id,
        ]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/v1/appointments');

        $response->assertStatus(200);
        // Add assertions for the response structure and data, e.g., total count
        $response->assertJsonCount(3, 'data');
        $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'patient_id',
                    'specialist_id',
                    'receptionist_id',
                    'scheduled_at',
                    'status',
                ]
            ],
             'links' => [
                'first', 'last', 'prev', 'next',        
            ],
            'meta' => [
                'current_page', 'from', 'last_page', 'links', 'path', 'per_page', 'to', 'total',
            ],
        ]);
    }

    /**
     * Test creating a new appointment.
     *
     * @return void
     */
    public function test_can_create_appointment()
    {
        $token = $this->getAuthToken();

        // Create necessary related models
        $patient = Patient::factory()->create();
        $specialist = User::factory()->create(['role' => 'specialist']);
        $receptionist = User::factory()->create(['role' => 'receptionist']);

        $appointmentData = [
            'patient_id' => $patient->id,
            'specialist_id' => $specialist->id,
            'receptionist_id' => $receptionist->id,
            'scheduled_at' => now()->addDays(5)->format('Y-m-d H:i'),
            'status' => 'scheduled',
            'notes' => $this->faker->sentence,
        ];

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/v1/appointments', $appointmentData);

        $response->assertStatus(201);
        $this->assertDatabaseHas('appointments', ['patient_id' => $patient->id, 'status' => 'scheduled']);
         $response->assertJsonStructure([
            'data' => [
                'id',
                'patient_id',
                'specialist_id',
                'receptionist_id',
                'scheduled_at',
                'status',
            ]
        ]);
    }

    /**
     * Test viewing a single appointment.
     *
     * @return void
     */
    public function test_can_view_appointment()
    {
        $token = $this->getAuthToken();

        // Create necessary related models and an appointment
        $patient = Patient::factory()->create();
        $specialist = User::factory()->create(['role' => 'specialist']);
        $receptionist = User::factory()->create(['role' => 'receptionist']);

        $appointment = Appointment::factory()->create([
             'patient_id' => $patient->id,
             'specialist_id' => $specialist->id,
             'receptionist_id' => $receptionist->id,
        ]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/v1/appointments/' . $appointment->id);

        $response->assertStatus(200);
         $response->assertJsonStructure([
            'data' => [
                'id',
                'patient_id',
                'specialist_id',
                'receptionist_id',
                'scheduled_at',
                'status',
            ]
        ]);
        $response->assertJson(['data' => ['id' => $appointment->id]]);
    }

    /**
     * Test updating an appointment.
     *
     * @return void
     */
    public function test_can_update_appointment()
    {
        $token = $this->getAuthToken();

        // Create necessary related models and an appointment
        $patient = Patient::factory()->create();
        $specialist = User::factory()->create(['role' => 'specialist']);
        $receptionist = User::factory()->create(['role' => 'receptionist']);

        $appointment = Appointment::factory()->create([
             'patient_id' => $patient->id,
             'specialist_id' => $specialist->id,
             'receptionist_id' => $receptionist->id,
        ]);

        $updatedData = [
            'scheduled_at' => now()->addDays(10)->format('Y-m-d H:i'),
            'status' => 'completed',
            'notes' => 'Updated notes.',
        ];

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->putJson('/api/v1/appointments/' . $appointment->id, $updatedData);

        $response->assertStatus(200);
        $this->assertDatabaseHas('appointments', ['id' => $appointment->id, 'status' => 'completed', 'notes' => 'Updated notes.']);
         $response->assertJsonStructure([
            'data' => [
                'id',
                'patient_id',
                'specialist_id',
                'receptionist_id',
                'scheduled_at',
                'status',
            ]
        ]);
    }

    /**
     * Test deleting an appointment.
     *
     * @return void
     */
    public function test_can_delete_appointment()
    {
        $token = $this->getAuthToken();

        // Create necessary related models and an appointment
        $patient = Patient::factory()->create();
        $specialist = User::factory()->create(['role' => 'specialist']);
        $receptionist = User::factory()->create(['role' => 'receptionist']);

        $appointment = Appointment::factory()->create([
             'patient_id' => $patient->id,
             'specialist_id' => $specialist->id,
             'receptionist_id' => $receptionist->id,
             'status' => 'scheduled', // Ensure status allows deletion
        ]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->deleteJson('/api/v1/appointments/' . $appointment->id);

        $response->assertStatus(204);
        $this->assertDatabaseMissing('appointments', ['id' => $appointment->id]);
    }

    // Add other test methods for viewing, creating, updating, and deleting appointments
     // Add tests for take, pause, resume, annotations later
} 