<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\PartialPayment;
use Illuminate\Support\Facades\DB;

class PartialPaymentService
{
    public function getPaymentsBySale($saleId)
    {
        $sale = Sale::findOrFail($saleId);
        
        return $sale->partialPayments()
            ->with(['paymentMethod', 'createdBy'])
            ->orderBy('payment_date', 'desc')
            ->get();
    }

    public function createPartialPayment($saleId, array $data, $user)
    {
        $sale = Sale::findOrFail($saleId);

        return DB::transaction(function () use ($sale, $data, $user) {
            $payment = $sale->partialPayments()->create([
                'payment_method_id' => $data['payment_method_id'],
                'amount' => $data['amount'],
                'reference_number' => $data['reference_number'] ?? null,
                'payment_date' => $data['payment_date'],
                'notes' => $data['notes'] ?? null,
                'created_by' => $user->id
            ]);

            $sale = $sale->updateBalance();

            if ($sale->payment_status === 'paid' && $sale->status === 'pending') {
                $sale->update(['status' => 'completed']);
            }

            if ($sale->order_id) {
                $sale->order->update([
                    'payment_status' => $sale->payment_status
                ]);
            }

            return [
                'payment' => $payment->load('paymentMethod'),
                'sale' => $sale->load(['payments.paymentMethod', 'partialPayments.paymentMethod'])
            ];
        });
    }

    public function findPartialPayment($id)
    {
        return PartialPayment::with(['sale', 'paymentMethod', 'createdBy'])
            ->findOrFail($id);
    }

    public function removePartialPayment($saleId, $paymentId, $user)
    {
        if ($user->role !== 'admin') {
            abort(403, 'Unauthorized');
        }

        $sale = Sale::findOrFail($saleId);
        $payment = PartialPayment::findOrFail($paymentId);
        
        if ($payment->sale_id !== $sale->id) {
            abort(400, 'Payment does not belong to this sale');
        }
        
        return DB::transaction(function () use ($payment, $sale) {
            $payment->delete();
            
            $sale = $sale->updateBalance();
            
            if ($sale->payment_status !== 'paid' && $sale->status === 'completed') {
                $sale->update(['status' => 'pending']);
            }
            
            if ($sale->order_id) {
                $sale->order->update([
                    'payment_status' => $sale->payment_status
                ]);
            }
            
            return $sale->load(['payments.paymentMethod', 'partialPayments.paymentMethod']);
        });
    }
} 