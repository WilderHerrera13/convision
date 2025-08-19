<?php

namespace App\Services;

use App\Models\Quote;
use App\Models\Product;
use App\Models\User;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Services\ProductDiscountService;
use Illuminate\Support\Facades\Log;

class QuoteService
{
    protected $productDiscountService;
    protected $orderService;

    public function __construct(ProductDiscountService $productDiscountService, OrderService $orderService)
    {
        $this->productDiscountService = $productDiscountService;
        $this->orderService = $orderService;
    }

    public function getFilteredQuotes(Request $request)
    {
        return Quote::with(['patient', 'items.product.brand', 'createdBy'])
                    ->apiFilter($request)
                    ->orderBy('created_at', 'desc');
    }

    public function findQuote(int $quoteId): Quote
    {
        return Quote::with(['patient', 'items.product.brand', 'createdBy'])->findOrFail($quoteId);
    }

    public function updateQuoteStatus(int $quoteId, string $status): Quote
    {
        DB::beginTransaction();
        try {
            $quote = Quote::findOrFail($quoteId);
            $quote->update(['status' => $status]);
            
            DB::commit();
            return $quote->fresh()->load(['patient', 'items.product.brand', 'createdBy']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating quote status: ' . $e->getMessage(), [
                'quote_id' => $quoteId,
                'status' => $status,
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    public function convertQuoteToOrder(int $quoteId)
    {
        DB::beginTransaction();
        try {
            $quote = Quote::with('items.product')->findOrFail($quoteId);
            
            if ($quote->status !== Quote::STATUS_PENDING && $quote->status !== Quote::STATUS_APPROVED) {
                throw new \Exception('Solo las cotizaciones pendientes o aprobadas pueden convertirse en ventas.');
            }
            
            if ($quote->expiration_date && Carbon::now()->gt(Carbon::parse($quote->expiration_date))) {
                throw new \Exception('La cotización ha expirado y no puede convertirse en venta.');
            }
            
            $order = $this->orderService->createOrderFromQuote($quote);
            
            DB::commit();
            $order->load(['patient', 'items.product', 'createdBy', 'appointment', 'laboratory']);
            return $order;
            
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error converting quote to order: ' . $e->getMessage(), [
                'quote_id' => $quoteId,
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    public function createQuote(array $validatedData, User $user): Quote
    {
        DB::beginTransaction();

        try {
            $quoteSubtotal = 0;
            $quoteItemsData = [];

            foreach ($validatedData['items'] as $itemData) {
                $product = Product::with('category')->findOrFail($itemData['lens_id']);
                $quantity = $itemData['quantity'];
                $patientId = $validatedData['patient_id'] ?? null;

                $priceInfo = $this->productDiscountService->getProductDiscountInfo($product, $patientId);
                
                $unitPrice = $itemData['price'] ?? $priceInfo['discounted_price'];
                // $itemDiscountPercentage = $itemData['discount_percentage'] ?? 0; // Not passed from request directly
                
                $itemTotalBeforeDiscount = $unitPrice * $quantity;
                // $itemDiscountAmount = $itemTotalBeforeDiscount * ($itemDiscountPercentage / 100);
                $itemDiscountAmount = $itemData['discount'] ?? 0; // Use discount amount from request
                $itemDiscountPercentage = ($itemTotalBeforeDiscount > 0) ? ($itemDiscountAmount / $itemTotalBeforeDiscount) * 100 : 0;

                $itemTotal = $itemTotalBeforeDiscount - $itemDiscountAmount;

                $quoteItemsData[] = [
                    'product_id' => $product->id,
                    'product_type' => Product::class, // Assuming Product model is the type
                    'name' => $product->identifier, 
                    'description' => $product->description ?? $product->category->name,
                    'quantity' => $quantity,
                    'price' => $unitPrice,
                    'original_price' => $priceInfo['original_price'],
                    'discount_percentage' => $itemDiscountPercentage,
                    'discount_id' => $priceInfo['best_discount']['id'] ?? null,
                    'total' => $itemTotal,
                    'notes' => $itemData['notes'] ?? null
                ];
                $quoteSubtotal += $itemTotal;
            }
            
            $overallDiscountPercentage = $validatedData['discount_percentage_overall'] ?? 0;
            $overallDiscountAmount = $validatedData['discount_amount'] ?? ($quoteSubtotal * ($overallDiscountPercentage / 100));
            
            $subtotalAfterOverallDiscount = $quoteSubtotal - $overallDiscountAmount;
            
            $taxPercentage = $validatedData['tax_percentage'] ?? 0;
            $taxAmount = $validatedData['tax_amount'] ?? ($subtotalAfterOverallDiscount * ($taxPercentage / 100));
            
            $quoteTotal = $subtotalAfterOverallDiscount + $taxAmount;

            $quote = Quote::create([
                'quote_number' => Quote::generateQuoteNumber(),
                'patient_id' => $validatedData['patient_id'],
                'subtotal' => $quoteSubtotal,
                'discount_amount' => $overallDiscountAmount,
                'discount_percentage_overall' => $overallDiscountPercentage > 0 ? $overallDiscountPercentage : null,
                'tax_amount' => $taxAmount,
                'tax_percentage' => $taxPercentage > 0 ? $taxPercentage : null,
                'total' => $quoteTotal,
                'status' => Quote::STATUS_PENDING,
                'expiration_date' => $validatedData['expiration_date'] ?? Carbon::now()->addDays(30),
                'notes' => $validatedData['notes'] ?? null,
                'created_by' => $user->id
            ]);

            $quote->items()->createMany($quoteItemsData);
            DB::commit();
            
            $quote->load(['patient', 'items.product.brand', 'createdBy']);
            return $quote;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating quote: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'validated_data' => $validatedData 
            ]);
            // Re-throw the exception to be handled by the controller or a global exception handler
            throw $e; 
        }
    }

    public function updateQuote(int $quoteId, array $validatedData): Quote
    {
        DB::beginTransaction();
        try {
            $quote = Quote::findOrFail($quoteId);

            // For now, only update direct quote fields. Item updates are more complex.
            // Recalculate financial fields if relevant inputs are provided.
            // This logic would be similar to createQuote if amounts are to be re-derived.
            // For simplicity here, we directly update what's passed if it's fillable.

            $fillableData = collect($validatedData)->only($quote->getFillable())->toArray();

            if (isset($validatedData['total'])) { // Example: ensure total is based on other fields if they change
                // This is a placeholder for more complex recalculation logic if needed.
                // If subtotal, discount, tax are part of validatedData and change, total should reflect it.
                // For now, just updating total as passed.
            }

            $quote->update($fillableData);
            
            DB::commit();
            return $quote->fresh()->load(['patient', 'items.product.brand', 'createdBy']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating quote: ' . $e->getMessage(), [
                'quote_id' => $quoteId,
                'validated_data' => $validatedData,
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }
} 