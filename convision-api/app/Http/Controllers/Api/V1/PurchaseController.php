<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Purchase\StorePurchaseRequest;
use App\Http\Requests\Api\V1\Purchase\UpdatePurchaseRequest;
use App\Http\Resources\V1\Purchase\PurchaseCollection;
use App\Http\Resources\V1\Purchase\PurchaseResource;
use App\Models\Purchase;
use App\Services\PurchaseService;
use Illuminate\Http\Request;

class PurchaseController extends Controller
{
    protected $purchaseService;

    public function __construct(PurchaseService $purchaseService)
    {
        $this->middleware('auth:api');
        $this->purchaseService = $purchaseService;
    }

    public function index(Request $request)
    {
        $query = Purchase::with(['supplier', 'createdBy'])
            ->apiFilter($request);
        
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $purchases = $query->paginate($perPage);
        
        return new PurchaseCollection($purchases);
    }

    public function store(StorePurchaseRequest $request)
    {
        $validatedData = $request->validated();
        $purchase = $this->purchaseService->createPurchase($validatedData);
        return new PurchaseResource($purchase);
    }

    public function show(Purchase $purchase)
    {
        $purchase->load(['supplier', 'items.product', 'payments.paymentMethod', 'createdBy']);
        return new PurchaseResource($purchase);
    }

    public function update(UpdatePurchaseRequest $request, Purchase $purchase)
    {
        $validatedData = $request->validated();
        $purchase = $this->purchaseService->updatePurchase($purchase, $validatedData);
        return new PurchaseResource($purchase);
    }

    public function destroy(Purchase $purchase)
    {
        $this->purchaseService->deletePurchase($purchase);
        return response()->json(null, 204);
    }

    public function calculateTotals(Request $request)
    {
        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.tax_rate' => 'nullable|numeric|min:0|max:100',
        ]);

        $totals = $this->purchaseService->calculateTotals($request->items);
        
        return response()->json($totals);
    }

    public function addPayment(Request $request, Purchase $purchase)
    {
        $request->validate([
            'payment_method_id' => 'required|exists:payment_methods,id',
            'amount' => 'required|numeric|min:0.01',
            'payment_date' => 'required|date',
            'reference' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $payment = $this->purchaseService->addPayment($purchase, $request->validated());
        
        return response()->json([
            'message' => 'Pago agregado exitosamente',
            'payment' => $payment,
        ]);
    }
} 