# External Integrations
_Generated: 2026-04-13_

## Summary
Convision has minimal external service dependencies. The primary integration is between the React SPA and the internal Laravel REST API. Authentication is self-hosted JWT. PDF generation and Excel import/export are handled server-side by PHP libraries. Third-party cloud services (AWS S3, Pusher) are configured as env vars but appear inactive in current code.

---

## Internal Service Communication

**Frontend → Backend:**
- All API calls go to `/api/v1/` endpoints via Axios
- Two Axios instances exist:
  - `convision-front/src/services/api.ts` — primary instance, stores token in `localStorage`, redirects on 401
  - `convision-front/src/lib/axios.ts` — secondary instance, adds auto token-refresh logic on 401 via `/api/v1/auth/refresh`
- Dev proxy: Vite proxies `/api` → `http://127.0.0.1:8000` (config: `convision-front/vite.config.ts`)
- Production: `VITE_API_URL` env var must point to backend host

**Base URL resolution priority (frontend):**
1. `import.meta.env.VITE_API_URL` (explicit production URL)
2. Empty string `''` in dev mode (relative URLs, Vite proxy handles routing)
3. Fallback `http://localhost:8000` or `http://localhost:8005` (inconsistent — see Gaps)

---

## Authentication

**Provider:** Self-hosted JWT (no third-party auth)

**Backend:**
- Package: `tymon/jwt-auth` `^1.0`
- Config: `convision-api/config/jwt.php`
- Secret: `JWT_SECRET` env var (set via `php artisan jwt:secret`)
- Middleware: `jwt.auth` guards all routes except `login` and `refresh`
- Login endpoint: `POST /api/v1/auth/login`
- Refresh endpoint: `POST /api/v1/auth/refresh`
- Roles: `admin`, `specialist`, `receptionist` — stored on `User` model

**Frontend:**
- Token stored in `localStorage` as `access_token`
- Token type stored as `token_type`
- User object stored as `auth_user` (JSON serialized)
- Auth state managed in `convision-front/src/contexts/AuthContext.tsx`
- Bearer token injected via Axios request interceptor in both axios instances

**Also installed but inactive:**
- `laravel/passport` `^10.0` — OAuth2 server; no controller usage detected
- `laravel/sanctum` `^2.11` — SPA authentication; present in CORS config (`sanctum/csrf-cookie`) but JWT is the active auth strategy

---

## PDF Generation

**Provider:** Self-hosted (server-side rendering)

**Package:** `barryvdh/laravel-dompdf` `^2.2`

**Usage locations:**
- `convision-api/app/Http/Controllers/Api/V1/SalePDFController.php` — sale receipts
- `convision-api/app/Http/Controllers/Api/V1/OrderPDFController.php` — optical orders
- `convision-api/app/Http/Controllers/Api/V1/LaboratoryOrderPDFController.php` — lab order PDFs
- `convision-api/app/Http/Controllers/Api/V1/QuotesController.php` — quote PDFs
- `convision-api/app/Http/Controllers/Api/V1/GuestPDFController.php` — unauthenticated PDF download via token

**Guest PDF access pattern:**
- Authenticated user requests a `pdf_token` from the API
- Frontend constructs a public URL using the token: `/api/v1/guest/{entity}/{id}/pdf?token={token}`
- Used for sharing PDFs without requiring login
- Frontend PDF URL helpers: `convision-front/src/services/orderService.ts`, `convision-front/src/services/clinicalHistoryService.ts`, `convision-front/src/services/laboratoryOrderService.ts`

---

## Excel / Spreadsheet Import

**Provider:** Self-hosted

**Packages:**
- `maatwebsite/excel` `3.1.48`
- `phpoffice/phpspreadsheet` `^1.25`

**Usage locations:**
- `convision-api/app/Imports/LensesImport.php` — import lenses from spreadsheet
- `convision-api/app/Http/Controllers/Api/V1/ProductImportController.php` — import products from XLSX/CSV
  - Accepts: `xlsx`, `xls`, `csv`, `txt` (max 10MB)
  - Modes: `skip`, `update`, `error`

