# Guía de Implementación — Módulo de Facturación Electrónica

> Stack: Go 1.22 + Gin + GORM + PostgreSQL 15+, React 18 + TypeScript, multi-tenant por schema.
> Seguir las convenciones del `DEVELOPMENT_GUIDE.md` y `DATABASE_GUIDE.md` del proyecto.
> Para leyenda de confianza (✅🟡🔵) ver `BITACORA.md`.

---

## 1. Decisión previa (leer antes de planear)

Hay dos paths de implementación. El modelo de datos y la lógica de negocio son **idénticos** en
ambos. Solo cambia la capa de transporte (quién firma y transmite a DIAN):

| Capa | Software Propio | Proveedor Tecnológico |
|---|---|---|
| Modelo de datos | Igual | Igual |
| Lógica IVA / líneas | Igual | Igual |
| Firma XAdES | Tu código (Go) | El proveedor |
| CUFE | Tu código (Go) | El proveedor lo calcula o te lo devuelve |
| SOAP/WSDL DIAN | Tu código (Go) | HTTP/REST al proveedor |
| RIPS + MinSalud | Tu código (Go) | El proveedor (si lo soporta) |

**Recomendación:** Implementar la capa de transporte como una interfaz `InvoiceTransmitter` con dos
implementaciones: `DianDirectTransmitter` (software propio) y `ProviderTransmitter` (proveedor).
Esto permite cambiar de path sin reescribir la lógica de negocio.

---

## 2. Modelo de datos (PostgreSQL)

Seguir las reglas del `DATABASE_GUIDE.md`:
- `clinic_id INTEGER NOT NULL` como segunda columna en todas las tablas de negocio.
- `NUMERIC(12,2)` para dinero.
- `TIMESTAMPTZ` para fechas.
- `deleted_at TIMESTAMPTZ NULL` para soft delete.
- Trigger `set_updated_at` en todas las tablas.
- Índices parciales con `WHERE deleted_at IS NULL`.

### 2.1 `electronic_invoices` — tabla principal

```sql
CREATE TABLE electronic_invoices (
    id                      BIGSERIAL PRIMARY KEY,
    clinic_id               INTEGER NOT NULL REFERENCES clinics(id),
    sale_id                 BIGINT REFERENCES sales(id),      -- puede ser NULL para facturas sin venta directa
    document_type           VARCHAR(10) NOT NULL
                            CHECK (document_type IN ('FV','NC','ND','DS','POS')),
                            -- FV=factura venta, NC=nota crédito, ND=nota débito,
                            -- DS=documento soporte, POS=tiquete equivalente
    invoice_type_code       VARCHAR(5) NOT NULL,              -- "01" FEV, "91" NC, "92" ND, "05" POS
    prefix                  VARCHAR(4) NOT NULL DEFAULT '',
    consecutive             INTEGER NOT NULL,
    numbering_resolution_id BIGINT NOT NULL REFERENCES invoice_numbering_resolutions(id),
    issue_date              DATE NOT NULL,
    issue_time              TIMETZ NOT NULL,
    currency_code           VARCHAR(3) NOT NULL DEFAULT 'COP',

    -- Totales financieros (NUMERIC(12,2) — nunca FLOAT)
    subtotal                NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_total          NUMERIC(12,2) NOT NULL DEFAULT 0,
    iva_total               NUMERIC(12,2) NOT NULL DEFAULT 0,
    inc_total               NUMERIC(12,2) NOT NULL DEFAULT 0,
    other_taxes_total       NUMERIC(12,2) NOT NULL DEFAULT 0,
    total                   NUMERIC(12,2) NOT NULL DEFAULT 0,

    -- Datos del adquiriente (desnormalizados para inmutabilidad fiscal)
    acquirer_doc_type       VARCHAR(10) NOT NULL,             -- "31"=NIT, "13"=CC, etc.
    acquirer_doc_number     VARCHAR(20) NOT NULL,             -- "222222222222" si consumidor final
    acquirer_name           VARCHAR(250) NOT NULL,
    acquirer_email          VARCHAR(150),

    -- Referencia (para NC/ND)
    referenced_invoice_id   BIGINT REFERENCES electronic_invoices(id),
    referenced_cufe         VARCHAR(200),

    -- DIAN validation
    cufe                    VARCHAR(200),
    cude                    VARCHAR(200),
    dian_track_id           VARCHAR(100),
    dian_status             VARCHAR(30) NOT NULL DEFAULT 'draft'
                            CHECK (dian_status IN ('draft','signed','sent','validated','rejected','contingency')),
    dian_response_xml       TEXT,                             -- ApplicationResponse XML de DIAN
    dian_validated_at       TIMESTAMPTZ,

    -- Representación gráfica
    qr_payload              TEXT,
    pdf_storage_key         VARCHAR(500),                     -- S3 key

    -- Salud (RIPS) — NULL si no es factura de salud a aseguradoras
    rips_json               JSONB,
    cuv                     VARCHAR(100),
    minsalud_status         VARCHAR(30)
                            CHECK (minsalud_status IN ('pending','submitted','validated','rejected') OR minsalud_status IS NULL),

    -- Timestamps
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMPTZ NULL
);

CREATE INDEX idx_electronic_invoices_clinic ON electronic_invoices(clinic_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_electronic_invoices_dian_status ON electronic_invoices(clinic_id, dian_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_electronic_invoices_sale ON electronic_invoices(sale_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_electronic_invoices_cufe ON electronic_invoices(cufe) WHERE cufe IS NOT NULL;
CREATE UNIQUE INDEX idx_electronic_invoices_consecutive ON electronic_invoices(clinic_id, numbering_resolution_id, consecutive)
    WHERE deleted_at IS NULL;
```

