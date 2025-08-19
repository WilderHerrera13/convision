<?php

namespace App\Services;

use App\Models\DiscountRequest;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class DiscountRequestService
{
    public function getFilteredDiscountRequests(Request $request)
    {
        $query = DiscountRequest::with(['user', 'product', 'patient', 'approver']);
        
        $this->applyFilters($query, $request);
        
        return $query->apiFilter($request)->orderBy('created_at', 'desc');
    }

    public function createDiscountRequest(array $validatedData): DiscountRequest
    {
        DB::beginTransaction();

        try {
            $product = Product::findOrFail($validatedData['product_id']);
            $originalPrice = $product->price;
            $discountPercentage = $validatedData['discount_percentage'];
            $discountedPrice = $this->calculateDiscountedPrice($originalPrice, $discountPercentage);

            $user = Auth::user();
            $isGlobal = $validatedData['is_global'] ?? false;
            $isAdmin = Auth::user()->role === 'admin';
            $status = $isAdmin ? DiscountRequest::STATUS_APPROVED : DiscountRequest::STATUS_PENDING;
            $approvedBy = $isAdmin ? Auth::id() : null;
            $approvalNotes = $isAdmin ? ($validatedData['reason'] ?? 'Aprobado por administrador durante la creación.') : null;

            $discountRequest = DiscountRequest::create([
                'user_id' => Auth::id(),
                'product_id' => $validatedData['product_id'],
                'patient_id' => $validatedData['patient_id'] ?? null,
                'status' => $status,
                'discount_percentage' => $discountPercentage,
                'original_price' => $originalPrice,
                'discounted_price' => $discountedPrice,
                'reason' => $validatedData['reason'] ?? null,
                'approved_by' => $approvedBy,
                'approval_notes' => $approvalNotes,
                'expiry_date' => $validatedData['expiry_date'] ?? null,
                'is_global' => $isGlobal,
            ]);

            DB::commit();
            return $discountRequest->load(['user', 'product', 'patient', 'approver']);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating discount request: ' . $e->getMessage(), [
                'validated_data' => $validatedData,
                'user_id' => Auth::id()
            ]);
            throw new \Exception('Error al crear la solicitud de descuento: ' . $e->getMessage());
        }
    }

    public function updateDiscountRequest(DiscountRequest $discountRequest, array $validatedData): DiscountRequest
    {
        DB::beginTransaction();

        try {
            if (isset($validatedData['discount_percentage'])) {
                $productId = $validatedData['product_id'] ?? $discountRequest->product_id;
                $product = Product::findOrFail($productId);
                $originalPrice = $product->price;
                $discountPercentage = $validatedData['discount_percentage'];
                $discountedPrice = $this->calculateDiscountedPrice($originalPrice, $discountPercentage);
                
                $validatedData['original_price'] = $originalPrice;
                $validatedData['discounted_price'] = $discountedPrice;
            }

            $discountRequest->update($validatedData);
            
            DB::commit();
            return $discountRequest->load(['user', 'product', 'patient', 'approver']);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating discount request: ' . $e->getMessage(), [
                'discount_request_id' => $discountRequest->id,
                'validated_data' => $validatedData
            ]);
            throw new \Exception('Error al actualizar la solicitud de descuento: ' . $e->getMessage());
        }
    }

    public function approveDiscountRequest(DiscountRequest $discountRequest, ?string $approvalNotes = null): DiscountRequest
    {
        DB::beginTransaction();

        try {
            $discountRequest->update([
                'status' => DiscountRequest::STATUS_APPROVED,
                'approved_by' => Auth::id(),
                'approved_at' => Carbon::now(),
                'approval_notes' => $approvalNotes ?? $discountRequest->reason ?? 'Aprobado por administrador.'
            ]);

            DB::commit();
            return $discountRequest->load(['user', 'product', 'patient', 'approver']);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error approving discount request: ' . $e->getMessage(), [
                'discount_request_id' => $discountRequest->id,
                'approver_id' => Auth::id()
            ]);
            throw new \Exception('Error al aprobar la solicitud de descuento: ' . $e->getMessage());
        }
    }

    public function rejectDiscountRequest(DiscountRequest $discountRequest, ?string $rejectionNotes = null): DiscountRequest
    {
        DB::beginTransaction();

        try {
            $discountRequest->update([
                'status' => DiscountRequest::STATUS_REJECTED,
                'rejection_reason' => $rejectionNotes ?? 'Rechazado por administrador.'
            ]);

            DB::commit();
            return $discountRequest->load(['user', 'product', 'patient', 'approver']);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error rejecting discount request: ' . $e->getMessage(), [
                'discount_request_id' => $discountRequest->id,
                'rejector_id' => Auth::id()
            ]);
            throw new \Exception('Error al rechazar la solicitud de descuento: ' . $e->getMessage());
        }
    }

    public function getActiveDiscounts(int $productId, ?int $patientId = null)
    {
        $query = DiscountRequest::where('status', DiscountRequest::STATUS_APPROVED)
            ->where('product_id', $productId)
            ->where(function ($q) {
                $q->whereNull('expiry_date')
                  ->orWhere('expiry_date', '>=', Carbon::today());
            });

        if ($patientId) {
            $query->where(function ($q) use ($patientId) {
                $q->where('patient_id', $patientId)
                  ->orWhere('is_global', true);
            });
        } else {
            $query->where('is_global', true);
        }

        $activeDiscounts = $query->orderBy('discount_percentage', 'desc')->get();
        
        if ($patientId && $activeDiscounts->whereNotNull('patient_id')->isNotEmpty()) {
            $patientSpecificDiscounts = $activeDiscounts->where('patient_id', $patientId);
            if ($patientSpecificDiscounts->isNotEmpty()) {
                return $patientSpecificDiscounts;
            }
        }

        return $activeDiscounts;
    }

    public function deleteDiscountRequest(DiscountRequest $discountRequest): bool
    {
        if (Auth::user()->role !== 'admin' && $discountRequest->user_id !== Auth::id()) {
            throw new \Exception('No tienes autorización para eliminar esta solicitud.');
        }

        if (!$discountRequest->isPending() && Auth::user()->role !== 'admin') {
            throw new \Exception('Solo las solicitudes pendientes pueden ser eliminadas por el solicitante.');
        }

        DB::beginTransaction();

        try {
            $discountRequest->delete();
            DB::commit();
            return true;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting discount request: ' . $e->getMessage(), [
                'discount_request_id' => $discountRequest->id,
                'user_id' => Auth::id()
            ]);
            throw new \Exception('Error al eliminar la solicitud de descuento: ' . $e->getMessage());
        }
    }

    protected function applyFilters($query, Request $request)
    {
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        
        if ($request->has('patient_id')) {
            $query->where('patient_id', $request->patient_id);
        }
        
        if ($request->has('product_id')) {
            $query->where('product_id', $request->product_id);
        }
        
        if ($request->has('is_global')) {
            $query->where('is_global', $request->boolean('is_global'));
        }
        
        if ($request->has('pending_only') && $request->boolean('pending_only')) {
            $query->where('status', DiscountRequest::STATUS_PENDING);
        }
    }

    protected function calculateDiscountedPrice(float $originalPrice, float $discountPercentage): float
    {
        return $originalPrice - ($originalPrice * ($discountPercentage / 100));
    }

    public function canProcess(DiscountRequest $discountRequest): bool
    {
        $currentUser = Auth::user();

        if ($currentUser->role !== 'admin') {
            if ($discountRequest->user_id !== $currentUser->id) {
                return false;
            }
            if (!$discountRequest->isPending()) {
                return false;
            }
        }
        return true;
    }
} 