<?php

namespace Tests\Feature\Api\V1;

use App\Models\AdminUserNotification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminNotificationControllerTest extends TestCase
{
    use RefreshDatabase;

    private function adminToken(): string
    {
        $user = User::factory()->create([
            'email' => 'notif_admin_test@example.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'last_name' => 'Test',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'notif_admin_test@example.com',
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

    public function test_index_returns_counts_and_filters_unread(): void
    {
        $token = $this->adminToken();
        $user = User::where('email', 'notif_admin_test@example.com')->first();

        AdminUserNotification::factory()->count(2)->create(['user_id' => $user->id, 'read_at' => null, 'archived_at' => null]);
        AdminUserNotification::factory()->read()->create(['user_id' => $user->id, 'archived_at' => null]);
        AdminUserNotification::factory()->archived()->create(['user_id' => $user->id]);

        $res = $this->withHeaders(['Authorization' => 'Bearer '.$token])
            ->getJson('/api/v1/admin/notifications?scope=unread');

        $res->assertStatus(200);
        $res->assertJsonPath('counts.unread', 2);
        $res->assertJsonCount(2, 'data');

        $all = $this->withHeaders(['Authorization' => 'Bearer '.$token])
            ->getJson('/api/v1/admin/notifications?scope=all');

        $all->assertStatus(200);
        $all->assertJsonCount(3, 'data');
    }

    public function test_summary_returns_counts(): void
    {
        $token = $this->adminToken();
        $user = User::where('email', 'notif_admin_test@example.com')->first();

        AdminUserNotification::factory()->create(['user_id' => $user->id, 'read_at' => null]);
        AdminUserNotification::factory()->archived()->create(['user_id' => $user->id]);

        $res = $this->withHeaders(['Authorization' => 'Bearer '.$token])
            ->getJson('/api/v1/admin/notifications/summary');

        $res->assertStatus(200);
        $res->assertJsonPath('data.unread', 1);
        $res->assertJsonPath('data.archived', 1);
    }

    public function test_mark_read_and_delete(): void
    {
        $token = $this->adminToken();
        $user = User::where('email', 'notif_admin_test@example.com')->first();
        $n = AdminUserNotification::factory()->create(['user_id' => $user->id, 'read_at' => null]);

        $read = $this->withHeaders(['Authorization' => 'Bearer '.$token])
            ->patchJson("/api/v1/admin/notifications/{$n->id}/read");

        $read->assertStatus(200);
        $this->assertNotNull($read->json('data.read_at'));

        $del = $this->withHeaders(['Authorization' => 'Bearer '.$token])
            ->deleteJson("/api/v1/admin/notifications/{$n->id}");

        $del->assertStatus(204);
        $this->assertDatabaseMissing('admin_user_notifications', ['id' => $n->id]);
    }

    public function test_non_admin_cannot_access(): void
    {
        $recv = User::factory()->create([
            'email' => 'notif_recv@example.com',
            'password' => bcrypt('password'),
            'role' => 'receptionist',
            'last_name' => 'R',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'notif_recv@example.com',
            'password' => 'password',
            'newPassword' => null,
            'confirmNewPassword' => null,
            'verificationCode' => null,
            'forgotPasswordFlg' => false,
            'confirmForgotPasswordFlg' => false,
            'newPasswordFlg' => false,
            'verifyEmailFlg' => false,
        ]);

        $token = $response->json('access_token');

        $res = $this->withHeaders(['Authorization' => 'Bearer '.$token])
            ->getJson('/api/v1/admin/notifications');

        $res->assertStatus(403);
    }
}
