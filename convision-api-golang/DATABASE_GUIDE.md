# Convision — Guía de Base de Datos PostgreSQL

> **Versión:** 1.1  
> **Motor:** PostgreSQL 15+. ORM: GORM + `gorm.io/driver/postgres`.  
> **Audiencia:** Agentes de IA y desarrolladores. Leer y aplicar **antes de escribir cualquier migración, tabla, índice o query**.  
> **Regla de oro:** Cada decisión de esquema tiene un costo permanente. Una tabla mal diseñada o un índice faltante en producción es mucho más costoso de corregir que de hacer bien desde el principio.

---

## Tabla de Contenidos

1. [Principios Fundamentales](#1-principios-fundamentales)
2. [Driver y Configuración de Conexión](#2-driver-y-configuración-de-conexión)
3. [Tipos de Datos — Elegir el Tipo Correcto](#3-tipos-de-datos--elegir-el-tipo-correcto)
4. [Diseño de Tablas](#4-diseño-de-tablas)
5. [Estrategia de Índices](#5-estrategia-de-índices)
6. [Particionamiento](#6-particionamiento)
7. [Vacuuming y Autovacuum](#7-vacuuming-y-autovacuum)
8. [Pool de Conexiones con PgBouncer](#8-pool-de-conexiones-con-pgbouncer)
9. [Patrones de Query Seguros y Eficientes](#9-patrones-de-query-seguros-y-eficientes)
10. [Migraciones — Guía de Estilo](#10-migraciones--guía-de-estilo)
11. [Configuración PostgreSQL — `postgresql.conf`](#11-configuración-postgresql--postgresqlconf)
12. [Monitoreo y Diagnóstico](#12-monitoreo-y-diagnóstico)
13. [Seguridad](#13-seguridad)
14. [Anti-patrones Prohibidos](#14-anti-patrones-prohibidos)
15. [Checklist para un Cambio de Esquema](#15-checklist-para-un-cambio-de-esquema)

---

## 1. Principios Fundamentales

Estos principios rigen **todas** las decisiones de esquema y query. Antes de escribir cualquier SQL, verifica que tu decisión los respeta.

### 1.1 El esquema es el contrato más costoso de cambiar

Una vez que una tabla tiene datos en producción, modificar su estructura requiere migraciones que pueden bloquear tablas o requerir downtime. Diseña bien desde el principio.

### 1.2 El aislamiento multi-clínica es no negociable

Convision es un sistema multi-clínica. **Todas las tablas de datos clínicos y administrativos deben tener `clinic_id`**. Toda query que acceda a datos de negocio debe incluir `WHERE clinic_id = $n` como primer filtro. Esto garantiza aislamiento de datos y permite que el índice de `clinic_id` sea el primer filtro del query planner.

### 1.3 Los índices no son gratis

Cada índice consume espacio en disco y ralentiza escrituras (`INSERT`, `UPDATE`, `DELETE`) porque PostgreSQL mantiene la estructura del índice sincronizada. Solo indexa columnas que realmente se usan en `WHERE`, `JOIN`, `ORDER BY`. Un índice que nadie usa es peor que no tenerlo.

### 1.4 Los tipos de dato importan para el rendimiento

Usar `BIGINT` donde alcanza un `INTEGER`, o `TEXT` sin límite donde hay un dominio acotado, desperdicia espacio y degrada las decisiones del query planner. Usar el tipo más específico que satisfaga el requerimiento.

### 1.5 Soft delete obligatorio para datos clínicos

Los datos de pacientes, historias clínicas y transacciones **nunca se eliminan físicamente**. Usan `deleted_at TIMESTAMPTZ NULL` para soft delete. Solo registros sin valor histórico (tokens expirados, etc.) se eliminan físicamente.

---

## 2. Driver y Configuración de Conexión

### Driver GORM

```go
// internal/platform/storage/postgres/db.go
import (
    "fmt"
    "time"

    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

func Open(cfg Config) (*gorm.DB, error) {
    dsn := fmt.Sprintf(
        "host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=UTC",
        cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.Name, cfg.SSLMode,
    )

    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
        // En producción: logger.Silent para no loguear cada query
        Logger:                                   logger.Default.LogMode(logLevel(cfg.Env)),
        // Deshabilita el pluralizador automático — usa TableName() explícito
        NamingStrategy:                           schema.NamingStrategy{SingularTable: false},
        // Prepara statements: reutiliza planes de ejecución, reduce latencia
        PrepareStmt:                              true,
        // Evita transacciones implícitas en Create/Update/Delete simples
        SkipDefaultTransaction:                   true,
        // Desactiva reloj en cada query; usa time.Now() solo cuando sea necesario
        NowFunc:                                  func() time.Time { return time.Now().UTC() },
    })
    if err != nil {
        return nil, err
    }

    sqlDB, err := db.DB()
    if err != nil {
        return nil, err
    }

    // Pool de conexiones — ajustar según carga real del servidor
    sqlDB.SetMaxOpenConns(25)
    sqlDB.SetMaxIdleConns(10)
    sqlDB.SetConnMaxLifetime(5 * time.Minute)
    sqlDB.SetConnMaxIdleTime(2 * time.Minute)

    return db, nil
}
```

### Variables de entorno

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=convision
DB_USER=convision_app          # usuario con permisos mínimos (no superuser)
DB_PASSWORD=<secreto>
DB_SSLMODE=require             # siempre "require" en staging/producción
APP_ENV=local                  # "local" activa AutoMigrate; producción usa migraciones SQL
```

> ⚠️ **Nunca conectar con el usuario `postgres` (superuser) desde la aplicación.**  
> Crear un usuario dedicado con permisos solo sobre el schema `convision`:
> ```sql
> CREATE USER convision_app WITH PASSWORD 'secreto';
> GRANT CONNECT ON DATABASE convision TO convision_app;
> GRANT USAGE ON SCHEMA public TO convision_app;
> GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO convision_app;
> GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO convision_app;
> -- Para tablas futuras:
> ALTER DEFAULT PRIVILEGES IN SCHEMA public
>     GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO convision_app;
> ALTER DEFAULT PRIVILEGES IN SCHEMA public
>     GRANT USAGE ON SEQUENCES TO convision_app;
> ```

---

## 3. Tipos de Datos — Elegir el Tipo Correcto

### Regla: usa el tipo más específico que satisfaga el requerimiento

```sql
-- ❌ Incorrecto
id         BIGINT,        -- desperdicia 4 bytes si nunca superará 2 mil millones de filas
status     TEXT,          -- sin límite ni validación para valores enumerables
amount     FLOAT,         -- impreción de punto flotante para valores monetarios
created_at TIMESTAMP,     -- pierde información de zona horaria

-- ✅ Correcto
id         INTEGER GENERATED ALWAYS AS IDENTITY,
status     VARCHAR(30),   -- con CHECK constraint de valores válidos
amount     NUMERIC(12, 2),
created_at TIMESTAMPTZ DEFAULT NOW()
```

### Tabla de referencia de tipos

Al migrar de MySQL o escribir nuevas entidades, usar SIEMPRE los tipos nativos de PostgreSQL:

| Dato | Tipo correcto | Notas |
|---|---|---|
| PK autoincremental | `INTEGER GENERATED ALWAYS AS IDENTITY` | `BIGINT` solo si se esperan >2B filas |
| FK referencias | `INTEGER` o `BIGINT` según la PK referenciada | Debe coincidir exactamente con la PK |
| Texto corto (nombres, apellidos) | `VARCHAR(100)` | Ajustar `n` al dominio real |
| Emails | `VARCHAR(255)` | Límite del estándar RFC 5321 |
| Texto enumerado (status, roles) | `VARCHAR(30)` + `CHECK` | O tipo `ENUM` solo si los valores son 100% estables |
| Texto largo (notas, diagnósticos) | `TEXT` | Sin límite artificial |
| Fecha y hora | `TIMESTAMPTZ` | **Siempre con timezone**; almacena internamente en UTC |
| Solo fecha (sin hora) | `DATE` | Para fechas de nacimiento, fechas de cierre de caja |
| Duración en minutos (< 32767) | `SMALLINT` | Ahorra 2 bytes por fila vs `INTEGER` |
| Valores monetarios | `NUMERIC(12, 2)` | **Nunca `FLOAT` ni `REAL` para dinero** |
| Booleanos | `BOOLEAN` | Nunca `INTEGER` con 0/1 |
| JSON estructurado e indexable | `JSONB` | Más eficiente que `JSON`; permite índices GIN |
| Dirección IP | `INET` | Tipo nativo PostgreSQL con operadores de red |
| Archivos / imágenes | `TEXT` (URL o path) | **Nunca almacenes binarios en la BD** |
| `AUTO_INCREMENT` (MySQL) | `GENERATED ALWAYS AS IDENTITY` | Preferir sobre `BIGSERIAL` en PG 10+ |
| `varchar(20)` para enums (MySQL) | `VARCHAR(30)` + `CHECK` constraint | Más flexible que tipo `ENUM`; se altera sin rebuild |
| `decimal(12,2)` (MySQL) | `NUMERIC(12,2)` | Sinónimos; GORM genera `NUMERIC` en postgres driver |
| `tinyint(1)` / `boolean` (MySQL) | `BOOLEAN` | `TRUE`/`FALSE` nativos en PG |
| `datetime` (MySQL) | `TIMESTAMPTZ` | Siempre con zona horaria; almacenar en UTC |

### Enums con CHECK constraints (no usar tipo ENUM de PG)

```sql
-- ✅ Correcto — fácil de alterar, sin reconstruir la tabla
ALTER TABLE appointments
    ADD CONSTRAINT chk_appointment_status
    CHECK (status IN ('scheduled','in_progress','paused','completed','cancelled'));

-- ❌ Evitar tipo ENUM de PostgreSQL — alterar requiere reescribir la tabla
CREATE TYPE appointment_status AS ENUM ('scheduled', 'in_progress');
```

### Columnas computadas con `GENERATED ALWAYS AS ... STORED`

Para valores que se derivan de otras columnas y se consultan frecuentemente:

```sql
-- El campo "difference" siempre es (total_actual - total_expected) — no necesita UPDATE manual
ALTER TABLE cash_closes
    ADD COLUMN difference NUMERIC(12,2)
    GENERATED ALWAYS AS (total_actual - total_expected) STORED;

-- Columna generada para full-text search en historias clínicas (español)
ALTER TABLE clinical_histories
    ADD COLUMN search_vector TSVECTOR
    GENERATED ALWAYS AS (
        to_tsvector('spanish',
            COALESCE(diagnosis, '') || ' ' ||
            COALESCE(notes, '')     || ' ' ||
            COALESCE(treatment, ''))
    ) STORED;
```

> `STORED` significa que el valor se calcula en `INSERT`/`UPDATE` y se persiste en disco. PostgreSQL lo actualiza automáticamente — nunca lo incluyas en un `UPDATE` manual.

### GORM tags actualizados para PostgreSQL

```go
type Sale struct {
    ID         uint           `gorm:"primaryKey;type:integer generated always as identity"`
    SaleNumber string         `gorm:"not null;uniqueIndex;type:varchar(30)"`
    Total      float64        `gorm:"type:numeric(12,2);not null;default:0"`
    Status     SaleStatus     `gorm:"type:varchar(20);not null;default:'pending'"`
    Notes      string         `gorm:"type:text"`
    CreatedAt  time.Time      `gorm:"type:timestamptz;not null;default:now()"`
    // JSONB para datos semi-estructurados
    Metadata   datatypes.JSON `gorm:"type:jsonb"`
}

---

## 4. Diseño de Tablas

### Convenciones de nomenclatura

| Elemento | Convención | Ejemplo |
|---|---|---|
| Tablas | `snake_case`, plural | `sales`, `laboratory_orders` |
| Columnas | `snake_case` | `patient_id`, `created_at` |
| Índices | `idx_{tabla}_{columnas}` | `idx_sales_patient_created_at` |
| Índices únicos | `uq_{tabla}_{columna}` | `uq_sales_sale_number` |
| FK constraints | `fk_{tabla}_{columna_ref}` | `fk_sale_items_sale_id` |
| CHECK constraints | `chk_{tabla}_{campo}` | `chk_appointments_status` |
| Triggers | `trg_{tabla}_{evento}` | `trg_patients_updated_at` |
| Particiones | `{tabla}_{rango}` | `audit_logs_2026q1` |

### Trigger `set_updated_at` — actualización automática

Un trigger reutilizable elimina la responsabilidad de actualizar `updated_at` en la aplicación:

```sql
-- Función reutilizable (crear una sola vez en la BD)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

-- Aplicar a cada tabla que tenga updated_at:
CREATE TRIGGER trg_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_sales_updated_at
    BEFORE UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- (repetir para inventory_items, laboratory_orders, expenses, etc.)
```

### Orden de columnas — afecta el padding en disco

PostgreSQL alinea columnas en bloques de 8 bytes. Mal ordenamiento desperdicia espacio:

```sql
-- ❌ Columnas mal ordenadas — hasta 30% de espacio desperdiciado por padding
CREATE TABLE example_bad (
    is_active    BOOLEAN,   -- 1 byte + 7 bytes padding
    id           BIGINT,    -- 8 bytes
    name         TEXT,      -- variable
    code         CHAR(3),   -- 3 bytes + 5 bytes padding
    clinic_id    INTEGER    -- 4 bytes
);

-- ✅ Columnas ordenadas por alineación: BIGINT → INTEGER → SMALLINT → BOOLEAN/CHAR
CREATE TABLE appointments (
    -- 8-byte columns first
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    clinic_id       INTEGER     NOT NULL REFERENCES clinics(id),
    patient_id      INTEGER     NOT NULL REFERENCES patients(id),
    specialist_id   INTEGER     NOT NULL REFERENCES users(id),
    -- 4-byte columns
    duration_min    SMALLINT    NOT NULL DEFAULT 30,
    -- variable length
    notes           TEXT,
    status          VARCHAR(30) NOT NULL DEFAULT 'scheduled'
                    CONSTRAINT chk_appointments_status
                    CHECK (status IN ('scheduled','completed','cancelled','no_show')),
    -- timestamps together at the end
    scheduled_at    TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
```

### Reglas de columnas

1. **Primary Keys:** `INTEGER GENERATED ALWAYS AS IDENTITY` para tablas de dominio con < 2 billones de filas; `BIGINT GENERATED ALWAYS AS IDENTITY` solo si se espera ese volumen. Nunca `SERIAL` ni `UUID` como PK por defecto.
2. **`clinic_id`:** debe ser la segunda columna en toda tabla clínica/administrativa. `NOT NULL REFERENCES clinics(id) ON DELETE RESTRICT`.
3. **Timestamps:** `TIMESTAMPTZ` siempre. `created_at DEFAULT NOW()`, `updated_at DEFAULT NOW()` + trigger, `deleted_at TIMESTAMPTZ NULL` para soft delete.
4. **Montos:** `NUMERIC(12,2)` — nunca `FLOAT` o `DOUBLE PRECISION`.
5. **Enumerados:** `VARCHAR(30) NOT NULL CHECK (col IN (...))` — nunca `ENUM` de PostgreSQL (costoso de modificar).
6. **Booleanos:** `BOOLEAN NOT NULL DEFAULT FALSE` — nunca `INTEGER`.
7. **Columnas computadas:** usar `GENERATED ALWAYS AS (expr) STORED` para evitar inconsistencias.

```sql
-- Ejemplo de columna computada: diferencia en cierre de caja
CREATE TABLE cash_register_closes (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    clinic_id       INTEGER      NOT NULL REFERENCES clinics(id),
    close_date      DATE         NOT NULL,
    total_expected  NUMERIC(12,2) NOT NULL,
    total_actual    NUMERIC(12,2) NOT NULL,
    difference      NUMERIC(12,2) GENERATED ALWAYS AS (total_actual - total_expected) STORED,
    closed_by       INTEGER      NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cash_closes_clinic_date UNIQUE (clinic_id, close_date)
);
```

---

## 5. Estrategia de Índices

> **Principio:** Indexar las columnas que aparecen en `WHERE`, `ORDER BY`, y `JOIN ON` de las queries más frecuentes. Cada índice adicional ralentiza `INSERT`/`UPDATE`/`DELETE`. No indexar columnas con baja cardinalidad (< 10 valores distintos) a menos que se use índice parcial.

```sql
-- Tabla `patients` — índice de búsqueda por documento (lookup exacto más frecuente)
CREATE UNIQUE INDEX uq_patients_clinic_dni
    ON patients(clinic_id, dni)
    WHERE deleted_at IS NULL;

-- Tabla `patients` — búsqueda por nombre dentro de clínica
CREATE INDEX idx_patients_clinic_name
    ON patients(clinic_id, last_name, first_name)
    WHERE deleted_at IS NULL;

-- Tabla `patients` — búsqueda fuzzy por nombre (trigram)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_patients_fullname_trgm
    ON patients USING GIN ((first_name || ' ' || last_name) gin_trgm_ops)
    WHERE deleted_at IS NULL;
```

### 5.2 Índice parcial — el más importante en tablas con soft delete

Los índices parciales son más pequeños y rápidos porque solo indexan el subconjunto de filas relevante:

```sql
-- Query más frecuente: citas de un paciente ordenadas por fecha
CREATE INDEX idx_appointments_patient_date
    ON appointments(clinic_id, patient_id, scheduled_at DESC)
    WHERE deleted_at IS NULL;

-- Dashboard del especialista: sus citas del día
CREATE INDEX idx_appointments_specialist_date
    ON appointments(clinic_id, specialist_id, scheduled_at DESC)
    WHERE deleted_at IS NULL;

-- Dashboard: citas pendientes (muy pequeño, muy rápido)
CREATE INDEX idx_appointments_pending
    ON appointments(clinic_id, scheduled_at)
    WHERE status = 'scheduled' AND deleted_at IS NULL;

-- Historial de ventas de un paciente
CREATE INDEX idx_sales_patient_created
    ON sales(clinic_id, patient_id, created_at DESC);

-- Cartera pendiente de cobro
CREATE INDEX idx_sales_payment_status
    ON sales(clinic_id, payment_status, created_at DESC)
    WHERE payment_status IN ('pending', 'partial');

-- Items de una venta — JOIN más frecuente del sistema
CREATE INDEX idx_sale_items_sale_id        ON sale_items(sale_id);
CREATE INDEX idx_sale_payments_sale_id     ON sale_payments(sale_id);
CREATE INDEX idx_partial_payments_sale_id  ON partial_payments(sale_id);

-- Cola de laboratorio pendiente
CREATE INDEX idx_lab_orders_status_created
    ON laboratory_orders(clinic_id, status, created_at DESC)
    WHERE status NOT IN ('delivered', 'cancelled');

-- Stock disponible por producto y almacén
CREATE INDEX idx_inventory_product_warehouse
    ON inventory_items(product_id, warehouse_id)
    WHERE status = 'available';

-- Cierres de caja pendientes de aprobación
CREATE INDEX idx_cash_closes_status
    ON cash_register_closes(clinic_id, status, created_at DESC)
    WHERE status IN ('draft', 'submitted');

-- Cierres de caja por usuario y fecha
CREATE UNIQUE INDEX uq_cash_closes_clinic_date
    ON cash_register_closes(clinic_id, close_date);

-- Reportes de gastos por rango de fecha
CREATE INDEX idx_expenses_date
    ON expenses(clinic_id, expense_date DESC)
    WHERE expense_date IS NOT NULL;
```

### 5.3 Índice GIN — full-text search y JSONB

```sql
-- Full-text search en historias clínicas (español) — requiere columna GENERATED STORED
CREATE INDEX idx_clinical_histories_fts
    ON clinical_histories USING GIN(search_vector);
-- Uso: WHERE search_vector @@ plainto_tsquery('spanish', 'diabetes glaucoma')

-- Búsqueda fuzzy por nombre con pg_trgm (ya mostrado arriba)
-- Columnas JSONB con índice (ej: configuración de clínicas)
CREATE INDEX idx_clinics_settings
    ON clinics USING GIN(settings jsonb_path_ops);
```

### 5.4 Índice BRIN — tablas de logs cronológicos

`BRIN` (Block Range Index) ocupa ~100x menos espacio que un B-tree. Ideal para datos que se insertan siempre en orden cronológico y raramente se modifican:

```sql
-- audit_logs se inserta siempre en orden cronológico — BRIN es perfecto
CREATE INDEX idx_audit_logs_created_brin
    ON audit_logs USING BRIN(created_at);

-- Combinar con un B-tree en clinic_id para filtros más selectivos
CREATE INDEX idx_audit_logs_clinic_created
    ON audit_logs(clinic_id, created_at DESC);
```

### 5.5 Cuándo NO crear un índice

```sql
-- ❌ No indexar booleanos solos — selectividad mínima, el planner los ignora
CREATE INDEX ON patients(is_active);

-- ❌ No crear índices redundantes — el segundo queda cubierto por el compuesto
CREATE INDEX ON appointments(clinic_id);
CREATE INDEX ON appointments(clinic_id, scheduled_at); -- el anterior ya no aporta

-- ❌ No indexar columnas que se actualizan constantemente en tablas de alta escritura
-- (cada UPDATE reconstruye el índice para esa fila)

-- ✅ En cambio: índice parcial que sí aporta valor con baja cardinalidad
CREATE INDEX idx_patients_active_clinic
    ON patients(clinic_id)
    WHERE status = 'active' AND deleted_at IS NULL;
```

### 5.6 Verificar uso real de índices

```sql
-- Índices con cero usos — candidatos a eliminar
SELECT schemaname, tablename, indexname, idx_scan AS uses
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE '%pkey%'
  AND indexname NOT LIKE 'uq_%'
ORDER BY tablename;

-- Verificar que una query usa el índice esperado
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, patient_id, total, status FROM sales
WHERE clinic_id  = 1
  AND created_at >= '2026-01-01'
  AND deleted_at IS NULL
ORDER BY created_at DESC;
-- Buscar: "Index Scan" o "Index Only Scan" → ✅
-- "Seq Scan" en tabla grande → falta índice o el planner eligió mal
```

---

## 6. Particionamiento

> **Cuándo particionar:** tablas que superan los **5–10 millones de filas**, o cuyas queries siempre filtran por un rango de tiempo. En Convision, las candidatas inmediatas son `audit_logs`; a mediano plazo: `appointments`, `sales` y `expenses` según volumen.  
> **No particionar prematuramente** — agrega complejidad operativa. Evaluar cuando una tabla supere 2M filas.

### 6.1 Particionamiento por rango de fecha — `audit_logs`

Ideal para datos de series temporales. Los logs son la primera tabla a particionar:

```sql
CREATE TABLE audit_logs (
    id          BIGINT      GENERATED ALWAYS AS IDENTITY,
    clinic_id   INTEGER     NOT NULL,
    user_id     INTEGER     NULL,
    action      VARCHAR(50) NOT NULL,  -- 'create', 'update', 'delete', 'login'
    resource    VARCHAR(50) NOT NULL,  -- 'patient', 'appointment', etc.
    resource_id INTEGER     NULL,
    old_values  JSONB       NULL,
    new_values  JSONB       NULL,
    ip_address  INET        NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- Sin updated_at ni deleted_at — los logs son inmutables
) PARTITION BY RANGE (created_at);

CREATE TABLE audit_logs_2025 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2026-01-01 00:00:00+00');
CREATE TABLE audit_logs_2026 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');
CREATE TABLE audit_logs_default PARTITION OF audit_logs DEFAULT;

-- Los índices sobre la tabla padre se propagan a todas las particiones (PG 11+)
CREATE INDEX ON audit_logs(clinic_id, created_at DESC);
CREATE INDEX ON audit_logs(resource, resource_id) WHERE resource_id IS NOT NULL;
CREATE INDEX ON audit_logs USING BRIN(created_at);  -- 100x más pequeño que B-tree
```

### 6.2 Particionamiento por rango — `sales` y `appointments`

```sql
CREATE TABLE sales (
    id          INTEGER     GENERATED ALWAYS AS IDENTITY,
    clinic_id   INTEGER     NOT NULL,
    sale_number VARCHAR(30) NOT NULL,
    patient_id  INTEGER     NOT NULL,
    total       NUMERIC(12,2),
    status      VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- la clave de partición DEBE estar en la PK
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE sales_2025 PARTITION OF sales FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE sales_2026 PARTITION OF sales FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE sales_default PARTITION OF sales DEFAULT;

CREATE INDEX idx_sales_clinic_patient ON sales(clinic_id, patient_id, created_at DESC);
CREATE UNIQUE INDEX uq_sales_sale_number ON sales(sale_number, created_at);
```

### 6.3 Particionamiento por lista — aislamiento por clínica

Cuando el volumen por clínica es alto y cada una tiene consultas muy independientes:

```sql
CREATE TABLE appointments (
    id            INTEGER     GENERATED ALWAYS AS IDENTITY,
    clinic_id     INTEGER     NOT NULL,
    patient_id    INTEGER     NOT NULL,
    scheduled_at  TIMESTAMPTZ NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, clinic_id)
) PARTITION BY LIST (clinic_id);

CREATE TABLE appointments_clinic_1 PARTITION OF appointments FOR VALUES IN (1);
CREATE TABLE appointments_clinic_2 PARTITION OF appointments FOR VALUES IN (2);
CREATE TABLE appointments_default  PARTITION OF appointments DEFAULT;
```

### 6.4 Automatizar la creación de particiones anuales

```sql
CREATE OR REPLACE FUNCTION create_audit_partition(target_date DATE)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    start_date     DATE;
    end_date       DATE;
BEGIN
    start_date     := DATE_TRUNC('year', target_date);
    end_date       := start_date + INTERVAL '1 year';
    partition_name := 'audit_logs_' || TO_CHAR(start_date, 'YYYY');

    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = partition_name) THEN
        EXECUTE FORMAT(
            'CREATE TABLE %I PARTITION OF audit_logs FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
        RAISE NOTICE 'Partition created: %', partition_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Llamar al arrancar la aplicación (o en cron de diciembre de cada año)
SELECT create_audit_partition(NOW()::DATE);
SELECT create_audit_partition((NOW() + INTERVAL '1 year')::DATE);
```

### 6.5 Eliminar datos antiguos — la mayor ventaja del particionamiento

```sql
-- Archivar logs de más de 3 años — operación instantánea vs un DELETE masivo bloqueante
DROP TABLE audit_logs_2022;

-- Desligar sin eliminar (para mover a cold storage)
ALTER TABLE audit_logs DETACH PARTITION audit_logs_2022;
-- La tabla audit_logs_2022 queda como tabla independiente; se puede hacer pg_dump y DROP
```

> **GORM y particionamiento:** GORM no gestiona particiones automáticamente. Crear nuevas particiones con migraciones SQL manuales o con la función `create_audit_partition` llamada al inicio de la aplicación.
```

---

## 7. Vacuuming y Autovacuum

PostgreSQL marca filas borradas/actualizadas como "dead tuples" — el autovacuum las reclama. Sin configuración adecuada, las tablas de alta escritura (`sales`, `appointments`) acumulan bloat y degradan el rendimiento.

### Configuración de autovacuum por tabla de alta escritura

```sql
-- Para tablas con muchos UPDATE/DELETE (ventas, citas, inventario)
ALTER TABLE sales SET (
    autovacuum_vacuum_scale_factor     = 0.01,  -- vacuum al 1% de dead tuples (default: 20%)
    autovacuum_analyze_scale_factor    = 0.005, -- analyze al 0.5%
    autovacuum_vacuum_cost_delay       = 2      -- ms; más agresivo (default: 20ms)
);

ALTER TABLE appointments SET (
    autovacuum_vacuum_scale_factor  = 0.01,
    autovacuum_analyze_scale_factor = 0.005
);

ALTER TABLE inventory_items SET (
    autovacuum_vacuum_scale_factor  = 0.02,
    autovacuum_analyze_scale_factor = 0.01
);
```

### Monitoreo de bloat y dead tuples

```sql
-- Ver tablas con más dead tuples (candidatas a vacuum manual)
SELECT relname, n_dead_tup, n_live_tup,
       round(n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0) * 100, 2) AS dead_pct,
       last_autovacuum, last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 20;

-- Forzar vacuum en una tabla específica (sin bloquear lecturas)
VACUUM (ANALYZE, VERBOSE) sales;
```

---

## 8. Pool de Conexiones con PgBouncer

PostgreSQL es costoso en crear conexiones (fork de proceso). En producción, **siempre** usar PgBouncer entre la aplicación y PostgreSQL.

### Configuración recomendada (`pgbouncer.ini`)

```ini
[databases]
convision = host=localhost port=5432 dbname=convision

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type   = scram-sha-256
auth_file   = /etc/pgbouncer/userlist.txt

# Transaction pooling: la conexión vuelve al pool al terminar la transacción
# Es el modo más eficiente para APIs REST stateless
pool_mode = transaction

# Conexiones máximas al PostgreSQL real
max_client_conn = 200
default_pool_size = 20       # conexiones reales a PG por database

# Tiempo máximo de espera de un cliente por una conexión del pool
query_wait_timeout = 30
client_idle_timeout = 60
```

> ⚠️ **`transaction` mode y limitaciones:**  
> Con `pool_mode = transaction`, las siguientes features de PostgreSQL **no funcionan**:
> - `SET` variables de sesión (ej: `SET search_path`)
> - `LISTEN`/`NOTIFY`
> - Advisory locks de sesión
> - Prepared statements con nombre (GORM usa `PrepareStmt: true` — asegurarse de usar `statement_cache_mode=describe` en el DSN si aparecen errores)
>
> Si necesitas alguna de estas, usar `session` mode para esa conexión específica con una segunda instancia de PgBouncer.

### DSN con PgBouncer

```bash
# Apuntar la app a PgBouncer, no a PostgreSQL directamente
DB_HOST=pgbouncer-host
DB_PORT=6432
```

---

## 9. Patrones de Query Seguros y Eficientes

### 9.1 Filtrar siempre por `clinic_id` en primer lugar

```sql
-- ✅ clinic_id como primer filtro — usa el índice compuesto eficientemente
SELECT id, first_name, last_name, dni
FROM   patients
WHERE  clinic_id  = $1
  AND  last_name  ILIKE $2 || '%'
  AND  deleted_at IS NULL
ORDER  BY last_name, first_name
LIMIT  $3 OFFSET $4;

-- ❌ Sin clinic_id — full scan de toda la tabla; cross-clinic data leak
SELECT * FROM patients WHERE last_name ILIKE '%garcia%';
```

### 9.2 Proyección obligatoria con `Select()`

```go
// ✅ Proyectar solo las columnas necesarias — nunca SELECT *
db.Select("id, patient_id, sale_number, total, status, created_at").
    Where("clinic_id = ? AND patient_id = ?", clinicID, patientID).
    Order("created_at DESC").
    Find(&sales)

// ❌ Prohibido en listas — trae columnas text largas e invalida Index Only Scans
db.Find(&sales)
```

### 9.3 Búsqueda de texto — `pg_trgm` y `ILIKE` en lugar de `LIKE '%x%'`

```go
// ❌ LIKE con % inicial — escaneo secuencial, no usa índices B-tree
db.Where("first_name LIKE ?", "%García%").Find(&patients)

// ✅ ILIKE con prefijo — sí usa índice B-tree
db.Where("clinic_id = ? AND first_name ILIKE ?", clinicID, searchTerm+"%").Find(&patients)

// ✅ Full-text search con GIN para "contiene" frecuente
db.Where("clinic_id = ? AND search_vector @@ plainto_tsquery('spanish', ?)",
    clinicID, searchTerm).Find(&records)

// ❌ LOWER(col) LIKE — fuerza evaluación de función en cada fila, no usa índice
db.Where("LOWER(first_name) LIKE ?", strings.ToLower(name)+"%").Find(&patients)
// ✅ ILIKE es nativo de PostgreSQL — reemplaza el patrón anterior
db.Where("first_name ILIKE ?", name+"%").Find(&patients)
```

### 9.4 Paginación Keyset (cursor) para listas grandes

```sql
-- ❌ OFFSET escala mal — PostgreSQL lee y descarta N filas antes de retornar
SELECT id, scheduled_at, status FROM appointments
WHERE  clinic_id = $1 AND deleted_at IS NULL
ORDER  BY scheduled_at DESC, id DESC
LIMIT  20 OFFSET 2000;

-- ✅ Keyset — siempre O(log n) sin importar la "página"
-- Primera página:
SELECT id, scheduled_at, patient_id, status
FROM   appointments
WHERE  clinic_id   = $1
  AND  deleted_at  IS NULL
ORDER  BY scheduled_at DESC, id DESC
LIMIT  20;

-- Página siguiente ($2 = last_scheduled_at, $3 = last_id del lote anterior):
SELECT id, scheduled_at, patient_id, status
FROM   appointments
WHERE  clinic_id   = $1
  AND  deleted_at  IS NULL
  AND  (scheduled_at, id) < ($2, $3)  -- tupla comparison, un solo index scan
ORDER  BY scheduled_at DESC, id DESC
LIMIT  20;
```

> Usar `OFFSET` solo en las primeras páginas (page ≤ 10). Para exportes o navegación profunda, siempre keyset.

### 9.5 UPSERT atómico con `ON CONFLICT`

```sql
-- Cierre de caja: un solo cierre por clínica por día
INSERT INTO cash_closes
    (clinic_id, close_date, closed_by, total_cash, total_card, total_expected, total_actual)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (clinic_id, close_date)
DO UPDATE SET
    total_cash     = EXCLUDED.total_cash,
    total_card     = EXCLUDED.total_card,
    total_actual   = EXCLUDED.total_actual,
    closed_by      = EXCLUDED.closed_by,
    updated_at     = NOW()
RETURNING id, difference;  -- columna GENERATED; sin SELECT extra

-- Inventario: incrementar stock de forma atómica
INSERT INTO inventory_items (product_id, warehouse_id, quantity, status)
VALUES ($1, $2, $3, 'available')
ON CONFLICT (product_id, warehouse_id)
DO UPDATE SET
    quantity   = inventory_items.quantity + EXCLUDED.quantity,
    updated_at = NOW();
```

### 9.6 `RETURNING` para evitar un SELECT extra

```go
// ✅ GORM usa RETURNING id automáticamente con postgres driver en Create()
// Para campos adicionales:
var result struct{ ID uint; SaleNumber string }
db.Raw(`
    INSERT INTO sales (clinic_id, patient_id, total, status, created_at)
    VALUES (?, ?, ?, 'pending', now())
    RETURNING id, sale_number
`, clinicID, patientID, total).Scan(&result)
```

### 9.7 CTEs para reportes legibles

```sql
-- Reporte mensual de citas por especialista (clínica aislada)
WITH monthly_stats AS (
    SELECT
        specialist_id,
        COUNT(*)                                       AS total,
        COUNT(*) FILTER (WHERE status = 'completed')  AS completed,
        COUNT(*) FILTER (WHERE status = 'no_show')    AS no_shows,
        COUNT(*) FILTER (WHERE status = 'cancelled')  AS cancelled
    FROM  appointments
    WHERE clinic_id    = $1   -- ← SIEMPRE primero
      AND scheduled_at >= DATE_TRUNC('month', $2::DATE)
      AND scheduled_at <  DATE_TRUNC('month', $2::DATE) + INTERVAL '1 month'
      AND deleted_at   IS NULL
    GROUP BY specialist_id
)
SELECT
    u.first_name || ' ' || u.last_name              AS specialist,
    ms.total,
    ms.completed,
    ms.no_shows,
    ROUND(ms.no_shows::NUMERIC / NULLIF(ms.total, 0) * 100, 1) AS no_show_pct
FROM  monthly_stats ms
JOIN  users u ON u.id = ms.specialist_id AND u.clinic_id = $1
ORDER BY ms.total DESC;
```

### 9.8 Transacciones — siempre explícitas para operaciones multi-tabla

```go
err := db.Transaction(func(tx *gorm.DB) error {
    if err := tx.Create(&sale).Error; err != nil {
        return err  // rollback automático
    }
    for _, item := range items {
        item.SaleID = sale.ID
        if err := tx.Create(&item).Error; err != nil {
            return err
        }
        // Decrementar inventario de forma atómica dentro de la misma TX
        result := tx.Exec(
            `UPDATE inventory_items
             SET quantity = quantity - ?
             WHERE product_id = ? AND clinic_id = ? AND quantity >= ?`,
            item.Quantity, item.LensID, sale.ClinicID, item.Quantity,
        )
        if result.Error != nil || result.RowsAffected == 0 {
            return errors.New("stock insuficiente")
        }
    }
    return nil
})
```

### 9.9 `EXPLAIN ANALYZE` antes de desplegar cualquier query nueva

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, patient_id, total, status
FROM sales
WHERE clinic_id  = 1
  AND created_at >= '2026-01-01'
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 15;

-- Buscar en la salida:
-- ✅ "Index Scan" o "Bitmap Index Scan" → usa índice
-- ⚠️ "Seq Scan" en tabla grande → falta índice o el planner eligió mal
-- ⚠️ "Rows Removed by Filter" muy alto → el índice es poco selectivo
```

---

## 10. Migraciones — Guía de Estilo

### Reglas

1. **Nunca editar una migración ya ejecutada.** Crear una nueva migración para corregir errores.
2. **Cada migración es idempotente** — usar `IF NOT EXISTS`, `IF EXISTS`, `CREATE INDEX CONCURRENTLY IF NOT EXISTS`.
3. **`CREATE INDEX CONCURRENTLY`** — siempre para tablas en producción. Evita bloquear escrituras durante la creación del índice. No puede usarse dentro de una transacción.
4. **Operaciones `ALTER TABLE`** que reescriben la tabla (`ADD COLUMN NOT NULL DEFAULT valor`) bloquean la tabla. Preferir:
   a. `ADD COLUMN ... DEFAULT NULL` (instantáneo)  
   b. Poblar en lotes con `UPDATE ... WHERE id BETWEEN x AND y`  
   c. `ALTER COLUMN SET NOT NULL` al final
5. **Nunca usar `DROP COLUMN` directamente en producción** si el código todavía referencia la columna. Primero desplegar el código que la ignora, luego borrar la columna.

### Plantilla de archivo de migración SQL

```sql
-- migrations/20260418_001_add_idx_sales_patient_created.sql
-- Descripción: Añade índice compuesto en sales para queries de historial de paciente
-- Autor: <nombre>
-- Fecha: 2026-04-18
-- Reversión: DROP INDEX CONCURRENTLY IF EXISTS idx_sales_patient_created;

BEGIN;

-- CONCURRENTLY no puede usarse en una transacción — ejecutar fuera si es un índice
-- Para DDL que no bloquean (ADD COLUMN NULL, CREATE TABLE, etc.) sí va en BEGIN/COMMIT

COMMIT;

-- Ejecutar fuera de transacción:
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_patient_created
    ON sales (patient_id, created_at DESC);
```

### Cómo ejecutar migraciones

```bash
# Opción A — psql directamente (migraciones simples)
psql $DATABASE_URL -f migrations/20260418_001_add_idx.sql

# Opción B — herramienta de migraciones (recomendado para producción)
# golang-migrate: https://github.com/golang-migrate/migrate
migrate -database "$DATABASE_URL" -path migrations up

# Verificar estado
migrate -database "$DATABASE_URL" -path migrations version
```

---

## 11. Configuración PostgreSQL — `postgresql.conf`

Parámetros clave para un servidor dedicado con 2–4 GB RAM a la carga de Convision:

```ini
# Memoria
shared_buffers           = 512MB    # 25% de RAM total
effective_cache_size     = 1536MB   # estimado de caché OS + shared_buffers
work_mem                 = 8MB      # por operación de sort/hash (es por sesión)
maintenance_work_mem     = 128MB    # para VACUUM, CREATE INDEX

# Conexiones
# Fórmula: (max_open_conns × instancias_app) + conexiones_admin
# Ejemplo Convision: (25 × 2) + 10 = 60 → max_connections = 100 (con margen)
max_connections          = 100

# WAL
wal_buffers              = 16MB
checkpoint_completion_target = 0.9

# Query planner — ajustar según tipo de disco
random_page_cost         = 1.1     # SSD; usar 4.0 para HDD
effective_io_concurrency = 200     # SSD; usar 2 para HDD

# Extensiones — cargar al inicio
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.track = all

# Logging de queries lentas — obligatorio en producción
log_min_duration_statement = 200   # loguea queries que tarden más de 200ms
log_line_prefix          = '%t [%p] %u@%d '

# WAL archiving (PITR)
archive_mode             = on
archive_command          = 'cp %p /backups/wal/%f'
```

> Aplicar cambios con `SELECT pg_reload_conf();` para parámetros que no requieren restart, o reiniciar el servicio para los que sí.

---

## 12. Monitoreo y Diagnóstico

### Queries de diagnóstico esenciales

```sql
-- 1. Índices que nunca se usan (candidatos a DROP)
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE 'pg_%'
ORDER BY tablename, indexname;

-- 2. Tablas con más escaneos secuenciales (candidatas a nuevo índice)
SELECT relname, seq_scan, idx_scan,
       round(seq_scan::numeric / NULLIF(seq_scan + idx_scan, 0) * 100, 1) AS seq_pct
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_scan DESC
LIMIT 20;

-- 3. Queries lentas activas (> 5 segundos)
SELECT pid, now() - pg_stat_activity.query_start AS duration,
       state, wait_event_type, wait_event, query
FROM pg_stat_activity
WHERE state != 'idle'
  AND query_start < now() - interval '5 seconds'
ORDER BY duration DESC;

-- 4. Bloqueos actuales
SELECT blocked.pid, blocked.query, blocking.pid AS blocking_pid, blocking.query AS blocking_query
FROM pg_stat_activity blocked
JOIN pg_stat_activity blocking
    ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))
WHERE blocked.cardinality(pg_blocking_pids(blocked.pid)) > 0;

-- 5. Tamaño de tablas e índices
SELECT tablename,
       pg_size_pretty(pg_total_relation_size(tablename::text)) AS total,
       pg_size_pretty(pg_relation_size(tablename::text))       AS table_only,
       pg_size_pretty(pg_indexes_size(tablename::text))        AS indexes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::text) DESC;

-- 6. Cache hit ratio — debe ser > 99% en producción
SELECT sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) AS cache_hit_ratio
FROM pg_statio_user_tables;

-- 7. Uso de índices por tabla — confirmar que los índices que creamos se usan
SELECT indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename IN ('sales', 'appointments', 'patients', 'laboratory_orders')
ORDER BY tablename, idx_scan DESC;
```

### pg_stat_statements — activar para análisis de queries

```sql
-- En postgresql.conf:
-- shared_preload_libraries = 'pg_stat_statements'
-- pg_stat_statements.track = all

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top 10 queries más lentas por tiempo total
SELECT round(total_exec_time::numeric, 2) AS total_ms,
       calls,
       round(mean_exec_time::numeric, 2)  AS avg_ms,
       round(stddev_exec_time::numeric, 2) AS stddev_ms,
       left(query, 120) AS query_preview
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

---

## 13. Seguridad

### Usuario de aplicación con privilegios mínimos

```sql
-- Usuario dedicado para la app — nunca con el superusuario en producción
CREATE USER convision_app WITH PASSWORD '<password-mín-32-chars>';
GRANT CONNECT  ON DATABASE convision TO convision_app;
GRANT USAGE    ON SCHEMA public TO convision_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO convision_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO convision_app;
REVOKE CREATE ON SCHEMA public FROM convision_app; -- la app no puede crear tablas

-- Usuario separado para migraciones — con más privilegios, solo para CI/CD
CREATE USER convision_migrator WITH PASSWORD '<otro-password>';
GRANT ALL PRIVILEGES ON DATABASE convision TO convision_migrator;

-- Tablas futuras: herencia automática de permisos
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO convision_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE ON SEQUENCES TO convision_app;
```

### Row Level Security (RLS) — segunda capa de aislamiento multi-clínica

RLS garantiza que incluso si hay un bug en la aplicación que omita el `WHERE clinic_id`, la BD **nunca** retornará datos de otra clínica:

```sql
-- Habilitar RLS en las tablas críticas
ALTER TABLE patients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales              ENABLE ROW LEVEL SECURITY;

-- Política: la app solo ve filas cuyo clinic_id coincide con el de la sesión actual
CREATE POLICY clinic_isolation ON patients
    USING (clinic_id = current_setting('app.current_clinic_id', TRUE)::INTEGER);
CREATE POLICY clinic_isolation ON appointments
    USING (clinic_id = current_setting('app.current_clinic_id', TRUE)::INTEGER);
CREATE POLICY clinic_isolation ON sales
    USING (clinic_id = current_setting('app.current_clinic_id', TRUE)::INTEGER);

-- FORCE garantiza que incluso el superusuario (convision_migrator) aplique el RLS
ALTER TABLE patients           FORCE ROW LEVEL SECURITY;
ALTER TABLE appointments       FORCE ROW LEVEL SECURITY;
ALTER TABLE sales              FORCE ROW LEVEL SECURITY;
```

Configurar `clinic_id` al inicio de cada request en Go:

```go
// En el middleware JWT, después de validar el token
db.Exec("SET LOCAL app.current_clinic_id = ?", claims.ClinicID)
// SET LOCAL tiene scope de transacción; con PgBouncer transaction mode es seguro
```

> ⚠️ RLS es una **segunda capa de defensa** — no reemplaza el `WHERE clinic_id = $n` en las queries. Ambos mecanismos deben coexistir.

### Parámetros de conexión seguros

```go
// ✅ GORM usa prepared statements automáticamente
db.Where("patient_id = ? AND clinic_id = ?", id, clinicID).Find(&records)

// ❌ Nunca interpolar valores de usuario en strings SQL — SQL injection directa
db.Where(fmt.Sprintf("patient_id = %d AND status = '%s'", id, status)).Find(&records)
```

### Backup automático

```bash
# Backup diario con pg_dump (comprimir con gzip)
pg_dump -Fc -Z 9 "$DATABASE_URL" > "convision_$(date +%Y%m%d).dump"

# Restaurar
pg_restore -d "$DATABASE_URL" --no-owner convision_20260418.dump

# VACUUM manual en tablas críticas (sin bloquear lecturas ni escrituras)
VACUUM ANALYZE sales;
VACUUM ANALYZE appointments;

# VACUUM FULL reconstruye físicamente la tabla — bloquea completamente
# Solo usar en mantenimiento planificado con downtime autorizado
```

---

## 14. Anti-patrones Prohibidos

| ❌ Anti-patrón | ✅ Corrección | Por qué |
|---|---|---|
| `SELECT *` en producción | `Select("col1, col2, ...")` siempre | Invalida Index Only Scans; trae datos innecesarios |
| Queries sin `clinic_id` en el WHERE | `AND clinic_id = $n` siempre | Cross-clinic data leak y full table scans |
| `FLOAT` / `REAL` para dinero | `NUMERIC(12, 2)` | Impreción de punto flotante en cálculos monetarios |
| `TIMESTAMP` sin zona horaria | `TIMESTAMPTZ` | Ambiguo en cualquier despliegue multi-zona |
| `LIKE '%término%'` para búsqueda de texto | `pg_trgm` con índice GIN + operador `%` o `@@` | Escaneo secuencial en toda la tabla |
| `LOWER(col) LIKE ?` | `ILIKE ?` nativo de PostgreSQL | Evalúa función en cada fila, no usa índice |
| `OFFSET` grande para paginación | Keyset pagination con `(col, id) < ($2, $3)` | `OFFSET 10000` lee y descarta 10.000 filas |
| `db.Save()` en updates | `db.Model(&e).Updates(map[string]any{...})` | `Save()` hace UPDATE de todos los campos |
| Transacciones sin `db.Transaction()` multi-tabla | Siempre `db.Transaction(func(tx *gorm.DB) error {...})` | BD inconsistente ante fallo parcial |
| FKs sin índice en la columna referenciante | `CREATE INDEX ON tabla(fk_col)` | JOINs sin índice hacen full scan |
| `CREATE INDEX` sin `CONCURRENTLY` en producción | `CREATE INDEX CONCURRENTLY` | Bloquea escrituras mientras se construye |
| `ALTER TABLE ADD COLUMN NOT NULL DEFAULT x` en tabla grande | Añadir NULL → poblar en lotes → `SET NOT NULL` | Bloquea la tabla hasta completar el backfill |
| `DELETE` físico de datos clínicos | `UPDATE SET deleted_at = NOW()` | Obligatorio por regulación de datos de salud |
| Índice en columna booleana sola | Índice compuesto o parcial con condición | Selectividad mínima — el planner lo ignora |
| Índices redundantes (`clinic_id` solo + `clinic_id, col`) | Solo el compuesto | El índice simple queda cubierto por el compuesto |
| `AutoMigrate` en producción | Migraciones SQL numeradas | Puede alterar o eliminar columnas inesperadamente |
| Binarios / imágenes en la BD | Almacenar URLs; archivos en S3 o almacenamiento externo | Infla la BD; ralentiza backups y queries |
| Contraseñas en texto plano | Hash bcrypt en la aplicación | La BD no es el único control de seguridad |
| Conectar con usuario `postgres` desde la app | Usuario dedicado con permisos mínimos (`convision_app`) | Principio de mínimo privilegio |
| Cadena de conexión sin `sslmode=require` en producción | `sslmode=require` o `sslmode=verify-full` | Tráfico de BD en texto plano |
| Pool sin `SetMaxOpenConns` | Configurar siempre (ver §2) | GORM usa ilimitado por defecto; agota conexiones MySQL |
| Transacciones de larga duración | Transacciones cortas y específicas | Mantienen locks que bloquean otras queries |
| Lógica de negocio en stored procedures | Lógica en la capa de servicio Go | Dificulta testing, versionado y portabilidad |
| `TEXT` para todos los campos | `VARCHAR(n)` con límite apropiado al dominio | Sin límite acepta datos inválidos silenciosamente |
| Modificar una migración ya ejecutada | Crear una nueva migración correctiva | Los entornos ya ejecutaron la migración original |
| Ignorar `EXPLAIN ANALYZE` antes de desplegar | Ejecutar y verificar "Index Scan" en toda query nueva | Queries lentas en producción son costosas de diagnosticar |
| Borrar columnas referenciadas por el código | Desplegar código primero, luego `DROP COLUMN` | La app falla si busca una columna que no existe |

---

## 15. Checklist para un Cambio de Esquema

Verifica **cada punto** antes de ejecutar cualquier migración en producción.

### ✅ Diseño de la tabla
- [ ] Tiene `id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY`
- [ ] Si es tabla clínica/administrativa, tiene `clinic_id INTEGER NOT NULL REFERENCES clinics(id)`
- [ ] `clinic_id` es la segunda columna (después de `id`)
- [ ] Todos los timestamps son `TIMESTAMPTZ`, no `TIMESTAMP`
- [ ] Tiene `created_at` y `updated_at` con `DEFAULT NOW()`
- [ ] Tiene `deleted_at TIMESTAMPTZ NULL` si los registros deben sobrevivir a eliminaciones
- [ ] Tiene trigger `trg_<tabla>_updated_at` para `updated_at` automático
- [ ] Los valores monetarios son `NUMERIC(12,2)`, no `FLOAT`
- [ ] Los valores enumerados tienen `CHECK constraint` nombrado `chk_<tabla>_<campo>`
- [ ] Las FKs tienen `ON DELETE RESTRICT` o `CASCADE` explícito
- [ ] Los `NOT NULL` reflejan correctamente los requerimientos del negocio

### ✅ Índices
- [ ] Hay índice en `clinic_id` (solo o como primera columna de un compuesto)
- [ ] Hay índice en cada FK usada en JOINs frecuentes
- [ ] Los índices de listas son parciales con `WHERE deleted_at IS NULL`
- [ ] Las columnas de filtro frecuente (`status`, `scheduled_at`) tienen índice
- [ ] No hay índices duplicados ni redundantes
- [ ] Los índices sobre tablas con datos en producción usan `CREATE INDEX CONCURRENTLY`

### ✅ Análisis previo
- [ ] ¿La operación bloquea escrituras? — si sí, planificar ventana de mantenimiento.
- [ ] ¿Afecta una tabla con más de 100k filas? — medir tiempo en staging con `EXPLAIN`.
- [ ] ¿El índice nuevo es necesario? — verificar que la query actualmente hace Seq Scan.
- [ ] ¿El índice a borrar es inusado? — confirmar con `pg_stat_user_indexes.idx_scan = 0` por ≥7 días.

### ✅ La migración en sí
- [ ] Nombre sigue el patrón `NNN_descripcion.sql` con número secuencial.
- [ ] Envuelta en `BEGIN; ... COMMIT;` (excepto `CONCURRENTLY`).
- [ ] Tiene el bloque `-- DOWN` documentado al final.
- [ ] Probada en entorno local o staging antes de producción.
- [ ] `EXPLAIN ANALYZE` ejecutado sobre las queries principales que la utilizan.
- [ ] Ejecutar en producción en horario de baja carga.

### ✅ Post-ejecución
- [ ] Verificar con `\d tablename` que el esquema es el esperado.
- [ ] Verificar `pg_stat_user_indexes` — el nuevo índice aparece.
- [ ] Ejecutar `EXPLAIN ANALYZE` en la query objetivo — confirmar "Index Scan".
- [ ] Monitorear `pg_stat_activity` los 30 minutos siguientes.
- [ ] Actualizar este documento si hay un nuevo patrón o decisión de diseño.

---

> **Versión:** 1.1 — **Última actualización:** 2026-04-18 (principios multi-clínica, sección Diseño de Tablas, trigger set_updated_at, tipos mejorados, índices BRIN/GIN/LIST, particionamiento LIST + auto-partition, queries con clinic_id, CTE reportes, RLS completo con FORCE, postgresql.conf, anti-patrones ampliados, checklist de tabla)  
> **Mantenido por:** Equipo Convision — aplicar a toda modificación de esquema en `convision-api-golang/`
