# Convision Go API — Master Development Guide

> **Este documento es el manual de referencia canónico para cualquier agente o desarrollador que vaya a escribir código en `convision-api-golang/`.  
> Leer y aplicar ANTES de escribir cualquier línea.**

---

## Tabla de Contenidos

1. [Stack y Módulo](#1-stack-y-módulo)
2. [Estructura de Directorios](#2-estructura-de-directorios)
3. [Las Tres Capas — Reglas de Dependencia](#3-las-tres-capas--reglas-de-dependencia)
4. [Capa 1 — Domain](#4-capa-1--domain)
5. [Capa 2 — Servicios (Casos de Uso)](#5-capa-2--servicios-casos-de-uso)
6. [Capa 3 — Transport HTTP](#6-capa-3--transport-http)
7. [Platform (Infraestructura)](#7-platform-infraestructura)
8. [Inyección de Dependencias en main.go](#8-inyección-de-dependencias-en-maingo)
9. [Autenticación y RBAC](#9-autenticación-y-rbac)
10. [Manejo de Errores](#10-manejo-de-errores)
11. [Logging con Uber Zap](#11-logging-con-uber-zap)
12. [Validación de Input](#12-validación-de-input)
13. [Paginación y Filtros](#13-paginación-y-filtros)
14. [Optimización de Memoria](#14-optimización-de-memoria)
15. [Testing](#15-testing)
16. [Convenciones de Nomenclatura](#16-convenciones-de-nomenclatura)
17. [Comandos de Desarrollo](#17-comandos-de-desarrollo)
18. [Checklist para una Nueva Feature](#18-checklist-para-una-nueva-feature)
19. [Anti-patrones Prohibidos](#19-anti-patrones-prohibidos)

---

## 1. Stack y Módulo

| Componente | Librería | Versión mínima |
|---|---|---|
| Lenguaje | Go | 1.22 |
| Router HTTP | `github.com/gin-gonic/gin` | v1.10 |
| ORM / DB | `gorm.io/gorm` + `gorm.io/driver/postgres` | v1.25 |
| JWT | `github.com/golang-jwt/jwt/v5` | v5 |
| Logging | `go.uber.org/zap` | v1.27 |
| Validación | `github.com/go-playground/validator/v10` | v10 (bundled con Gin) |
| Env vars | `github.com/joho/godotenv` | v1.5 |
| Crypto | `golang.org/x/crypto` | v0.23 |

**Módulo Go:** `github.com/convision/api`

Agregar dependencias SOLO con `go get <pkg>` y luego `make tidy`. Nunca editar `go.mod` a mano.

---

## 2. Estructura de Directorios

```
convision-api-golang/
├── cmd/
│   └── api/
│       └── main.go              ← ÚNICO punto de entrada; solo DI y arranque
├── internal/                    ← Código privado, no importable desde fuera
│   ├── domain/                  ← CAPA 1: Entidades + Interfaces de Repositorio
│   │   ├── errors.go            ← Tipos de error de dominio (ErrNotFound, etc.)
│   │   ├── user.go
│   │   ├── patient.go
│   │   └── <entidad>.go         ← Un archivo por entidad de dominio
│   │
│   ├── <feature>/               ← CAPA 2: Caso de uso por feature
│   │   └── service.go           ← Input/Output DTOs + lógica de negocio
│   │
│   ├── platform/                ← Implementaciones técnicas (nunca lógica de negocio)
│   │   ├── storage/
│   │   │   └── postgres/
│   │   │       ├── db.go        ← Conexión GORM y AutoMigrate
│   │   │       └── <entidad>_repository.go
│   │   └── auth/
│   │       ├── jwt.go           ← Claims, firmar y parsear tokens
│   │       └── middleware.go    ← Authenticate() y RequireRole()
│   │
│   └── transport/
│       └── http/
│           ├── middleware/
│           │   └── logger.go    ← Middleware de Zap para Gin
│           └── v1/
│               ├── handler.go   ← Handlers HTTP (parse → service → respond)
│               └── routes.go    ← Montaje de rutas y RBAC por endpoint
│
├── pkg/                         ← (Opcional) Utilidades reutilizables en otros repos
├── api/                         ← Documentación OpenAPI/Swagger
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── .env
├── .env.example
├── go.mod
├── go.sum
└── Makefile
```

### Regla de oro de directorios

- **Un paquete por feature** dentro de `internal/` (ej: `internal/patient`, `internal/appointment`).
- **Nunca** colocar implementaciones de BD o JWT dentro de `internal/domain`.
- **Nunca** colocar lógica de negocio dentro de `internal/platform`.

---

## 3. Las Tres Capas — Reglas de Dependencia

```
Transport (Gin handlers)
    │  importa solo ↓
Service (casos de uso)
    │  importa solo ↓
Domain (entidades e interfaces)
    ▲
    │  implementa ↑
Platform (PostgreSQL, JWT)
```

**La dirección de dependencia es SIEMPRE hacia adentro (hacia `domain`).**

- `platform/storage/postgres` implementa interfaces de `domain` → OK  
- `domain` importa algo de `platform` → **PROHIBIDO**  
- `transport` llama directamente a `platform` → **PROHIBIDO**  
- `transport` contiene lógica de negocio → **PROHIBIDO**

---

## 4. Capa 1 — Domain

### Reglas

1. **Un archivo `.go` por entidad** en `internal/domain/`.
2. Cada archivo declara: el `struct` de la entidad + la interfaz `Repository`.
3. **Sin dependencias externas** — solo paquetes de la stdlib (`time`, `errors`, etc.).
4. Las asociaciones GORM van en el `struct` con tags `gorm:"foreignKey:..."`.
5. Los métodos del dominio son **comportamientos puros** (sin I/O, sin DB).

### Plantilla de entidad

```go
// internal/domain/<entity>.go
package domain

import "time"

// Appointment representa una cita médica en el sistema.
type Appointment struct {
    ID          uint       `json:"id"           gorm:"primaryKey;autoIncrement"`
    PatientID   uint       `json:"patient_id"   gorm:"not null;index"`
    SpecialistID uint      `json:"specialist_id" gorm:"not null;index"`
    ScheduledAt time.Time  `json:"scheduled_at" gorm:"not null"`
    Status      string     `json:"status"       gorm:"type:varchar(20);default:'scheduled'"`
    Notes       string     `json:"notes"        gorm:"type:text"`
    CreatedAt   time.Time  `json:"created_at"`
    UpdatedAt   time.Time  `json:"updated_at"`
    DeletedAt   *time.Time `json:"deleted_at,omitempty" gorm:"index"`

    // Asociaciones — siempre puntero, siempre omitempty en JSON
    Patient    *Patient `json:"patient,omitempty"    gorm:"foreignKey:PatientID"`
    Specialist *User    `json:"specialist,omitempty" gorm:"foreignKey:SpecialistID"`
}

// AppointmentRepository define el contrato de persistencia para Appointment.
type AppointmentRepository interface {
    GetByID(id uint) (*Appointment, error)
    Create(a *Appointment) error
    Update(a *Appointment) error
    Delete(id uint) error
    List(filters map[string]any, page, perPage int) ([]*Appointment, int64, error)
    ListByPatient(patientID uint, page, perPage int) ([]*Appointment, int64, error)
}
```

### Tipos de error — `internal/domain/errors.go`

Los errores de dominio ya están definidos. Úsalos; no crees tipos nuevos sin necesidad:

| Tipo | Cuándo usarlo |
|---|---|
| `*ErrNotFound` | Registro no existe en DB |
| `*ErrConflict` | Violación de unicidad |
| `*ErrUnauthorized` | Rol insuficiente a nivel de negocio |
| `*ErrValidation` | Regla de negocio violada (no binding de HTTP) |

---

## 5. Capa 2 — Servicios (Casos de Uso)

### Reglas

1. **Un paquete por feature**: `internal/<feature>/service.go`.
2. El `Service` struct solo tiene campos de tipo **interfaz** (repositorios) y `*zap.Logger`.
3. Define `CreateInput`, `UpdateInput`, `ListOutput` etc. **en el mismo paquete** del servicio.  
   Nunca exponer structs de dominio como DTOs HTTP directamente.
4. Toda validación de **reglas de negocio** vive aquí, no en el handler ni en el repositorio.
5. Loguea con `zap` los eventos significativos (creación, modificación, errores de negocio).
6. Devuelve siempre errores de dominio (`*domain.ErrNotFound`, etc.) — nunca errores crudos de GORM.

### Plantilla de servicio

```go
// internal/appointment/service.go
package appointment

import (
    "time"

    "go.uber.org/zap"

    "github.com/convision/api/internal/domain"
)

// Service maneja los casos de uso de Citas.
type Service struct {
    repo    domain.AppointmentRepository
    patient domain.PatientRepository // dependencia cruzada solo a través de interfaces
    logger  *zap.Logger
}

// NewService crea un nuevo Service de citas con sus dependencias inyectadas.
func NewService(
    repo domain.AppointmentRepository,
    patient domain.PatientRepository,
    logger *zap.Logger,
) *Service {
    return &Service{repo: repo, patient: patient, logger: logger}
}

// --- DTOs ---

// CreateInput son los datos requeridos para crear una cita.
type CreateInput struct {
    PatientID    uint      `json:"patient_id"    binding:"required"`
    SpecialistID uint      `json:"specialist_id" binding:"required"`
    ScheduledAt  time.Time `json:"scheduled_at"  binding:"required"`
    Notes        string    `json:"notes"`
}

// ListOutput es la respuesta paginada de citas.
type ListOutput struct {
    Data    []*domain.Appointment `json:"data"`
    Total   int64                 `json:"total"`
    Page    int                   `json:"page"`
    PerPage int                   `json:"per_page"`
}

// --- Casos de uso ---

// Create valida y persiste una nueva cita.
func (s *Service) Create(input CreateInput) (*domain.Appointment, error) {
    // Validación de negocio: el paciente debe existir
    if _, err := s.patient.GetByID(input.PatientID); err != nil {
        return nil, err
    }

    // Validación de negocio: no agendar en el pasado
    if input.ScheduledAt.Before(time.Now()) {
        return nil, &domain.ErrValidation{Field: "scheduled_at", Message: "must be a future date"}
    }

    a := &domain.Appointment{
        PatientID:    input.PatientID,
        SpecialistID: input.SpecialistID,
        ScheduledAt:  input.ScheduledAt,
        Notes:        input.Notes,
        Status:       "scheduled",
    }

    if err := s.repo.Create(a); err != nil {
        return nil, err
    }

    s.logger.Info("appointment created",
        zap.Uint("appointment_id", a.ID),
        zap.Uint("patient_id", a.PatientID),
    )
    return a, nil
}

// List retorna citas paginadas con los filtros dados.
func (s *Service) List(filters map[string]any, page, perPage int) (*ListOutput, error) {
    if page < 1 {
        page = 1
    }
    if perPage < 1 || perPage > 100 {
        perPage = 15
    }

    data, total, err := s.repo.List(filters, page, perPage)
    if err != nil {
        return nil, err
    }
    return &ListOutput{Data: data, Total: total, Page: page, PerPage: perPage}, nil
}
```

---

## 6. Capa 3 — Transport HTTP

### Reglas

1. **Los handlers son delgados**: parse JSON → llamar al servicio → escribir respuesta.  
   Máximo ~20 líneas útiles por handler. Si crece más, la lógica pertenece al servicio.
2. **Nunca** importar `gorm`, `sql` u otra librería de infraestructura desde el handler.
3. Usa siempre `c.ShouldBindJSON(&input)` para parsear y validar el binding.
4. Usa la función helper `respondError(c, err)` para mapear errores de dominio a HTTP.
5. Los handlers se registran en `routes.go`; el RBAC también se configura ahí.
6. **Versionado obligatorio**: todas las rutas bajo `/api/v1/`.

### Plantilla de handler

```go
// En internal/transport/http/v1/handler.go

// ListAppointments godoc
// GET /api/v1/appointments
func (h *Handler) ListAppointments(c *gin.Context) {
    page, _    := strconv.Atoi(c.DefaultQuery("page", "1"))
    perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))

    out, err := h.appointment.List(nil, page, perPage)
    if err != nil {
        respondError(c, err)
        return
    }
    c.JSON(http.StatusOK, out)
}

// CreateAppointment godoc
// POST /api/v1/appointments
func (h *Handler) CreateAppointment(c *gin.Context) {
    var input appointment.CreateInput
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
        return
    }

    a, err := h.appointment.Create(input)
    if err != nil {
        respondError(c, err)
        return
    }
    c.JSON(http.StatusCreated, a)
}
```

### Helper `respondError` — ya existe en `handler.go`

> **Implementación real** — usa `switch err.(type)`, que matchea correctamente punteros a errores de dominio. Si en algún futuro se necesita inspeccionar errores envueltos con `%w`, usar `errors.As` con variable destino tipada (ver Sección 10).

```go
// Mapea errores de dominio a códigos HTTP correctos.
func respondError(c *gin.Context, err error) {
    switch err.(type) {
    case *domain.ErrNotFound:
        c.JSON(http.StatusNotFound, gin.H{"message": err.Error()})
    case *domain.ErrConflict:
        c.JSON(http.StatusConflict, gin.H{"message": err.Error()})
    case *domain.ErrUnauthorized:
        c.JSON(http.StatusForbidden, gin.H{"message": err.Error()})
    case *domain.ErrValidation:
        c.JSON(http.StatusUnprocessableEntity, gin.H{"message": err.Error()})
    default:
        c.JSON(http.StatusInternalServerError, gin.H{"message": "internal server error"})
    }
}
```

> **Nota sobre `errors.As`:** Si los errores se envuelven con `fmt.Errorf("%w", err)`, el type switch no los detectará. En ese caso usa la forma correcta con variable destino:
> ```go
> var notFound *domain.ErrNotFound
> if errors.As(err, &notFound) { ... }  // ✅
> // errors.As(err, &domain.ErrNotFound{}) ← ❌ nunca matchea (tipo valor, no puntero)
> ```

### Plantilla de rutas

```go
// En internal/transport/http/v1/routes.go — agregar al bloque protected

appointments := protected.Group("/appointments")
{
    appointments.GET("",    h.ListAppointments)
    appointments.GET("/:id", h.GetAppointment)
    appointments.POST("",
        jwtauth.RequireRole(domain.RoleAdmin, domain.RoleReceptionist, domain.RoleSpecialist),
        h.CreateAppointment,
    )
    appointments.PUT("/:id",
        jwtauth.RequireRole(domain.RoleAdmin, domain.RoleSpecialist),
        h.UpdateAppointment,
    )
    appointments.DELETE("/:id",
        jwtauth.RequireRole(domain.RoleAdmin),
        h.DeleteAppointment,
    )
}
```

---

## 7. Platform (Infraestructura)

### Repositorios PostgreSQL — reglas

1. El `struct` del repositorio solo tiene `db *gorm.DB`.
2. Implementa **exactamente** la interfaz definida en `domain`.
3. Convierte `gorm.ErrRecordNotFound` → `*domain.ErrNotFound` antes de retornar.
4. Usa `Preload` para eager-loading de asociaciones; **nunca** cargues relaciones en el servicio.
5. Para `List`, aplica `Count` antes de `Find` para obtener el total correcto con paginación.
6. **Usa `Select()`** para proyectar solo las columnas necesarias — nunca hagas `SELECT *` en listas.
   ```go
   q.Select("id, patient_id, scheduled_at, status").Find(&items)
   ```
7. **Nunca uses `db.Save()`** para actualizar — hace `UPDATE` de todos los campos aunque no cambien.  
   Usa `db.Model(&entity).Updates(map[string]any{...})` para actualizar solo los campos del input:
   ```go
   func (r *AppointmentRepository) Update(a *domain.Appointment) error {
       return r.db.Model(a).Updates(map[string]any{
           "scheduled_at": a.ScheduledAt,
           "status":       a.Status,
           "notes":        a.Notes,
       }).Error
   }
   ```
8. **Índices compuestos** — declara índices en el struct para los filtros más frecuentes:
   ```go
   type Appointment struct {
       // ...
       PatientID   uint      `gorm:"not null;index:idx_patient_date"`
       ScheduledAt time.Time `gorm:"not null;index:idx_patient_date"`
   }
   ```
   Una query `WHERE patient_id = ? AND scheduled_at > ?` usará `idx_patient_date`; dos índices separados no.

### Plantilla de repositorio

```go
// internal/platform/storage/postgres/appointment_repository.go
package postgres

import (
    "errors"

    "gorm.io/gorm"

    "github.com/convision/api/internal/domain"
)

type AppointmentRepository struct {
    db *gorm.DB
}

func NewAppointmentRepository(db *gorm.DB) *AppointmentRepository {
    return &AppointmentRepository{db: db}
}

func (r *AppointmentRepository) GetByID(id uint) (*domain.Appointment, error) {
    var a domain.Appointment
    err := r.db.
        Preload("Patient").
        Preload("Specialist").
        First(&a, id).Error
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, &domain.ErrNotFound{Resource: "appointment"}
        }
        return nil, err
    }
    return &a, nil
}

func (r *AppointmentRepository) List(
    filters map[string]any, page, perPage int,
) ([]*domain.Appointment, int64, error) {
    var items []*domain.Appointment
    var total int64

    // allowedFilters lista blanca de columnas filtrables — NUNCA usar field directamente
    // de query params sin validar: riesgo de SQL injection en el nombre de columna.
    allowedFilters := map[string]bool{"first_name": true, "last_name": true, "status": true}

    q := r.db.Model(&domain.Appointment{})
    // Aplicar filtros de forma segura: el valor va como parámetro (?), el campo se
    // valida contra allowedFilters antes de interpolarlo en la cláusula WHERE.
    for field, value := range filters {
        if !allowedFilters[field] {
            continue // ignorar campos no permitidos
        }
        // ⚠️ LIKE con % inicial ("% value") no usa índices — escanea la tabla completa.
        // Úsalo solo en búsquedas de texto libre. Para filtros exactos o prefijo, preferir:
        //   exact:  q.Where(field+" = ?", value)
        //   prefix: q.Where(field+" LIKE ?", value.(string)+"%")  ← SÍ usa índice
        q = q.Where(field+" LIKE ?", "%"+value.(string)+"%")
    }

    if err := q.Count(&total).Error; err != nil {
        return nil, 0, err
    }

    offset := (page - 1) * perPage
    err := q.
        Preload("Patient").
        Offset(offset).
        Limit(perPage).
        Order("scheduled_at desc").
        Find(&items).Error
    if err != nil {
        return nil, 0, err
    }
    return items, total, nil
}

func (r *AppointmentRepository) Create(a *domain.Appointment) error {
    return r.db.Create(a).Error
}

func (r *AppointmentRepository) Update(a *domain.Appointment) error {
    // Updates() solo actualiza los campos del mapa — nunca hace UPDATE de toda la fila.
    return r.db.Model(a).Updates(map[string]any{
        "scheduled_at": a.ScheduledAt,
        "status":       a.Status,
        "notes":        a.Notes,
    }).Error
}

func (r *AppointmentRepository) Delete(id uint) error {
    return r.db.Delete(&domain.Appointment{}, id).Error
}
```

### AutoMigrate — `internal/platform/storage/postgres/db.go`

Agrega el nuevo modelo a la lista de `AutoMigrate` en `db.go`:

```go
err = db.AutoMigrate(
    &domain.User{},
    &domain.Patient{},
    &domain.Appointment{}, // ← agregar aquí
)
```

> ⚠️ **AutoMigrate solo corre cuando `APP_ENV=local`.** Nunca en staging ni producción: puede alterar esquemas de forma irreversible. Para producción usa migraciones SQL versionadas.

---

## 8. Inyección de Dependencias en `main.go`

El orden en `main.go` es **siempre**:

```
1. Cargar env → 2. Construir logger → 3. Abrir DB → 4. AutoMigrate (solo local)
→ 5. Repositorios → 6. Servicios → 7. Handler → 8. Rutas → 9. Servidor
```

Ejemplo al agregar la feature `appointment`:

```go
// ---- Repositories ----
userRepo        := postgresplatform.NewUserRepository(db)
patientRepo     := postgresplatform.NewPatientRepository(db)
appointmentRepo := postgresplatform.NewAppointmentRepository(db)  // ← nuevo

// ---- Services ----
authService        := authsvc.NewService(userRepo, logger)
patientService     := patient.NewService(patientRepo, logger)
appointmentService := appointment.NewService(appointmentRepo, patientRepo, logger) // ← nuevo

// ---- Handler ----
handler := v1.NewHandler(authService, patientService, clinicService, appointmentService) // ← nuevo
```

**Regla**: `NewHandler` recibe servicios, nunca repositorios ni `*gorm.DB`.

---

## 9. Autenticación y RBAC

### JWT Claims — `internal/platform/auth/jwt.go`

El token JWT contiene: `user_id`, `email`, `role`. Accede a ellos con:

```go
claims, ok := jwtauth.GetClaims(c)
if !ok {
    c.AbortWithStatusJSON(401, gin.H{"message": "unauthenticated"})
    return
}
// claims.UserID, claims.Role
```

### Matriz de roles

| Recurso | admin | specialist | receptionist | laboratory |
|---|:---:|:---:|:---:|:---:|
| Pacientes (lectura) | ✓ | ✓ | ✓ | — |
| Pacientes (escritura) | ✓ | — | ✓ | — |
| Citas | ✓ | ✓ | ✓ | — |
| Historias clínicas | ✓ | ✓ | — | — |
| Ventas / Cotizaciones | ✓ | — | ✓ | — |
| Laboratorio | ✓ | ✓ | — | ✓ |
| Inventario / Catálogos | ✓ | — | — | — |
| Usuarios del sistema | ✓ | — | — | — |

Aplica RBAC **en `routes.go`** usando `jwtauth.RequireRole(...)` como middleware por ruta, no dentro del handler.

> **Constantes de rol disponibles en `domain`:**
> ```go
> domain.RoleAdmin        // "admin"
> domain.RoleSpecialist   // "specialist"
> domain.RoleReceptionist // "receptionist"
> domain.RoleLaboratory   // "laboratory"
> ```
> Nunca uses strings literales como `"admin"` en `RequireRole` — usa siempre las constantes.

---

## 10. Manejo de Errores

### Jerarquía de propagación

```
Repositorio → retorna *domain.Err*
    ↓
Servicio → puede wrappear o retornar directamente
    ↓
Handler → llama respondError(c, err) que mapea a HTTP
```

### Reglas

- **Nunca** uses `fmt.Errorf("... %w", err)` para wrappear errores de dominio si cambia la semántica.
- **Siempre** usa `errors.As(err, &target)` para inspeccionar errores envueltos, nunca comparación de string.
  ```go
  var notFound *domain.ErrNotFound
  if errors.As(err, &notFound) { ... }  // ✅ — funciona incluso con errores envueltos (%w)
  ```
- Los errores inesperados de DB (no `ErrRecordNotFound`) se propagan como-están y el handler devuelve `500`.
- **Nunca** expongas mensajes de error internos de PostgreSQL al cliente.

### Transacciones de BD

Para operaciones que modifican múltiples tablas (ej: crear venta + ajustar inventario, cerrar caja + registrar movimiento), usa transacciones GORM. El repositorio expone el método transaccional; el **servicio** decide cuándo usarlo:

```go
// En el servicio — orquesta la transacción
func (s *Service) CreateSaleWithInventory(input CreateSaleInput) (*domain.Sale, error) {
    var result *domain.Sale
    err := s.db.Transaction(func(tx *gorm.DB) error {
        // Repositorios temporales que usan el tx
        saleRepo := postgres.NewSaleRepository(tx)
        invRepo  := postgres.NewInventoryRepository(tx)

        sale, err := saleRepo.Create(&domain.Sale{...})
        if err != nil {
            return err // rollback automático
        }
        if err := invRepo.Decrement(input.ProductID, input.Qty); err != nil {
            return err // rollback automático
        }
        result = sale
        return nil // commit
    })
    return result, err
}
```

> **Regla:** si un caso de uso toca más de una tabla y ambas modificaciones deben ser atómicas, usa transacción. Sin transacción, un fallo parcial deja la BD inconsistente.

---

## 11. Logging con Uber Zap

### Niveles

| Nivel | Cuándo |
|---|---|
| `logger.Debug` | Desarrollo local; variables intermedias |
| `logger.Info` | Eventos de negocio exitosos (creación, login, cierre de caja) |
| `logger.Warn` | Situaciones recuperables (reintento, fallback) |
| `logger.Error` | Errores inesperados (DB caída, dependencia externa) |
| `logger.Fatal` | Errores de arranque — termina el proceso |

### Campos estructurados obligatorios

```go
// ✅ Correcto — campos estructurados
logger.Info("appointment created",
    zap.Uint("appointment_id", a.ID),
    zap.Uint("patient_id", a.PatientID),
    zap.String("status", a.Status),
)

// ❌ Incorrecto — string interpolado
logger.Info(fmt.Sprintf("appointment %d created for patient %d", a.ID, a.PatientID))
```

### Auditoría en salud

Para cualquier modificación de historias clínicas, prescripciones o datos sensibles, agregar:

```go
logger.Info("clinical record modified",
    zap.Uint("record_id", r.ID),
    zap.Uint("modified_by", claims.UserID),
    zap.String("action", "update"),
    zap.Time("at", time.Now()),
)
```

---

## 12. Validación de Input

### Dos niveles de validación

| Nivel | Dónde | Herramienta | Qué valida |
|---|---|---|---|
| **Binding** | Handler | `binding:"..."` tags + Gin | Tipos, formato, campos requeridos |
| **Negocio** | Servicio | Código Go + `*domain.ErrValidation` | Reglas de dominio |

### Tags de binding más usados

```go
type CreateInput struct {
    Email       string    `json:"email"        binding:"required,email"`
    Phone       string    `json:"phone"        binding:"omitempty,min=7,max=20"`
    Status      string    `json:"status"       binding:"required,oneof=active inactive"`
    Amount      float64   `json:"amount"       binding:"required,gt=0"`
    ScheduledAt time.Time `json:"scheduled_at" binding:"required"`
    PatientID   uint      `json:"patient_id"   binding:"required,min=1"`
}
```

### Regla de negocio en el servicio

```go
// Validación de negocio — NO en el handler
if input.Amount > 10_000_000 {
    return nil, &domain.ErrValidation{
        Field:   "amount",
        Message: "exceeds maximum allowed amount",
    }
}
```

---

## 13. Paginación y Filtros

### Contrato estándar de paginación

**Request:** `GET /api/v1/patients?page=2&per_page=20`

**Response:**
```json
{
  "data": [...],
  "total": 154,
  "page": 2,
  "per_page": 20
}
```

### Implementación en el handler

```go
page, _    := strconv.Atoi(c.DefaultQuery("page", "1"))
perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))
```

### Implementación en el servicio

```go
// Siempre sanitizar antes de pasar al repositorio
if page < 1 { page = 1 }
if perPage < 1 || perPage > 100 { perPage = 15 }
```

### Filtros con `map[string]any`

El servicio construye el mapa de filtros a partir de query params validados:

```go
filters := map[string]any{}
if name := c.Query("name"); name != "" {
    filters["first_name"] = name
}
```

El repositorio aplica los filtros con `LIKE` parametrizado (nunca interpolación de strings).

### Filtros reutilizables con `db.Scopes()`

Cuando la lógica de filtrado se repite en varios métodos del repositorio, extráela a funciones de scope:

```go
// Scope reutilizable — define la lógica una sola vez
func activeOnly(db *gorm.DB) *gorm.DB {
    return db.Where("status = ?", "active")
}

func byPatient(patientID uint) func(*gorm.DB) *gorm.DB {
    return func(db *gorm.DB) *gorm.DB {
        return db.Where("patient_id = ?", patientID)
    }
}

// Uso en el repositorio — se compone limpiamente
q := r.db.Model(&domain.Appointment{}).
    Scopes(activeOnly, byPatient(patientID)).
    Select("id, patient_id, scheduled_at, status")
```

Esto evita duplicar cláusulas `Where` en `List`, `ListByPatient`, `Count`, etc.

---

## 14. Optimización de Memoria

### Reglas obligatorias

1. **Usa punteros para structs grandes** que se pasen entre capas.  
   Retorna `*domain.Patient`, no `domain.Patient`.

2. **Usa slice de punteros** en listas: `[]*domain.Patient`, no `[]domain.Patient`.

3. **Eager loading selectivo** — solo carga las asociaciones que el endpoint necesita:
   ```go
   // Evita cargar todo si el endpoint no usa las asociaciones
   r.db.Preload("Patient").Find(&items) // ← solo lo necesario
   ```

4. **Evita N+1** — nunca iteres resultados y hagas queries adicionales por elemento.  
   Usa `Preload` en la query inicial.

5. **Cancela contextos** — para operaciones largas, usa `context.WithTimeout`:
   ```go
   ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
   defer cancel()
   r.db.WithContext(ctx).Find(&items)
   ```

6. **Reutiliza el pool de conexiones GORM** — nunca crees una nueva conexión `*gorm.DB` por request.  
   Pasa siempre el `db` global inyectado al repositorio.

7. **Evita `interface{}`/`any` en hot paths** — en listas masivas, usa structs tipados para evitar boxing/unboxing.

8. **Constantes para roles y estados** — usa las constantes de `domain` (`domain.RoleAdmin`, etc.),  
   nunca strings literales repetidos.

9. **Usa `FindInBatches` para datasets grandes** — si un caso de uso procesa todos los registros de una tabla (exportes, reportes, recalculos), nunca hagas `Find(&all)` sobre miles de filas:
   ```go
   var batch []*domain.Appointment
   result := r.db.Where("status = ?", "pending").
       FindInBatches(&batch, 200, func(tx *gorm.DB, batchNum int) error {
           for _, a := range batch {
               // procesar sin cargar todo en RAM
               _ = a
           }
           return nil
       })
   return result.Error
   ```

10. **Configura el pool de conexiones** — en `db.go`, después de abrir la conexión GORM, ajusta los límites del `*sql.DB` subyacente para evitar agotamiento de conexiones en producción:
    ```go
    sqlDB, err := db.DB()
    if err != nil {
        return nil, err
    }
    sqlDB.SetMaxOpenConns(25)     // máximo de conexiones abiertas simultáneas
    sqlDB.SetMaxIdleConns(10)     // conexiones mantenidas en el pool
    sqlDB.SetConnMaxLifetime(5 * time.Minute) // rota conexiones viejas
    ```
    Sin esto, GORM usa los defaults de `database/sql` (ilimitado), lo que puede agotar conexiones PostgreSQL bajo carga.

---

## 15. Testing

### Estructura

```
internal/
├── patient/
│   ├── service.go
│   └── service_test.go    ← Tests unitarios del servicio
└── platform/
    └── storage/
        └── postgres/
            └── patient_repository_test.go  ← Tests de integración (opcional)
```

### Reglas

- **80% de cobertura mínima** en la capa de servicios (`internal/<feature>/service.go`).
- Usa **mocks de la interfaz del repositorio**, nunca una BD real en tests unitarios.
- Usa `github.com/stretchr/testify` para aserciones legibles.
- Nombra los tests: `TestServiceMethodName_Scenario` (ej: `TestCreate_PatientNotFound`).

### Plantilla de test unitario

```go
// internal/appointment/service_test.go
package appointment_test

import (
    "errors"
    "testing"
    "time"

    "go.uber.org/zap/zaptest"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"

    "github.com/convision/api/internal/appointment"
    "github.com/convision/api/internal/domain"
)

// mockAppointmentRepo implementa domain.AppointmentRepository para tests.
type mockAppointmentRepo struct {
    createFn func(*domain.Appointment) error
}

func (m *mockAppointmentRepo) Create(a *domain.Appointment) error { return m.createFn(a) }
func (m *mockAppointmentRepo) GetByID(id uint) (*domain.Appointment, error) { return nil, nil }
func (m *mockAppointmentRepo) Update(a *domain.Appointment) error { return nil }
func (m *mockAppointmentRepo) Delete(id uint) error { return nil }
func (m *mockAppointmentRepo) List(f map[string]any, p, pp int) ([]*domain.Appointment, int64, error) {
    return nil, 0, nil
}
func (m *mockAppointmentRepo) ListByPatient(pid uint, p, pp int) ([]*domain.Appointment, int64, error) {
    return nil, 0, nil
}

// mockPatientRepo implementa domain.PatientRepository para tests.
type mockPatientRepo struct {
    getByIDFn func(uint) (*domain.Patient, error)
}
func (m *mockPatientRepo) GetByID(id uint) (*domain.Patient, error) { return m.getByIDFn(id) }
// ... demás métodos vacíos

func TestCreate_Success(t *testing.T) {
    logger := zaptest.NewLogger(t)

    apptRepo := &mockAppointmentRepo{
        createFn: func(a *domain.Appointment) error { a.ID = 1; return nil },
    }
    patRepo := &mockPatientRepo{
        getByIDFn: func(id uint) (*domain.Patient, error) {
            return &domain.Patient{ID: id}, nil
        },
    }

    svc := appointment.NewService(apptRepo, patRepo, logger)

    result, err := svc.Create(appointment.CreateInput{
        PatientID:    1,
        SpecialistID: 2,
        ScheduledAt:  time.Now().Add(24 * time.Hour),
    })

    require.NoError(t, err)
    assert.Equal(t, uint(1), result.ID)
    assert.Equal(t, "scheduled", result.Status)
}

func TestCreate_PatientNotFound(t *testing.T) {
    logger := zaptest.NewLogger(t)

    apptRepo := &mockAppointmentRepo{}
    patRepo := &mockPatientRepo{
        getByIDFn: func(id uint) (*domain.Patient, error) {
            return nil, &domain.ErrNotFound{Resource: "patient"}
        },
    }

    svc := appointment.NewService(apptRepo, patRepo, logger)

    _, err := svc.Create(appointment.CreateInput{PatientID: 99, SpecialistID: 1, ScheduledAt: time.Now().Add(time.Hour)})

    var notFound *domain.ErrNotFound
    assert.True(t, errors.As(err, &notFound))
}
```

---

## 16. Convenciones de Nomenclatura

| Elemento | Convención | Ejemplo |
|---|---|---|
| Paquetes | `lowercase`, una sola palabra | `patient`, `appointment` |
| Structs públicos | `PascalCase` | `AppointmentService` → simplificado como `Service` |
| Interfaces | `PascalCase` con sufijo del rol | `AppointmentRepository`, `PatientRepository` |
| Funciones/Métodos | `PascalCase` (exportados), `camelCase` (internos) | `GetByID`, `buildQuery` |
| Constantes | `PascalCase` | `RoleAdmin`, `StatusActive` |
| Variables | `camelCase` corto | `apptRepo`, `patSvc` |
| Archivos | `snake_case` | `patient_repository.go` |
| Tests | `*_test.go`, mismo paquete con sufijo `_test` | `service_test.go` |
| Input/Output DTOs | `<Action>Input`, `<Action>Output`, `ListOutput` | `CreateInput`, `ListOutput` |
| Errores de dominio | `Err<Tipo>` | `ErrNotFound`, `ErrConflict` |

---

## 17. Comandos de Desarrollo

```bash
# Desde convision-api-golang/

make build          # Compila el binario en bin/convision-api
make run            # Build + ejecutar
make dev            # Live-reload con air (requiere: go install github.com/cosmtrek/air@latest)
make test           # Tests + reporte de cobertura
make lint           # golangci-lint (requiere instalación previa)
make tidy           # go mod tidy
make clean          # Elimina bin/ y coverage.out
make docker-up      # Levanta PostgreSQL + API con Docker Compose
make docker-down    # Baja el stack Docker
```

### Variables de entorno clave (`.env`)

```bash
APP_ENV=local         # "local" activa AutoMigrate y modo debug de Gin
APP_PORT=8001         # Puerto del servidor Go
LOG_LEVEL=debug       # "debug" | "info"
DB_HOST=localhost
DB_PORT=3306
DB_NAME=convision_go
DB_USER=root
DB_PASSWORD=secret
JWT_SECRET=<secreto-largo-aleatorio>
JWT_EXPIRY_HOURS=24
```

---

## 18. Checklist para una Nueva Feature

Cuando un agente o desarrollador implemente una nueva entidad/endpoint, seguir este orden exacto:

### Paso 1 — Domain
- [ ] Crear `internal/domain/<entity>.go` con el struct GORM y la interfaz Repository
- [ ] Agregar errores de dominio específicos si son necesarios (normalmente los existentes son suficientes)

### Paso 2 — Repositorio
- [ ] Crear `internal/platform/storage/postgres/<entity>_repository.go`
- [ ] Implementar todos los métodos de la interfaz
- [ ] Convertir `gorm.ErrRecordNotFound` → `*domain.ErrNotFound`
- [ ] Agregar el modelo a `AutoMigrate` en `db.go`

### Paso 3 — Servicio
- [ ] Crear `internal/<feature>/service.go`
- [ ] Definir `CreateInput`, `UpdateInput`, `ListOutput` (los que apliquen)
- [ ] Implementar casos de uso con validación de negocio y logging
- [ ] Sanitizar paginación (page ≥ 1, perPage 1–100)

### Paso 4 — Transport
- [ ] Agregar el servicio al struct `Handler` en `handler.go`
- [ ] Agregar el servicio al constructor `NewHandler`
- [ ] Implementar handlers (List, Get, Create, Update, Delete)
- [ ] Registrar rutas en `routes.go` con RBAC correcto

### Paso 5 — Wire en main.go
- [ ] Instanciar el repositorio
- [ ] Instanciar el servicio con sus dependencias
- [ ] Pasar el servicio al `NewHandler`

### Paso 6 — Tests
- [ ] Escribir `internal/<feature>/service_test.go` con mocks
- [ ] Cubrir el happy path y al menos dos casos de error

### Paso 7 — Verificar
- [ ] `make tidy` — sin dependencias huérfanas
- [ ] `make lint` — sin warnings
- [ ] `make test` — todos los tests pasan
- [ ] `make build` — compila sin errores
- [ ] Probar el endpoint con curl o Postman

### Nota: Graceful Shutdown

`main.go` debe escuchar `os.Signal` para apagar el servidor limpiamente (drenar conexiones activas antes de salir). Ejemplo mínimo:

```go
srv := &http.Server{Addr: ":" + port, Handler: router}

go func() {
    if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
        logger.Fatal("server error", zap.Error(err))
    }
}()

quit := make(chan os.Signal, 1)
signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
<-quit

logger.Info("shutting down server...")
ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()
if err := srv.Shutdown(ctx); err != nil {
    logger.Fatal("forced shutdown", zap.Error(err))
}
logger.Info("server exited")
```

> Esto garantiza que los requests en vuelo terminen antes de que el proceso muera (crítico en deploys y reinicios de Docker).

---

## 19. Anti-patrones Prohibidos

| ❌ Anti-patrón | ✅ Corrección |
|---|---|
| Lógica de negocio en handlers | Mover al servicio |
| Queries SQL directas con `db.Raw` para lógica de negocio | Usar GORM ORM con repositorio |
| Importar `gorm` desde `domain` o `transport` | Solo `platform/storage/postgres` usa GORM |
| Crear una nueva conexión DB por request | Inyectar `*gorm.DB` al repositorio vía constructor |
| Strings de roles hardcodeados: `"admin"` | Usar `domain.RoleAdmin` |
| `fmt.Println` para debugging | `logger.Debug(...)` con Zap |
| Ignorar errores con `_` en lógica de negocio | Siempre manejar o propagar |
| Handler con más de ~30 líneas útiles | Extraer lógica al servicio |
| Validar reglas de negocio con `binding` tags | `binding` solo para formato; lógica en el servicio |
| Exponer errores internos de PostgreSQL al cliente | Usar `respondError` que devuelve mensajes genéricos |
| `init()` globales para configuración | Inyección explícita desde `main.go` |
| Campos de dominio opcionales como `string` vacío | Usar punteros `*string` o `*uint` para nulabilidad |
| Tests que dependen de una BD PostgreSQL real | Mocks de interfaces para tests unitarios |
| Rutas sin versionado (`/patients`) | Siempre `/api/v1/patients` |
| Mezclar español e inglés en nombres de código | Todo el código en **inglés**; UI/logs en español si aplica |
| `db.Save(entity)` en Update | `db.Model(&entity).Updates(map[string]any{...})` — solo campos del input |
| `SELECT *` en listas (GORM default) | `Select("col1, col2, ...")` — proyectar solo lo necesario |
| `Find(&all)` sobre tablas grandes sin límite | `FindInBatches` para procesamiento masivo |
| Pool de conexiones sin configurar | `SetMaxOpenConns` / `SetMaxIdleConns` / `SetConnMaxLifetime` en `db.go` |
| Endpoints públicos sin rate limiting | Agregar middleware de rate limit (ej: `golang.org/x/time/rate` o `github.com/ulule/limiter`) antes de la lógica de negocio |

---

> **Última actualización:** 2026-04-18 (correcciones: respondError type-switch, SQL injection whitelist, constantes de rol, AutoMigrate warning, transacciones, graceful shutdown)  
> **Mantenido por:** Equipo Convision — aplicar a todo nuevo código en `convision-api-golang/`
