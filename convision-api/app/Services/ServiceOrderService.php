<?php

namespace App\Services;

use App\Models\ServiceOrder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class ServiceOrderService
{
    public function createServiceOrder(array $data): ServiceOrder
    {
        return DB::transaction(function () use ($data) {
            $data['created_by_user_id'] = Auth::id();
            $data['order_number'] = $this->generateOrderNumber();
            
            $serviceOrder = ServiceOrder::create($data);
            
            return $serviceOrder->load(['supplier', 'createdBy']);
        });
    }

    public function updateServiceOrder(ServiceOrder $serviceOrder, array $data): ServiceOrder
    {
        return DB::transaction(function () use ($serviceOrder, $data) {
            $serviceOrder->update($data);
            
            return $serviceOrder->load(['supplier', 'createdBy']);
        });
    }

    public function updateStatus(ServiceOrder $serviceOrder, string $status, ?string $observations = null): ServiceOrder
    {
        return DB::transaction(function () use ($serviceOrder, $status, $observations) {
            $updateData = ['status' => $status];
            
            if ($observations) {
                $updateData['observations'] = $observations;
            }
            
            if ($status === 'completed' && !$serviceOrder->actual_delivery_date) {
                $updateData['actual_delivery_date'] = now();
            }
            
            $serviceOrder->update($updateData);
            
            return $serviceOrder->load(['supplier', 'createdBy']);
        });
    }

    public function deleteServiceOrder(ServiceOrder $serviceOrder): bool
    {
        return $serviceOrder->delete();
    }

    public function getServiceOrderStats(): array
    {
        $total = ServiceOrder::count();
        $pending = ServiceOrder::where('status', 'pending')->count();
        $inProgress = ServiceOrder::where('status', 'in_progress')->count();
        $completed = ServiceOrder::where('status', 'completed')->count();
        $cancelled = ServiceOrder::where('status', 'cancelled')->count();
        
        $totalEstimatedCost = ServiceOrder::sum('estimated_cost');
        $totalFinalCost = ServiceOrder::whereNotNull('final_cost')->sum('final_cost');
        
        $avgDeliveryTime = ServiceOrder::whereNotNull('actual_delivery_date')
            ->whereNotNull('estimated_delivery_date')
            ->selectRaw('AVG(DATEDIFF(actual_delivery_date, estimated_delivery_date)) as avg_days')
            ->value('avg_days');

        return [
            'total_orders' => $total,
            'pending_orders' => $pending,
            'in_progress_orders' => $inProgress,
            'completed_orders' => $completed,
            'cancelled_orders' => $cancelled,
            'total_estimated_cost' => round($totalEstimatedCost, 2),
            'total_final_cost' => round($totalFinalCost, 2),
            'avg_delivery_delay_days' => round($avgDeliveryTime ?? 0, 1),
        ];
    }

    private function generateOrderNumber(): string
    {
        $prefix = 'SO';
        $year = date('Y');
        $month = date('m');
        
        $lastOrder = ServiceOrder::whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->orderBy('id', 'desc')
            ->first();
        
        $sequence = $lastOrder ? (int)substr($lastOrder->order_number, -4) + 1 : 1;
        
        return sprintf('%s%s%s%04d', $prefix, $year, $month, $sequence);
    }
} 