### 2.2 `invoice_lines` — líneas de factura

```sql
CREATE TABLE invoice_lines (
    id                  BIGSERIAL PRIMARY KEY,
    invoice_id          BIGINT NOT NULL REFERENCES electronic_invoices(id),
    line_number         INTEGER NOT NULL,                    -- 1-based, orden en el XML
    product_id          BIGINT REFERENCES products(id),     -- NULL si es servicio no catalogado
    description         VARCHAR(500) NOT NULL,
    quantity            NUMERIC(10,3) NOT NULL,
    unit_code           VARCHAR(10) NOT NULL DEFAULT 'EA',  -- "EA"=each, "HUR"=hora, etc.
    unit_price          NUMERIC(12,2) NOT NULL,
    discount_rate       NUMERIC(5,2) NOT NULL DEFAULT 0,
    discount_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
    line_subtotal       NUMERIC(12,2) NOT NULL,             -- quantity * unit_price - discount

    -- IVA de la línea
    iva_treatment       VARCHAR(20) NOT NULL
                        CHECK (iva_treatment IN ('excluido','exento','gravado_19','gravado_5')),
    iva_rate            NUMERIC(5,2) NOT NULL DEFAULT 0,    -- 0, 5, 19
    iva_amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_exemption_code  VARCHAR(10),                        -- código DIAN para excluidos/exentos

    line_total          NUMERIC(12,2) NOT NULL,             -- line_subtotal + iva_amount

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_lines_invoice ON invoice_lines(invoice_id);
```

### 2.3 `invoice_numbering_resolutions` — rangos de numeración

```sql
CREATE TABLE invoice_numbering_resolutions (
    id                  BIGSERIAL PRIMARY KEY,
    clinic_id           INTEGER NOT NULL REFERENCES clinics(id),
    document_type       VARCHAR(10) NOT NULL
                        CHECK (document_type IN ('FV','NC','ND','DS','POS')),
    prefix              VARCHAR(4) NOT NULL DEFAULT '',
    authorization_number VARCHAR(50) NOT NULL,              -- número de resolución DIAN
    technical_key       VARCHAR(200) NOT NULL,              -- ClTec — obtenida por GetNumberingRange
    range_from          INTEGER NOT NULL,
    range_to            INTEGER NOT NULL,
    current_number      INTEGER NOT NULL,                   -- próximo a emitir
    authorization_date  DATE NOT NULL,
    valid_until         DATE NOT NULL,
    environment         VARCHAR(10) NOT NULL
                        CHECK (environment IN ('hab','prod')),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_numbering_res_clinic ON invoice_numbering_resolutions(clinic_id, document_type, environment)
    WHERE is_active = TRUE;
```

### 2.4 `invoice_dian_events` — log de eventos DIAN

```sql
CREATE TABLE invoice_dian_events (
    id          BIGSERIAL PRIMARY KEY,
    invoice_id  BIGINT NOT NULL REFERENCES electronic_invoices(id),
    event_type  VARCHAR(50) NOT NULL,                      -- 'sent','validated','rejected','acuse_recibo', etc.
    payload     JSONB,
    response    TEXT,
    status      VARCHAR(20) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Append-only — sin updates, sin delete
CREATE INDEX idx_invoice_events_invoice ON invoice_dian_events(invoice_id);
```

### 2.5 `invoice_contingency` — cola de contingencia

