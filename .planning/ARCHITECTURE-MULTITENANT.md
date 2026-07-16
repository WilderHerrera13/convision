# Convision — Arquitectura Multi-Tenant y Módulo Super Admin

## Resumen ejecutivo

Convision usa **aislamiento por schema de PostgreSQL** (un schema por óptica), no `clinic_id` en cada fila. La jerarquía es:

| Capa | Concepto | Almacenamiento |
|---|---|---|
| **Platform** | Registro del operador / super-admin | Schema `platform` |
| **Tenant (Óptica)** | Cliente pagador / cadena de clínicas | Schema `optica_{slug}` |
| **Branch (Sede)** | Ubicación física dentro de un tenant | Tabla `branches` dentro del schema del tenant |

En producción el tenant se resuelve por **subdominio** (`{slug}.app.opticaconvision.com`). En desarrollo local se usa la variable `DEFAULT_TENANT_SLUG` (por defecto `main`).

---

## 1. Modelo de base de datos

### 1.1 Reglas de diseño de schema (`DATABASE_GUIDE.md`)

- Dinero → `NUMERIC(12,2)`, timestamps → `TIMESTAMPTZ`, soft delete → `deleted_at`
- Enums → `VARCHAR` + `CHECK`, no tipo `ENUM` de PostgreSQL
- La guía documenta `clinic_id` como segunda columna, pero el código Go activo migró a `branch_id` (migración `000017_multi_branch_support`)
- El aislamiento real es por **separación de schemas**, no filtrado por `clinic_id`
- `AutoMigrate` solo corre con `APP_ENV=local`; producción usa migraciones SQL numeradas

### 1.2 Conexión y AutoMigrate (`db.go`)

Tres funciones críticas:

| Función | Propósito |
|---|---|
| `Migrate()` | Tablas de platform + schema público (dev local) |
| `MigrateTenantSchema(db, schemaName)` | Fija `search_path`, hace AutoMigrate de **todas las tablas de negocio del tenant** |
| `MigrateAllTenantSchemas()` | Itera `platform.opticas` y migra cada tenant al arrancar |
| `NewSchemaConnection()` | Conexión dedicada con `search_path` fijo — usada por bulk import |

Pool: `MaxOpenConns(100)`, `MaxIdleConns(10)`, `ConnMaxLifetime(1h)`.

### 1.3 Migraciones de Platform (43 pares numerados)

Ubicación: `convision-api-golang/db/migrations/platform/`

#### `000001_create_accounts.up.sql` — Concepto inicial (parcialmente superado)

```sql
CREATE SCHEMA IF NOT EXISTS platform;
CREATE TABLE IF NOT EXISTS platform.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'basic',
    is_active BOOLEAN NOT NULL DEFAULT true,
    ...
);
```

#### `000021_platform_schema.up.sql` — Tablas de platform activas

```sql
CREATE TABLE IF NOT EXISTS platform.opticas (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(60) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    plan VARCHAR(30) NOT NULL DEFAULT 'standard'
         CHECK (plan IN ('standard', 'premium', 'enterprise')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    schema_name VARCHAR(70) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS platform.super_admins (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    ...
);

CREATE TABLE IF NOT EXISTS platform.optica_features (
    id SERIAL PRIMARY KEY,
    optica_id INTEGER NOT NULL REFERENCES platform.opticas(id) ON DELETE CASCADE,
    feature_key VARCHAR(80) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    UNIQUE (optica_id, feature_key)
);
```

#### `000022_data_migration_main_tenant.up.sql` — Bootstrap del primer tenant

- Mueve todas las tablas de `public` → schema `optica_main`
- Inserta fila en `platform.opticas`: slug `main`, schema `optica_main`
- Semilla de feature flags por defecto (citas, ventas, inventario, etc.)
- Semilla de super admin: `superadmin@convision.com`

#### `000017_multi_branch_support.up.sql` — Sedes reemplazan clínicas

- Crea tablas `branches` y `user_branches`
- Siembra la sede id=1 `"Principal"`
- Renombra `clinic_id` → `branch_id` en tablas de inventario y clínicas
- Agrega `branch_id` a citas, ventas, cierres de caja, reportes diarios

#### Stack RBAC (`000030`–`000035`)

- Tablas: `roles`, `permissions`, `role_permissions`, `user_roles`
- Siembra 4 roles de sistema: Administrador, Especialista, Recepcionista, Laboratorio
- Mapea permisos por rol

#### `000036_create_optica_allowed_permissions.up.sql`

