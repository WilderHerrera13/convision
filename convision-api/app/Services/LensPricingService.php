<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\Product;
use App\Models\SaleLensPriceAdjustment;

class LensPricingService
{
    public function getEffectivePrice(Sale $sale, Product $lens): float
    {
        $adjustment = $sale->lensPriceAdjustments()
            ->where('lens_id', $lens->id)
            ->first();
            
        return $adjustment ? $adjustment->adjusted_price : $lens->price;
    }

    public function hasAdjustment(Sale $sale, Product $lens): bool
    {
        return $sale->lensPriceAdjustments()
            ->where('lens_id', $lens->id)
            ->exists();
    }

    public function getAdjustment(Sale $sale, Product $lens): ?SaleLensPriceAdjustment
    {
        return $sale->lensPriceAdjustments()
            ->where('lens_id', $lens->id)
            ->first();
    }

    public function createAdjustment(Sale $sale, Product $lens, float $adjustedPrice, ?string $reason = null, int $adjustedBy): SaleLensPriceAdjustment
    {
        if ($adjustedPrice <= $lens->price) {
            throw new \InvalidArgumentException(
                'No se permite disminuir el precio. Utilice el flujo de descuentos si desea aplicar una reducción.'
            );
        }

        $existingAdjustment = $this->getAdjustment($sale, $lens);
        if ($existingAdjustment) {
            throw new \InvalidArgumentException(
                'Ya existe un ajuste de precio para este lente en esta venta.'
            );
        }

        return SaleLensPriceAdjustment::create([
            'sale_id' => $sale->id,
            'lens_id' => $lens->id,
            'base_price' => $lens->price,
            'adjusted_price' => $adjustedPrice,
            'reason' => $reason,
            'adjusted_by' => $adjustedBy
        ]);
    }

    public function removeAdjustment(Sale $sale, Product $lens): bool
    {
        $adjustment = $this->getAdjustment($sale, $lens);
        
        if (!$adjustment) {
            return false;
        }

        return $adjustment->delete();
    }

    public function getLensesWithAdjustedPrices(Sale $sale, $lenses)
    {
        $adjustments = $sale->lensPriceAdjustments()
            ->whereIn('lens_id', $lenses->pluck('id'))
            ->get()
            ->keyBy('lens_id');

        return $lenses->map(function ($lens) use ($adjustments) {
            $adjustment = $adjustments->get($lens->id);
            
            $lens->effective_price = $adjustment ? $adjustment->adjusted_price : $lens->price;
            $lens->has_price_adjustment = (bool) $adjustment;
            $lens->price_adjustment = $adjustment;
            
            return $lens;
        });
    }

    public function calculateAdjustmentSummary(Sale $sale): array
    {
        $adjustments = $sale->lensPriceAdjustments()->with('lens')->get();
        
        $totalBasePrice = $adjustments->sum('base_price');
        $totalAdjustedPrice = $adjustments->sum('adjusted_price');
        $totalAdjustmentAmount = $adjustments->sum('adjustment_amount');
        
        return [
            'total_adjustments' => $adjustments->count(),
            'total_base_price' => $totalBasePrice,
            'total_adjusted_price' => $totalAdjustedPrice,
            'total_adjustment_amount' => $totalAdjustmentAmount,
            'adjustments' => $adjustments
        ];
    }
} 