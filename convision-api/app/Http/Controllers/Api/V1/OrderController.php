<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Order\StoreOrderRequest;
use App\Http\Requests\Api\V1\Order\UpdateOrderRequest;
use App\Http\Resources\V1\Order\OrderCollection;
use App\Http\Resources\V1\Order\OrderResource;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Services\OrderService;
use App\Http\Controllers\Api\V1\OrderPDFController;
use App\Http\Controllers\Api\V1\GuestPDFController;

/**
 * @OA\Tag(
 *     name="Orders",
 *     description="API Endpoints for order management"
 * )
 */
class OrderController extends Controller
{
    protected $orderPdfController;
    protected $guestPdfController;
    /** @var OrderService */
    protected $orderService;

    public function __construct(
        OrderPDFController $orderPdfController,
        GuestPDFController $guestPdfController,
        OrderService $orderService
    )
    {
        $this->middleware('auth:api');
        $this->orderPdfController = $orderPdfController;
        $this->guestPdfController = $guestPdfController;
        $this->orderService = $orderService;
    }

    /**
     * @OA\Get(
     *     path="/api/v1/orders",
     *     summary="Get list of orders",
     *     tags={"Orders"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="page", in="query", description="Page number", @OA\Schema(type="integer", default=1)),
     *     @OA\Parameter(name="per_page", in="query", description="Items per page", @OA\Schema(type="integer", default=15)),
     *     @OA\Parameter(name="s_f", in="query", description="Search fields", @OA\Schema(type="string")),
     *     @OA\Parameter(name="s_v", in="query", description="Search values", @OA\Schema(type="string")),
     *     @OA\Parameter(name="sort_by", in="query", description="Sort by field", @OA\Schema(type="string")),
     *     @OA\Parameter(name="sort_direction", in="query", description="Sort direction (asc/desc)", @OA\Schema(type="string")),
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="data", type="array", @OA\Items(
     *                 @OA\Property(property="id", type="integer"),
     *                 @OA\Property(property="order_number", type="string"),
     *                 @OA\Property(property="patient_id", type="integer"),
     *                 @OA\Property(property="status", type="string", enum={"pending","processing","completed","cancelled"}),
     *                 @OA\Property(property="total", type="number", format="float"),
     *                 @OA\Property(property="payment_status", type="string", enum={"pending","paid","refunded"}),
     *                 @OA\Property(property="notes", type="string", nullable=true),
     *                 @OA\Property(property="created_at", type="string", format="date-time"),
     *                 @OA\Property(property="updated_at", type="string", format="date-time"),
     *                 @OA\Property(property="patient", type="object"),
     *                 @OA\Property(property="items", type="array", @OA\Items(type="object")),
     *                 @OA\Property(property="created_by", type="object"),
     *                 @OA\Property(property="laboratory", type="object")
     *             )),
     *             @OA\Property(property="links", type="object"),
     *             @OA\Property(property="meta", type="object")
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function index(Request $request)
    {
        $query = Order::with(['patient', 'items.product', 'createdBy', 'laboratory'])
            ->apiFilter($request)
            ->orderBy('created_at', 'desc');
        
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $orders = $query->paginate($perPage);
        
        return new OrderCollection($orders);
    }

    /**
     * @OA\Post(
     *     path="/api/v1/orders",
     *     summary="Create a new order",
     *     tags={"Orders"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"patient_id","items"},
     *             @OA\Property(property="patient_id", type="integer", example=1),
     *             @OA\Property(property="appointment_id", type="integer", nullable=true, example=1),
     *             @OA\Property(property="laboratory_id", type="integer", nullable=true, example=1),
     *             @OA\Property(property="status", type="string", enum={"pending","processing","completed","cancelled"}, example="pending"),
     *             @OA\Property(property="payment_status", type="string", enum={"pending","paid","refunded"}, example="pending"),
     *             @OA\Property(property="payment_method_id", type="integer", nullable=true, example=1),
     *             @OA\Property(property="notes", type="string", nullable=true, example="Rush order"),
     *             @OA\Property(
     *                 property="items",
     *                 type="array",
     *                 @OA\Items(
     *                     @OA\Property(property="product_id", type="integer", example=1),
     *                     @OA\Property(property="quantity", type="integer", example=2),
     *                     @OA\Property(property="unit_price", type="number", format="float", example=99.99),
     *                     @OA\Property(property="discount_percentage", type="number", format="float", nullable=true, example=10.0),
     *                     @OA\Property(property="notes", type="string", nullable=true, example="Special instructions")
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Order created successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="id", type="integer"),
     *             @OA\Property(property="order_number", type="string"),
     *             @OA\Property(property="patient_id", type="integer"),
     *             @OA\Property(property="status", type="string"),
     *             @OA\Property(property="total", type="number", format="float"),
     *             @OA\Property(property="payment_status", type="string"),
     *             @OA\Property(property="created_at", type="string", format="date-time")
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function store(StoreOrderRequest $request)
    {
        $validatedData = $request->validated();
        $user = Auth::user();
        
        $order = $this->orderService->createOrder($validatedData, $user->id);
        return new OrderResource($order);
    }

    /**
     * @OA\Get(
     *     path="/api/v1/orders/{id}",
     *     summary="Get order details",
     *     tags={"Orders"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, description="Order ID", @OA\Schema(type="integer")),
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(
     *             @OA\Property(property="id", type="integer"),
     *             @OA\Property(property="order_number", type="string"),
     *             @OA\Property(property="patient_id", type="integer"),
     *             @OA\Property(property="status", type="string"),
     *             @OA\Property(property="total", type="number", format="float"),
     *             @OA\Property(property="payment_status", type="string"),
     *             @OA\Property(property="notes", type="string", nullable=true),
     *             @OA\Property(property="created_at", type="string", format="date-time"),
     *             @OA\Property(property="patient", type="object"),
     *             @OA\Property(property="items", type="array", @OA\Items(type="object")),
     *             @OA\Property(property="appointment", type="object"),
     *             @OA\Property(property="created_by", type="object"),
     *             @OA\Property(property="laboratory", type="object")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Order not found"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function show($id)
    {
        $order = Order::with(['patient', 'items.product', 'appointment.prescription', 'createdBy', 'laboratory'])
            ->findOrFail($id);
        return new OrderResource($order);
    }

    /**
     * @OA\Put(
     *     path="/api/v1/orders/{id}",
     *     summary="Update order details",
     *     tags={"Orders"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, description="Order ID", @OA\Schema(type="integer")),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="patient_id", type="integer", example=1),
     *             @OA\Property(property="appointment_id", type="integer", nullable=true, example=1),
     *             @OA\Property(property="laboratory_id", type="integer", nullable=true, example=1),
     *             @OA\Property(property="status", type="string", enum={"pending","processing","completed","cancelled"}, example="processing"),
     *             @OA\Property(property="payment_status", type="string", enum={"pending","paid","refunded"}, example="paid"),
     *             @OA\Property(property="payment_method_id", type="integer", nullable=true, example=1),
     *             @OA\Property(property="notes", type="string", nullable=true, example="Updated notes"),
     *             @OA\Property(
     *                 property="items",
     *                 type="array",
     *                 @OA\Items(
     *                     @OA\Property(property="product_id", type="integer", example=1),
     *                     @OA\Property(property="quantity", type="integer", example=2),
     *                     @OA\Property(property="unit_price", type="number", format="float", example=99.99),
     *                     @OA\Property(property="discount_percentage", type="number", format="float", nullable=true, example=10.0),
     *                     @OA\Property(property="notes", type="string", nullable=true, example="Special instructions")
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Order updated successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="id", type="integer"),
     *             @OA\Property(property="order_number", type="string"),
     *             @OA\Property(property="status", type="string"),
     *             @OA\Property(property="total", type="number", format="float"),
     *             @OA\Property(property="updated_at", type="string", format="date-time")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Order not found"
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function update(UpdateOrderRequest $request, Order $order)
    {
        $validatedData = $request->validated();
        $updatedOrder = $this->orderService->updateOrder($order, $validatedData);
        return new OrderResource($updatedOrder);
    }

    /**
     * @OA\Get(
     *     path="/api/v1/orders/{id}/pdf",
     *     summary="Download order PDF",
     *     tags={"Orders"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, description="Order ID", @OA\Schema(type="integer")),
     *     @OA\Response(
     *         response=200,
     *         description="PDF file",
     *         @OA\MediaType(
     *             mediaType="application/pdf",
     *             @OA\Schema(type="string", format="binary")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Order not found"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function downloadPdf($id)
    {
        return $this->orderPdfController->generate($id);
    }

    /**
     * @OA\Patch(
     *     path="/api/v1/orders/{id}/status",
     *     summary="Update order status",
     *     tags={"Orders"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, description="Order ID", @OA\Schema(type="integer")),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"status"},
     *             @OA\Property(property="status", type="string", enum={"pending","processing","completed","cancelled"}, example="processing"),
     *             @OA\Property(property="notes", type="string", nullable=true, example="Status update notes")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Order status updated successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="id", type="integer"),
     *             @OA\Property(property="status", type="string"),
     *             @OA\Property(property="updated_at", type="string", format="date-time")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Order not found"
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function updateStatus(Request $request, Order $order)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:'.implode(',', Order::getAllStatuses()),
            'notes' => 'nullable|string'
        ]);

        $updatedOrder = $this->orderService->updateOrderStatus($order, $validated['status'], $validated['notes'] ?? null);
        return new OrderResource($updatedOrder);
    }

    /**
     * @OA\Patch(
     *     path="/api/v1/orders/{id}/payment-status",
     *     summary="Update order payment status",
     *     tags={"Orders"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, description="Order ID", @OA\Schema(type="integer")),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"payment_status"},
     *             @OA\Property(property="payment_status", type="string", enum={"pending","paid","refunded"}, example="paid"),
     *             @OA\Property(property="payment_method_id", type="integer", nullable=true, example=1),
     *             @OA\Property(property="transaction_reference", type="string", nullable=true, example="TXN123456"),
     *             @OA\Property(property="payment_notes", type="string", nullable=true, example="Payment completed via credit card")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Order payment status updated successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="id", type="integer"),
     *             @OA\Property(property="payment_status", type="string"),
     *             @OA\Property(property="updated_at", type="string", format="date-time")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Order not found"
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function updatePaymentStatus(Request $request, Order $order)
    {
        $validated = $request->validate([
            'payment_status' => 'required|string|in:'.implode(',', Order::getAllPaymentStatuses()),
            'payment_method_id' => 'nullable|exists:payment_methods,id',
            'transaction_reference' => 'nullable|string|max:255',
            'payment_notes' => 'nullable|string'
        ]);

        $updatedOrder = $this->orderService->updateOrderPaymentStatus($order, $validated);
        return new OrderResource($updatedOrder);
    }
}