```sql
CREATE TABLE platform.optica_allowed_permissions (
    optica_id INTEGER NOT NULL REFERENCES platform.opticas(id),
    permission_key VARCHAR(100) NOT NULL,
    PRIMARY KEY (optica_id, permission_key)
);
-- Conjunto vacío = sin restricción (todos los permisos pasan)
```

#### `000023_revoked_tokens_to_platform.up.sql`

Mueve `revoked_tokens` al schema `platform` — la revocación de JWT es global, no por tenant.

### 1.4 Migraciones de Tenant (21 pares numerados)

Ubicación: `convision-api-golang/db/migrations/tenant/`

| # | Archivo | Crea |
|---|---|---|
| 000001 | `create_lookups` | identification_types, affiliation_types, payment_methods, product_categories, brands |
| 000002 | `create_locations` | countries → departments → cities → districts |
| 000003 | `create_users` | `users` (role enum: admin/specialist/receptionist/laboratory) |
| 000004 | `create_clinics` | `clinics` (legacy — reemplazado por `branches` en migración de platform) |
| 000005 | `create_patients` | `patients` |
| 000006 | `create_appointments` | citas |
| 000007 | `create_clinical` | historia clínica |
| 000008 | `create_prescriptions` | prescripciones |
| 000009 | `create_suppliers` | proveedores |
| 000010 | `create_catalog` | catálogo de lentes y productos |
| 000011 | `create_sales` | ventas, cotizaciones, órdenes |
| 000012 | `create_cash` | cierres de caja |
| 000013 | `create_finance` | compras, gastos, nómina |
| 000014 | `create_inventory` | bodegas, inventario |
| 000015–000021 | varios | reportes diarios, órdenes de lab, facturación, NC/ND |

### 1.5 Entidades de dominio (`internal/domain/` — 33 archivos)

#### Scoped a Platform (TableName → `platform.*`)

| Struct | Tabla | Campos clave |
|---|---|---|
| `Optica` | `platform.opticas` | `Slug`, `SchemaName` (`optica_{slug}`), `Plan`, `IsActive`, soft delete |
| `SuperAdmin` | `platform.super_admins` | `Email`, `PasswordHash`, `IsActive` |
| `OpticaFeature` | `platform.optica_features` | `OpticaID`, `FeatureKey`, `IsEnabled` |
| `OpticaAllowedPermission` | `platform.optica_allowed_permissions` | Techo de permisos por óptica |
| `RevokedToken` | `platform.revoked_tokens` | `JTI` PK |

```go
type Optica struct {
    ID         uint       `json:"id"`
    Slug       string     `json:"slug"        gorm:"uniqueIndex;not null;type:varchar(60)"`
    Name       string     `json:"name"`
    Plan       string     `json:"plan"        gorm:"default:standard"`
    IsActive   bool       `json:"is_active"`
    SchemaName string     `json:"schema_name" gorm:"uniqueIndex;not null"`
    DeletedAt  *time.Time `json:"deleted_at"`
}
func (Optica) TableName() string { return "platform.opticas" }
```

Slugs reservados: `admin`, `superadmin`, `platform`, `api`, `www`, `app`, `health`, `static`.

#### Scoped a Tenant (viven en `optica_{slug}`)

| Categoría | Entidades |
|---|---|
| **Usuarios y RBAC** | `User`, `RoleModel`, `Permission`, `UserRole`, `RolePermission` |
| **Sedes** | `Branch`, `UserBranch` |
| **Pacientes** | `Patient` — sin `branch_id`; alcance tenant completo |
| **Clínico** | `Appointment` (`branch_id`), `ClinicalRecord`, `Anamnesis`, `VisualExam`, `Diagnosis`, `ClinicalPrescription`, `ClinicalHistory`, `ClinicalEvolution` |
| **Catálogo** | `Lens`, `Product`, `Brand`, `LensType`, `Material`, etc. |
| **Inventario** | `Warehouse`, `InventoryItem`, `StockMovement`, etc. — todos con `branch_id` |
| **Comercio** | `Sale`, `Quote`, `Order`, `Promotion`, `DiscountRequest` |
| **Operaciones** | `LaboratoryOrder`, `CashRegisterClose`, `DailyActivityReport`, `Purchase`, `Expense`, `Payroll` |
| **Lookups** | `Country`, `Department`, `City`, `District`, etc. |

```go
type Branch struct {
    ID                 uint   `json:"id"`
    Name               string `json:"name"`
    Address            string `json:"address"`
    City               string `json:"city"`
    Phone              string `json:"phone"`
    Email              string `json:"email"`
    IsActive           bool   `json:"is_active"`
    DefaultWarehouseID *uint  `json:"default_warehouse_id"`
}
```

