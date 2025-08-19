<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\SalePayment;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Services\LaboratoryOrderService;

class SaleService
{
    protected $laboratoryOrderService;

    public function __construct(LaboratoryOrderService $laboratoryOrderService)
    {
        $this->laboratoryOrderService = $laboratoryOrderService;
    }

    public function getFilteredSales(Request $request, User $user)
    {
        $query = Sale::with(['patient', 'order', 'payments.paymentMethod', 'partialPayments.paymentMethod', 'createdBy'])
                     ->orderBy('created_at', 'desc');
        
        $this->applyFilters($query, $request);
        
        return $query->apiFilter($request);
    }

    public function createSale(array $validatedData, User $user): Sale
    {
        DB::beginTransaction();

        try {
            $sale = Sale::create([
                'sale_number' => Sale::generateSaleNumber(),
                'patient_id' => $validatedData['patient_id'],
                'order_id' => $validatedData['order_id'] ?? null,
                'appointment_id' => $validatedData['appointment_id'] ?? null,
                'subtotal' => $validatedData['subtotal'],
                'tax' => $validatedData['tax'],
                'discount' => $validatedData['discount'],
                'total' => $validatedData['total'],
                'notes' => $validatedData['notes'] ?? null,
                'created_by' => $user->id
            ]);

            $this->processPayments($sale, $validatedData['payments'] ?? [], $user);
            $this->updateOrderPaymentStatus($sale);
            $laboratoryOrder = $this->createLaboratoryOrder($sale, $validatedData);
            $this->updateAppointmentBillingStatus($sale);

            DB::commit();
            
            $sale->load(['patient', 'order', 'payments.paymentMethod', 'partialPayments.paymentMethod', 'createdBy', 'laboratoryOrders', 'appointment']);
            
            return $sale;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating sale: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'validated_data' => $validatedData
            ]);
            throw $e;
        }
    }

    public function updateSale(Sale $sale, array $validatedData): Sale
    {
        DB::beginTransaction();

        try {
            $sale->update($validatedData);
            DB::commit();
            
            return $sale->fresh();

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating sale: ' . $e->getMessage(), [
                'sale_id' => $sale->id,
                'validated_data' => $validatedData
            ]);
            throw $e;
        }
    }

    public function addPayment(Sale $sale, array $validatedData, User $user): Sale
    {
        DB::beginTransaction();

        try {
            SalePayment::create([
                'sale_id' => $sale->id,
                'payment_method_id' => $validatedData['payment_method_id'],
                'amount' => $validatedData['amount'],
                'reference_number' => $validatedData['reference_number'] ?? null,
                'payment_date' => $validatedData['payment_date'],
                'notes' => $validatedData['notes'] ?? null,
                'created_by' => $user->id
                    ]);

        $sale->updateBalance();
        $this->updateAppointmentBillingOnPaymentChange($sale);

        if ($sale->order_id) {
            $order = Order::findOrFail($sale->order_id);
            $order->update(['payment_status' => $sale->payment_status]);
        }

        DB::commit();
        
        return $sale->fresh()->load(['patient', 'order', 'payments.paymentMethod', 'partialPayments.paymentMethod', 'createdBy']);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error adding payment to sale: ' . $e->getMessage(), [
                'sale_id' => $sale->id,
                'validated_data' => $validatedData
            ]);
            throw $e;
        }
    }

    public function removePayment(Sale $sale, int $paymentId): Sale
    {
        DB::beginTransaction();

        try {
            $payment = SalePayment::where('sale_id', $sale->id)
                                  ->where('id', $paymentId)
                                  ->firstOrFail();

            $payment->delete();
            $sale->updateBalance();
            $this->updateAppointmentBillingOnPaymentChange($sale);

            if ($sale->order_id) {
                $order = Order::findOrFail($sale->order_id);
                $order->update(['payment_status' => $sale->payment_status]);
            }

            DB::commit();
            
            return $sale->fresh()->load(['patient', 'order', 'payments.paymentMethod', 'partialPayments.paymentMethod', 'createdBy']);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error removing payment from sale: ' . $e->getMessage(), [
                'sale_id' => $sale->id,
                'payment_id' => $paymentId
            ]);
            throw $e;
        }
    }

    public function cancelSale(Sale $sale): Sale
    {
        if ($sale->status === Sale::STATUS_CANCELLED) {
            throw new \Exception('La venta ya está cancelada.');
        }

        if ($sale->status === Sale::STATUS_REFUNDED) {
            throw new \Exception('No se puede cancelar una venta reembolsada.');
        }

        DB::beginTransaction();

        try {
            $sale->update([
                'status' => Sale::STATUS_CANCELLED,
                'cancelled_at' => now()
            ]);

            if ($sale->order_id) {
                $order = Order::findOrFail($sale->order_id);
                $order->update(['status' => Order::STATUS_CANCELLED]);
            }

            if ($sale->appointment_id) {
                $appointment = \App\Models\Appointment::findOrFail($sale->appointment_id);
                $appointment->update(['is_billed' => false, 'billed_at' => null, 'sale_id' => null]);
            }

            DB::commit();
            
            return $sale->fresh()->load(['patient', 'order', 'payments.paymentMethod', 'partialPayments.paymentMethod', 'createdBy']);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error cancelling sale: ' . $e->getMessage(), [
                'sale_id' => $sale->id
            ]);
            throw $e;
        }
    }

    public function deleteSale(Sale $sale): void
    {
        DB::beginTransaction();

        try {
            if ($sale->order_id) {
                $order = Order::findOrFail($sale->order_id);
                $order->update(['payment_status' => 'pending']);
            }

            if ($sale->appointment_id) {
                $appointment = \App\Models\Appointment::findOrFail($sale->appointment_id);
                $appointment->update(['is_billed' => false, 'billed_at' => null, 'sale_id' => null]);
            }

            $sale->delete();

            DB::commit();

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting sale: ' . $e->getMessage(), [
                'sale_id' => $sale->id
            ]);
            throw $e;
        }
    }

    public function getSaleStats(Request $request)
    {
        $query = Sale::query();
        
        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        
        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        return [
            'total_sales' => $query->count(),
            'total_amount' => $query->sum('total'),
            'paid_amount' => $query->where('payment_status', 'paid')->sum('total'),
            'pending_amount' => $query->where('payment_status', 'pending')->sum('total'),
            'partial_amount' => $query->where('payment_status', 'partial')->sum('total')
        ];
    }

    public function getTodayStats()
    {
        $today = today();
        
        return [
            'today_sales' => Sale::whereDate('created_at', $today)->count(),
            'today_amount' => Sale::whereDate('created_at', $today)->sum('total'),
            'today_paid' => Sale::whereDate('created_at', $today)->where('payment_status', 'paid')->sum('total'),
            'today_pending' => Sale::whereDate('created_at', $today)->where('payment_status', 'pending')->sum('total')
        ];
    }

    protected function applyFilters($query, Request $request)
    {
        if ($request->has('patient_id')) {
            $query->where('patient_id', $request->patient_id);
        }
        
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        
        if ($request->has('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }
        
        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        
        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }
    }

    protected function processPayments(Sale $sale, array $payments, User $user)
    {
        if (!empty($payments)) {
            foreach ($payments as $payment) {
                SalePayment::create([
                    'sale_id' => $sale->id,
                    'payment_method_id' => $payment['payment_method_id'],
                    'amount' => $payment['amount'],
                    'reference_number' => $payment['reference_number'] ?? null,
                    'payment_date' => $payment['payment_date'],
                    'notes' => $payment['notes'] ?? null,
                    'created_by' => $user->id
                ]);
            }
            $sale->updateBalance();
            $this->updateAppointmentBillingOnPaymentChange($sale);
        }
    }

    protected function updateOrderPaymentStatus(Sale $sale)
    {
        if ($sale->order_id) {
            $order = Order::findOrFail($sale->order_id);
            $order->update(['payment_status' => $sale->payment_status]);
        }
    }

    protected function createLaboratoryOrder(Sale $sale, array $validatedData)
    {
        // Check if laboratory_id is explicitly provided
        if (!empty($validatedData['laboratory_id'])) {
            return $this->laboratoryOrderService->createLaboratoryOrderFromSale(
                $sale,
                $validatedData['laboratory_id'],
                $validatedData['laboratory_notes'] ?? null
            );
        }

        // Auto-detect if sale involves lenses and create laboratory order
        $shouldCreateLaboratoryOrder = $this->shouldCreateLaboratoryOrderForSale($sale, $validatedData);
        
        if ($shouldCreateLaboratoryOrder) {
            // Get default laboratory or first available laboratory
            $defaultLaboratory = $this->getDefaultLaboratory();
            
            if ($defaultLaboratory) {
                Log::info('Auto-creating laboratory order for lens sale', [
                    'sale_id' => $sale->id,
                    'laboratory_id' => $defaultLaboratory->id,
                    'reason' => 'Sale contains lenses requiring laboratory manufacturing'
                ]);

                return $this->laboratoryOrderService->createLaboratoryOrderFromSale(
                    $sale,
                    $defaultLaboratory->id,
                    'Orden de laboratorio generada automáticamente - venta incluye lentes'
                );
            } else {
                Log::warning('Cannot auto-create laboratory order: No default laboratory configured', [
                    'sale_id' => $sale->id
                ]);
            }
        }

        return null;
    }

    protected function updateAppointmentBillingStatus(Sale $sale)
    {
        if ($sale->appointment_id) {
            $appointment = \App\Models\Appointment::findOrFail($sale->appointment_id);
            
            // Only mark as billed if the sale is fully paid
            if ($sale->payment_status === 'paid') {
                $appointment->update([
                    'is_billed' => true,
                    'billed_at' => now(),
                    'sale_id' => $sale->id
                ]);
            } else {
                // If not fully paid, ensure it's not marked as billed yet
                $appointment->update([
                    'is_billed' => false,
                    'billed_at' => null,
                    'sale_id' => $sale->id
                ]);
            }
        }
    }

    /**
     * Update appointment billing status when sale payment status changes
     */
    public function updateAppointmentBillingOnPaymentChange(Sale $sale)
    {
        if ($sale->appointment_id) {
            $appointment = \App\Models\Appointment::findOrFail($sale->appointment_id);
            
            if ($sale->payment_status === 'paid') {
                // Sale is now fully paid - mark appointment as billed
                $appointment->update([
                    'is_billed' => true,
                    'billed_at' => now(),
                    'sale_id' => $sale->id
                ]);
            } else {
                // Sale is not fully paid - keep appointment available for receptionist
                $appointment->update([
                    'is_billed' => false,
                    'billed_at' => null,
                    'sale_id' => $sale->id
                ]);
            }
        }
    }

    /**
     * Determine if a sale should have a laboratory order created automatically
     */
    protected function shouldCreateLaboratoryOrderForSale(Sale $sale, array $validatedData): bool
    {
        // Check if sale is linked to an order that contains lenses
        if ($sale->order_id) {
            $order = Order::with('items.lens')->find($sale->order_id);
            if ($order && $order->items()->whereHas('lens')->exists()) {
                return true;
            }
        }

        // Check if sale data contains lens items (for direct sales)
        if (isset($validatedData['items']) && is_array($validatedData['items'])) {
            foreach ($validatedData['items'] as $item) {
                if (!empty($item['lens_id'])) {
                    return true;
                }
            }
        }

        // Check if sale data contains lens information from frontend
        if (!empty($validatedData['contains_lenses']) || !empty($validatedData['lens_items'])) {
            return true;
        }

        return false;
    }

    /**
     * Get the default laboratory for automatic orders
     */
    protected function getDefaultLaboratory()
    {
        // Get the first active laboratory (you may want to add a default field later)
        $activeLab = \App\Models\Laboratory::where('status', 'active')->first();
        
        if ($activeLab) {
            return $activeLab;
        }

        // If no active laboratory exists, get any laboratory
        return \App\Models\Laboratory::first();
    }
} 