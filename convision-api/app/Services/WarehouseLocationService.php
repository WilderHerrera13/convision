<?php

namespace App\Services;

use App\Models\WarehouseLocation;
use App\Models\InventoryItem;
use Illuminate\Pagination\LengthAwarePaginator;

class WarehouseLocationService
{
    public function createLocation(array $data): WarehouseLocation
    {
        return WarehouseLocation::create($data);
    }

    public function updateLocation(WarehouseLocation $location, array $data): WarehouseLocation
    {
        $location->update($data);
        return $location->fresh();
    }

    public function deleteLocation(WarehouseLocation $location): bool
    {
        return $location->delete();
    }

    public function getLocationInventoryItems(WarehouseLocation $location, int $perPage): LengthAwarePaginator
    {
        return InventoryItem::where('warehouse_location_id', $location->id)
            ->with(['lens', 'warehouse'])
            ->paginate($perPage);
    }
} 