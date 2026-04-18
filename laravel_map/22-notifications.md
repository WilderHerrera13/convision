# 22 — Admin Notifications

## Source files
- Controller: `app/Http/Controllers/Api/V1/AdminNotificationController.php`
- Resources: `AdminNotificationResource`

---

## Middleware: `auth:api`, `role:admin`

---

## Notification kinds (types)
`info`, `warning`, `error`, `success`

---

## Endpoints

### GET /api/v1/admin/notifications
**Paginated:** Yes.
**Query params:**
- `archived=1` — return archived only
- `unread=1` — return unread only (not archived)
- `per_page`, `page`

**Response 200:** Paginated AdminNotificationResource collection

### GET /api/v1/admin/notifications/summary
Returns unread and total counts.
**Response 200:**
```json
{
  "unread": 3,
  "total": 12,
  "archived": 5
}
```

### PATCH /api/v1/admin/notifications/read-all
Mark all unread notifications as read.
**Response 200:** `{ "message": "Todas las notificaciones han sido marcadas como leídas." }`

### PATCH /api/v1/admin/notifications/{notification}/read
Mark single notification as read.
**Response 200:** AdminNotificationResource

### PATCH /api/v1/admin/notifications/{notification}/unread
Mark single notification as unread (clears `read_at`).
**Response 200:** AdminNotificationResource

### PATCH /api/v1/admin/notifications/{notification}/archive
Archive notification (sets `archived_at = now()`).
**Response 200:** AdminNotificationResource

### PATCH /api/v1/admin/notifications/{notification}/unarchive
Unarchive notification (clears `archived_at`).
**Response 200:** AdminNotificationResource

### DELETE /api/v1/admin/notifications/{notification}
**Response 204:** No content

---

## AdminNotificationResource shape
```json
{
  "id": 1,
  "title": "string",
  "body": "string",
  "kind": "info | warning | error | success",
  "action_url": "string | null",
  "read_at": "ISO8601 | null",
  "archived_at": "ISO8601 | null",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

---

## DB table: `admin_notifications`
| Column | Type |
|---|---|
| id | bigint PK |
| title | varchar(255) |
| body | text |
| kind | varchar |
| action_url | varchar nullable |
| read_at | timestamp nullable |
| archived_at | timestamp nullable |
| created_at | timestamp |
| updated_at | timestamp |