```sql
CREATE TABLE invoice_contingency (
    id              BIGSERIAL PRIMARY KEY,
    clinic_id       INTEGER NOT NULL REFERENCES clinics(id),
    invoice_id      BIGINT NOT NULL REFERENCES electronic_invoices(id),
    signed_xml      TEXT NOT NULL,                         -- XML firmado, listo para transmitir
    retry_count     INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    scheduled_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','done','failed')),
    error           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 3. Estructura de paquetes Go

Siguiendo el patrón de 3 capas del `DEVELOPMENT_GUIDE.md`:

```
internal/
├── domain/
│   └── invoice.go              ← structs GORM + interfaces Repository
│
├── invoicing/
│   └── service.go              ← casos de uso, DTOs, lógica de negocio
│
├── platform/
│   ├── storage/postgres/
│   │   ├── invoice_repository.go
│   │   └── numbering_resolution_repository.go
│   └── dian/
│       ├── transmitter.go      ← interfaz InvoiceTransmitter
│       ├── direct.go           ← implementación software propio (SOAP + firma)
│       ├── provider.go         ← implementación proveedor tecnológico (REST)
│       ├── cufe.go             ← algoritmo CUFE/CUDE SHA-384
│       ├── signer.go           ← XAdES-EPES firma digital
│       ├── ubl/
│       │   └── builder.go      ← construcción XML UBL 2.1
│       └── soap/
│           └── client.go       ← cliente SOAP WcfDianCustomerServices
│
└── transport/http/v1/
    └── handler_invoice.go      ← handlers Gin delgados
```

---

## 4. Interfaz InvoiceTransmitter

```go
// internal/platform/dian/transmitter.go

type TransmitResult struct {
    TrackID      string
    CUFE         string
    Status       string
    ResponseXML  string
    ValidatedAt  *time.Time
    Errors       []string
}

type InvoiceTransmitter interface {
    // Transmit sends a signed invoice to DIAN (or provider) and returns the CUFE + validation status.
    Transmit(ctx context.Context, invoiceXML []byte, env Environment) (*TransmitResult, error)

    // GetStatus polls validation status for a previously sent document.
    GetStatus(ctx context.Context, trackID string, env Environment) (*TransmitResult, error)

    // GetNumberingRange fetches the technical key (ClTec) for a numbering resolution.
    GetNumberingRange(ctx context.Context, prefix string, rangeFrom, rangeTo int, env Environment) (string, error)
}
```

---

## 5. Flujo de emisión de una factura

```
POST /api/v1/invoices (o trigger automático desde cierre de venta)
    │
    ▼
InvoiceService.Create(ctx, input)
    ├─ Validar que existe rango de numeración activo y no vencido
    ├─ Obtener siguiente consecutivo (atomic UPDATE ... RETURNING)
    ├─ Calcular CUFE (package dian/cufe)
    ├─ Construir XML UBL 2.1 (package dian/ubl)
    ├─ Firmar XML XAdES-EPES (package dian/signer)
    ├─ Persistir invoice con status = 'signed'
    │
    ├─ Transmitir a DIAN:
    │   ├─ OK → actualizar CUFE, dian_status = 'validated', dian_validated_at
    │   │         generar QR, generar PDF, status = 'validated'
    │   │         → return invoice con PDF
    │   └─ DIAN no disponible → invoice_contingency queue, status = 'contingency'
    │                           → return invoice (sin PDF hasta validación)
    │
    └─ Log en invoice_dian_events (append-only)
```

### 5.1 Consecutivo — operación atómica crítica

```sql
-- Nunca hacer en application code: SELECT + UPDATE separados (race condition)
-- Siempre usar UPDATE ... RETURNING:
UPDATE invoice_numbering_resolutions
   SET current_number = current_number + 1, updated_at = NOW()
 WHERE id = $1
   AND current_number < range_to
   AND valid_until >= CURRENT_DATE
   AND is_active = TRUE
RETURNING current_number - 1 AS assigned_number;
-- Si 0 rows → rango agotado o vencido → error de negocio
```

---

## 6. Ambiente y configuración

```env
# .env del backend — variables de facturación
DIAN_ENVIRONMENT=hab             # "hab" o "prod"
DIAN_SOFTWARE_ID=xxx             # ID asignado por DIAN al registrar el software
DIAN_SOFTWARE_PIN=xxx            # PIN del software
DIAN_CERT_PATH=/certs/firma.p12  # certificado PKCS#12
DIAN_CERT_PASSWORD=xxx

