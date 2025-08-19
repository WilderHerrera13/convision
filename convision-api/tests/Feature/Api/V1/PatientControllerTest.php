<?php

namespace Tests\Feature\Api\V1;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Patient;
use Illuminate\Foundation\Testing\WithFaker;

class PatientControllerTest extends TestCase
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
     * Test listing patients.
     *
     * @return void
     */
    public function test_can_list_patients()
    {
        $token = $this->getAuthToken();

        Patient::factory()->count(3)->create();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/v1/patients');

        $response->assertStatus(200);
        $response->assertJsonCount(3, 'data');
        $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'first_name',
                    'last_name',
                    'email',
                    // Add other expected patient fields in the listing
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
     * Test creating a new patient.
     *
     * @return void
     */
    public function test_can_create_patient()
    {
        $token = $this->getAuthToken();

        $patientData = Patient::factory()->make()->toArray();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/v1/patients', $patientData);

        $response->assertStatus(201);
        $this->assertDatabaseHas('patients', ['email' => $patientData['email']]);
        $response->assertJsonStructure([
            'data' => [
                'id',
                'first_name',
                'last_name',
                'email',
                // Add other expected patient fields in the response
            ]
        ]);
    }

    /**
     * Test viewing a single patient.
     *
     * @return void
     */
    public function test_can_view_patient()
    {
        $token = $this->getAuthToken();
        $patient = Patient::factory()->create();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/v1/patients/' . $patient->id);

        $response->assertStatus(200);
        $response->assertJsonStructure([
             'data' => [
                'id',
                'first_name',
                'last_name',
                'email',
                // Add other expected patient fields in the response
            ]
        ]);
        $response->assertJson([
             'data' => ['email' => $patient->email],
        ]);
    }

    /**
     * Test updating a patient.
     *
     * @return void
     */
    public function test_can_update_patient()
    {
        $token = $this->getAuthToken();
        $patient = Patient::factory()->create();

        $updatedData = [
            'first_name' => 'Updated',
            'last_name' => 'Patient',
            'phone' => $this->faker->phoneNumber, // Example of updating a field
            // Add other fields to update as needed
        ];

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->putJson('/api/v1/patients/' . $patient->id, $updatedData);

        $response->assertStatus(200);
        $this->assertDatabaseHas('patients', ['id' => $patient->id, 'first_name' => 'Updated', 'last_name' => 'Patient']);
        $response->assertJsonStructure([
             'data' => [
                'id',
                'first_name',
                'last_name',
                'email',
                // Add other expected patient fields in the response
            ]
        ]);
    }

    /**
     * Test deleting a patient.
     *
     * @return void
     */
    public function test_can_delete_patient()
    {
        $token = $this->getAuthToken();
        $patient = Patient::factory()->create();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->deleteJson('/api/v1/patients/' . $patient->id);

        $response->assertStatus(204);
        $this->assertSoftDeleted('patients', ['id' => $patient->id]);
    }

    // Add tests for restore and profile image upload later
} 