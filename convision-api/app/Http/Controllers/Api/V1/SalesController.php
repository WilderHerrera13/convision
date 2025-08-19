<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Sale\AddSalePaymentRequest;
use App\Http\Requests\Api\V1\Sale\StoreSaleRequest;
use App\Http\Requests\Api\V1\Sale\UpdateSaleRequest;
use App\Http\Resources\V1\Sale\SaleCollection;
use App\Http\Resources\V1\Sale\SaleResource;
use App\Http\Resources\V1\Sale\SaleStatsResource;
use App\Http\Resources\V1\Shared\PdfTokenResource;
use App\Models\Sale;
use App\Services\SaleService;
use App\Http\Controllers\Api\V1\GuestPDFController;
use App\Http\Controllers\Api\V1\SalePDFController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SalesController extends Controller
{
    protected $saleService;

    public function __construct(SaleService $saleService)
    {
        $this->middleware('auth:api');
        $this->saleService = $saleService;
    }

    public function index(Request $request)
    {
        $user = Auth::user();
        $query = $this->saleService->getFilteredSales($request, $user);
        
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $sales = $query->paginate($perPage);
        
        $sales->getCollection()->transform(function ($sale) {
            $sale->pdf_token = GuestPDFController::generateToken('sale', $sale->id);
            $sale->guest_pdf_url = url("/api/v1/guest/sales/{$sale->id}/pdf?token={$sale->pdf_token}");
            return $sale;
        });
        
        return new SaleCollection($sales);
    }

    public function store(StoreSaleRequest $request)
    {
        $validatedData = $request->validated();
        $user = Auth::user();

        $sale = $this->saleService->createSale($validatedData, $user);
        
        // Load laboratory orders to return in response
        $sale->load('laboratoryOrders.laboratory');
        
        return new SaleResource($sale);
    }

    public function show($id)
    {
        $sale = Sale::with([
            'patient', 
            'items.lens.brand',
            'order.items.lens', 
            'order.laboratory',
            'payments.paymentMethod', 
            'partialPayments.paymentMethod',
            'createdBy'
        ])->findOrFail($id);
        
        $sale->pdf_token = GuestPDFController::generateToken('sale', $sale->id);
        $sale->guest_pdf_url = url("/api/v1/guest/sales/{$sale->id}/pdf?token={$sale->pdf_token}");
        
        return new SaleResource($sale);
    }

    public function update(UpdateSaleRequest $request, $id)
    {
        $sale = Sale::findOrFail($id);
        $validatedData = $request->validated();
        $sale = $this->saleService->updateSale($sale, $validatedData);
        return new SaleResource($sale);
    }

    public function addPayment(AddSalePaymentRequest $request, $id)
    {
        $sale = Sale::findOrFail($id);
        $validatedData = $request->validated();
        $user = Auth::user();
        
        // Process each payment in the payments array
        foreach ($validatedData['payments'] as $paymentData) {
            $sale = $this->saleService->addPayment($sale, $paymentData, $user);
        }
        
        return new SaleResource($sale);
    }

    public function removePayment($saleId, $paymentId)
    {
        $sale = Sale::findOrFail($saleId);
        $sale = $this->saleService->removePayment($sale, $paymentId);
        return new SaleResource($sale);
    }

    public function cancel($id)
    {
        $sale = Sale::findOrFail($id);
        $sale = $this->saleService->cancelSale($sale);
        return new SaleResource($sale);
    }

    public function downloadPdf($id)
    {
        $sale = Sale::findOrFail($id);
        return app(SalePDFController::class)->generate($sale);
    }

    public function generatePdfToken($id)
    {
        $sale = Sale::findOrFail($id);
        $token = GuestPDFController::generateToken('sale', $sale->id);
        
        return new PdfTokenResource([
            'token' => $token,
            'url' => url("/api/v1/guest/sales/{$sale->id}/pdf?token={$token}")
        ]);
    }

    public function stats(Request $request)
    {
        $stats = $this->saleService->getSaleStats($request);
        return new SaleStatsResource($stats);
    }

    public function todayStats()
    {
        $stats = $this->saleService->getTodayStats();
        return new SaleStatsResource($stats);
    }

    public function destroy($id)
    {
        $sale = Sale::findOrFail($id);
        $this->saleService->deleteSale($sale);
        
        return response()->json(null, 204);
    }
}
