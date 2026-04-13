# Technology Stack
_Generated: 2026-04-13_

## Summary
Convision is a monorepo combining a Laravel 8 PHP REST API backend (`convision-api/`) and a React 18 + TypeScript SPA frontend (`convision-front/`). The backend serves a versioned JSON API consumed exclusively by the frontend via Axios. No shared code exists between the two sub-projects.

---

## Languages

**Backend:**
- PHP `^7.3 | ^8.0` (runtime on dev machine: PHP 8.5.5 via Homebrew) — all API logic in `convision-api/`

**Frontend:**
- TypeScript `^5.5.3` — all SPA code in `convision-front/src/`
- JavaScript — config files only (`vite.config.ts`, `postcss.config.js`, etc.)

---

## Runtime

**Backend:**
- PHP 8.5.5 (Homebrew)
- Artisan dev server on port `8000` (`php artisan serve`)
- Composer `2.x` (lockfile present: `convision-api/composer.lock`)

**Frontend:**
- Node.js `v25.9.0`
- npm `11.12.1` (lockfile: `convision-front/package-lock.json`)
- Also has `bun.lockb` present — project may have been initialized with Bun but npm is primary

**Database:**
- MySQL `8.0` (Docker image: `mysql:8.0`, ARM64 variant)
- PHPMyAdmin on port `8080` for DB inspection
- Docker Compose file: `convision-api/docker-compose.yml`

---

## Backend Frameworks & Key Libraries

**Core Framework:**
- `laravel/framework` `^8.75` — primary MVC framework

**Authentication:**
- `tymon/jwt-auth` `^1.0` — JWT-based stateless auth (active, used throughout)
- `laravel/passport` `^10.0` — installed but NOT actively used (no controllers reference it)
- `laravel/sanctum` `^2.11` — installed but NOT actively used beyond CORS config

**HTTP / CORS:**
- `fruitcake/laravel-cors` `^2.0` — CORS middleware, configured at `convision-api/config/cors.php`
- `guzzlehttp/guzzle` `^7.0.1` — HTTP client for outbound requests

**PDF Generation:**
- `barryvdh/laravel-dompdf` `^2.2` — server-side PDF rendering; used by `SalePDFController`, `OrderPDFController`, `LaboratoryOrderPDFController`, `QuotesController`, `GuestPDFController`

**Spreadsheet / Import:**
- `maatwebsite/excel` `3.1.48` — Excel/CSV import; used by `LensesImport` and `ProductImportController`
- `phpoffice/phpspreadsheet` `^1.25` — underlying driver for maatwebsite/excel