#### Roles de usuario

```go
const (
    RoleSuperAdmin   Role = "super_admin"
    RoleAdmin        Role = "admin"
    RoleSpecialist   Role = "specialist"
    RoleReceptionist Role = "receptionist"
    RoleLaboratory   Role = "laboratory"
)
```

---

## 2. Módulo Super Admin — Agregar nuevas ópticas

### 2.1 Visión de negocio

El Super Admin es el **operador de la plataforma Convision**. Desde su panel puede:

- Registrar una nueva óptica (cliente pagador)
- Asignarle un plan (`standard`, `premium`, `enterprise`)
- Activar o desactivar módulos funcionales por óptica (feature flags)
- Configurar el techo de permisos RBAC que esa óptica puede usar
- Gestionar los administradores internos de cada óptica

Cada óptica queda completamente aislada de las demás a nivel de schema PostgreSQL. No hay forma de que los datos de una óptica "contaminen" los de otra.

### 2.2 Flujo de aprovisionamiento

```
Super Admin UI
      │
      ▼
POST /api/v1/super-admin/opticas
      │
      ├─ 1. INSERT platform.opticas (slug, schema_name, plan)
      │
      ├─ 2. CREATE SCHEMA optica_{slug}  (DDL — auto-commit)
      │
      ├─ 3. MigrateTenantSchema → AutoMigrate todas las tablas de negocio
      │
      ├─ 4. Transaction con SET LOCAL search_path = optica_{slug}
      │        ├─ INSERT users (admin inicial con contraseña)
      │        └─ INSERT branches (name = "Sede Principal")
      │
      └─ 5. featureRepo.SeedDefaults(optica.ID) → feature flags por defecto
```

### 2.3 Rutas de API (solo super-admin)

```
POST   /api/v1/platform/auth/login           ← login del operador de plataforma
GET    /api/v1/super-admin/opticas           ← lista de todas las ópticas
POST   /api/v1/super-admin/opticas           ← crear nueva óptica
GET    /api/v1/super-admin/opticas/:id       ← detalle de una óptica
PATCH  /api/v1/super-admin/opticas/:id       ← actualizar óptica
GET    /api/v1/super-admin/opticas/:id/features
PUT    /api/v1/super-admin/opticas/:id/features/:key
GET    /api/v1/super-admin/opticas/:id/admins
POST   /api/v1/super-admin/opticas/:id/admins
DELETE /api/v1/super-admin/opticas/:id/admins/:userId
GET    /api/v1/super-admin/permissions
GET    /api/v1/super-admin/opticas/:id/permissions
PUT    /api/v1/super-admin/opticas/:id/permissions
GET    /api/v1/super-admin/feature-keys
```

Todas las rutas están protegidas con `jwtauth.RequirePermission("super_admin:access")`.

### 2.4 Input del servicio de creación

```go
type CreateOpticaInput struct {
    Name  string                 // nombre comercial de la óptica
    Slug  string                 // identificador único → optica_{slug}
    Plan  string                 // standard | premium | enterprise
    Admin CreateTenantAdminInput // credenciales del primer administrador
}
```

### 2.5 Gestión de admins de tenant (`handler_optica_admins.go`)

El super admin puede hacer CRUD de usuarios administradores dentro de cualquier óptica cambiando temporalmente el `search_path` a ese schema:

- Listar admins de una óptica
- Crear un nuevo admin en una óptica
- Eliminar un admin de una óptica

Usa validación por regex: `^optica_[a-z0-9_]{1,60}$` sobre nombres de schema.

### 2.6 Wiring en `cmd/api/main.go`

```go
opticaService := opticasvc.NewService(
    opticaRepo, opticaFeatureRepo, featureCache, opticaCache,
    func(schemaName string) error {
        return postgresplatform.MigrateTenantSchema(db, schemaName)
    },
    db, logger,
)
```

Al arrancar: `Migrate()` → `MigrateAllTenantSchemas()` → seed de usuarios dev.

### 2.7 Frontend Super Admin

| Ruta | Componente | Propósito |
|---|---|---|
| `/platform/login` | `PlatformLoginPage.tsx` | Auth del operador vía `/api/v1/platform/auth/login` |
| `/super-admin/opticas` | `OpticasPage.tsx` | EntityTable con listado de todas las ópticas |
| `/super-admin/opticas/nueva` | `OpticaCreatePage.tsx` | Formulario: nombre, slug, plan, credenciales admin |
| `/super-admin/opticas/:id` | `OpticaDetailPage.tsx` | Tabs: info, módulos (feature flags), admins, permisos |
| `/super-admin/feature-flags` | `FeatureFlagsPage.tsx` | Gestión global de feature flags |

