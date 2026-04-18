<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\AdminNotification\IndexAdminNotificationRequest;
use App\Http\Resources\V1\AdminNotification\AdminNotificationResource;
use App\Models\AdminUserNotification;
use App\Services\AdminNotificationService;
use Illuminate\Http\Request;

class AdminNotificationController extends Controller
{
    public function __construct(
        private readonly AdminNotificationService $adminNotificationService,
    ) {
    }

    public function index(IndexAdminNotificationRequest $request)
    {
        $user = $request->user();
        $paginator = $this->adminNotificationService->paginateForUser($user, $request);
        $counts = $this->adminNotificationService->countsForUser($user);

        return AdminNotificationResource::collection($paginator)->additional([
            'counts' => $counts,
        ]);
    }

    public function summary(Request $request)
    {
        $user = $request->user();
        $counts = $this->adminNotificationService->countsForUser($user);

        return response()->json([
            'data' => [
                'unread' => $counts['unread'],
                'archived' => $counts['archived'],
                'inbox' => $counts['all'],
            ],
        ]);
    }

    public function markAllRead(Request $request)
    {
        $user = $request->user();
        $updated = $this->adminNotificationService->markAllRead($user);

        return response()->json([
            'data' => [
                'updated' => $updated,
            ],
        ]);
    }

    public function markRead(Request $request, AdminUserNotification $notification)
    {
        $user = $request->user();
        $fresh = $this->adminNotificationService->markRead($notification, $user);

        return new AdminNotificationResource($fresh);
    }

    public function markUnread(Request $request, AdminUserNotification $notification)
    {
        $user = $request->user();
        $fresh = $this->adminNotificationService->markUnread($notification, $user);

        return new AdminNotificationResource($fresh);
    }

    public function archive(Request $request, AdminUserNotification $notification)
    {
        $user = $request->user();
        $fresh = $this->adminNotificationService->archive($notification, $user);

        return new AdminNotificationResource($fresh);
    }

    public function unarchive(Request $request, AdminUserNotification $notification)
    {
        $user = $request->user();
        $fresh = $this->adminNotificationService->unarchive($notification, $user);

        return new AdminNotificationResource($fresh);
    }

    public function destroy(Request $request, AdminUserNotification $notification)
    {
        $user = $request->user();
        $this->adminNotificationService->delete($notification, $user);

        return response()->json(null, 204);
    }
}
