<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Quote;
use App\Models\Product;
use App\Exceptions\InsufficientStockException;
use App\Services\ProductDiscountService;
// use App\Services\InventoryService; // Commented out
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OrderService
{
    /** @var ProductDiscountService */
    protected $productDiscountService;
    // /** @var InventoryService */
    // protected $inventoryService; // Commented out

    public function __construct(ProductDiscountService $productDiscountService /*, InventoryService $inventoryService*/)
    {
        $this->productDiscountService = $productDiscountService;
        // $this->inventoryService = $inventoryService; // Commented out
    }

    /**
     * Creates an order from a given quote.
     *
     * @param Quote $quote
     * @return Order
     * @throws \Throwable
     */
    public function createOrderFromQuote(Quote $quote): Order
    {
        return DB::transaction(function () use ($quote) {
            $order = Order::create([
                'patient_id' => $quote->patient_id,
                'user_id' => $quote->user_id, // This should be the user who created the quote or the acting user.
                                           // Assuming $quote->user_id is intended (user who created the quote).
                'quote_id' => $quote->id,
                'order_number' => Order::generateOrderNumber(), // Ensure order number is generated
                'status' => Order::STATUS_PENDING, 
                'payment_status' => Order::PAYMENT_STATUS_PENDING,
                'currency' => $quote->currency ?? 'USD', // Default currency if not in quote
                'subtotal' => $quote->subtotal,
                'discount_type' => $quote->discount_type,
                'discount_amount_or_percentage' => $quote->discount_amount_or_percentage,
                'discount_applied' => $quote->discount_applied,
                'tax' => $quote->tax_amount ?? 0.00, // Use tax_amount from quote
                'total' => $quote->total,
                'notes' => $quote->notes,
                'created_by' => $quote->created_by,
                'appointment_id' => $quote->appointment_id ?? null, // If quote can be linked to appointment
                'laboratory_id' => $quote->laboratory_id ?? null, // If quote can be linked to lab
                'order_date' => now(),
                // 'created_by' should be handled by Order model if it uses a Blameable trait or similar
                // If not, it should be $quote->user_id or Auth::id() depending on requirements.
            ]);

            foreach ($quote->items as $quoteItem) {
                // Product should be eager loaded with quote if possible, but findOrFail is safe.
                $product = Product::findOrFail($quoteItem->product_id);

                $order->items()->create([
                    'product_id' => $quoteItem->product_id,
                    'product_type' => $quoteItem->product_type, 
                    'name' => $quoteItem->name,
                    'description' => $quoteItem->description,
                    'quantity' => $quoteItem->quantity,
                    'original_price' => $quoteItem->original_price,
                    'price' => $quoteItem->price, // unit price after item discount from quote
                    'discount_percentage' => $quoteItem->discount_percentage,
                    'discount_id' => $quoteItem->discount_id,
                    'total' => $quoteItem->total, // total price for this item from quote
                    // notes from quote item if necessary
                ]);

                // Handle inventory (commented out until InventoryService is ready)
                // if (isset($this->inventoryService)) {
                //     $this->inventoryService->decreaseStock($product, $quoteItem->quantity, $order->id, 'order');
                //     Log::info("Stock decreased for product {$product->id} by {$quoteItem->quantity} for order {$order->id}");
                // }
            }
            
            $quote->update(['status' => Quote::STATUS_CONVERTED, 'order_id' => $order->id]);
            Log::info("Quote {$quote->id} marked as converted to order {$order->id}.");

            return $order;
        });
    }

    /**
     * Creates a new order directly from request data.
     *
     * @param array $data Validated data from StoreOrderRequest
     * @param int $userId ID of the user creating the order (Auth::id())
     * @return Order
     * @throws \Throwable
     */
    public function createOrder(array $data, int $userId): Order
    {
        return DB::transaction(function () use ($data, $userId) {
            $orderSubtotal = 0;
            $orderItemsData = [];

            foreach ($data['items'] as $itemData) {
                $product = Product::with('productCategory')->findOrFail($itemData['product_id']);
                $quantity = $itemData['quantity'];
                $patientId = $data['patient_id'] ?? null; // Use order's patient_id for discount context

                // Get price and apply discount using ProductDiscountService
                $priceInfo = $this->productDiscountService->applyDiscountToPrice($product->price, $product->id, $patientId);
                
                $itemSubtotalForItem = $priceInfo['discounted_price'] * $quantity;
                
                $orderItemsData[] = [
                    'product_id' => $product->id,
                    'product_type' => Product::class, // Use Product::class for product_type
                    'name' => $product->identifier, // Using identifier as name, could be $product->name
                    'description' => $product->description ?? ($product->productCategory ? $product->productCategory->name : 'Producto'),
                    'quantity' => $quantity,
                    'original_price' => $priceInfo['original_price'],
                    'price' => $priceInfo['discounted_price'], // unit price after discount
                    'discount_percentage' => $priceInfo['discount_percentage'],
                    'discount_id' => $priceInfo['discount_id'] ?? null,
                    'total' => $itemSubtotalForItem, // total for this item
                    'notes' => $itemData['notes'] ?? null,
                ];
                $orderSubtotal += $itemSubtotalForItem;
            }
            
            // Calculate overall discount if applicable (currently not in StoreOrderRequest, but good to have for flexibility)
            // This example assumes overall discount logic might be added or is handled before this service method.
            // For now, direct orders don't have an overall discount field in StoreOrderRequest.
            $overallDiscountApplied = $data['discount_applied'] ?? 0; // Assuming StoreOrderRequest doesn't define this yet
            $subtotalAfterOverallDiscount = $orderSubtotal - $overallDiscountApplied;

            // Calculate tax
            $taxPercentage = $data['tax_percentage'] ?? 0;
            $taxAmount = $data['tax_amount'] ?? ($subtotalAfterOverallDiscount * $taxPercentage / 100);
            
            $finalTotal = $subtotalAfterOverallDiscount + $taxAmount;

            $order = Order::create([
                'order_number' => Order::generateOrderNumber(),
                'patient_id' => $data['patient_id'],
                'user_id' => $userId, // User creating the order
                'appointment_id' => $data['appointment_id'] ?? null,
                'laboratory_id' => $data['laboratory_id'] ?? null,
                'subtotal' => $orderSubtotal,
                'discount_type' => null, // Direct orders might not have overall discount type/percentage yet
                'discount_amount_or_percentage' => null,
                'discount_applied' => $overallDiscountApplied, // Typically 0 for new direct orders unless logic changes
                'tax_percentage' => $taxPercentage,
                'tax_amount' => $taxAmount,
                'total_amount' => $finalTotal,
                'status' => $data['status'] ?? Order::STATUS_PENDING,
                'payment_status' => $data['payment_status'] ?? Order::PAYMENT_STATUS_PENDING,
                'notes' => $data['notes'] ?? null,
                'order_date' => now(),
                'created_by' => $userId, // Explicitly set created_by if not handled by model events
                'currency' => $data['currency'] ?? 'USD',
            ]);
            
            Log::info("Order {$order->id} created for patient {$order->patient_id}. Subtotal: {$orderSubtotal}, Discount: {$overallDiscountApplied}, Tax: {$taxAmount}, Total: {$finalTotal}");

            foreach ($orderItemsData as $itemSaveData) {
                $orderItem = $order->items()->create($itemSaveData);
                // Handle inventory (commented out until InventoryService is ready)
                // if (isset($this->inventoryService)) {
                //    $this->inventoryService->decreaseStock(Product::find($itemSaveData['product_id']), $itemSaveData['quantity'], $order->id, 'order');
                //    Log::info("Stock decreased for product {$itemSaveData['product_id']} by {$itemSaveData['quantity']} for order {$order->id}");
                // }
            }

            return $order;
        });
    }

    public function updateOrder(Order $order, array $data): Order
    {
        return DB::transaction(function () use ($order, $data) {
            $order->update($data);
            
            Log::info("Order {$order->id} updated with data: " . json_encode($data));
            
            return $order->fresh();
        });
    }

    public function updateOrderStatus(Order $order, string $status, ?string $notes = null): Order
    {
        return DB::transaction(function () use ($order, $status, $notes) {
            $updateData = ['status' => $status];
            
            if ($notes !== null) {
                $updateData['notes'] = $notes;
            }
            
            $order->update($updateData);
            
            Log::info("Order {$order->id} status updated to {$status}" . ($notes ? " with notes: {$notes}" : ""));
            
            return $order->fresh();
        });
    }

    public function updateOrderPaymentStatus(Order $order, array $data): Order
    {
        return DB::transaction(function () use ($order, $data) {
            $order->update($data);
            
            Log::info("Order {$order->id} payment status updated with data: " . json_encode($data));
            
            return $order->fresh();
        });
    }
} 