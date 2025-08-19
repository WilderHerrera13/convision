<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\PartialPayment\StorePartialPaymentRequest;
use App\Http\Resources\V1\PartialPayment\PartialPaymentCollection;
use App\Http\Resources\V1\PartialPayment\PartialPaymentResource;
use App\Http\Resources\V1\Sale\SaleResource;
use App\Models\PartialPayment;
use App\Services\PartialPaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PartialPaymentController extends Controller
{
    protected $partialPaymentService;

    public function __construct(PartialPaymentService $partialPaymentService)
    {
        $this->middleware('auth:api');
        $this->partialPaymentService = $partialPaymentService;
    }

    /**
     * Display a listing of partial payments for a sale.
     *
     * @param  int  $saleId
     * @return \Illuminate\Http\Response
     */
    public function index($saleId)
    {
        $payments = $this->partialPaymentService->getPaymentsBySale($saleId);
        return new PartialPaymentCollection($payments);
    }

    /**
     * Store a newly created partial payment.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $saleId
     * @return \Illuminate\Http\Response
     */
    public function store(StorePartialPaymentRequest $request, $saleId)
    {
        $validatedData = $request->validated();
        $user = Auth::user();

        $result = $this->partialPaymentService->createPartialPayment($saleId, $validatedData, $user);
        
        return response()->json([
            'message' => 'Partial payment added successfully',
            'payment' => new PartialPaymentResource($result['payment']),
            'sale' => new SaleResource($result['sale']),
        ], 201);
    }

    /**
     * Display the specified partial payment.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        $payment = $this->partialPaymentService->findPartialPayment($id);
        return new PartialPaymentResource($payment);
    }

    /**
     * Remove the specified partial payment.
     *
     * @param  int  $saleId
     * @param  int  $paymentId
     * @return \Illuminate\Http\Response
     */
    public function destroy($saleId, $paymentId)
    {
        $user = Auth::user();
        $sale = $this->partialPaymentService->removePartialPayment($saleId, $paymentId, $user);
        
        return response()->json([
            'message' => 'Partial payment removed successfully',
            'sale' => new SaleResource($sale),
        ]);
    }
} 