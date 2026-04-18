# Convision — Archivo Maestro de Lógica de Negocio

> **Propósito:** Este documento describe las relaciones entre módulos y las reglas de negocio que los conectan.  
> Es la referencia canónica para agentes que implementen o extiendan funcionalidad en `convision-api-golang/`.  
> Leer ANTES de implementar cualquier feature nueva.

---

## Tabla de Contenidos

1. [Mapa de Entidades y Relaciones](#1-mapa-de-entidades-y-relaciones)
2. [Flujo Clínico Central](#2-flujo-clínico-central)
3. [Flujo Comercial](#3-flujo-comercial)
4. [Flujo de Laboratorio](#4-flujo-de-laboratorio)
5. [Flujo Financiero](#5-flujo-financiero)
6. [Módulo de Caja (Cash Register)](#6-módulo-de-caja-cash-register)
7. [Descuentos sobre Productos](#7-descuentos-sobre-productos)
8. [Inventario](#8-inventario)
9. [Módulos de Soporte](#9-módulos-de-soporte)
10. [Reglas de Autorización por Rol](#10-reglas-de-autorización-por-rol)
11. [Inconsistencias Conocidas entre Laravel y el Modelo de Datos](#11-inconsistencias-conocidas-entre-laravel-y-el-modelo-de-datos)
12. [Reglas Globales de Negocio](#12-reglas-globales-de-negocio)

---

## 1. Mapa de Entidades y Relaciones

```
users (roles: admin | specialist | receptionist | laboratory)
│
├── crea → appointments
│     └── tiene → prescription (1:1)
│     └── tiene → clinical_evolutions (1:N)
│     └── referencia → clinical_histories (via patient_id)
│
├── crea → sales
│     ├── tiene → sale_items (N:N via products)
│     ├── tiene → sale_payments (N:M payment_methods)
│     ├── referencia → orders (1:1, cuando la venta proviene de una orden)
│     ├── referencia → appointments (1:1, cuando la venta cierra una cita)
│     └── genera → laboratory_orders (si contains_lenses=true o laboratory_id presente)
│
├── crea → orders (órdenes de venta con productos)
│     ├── tiene → order_items (N:N via products)
│     ├── referencia → appointments (1:1 opcional)
│     └── referencia → laboratories (1:1 opcional)
│
├── crea → quotes
│     ├── tiene → quote_items (N:N via products)
│     └── convierte → sale (via /quotes/{id}/convert)
│
├── crea → purchases (compras a proveedores)
│     ├── tiene → purchase_items (N:N via products)
│     └── tiene → purchase_payments (N:M payment_methods)
│
├── crea → expenses
│     └── referencia → suppliers, payment_methods
│
├── crea → payrolls
├── crea → cash_transfers
├── crea → cash_register_closes
│     ├── tiene → cash_register_close_payments (por método de pago contado)
│     ├── tiene → cash_count_denominations (billetes y monedas)
│     └── tiene → cash_register_close_actual_payments (registrado por admin)
│
└── tiene → notes [polimórfico sobre products y appointments]

patients
│
├── tiene → appointments (N)
├── tiene → clinical_histories (1:1 efectivo, aunque es 1:N en DB)
├── tiene → sales (N)
├── tiene → orders (N)
├── tiene → quotes (N)
├── tiene → laboratory_orders (N)
└── tiene → discount_requests (N, descuentos personalizados)

products (lentes, monturas, lentes de contacto)
│
├── tiene → product_lens_attributes (1:1 opcional, solo lentes)
├── tiene → product_frame_attributes (1:1 opcional, solo monturas)
├── tiene → product_contact_lens_attributes (1:1 opcional, solo lentes de contacto)
├── pertenece → product_categories, brands, suppliers
├── referencia → lens_types, materials, lens_classes, treatments, photochromics (via lens_attributes)
├── tiene → inventory_items (N, por ubicación)
├── tiene → discount_requests (N)
└── tiene → notes [polimórfico como "lenses"]

suppliers
├── tiene → purchases (N)
├── tiene → expenses (N)
├── tiene → service_orders (N)
└── tiene → products (N, via supplier_id en products)

laboratories
└── tiene → laboratory_orders (N)
    └── tiene → laboratory_order_status_history (N)
```

---

## 2. Flujo Clínico Central

### Secuencia completa de atención al paciente

```
1. REGISTRO DEL PACIENTE (receptionist | admin)
   POST /api/v1/patients
   → Registrar datos personales, EPS, tipo ID, dirección geográfica (country→department→city→district)
   → El paciente puede existir antes sin cita previa

2. AGENDAMIENTO DE CITA (receptionist | admin)
   POST /api/v1/appointments
   Reglas:
   - scheduled_at DEBE ser en el futuro
   - specialist_id es nullable (se puede agendar sin especialista asignado)
   - receptionist_id se asigna automáticamente al usuario autenticado
   - Status inicial: "scheduled"

3. TOMA DE CITA (specialist ONLY)
   POST /api/v1/appointments/{id}/take
   Reglas de negocio CRÍTICAS:
   - Solo el rol "specialist" puede ejecutar esta acción
   - El especialista NO puede tener otra cita "in_progress" al mismo tiempo
   - Si ya tiene una cita en progreso → Error 409 con { "appointment_in_progress_id": <id> }
   - Campos que se actualizan: status="in_progress", taken_by_id=auth.user.id, taken_at=now()

4. PAUSA DE CITA (specialist que tomó la cita)
   POST /api/v1/appointments/{id}/pause
   Reglas:
   - Solo si status == "in_progress"
   - Solo el especialista que tomó la cita puede pausarla (taken_by_id == auth.user.id)
   - status → "paused", paused_at=now()

5. REANUDACIÓN DE CITA (specialist que pausó)
   POST /api/v1/appointments/{id}/resume
   Reglas:
   - Solo si status == "paused"
   - Solo el especialista que pausó puede reanudar (taken_by_id == auth.user.id)
   - No puede tener otra cita "in_progress" simultánea
   - status → "in_progress", resumed_at=now()

6. HISTORIA CLÍNICA (sin autenticación — ruta pública)
   POST /api/v1/clinical-histories
   ATENCIÓN: Esta ruta NO requiere JWT. En Go reproducir sin middleware de auth.
   Reglas:
   - Una historia clínica por paciente (aunque DB permite N, la lógica de negocio asume 1)
   - GET /api/v1/patients/{id}/clinical-history devuelve la historia del paciente

7. EVOLUCIONES CLÍNICAS (sin autenticación — ruta pública)
   POST /api/v1/clinical-evolutions
   Reglas:
   - Cada evolución referencia un appointment_id
   - SOAP format: subjective, objective, assessment, plan
   - Se cargan junto con la historia clínica en GET /api/v1/clinical-histories/{id}

8. PRESCRIPCIÓN ÓPTICA (auth:api, sin restricción de rol)
   POST /api/v1/prescriptions
   Reglas:
   - Puede existir sin appointment_id (prescripción directa)
   - Cuando appointment_id presente: la prescripción queda ligada a la cita
   - Datos ópticos: sphere, cylinder, axis, addition, height, distance_p, visual acuity
     para ojo derecho (right_*) e izquierdo (left_*)
   - El appointment.prescription se carga en el AppointmentResource via eager loading

9. ANOTACIONES (auth:api)
   POST /api/v1/appointments/{id}/annotations  → notas generales + paths SVG de ojos
   POST /api/v1/appointments/{id}/lens-annotation → imagen de anotación de lente (specialist only)
   POST /api/v1/prescriptions/{id}/annotation → imagen de anotación de prescripción
```

### Máquina de estados de Appointment

```
scheduled ──[take]──→ in_progress ──[pause]──→ paused ──[resume]──→ in_progress
    │                      │                                               │
    │                   [complete]                                      [complete]
    │                      ↓                                               ↓
    └──[cancel]──→  cancelled              completed ←────────────────────┘
```

**Regla de eliminación:**  
- Citas `completed` o `in_progress` NO pueden eliminarse.  
- Solo `scheduled`, `paused`, `cancelled` pueden eliminarse.

---

## 3. Flujo Comercial

### A. Cotizaciones → Órdenes → Ventas

```
COTIZACIÓN (quote) [receptionist | admin]
│  status: draft → sent → accepted | rejected | expired | converted
│  POST /api/v1/quotes
│  Reglas:
│  - items.price viene del frontend; se recalcula subtotal server-side
│  - Si product_id existe, se consulta descuento activo para el paciente
│  - expiration_date nullable; si vence no se puede convertir
│
└──[POST /api/v1/quotes/{id}/convert]──→ ORDEN (order)
        Reglas de conversión:
        - Solo status "pending" o "approved" pueden convertirse (INCONSISTENCIA: en código dice
          STATUS_PENDING y STATUS_APPROVED; en la MD dice "draft" y "accepted" — usar el código)
        - Si expiration_date pasó → Error 422 "La cotización ha expirado"
        - quote.status → "converted" tras la conversión exitosa
        - Crea una Order con los mismos items de la Quote

ORDEN (order) [auth:api]
│  status: pending → in_progress → completed | cancelled
│  payment_status: pending → partial → paid
│  POST /api/v1/orders
│  Reglas:
│  - Los precios se calculan server-side desde product.price (con descuento si aplica)
│  - Si laboratory_id presente → la orden está asociada a un lab
│  - POST /api/v1/orders/{id}/status — transición manual de status
│  - POST /api/v1/orders/{id}/payment-status — transición manual de payment_status
│
└──[se referencia en]──→ VENTA (sale) via sale.order_id

VENTA (sale) [auth:api]
   status: pending → completed | cancelled | refunded
   payment_status: pending → partial → paid
   POST /api/v1/sales
   Reglas de negocio CRÍTICAS al crear una venta:
   1. Se genera sale_number único (auto-incremental formateado)
   2. Se procesan los payments[] → se crean sale_payments
   3. Se recalcula el balance y payment_status según suma de pagos vs total
   4. Si order_id presente → se actualiza order.payment_status para mantener paridad
   5. Si appointment_id presente → appointment.is_billed se marca como true
   6. Si laboratory_id o contains_lenses=true → se crea automáticamente un LaboratoryOrder
   7. Transacción DB: si falla cualquier paso, rollback completo

   Pagos parciales (partial_payments):
   - POST /api/v1/sales/{id}/payments → agrega un pago adicional
   - DELETE /api/v1/sales/{id}/payments/{paymentId} → elimina un pago
   - Al modificar pagos, se recalcula sale.payment_status automáticamente
   - Si sale tiene order → order.payment_status se sincroniza

   Ajuste de precio de lente (SaleLensPriceAdjustment):
   - Solo AUMENTAR precio respecto al precio base (never discount via this flow)
   - Un solo ajuste por lens+sale
   - Para REDUCIR precio → usar el flujo de discount_requests
```

### B. Cálculo de Totales

```
Ventas:
  subtotal = sum(item.price * item.quantity)
  total = subtotal + tax - discount
  balance = total - sum(payments.amount)
  payment_status:
    balance == 0 → "paid"
    0 < balance < total → "partial"
    balance == total → "pending"

Cotizaciones:
  item.total = (item.price * item.quantity) - item.discount_amount
  subtotal = sum(item.total)
  tax_amount = subtotal * (tax_percentage / 100)
  total = subtotal + tax_amount - discount_amount

Nómina (Payroll) — servidor calcula:
  overtime_amount = overtime_hours * overtime_rate
  gross_salary = base_salary + overtime_amount + bonuses + commissions + other_income
  total_deductions = health_deduction + pension_deduction + tax_deduction + other_deductions
  net_salary = gross_salary - total_deductions

Compras (Purchase) — servidor calcula:
  item.total = item.subtotal + item.tax_amount
  purchase.total_amount = sum(items.total) - retention_amount
  purchase.balance = total_amount - payment_amount
  payment_status: igual que ventas (pending/partial/paid)
```

### C. Generación de PDFs y Tokens Guest

Todos los documentos (ventas, órdenes, cotizaciones, historias clínicas, órdenes de laboratorio) pueden descargarse como PDF sin autenticación mediante tokens temporales:

```
Generación (endpoint autenticado):
  GET /api/v1/sales/{id}/pdf-token → { token, url }
  Token = Crypt::encrypt({ type: "sale_pdf", id, expires_at: +24h })

Descarga (endpoint público — sin JWT):
  GET /api/v1/guest/sales/{id}/pdf?token=<token>
  Validaciones:
  1. Descifrar token con APP_KEY (AES-256-CBC)
  2. expires_at en el futuro
  3. type coincide con la ruta
  4. id coincide con route param
  → Retorna binario application/pdf

En Go: usar crypto/aes + "iv"/"value"/"mac" fields del ciphertext JSON base64.
```

---

## 4. Flujo de Laboratorio

```
LABORATORIO (laboratory) — catálogo simple de labs externos
  CRUD en /api/v1/laboratories

ORDEN DE LABORATORIO (laboratory_order)
│  status: pending → in_process → sent_to_lab → ready_for_delivery → delivered | cancelled
│  priority: low | normal | high | urgent
│
│  Creación automática (desde SaleService.createSale):
│    - Si sale.laboratory_id != null O sale.contains_lenses == true
│    - Se crea automáticamente con patient_id y sale_id del sale
│    - status inicial: "pending"
│
│  Creación manual:
│    POST /api/v1/laboratory-orders
│    - Puede referenciar order_id (órden de venta) y/o sale_id
│    - laboratory_id REQUIRED
│    - patient_id REQUIRED
│
│  Cambio de status:
│    POST /api/v1/laboratory-orders/{id}/status
│    { status, notes } → agrega entrada en laboratory_order_statuses (historial)
│
└──[PDF]── GET /api/v1/guest/laboratory-orders/{id}/pdf?token=<token>
           GET /api/v1/guest/orders/{id}/laboratory-pdf?token=<token>

Reglas de negocio:
- Un LaboratoryOrder tiene historial de status en tabla laboratory_order_statuses
- Cada cambio de status se registra con notas (auditoría)
- El PDF de laboratorio se genera separado del PDF de venta/orden
```

---

## 5. Flujo Financiero

### Compras a Proveedores (Purchases)

```
POST /api/v1/purchases
- Requiere supplier_id (Proveedor existente)
- invoice_number ÚNICO por proveedor (validar unicidad)
- items[] contienen product_id (opcional), descripción, cantidad, precio unitario
- payments[] opcionales al crear; pueden agregarse después vía:
  POST /api/v1/purchases/{id}/payments

Cálculo de balance:
- balance = total_amount - payment_amount
- payment_status: pending/partial/paid (misma lógica que sales)

Visualización unificada de cuentas por pagar:
GET /api/v1/supplier-payables
- Devuelve un JOIN virtual de purchases + expenses con balance > 0
- Permite filtrar por supplier_id y status
```

### Gastos (Expenses)

```
POST /api/v1/expenses
- Gasto directo a un proveedor (supplier_id REQUIRED)
- payment_method_id: opcional (si se paga en el momento)
- payment_amount: cuánto se pagó ya al momento del registro
- balance = amount - payment_amount
- Pagos adicionales: POST /api/v1/expenses/{id}/payments

Aparece también en /api/v1/supplier-payables junto con purchases
```

### Nómina (Payroll)

```
POST /api/v1/payrolls
- NO vinculado a entidad User (no foreign key a users)
- employee_name, employee_identification como texto libre
- Cálculo server-side (ver fórmula en sección 3.B)
- POST /api/v1/payrolls/calculate → preview sin guardar
- status: pending → paid | cancelled
```

### Órdenes de Servicio (Service Orders)

```
POST /api/v1/service-orders
- Reparaciones/servicios realizados por un proveedor (supplier_id REQUIRED)
- customer_name/phone: texto libre (no foreign key a patients)
- estimated_cost vs actual_cost (final_cost en DB)
- priority: low | medium | high
- status: pending → in_progress → completed → delivered | cancelled
- Cambio de status: POST /api/v1/service-orders/{id}/status
  → Permite registrar actual_cost al completar
```

---

## 6. Módulo de Caja (Cash Register)

### Transferencias de Caja (Cash Transfers)

```
POST /api/v1/cash-transfers
- Movimiento interno de dinero entre cuentas/cajas
- origin_type / destination_type: texto libre ("caja", "banco", etc.)
- status: pending → approved | cancelled
- Aprobación: POST /api/v1/cash-transfers/{id}/approve (solo admin)
  → approved_by=auth.user.id, approved_at=now()
```

### Cierre de Caja (Cash Register Close)

Flujo completo del cierre diario por asesor:

```
STATUS: draft → submitted → approved | returned

1. CREAR CIERRE (asesor — non-admin)
   POST /api/v1/cash-register-closes
   {
     close_date,            // <= hoy
     payment_methods[],     // exactamente los métodos permitidos, con monto contado
     denominations[],       // desglose de billetes y monedas (opcional)
     advisor_notes
   }
   Métodos de pago PERMITIDOS (exactamente estos nombres):
   efectivo, voucher, bancolombia, daviplata, nequi, addi,
   sistecredito, anticipo, bono, pago_sistecredito

   Denominaciones PERMITIDAS (COP):
   100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50

   Server calcula:
   - denomination.subtotal = denomination * quantity
   - total_counted = sum(payment_methods.counted_amount)

   Solo editable en status="draft":
   PUT /api/v1/cash-register-closes/{id}

2. ENVIAR A REVISIÓN (asesor)
   POST /api/v1/cash-register-closes/{id}/submit
   status: draft → submitted

3. ADMIN REGISTRA ACTUALS (admin)
   POST /api/v1/cash-register-closes/{id}/record-actuals
   { actual_payments: [{ payment_method_name, actual_amount }] }
   → Registra en cash_register_close_actual_payments
   → Actualiza admin_actuals_recorded_at = now()
   PRERREQUISITO para aprobar.

4. APROBAR (admin only)
   POST /api/v1/cash-register-closes/{id}/approve
   Prerequisito: admin_actuals_recorded_at != null
   status: submitted → approved

5. DEVOLVER (admin only)
   POST /api/v1/cash-register-closes/{id}/return
   status: submitted → returned (asesor debe corregir y reenviar)

Visibilidad por rol:
- admin: ve TODOS los cierres
- non-admin: ve SOLO sus propios cierres (filtrado por user_id)
```

---

## 7. Descuentos sobre Productos

### Flujo de Solicitud y Aprobación

```
SOLICITAR DESCUENTO (cualquier rol autenticado)
POST /api/v1/discount-requests
{
  product_id,          // REQUIRED
  patient_id,          // nullable → descuento personalizado para un paciente
  discount_percentage, // 0.01–100
  reason,
  expiry_date,
  is_global: false     // si true, patient_id se ignora (aplica a todos)
}
status inicial: "pending"

APROBAR (admin — regla de negocio, no siempre middleware explícito)
POST /api/v1/discount-requests/{id}/approve
{ approval_notes, expiry_date }
→ status="approved", approved_at=now(), approver_id=auth.user.id

RECHAZAR
POST /api/v1/discount-requests/{id}/reject
{ rejection_reason }
→ status="rejected"

CONSULTAR DESCUENTOS ACTIVOS
GET /api/v1/active-discounts?product_id=1&patient_id=5
→ Descuentos aprobados + no expirados
→ En frontend: se usa para calcular precio final antes de agregar al carrito
```

### Reglas de Aplicación de Descuentos

```
Prioridad (orden de consulta en ProductDiscountService):
1. Descuento activo para product_id + patient_id específico
2. Descuento global activo para product_id (is_global=true)
3. Sin descuento → precio base del producto

Ajuste de precio hacia arriba (SaleLensPriceAdjustment):
- Solo se puede AUMENTAR el precio respecto al base (no reducir)
- Un ajuste por producto por venta
- El descuento va por discount_requests, el ajuste por SaleLensPriceAdjustment
- Son mutuamente excluyentes por diseño

Precio efectivo de un lente en una venta:
  LensPricingService.getEffectivePrice(sale, lens):
    if sale.lensPriceAdjustments donde lens_id == lens.id existe:
      return adjustment.adjusted_price
    else:
      return lens.price  // precio base (sin descuento aplicado desde este servicio)
```

---

## 8. Inventario

```
Jerarquía: Warehouse → WarehouseLocation → InventoryItem → Product

RESTRICCIONES:
- Una combinación product_id + warehouse_location_id debe ser ÚNICA
- warehouse_location_id DEBE pertenecer al warehouse_id indicado (validación server-side)
- status del ítem: available | reserved | damaged | sold | returned | lost

TRANSFERENCIAS (InventoryTransfer):
POST /api/v1/inventory-transfers
- Mueve stock de una location a otra
- Registra origin_location_id, destination_location_id, quantity, notes
- Server: descuenta de origen y agrega en destino dentro de una transacción DB

STOCK TOTAL:
GET /api/v1/inventory/total-stock → sum de quantity por categoría
GET /api/v1/products/{id}/stock → desglose por location
GET /api/v1/products/{id}/inventory-summary → resumen para el producto

RELACIÓN CON VENTAS:
- Cuando se vende un producto, el inventario NO se descuenta automáticamente
  (en Laravel no hay trigger automático de stock en SaleService).
- El control de inventario es manual vía inventory-items y inventory-transfers.
```

---

## 9. Módulos de Soporte

### Notas Polimórficas (Notes)

```
Entidades que soportan notas:
  - "lenses" → App\Models\Product (naming legacy)
  - "appointments" → App\Models\Appointment

Endpoints:
  GET  /api/v1/{type}/{id}/notes
  POST /api/v1/{type}/{id}/notes
  { content: "string" }

En Go: notable_type almacena el nombre completo del modelo Laravel.
Al migrar, mapear a los tipos Go equivalentes o usar strings constantes.
```

### Notificaciones Admin (Admin Notifications)

```
Solo accesible por rol "admin".
Ciclo de vida: unread → read → archived
No hay creación desde el API (se crean internamente desde observers/events de Laravel).
En Go: implementar solo los endpoints PATCH (read/unread/archive/unarchive) y DELETE.
La creación de notificaciones debe ocurrir en observers de los servicios correspondientes.
```

### Informes de Actividad Diaria (Daily Activity Reports)

```
Llenado por asesores (non-admin).
Admin puede solo leer (no crear/editar).
Campos: conteos de atención (preguntas, cotizaciones, consultas) por género/edad,
        operaciones (bonos, órdenes, entregas), métricas de redes sociales.
Endpoint especial:
  POST /api/v1/daily-activity-reports/quick-attention
  { field: "preguntas_hombre" }
  → Encuentra o crea el reporte de HOY para el usuario auth, incrementa el campo +1
```

### Catálogos de Lookup (Locations)

```
Jerarquía geográfica para el campo dirección de pacientes:
  countries → departments (por country_id) → cities (por department_id) → districts (por city_id)

Endpoints: GET /api/v1/lookup/{countries|departments|cities|districts}
Autenticación: auth:api

Catálogos de pacientes:
  identification_types, health_insurance_providers, affiliation_types,
  coverage_types, education_levels
  → Todos devueltos en GET /api/v1/lookup/* (PatientLookupController)
```

### Catálogos de Lentes (Catalog — 07)

```
Tablas de referencia para atributos de productos tipo "lens":
  brands, lens_types, materials, lens_classes, treatments, photochromics

Todos siguen el mismo patrón CRUD con paginación y filtros.
Son prerequisito para crear productos con lens_attributes.
Relación: product.product_lens_attributes.lens_type_id → lens_types.id
```

---

## 10. Reglas de Autorización por Rol

### Matriz de Acceso Detallada

| Módulo / Acción | admin | specialist | receptionist | laboratory |
|---|:---:|:---:|:---:|:---:|
| **Usuarios** — CRUD | ✓ | ✗ | ✗ | ✗ |
| **Pacientes** — leer | ✓ | ✓ | ✓ | ✗ |
| **Pacientes** — crear/editar/eliminar | ✓ | ✗ | ✓ | ✗ |
| **Citas** — listar/ver | ✓ | ✓ | ✓ | ✗ |
| **Citas** — crear/editar/cancelar | ✓ | ✓ | ✓ | ✗ |
| **Citas** — tomar (take) | ✗ | ✓ | ✗ | ✗ |
| **Citas** — pausa/reanudación | ✓ | ✓ | ✓ | ✗ |
| **Citas** — lens-annotation | ✗ | ✓ | ✗ | ✗ |
| **Historia clínica** — leer/crear/editar | sin auth | sin auth | sin auth | sin auth |
| **Prescripciones** — CRUD | ✓ | ✓ | ✓ | ✓ |
| **Ventas** — CRUD + pagos | ✓ | ✗ | ✓ | ✗ |
| **Cotizaciones** — CRUD + convertir | ✓ | ✗ | ✓ | ✗ |
| **Órdenes** — CRUD | ✓ | ✓ | ✓ | ✗ |
| **Laboratorios** — catálogo CRUD | ✓ | ✓ | ✓ | ✓ |
| **Órdenes de Lab** — CRUD | ✓ | ✓ | ✓ | ✓ |
| **Inventario** — CRUD | ✓ | ✗ | ✗ | ✗ |
| **Productos** — CRUD | ✓ | ✗ | ✗ | ✗ |
| **Catálogos** (brands, etc.) | ✓ | ✓ | ✓ | ✓ |
| **Descuentos** — solicitar | ✓ | ✓ | ✓ | ✗ |
| **Descuentos** — aprobar/rechazar | ✓ | ✗ | ✗ | ✗ |
| **Compras** | ✓ | ✗ | ✓ | ✗ |
| **Gastos** | ✓ | ✗ | ✓ | ✗ |
| **Nómina** | ✓ | ✗ | ✗ | ✗ |
| **Órdenes de servicio** | ✓ | ✗ | ✓ | ✗ |
| **Transferencias de caja** | ✓ | ✗ | ✓ | ✗ |
| **Cierre de caja** — crear/editar | ✗ | ✗ | ✓ (propio) | ✗ |
| **Cierre de caja** — ver todos | ✓ | ✗ | solo propio | ✗ |
| **Cierre de caja** — aprobar/rechazar | ✓ | ✗ | ✗ | ✗ |
| **Cierre de caja** — registrar actuals | ✓ | ✗ | ✗ | ✗ |
| **Notificaciones admin** | ✓ | ✗ | ✗ | ✗ |
| **Dashboard** | ✓ | ✓ | ✓ | ✓ |
| **Informe diario** — crear/editar | ✗ | ✓ | ✓ | ✓ |
| **Informe diario** — solo leer | ✓ | ✗ | ✗ | ✗ |
| **PDFs guest** (sin token válido) | sin auth | sin auth | sin auth | sin auth |

### Reglas especiales de visibilidad por rol

```
Especialistas:
- En listados de citas, ven SOLO sus propias citas (specialist_id == auth.user.id)
- Para TOMAR una cita: no puede tener otra "in_progress" simultánea
- Para PAUSAR/REANUDAR: solo si taken_by_id == auth.user.id

Recepcionistas:
- En cierres de caja: SOLO ven los cierres que ellos mismos crearon (user_id == auth.user.id)
- Pueden crear reportes de actividad diaria

Admin:
- Ve absolutamente todo sin filtros adicionales
- Es el único que puede APROBAR descuentos, cierres de caja, transferencias
```

---

## 11. Inconsistencias Conocidas entre Laravel y el Modelo de Datos

> Estas inconsistencias están documentadas y deben reproducirse EXACTAMENTE en Go para mantener compatibilidad con el frontend y los datos existentes.

### 1. health_insurance_id vs health_insurance_provider_id (Patients)

```
FormRequest valida:    "health_insurance_provider_id"
Columna en DB:         "health_insurance_id"
Ambas apuntan a:       health_insurance_providers.id

En Go:
  - JSON tag del input: `json:"health_insurance_provider_id"`
  - Columna GORM:       `gorm:"column:health_insurance_id"`
  - Recurso JSON:       mapear la columna al campo `health_insurance_provider_id`
```

### 2. brand_id en Products

```
StoreProductRequest: brand_id es "required|exists:brands,id"
Migración posterior:  alteró la columna a nullable en DB

En Go: mantener brand_id como REQUIRED en validación de input (paridad con Laravel),
       pero declararla nullable en el struct GORM (*uint).
```

### 3. Quote status en conversión

```
QuoteService.convertQuoteToOrder valida:
  status == STATUS_PENDING || status == STATUS_APPROVED

Las constantes de Quote model:
  STATUS_PENDING  = "pending"  (no "draft" como dice la MD)
  STATUS_APPROVED = "approved" (no "accepted" como dice la MD)

Usar los valores del código PHP, no los de la MD.
```

### 4. sale_items.lens_id = products.id (naming legacy)

```
En sale_items y quote_items, el campo se llama "lens_id" pero referencia products.id.
"lens" es un naming legacy de cuando solo se vendían lentes.
En Go: usar la columna "product_id" en el modelo pero aceptar "lens_id" en el JSON de entrada
       para compatibilidad con el frontend existente.
```

### 5. service_orders: columnas DB vs nombres en recurso

```
DB column           | Resource field name
--------------------|--------------------
description         | problem_description
final_cost          | actual_cost
estimated_delivery_date | deadline
```

### 6. ClinicalHistory: rutas sin autenticación

```
Laravel: clinical-histories y clinical-evolutions NO tienen middleware de auth en routes/api.php.
En Go: NO agregar middleware de autenticación a estas rutas aunque parezca un error.
Es una decisión de diseño (el sistema puede usarse en quioscos sin login para registrar evoluciones).
```

---

## 12. Reglas Globales de Negocio

### Transaccionalidad

Toda operación que toca múltiples tablas DEBE ejecutarse dentro de una transacción DB:
- Crear venta (sale + sale_items + sale_payments + laboratory_order + actualizar appointment)
- Crear compra (purchase + purchase_items + purchase_payments)
- Convertir cotización (quote.status + order + order_items)
- Cierre de caja (cash_register_close + payments + denominations + recalcular totales)
- Transferencia de inventario (decrementar origen + incrementar destino)

**En Go:** usar `db.Transaction(func(tx *gorm.DB) error { ... })` en el servicio (no en el handler ni en el repositorio).

### Numeración Automática de Documentos

Todos los documentos comerciales tienen un `*_number` generado server-side:
```
sale_number:      "VEN-001", "VEN-002", ...
order_number:     "ORD-001", ...
quote_number:     "COT-001", ...
lab_order_number: "LAB-001", ...
service_order:    "SRV-001", ...
cash_transfer:    "CT-001", ...
cash_register_close: auto (sin formato especial)
```
En Go: implementar con `SELECT MAX(id)` + format o con secuencia DB para evitar race conditions.

### Soft Deletes

Solo `patients` tiene soft delete explícito (`deleted_at`).  
Todos los demás modelos usan hard delete.  
El endpoint `POST /api/v1/patients/{id}/restore` reactiva pacientes eliminados.

### Filtrado Estándar (ApiFilterable)

El frontend envía filtros en formato:
```
?s_f=["field1","field2"]&s_v=["value1","value2"]&s_o=["LIKE","="]
```
Donde `s_f` = campos, `s_v` = valores, `s_o` = operadores.

En Go implementar en una función middleware de repositorio que parsee y aplique estos filtros de forma segura (sin interpolación de strings, siempre con parámetros bind).

### Relaciones Siempre Cargadas (Eager Loading)

Los siguientes recursos SIEMPRE cargan sus relaciones en el GET por ID:

| Recurso | Relaciones cargadas |
|---|---|
| Appointment | patient, specialist, receptionist, prescription, takenBy |
| Sale | patient, order, payments.paymentMethod, partialPayments, createdBy, laboratoryOrders, appointment |
| Order | patient, items.product, createdBy, appointment, laboratory |
| Quote | patient, items.product, createdBy |
| LaboratoryOrder | laboratory, patient, createdBy, order, sale, statusHistory |
| ClinicalHistory | patient, creator, updater, evolutions |
| InventoryItem | product, warehouse, warehouseLocation |
| Purchase | supplier, items, payments, createdBy |
| Expense | supplier, paymentMethod, createdBy |
| CashRegisterClose | payments, denominations, actualPayments, createdBy, approvedBy |

En listados paginados se cargan relaciones mínimas para performance (sin anidación profunda).

### Dashboard — Métricas Calculadas

```
GET /api/v1/dashboard/summary

monthly_sales.total:   SUM(sales.total) WHERE month(created_at) == current month
monthly_sales.count:   COUNT(sales) WHERE month == current month
monthly_patients.count: COUNT(patients) WHERE month(created_at) == current month
lab_orders.total:      COUNT(laboratory_orders)
lab_orders.pending:    COUNT(laboratory_orders) WHERE status="pending"
pending_balance.total: SUM(sales.balance) WHERE payment_status != "paid"

weekly_sales: agregado día a día de la semana actual (Lun-Dom)
  height_pct: (day_total / max_day_total) * 100
  is_current: day == today

recent_orders: últimas 5-10 orders con patient, product (del primer item), status, total
```

### Manejo de Errores HTTP por Tipo de Error de Dominio

```
ErrNotFound       → 404 { "message": "..." }
ErrConflict       → 409 { "message": "..." }
ErrUnauthorized   → 403 { "message": "..." }
ErrValidation     → 422 { "message": "..." }
ErrInternal       → 500 { "message": "internal server error" } (nunca exponer detalles)

Casos especiales:
AppointmentInProgressException → 409 {
  "message": "...",
  "appointment_in_progress_id": <id>  ← campo extra para que el frontend redirija
}

Auth fallida:
  Token inválido/ausente → 401 { "message": "Unauthenticated" }
  Rol insuficiente       → 403 { "message": "Unauthorized" }
```

---

> **Última actualización:** 2026-04-18  
> **Basado en:** `laravel_map/` (00 al 27) + análisis de `app/Services/` de `convision-api/`  
> **Para nuevas features:** leer primero el módulo MD correspondiente en `laravel_map/`, luego este archivo para entender las dependencias cruzadas.
