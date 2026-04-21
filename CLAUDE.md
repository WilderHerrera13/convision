# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Golden Rule — English-Only Code

**Every code identifier, file name, directory name, URL path segment, and comment must be in English. No exceptions.**

| Must be English | Must stay Spanish |
|---|---|
| Function / variable / struct / type names | UI text visible to the user (labels, toasts, placeholders) |
| File names and directory names | API validation messages returned in HTTP response bodies |
| URL route paths (`/scheduled-appointments`) | Excel column headers used in bulk-import templates |
| API endpoint path segments | |
| Code comments | |
| React component and hook names | |
| Go package names | |

**JSON tags** that are part of an active API contract keep their existing Spanish tag value — only the Go field name must be English:
```go
// Correct
InquiriesMale int `json:"preguntas_hombre"`
// Wrong
PreguntasHombre int `json:"preguntas_hombre"`
```

Before writing any code: if you are about to name something in Spanish, stop and use the English equivalent.

---

## Skills disponibles

Este proyecto expone 69 skills de la suite **GSD (Get Shit Done)** en `.claude/skills/` (enlazadas desde `.codex/skills/`). Úsalas cuando una tarea encaje con su descripción — por ejemplo `gsd-do` para enrutar intenciones libres, `gsd-plan-phase` para planificar, `gsd-execute-phase` para ejecutar, `gsd-qa-explore` para QA exploratoria, `gsd-debug` para depuración estructurada, etc. Lee el `SKILL.md` correspondiente antes de invocarla.

## Project Overview

Convision es un monorepo para un sistema de gestión de clínicas de óptica con dos sub-proyectos:
- **`convision-api-golang/`** — API REST en Go 1.22 (Gin + GORM + PostgreSQL 15+) — **backend activo**
- **`convision-front/`** — SPA en React 18 + TypeScript (frontend)

> El backend legado `convision-api/` (Laravel 8) está en proceso de retiro. **Todo nuevo código de backend debe escribirse en `convision-api-golang/`**.

---

## Lectura obligatoria antes de tocar código

Antes de escribir cualquier línea en `convision-api-golang/` (entidades, servicios, handlers, migraciones, queries, índices, etc.) **debes leer y aplicar**:

1. **`convision-api-golang/DEVELOPMENT_GUIDE.md`** — arquitectura en 3 capas (domain / service / transport), reglas de dependencia, plantillas de entity/service/repository/handler, RBAC, manejo de errores, logging con Zap, paginación, testing y checklist de nueva feature.
2. **`convision-api-golang/DATABASE_GUIDE.md`** — diseño de tablas en PostgreSQL, tipos correctos (`NUMERIC` para dinero, `TIMESTAMPTZ`, `JSONB`), aislamiento multi-clínica con `clinic_id`, índices (B-tree, GIN, BRIN, parciales), migraciones, RLS, anti-patrones y checklist de cambio de esquema.

Estas dos guías son **canónicas**. Si entran en conflicto con cualquier otra fuente (incluido este archivo), las guías ganan.

---

## Comandos

### Backend Go (`convision-api-golang/`)

```bash
# Desde convision-api-golang/
make tidy           # go mod tidy — usar SIEMPRE tras agregar dependencias con `go get`
make build          # Compila bin/convision-api
make run            # build + run
make dev            # live-reload con air
make test           # tests + cobertura
make lint           # golangci-lint
make docker-up      # Levanta PostgreSQL + API con docker compose
make docker-down

# Migraciones SQL versionadas (golang-migrate)
# Ubicación: convision-api-golang/db/migrations/platform/
migrate -database "$DATABASE_URL" -path db/migrations/platform up
migrate -database "$DATABASE_URL" -path db/migrations/platform version
```

> **AutoMigrate solo corre con `APP_ENV=local`.** En staging/producción usar exclusivamente migraciones SQL numeradas (ver `DATABASE_GUIDE.md` §10).

### Frontend (`convision-front/`)

```bash
npm install
npm run dev         # puerto 4300 (ver vite.config.ts)
npm run build
npm run lint
```

### Test Credentials

```bash
# JWT del backend Go
curl --location 'http://localhost:8001/api/v1/auth/login' \
  --header 'Content-Type: application/json' \
  --data-raw '{"email":"admin@convision.com","password":"password"}'
```

Roles: `admin@convision.com`, `specialist@convision.com`, `receptionist@convision.com`, `laboratory@convision.com` — todos con password `password`.

---

## Arquitectura

### Backend Go (`convision-api-golang/`)

**Stack:** Go 1.22 · Gin v1.10 · GORM v1.25 + driver `gorm.io/driver/postgres` · PostgreSQL 15+ · JWT v5 · Uber Zap · validator/v10.

**Módulo Go:** `github.com/convision/api`

**Capas (la dependencia siempre apunta hacia adentro, hacia `domain`):**

```
transport/http/v1   →   internal/<feature>/service.go   →   internal/domain
                                                                 ▲
                                                                 │ implementa
                                                  internal/platform/storage/postgres
```

| Capa | Ubicación | Responsabilidad |
|---|---|---|
| Domain | `internal/domain/<entity>.go` | Structs GORM, interfaces `Repository`, errores de dominio. Sin imports externos. |
| Service | `internal/<feature>/service.go` | Casos de uso, DTOs (`CreateInput`, `ListOutput`, …), validación de negocio, logging. |
| Transport | `internal/transport/http/v1/` | Handlers Gin delgados (parse → service → respond), montaje de rutas, RBAC por endpoint. |
| Platform | `internal/platform/{storage/postgres,auth}/` | Implementaciones concretas: repositorios GORM, JWT, middlewares. |

