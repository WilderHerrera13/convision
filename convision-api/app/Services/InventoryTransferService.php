<?php

namespace App\Services;

use App\Models\InventoryTransfer;
use App\Models\User;

class InventoryTransferService
{
    public function createTransfer(array $data, User $user): InventoryTransfer
    {
        $data['transferred_by'] = $user->id;
        return InventoryTransfer::create($data);
    }

    public function updateTransfer(InventoryTransfer $transfer, array $data): InventoryTransfer
    {
        $transfer->update($data);
        return $transfer->fresh();
    }

    public function deleteTransfer(InventoryTransfer $transfer): bool
    {
        return $transfer->delete();
    }
} 