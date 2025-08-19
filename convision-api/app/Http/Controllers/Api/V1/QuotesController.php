<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Quote\StoreQuoteRequest;
use App\Http\Requests\Api\V1\Quote\UpdateQuoteRequest;
use App\Http\Requests\Api\V1\Quote\UpdateQuoteStatusRequest;
use App\Http\Resources\V1\Quote\QuoteCollection;
use App\Http\Resources\V1\Quote\QuoteResource;
use App\Http\Resources\V1\Order\OrderResource;
use App\Models\Quote;
use App\Models\QuoteItem;
use App\Models\Product;
use App\Models\Patient;
use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Services\ProductDiscountService;
use App\Services\OrderService;
use App\Services\QuoteService;
use Illuminate\Support\Facades\Log;
use Barryvdh\DomPDF\Facade\Pdf;

/**
 * @OA\Tag(
 *     name="Quotes",
 *     description="API Endpoints for quote management"
 * )
 */
class QuotesController extends Controller
{
    protected $productDiscountService;
    protected $orderService;
    protected $quoteService;

    public function __construct(
        ProductDiscountService $productDiscountService, 
        OrderService $orderService,
        QuoteService $quoteService
    )
    {
        $this->middleware('auth:api');
        $this->productDiscountService = $productDiscountService;
        $this->orderService = $orderService;
        $this->quoteService = $quoteService;
    }