**API Documentation:**
- `darkaonline/l5-swagger` `^8.6` — OpenAPI/Swagger docs; accessible at `/api/documentation`; annotated with `@OA\` PHPDoc in controllers

**Database:**
- `doctrine/dbal` `^3.3` — database abstraction for migrations

**Dev Dependencies (backend):**
- `phpunit/phpunit` `^9.5.10` — test runner; config at `convision-api/phpunit.xml`
- `fakerphp/faker` `^1.9.1` — test data generation in factories
- `mockery/mockery` `^1.4.4` — mocking framework
- `facade/ignition` `^2.5` — error reporting in development
- `laravel/sail` `^1.0.1` — Docker dev environment (available but not primary)
- `nunomaduro/collision` `^5.10` — CLI error formatting

---

## Frontend Frameworks & Key Libraries

**Core:**
- `react` `^18.3.1` + `react-dom` `^18.3.1` — SPA framework
- `react-router-dom` `^6.26.2` — client-side routing; configured in `convision-front/src/App.tsx`

**UI Component Libraries:**
- `shadcn/ui` (via `components.json`) — component library using Radix UI primitives; style "default", base color "slate"
- `@radix-ui/*` — full suite of Radix UI primitives (accordion, dialog, dropdown, select, tabs, toast, etc.)
- `@mui/material` `^7.1.0` + `@mui/icons-material` `^7.1.0` + `@emotion/react` + `@emotion/styled` — Material UI also present alongside shadcn
- `@headlessui/react` `^2.2.2` — additional headless components
- `lucide-react` `^0.462.0` — icon library

**State Management:**
- `@tanstack/react-query` `^5.56.2` — server state / API caching
- React Context (`convision-front/src/contexts/AuthContext.tsx`) — auth state only

**Forms:**
- `react-hook-form` `^7.53.0` — form state management
- `@hookform/resolvers` `^3.9.0` — Zod resolver bridge
- `zod` `^3.23.8` — schema validation

**Tables:**
- `@tanstack/react-table` `^8.21.3` — table primitives; wrapped in `DataTable` component at `convision-front/src/components/ui/data-table/`

**HTTP Client:**
- `axios` `^1.9.0` — all API calls; configured in `convision-front/src/services/api.ts` and `convision-front/src/lib/axios.ts`

**Date Handling:**
- `date-fns` `^3.6.0` — date utilities
- `react-day-picker` `^8.10.1` — calendar UI; wrapped in `DatePicker` component at `convision-front/src/components/ui/date-picker.tsx`

**Charts:**
- `recharts` `^2.12.7` — charting library for dashboards

**Selects:**
- `react-select` `^5.10.1` — enhanced select inputs
- Custom `SearchableSelect` component at `convision-front/src/components/ui/SearchableSelect.tsx`

**Notifications:**
- `sonner` `^1.5.0` — toast notifications

**Styling:**
- `tailwindcss` `^3.4.11` — utility-first CSS; config at `convision-front/tailwind.config.ts`
- `tailwind-merge` `^2.5.2` + `clsx` `^2.1.1` — conditional class merging via `cn()` in `convision-front/src/lib/utils.ts`
- `tailwindcss-animate` `^1.0.7` — animation utilities
- `class-variance-authority` `^0.7.1` — component variant management
- `@tailwindcss/typography` `^0.5.15` (dev) — prose styles

**Other UI:**
- `embla-carousel-react` `^8.3.0` — carousel
- `react-resizable-panels` `^2.1.3` — resizable panel layouts
- `vaul` `^0.9.3` — drawer component
- `cmdk` `^1.0.0` — command palette
- `input-otp` `^1.2.4` — OTP input
- `next-themes` `^0.3.0` — dark/light theme support

---

## Build & Tooling

**Frontend:**
- `vite` `^5.4.1` — build tool and dev server; config at `convision-front/vite.config.ts`
- `@vitejs/plugin-react-swc` `^3.5.0` — React fast refresh via SWC compiler
- `postcss` `^8.4.47` + `autoprefixer` `^10.4.20` — CSS post-processing
- `eslint` `^9.9.0` + `typescript-eslint` `^8.0.1` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` — linting; config at `convision-front/eslint.config.js`
- `lovable-tagger` `^1.1.7` (dev) — dev tooling artifact, commented out in vite config

**Backend:**
- `webpack.mix.js` present — legacy Laravel Mix file, not actively used (API-only backend)

---

## Configuration

**Backend environment keys** (from `convision-api/.env.example`):
- `APP_KEY`, `APP_ENV`, `APP_URL`
- `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
- `JWT_SECRET` (set via `php artisan jwt:secret`)
- `MAIL_MAILER`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`, `AWS_BUCKET`
- `PUSHER_APP_ID`, `PUSHER_APP_KEY`, `PUSHER_APP_SECRET`, `PUSHER_APP_CLUSTER`
- `CACHE_DRIVER` (default: `file`), `QUEUE_CONNECTION` (default: `sync`)
- `FILESYSTEM_DRIVER` (default: `local`)

**Frontend environment keys:**
- `VITE_API_URL` — backend base URL; falls back to empty string (Vite proxy) in dev or `http://localhost:8000` in production

**Path aliases:**
- Frontend: `@/` maps to `convision-front/src/` (tsconfig + Vite alias)

---

## Platform Requirements

**Development:**
- PHP 8.x + Composer
- Node.js 18+ (dev machine runs 25.9.0) + npm
- Docker + Docker Compose (for MySQL + PHPMyAdmin)
- Backend on port `8000`, Frontend on port `4300` (Vite config)

**Production:**
- PHP 7.3+ or 8.0+ web server (Apache/Nginx)
- MySQL 8.0 database
- Frontend built via `npm run build` → static assets in `convision-front/dist/`
- No containerized production configuration detected (only dev Docker Compose present)

---

## Gaps / Unknowns
- PHP version pinned in `composer.json` as `^7.3|^8.0` but runtime is PHP 8.5.5 — `^8.0` allows 8.5; no strict mismatch but composer constraint is wide
- `laravel/passport` and `laravel/sanctum` are installed but appear unused — may be vestigial from scaffolding
- `bun.lockb` coexists with `package-lock.json` — package manager used for production installs is ambiguous
- No production deployment configuration (no Dockerfile for backend, no CI/CD config detected)
- `lovable-tagger` dev dependency suggests project may have been scaffolded via Lovable.dev platform
- Queue driver is `sync` (no background job processing) — no Redis queue worker configured despite Redis vars in `.env.example`
- Pusher keys present in `.env.example` but no broadcasting usage detected in application code
