<?php

namespace App\Services;

use App\Models\LaboratoryOrder;
use App\Models\LaboratoryOrderStatus;
use App\Models\Sale;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LaboratoryOrderService
{
    public function getFilteredLaboratoryOrders(Request $request)
    {
        $query = LaboratoryOrder::with(['laboratory', 'patient', 'createdBy', 'order.items.lens', 'sale']);
        
        return $query->apiFilter($request);
    }

    public function createLaboratoryOrder(array $validatedData): LaboratoryOrder
    {
        $userId = Auth::id();

        if (!$userId) {
            throw new \Exception('Error de autenticación: ID de usuario es nulo.');
        }

        DB::beginTransaction();

        try {
            $status = $validatedData['status'] ?? 'pending';

            $laboratoryOrder = LaboratoryOrder::create([
                'order_number' => LaboratoryOrder::generateOrderNumber(),
                'order_id' => $validatedData['order_id'] ?? null,
                'sale_id' => $validatedData['sale_id'] ?? null,
                'laboratory_id' => $validatedData['laboratory_id'],
                'patient_id' => $validatedData['patient_id'],
                'status' => $status,
                'priority' => $validatedData['priority'] ?? 'normal',
                'estimated_completion_date' => $validatedData['estimated_completion_date'] ?? null,
                'notes' => $validatedData['notes'] ?? null,
                'created_by' => $userId
            ]);

            $this->createStatusHistory($laboratoryOrder->id, $status, 'Estado inicial', $userId);

            DB::commit();

            return $laboratoryOrder->load(['laboratory', 'patient', 'createdBy', 'order.items.lens', 'sale', 'statusHistory.user']);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating laboratory order: ' . $e->getMessage(), [
                'validated_data' => $validatedData,
                'user_id' => $userId
            ]);
            throw new \Exception('Error al crear la orden de laboratorio: ' . $e->getMessage());
        }
    }

    public function updateLaboratoryOrder(LaboratoryOrder $laboratoryOrder, array $validatedData): LaboratoryOrder
    {
        DB::beginTransaction();

        try {
            $laboratoryOrder->update($validatedData);
            
            DB::commit();

            return $laboratoryOrder->load(['laboratory', 'patient', 'createdBy', 'order.items.lens', 'sale', 'statusHistory.user']);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating laboratory order: ' . $e->getMessage(), [
                'laboratory_order_id' => $laboratoryOrder->id,
                'validated_data' => $validatedData
            ]);
            throw new \Exception('Error al actualizar la orden de laboratorio: ' . $e->getMessage());
        }
    }

    public function deleteLaboratoryOrder(LaboratoryOrder $laboratoryOrder): bool
    {
        if (in_array($laboratoryOrder->status, ['in_process', 'sent_to_lab', 'ready_for_delivery', 'delivered'])) {
            throw new \Exception('La orden de laboratorio no puede ser eliminada porque ya está en proceso.');
        }

        DB::beginTransaction();

        try {
            $laboratoryOrder->statusHistory()->delete();
            $laboratoryOrder->delete();
            
            DB::commit();
            return true;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting laboratory order: ' . $e->getMessage(), [
                'laboratory_order_id' => $laboratoryOrder->id
            ]);
            throw new \Exception('Error al eliminar la orden de laboratorio: ' . $e->getMessage());
        }
    }

    public function updateLaboratoryOrderStatus(LaboratoryOrder $laboratoryOrder, string $status, ?string $notes = null): LaboratoryOrder
    {
        $userId = Auth::id();

        DB::beginTransaction();

        try {
            $laboratoryOrder->update(['status' => $status]);

            $this->createStatusHistory($laboratoryOrder->id, $status, $notes, $userId);

            DB::commit();

            return $laboratoryOrder->load(['laboratory', 'patient', 'createdBy', 'order.items.lens', 'sale', 'statusHistory.user']);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating laboratory order status: ' . $e->getMessage(), [
                'laboratory_order_id' => $laboratoryOrder->id,
                'status' => $status,
                'user_id' => $userId
            ]);
            throw new \Exception('Error al actualizar el estado de la orden de laboratorio: ' . $e->getMessage());
        }
    }

    public function getLaboratoryOrderStats(): array
    {
        return [
            'total' => LaboratoryOrder::count(),
            'pending' => LaboratoryOrder::where('status', 'pending')->count(),
            'in_process' => LaboratoryOrder::where('status', 'in_process')->count(),
            'sent_to_lab' => LaboratoryOrder::where('status', 'sent_to_lab')->count(),
            'ready_for_delivery' => LaboratoryOrder::where('status', 'ready_for_delivery')->count(),
            'delivered' => LaboratoryOrder::where('status', 'delivered')->count(),
            'cancelled' => LaboratoryOrder::where('status', 'cancelled')->count(),
        ];
    }

    public function createLaboratoryOrderFromSale(Sale $sale, ?int $laboratoryId = null, ?string $notes = null): ?LaboratoryOrder
    {
        DB::beginTransaction();

        try {
            if ($sale->laboratoryOrders()->exists()) {
                return $sale->laboratoryOrders()->first();
            }

            $order = null;
            if ($sale->order_id) {
                $order = Order::with(['items.lens', 'patient'])->find($sale->order_id);
            }

            if (!$laboratoryId && $order && $order->laboratory_id) {
                $laboratoryId = $order->laboratory_id;
            }

            if (!$laboratoryId) {
                Log::warning('Cannot create laboratory order: No laboratory ID provided for sale ' . $sale->id);
                return null;
            }

            $patientId = $order ? $order->patient_id : $sale->patient_id;

            $laboratoryOrder = LaboratoryOrder::create([
                'order_number' => LaboratoryOrder::generateOrderNumber(),
                'order_id' => $order ? $order->id : null,
                'sale_id' => $sale->id,
                'laboratory_id' => $laboratoryId,
                'patient_id' => $patientId,
                'status' => 'pending',
                'priority' => 'normal',
                'notes' => $notes ?? 'Orden de laboratorio generada automáticamente desde venta',
                'created_by' => $sale->created_by
            ]);

            $this->createStatusHistory($laboratoryOrder->id, 'pending', 'Estado inicial', $sale->created_by);

            DB::commit();

            return $laboratoryOrder->load(['laboratory', 'patient', 'createdBy', 'order.items.lens', 'sale']);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to create laboratory order from sale: ' . $e->getMessage(), [
                'sale_id' => $sale->id,
                'laboratory_id' => $laboratoryId
            ]);
            return null;
        }
    }

    protected function createStatusHistory(int $laboratoryOrderId, string $status, ?string $notes, int $userId): void
    {
        LaboratoryOrderStatus::create([
            'laboratory_order_id' => $laboratoryOrderId,
            'status' => $status,
            'notes' => $notes,
            'user_id' => $userId
        ]);
    }
} 