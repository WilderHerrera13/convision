<?php

namespace Tests\Feature\Api\V1;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DailyActivityReportQuickAttentionTest extends TestCase
{
    use RefreshDatabase;

    private function receptionistToken(): string
    {
        $user = User::factory()->create([
            'email' => 'recv_daily_quick@example.com',
            'password' => bcrypt('password'),
            'role' => 'receptionist',
            'last_name' => 'Test',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'recv_daily_quick@example.com',
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

    private function adminToken(): string
    {
        $user = User::factory()->create([
            'email' => 'admin_daily_quick@example.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'last_name' => 'Admin',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin_daily_quick@example.com',
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

    public function test_quick_attention_forbidden_for_admin(): void
    {
        $token = $this->adminToken();
        $date = now()->format('Y-m-d');

        $response = $this->postJson(
            '/api/v1/daily-activity-reports/quick-attention',
            [
                'report_date' => $date,
                'shift' => 'morning',
                'item' => 'bonos_entregados',
            ],
            ['Authorization' => 'Bearer '.$token]
        );

        $response->assertStatus(403);
    }

    public function test_quick_attention_increments_preguntas_hombre(): void
    {
        $token = $this->receptionistToken();
        $date = now()->format('Y-m-d');

        $response = $this->postJson(
            '/api/v1/daily-activity-reports/quick-attention',
            [
                'report_date' => $date,
                'shift' => 'morning',
                'item' => 'preguntas',
                'profile' => 'hombre',
            ],
            ['Authorization' => 'Bearer '.$token]
        );

        $response->assertStatus(200);
        $response->assertJsonPath('data.atencion.preguntas.hombre', 1);
    }

    public function test_quick_attention_requires_profile_for_preguntas(): void
    {
        $token = $this->receptionistToken();
        $date = now()->format('Y-m-d');

        $response = $this->postJson(
            '/api/v1/daily-activity-reports/quick-attention',
            [
                'report_date' => $date,
                'shift' => 'morning',
                'item' => 'preguntas',
            ],
            ['Authorization' => 'Bearer '.$token]
        );

        $response->assertStatus(422);
    }

    public function test_quick_attention_note_exceeds_max_returns_spanish_message(): void
    {
        $token = $this->receptionistToken();
        $date = now()->format('Y-m-d');

        $response = $this->postJson(
            '/api/v1/daily-activity-reports/quick-attention',
            [
                'report_date' => $date,
                'shift' => 'morning',
                'item' => 'bonos_entregados',
                'note' => str_repeat('x', 501),
            ],
            ['Authorization' => 'Bearer '.$token]
        );

        $response->assertStatus(422);
        $response->assertJsonPath('errors.note.0', 'La observación no puede superar 500 caracteres.');
    }

    public function test_quick_attention_note_strips_html_tags_from_observations(): void
    {
        $token = $this->receptionistToken();
        $date = now()->format('Y-m-d');

        $response = $this->postJson(
            '/api/v1/daily-activity-reports/quick-attention',
            [
                'report_date' => $date,
                'shift' => 'morning',
                'item' => 'bonos_entregados',
                'note' => 'Texto <script>alert(1)</script> fin',
            ],
            ['Authorization' => 'Bearer '.$token]
        );

        $response->assertStatus(200);
        $obs = $response->json('data.observations');
        $this->assertStringContainsString('Texto', $obs);
        $this->assertStringNotContainsString('<script>', $obs);
    }
}