---

## API Documentation

**Provider:** Self-hosted OpenAPI/Swagger

**Package:** `darkaonline/l5-swagger` `^8.6`

**Access:** `GET /api/documentation`

**Config:** `convision-api/config/l5-swagger.php`

**Annotations:** PHPDoc `@OA\` annotations throughout controllers in `convision-api/app/Http/Controllers/Api/V1/`

---

## Database

**Provider:** MySQL 8.0 (Docker in dev, bare install in production)

**Connection config:**
- `DB_CONNECTION=mysql`
- `DB_HOST`, `DB_PORT` (default `3306`), `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
- Docker service: `convision-api/docker-compose.yml`
- PHPMyAdmin admin UI on port `8080` (dev only)

**ORM:** Laravel Eloquent (built into framework)

**Migrations:** `convision-api/database/migrations/`

**Seeders:** `convision-api/database/seeders/DatabaseSeeder.php`

---

## File Storage

**Active driver:** `local` (filesystem, `FILESYSTEM_DRIVER=local`)

**Storage path:** `storage/app/` (Laravel default)

**Public storage:** `storage/app/public/` — accessible via `/storage/` URL symlink

**Patient profile images** are stored and referenced via `VITE_API_URL/storage/{path}` in `convision-front/src/pages/admin/Patients.tsx`

**AWS S3 configured but not active:**
- Env vars present: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`, `AWS_BUCKET`
- S3 disk defined in `convision-api/config/filesystems.php`
- No controller or service references S3 disk by name in application code

---

## Email

**Config:** `convision-api/config/mail.php`

**Driver:** `MAIL_MAILER=smtp` (default)

**Dev mail server:** `mailhog` on port `1025` (configured in `.env.example`)

**Status:** Mail infrastructure is configured but no Mailable classes or notification dispatches detected in current application code — email is not actively used.

---

## Real-Time / WebSockets

**Pusher:** Credentials present in `.env.example` (`PUSHER_APP_ID`, `PUSHER_APP_KEY`, `PUSHER_APP_SECRET`, `PUSHER_APP_CLUSTER`) but no broadcasting events or Echo client detected in application code.

**Broadcast driver:** `log` (`.env.example` default) — effectively disabled.

---

## Caching

**Driver:** `file` (`.env.example` default `CACHE_DRIVER=file`)

**Redis:** Configured in `.env.example` (`REDIS_HOST`, `REDIS_PASSWORD`, `REDIS_PORT=6379`) but cache driver is `file` — Redis is not actively used for caching.

---

## Queue / Background Jobs

**Driver:** `sync` (`QUEUE_CONNECTION=sync` in `.env.example`)

No queue workers, jobs, or dispatched jobs detected in application code. All processing is synchronous within the HTTP request cycle.

---

## CORS

**Package:** `fruitcake/laravel-cors` `^2.0`

**Config:** `convision-api/config/cors.php`

**Current settings:**
- `allowed_origins: ['*']` — all origins allowed
- `allowed_methods: ['*']` — all methods allowed
- `allowed_headers: ['*']` — all headers allowed
- `supports_credentials: true`
- Applies to: `api/*` and `sanctum/csrf-cookie` paths

---

## Gaps / Unknowns
- `VITE_API_URL` fallback is inconsistent: `src/config.ts` defaults to `http://localhost:8005`, `src/services/api.ts` defaults to `http://localhost:8000`, and `src/lib/axios.ts` defaults to empty string — production URL configuration needs clarification
- AWS S3 vars are present and the S3 disk is defined but no code references the `s3` disk — S3 integration may be planned but not implemented
- Pusher is configured in env but no Laravel Echo or WebSocket client was found in frontend code
- No error tracking service (Sentry, Bugsnag, etc.) detected in either sub-project
- No CDN or asset delivery service detected
- No payment gateway integration detected (optics clinic, so likely handles payments internally)
- Email sending may be expected but no Mailable classes exist — needs confirmation with team
