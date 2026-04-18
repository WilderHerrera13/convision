<?php

namespace App\Services;

use App\Models\CashRegisterClose;
use App\Models\CashRegisterClosePayment;
use App\Models\CashRegisterCloseActualPayment;
use App\Models\CashCountDenomination;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CashRegisterCloseService
{
    public function createWithDetails(array $validated, int $userId): CashRegisterClose
    {
        return DB::transaction(function () use ($validated, $userId) {
            $close = CashRegisterClose::create([
                'user_id' => $userId,
                'close_date' => $validated['close_date'],
                'status' => CashRegisterClose::STATUS_DRAFT,
                'total_counted' => 0,
                'advisor_notes' => $validated['advisor_notes'] ?? null,
            ]);

            foreach ($validated['payment_methods'] as $method) {
                CashRegisterClosePayment::create([
                    'cash_register_close_id' => $close->id,
                    'payment_method_name' => $method['name'],
                    'counted_amount' => $method['counted_amount'],
                ]);
            }

            if (!empty($validated['denominations'])) {
                foreach ($validated['denominations'] as $denom) {
                    CashCountDenomination::create([
                        'cash_register_close_id' => $close->id,
                        'denomination' => $denom['denomination'],
                        'quantity' => $denom['quantity'],
                        'subtotal' => $denom['denomination'] * $denom['quantity'],
                    ]);
                }
            }

            $this->recalculateTotals($close);

            return $close->fresh();
        });
    }

    public function recalculateTotals(CashRegisterClose $close): void
    {
        $payments = CashRegisterClosePayment::where('cash_register_close_id', $close->id)->get();

        $totalCounted = $payments->sum('counted_amount');

        $close->update([
            'total_counted' => $totalCounted,
        ]);
    }

    public function updateWithDetails(CashRegisterClose $close, array $validated): CashRegisterClose
    {
        return DB::transaction(function () use ($close, $validated) {
            if ($close->status !== CashRegisterClose::STATUS_DRAFT) {
                throw new \Exception('Solo se pueden editar cierres en estado borrador.');
            }

            if (isset($validated['close_date'])) {
                $close->update(['close_date' => $validated['close_date']]);
            }

            if (array_key_exists('advisor_notes', $validated)) {
                $close->update([
                    'advisor_notes' => $validated['advisor_notes'] === '' ? null : $validated['advisor_notes'],
                ]);
            }

            if (isset($validated['payment_methods'])) {
                $close->payments()->delete();
                foreach ($validated['payment_methods'] as $method) {
                    CashRegisterClosePayment::create([
                        'cash_register_close_id' => $close->id,
                        'payment_method_name' => $method['name'],
                        'counted_amount' => $method['counted_amount'],
                    ]);
                }
            }

            if (isset($validated['denominations'])) {
                $close->denominations()->delete();
                foreach ($validated['denominations'] as $denom) {
                    CashCountDenomination::create([
                        'cash_register_close_id' => $close->id,
                        'denomination' => $denom['denomination'],
                        'quantity' => $denom['quantity'],
                        'subtotal' => $denom['denomination'] * $denom['quantity'],
                    ]);
                }
            }

            $this->recalculateTotals($close);

            return $close->fresh();
        });
    }

    public function submit(CashRegisterClose $close): CashRegisterClose
    {
        if ($close->status !== CashRegisterClose::STATUS_DRAFT) {
            throw new \Exception('Solo se pueden enviar cierres en estado borrador.');
        }

        $this->recalculateTotals($close);
        $close->refresh();

        $totalPaymentCounted = (float) $close->total_counted;
        $denomTotal = (float) CashCountDenomination::where('cash_register_close_id', $close->id)->sum('subtotal');

        if ($totalPaymentCounted <= 0 && $denomTotal <= 0) {
            throw ValidationException::withMessages([
                'submit' => ['No se puede enviar un cierre sin montos. Declare al menos un valor contado en medios de pago o complete el arqueo de efectivo.'],
            ]);
        }

        $close->update(['status' => CashRegisterClose::STATUS_SUBMITTED]);

        return $close->fresh()->load(['payments', 'denominations', 'user']);
    }

    public function approve(CashRegisterClose $close, int $adminId, ?string $notes): CashRegisterClose
    {
        if ($close->status !== CashRegisterClose::STATUS_SUBMITTED) {
            throw new \Exception('Solo se pueden aprobar cierres en estado enviado.');
        }

        $close->update([
            'status' => CashRegisterClose::STATUS_APPROVED,
            'approved_by' => $adminId,
            'approved_at' => now(),
            'admin_notes' => $notes,
        ]);

        return $close->fresh()->load(['payments', 'denominations', 'user', 'approvedBy', 'actualPayments']);
    }

    /**
     * Totales reales ingresados por administración (ventas / contabilidad manual hasta integración).
     */
    public function returnToDraft(CashRegisterClose $close, ?string $notes): CashRegisterClose
    {
        if ($close->status !== CashRegisterClose::STATUS_SUBMITTED) {
            throw new \Exception('Solo se pueden devolver cierres en estado enviado.');
        }

        $close->update([
            'status' => CashRegisterClose::STATUS_DRAFT,
            'admin_notes' => $notes,
        ]);

        return $close->fresh()->load(['payments', 'denominations', 'user', 'actualPayments']);
    }

    public function syncAdminActualAmounts(CashRegisterClose $close, array $actualPaymentMethods): CashRegisterClose
    {
        return DB::transaction(function () use ($close, $actualPaymentMethods) {
            $close->actualPayments()->delete();

            $sum = 0;
            foreach ($actualPaymentMethods as $row) {
                $amount = (float) $row['actual_amount'];
                CashRegisterCloseActualPayment::create([
                    'cash_register_close_id' => $close->id,
                    'payment_method_name' => $row['name'],
                    'actual_amount' => $amount,
                ]);
                $sum += $amount;
            }

            $close->update([
                'total_actual_amount' => $sum,
                'admin_actuals_recorded_at' => now(),
            ]);

            return $close->fresh()->load(['payments', 'denominations', 'user', 'approvedBy', 'actualPayments']);
        });
    }
}