Servicio frontend: `convision-front/src/services/superAdmin.ts`  
Layout: `SuperAdminLayout.tsx` (sidebar: Dashboard, Ópticas, Feature Flags)

---

## 3. Platform vs Tenant — Separación de schemas

### 3.1 Qué vive en cada lado

| Schema `platform` | Schema `optica_{slug}` |
|---|---|
| `opticas` — registro de tenants | `users`, `roles`, `permissions` |
| `super_admins` | `branches`, `user_branches` |
| `optica_features` — toggles de sidebar | `patients`, `appointments`, historia clínica |
| `optica_allowed_permissions` — techo de RBAC | `sales`, `quotes`, `purchases`, `inventory` |
| `revoked_tokens` — blacklist JWT global | Todas las tablas operacionales y de negocio |

### 3.2 Pipeline de una request HTTP

```
HTTP Request
     │
     ▼
TenantFromSubdomain middleware
     ├─ local: DEFAULT_TENANT_SLUG → schema_name = optica_main
     ├─ prod: slug.app.opticaconvision.com → opticacache lookup
     └─ slug = "admin" → schema_name = platform
     │
     ▼
Authenticate JWT (valida token + verifica revocación en platform)
     │
     ▼
TenantSchema middleware
     │  BEGIN TRANSACTION
     │  SET LOCAL search_path = optica_{slug}
     │
     ▼
Handler (usa tenantDBFromCtx — todas las queries van al schema del tenant)
     │
     ├─ ¿scope de sede?
     │    └─ BranchContext middleware (valida X-Branch-ID, verifica user_branches)
     │
     ▼
COMMIT
```

**Archivos clave de middleware:**

| Archivo | Propósito |
|---|---|
| `tenant_subdomain.go` | Resuelve slug → `schema_name`, `optica_id` |
| `tenant_schema.go` | Envuelve la request en transacción con `SET LOCAL search_path` |
| `branch.go` | Valida `X-Branch-ID`, verifica acceso en `user_branches` (admins bypasean) |

**Cross-check JWT:** `TenantSchema` verifica que `claims.SchemaName` coincida con el schema resuelto por subdominio.

### 3.3 Mapeo subdominio → tenant

Producción: `{slug}.app.opticaconvision.com` → `platform.opticas.slug` → `schema_name`

| slug | schema | URL |
|---|---|---|
| `main` | `optica_main` | `main.app.opticaconvision.com` |
| `visionplus` | `optica_visionplus` | `visionplus.app.opticaconvision.com` |

### 3.4 Matices importantes de aislamiento

1. **Aislamiento primario = schema de PostgreSQL**, no `clinic_id` por fila
2. **Pacientes son tenant-wide** — el struct `Patient` en Go no tiene `branch_id`
3. **Datos operacionales son branch-scoped** — citas, ventas, cierres de caja, inventario, reportes diarios llevan `branch_id`
4. **La guía `DATABASE_GUIDE.md` menciona `clinic_id`** — parcialmente desactualizada; la implementación usa `branch_id` dentro de cada tenant
5. **Feature flags** (platform) controlan visibilidad del sidebar; **optica_allowed_permissions** (platform) puede limitar el RBAC por tenant
6. **`platform.accounts`** (UUID, migración `000001`) coexiste con **`platform.opticas`** (SERIAL, migración `000021`) — `opticas` es el modelo activo

---

## 4. Referencia de archivos clave

| Área | Ruta |
|---|---|
| Migraciones platform | `convision-api-golang/db/migrations/platform/` |
| Migraciones tenant | `convision-api-golang/db/migrations/tenant/` |
| Guía de base de datos | `convision-api-golang/DATABASE_GUIDE.md` |
| AutoMigrate + helpers tenant | `convision-api-golang/internal/platform/storage/postgres/db.go` |
| Entidades de dominio | `convision-api-golang/internal/domain/` |
| Servicio de aprovisionamiento | `convision-api-golang/internal/optica/service.go` |
| Rutas | `convision-api-golang/internal/transport/http/v1/routes.go` |
| Middlewares de tenant | `convision-api-golang/internal/transport/http/v1/middleware/` |
| Wiring de la aplicación | `convision-api-golang/cmd/api/main.go` |
| UI Super Admin | `convision-front/src/pages/super-admin/` |
| Login de platform | `convision-front/src/pages/platform/PlatformLoginPage.tsx` |
| Gestión de sedes (tenant admin) | `convision-front/src/pages/admin/branches/` |
