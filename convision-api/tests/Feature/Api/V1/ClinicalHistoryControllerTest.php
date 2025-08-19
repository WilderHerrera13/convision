<?php

namespace Tests\Feature\Api\V1;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Patient;
use App\Models\ClinicalHistory;
use Illuminate\Foundation\Testing\WithFaker;

class ClinicalHistoryControllerTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected function getAuthToken($email = 'testuser@example.com', $password = 'password')
    {
        $user = User::factory()->create([
            'email' => $email,
            'password' => bcrypt($password),
            'role' => 'admin', // Use admin for easier testing of listing/access
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
     * Test listing clinical histories.
     *
     * @return void
     */
    public function test_can_list_clinical_histories()
    {
        $auth = $this->getAuthToken();
        $token = $auth['token'];
        $user = $auth['user'];

        // Create necessary data for clinical histories
        $patient = Patient::factory()->create();
        ClinicalHistory::factory()->count(3)->create([
            'patient_id' => $patient->id,
            'created_by' => User::factory()->create(['role' => 'specialist'])->id,
            'updated_by' => User::factory()->create(['role' => 'specialist'])->id,
        ]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/v1/clinical-histories');

        $response->assertStatus(200);
        // Add assertions for the response structure and data, e.g., total count
        $response->assertJsonCount(3, 'data');
        $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'patient_id',
                    'reason_for_consultation',
                    // Add other expected fields in the listing
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
     * Test creating a new clinical history.
     *
     * @return void
     */
    public function test_can_create_clinical_history()
    {
        $auth = $this->getAuthToken();
        $token = $auth['token'];
        $user = $auth['user']; // Get the authenticated user

        // Create necessary related models
        $patient = Patient::factory()->create();

        $historyData = ClinicalHistory::factory()->make([
            'patient_id' => $patient->id,
            'created_by' => $user->id, // Use authenticated user's ID
            'updated_by' => $user->id, // Use authenticated user's ID
        ])->toArray();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/v1/clinical-histories', $historyData);

        $response->assertStatus(201);
        $this->assertDatabaseHas('clinical_histories', ['patient_id' => $patient->id, 'reason_for_consultation' => $historyData['reason_for_consultation']]);
        $response->assertJsonStructure([
            'data' => [
                'id',
                'patient_id',
                'reason_for_consultation',
                // Add other expected fields in the response
            ]
        ]);
    }

    /**
     * Test viewing a single clinical history.
     *
     * @return void
     */
    public function test_can_view_clinical_history()
    {
        $auth = $this->getAuthToken();
        $token = $auth['token'];
        $user = $auth['user']; // Get the authenticated user

        // Create a clinical history using the authenticated user
        $history = ClinicalHistory::factory()->create([
             'created_by' => $user->id,
             'updated_by' => $user->id,
        ]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/v1/clinical-histories/' . $history->id);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                'id',
                'patient_id',
                'reason_for_consultation',
                // Add other expected fields in the response
            ]
        ]);
        $response->assertJson(['data' => ['id' => $history->id]]);
    }

    /**
     * Test updating a clinical history.
     *
     * @return void
     */
    public function test_can_update_clinical_history()
    {
        $auth = $this->getAuthToken();
        $token = $auth['token'];
        $user = $auth['user']; // Get the authenticated user

        // Create a clinical history using the authenticated user
        $history = ClinicalHistory::factory()->create([
             'created_by' => $user->id,
             'updated_by' => $user->id,
        ]);

        $updatedData = [
            'reason_for_consultation' => 'Updated Reason',
            'current_illness' => 'Updated illness description.',
            'updated_by' => $user->id, // Use the authenticated user's ID
            // Add other fields to update as needed
        ];

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->putJson('/api/v1/clinical-histories/' . $history->id, $updatedData);

        $response->assertStatus(200);
        $this->assertDatabaseHas('clinical_histories', ['id' => $history->id, 'reason_for_consultation' => 'Updated Reason']);
        $response->assertJsonStructure([
            'data' => [
                'id',
                'patient_id',
                'reason_for_consultation',
                // Add other expected fields in the response
            ]
        ]);
    }

    /**
     * Test getting clinical history for a specific patient.
     *
     * @return void
     */
    public function test_can_get_patient_clinical_history()
    {
        $auth = $this->getAuthToken();
        $token = $auth['token'];
        $user = $auth['user']; // Get the authenticated user

        // Create a patient and a clinical history for them using the authenticated user
        $patient = Patient::factory()->create();
        $clinicalHistory = ClinicalHistory::factory()->create([
            'patient_id' => $patient->id,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        // Create a clinical history for another patient to ensure filtering
        ClinicalHistory::factory()->create(); // This history will be created by a new user by default

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/v1/patients/' . $patient->id . '/clinical-history');

        $response->assertStatus(200);
        // The endpoint returns a single clinical history, not a collection
        $response->assertJsonStructure([
            'data' => [
                'id',
                'patient_id',
                'reason_for_consultation',
                // Add other expected fields in the response
            ]
        ]);

        // Assert that the returned history belongs to the correct patient
        $this->assertEquals($patient->id, $response->json('data.patient_id'));
    }

    // No delete method in ClinicalHistoryController according to routes
} 