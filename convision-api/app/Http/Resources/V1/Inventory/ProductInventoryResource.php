<?php

namespace App\Http\Resources\V1\Inventory;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Http\Resources\V1\Product\ProductResource; // For the main product details
use App\Http\Resources\V1\WarehouseResource;
use App\Http\Resources\V1\WarehouseLocationResource;

class ProductInventoryResource extends JsonResource
{
    public function toArray($request)
    {
        $productData = (new ProductResource($this->resource))->toArray($request);

        $inventoryBreakdown = $this->whenLoaded('inventoryItems', function () {
            return $this->inventoryItems->groupBy('warehouse.name')->map(function ($itemsInWarehouse, $warehouseName) {
                return [
                    'warehouse_name' => $warehouseName,
                    'warehouse_id' => $itemsInWarehouse->first()->warehouse_id,
                    'total_quantity' => $itemsInWarehouse->sum('quantity'),
                    'locations' => $itemsInWarehouse->groupBy('warehouseLocation.name')->map(function ($itemsInLocation, $locationName) {
                        return [
                            'location_name' => $locationName,
                            'location_id' => $itemsInLocation->first()->warehouse_location_id,
                            'quantity' => (int) $itemsInLocation->sum('quantity'),
                            'status_summary' => $itemsInLocation->groupBy('status')->map(function($statusItems, $status) {
                                return $statusItems->sum('quantity');
                            })
                        ];
                    })->values() // Return as array of locations
                ];
            })->values(); // Return as array of warehouses
        });

        return array_merge($productData, [
            'inventory_summary' => $inventoryBreakdown,
        ]);
    }
} 