<?php

namespace Tests\Feature\Api\V1;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CashRegisterCloseControllerTest extends TestCase
{
    use RefreshDatabase;

    private function receptionistToken(): string
    {
        $user = User::factory()->create([
            'email' => 'recv_cash_test@example.com',
            'password' => bcrypt('password'),
            'role' => 'receptionist',
            'last_name' => 'Test',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'recv_cash_test@example.com',
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
     * @return array<int, array{name: string, counted_amount: int}>
     */
    private function zeroPaymentMethodsPayload(): array
    {
        $names = ['efectivo', 'voucher', 'bancolombia', 'daviplata', 'nequi', 'addi', 'sistecredito', 'anticipo', 'bono', 'pago_sistecredito'];

        return array_map(static fn (string $name) => [
            'name' => $name,
            'counted_amount' => 0,
        ], $names);
    }

    public function test_submit_rejects_when_all_amounts_are_zero(): void
    {
        $token = $this->receptionistToken();

        $create = $this->withHeaders(['Authorization' => 'Bearer '.$token])
            ->postJson('/api/v1/cash-register-closes', [
                'close_date' => now()->format('Y-m-d'),
                'payment_methods' => $this->zeroPaymentMethodsPayload(),
                'denominations' => [],
            ]);

        $create->assertStatus(200);
        $id = $create->json('data.id');

        $submit = $this->withHeaders(['Authorization' => 'Bearer '.$token])
            ->postJson("/api/v1/cash-register-closes/{$id}/submit");

        $submit->assertStatus(422);
        $submit->assertJsonValidationErrors(['submit']);
    }

    public function test_submit_succeeds_when_payment_counted_is_non_zero(): void
    {
        $token = $this->receptionistToken();

        $methods = $this->zeroPaymentMethodsPayload();
        $methods[0]['counted_amount'] = 5000;

        $create = $this->withHeaders(['Authorization' => 'Bearer '.$token])
            ->postJson('/api/v1/cash-register-closes', [
                'close_date' => now()->format('Y-m-d'),
                'payment_methods' => $methods,
                'denominations' => [],
            ]);

        $create->assertStatus(200);
        $id = $create->json('data.id');

        $submit = $this->withHeaders(['Authorization' => 'Bearer '.$token])
            ->postJson("/api/v1/cash-register-closes/{$id}/submit");

        $submit->assertStatus(200);
        $submit->assertJsonPath('data.status', 'submitted');
    }

    public function test_submit_succeeds_when_only_denominations_non_zero(): void
    {
        $token = $this->receptionistToken();

        $create = $this->withHeaders(['Authorization' => 'Bearer '.$token])
            ->postJson('/api/v1/cash-register-closes', [
                'close_date' => now()->format('Y-m-d'),
                'payment_methods' => $this->zeroPaymentMethodsPayload(),
                'denominations' => [
                    ['denomination' => 1000, 'quantity' => 5],
                ],
            ]);

        $create->assertStatus(200);
        $id = $create->json('data.id');

        $submit = $this->withHeaders(['Authorization' => 'Bearer '.$token])
            ->postJson("/api/v1/cash-register-closes/{$id}/submit");

        $submit->assertStatus(200);
        $submit->assertJsonPath('data.status', 'submitted');
    }

    private function adminToken(): string
    {
        User::factory()->create([
            'email' => 'admin_cash_actual@example.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'last_name' => 'Admin',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin_cash_actual@example.com',
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
     * @return array<int, array{name: string, actual_amount: int}>
     */
    private function adminActualsPayload(int $efectivoActual = 0): array
    {
        $names = ['efectivo', 'voucher', 'bancolombia', 'daviplata', 'nequi', 'addi', 'sistecredito', 'anticipo', 'bono', 'pago_sistecredito'];

        return array_map(static function (string $name) use ($efectivoActual) {
            return [
                'name' => $name,
                'actual_amount' => $name === 'efectivo' ? $efectivoActual : 0,
            ];
        }, $names);
    }

    public function test_admin_can_put_actuals_and_reconciliation_variance(): void
    {
        $recv = $this->receptionistToken();
        $methods = $this->zeroPaymentMethodsPayload();
        $methods[0]['counted_amount'] = 5000;

        $create = $this->withHeaders(['Authorization' => 'Bearer '.$recv])
            ->postJson('/api/v1/cash-register-closes', [
                'close_date' => now()->format('Y-m-d'),
                'payment_methods' => $methods,
                'denominations' => [],
            ]);
        $create->assertStatus(200);
        $id = $create->json('data.id');

        $admin = $this->adminToken();
        $put = $this->withHeaders(['Authorization' => 'Bearer '.$admin])
            ->putJson("/api/v1/cash-register-closes/{$id}/admin-actuals", [
                'actual_payment_methods' => $this->adminActualsPayload(3000),
            ]);

        $put->assertStatus(200);
        $put->assertJsonPath('data.total_actual_amount', 3000);
        $put->assertJsonPath('data.reconciliation.totals.advisor_total', 5000);
        $put->assertJsonPath('data.reconciliation.totals.admin_total', 3000);
        $put->assertJsonPath('data.reconciliation.totals.variance_total', 2000);
    }

    public function test_receptionist_show_omits_admin_reconciliation_fields(): void
    {
        $recv = $this->receptionistToken();
        $methods = $this->zeroPaymentMethodsPayload();
        $methods[0]['counted_amount'] = 1000;

        $create = $this->withHeaders(['Authorization' => 'Bearer '.$recv])
            ->postJson('/api/v1/cash-register-closes', [
                'close_date' => now()->format('Y-m-d'),
                'payment_methods' => $methods,
                'denominations' => [],
            ]);
        $id = $create->json('data.id');

        $admin = $this->adminToken();
        $this->withHeaders(['Authorization' => 'Bearer '.$admin])
            ->putJson("/api/v1/cash-register-closes/{$id}/admin-actuals", [
                'actual_payment_methods' => $this->adminActualsPayload(500),
            ])
            ->assertStatus(200);

        $show = $this->withHeaders(['Authorization' => 'Bearer '.$recv])
            ->getJson("/api/v1/cash-register-closes/{$id}");

        $show->assertStatus(200);
        $data = $show->json('data');
        $this->assertArrayNotHasKey('reconciliation', $data);
        $this->assertArrayNotHasKey('total_actual_amount', $data);
    }

    public function test_receptionist_cannot_put_admin_actuals(): void
    {
        $recv = $this->receptionistToken();
        $create = $this->withHeaders(['Authorization' => 'Bearer '.$recv])
            ->postJson('/api/v1/cash-register-closes', [
                'close_date' => now()->format('Y-m-d'),
                'payment_methods' => $this->zeroPaymentMethodsPayload(),
                'denominations' => [],
            ]);
        $id = $create->json('data.id');

        $this->withHeaders(['Authorization' => 'Bearer '.$recv])
            ->putJson("/api/v1/cash-register-closes/{$id}/admin-actuals", [
                'actual_payment_methods' => $this->adminActualsPayload(),
            ])
            ->assertStatus(403);
    }
}