**Reglas estrictas (resumen — el detalle está en `DEVELOPMENT_GUIDE.md`):**

- Un paquete por feature dentro de `internal/`.
- `domain` **nunca** importa `platform`. `transport` **nunca** llama a `platform`.
- Handlers ≤ ~20 líneas útiles; toda lógica de negocio vive en el servicio.
- Repositorio convierte `gorm.ErrRecordNotFound` → `*domain.ErrNotFound` antes de retornar.
- **Nunca `db.Save()`** en updates: usar `db.Model(&e).Updates(map[string]any{...})`.
- **Nunca `SELECT *`** en listas: `Select("col1, col2, ...")` siempre.
- RBAC en `routes.go` con `jwtauth.RequireRole(domain.RoleAdmin, ...)` — nunca strings literales.
- Mapeo de errores en handlers via helper `respondError(c, err)`.
- Toda ruta bajo `/api/v1/`.
- Pool de conexiones configurado en `db.go` (`SetMaxOpenConns(25)`, `SetMaxIdleConns(10)`, `SetConnMaxLifetime(5*time.Minute)`).

**Reglas obligatorias de PostgreSQL (resumen — el detalle está en `DATABASE_GUIDE.md`):**

- **Aislamiento multi-clínica:** toda tabla de negocio incluye `clinic_id INTEGER NOT NULL REFERENCES clinics(id)` como segunda columna; toda query empieza con `WHERE clinic_id = $1`.
- **Tipos correctos:** `NUMERIC(12,2)` para dinero (jamás `FLOAT`), `TIMESTAMPTZ` para fechas (jamás `TIMESTAMP`), `BOOLEAN` (jamás `INTEGER 0/1`), `JSONB` para JSON indexable.
- **Soft delete obligatorio** para datos clínicos: `deleted_at TIMESTAMPTZ NULL`.
- **Enums con `CHECK constraint`** sobre `VARCHAR(30)`, no tipo `ENUM` de PG.
- **Trigger `set_updated_at`** para `updated_at` automático.
- **Índices parciales** `WHERE deleted_at IS NULL` en columnas de listas.
- **Migraciones idempotentes** (`IF NOT EXISTS`) y `CREATE INDEX CONCURRENTLY` para tablas en producción.
- **Nunca** indexar booleanos solos ni crear índices redundantes.
- Cliente de BD nunca conecta como `postgres` (superuser) — usar `convision_app` con privilegios mínimos.

**Checklist al agregar una entidad nueva (orden exacto):**

1. `internal/domain/<entity>.go` — struct + `Repository` interface.
2. `internal/platform/storage/postgres/<entity>_repository.go` — implementa interface, mapea `ErrRecordNotFound`.
3. Agregar a `AutoMigrate` en `internal/platform/storage/postgres/db.go` (solo afecta entornos locales).
4. Crear migración SQL en `db/migrations/platform/NNN_<descripcion>.up.sql` + `.down.sql` (para staging/prod).
5. `internal/<feature>/service.go` — DTOs + casos de uso con validación de negocio + logging.
6. `internal/transport/http/v1/handler_<feature>.go` — handlers delgados.
7. Registrar rutas + RBAC en `routes.go`.
8. Wire en `cmd/api/main.go` (orden: env → logger → db → repos → services → handler → routes → server con graceful shutdown).
9. Tests unitarios del servicio en `internal/<feature>/service_test.go` con mocks de las interfaces `Repository`.
10. `make tidy && make lint && make test && make build`.

### Frontend (React)

**Estructura:**
- `src/pages/` — páginas por rol: `admin/`, `specialist/`, `receptionist/`
- `src/components/` — componentes compartidos; `ui/` contiene shadcn-ui
- `src/services/` — todas las llamadas API vía axios (nunca llamar axios directamente desde componentes)
- `src/contexts/` — `AuthContext` para estado de autenticación
- `App.tsx` — React Router v6 con protección de rutas por rol

**Convenciones clave:**
- Todo el texto del frontend debe estar en **español**
- Todas las tablas usan **EntityTable** / **DataTable** — no construir tablas custom
- Todos los date pickers usan el componente **DatePicker**
- Componentes ≤ **200 líneas** — extraer lógica a hooks o sub-componentes
- Tailwind CSS para todo el styling (sin estilos inline ni CSS files separados)
- Forms con React Hook Form + Zod
- API calls en `src/services/`, consumidas vía React Query hooks

**Flujo de descuentos para lentes:**
```ts
// 1. Verificar lens.has_discounts === true
// 2. Obtener mejor descuento
const bestDiscount = await discountService.getBestDiscount(lensId, patientId?);
// 3. Calcular precio final
const finalPrice = discountService.calculateDiscountedPrice(originalPrice, bestDiscount.discount_percentage);
```

**Vite proxy:** En desarrollo, `/api` se proxea al backend Go en `http://localhost:8001`.

### Roles

| Rol | Acceso |
|---|---|
| Admin | Sistema completo |
| Specialist | Citas, prescripciones, historia clínica |
| Receptionist | Pacientes, ventas, cotizaciones, citas |
| Laboratory | Órdenes de laboratorio |

Constantes en `domain`: `domain.RoleAdmin`, `domain.RoleSpecialist`, `domain.RoleReceptionist`, `domain.RoleLaboratory`. Ver matriz completa en `DEVELOPMENT_GUIDE.md` §9.
