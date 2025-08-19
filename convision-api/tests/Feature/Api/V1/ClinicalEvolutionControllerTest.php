<?php

namespace Tests\Feature\Api\V1;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Patient;
use App\Models\ClinicalHistory;
use App\Models\ClinicalEvolution;
use App\Models\Appointment;
use Illuminate\Foundation\Testing\WithFaker;

class ClinicalEvolutionControllerTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected function getAuthToken($email = 'testuser@example.com', $password = 'password')
    {
        $user = User::factory()->create([
            'email' => $email,
            'password' => bcrypt($password),
            'role' => 'specialist', // Use specialist role for clinical tests
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

        // Return both the token and the user object
        return [
            'token' => $response->json('access_token'),
            'user' => $user
        ];
    }

    /**
     * Test listing clinical evolutions.
     *
     * @return void
     */
    public function test_can_list_clinical_evolutions()
    {
        $auth = $this->getAuthToken();
        $token = $auth['token'];
        $user = $auth['user'];

        // Create necessary data for clinical evolutions using the authenticated user
        $patient = Patient::factory()->create();
        // Ensure the specialist can access this patient via an appointment
        Appointment::factory()->create([
             'patient_id' => $patient->id,
             'specialist_id' => $user->id,
             'receptionist_id' => User::factory()->create(['role' => 'receptionist'])->id,
        ]);

        $clinicalHistory = ClinicalHistory::factory()->create([
            'patient_id' => $patient->id,
             'created_by' => $user->id, // Use authenticated user's ID
             'updated_by' => $user->id, // Use authenticated user's ID
        ]);

        ClinicalEvolution::factory()->count(3)->create([
            'clinical_history_id' => $clinicalHistory->id,
            'created_by' => $user->id, // Use authenticated user's ID
            'updated_by' => $user->id, // Use authenticated user's ID
        ]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/v1/clinical-histories/' . $clinicalHistory->id . '/evolutions');

        $response->assertStatus(200);
        // Add assertions for the response structure and data, e.g., total count
         $response->assertJsonCount(3, 'data');
         $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'clinical_history_id',
                    'evolution_date',
                    'subjective',
                    'objective',
                    'assessment',
                    'plan',
                    'recommendations',
                    'created_by',
                    'updated_by',
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
     * Test creating a new clinical evolution.
     *
     * @return void
     */
    public function test_can_create_clinical_evolution()
    {
        $auth = $this->getAuthToken();
        $token = $auth['token'];
        $user = $auth['user'];

        // Create necessary related models
        $patient = Patient::factory()->create();
         // Ensure the specialist can access this patient via an appointment
        Appointment::factory()->create([
             'patient_id' => $patient->id,
             'specialist_id' => $user->id,
             'receptionist_id' => User::factory()->create(['role' => 'receptionist'])->id,
        ]);

        $clinicalHistory = ClinicalHistory::factory()->create([
             'patient_id' => $patient->id,
             'created_by' => $user->id, // Use authenticated user's ID
             'updated_by' => $user->id, // Use authenticated user's ID
        ]);

        $evolutionData = ClinicalEvolution::factory()->make([
            'clinical_history_id' => $clinicalHistory->id,
            'created_by' => $user->id, // Use authenticated user's ID
            'updated_by' => $user->id, // Use authenticated user's ID
        ])->toArray();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/v1/clinical-evolutions', $evolutionData);

        $response->assertStatus(201);
        $this->assertDatabaseHas('clinical_evolutions', ['clinical_history_id' => $clinicalHistory->id, 'subjective' => $evolutionData['subjective']]);
         $response->assertJsonStructure([
            'data' => [
                'id',
                'clinical_history_id',
                'evolution_date',
                // Add other expected fields in the response
            ]
        ]);
    }

    /**
     * Test viewing a single clinical evolution.
     *
     * @return void
     */
    public function test_can_view_clinical_evolution()
    {
        $auth = $this->getAuthToken();
        $token = $auth['token'];
        $user = $auth['user'];

        // Create necessary related models
        $patient = Patient::factory()->create();
         // Ensure the specialist can access this patient via an appointment
        Appointment::factory()->create([
             'patient_id' => $patient->id,
             'specialist_id' => $user->id,
             'receptionist_id' => User::factory()->create(['role' => 'receptionist'])->id,
        ]);
         $clinicalHistory = ClinicalHistory::factory()->create([
             'patient_id' => $patient->id,
              'created_by' => $user->id, // Use authenticated user's ID
              'updated_by' => $user->id, // Use authenticated user's ID
         ]);

        // Create a clinical evolution using the authenticated user
         $clinicalEvolution = ClinicalEvolution::factory()->create([
             'clinical_history_id' => $clinicalHistory->id,
             'created_by' => $user->id, // Use authenticated user's ID
             'updated_by' => $user->id, // Use authenticated user's ID
         ]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/v1/clinical-evolutions/' . $clinicalEvolution->id);

        $response->assertStatus(200);
         $response->assertJsonStructure([
            'data' => [
                'id',
                'clinical_history_id',
                'evolution_date',
                // Add other expected fields in the response
            ]
        ]);
        $response->assertJson(['data' => ['id' => $clinicalEvolution->id]]);
    }

    /**
     * Test updating a clinical evolution.
     *
     * @return void
     */
    public function test_can_update_clinical_evolution()
    {
        $auth = $this->getAuthToken();
        $token = $auth['token'];
        $user = $auth['user'];

         // Create necessary related models
        $patient = Patient::factory()->create();
         // Ensure the specialist can access this patient via an appointment
        Appointment::factory()->create([
             'patient_id' => $patient->id,
             'specialist_id' => $user->id,
             'receptionist_id' => User::factory()->create(['role' => 'receptionist'])->id,
        ]);
         $clinicalHistory = ClinicalHistory::factory()->create([
             'patient_id' => $patient->id,
              'created_by' => $user->id, // Use authenticated user's ID
              'updated_by' => $user->id, // Use authenticated user's ID
         ]);

        // Create a clinical evolution using the authenticated user
        $clinicalEvolution = ClinicalEvolution::factory()->create([
             'clinical_history_id' => $clinicalHistory->id,
             'created_by' => $user->id, // Use authenticated user's ID
             'updated_by' => $user->id, // Use authenticated user's ID
         ]);

        $updatedData = [
            'subjective' => 'Updated subjective notes.',
            'objective' => 'Updated objective findings.',
            'updated_by' => $user->id,
            // Add other fields to update as needed
        ];

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->putJson('/api/v1/clinical-evolutions/' . $clinicalEvolution->id, $updatedData);

        $response->assertStatus(200);
        $this->assertDatabaseHas('clinical_evolutions', ['id' => $clinicalEvolution->id, 'subjective' => 'Updated subjective notes.']);
         $response->assertJsonStructure([
            'data' => [
                'id',
                'clinical_history_id',
                'evolution_date',
                // Add other expected fields in the response
            ]
        ]);
    }

    /**
     * Test deleting a clinical evolution.
     *
     * @return void
     */
    public function test_can_delete_clinical_evolution()
    {
        $auth = $this->getAuthToken();
        $token = $auth['token'];
        $user = $auth['user'];

         // Create necessary related models
        $patient = Patient::factory()->create();
         // Ensure the specialist can access this patient via an appointment
        Appointment::factory()->create([
             'patient_id' => $patient->id,
             'specialist_id' => $user->id,
             'receptionist_id' => User::factory()->create(['role' => 'receptionist'])->id,
        ]);
         $clinicalHistory = ClinicalHistory::factory()->create([
             'patient_id' => $patient->id,
              'created_by' => $user->id, // Use authenticated user's ID
              'updated_by' => $user->id, // Use authenticated user's ID
         ]);

        // Create a clinical evolution using the authenticated user
         $clinicalEvolution = ClinicalEvolution::factory()->create([
             'clinical_history_id' => $clinicalHistory->id,
             'created_by' => $user->id, // Use authenticated user's ID
             'updated_by' => $user->id, // Use authenticated user's ID
         ]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->deleteJson('/api/v1/clinical-evolutions/' . $clinicalEvolution->id);

        $response->assertStatus(204);
        $this->assertDatabaseMissing('clinical_evolutions', ['id' => $clinicalEvolution->id]);
    }

    /**
     * Test creating a clinical evolution from an appointment.
     *
     * @return void
     */
    public function test_can_create_clinical_evolution_from_appointment()
    {
        $auth = $this->getAuthToken();
        $token = $auth['token'];
        $user = $auth['user'];

        // Create necessary related models
        $patient = Patient::factory()->create();
        $appointment = Appointment::factory()->create([
             'patient_id' => $patient->id,
             'specialist_id' => $user->id, // Assume the authenticated user is the specialist
             'receptionist_id' => User::factory()->create(['role' => 'receptionist'])->id,
        ]);

         // Create a clinical history for the patient if one doesn't exist
         $clinicalHistory = ClinicalHistory::firstOrCreate(
             ['patient_id' => $patient->id],
             ['created_by' => $user->id, 'updated_by' => $user->id, 'reason_for_consultation' => 'Initial consultation']
         );

        $evolutionData = ClinicalEvolution::factory()->make([
            // clinical_history_id and appointment_id will be handled by the controller
            'created_by' => $user->id, // Use authenticated user's ID
            'updated_by' => $user->id, // Use authenticated user's ID
        ])->toArray();

        // Remove keys that are expected to be set by the controller
        unset($evolutionData['clinical_history_id']);
        unset($evolutionData['appointment_id']);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/v1/appointments/' . $appointment->id . '/evolution', $evolutionData);

        $response->assertStatus(201);
        $this->assertDatabaseHas('clinical_evolutions', ['appointment_id' => $appointment->id, 'clinical_history_id' => $clinicalHistory->id, 'subjective' => $evolutionData['subjective']]);
         $response->assertJsonStructure([
            'data' => [
                'id',
                'clinical_history_id',
                'appointment_id',
                'evolution_date',
                // Add other expected fields in the response
            ]
        ]);
    }
} 