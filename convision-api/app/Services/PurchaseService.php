<?php

namespace App\Services;

use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\PurchasePayment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class PurchaseService
{
    public function createPurchase(array $data): Purchase
    {
        return DB::transaction(function () use ($data) {
            $data['created_by_user_id'] = Auth::id();
            
            $purchase = Purchase::create($data);
            
            if (isset($data['items']) && is_array($data['items'])) {
                foreach ($data['items'] as $itemData) {
                    $itemData['purchase_id'] = $purchase->id;
                    PurchaseItem::create($itemData);
                }
            }
            
            if (isset($data['payments']) && is_array($data['payments'])) {
                foreach ($data['payments'] as $paymentData) {
                    $paymentData['purchase_id'] = $purchase->id;
                    $paymentData['created_by_user_id'] = Auth::id();
                    PurchasePayment::create($paymentData);
                }
            }
            
            $this->updatePurchaseTotals($purchase);
            
            return $purchase->load(['supplier', 'items.product', 'payments.paymentMethod', 'createdBy']);
        });
    }

    public function updatePurchase(Purchase $purchase, array $data): Purchase
    {
        return DB::transaction(function () use ($purchase, $data) {
            $purchase->update($data);
            
            if (isset($data['items']) && is_array($data['items'])) {
                $purchase->items()->delete();
                
                foreach ($data['items'] as $itemData) {
                    $itemData['purchase_id'] = $purchase->id;
                    PurchaseItem::create($itemData);
                }
            }
            
            $this->updatePurchaseTotals($purchase);
            
            return $purchase->load(['supplier', 'items.product', 'payments.paymentMethod', 'createdBy']);
        });
    }

    public function addPayment(Purchase $purchase, array $paymentData): PurchasePayment
    {
        return DB::transaction(function () use ($purchase, $paymentData) {
            $paymentData['purchase_id'] = $purchase->id;
            $paymentData['created_by_user_id'] = Auth::id();
            
            $payment = PurchasePayment::create($paymentData);
            
            $this->updatePurchaseTotals($purchase);
            
            return $payment->load(['paymentMethod', 'createdBy']);
        });
    }

    public function deletePurchase(Purchase $purchase): bool
    {
        return DB::transaction(function () use ($purchase) {
            $purchase->items()->delete();
            $purchase->payments()->delete();
            return $purchase->delete();
        });
    }

    private function updatePurchaseTotals(Purchase $purchase): void
    {
        $totalPayments = $purchase->payments()->sum('amount');
        $balance = max(0, $purchase->total_amount - $totalPayments); // El balance no puede ser negativo
        
        $purchase->update([
            'payment_amount' => $totalPayments,
            'balance' => $balance,
            'payment_status' => $this->determinePaymentStatus($purchase->total_amount, $totalPayments),
        ]);
    }

    private function determinePaymentStatus(float $totalAmount, float $paidAmount): string
    {
        if ($paidAmount >= $totalAmount) {
            return 'paid';
        } elseif ($paidAmount > 0) {
            return 'partial';
        } else {
            return 'pending';
        }
    }

    public function calculateTotals(array $items): array
    {
        $subtotal = 0;
        $taxAmount = 0;
        $total = 0;

        foreach ($items as $item) {
            $itemSubtotal = $item['quantity'] * $item['unit_price'];
            $itemTaxAmount = $itemSubtotal * ($item['tax_rate'] ?? 0) / 100;
            $itemTotal = $itemSubtotal + $itemTaxAmount;

            $subtotal += $itemSubtotal;
            $taxAmount += $itemTaxAmount;
            $total += $itemTotal;
        }

        return [
            'subtotal' => round($subtotal, 2),
            'tax_amount' => round($taxAmount, 2),
            'total_amount' => round($total, 2),
        ];
    }
} 