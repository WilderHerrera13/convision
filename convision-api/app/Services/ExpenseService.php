<?php

namespace App\Services;

use App\Models\Expense;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class ExpenseService
{
    public function createExpense(array $data): Expense
    {
        return DB::transaction(function () use ($data) {
            $data['created_by_user_id'] = Auth::id();
            
            if (isset($data['amount']) && isset($data['payment_amount'])) {
                $data['balance'] = $data['amount'] - $data['payment_amount'];
            } else {
                $data['balance'] = $data['amount'] ?? 0;
            }
            
            $expense = Expense::create($data);
            
            return $expense->load(['supplier', 'paymentMethod', 'createdBy']);
        });
    }

    public function updateExpense(Expense $expense, array $data): Expense
    {
        return DB::transaction(function () use ($expense, $data) {
            if (isset($data['amount']) && !isset($data['payment_amount'])) {
                $data['payment_amount'] = $expense->payment_amount;
            }
            
            if (isset($data['amount']) || isset($data['payment_amount'])) {
                $amount = $data['amount'] ?? $expense->amount;
                $paymentAmount = $data['payment_amount'] ?? $expense->payment_amount;
                $data['balance'] = $amount - $paymentAmount;
            }
            
            $expense->update($data);
            
            return $expense->load(['supplier', 'paymentMethod', 'createdBy']);
        });
    }

    public function addPayment(Expense $expense, array $paymentData): Expense
    {
        return DB::transaction(function () use ($expense, $paymentData) {
            $newPaymentAmount = $expense->payment_amount + $paymentData['amount'];
            $newBalance = $expense->amount - $newPaymentAmount;
            
            if ($newBalance < 0) {
                throw new \Exception('El pago no puede exceder el saldo pendiente del gasto.');
            }
            
            $expense->update([
                'payment_amount' => $newPaymentAmount,
                'balance' => $newBalance,
            ]);
            
            return $expense->load(['supplier', 'paymentMethod', 'createdBy']);
        });
    }

    public function deleteExpense(Expense $expense): bool
    {
        return $expense->delete();
    }

    public function getExpenseStats(): array
    {
        $total = Expense::sum('amount');
        $paid = Expense::sum('payment_amount');
        $pending = Expense::sum('balance');
        $count = Expense::count();

        return [
            'total_amount' => round($total, 2),
            'paid_amount' => round($paid, 2),
            'pending_amount' => round($pending, 2),
            'total_count' => $count,
        ];
    }
} 