<?php

namespace App\Services;

use App\Models\CashTransfer;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class CashTransferService
{
    public function createCashTransfer(array $data): CashTransfer
    {
        return DB::transaction(function () use ($data) {
            $data['created_by_user_id'] = Auth::id();
            $data['transfer_number'] = $this->generateTransferNumber();
            $data['status'] = 'pending';
            
            $cashTransfer = CashTransfer::create($data);
            
            return $cashTransfer->load(['createdBy', 'approvedBy']);
        });
    }

    public function updateCashTransfer(CashTransfer $cashTransfer, array $data): CashTransfer
    {
        return DB::transaction(function () use ($cashTransfer, $data) {
            if ($cashTransfer->status !== 'pending') {
                throw new \Exception('Solo se pueden editar transferencias en estado pendiente.');
            }
            
            $cashTransfer->update($data);
            
            return $cashTransfer->load(['createdBy', 'approvedBy']);
        });
    }

    public function approve(CashTransfer $cashTransfer, ?string $notes = null): CashTransfer
    {
        return DB::transaction(function () use ($cashTransfer, $notes) {
            if ($cashTransfer->status !== 'pending') {
                throw new \Exception('Solo se pueden aprobar transferencias en estado pendiente.');
            }
            
            $updateData = [
                'status' => 'completed',
                'approved_by_user_id' => Auth::id(),
                'approved_at' => now(),
            ];
            
            if ($notes) {
                $updateData['notes'] = $notes;
            }
            
            $cashTransfer->update($updateData);
            
            return $cashTransfer->load(['createdBy', 'approvedBy']);
        });
    }

    public function cancel(CashTransfer $cashTransfer, ?string $notes = null): CashTransfer
    {
        return DB::transaction(function () use ($cashTransfer, $notes) {
            if ($cashTransfer->status === 'completed') {
                throw new \Exception('No se pueden cancelar transferencias completadas.');
            }
            
            $updateData = [
                'status' => 'cancelled',
                'approved_by_user_id' => Auth::id(),
                'approved_at' => now(),
            ];
            
            if ($notes) {
                $updateData['notes'] = $notes;
            }
            
            $cashTransfer->update($updateData);
            
            return $cashTransfer->load(['createdBy', 'approvedBy']);
        });
    }

    public function deleteCashTransfer(CashTransfer $cashTransfer): bool
    {
        if ($cashTransfer->status === 'completed') {
            throw new \Exception('No se pueden eliminar transferencias completadas.');
        }
        
        return $cashTransfer->delete();
    }

    public function getCashTransferStats(): array
    {
        $total = CashTransfer::count();
        $pending = CashTransfer::where('status', 'pending')->count();
        $completed = CashTransfer::where('status', 'completed')->count();
        $cancelled = CashTransfer::where('status', 'cancelled')->count();
        
        $totalAmount = CashTransfer::where('status', 'completed')->sum('amount');
        $pendingAmount = CashTransfer::where('status', 'pending')->sum('amount');
        
        $byType = CashTransfer::where('status', 'completed')
            ->selectRaw('type, COUNT(*) as count, SUM(amount) as total_amount')
            ->groupBy('type')
            ->get()
            ->keyBy('type');

        return [
            'total_transfers' => $total,
            'pending_transfers' => $pending,
            'completed_transfers' => $completed,
            'cancelled_transfers' => $cancelled,
            'total_amount' => round($totalAmount, 2),
            'pending_amount' => round($pendingAmount, 2),
            'by_type' => $byType,
        ];
    }

    private function generateTransferNumber(): string
    {
        $prefix = 'CT';
        $year = date('Y');
        $month = date('m');
        
        $lastTransfer = CashTransfer::whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->orderBy('id', 'desc')
            ->first();
        
        $sequence = $lastTransfer ? (int)substr($lastTransfer->transfer_number, -4) + 1 : 1;
        
        return sprintf('%s%s%s%04d', $prefix, $year, $month, $sequence);
    }
} 