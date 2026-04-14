<?php

namespace App\Services;

use App\Models\CashRegisterClose;
use App\Models\CashRegisterClosePayment;
use App\Models\CashCountDenomination;
use Illuminate\Support\Facades\DB;

class CashRegisterCloseService
{
    public function createWithDetails(array $validated, int $userId): CashRegisterClose
    {
        return DB::transaction(function () use ($validated, $userId) {
            $close = CashRegisterClose::create([
                'user_id' => $userId,
                'close_date' => $validated['close_date'],
                'status' => CashRegisterClose::STATUS_DRAFT,
                'total_registered' => 0,
                'total_counted' => 0,
                'total_difference' => 0,
            ]);

            foreach ($validated['payment_methods'] as $method) {
                $difference = $method['registered_amount'] - $method['counted_amount'];
                CashRegisterClosePayment::create([
                    'cash_register_close_id' => $close->id,
                    'payment_method_name' => $method['name'],
                    'registered_amount' => $method['registered_amount'],
                    'counted_amount' => $method['counted_amount'],
                    'difference' => $difference,
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

        $totalRegistered = $payments->sum('registered_amount');
        $totalCounted = $payments->sum('counted_amount');
        $totalDifference = $totalRegistered - $totalCounted;

        $close->update([
            'total_registered' => $totalRegistered,
            'total_counted' => $totalCounted,
            'total_difference' => $totalDifference,
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

            if (isset($validated['payment_methods'])) {
                $close->payments()->delete();
                foreach ($validated['payment_methods'] as $method) {
                    $difference = $method['registered_amount'] - $method['counted_amount'];
                    CashRegisterClosePayment::create([
                        'cash_register_close_id' => $close->id,
                        'payment_method_name' => $method['name'],
                        'registered_amount' => $method['registered_amount'],
                        'counted_amount' => $method['counted_amount'],
                        'difference' => $difference,
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

        $close->update(['status' => CashRegisterClose::STATUS_SUBMITTED]);

        return $close->fresh();
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

        return $close->fresh();
    }
}
