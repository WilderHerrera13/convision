<?php

namespace App\Policies;

use App\Models\CashRegisterClose;
use App\Models\User;

class CashRegisterClosePolicy
{
    public function view(User $user, CashRegisterClose $close): bool
    {
        return $user->role === 'admin' || $user->id === $close->user_id;
    }

    public function update(User $user, CashRegisterClose $close): bool
    {
        return $close->status === CashRegisterClose::STATUS_DRAFT
            && $user->id === $close->user_id;
    }
}
