<?php

namespace App\Services;

use App\Models\AdminUserNotification;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminNotificationService
{
    public function paginateForUser(User $user, Request $request): LengthAwarePaginator
    {
        $scope = $request->query('scope', 'all');
        $kind = $request->query('kind');

        $query = AdminUserNotification::query()
            ->where('user_id', $user->id);

        if ($scope === 'unread') {
            $query->whereNull('archived_at')->whereNull('read_at');
        } elseif ($scope === 'archived') {
            $query->whereNotNull('archived_at');
        } else {
            $query->whereNull('archived_at');
        }

        if (in_array($kind, [AdminUserNotification::KIND_SYSTEM, AdminUserNotification::KIND_OPERATIONAL, AdminUserNotification::KIND_MESSAGE], true)) {
            $query->where('kind', $kind);
        }

        $query->apiFilter($request);

        $perPage = (int) $request->get('per_page', 15);
        $perPage = min(max(1, $perPage), 100);

        return $query->orderByDesc('created_at')->paginate($perPage);
    }

    public function countsForUser(User $user): array
    {
        $base = AdminUserNotification::query()->where('user_id', $user->id);

        return [
            'all' => (clone $base)->whereNull('archived_at')->count(),
            'unread' => (clone $base)->whereNull('archived_at')->whereNull('read_at')->count(),
            'archived' => (clone $base)->whereNotNull('archived_at')->count(),
        ];
    }

    public function markRead(AdminUserNotification $notification, User $user): AdminUserNotification
    {
        $this->assertOwner($notification, $user);
        if ($notification->read_at === null) {
            $notification->read_at = now();
            $notification->save();
        }

        return $notification->fresh();
    }

    public function markUnread(AdminUserNotification $notification, User $user): AdminUserNotification
    {
        $this->assertOwner($notification, $user);
        $notification->read_at = null;
        $notification->save();

        return $notification->fresh();
    }

    public function markAllRead(User $user): int
    {
        return AdminUserNotification::query()
            ->where('user_id', $user->id)
            ->whereNull('archived_at')
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }

    public function archive(AdminUserNotification $notification, User $user): AdminUserNotification
    {
        $this->assertOwner($notification, $user);
        $notification->archived_at = now();
        $notification->save();

        return $notification->fresh();
    }

    public function unarchive(AdminUserNotification $notification, User $user): AdminUserNotification
    {
        $this->assertOwner($notification, $user);
        $notification->archived_at = null;
        $notification->save();

        return $notification->fresh();
    }

    public function delete(AdminUserNotification $notification, User $user): void
    {
        $this->assertOwner($notification, $user);
        $notification->delete();
    }

    public function broadcastToAdmins(string $title, string $body, string $kind, ?string $actionUrl = null): void
    {
        $now = now();
        $rows = User::query()
            ->where('role', User::ROLE_ADMIN)
            ->get()
            ->map(static function (User $admin) use ($title, $body, $kind, $actionUrl, $now) {
                return [
                    'user_id' => $admin->id,
                    'title' => $title,
                    'body' => $body,
                    'kind' => $kind,
                    'action_url' => $actionUrl,
                    'read_at' => null,
                    'archived_at' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            })
            ->all();

        if ($rows === []) {
            return;
        }

        DB::table('admin_user_notifications')->insert($rows);
    }

    private function assertOwner(AdminUserNotification $notification, User $user): void
    {
        if ((int) $notification->user_id !== (int) $user->id) {
            abort(404);
        }
    }
}