# Proveedor tecnológico (si aplica)
INVOICE_PROVIDER=direct          # "direct" (software propio) o "provider"
INVOICE_PROVIDER_API_URL=https://api.proveedor.com
INVOICE_PROVIDER_API_KEY=xxx
```

---

## 7. API REST (handlers)

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/v1/invoices` | Emitir una nueva factura o nota |
| `GET` | `/api/v1/invoices` | Listar facturas (con filtros por fecha, estado, tipo) |
| `GET` | `/api/v1/invoices/:id` | Ver detalle de una factura |
| `GET` | `/api/v1/invoices/:id/pdf` | Descargar representación gráfica |
| `POST` | `/api/v1/invoices/:id/credit-note` | Emitir nota crédito sobre una factura |
| `POST` | `/api/v1/invoices/:id/debit-note` | Emitir nota débito sobre una factura |
| `POST` | `/api/v1/invoices/resync` | (Admin) reintentar facturas en contingencia |
| `GET` | `/api/v1/numbering-resolutions` | Listar rangos de numeración |
| `POST` | `/api/v1/numbering-resolutions` | Registrar un nuevo rango |

RBAC: emisión solo para `admin` y `receptionist`; consulta para todos los roles.

---

## 8. Roadmap de implementación (fases)

### Fase A — MVP (obligatorio, ~4 semanas si proveedor / ~10–14 semanas si software propio)

- [ ] Modelo de datos: migración SQL para las 5 tablas
- [ ] `domain/invoice.go` — structs + interfaces
- [ ] `invoicing/service.go` — lógica CUFE, validación de rango, flujo de emisión
- [ ] `platform/dian/` — cliente (directo o proveedor según decisión)
- [ ] `handler_invoice.go` + rutas + RBAC
- [ ] Frontend: página de emisión de factura desde una venta completada
- [ ] Frontend: listado de facturas con estado DIAN + descarga PDF
- [ ] Habilitación DIAN + set de pruebas + rangos producción
- [ ] Campo `iva_treatment` en catálogo de productos + UI de configuración

### Fase B — Completar (semanas 5–8)

- [ ] Notas crédito / débito (interfaz + flujo backend + frontend)
- [ ] Tiquete POS electrónico (documento equivalente)
- [ ] Cola de contingencia + worker de reenvío automático
- [ ] Alertas: rango próximo a agotarse, certificado próximo a vencer
- [ ] Exportación de reportes para contabilidad

### Fase C — Salud (solo si se factura a aseguradoras)

- [ ] Integración MinSalud API Docker (RIPS JSON + FEV → CUV)
- [ ] Módulo RIPS: construcción del JSON desde los datos de la consulta
- [ ] Flujo FEV en salud: DIAN → MinSalud → CUV
- [ ] Frontend: panel de estado RIPS por factura

---

## 9. Consideraciones multi-tenant

🔵 Convision es multi-tenant por schema PostgreSQL. Las tablas de facturación viven en el schema
del tenant (óptica). Cada óptica tiene:
- Sus propios rangos de numeración (distintos NIT, distintos prefijos).
- Su propio certificado de firma digital.
- Su propio ID de software en DIAN.

El `clinic_id` en todas las tablas es el identificador dentro del schema del tenant. La clave
del software propio DIAN se almacena en la configuración del tenant (encriptada), no en variables
de entorno globales.

```go
// InvoiceConfig por tenant — almacenar en tabla de configuración del tenant, encriptada
type TenantInvoiceConfig struct {
    DianEnvironment   string // "hab" | "prod"
    DianSoftwareID    string
    DianSoftwarePIN   string
    CertPath          string // o S3 key al .p12
    CertPassword      string // encriptado con KMS/Vault
    InvoiceProvider   string // "direct" | "provider"
    ProviderAPIURL    string
    ProviderAPIKey    string // encriptado
}
```

---

## 10. Checklist pre-go-live

- [ ] Certificado de firma digital obtenido (CA acreditada ONAC) y cargado
- [ ] Registro en portal DIAN habilitación — modo "software propio" — ID de SW asignado
- [ ] Set de pruebas enviado y aprobado (estado "Habilitado")
- [ ] Fecha de inicio de facturación registrada (actualiza RUT)
- [ ] Rango de numeración producción solicitado y recibido
- [ ] `ClTec` del rango cargada en `invoice_numbering_resolutions`
- [ ] Prueba de extremo a extremo en producción: 1 factura real, validada, QR escaneado, consumidor final verifica en DIAN
- [ ] Alerta de certificado por vencer configurada (90 días antes)
- [ ] Alerta de rango por agotarse configurada (< 10% del rango disponible)
- [ ] Proceso de contingencia documentado y probado (simular outage DIAN)
- [ ] Campo `iva_treatment` configurado en todos los SKUs del catálogo
