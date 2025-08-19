<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\PaymentMethod\StorePaymentMethodRequest;
use App\Http\Requests\Api\V1\PaymentMethod\UpdatePaymentMethodRequest;
use App\Http\Resources\V1\Payment\PaymentMethodCollection;
use App\Http\Resources\V1\Payment\PaymentMethodResource;
use App\Models\PaymentMethod;
use App\Services\PaymentMethodService;
use Illuminate\Http\Request;

class PaymentMethodController extends Controller
{
    protected $paymentMethodService;

    public function __construct(PaymentMethodService $paymentMethodService)
    {
        $this->middleware('auth:api');
        $this->paymentMethodService = $paymentMethodService;
    }

    /**
     * Display a listing of payment methods.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        $paymentMethods = $this->paymentMethodService->getActivePaymentMethods();
        return new PaymentMethodCollection($paymentMethods);
    }

    /**
     * Store a newly created payment method.
     *
     * @param  StorePaymentMethodRequest  $request
     * @return \Illuminate\Http\Response
     */
    public function store(StorePaymentMethodRequest $request)
    {
        $validatedData = $request->validated();
        $paymentMethod = $this->paymentMethodService->createPaymentMethod($validatedData);
        return new PaymentMethodResource($paymentMethod);
    }

    /**
     * Display the specified payment method.
     *
     * @param  PaymentMethod $payment_method
     * @return \Illuminate\Http\Response
     */
    public function show(PaymentMethod $payment_method)
    {
        return new PaymentMethodResource($payment_method);
    }

    /**
     * Update the specified payment method.
     *
     * @param  UpdatePaymentMethodRequest  $request
     * @param  PaymentMethod $payment_method
     * @return \Illuminate\Http\Response
     */
    public function update(UpdatePaymentMethodRequest $request, PaymentMethod $payment_method)
    {
        $validatedData = $request->validated();
        $paymentMethod = $this->paymentMethodService->updatePaymentMethod($payment_method, $validatedData);
        return new PaymentMethodResource($paymentMethod);
    }

    /**
     * Remove the specified payment method.
     *
     * @param  PaymentMethod $payment_method
     * @return \Illuminate\Http\Response
     */
    public function destroy(PaymentMethod $payment_method)
    {
        $this->paymentMethodService->deletePaymentMethod($payment_method);
        return response()->json(null, 204);
    }
}
