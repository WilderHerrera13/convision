<?php

namespace Tests\Feature\Api\V1;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;

class UserControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function authenticateUser()
    {
        $user = User::factory()->create([
            'email' => 'testuser@example.com',
            'password' => bcrypt('password'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'testuser@example.com',
            'password' => 'password',
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
     * Test listing users.
     *
     * @return void
     */
    public function test_can_list_users()
    {
        $token = $this->authenticateUser();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/v1/users');

        $response->assertStatus(200);
        // Add assertions for the response structure and data
    }

    /**
     * Test viewing a single user.
     *
     * @return void
     */
    public function test_can_view_user()
    {
        $token = $this->authenticateUser();
        $userToView = User::factory()->create();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/v1/users/' . $userToView->id);

        $response->assertStatus(200);
        // Add assertions for the response structure and data
    }

    /**
     * Test creating a new user.
     *
     * @return void
     */
    public function test_can_create_user()
    {
        $token = $this->authenticateUser();

        $userData = [
            'name' => 'Test User',
            'last_name' => 'Test Last Name',
            'email' => 'createuser@example.com',
            'identification' => '1234567890',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => 'receptionist',
        ];

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->postJson('/api/v1/users', $userData);

        $response->assertStatus(201);
        // Add assertions for the response structure and that the user was created in the database
    }

    /**
     * Test updating a user.
     *
     * @return void
     */
    public function test_can_update_user()
    {
        $token = $this->authenticateUser();
        $userToUpdate = User::factory()->create();

        $updatedData = [
            'name' => 'Updated User Name',
            'last_name' => 'Updated Last Name',
            'email' => 'updateduser@example.com',
            'identification' => '0987654321',
            'role' => 'specialist',
            // Include other updatable fields
        ];

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->putJson('/api/v1/users/' . $userToUpdate->id, $updatedData);

        $response->assertStatus(200);
        // Add assertions for the response structure and that the user was updated in the database
    }

    /**
     * Test deleting a user.
     *
     * @return void
     */
    public function test_can_delete_user()
    {
        $token = $this->authenticateUser();
        $userToDelete = User::factory()->create();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->deleteJson('/api/v1/users/' . $userToDelete->id);

        $response->assertStatus(204);
        // Add assertion that the user was deleted from the database
    }
} 