    /**
     * @OA\Get(
     *     path="/api/v1/quotes",
     *     summary="Get list of quotes",
     *     tags={"Quotes"},
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
     *                 @OA\Property(property="quote_number", type="string"),
     *                 @OA\Property(property="patient_id", type="integer"),
     *                 @OA\Property(property="status", type="string", enum={"draft","sent","accepted","rejected","expired"}),
     *                 @OA\Property(property="total", type="number", format="float"),
     *                 @OA\Property(property="valid_until", type="string", format="date"),
     *                 @OA\Property(property="notes", type="string", nullable=true),
     *                 @OA\Property(property="created_at", type="string", format="date-time"),
     *                 @OA\Property(property="updated_at", type="string", format="date-time"),
     *                 @OA\Property(property="patient", type="object"),
     *                 @OA\Property(property="items", type="array", @OA\Items(type="object")),
     *                 @OA\Property(property="created_by", type="object")
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
        $query = Quote::with(['patient', 'items.product.brand', 'createdBy'])
            ->apiFilter($request)
            ->orderBy('created_at', 'desc');

        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);

        $items = $query->paginate($perPage);

        return new QuoteCollection($items);
    }

    /**
     * @OA\Post(
     *     path="/api/v1/quotes",
     *     summary="Create a new quote",
     *     tags={"Quotes"},
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"patient_id","items"},
     *             @OA\Property(property="patient_id", type="integer", example=1),
     *             @OA\Property(property="valid_until", type="string", format="date", example="2024-12-31"),
     *             @OA\Property(property="notes", type="string", nullable=true, example="Special discount applied"),
     *             @OA\Property(property="status", type="string", enum={"draft","sent","accepted","rejected","expired"}, example="draft"),
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
     *         description="Quote created successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="id", type="integer"),
     *             @OA\Property(property="quote_number", type="string"),
     *             @OA\Property(property="patient_id", type="integer"),
     *             @OA\Property(property="status", type="string"),
     *             @OA\Property(property="total", type="number", format="float"),
     *             @OA\Property(property="valid_until", type="string", format="date"),
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
    public function store(StoreQuoteRequest $request)
    {
        $validatedData = $request->validated();
        $user = Auth::user();

        $quote = $this->quoteService->createQuote($validatedData, $user);
        return new QuoteResource($quote);
    }

    /**
     * @OA\Get(
     *     path="/api/v1/quotes/{id}",
     *     summary="Get quote details",
     *     tags={"Quotes"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, description="Quote ID", @OA\Schema(type="integer")),
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(
     *             @OA\Property(property="id", type="integer"),
     *             @OA\Property(property="quote_number", type="string"),
     *             @OA\Property(property="patient_id", type="integer"),
     *             @OA\Property(property="status", type="string"),
     *             @OA\Property(property="total", type="number", format="float"),
     *             @OA\Property(property="valid_until", type="string", format="date"),
     *             @OA\Property(property="notes", type="string", nullable=true),
     *             @OA\Property(property="created_at", type="string", format="date-time"),
     *             @OA\Property(property="patient", type="object"),
     *             @OA\Property(property="items", type="array", @OA\Items(type="object")),
     *             @OA\Property(property="created_by", type="object")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Quote not found"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function show($id)
    {
        $quote = $this->quoteService->findQuote($id);
        return new QuoteResource($quote);
    }

    /**
     * @OA\Put(
     *     path="/api/v1/quotes/{id}",
     *     summary="Update quote details",
     *     tags={"Quotes"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, description="Quote ID", @OA\Schema(type="integer")),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="patient_id", type="integer", example=1),
     *             @OA\Property(property="valid_until", type="string", format="date", example="2024-12-31"),
     *             @OA\Property(property="notes", type="string", nullable=true, example="Updated notes"),
     *             @OA\Property(property="status", type="string", enum={"draft","sent","accepted","rejected","expired"}, example="sent"),
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
     *         description="Quote updated successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="id", type="integer"),
     *             @OA\Property(property="quote_number", type="string"),
     *             @OA\Property(property="status", type="string"),
     *             @OA\Property(property="total", type="number", format="float"),
     *             @OA\Property(property="updated_at", type="string", format="date-time")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Quote not found"
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
    public function update(UpdateQuoteRequest $request, $id)
    {
        $validatedData = $request->validated();
        $quote = $this->quoteService->updateQuote((int)$id, $validatedData);
        return new QuoteResource($quote);
    }

    /**
     * @OA\Patch(
     *     path="/api/v1/quotes/{id}/status",
     *     summary="Update quote status",
     *     tags={"Quotes"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, description="Quote ID", @OA\Schema(type="integer")),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"status"},
     *             @OA\Property(property="status", type="string", enum={"draft","sent","accepted","rejected","expired"}, example="accepted")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Quote status updated successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="id", type="integer"),
     *             @OA\Property(property="status", type="string"),
     *             @OA\Property(property="updated_at", type="string", format="date-time")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Quote not found"
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
    public function updateStatus(UpdateQuoteStatusRequest $request, $id)
    {
        $validatedData = $request->validated();
        $quote = $this->quoteService->updateQuoteStatus($id, $validatedData['status']);
        return new QuoteResource($quote);
    }

    /**
     * @OA\Post(
     *     path="/api/v1/quotes/{id}/convert-to-sale",
     *     summary="Convert quote to sale/order",
     *     tags={"Quotes"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, description="Quote ID", @OA\Schema(type="integer")),
     *     @OA\Response(
     *         response=200,
     *         description="Quote converted to order successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="id", type="integer"),
     *             @OA\Property(property="order_number", type="string"),
     *             @OA\Property(property="patient_id", type="integer"),
     *             @OA\Property(property="status", type="string"),
     *             @OA\Property(property="total", type="number", format="float"),
     *             @OA\Property(property="created_at", type="string", format="date-time")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Quote not found"
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Quote cannot be converted (invalid status)"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function convertToSale(Request $request, $id)
    {
        $order = $this->quoteService->convertQuoteToOrder($id);
        return new OrderResource($order);
    }

    /**
     * @OA\Get(
     *     path="/api/v1/quotes/{id}/pdf",
     *     summary="Generate quote PDF",
     *     tags={"Quotes"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, description="Quote ID", @OA\Schema(type="integer")),
     *     @OA\Parameter(name="preview", in="query", description="Preview mode", @OA\Schema(type="string", enum={"true","false"})),
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
     *         description="Quote not found"
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function generatePdf($id, Request $request)
    {
        $isPreview = $request->has('preview') && $request->preview === 'true';
        return $this->quoteService->generatePdf($id, $isPreview);
    }
} 