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

    public function test_store_rejects_future_close_date(): void
    {
        $token = $this->receptionistToken();

        $methods = $this->zeroPaymentMethodsPayload();
        $methods[0]['counted_amount'] = 1000;

        $future = now()->addDays(5)->format('Y-m-d');

        $create = $this->withHeaders(['Authorization' => 'Bearer '.$token])
            ->postJson('/api/v1/cash-register-closes', [
                'close_date' => $future,
                'payment_methods' => $methods,
                'denominations' => [],
            ]);

        $create->assertStatus(422);
        $create->assertJsonValidationErrors(['close_date']);
    }

    public function test_create_persists_advisor_notes(): void
    {
        $token = $this->receptionistToken();

        $methods = $this->zeroPaymentMethodsPayload();
        $methods[0]['counted_amount'] = 1000;

        $create = $this->withHeaders(['Authorization' => 'Bearer '.$token])
            ->postJson('/api/v1/cash-register-closes', [
                'close_date' => now()->format('Y-m-d'),
                'payment_methods' => $methods,
                'denominations' => [],
                'advisor_notes' => 'Cambio revisado con supervisor.',
            ]);

        $create->assertStatus(200);
        $create->assertJsonPath('data.advisor_notes', 'Cambio revisado con supervisor.');
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

    public function test_index_filters_by_close_date_for_receptionist(): void
    {
        $token = $this->receptionistToken();
        $methods = $this->zeroPaymentMethodsPayload();
        $methods[0]['counted_amount'] = 1000;

        $dayA = now()->subDays(3)->format('Y-m-d');
        $dayB = now()->subDays(1)->format('Y-m-d');

        $this->withHeaders(['Authorization' => 'Bearer '.$token])
            ->postJson('/api/v1/cash-register-closes', [
                'close_date' => $dayA,
                'payment_methods' => $methods,
                'denominations' => [],
            ])
            ->assertStatus(200);

        $this->withHeaders(['Authorization' => 'Bearer '.$token])
            ->postJson('/api/v1/cash-register-closes', [
                'close_date' => $dayB,
                'payment_methods' => $methods,
                'denominations' => [],
            ])
            ->assertStatus(200);

        $listA = $this->withHeaders(['Authorization' => 'Bearer '.$token])
            ->getJson('/api/v1/cash-register-closes?close_date='.$dayA.'&per_page=50');

        $listA->assertStatus(200);
        $listA->assertJsonPath('meta.total', 1);
        $listA->assertJsonPath('data.0.close_date', $dayA);

        $listB = $this->withHeaders(['Authorization' => 'Bearer '.$token])
            ->getJson('/api/v1/cash-register-closes?close_date='.$dayB.'&per_page=50');

        $listB->assertStatus(200);
        $listB->assertJsonPath('meta.total', 1);
        $listB->assertJsonPath('data.0.close_date', $dayB);
    }

    public function test_admin_cannot_approve_submitted_close_without_admin_actuals(): void
    {
        $recv = $this->receptionistToken();
        $methods = $this->zeroPaymentMethodsPayload();
        $methods[0]['counted_amount'] = 4000;

        $create = $this->withHeaders(['Authorization' => 'Bearer '.$recv])
            ->postJson('/api/v1/cash-register-closes', [
                'close_date' => now()->format('Y-m-d'),
                'payment_methods' => $methods,
                'denominations' => [],
            ]);
        $create->assertStatus(200);
        $id = $create->json('data.id');

        $this->withHeaders(['Authorization' => 'Bearer '.$recv])
            ->postJson("/api/v1/cash-register-closes/{$id}/submit")
            ->assertStatus(200);

        $admin = $this->adminToken();
        $approve = $this->withHeaders(['Authorization' => 'Bearer '.$admin])
            ->postJson("/api/v1/cash-register-closes/{$id}/approve", []);

        $approve->assertStatus(422);
        $approve->assertJsonValidationErrors(['approve']);
    }

    public function test_admin_can_approve_after_recording_actuals(): void
    {
        $recv = $this->receptionistToken();
        $methods = $this->zeroPaymentMethodsPayload();
        $methods[0]['counted_amount'] = 4000;

        $create = $this->withHeaders(['Authorization' => 'Bearer '.$recv])
            ->postJson('/api/v1/cash-register-closes', [
                'close_date' => now()->subDay()->format('Y-m-d'),
                'payment_methods' => $methods,
                'denominations' => [],
            ]);
        $create->assertStatus(200);
        $id = $create->json('data.id');

        $this->withHeaders(['Authorization' => 'Bearer '.$recv])
            ->postJson("/api/v1/cash-register-closes/{$id}/submit")
            ->assertStatus(200);

        $admin = $this->adminToken();
        $this->withHeaders(['Authorization' => 'Bearer '.$admin])
            ->putJson("/api/v1/cash-register-closes/{$id}/admin-actuals", [
                'actual_payment_methods' => $this->adminActualsPayload(4000),
            ])
            ->assertStatus(200);

        $this->withHeaders(['Authorization' => 'Bearer '.$admin])
            ->postJson("/api/v1/cash-register-closes/{$id}/approve", [])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'approved');
    }

    public function test_calendar_close_variance_is_null_without_admin_actuals(): void
    {
        $recv = $this->receptionistToken();
        $userId = (int) User::where('email', 'recv_cash_test@example.com')->value('id');
        $closeDate = now()->format('Y-m-d');
        $methods = $this->zeroPaymentMethodsPayload();
        $methods[0]['counted_amount'] = 12000;

        $create = $this->withHeaders(['Authorization' => 'Bearer '.$recv])
            ->postJson('/api/v1/cash-register-closes', [
                'close_date' => $closeDate,
                'payment_methods' => $methods,
                'denominations' => [
                    ['denomination' => 1000, 'quantity' => 3],
                ],
            ]);
        $create->assertStatus(200);
        $id = (int) $create->json('data.id');

        $this->withHeaders(['Authorization' => 'Bearer '.$recv])
            ->postJson("/api/v1/cash-register-closes/{$id}/submit")
            ->assertStatus(200);

        $admin = $this->adminToken();
        $from = now()->subDay()->format('Y-m-d');
        $to = now()->addDay()->format('Y-m-d');

        $calendar = $this->withHeaders(['Authorization' => 'Bearer '.$admin])
            ->getJson('/api/v1/cash-register-closes-calendar?user_id='.$userId.'&date_from='.$from.'&date_to='.$to);

        $calendar->assertStatus(200);
        $days = $calendar->json('data.days');
        $day = collect($days)->firstWhere('date', $closeDate);
        $this->assertIsArray($day);
        $this->assertIsArray($day['close']);
        $this->assertNull($day['close']['variance']);
        $this->assertNull($day['close']['total_actual_amount']);
    }
}
