<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\SaleLensPriceAdjustment\StoreSaleLensPriceAdjustmentRequest;
use App\Http\Resources\V1\SaleLensPriceAdjustment\SaleLensPriceAdjustmentResource;
use App\Models\Sale;
use App\Models\SaleLensPriceAdjustment;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class SaleLensPriceAdjustmentController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
        $this->middleware('role:admin,receptionist');
    }

    public function index(Request $request, $saleId)
    {
        $sale = Sale::findOrFail($saleId);
        
        $adjustments = $sale->lensPriceAdjustments()
            ->with(['lens', 'adjustedBy'])
            ->get();
            
        return SaleLensPriceAdjustmentResource::collection($adjustments);
    }

    public function store(StoreSaleLensPriceAdjustmentRequest $request, $saleId)
    {
        $sale = Sale::findOrFail($saleId);
        $validatedData = $request->validated();
        $lens = Product::findOrFail($validatedData['lens_id']);
        
        $adjustment = new SaleLensPriceAdjustment([
            'sale_id' => $sale->id,
            'lens_id' => $lens->id,
            'base_price' => $lens->price,
            'adjusted_price' => $validatedData['adjusted_price'],
            'reason' => $validatedData['reason'] ?? null,
            'adjusted_by' => Auth::id()
        ]);
        
        $adjustment->save();
        
        Log::info('Lens price adjusted', [
            'sale_id' => $sale->id,
            'lens_id' => $lens->id,
            'base_price' => $lens->price,
            'adjusted_price' => $validatedData['adjusted_price'],
            'adjustment_amount' => $adjustment->adjustment_amount,
            'adjusted_by' => Auth::id(),
            'reason' => $validatedData['reason'] ?? 'No reason provided'
        ]);
        
        $adjustment->load(['lens', 'adjustedBy']);
        
        return new SaleLensPriceAdjustmentResource($adjustment);
    }

    public function show($saleId, $adjustmentId)
    {
        $sale = Sale::findOrFail($saleId);
        $adjustment = $sale->lensPriceAdjustments()
            ->with(['lens', 'adjustedBy'])
            ->findOrFail($adjustmentId);
            
        return new SaleLensPriceAdjustmentResource($adjustment);
    }

    public function destroy($saleId, $adjustmentId)
    {
        $sale = Sale::findOrFail($saleId);
        $adjustment = $sale->lensPriceAdjustments()->findOrFail($adjustmentId);
        
        Log::info('Lens price adjustment removed', [
            'sale_id' => $sale->id,
            'lens_id' => $adjustment->lens_id,
            'adjustment_amount' => $adjustment->adjustment_amount,
            'removed_by' => Auth::id()
        ]);
        
        $adjustment->delete();
        
        return response()->json(null, 204);
    }

    public function getAdjustedPrice($saleId, $lensId)
    {
        $sale = Sale::findOrFail($saleId);
        $lens = Product::findOrFail($lensId);
        
        $adjustment = $sale->lensPriceAdjustments()
            ->where('lens_id', $lensId)
            ->first();
            
        return response()->json([
            'lens_id' => $lensId,
            'base_price' => $lens->price,
            'adjusted_price' => $adjustment ? $adjustment->adjusted_price : $lens->price,
            'has_adjustment' => (bool) $adjustment,
            'adjustment' => $adjustment ? new SaleLensPriceAdjustmentResource($adjustment) : null
        ]);
    }
}
