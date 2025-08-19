<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\DiscountRequest\StoreDiscountRequestRequest;
use App\Http\Requests\Api\V1\DiscountRequest\UpdateDiscountRequestRequest;
use App\Http\Requests\Api\V1\DiscountRequest\ProcessDiscountRequestRequest;
use App\Http\Requests\Api\V1\DiscountRequest\ActiveDiscountsRequest;
use App\Models\DiscountRequest;
use App\Services\DiscountRequestService;
use App\Http\Resources\V1\DiscountRequest\DiscountRequestResource;
use App\Http\Resources\V1\DiscountRequest\DiscountRequestCollection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DiscountRequestController extends Controller
{
    protected $discountRequestService;

    public function __construct(DiscountRequestService $discountRequestService)
    {
        $this->middleware('auth:api');
        $this->discountRequestService = $discountRequestService;
    }

    /**
     * Display a listing of discount requests.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        $query = DiscountRequest::with(['user', 'product', 'patient', 'approver'])
            ->apiFilter($request)
            ->orderBy('created_at', 'desc');
        
        $perPage = $request->get('per_page', 15);
        $perPage = min(max(1, (int)$perPage), 100);
        
        $discountRequests = $query->paginate($perPage);
        
        return new DiscountRequestCollection($discountRequests);
    }

    /**
     * Store a newly created discount request.
     *
     * @param  StoreDiscountRequestRequest  $request
     * @return \Illuminate\Http\Response
     */
    public function store(StoreDiscountRequestRequest $request)
    {
        $validatedData = $request->validated();
        $discountRequest = $this->discountRequestService->createDiscountRequest($validatedData);
        return new DiscountRequestResource($discountRequest);
    }

    /**
     * Display the specified discount request.
     *
     * @param  DiscountRequest $discount_request
     * @return \Illuminate\Http\Response
     */
    public function show(DiscountRequest $discount_request)
    {
        $discount_request->load(['user', 'product', 'patient', 'approver']);
        return new DiscountRequestResource($discount_request);
    }

    /**
     * Update the specified discount request.
     *
     * @param  UpdateDiscountRequestRequest  $request
     * @param  DiscountRequest $discount_request
     * @return \Illuminate\Http\Response
     */
    public function update(UpdateDiscountRequestRequest $request, DiscountRequest $discount_request)
    {
        $validatedData = $request->validated();
        $discountRequest = $this->discountRequestService->updateDiscountRequest($discount_request, $validatedData);
        return new DiscountRequestResource($discountRequest);
    }

    /**
     * Approve a discount request.
     *
     * @param  ProcessDiscountRequestRequest  $request
     * @param  DiscountRequest $discount_request
     * @return \Illuminate\Http\Response
     */
    public function approve(ProcessDiscountRequestRequest $request, DiscountRequest $discount_request)
    {
        $validatedData = $request->validated();
        $discountRequest = $this->discountRequestService->approveDiscountRequest(
            $discount_request,
            $validatedData['approval_notes'] ?? null
        );
        return new DiscountRequestResource($discountRequest);
    }

    /**
     * Reject a discount request.
     *
     * @param  ProcessDiscountRequestRequest  $request
     * @param  DiscountRequest $discount_request
     * @return \Illuminate\Http\Response
     */
    public function reject(ProcessDiscountRequestRequest $request, DiscountRequest $discount_request)
    {
        $validatedData = $request->validated();
        $discountRequest = $this->discountRequestService->rejectDiscountRequest(
            $discount_request,
            $validatedData['approval_notes'] ?? null
        );
        return new DiscountRequestResource($discountRequest);
    }

    /**
     * Get active discounts for a product and optionally a patient.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function activeDiscounts(ActiveDiscountsRequest $request)
    {
        $validatedData = $request->validated();
        $activeDiscounts = $this->discountRequestService->getActiveDiscounts(
            $validatedData['product_id'],
            $validatedData['patient_id'] ?? null
        );
        return DiscountRequestResource::collection($activeDiscounts);
    }

    /**
     * Remove the specified discount request.
     *
     * @param  DiscountRequest $discount_request
     * @return \Illuminate\Http\Response
     */
    public function destroy(DiscountRequest $discount_request)
    {
        $this->discountRequestService->deleteDiscountRequest($discount_request);
        return response()->json(null, 204);
    }
} 