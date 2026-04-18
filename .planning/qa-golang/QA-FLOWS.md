# QA Flows — Go API (puerto 8001)

> Bitácora de pruebas de integración del API Go, orientada a validar compatibilidad con el frontend React.
> Actualizar este archivo después de cada turno QA.

---

## Información del entorno

| Variable | Valor |
|---|---|
| API Go | `http://localhost:8001` |
| API Laravel (referencia) | `http://localhost:8000` |
| Frontend | `http://localhost:4300` |
| Admin | `admin@convision.com` / `password` |
| Specialist | `abermudez@convision.com` / `password` |
| Receptionist | `vcastillo@convision.com` / `password` |
| Auth header | `Authorization: Bearer <access_token>` |
| Campo token en login | `.access_token` |

---

## Leyenda

| Símbolo | Significado |
|---|---|
| ⬜ | Sin probar |
| 🔄 | En progreso |
| ✅ | Verificado — compatible con front |
| 🟡 | Funciona pero con discrepancias menores |
| ❌ | Roto — bloquea el front |
| ⏭️ | No aplica / sin servicio en front |

---

## Grupo 1 — Auth & Usuarios

**Servicio front:** `auth.ts`, `userService.ts`

| ID | Flujo | Método | Endpoint | Estado | Hallazgos |
|---|---|---|---|---|---|
| F-001 | Login admin | POST | `/api/v1/auth/login` | ✅ | user.active=null (GOQA-007) |
| F-002 | Login specialist | POST | `/api/v1/auth/login` | ⬜ | |
| F-003 | Login receptionist | POST | `/api/v1/auth/login` | ⬜ | |
| F-004 | Login credencial inválida → 401 | POST | `/api/v1/auth/login` | ✅ | Retorna {"message": "Credenciales incorrectas"} (GOQA-006 resuelto) |
| F-005 | Refresh token | POST | `/api/v1/auth/refresh` | ✅ | incluye user |
| F-006 | Me (perfil del usuario autenticado) | GET | `/api/v1/auth/me` | ✅ | Retorna {"data": {...}} — getCurrentUser() funciona (GOQA-004 resuelto) |
| F-007 | Logout | POST | `/api/v1/auth/logout` | ✅ | HTTP 200 |
| F-008 | Listar usuarios (admin) | GET | `/api/v1/users` | ✅ | Incluye {"meta": {...}} — userService lee paginación correctamente (GOQA-005 resuelto) |
| F-009 | Crear usuario | POST | `/api/v1/users` | ✅ | HTTP 201 |
| F-010 | Actualizar usuario | PUT | `/api/v1/users/:id` | ✅ | HTTP 200 |
| F-011 | Eliminar usuario | DELETE | `/api/v1/users/:id` | ✅ | HTTP 204 |
| F-012 | Acceso a ruta admin con rol receptionist → 403 | GET | `/api/v1/users` | ✅ | HTTP 403 |

---

## Grupo 2 — Pacientes & Citas

**Servicio front:** `patientService.ts`, `patientLookupService.ts`, `appointmentsService.ts`

| ID | Flujo | Método | Endpoint | Estado | Hallazgos |
|---|---|---|---|---|---|
| F-020 | Listar pacientes | GET | `/api/v1/patients` | ✅ | GOQA-003 (shape menor) |
| F-021 | Crear paciente | POST | `/api/v1/patients` | ✅ | Campo es `first_name` (compatible con front) |
| F-022 | Obtener paciente | GET | `/api/v1/patients/:id` | ✅ | |
| F-023 | Actualizar paciente | PUT | `/api/v1/patients/:id` | ✅ | |
| F-024 | Eliminar paciente | DELETE | `/api/v1/patients/:id` | ✅ | |
| F-025 | Búsqueda de pacientes (s_f/s_v) | GET | `/api/v1/patients?s_f=...&s_v=...` | ✅ | Acepta `search` y `s_f/s_v` |
| F-026 | Listar citas | GET | `/api/v1/appointments` | 🟡 | GOQA-001: sin `meta` wrapper |
| F-027 | Crear cita | POST | `/api/v1/appointments` | ✅ | |
| F-028 | Actualizar estado cita | PUT | `/api/v1/appointments/:id` | 🟡 | GOQA-002: acepta status inválido |
| F-029 | Eliminar cita | DELETE | `/api/v1/appointments/:id` | ✅ | |
| F-030 | Citas de un paciente | GET | `/api/v1/patients/:id/appointments` | 🟡 | 404 — endpoint no implementado |

---

## Grupo 3 — Prescripciones & Historia Clínica

**Servicio front:** `prescriptionService.ts`, `clinicalHistoryService.ts`, `clinicalEvolutionService.ts`

| ID | Flujo | Método | Endpoint | Estado | Hallazgos |
|---|---|---|---|---|---|
| F-040 | Crear prescripción | POST | `/api/v1/prescriptions` | ✅ | API espera strings para sphere/cylinder (compatible con front) |
| F-041 | Listar prescripciones de paciente | GET | `/api/v1/patients/:id/prescriptions` | ❌ | Devuelve total=0 aunque existen prescripciones del paciente (GOQA-023) |
| F-042 | Listar todas las prescripciones | GET | `/api/v1/prescriptions` | ✅ | Paginado `{data[], current_page, last_page, per_page, total}` — s_f/s_v filter funciona |
| F-043 | Crear historia clínica | POST | `/api/v1/clinical-histories` | ✅ | HTTP 201; campos: `reason_for_consultation`, `diagnostic` |
| F-044 | Historia clínica de paciente | GET | `/api/v1/patients/:id/clinical-history` | ✅ | HTTP 200, devuelve objeto único con patient embebido |
| F-045 | Listar historias clínicas | GET | `/api/v1/clinical-histories` | ✅ | Paginado plano — front llama `/api/v1/patients/:id/clinical-history`, OK |
| F-046 | PDF historia clínica (guest) | GET | `/api/v1/guest/clinical-histories/:id/pdf?token=...` | ✅ | HTTP 403 con token inválido — correcto |

---

## Grupo 4 — Catálogo & Productos

**Servicio front:** `catalogService.ts`, `categoryService.ts`, `brandService.ts`, `productService.ts`, `lensService.ts`, `inventoryService.ts`

| ID | Flujo | Método | Endpoint | Estado | Hallazgos |
|---|---|---|---|---|---|
| F-060 | Listar categorías | GET | `/api/v1/categories` | ❌ | Endpoint 404 (GOQA-008) |
| F-061 | Crear categoría | POST | `/api/v1/categories` | ❌ | Endpoint 404 (GOQA-008) |
| F-062 | Listar marcas | GET | `/api/v1/brands` | ✅ | `{data[], current_page, last_page, per_page, total}` — sin meta |
| F-063 | Crear marca | POST | `/api/v1/brands` | ✅ | HTTP 201, devuelve `{id, name, description, ...}` |
| F-064 | Listar productos | GET | `/api/v1/products` | ✅ | `{data[], current_page, last_page, per_page, total}` |
| F-065 | Crear producto/lente | POST | `/api/v1/products` | ❌ | Requiere `identifier` (no documentado), `name` falta en response, `category_id` no mapea (GOQA-009) |
| F-066 | Actualizar producto | PUT | `/api/v1/products/:id` | 🟡 | HTTP 200 pero mismo shape issue que F-065 (GOQA-009) |
| F-067 | Listar inventario | GET | `/api/v1/inventory` | 🟡 | Endpoint 404 — no implementado |
| F-068 | Ajuste de inventario | POST | `/api/v1/inventory/adjust` | 🟡 | Endpoint 404 — no implementado |
| F-069 | Listar descuentos | GET | `/api/v1/discounts` | 🟡 | Endpoint 404 — no implementado (GOQA-011) |
| F-070 | Mejor descuento para lente+paciente | GET | `/api/v1/discounts/best` | 🟡 | Endpoint 404 — no implementado (GOQA-011) |

---

## Grupo 5 — Ventas & Cotizaciones

**Servicio front:** `saleService.ts`, `quoteService.ts`, `saleLensPriceAdjustmentService.ts`, `sessionPriceAdjustmentService.ts`

| ID | Flujo | Método | Endpoint | Estado | Hallazgos |
|---|---|---|---|---|---|
| F-080 | Listar ventas | GET | `/api/v1/sales` | ✅ | paginación plana (sin meta) — saleService.getSales() lee root, OK |
| F-081 | Crear venta | POST | `/api/v1/sales` | ✅ | GOQA-016 resuelto — HTTP 201 con wrapper {message,sale,pdf_url,pdf_token} |
| F-082 | Obtener venta | GET | `/api/v1/sales/:id` | ✅ | GOQA-015, GOQA-020 resueltos — HTTP 200 con {data: {...}} + payments[], laboratoryOrders[] |
| F-083 | PDF venta (token) | GET | `/api/v1/sales/:id/pdf-token` | ✅ | GOQA-017 resuelto — HTTP 200 con {data: {token, url}} |
| F-084 | PDF venta (guest) | GET | `/api/v1/guest/sales/:id/pdf?token=...` | ✅ | HTTP 403 con token inválido — correcto |
| F-085 | Listar cotizaciones | GET | `/api/v1/quotes` | ✅ | paginación plana — quoteService.getQuotes() lee root, OK |
| F-086 | Crear cotización | POST | `/api/v1/quotes` | ✅ | GOQA-018, GOQA-019 resueltos — HTTP 201 con expiration_date string + wrapper {message,quote,pdf_url,pdf_token} |
| F-087 | Convertir cotización a venta | POST | `/api/v1/quotes/:id/convert` | ✅ | HTTP 201, devuelve Sale; quoteService.convertToSale() lee response.data, OK |
| F-088 | PDF cotización (guest) | GET | `/api/v1/guest/quotes/:id/pdf?token=...` | ✅ | GOQA-022 resuelto — /quotes/:id/pdf-token existe con {data: {token, url}} |
| F-089 | Shape saleService vs response | — | comparación campos | ✅ | GOQA-021 resuelto — quote.tax/discount (no tax_amount/discount_amount); todos los wrappers OK |

---

## Grupo 6 — Órdenes & Laboratorio

**Servicio front:** `orderService.ts`, `laboratoryOrderService.ts`, `laboratoryService.ts`

| ID | Flujo | Método | Endpoint | Estado | Hallazgos |
|---|---|---|---|---|---|
| F-100 | Listar órdenes | GET | `/api/v1/orders` | ✅ | `{data[], total, current_page, per_page, last_page}`, tiene id/order_number/status |
| F-101 | Crear orden | POST | `/api/v1/orders` | ✅ | HTTP 201, devuelve orden con patient/items |
| F-102 | Obtener orden | GET | `/api/v1/orders/:id` | 🟡 | HTTP 200 pero falta `pdf_token`/`guest_pdf_url` esperados por orderService (GOQA-012) |
| F-103 | Actualizar estado orden | PUT | `/api/v1/orders/:id` | ✅ | HTTP 200, status actualizado |
| F-104 | PDF orden (guest) | GET | `/api/v1/guest/orders/:id/pdf?token=...` | ✅ | HTTP 403 con token inválido |
| F-105 | Listar laboratorios | GET | `/api/v1/laboratories` | 🟡 | HTTP 200 pero sin `meta` → laboratoryService.getLaboratoriesTable() lee total=0 (GOQA-013) |
| F-106 | Crear orden de laboratorio | POST | `/api/v1/laboratory-orders` | ✅ | HTTP 201, devuelve lab order con laboratory/patient |
| F-107 | Listar órdenes de laboratorio | GET | `/api/v1/laboratory-orders` | ✅ | HTTP 200, `{data[], ...}` |
| F-108 | Actualizar estado lab order | PUT | `/api/v1/laboratory-orders/:id` | ❌ | Devuelve `in_progress` pero front espera `in_process` (GOQA-014) |
| F-109 | PDF lab order (guest) | GET | `/api/v1/guest/laboratory-orders/:id/pdf?token=...` | ✅ | HTTP 403 con token inválido |

---

## Grupo 7 — Compras, Gastos & Proveedores

**Servicio front:** `purchaseService.ts`, `expenseService.ts`, `supplierService.ts`, `supplierPaymentsService.ts`

| ID | Flujo | Método | Endpoint | Estado | Hallazgos |
|---|---|---|---|---|---|
| F-120 | Listar proveedores | GET | `/api/v1/suppliers` | 🟡 | HTTP 200, paginado OK; retorna `city_id` (int) no `city` (string) — front muestra ciudad vacía (GOQA-024) |
| F-121 | Crear proveedor | POST | `/api/v1/suppliers` | 🟡 | HTTP 201; mismo problema `city_id` vs `city` (GOQA-024) |
| F-122 | Listar compras | GET | `/api/v1/purchases` | ✅ | HTTP 200, paginado plano con todos los campos de Purchase (subtotal, total_amount, payment_status, items) |
| F-123 | Crear compra | POST | `/api/v1/purchases` | ✅ | HTTP 201 con YYYY-MM-DD en purchase_date; requiere subtotal+total_amount (front los calcula — OK) |
| F-124 | Recibir compra | POST | `/api/v1/purchases/:id/receive` | 🟡 | HTTP 404 — endpoint no implementado (GOQA-025) |
| F-125 | Listar gastos | GET | `/api/v1/expenses` | ✅ | HTTP 200, paginado plano con todos los campos de Expense |
| F-126 | Crear gasto | POST | `/api/v1/expenses` | ✅ | HTTP 201; requiere invoice_number, concept, expense_date (matches front CreateExpenseData) |
| F-127 | Pagos a proveedores | GET | `/api/v1/supplier-payments` | 🟡 | HTTP 404 — endpoint no implementado (GOQA-026) |

---

## Grupo 8 — Nómina, Órdenes de Arreglo & Caja

**Servicio front:** `payrollService.ts`, `serviceOrderService.ts`, `cashTransferService.ts`, `cashRegisterCloseService.ts`

| ID | Flujo | Método | Endpoint | Estado | Hallazgos |
|---|---|---|---|---|---|
| F-140 | Listar nóminas | GET | `/api/v1/payrolls` | ✅ | Paginado OK {data[], total, current_page, per_page, last_page} |
| F-141 | Crear nómina | POST | `/api/v1/payrolls` | 🟡 | HTTP 201 pero sin wrapper `{data:}` → createPayroll() retorna undefined (GOQA-023) |
| F-142 | Listar órdenes de arreglo | GET | `/api/v1/service-orders` | ✅ | Paginado OK, fields correctos |
| F-143 | Crear orden de arreglo | POST | `/api/v1/service-orders` | 🟡 | HTTP 201, pero `problem_description`→`description` (GOQA-024); sin wrapper (GOQA-023) |
| F-144 | Listar transferencias de caja | GET | `/api/v1/cash-transfers` | ✅ | Paginado OK {data[], total, current_page, per_page, last_page} |
| F-145 | Crear transferencia | POST | `/api/v1/cash-transfers` | 🟡 | HTTP 201, shape muy diferente: from_account/concept vs origin_type/reason (GOQA-025) |
| F-146 | Aprobar transferencia | POST | `/api/v1/cash-transfers/:id/approve` | 🟡 | HTTP 200 status→approved OK, sin wrapper, mismo shape issue (GOQA-025) |
| F-147 | Cierre de caja | POST | `/api/v1/cash-register/close` | 🟡 | 404 — endpoint no implementado |
| F-148 | Historial de cierres | GET | `/api/v1/cash-register/history` | 🟡 | 404 — endpoint no implementado |

---

## Grupo 9 — Dashboard, Notificaciones & Actividad

**Servicio front:** `dashboardService.ts`, `adminNotificationService.ts`, `dailyActivityReportService.ts`

| ID | Flujo | Método | Endpoint | Estado | Hallazgos |
|---|---|---|---|---|---|
| F-160 | Resumen dashboard | GET | `/api/v1/dashboard/summary` | 🟡 | HTTP 200, keys OK pero métricas anidadas vs planas + campos faltantes (GOQA-026) |
| F-161 | Listar notificaciones | GET | `/api/v1/admin/notifications` | 🟡 | HTTP 200, pero sin `meta` ni `counts` → paginación/conteos siempre en 0 (GOQA-027) |
| F-162 | Resumen notificaciones | GET | `/api/v1/admin/notifications/summary` | ❌ | HTTP 200 pero sin wrapper `{data:}` → getSummary() undefined; key `total` vs `inbox` (GOQA-028) |
| F-163 | Marcar notificación leída | PATCH | `/api/v1/admin/notifications/:id/read` | 🟡 | Endpoint existe; 404 por ID sin datos. Sin `{data:}` wrapper esperado por markRead() (GOQA-028) |
| F-164 | Marcar todas leídas | PATCH | `/api/v1/admin/notifications/read-all` | 🟡 | HTTP 200 OK pero {message:...} en vez de {data:{updated:N}} → markAllRead() undefined (GOQA-029) |
| F-165 | Crear reporte diario | POST | `/api/v1/daily-activity-reports` | 🟡 | HTTP 201, pero respuesta plana vs nested {customer_attention, operations, social_media} (GOQA-030) |
| F-166 | Listar reportes diarios | GET | `/api/v1/daily-activity-reports` | 🟡 | HTTP 200, usa `page` en vez de `current_page`, falta `last_page` (GOQA-031); flat shape (GOQA-030) |
| F-167 | Quick attention | POST | `/api/v1/daily-activity-reports/quick-attention` | 🟡 | HTTP 200, contador incrementa correctamente, pero respuesta plana (GOQA-030) |

---

## Grupo 10 — Respuestas esperadas (shape validation)

Estos flujos validan que el **shape del JSON** que devuelve el Go API sea compatible con lo que el frontend TypeScript espera:

| ID | Validación | Estado | Hallazgos |
|---|---|---|---|
| SH-001 | Login response tiene `access_token`, `token_type`, `expires_in`, `user.role` | ✅ | |
| SH-002 | Lista paginada tiene `data[]`, `total`, `current_page`, `per_page`, `last_page` | ❌ | Campos en root, no en `meta` → userService.ts siempre lee 0/1 (GOQA-005) |
| SH-003 | Patient tiene `id`, `name`, `last_name`, `identification`, `email`, `phone` | ⬜ | |
| SH-004 | Sale tiene `id`, `total`, `status`, `items[]`, `patient`, `pdf_token` | ⬜ | |
| SH-005 | Quote tiene `id`, `total`, `status`, `items[]`, `patient`, `pdf_token` | ⬜ | |
| SH-006 | Order tiene `id`, `order_number`, `status`, `items[]`, `pdf_token`, `lab_pdf_token` | ⬜ | |
| SH-007 | Error 422 tiene `message` o `errors{}` (no `error`) | ⬜ | |
| SH-008 | Error 401/403 tiene `message` | 🟡 | Login 401 usa `error`, middleware usa `message` (GOQA-006) |
| SH-009 | Appointment tiene `id`, `patient_id`, `specialist_id`, `scheduled_at`, `status` | ⬜ | |
| SH-010 | Dashboard summary tiene `metrics`, `weekly_count`, `recent_orders[]` | ⬜ | |

---

## Hallazgos acumulados

> Llenar cuando el agente QA detecte discrepancias entre Go API y lo que espera el front.

### GOQA-001
- **Grupo:** Grupo 2 — Pacientes & Citas
- **Flujo ID:** F-026
- **Severidad:** mayor
- **Endpoint:** GET /api/v1/appointments
- **Esperado:** Response con wrapper `meta: { current_page, last_page, per_page, total }` — el front lee `body.meta ?? {}` para obtener paginación en `getReceptionistSalesQueueTable` y `getSpecialistTodayAgendaTable`
- **Observado:** `{"current_page":1,"data":[...],"last_page":1,"per_page":15,"total":1}` — paginación plana sin `meta`. Con Go API el front siempre calculará `last_page: 1` y `total: 0` (broken pagination)
- **Estado:** abierto

---

### GOQA-002
- **Grupo:** Grupo 2 — Pacientes & Citas
- **Flujo ID:** F-028
- **Severidad:** menor
- **Endpoint:** PUT /api/v1/appointments/:id
- **Esperado:** HTTP 422 al enviar `{"status":"confirmed"}` — `confirmed` no es un status válido (dominio: `scheduled|in_progress|paused|completed|cancelled`)
- **Observado:** HTTP 200 con `{"id":3,"status":"confirmed"}` — el campo `Status` en `UpdateInput` no tiene validación `binding:"oneof=..."`
- **Estado:** ✅ resuelto
- **Verificación:** internal/appointment/service.go UpdateInput (línea 37) ya tiene `binding:"omitempty,oneof=scheduled in_progress paused completed cancelled"`

---

### GOQA-003
- **Grupo:** Grupo 2 — Pacientes & Citas
- **Flujo ID:** F-020
- **Severidad:** menor
- **Endpoint:** GET /api/v1/patients y GET /api/v1/patients/:id
- **Esperado:** Campo `profile_image` en el objeto Patient (según interfaz TypeScript del front: `profile_image: string | null`)
- **Observado:** El Go API devuelve `profile_image_url` en lugar de `profile_image`. Cualquier componente que lea `patient.profile_image` recibirá `undefined`
- **Estado:** ✅ resuelto
- **Verificación:** internal/domain/patient.go (línea 33) `ProfileImage string `json:"profile_image"`` y handler.go (línea 387) `ProfileImageURL *string `json:"profile_image"`

---

### GOQA-004
- **Grupo:** Grupo 1 — Auth & Usuarios
- **Flujo ID:** F-006
- **Severidad:** mayor
- **Endpoint:** GET /api/v1/auth/me
- **Esperado:** `{"data": {"id":1,"name":"Carlos",...}}` — auth.ts hace `ApiService.get<{data:User}>('/api/v1/auth/me')` y `return response.data`
- **Observado:** `{"id":1,"name":"Carlos","email":"admin@convision.com","role":"admin",...}` — objeto directo sin wrapper `data`
- **Impacto:** `getCurrentUser()` retorna `undefined` → AuthContext pierde estado en recargas de página. Rompe la autenticación persistente.
- **Estado:** abierto

---

### GOQA-005
- **Grupo:** Grupo 1 — Auth & Usuarios / Grupo 10 — Shape validation
- **Flujo ID:** F-008, SH-002
- **Severidad:** mayor
- **Endpoint:** GET /api/v1/users (y posiblemente todos los listados paginados del Grupo 1)
- **Esperado:** `{"data":[], "meta": {"total":N, "last_page":N, "current_page":N, "per_page":N}}` — userService.ts lee `body.meta?.last_page ?? 1` y `body.meta?.total ?? 0`
- **Observado:** `{"data":[], "total":3, "last_page":1, "current_page":1, "per_page":15}` — paginación en root, sin `meta`
- **Impacto:** userService.ts siempre obtiene `last_page=1` y `total=0` (fallback). Paginación de usuarios rota. (Mismo patrón que GOQA-001 para appointments — problema sistémico)
- **Estado:** abierto

---

### GOQA-006
- **Grupo:** Grupo 1 — Auth & Usuarios / Grupo 10 — Shape validation
- **Flujo ID:** F-004, SH-008
- **Severidad:** menor
- **Endpoint:** POST /api/v1/auth/login (credencial inválida)
- **Esperado:** `{"message": "..."}` (clave `message` — consistente con el resto: middleware retorna `{"message":"unauthenticated"}`, 403 retorna `{"message":"forbidden: insufficient role"}`)
- **Observado:** `{"error": "Unauthorized"}` — clave `error` diferente al estándar
- **Impacto:** Si el front maneja errores buscando `error.response.data.message`, el mensaje de credencial inválida no se mostrará correctamente.
- **Estado:** abierto

---

### GOQA-007
- **Grupo:** Grupo 1 — Auth & Usuarios
- **Flujo ID:** F-001
- **Severidad:** menor
- **Endpoint:** POST /api/v1/auth/login
- **Esperado:** `user.active` = true/false (boolean) según copilot-instructions `user.{id,name,email,role,active}`
- **Observado:** `user.active` = null (campo ausente del modelo Go — dominio User no lo expone)
- **Impacto:** Bajo si el front no lo consume activamente; potencial si hay guards de `user.active`.
- **Estado:** ✅ resuelto
- **Verificación:** internal/domain/user.go (línea 20) `Active bool `json:"active"`` y handler.go UserResource (línea 47) incluye Active, toUserResource expone correctamente

---

### GOQA-008
- **Grupo:** Grupo 4 — Catálogo & Productos
- **Flujo ID:** F-060, F-061
- **Severidad:** bloqueante
- **Endpoint:** GET/POST `/api/v1/categories`
- **Esperado:** CRUD de categorías — el front (catalogService.ts) llama a este endpoint para poblar selectores en formularios de lentes/productos
- **Observado:** `404 page not found` — endpoint no registrado en el router Go
- **Estado:** abierto

---

### GOQA-009
- **Grupo:** Grupo 4 — Catálogo & Productos
- **Flujo ID:** F-065, F-066
- **Severidad:** mayor
- **Endpoint:** POST/PUT `/api/v1/products`
- **Esperado:** El front envía `{name, price, category_id, brand_id, stock}` y espera recibir `{id, name, price, category_id, brand_id, ...}` con campo `name` visible
- **Observado:** (1) POST requiere campo `identifier` no documentado (422 sin él). (2) El request field `category_id` se ignora → respuesta devuelve `product_category_id: null`. (3) El campo `name` enviado no aparece en el response (aparece como `description: ""` vacío). El front leerá `product.name = undefined` en listas.
- **Estado:** abierto

---

### GOQA-010
- **Grupo:** Grupo 4 — Catálogo & Productos
- **Flujo ID:** F-067, F-068
- **Severidad:** mayor
- **Endpoint:** GET `/api/v1/inventory`, POST `/api/v1/inventory/adjust`
- **Esperado:** Endpoints de inventario para ver stock y registrar ajustes
- **Observado:** `404 page not found` — endpoints no implementados en Go API
- **Estado:** abierto

---

### GOQA-011
- **Grupo:** Grupo 4 — Catálogo & Productos
- **Flujo ID:** F-069, F-070
- **Severidad:** mayor
- **Endpoint:** GET `/api/v1/discounts`, GET `/api/v1/discounts/best`
- **Esperado:** El front usa `discountService.getBestDiscount(lensId, patientId?)` y `calculateDiscountedPrice()` en el flujo de cotizaciones/ventas
- **Observado:** `404 page not found` — endpoints no implementados. Sin descuentos, el precio final siempre será el precio base (sin aplicar promos).
- **Estado:** abierto

---

### GOQA-012
- **Grupo:** Grupo 6 — Órdenes & Laboratorio
- **Flujo ID:** F-102
- **Severidad:** menor
- **Endpoint:** GET `/api/v1/orders/:id`
- **Esperado:** El response incluye `pdf_token`, `pdf_url`, `guest_pdf_url`, `laboratory_pdf_token`, `guest_lab_pdf_url` (según interfaz `Order` en orderService.ts)
- **Observado:** Response no contiene ninguno de esos campos PDF — solo datos de la orden. El botón de descarga PDF en el front no tendrá URL.
- **Estado:** abierto

---

### GOQA-013
- **Grupo:** Grupo 6 — Órdenes & Laboratorio
- **Flujo ID:** F-105
- **Severidad:** mayor
- **Endpoint:** GET `/api/v1/laboratories`
- **Esperado:** `{data[], meta: {last_page, total, current_page, per_page}}` — `laboratoryService.getLaboratoriesTable()` lee `body.meta?.last_page ?? 1` y `body.meta?.total ?? 0`
- **Observado:** `{data[], total:1, current_page:1, last_page:1, per_page:15}` — paginación en root sin `meta`. El front siempre reportará `total=0` y `last_page=1` en la tabla de laboratorios. (Mismo patrón sistémico que GOQA-005)
- **Estado:** abierto

---

### GOQA-014
- **Grupo:** Grupo 6 — Órdenes & Laboratorio
- **Flujo ID:** F-108
- **Severidad:** mayor
- **Endpoint:** PUT `/api/v1/laboratory-orders/:id`
- **Esperado:** Al enviar `{status:"in_progress"}` — el enum del front (laboratoryOrderService.ts) define `status: 'pending' | 'in_process' | 'sent_to_lab' | 'ready_for_delivery' | 'delivered' | 'cancelled'`
- **Observado:** El Go API acepta y devuelve `"in_progress"` (no existe en el enum TypeScript). El valor correcto del front es `"in_process"`. El componente frontend que renderice el badge de estado nunca mostrará el label correcto para este estado.
- **Estado:** ✅ resuelto
- **Verificación:** internal/domain/laboratory.go define correcto `LaboratoryOrderStatusInProcess = "in_process"` y internal/laboratory/service.go (línea 82) binding incluye `oneof=pending in_process sent_to_lab ...`

---

### GOQA-015
- **Grupo:** Grupo 5 — Ventas & Cotizaciones
- **Flujo ID:** F-082, F-089
- **Severidad:** bloqueante
- **Endpoint:** GET /api/v1/sales/:id
- **Esperado:** `{"data": <Sale>}` — `saleService.getSale()` hace `return response.data.data as Sale`
- **Observado:** ✅ **RESUELTO** — Respuesta correcta: `{"data": {...}}`. Handler devuelve `c.JSON(http.StatusOK, gin.H{"data": s})`
- **Estado:** resuelto

---

### GOQA-016
- **Grupo:** Grupo 5 — Ventas & Cotizaciones
- **Flujo ID:** F-081, F-089
- **Severidad:** bloqueante
- **Endpoint:** POST /api/v1/sales
- **Esperado:** `{"message":"...","sale":<Sale>,"pdf_url":"...","pdf_token":"..."}` — `saleService.createSale()` castea `response.data as SaleResponse`
- **Observado:** ✅ **RESUELTO** — HTTP 201 con respuesta correcta: `{"message", "sale", "pdf_url", "pdf_token"}`. Handler CreateSale genera pdf_token y devuelve wrapper correcto.
- **Estado:** resuelto

---

### GOQA-017
- **Grupo:** Grupo 5 — Ventas & Cotizaciones
- **Flujo ID:** F-083, F-089
- **Severidad:** bloqueante
- **Endpoint:** GET /api/v1/sales/:id/pdf-token
- **Esperado:** `{"data": {"token":"...","url":"..."}}` — `saleService.getPdfToken()` hace `return response.data.data` (espera `{token, url}`)
- **Observado:** ✅ **RESUELTO** — HTTP 200 con respuesta correcta: `{"data": {"token": "...", "url": "..."}}`. Handler GetSalePdfToken mapea pdf_token→token y guest_pdf_url→url.
- **Estado:** resuelto

---

### GOQA-018
- **Grupo:** Grupo 5 — Ventas & Cotizaciones
- **Flujo ID:** F-086
- **Severidad:** bloqueante
- **Endpoint:** POST /api/v1/quotes
- **Esperado:** Acepta `expiration_date` en formato `YYYY-MM-DD` (el front envía `"2026-05-31"` — tipo `string` en `CreateQuoteRequest`)
- **Observado:** ✅ **RESUELTO** — HTTP 201 con formato correcto. quote/service.go: CreateInput.ExpirationDate es `string`, parseado con `time.Parse("2006-01-02", input.ExpirationDate)`.
- **Estado:** resuelto

---

### GOQA-019
- **Grupo:** Grupo 5 — Ventas & Cotizaciones
- **Flujo ID:** F-086
- **Severidad:** mayor
- **Endpoint:** POST /api/v1/quotes
- **Esperado:** `{"message":"...","quote":<Quote>,"pdf_url":"...","pdf_token":"..."}` — `quoteService.createQuote()` castea `response.data as QuoteResponse`
- **Observado:** ✅ **RESUELTO** — HTTP 201 con respuesta correcta: `{"message", "quote", "pdf_url", "pdf_token"}`. Handler CreateQuote genera pdf_token y devuelve wrapper.
- **Estado:** resuelto

---

### GOQA-020
- **Grupo:** Grupo 5 — Ventas & Cotizaciones
- **Flujo ID:** F-082, F-089
- **Severidad:** mayor
- **Endpoint:** GET /api/v1/sales/:id
- **Esperado:** Sale incluye `payments: Payment[]`, `partialPayments: PartialPayment[]`, `laboratoryOrders: LaboratoryOrder[]`
- **Observado:** ✅ **RESUELTO** — Todos los campos están presentes como arrays. domain/sale.go incluye Payments, PartialPayments, LaboratoryOrders con json tags correctos. sale_repository.go usa Preload para cargar relaciones.
- **Estado:** resuelto

---

### GOQA-021
- **Grupo:** Grupo 5 — Ventas & Cotizaciones
- **Flujo ID:** F-085, F-086, F-087
- **Severidad:** mayor
- **Endpoint:** GET/POST /api/v1/quotes, GET /api/v1/quotes/:id
- **Esperado:** `Quote.discount` y `Quote.tax` (interfaz TypeScript del front)
- **Observado:** ✅ **RESUELTO** — domain/quote.go usa json tags correctos: `TaxAmount` → `json:"tax"`, `DiscountAmount` → `json:"discount"`. Response devuelve campos con nombres correctos.
- **Estado:** resuelto

---

### GOQA-022
- **Grupo:** Grupo 5 — Ventas & Cotizaciones
- **Flujo ID:** F-088
- **Severidad:** mayor
- **Endpoint:** GET /api/v1/quotes/:id/pdf-token
- **Esperado:** Endpoint análogo a `/api/v1/sales/:id/pdf-token` para obtener token de descarga de PDF de cotización
- **Observado:** ✅ **RESUELTO** — HTTP 200 con respuesta correcta: `{"data": {"token": "...", "url": "..."}}`. Handler GetQuotePdfToken existe en handler_quote.go y está registrado en routes.go.
- **Estado:** resuelto

---

### GOQA-023
- **Grupo:** Grupo 3 — Prescripciones & Historia Clínica
- **Flujo ID:** F-041
- **Severidad:** menor
- **Endpoint:** GET /api/v1/patients/:id/prescriptions
- **Esperado:** Lista paginada de prescripciones filtradas por patient_id — el endpoint existe y devuelve paginado
- **Observado:** `{"current_page":1,"data":[],"last_page":1,"per_page":15,"total":0}` aunque existen prescripciones con ese patient_id. `GET /api/v1/prescriptions?patient_id=1` sí devuelve total=1. El filtro por patient_id en la ruta anidada no funciona.
- **Impacto:** Bajo — el front no llama directamente a este endpoint (usa s_f/s_v filter en /api/v1/prescriptions). Sin embargo el endpoint es incorrecto.
- **Estado:** abierto

---

### GOQA-024
- **Grupo:** Grupo 7 — Compras, Gastos & Proveedores
- **Flujo ID:** F-120, F-121
- **Severidad:** menor
- **Endpoint:** GET /api/v1/suppliers, POST /api/v1/suppliers
- **Esperado:** Campo `city: string | null` — interfaz TypeScript `Supplier` del front tiene `city?: string | null`
- **Observado:** El Go API devuelve `city_id: null` (entero FK) en lugar de un campo `city: string`. El front leerá `supplier.city = undefined` (campo ausente) y no podrá mostrar la ciudad del proveedor.
- **Estado:** abierto

---

### GOQA-025
- **Grupo:** Grupo 7 — Compras, Gastos & Proveedores
- **Flujo ID:** F-124
- **Severidad:** mayor
- **Endpoint:** POST /api/v1/purchases/:id/receive
- **Esperado:** Cambia el estado de la compra a `received` / actualiza inventario
- **Observado:** `404 page not found` — la ruta no está registrada en el router Go. El front tiene un flujo de "recibir compra" que llamará este endpoint y siempre fallará.
- **Estado:** abierto

---

### GOQA-026
- **Grupo:** Grupo 7 — Compras, Gastos & Proveedores
- **Flujo ID:** F-127
- **Severidad:** mayor
- **Endpoint:** GET /api/v1/supplier-payments
- **Esperado:** Lista paginada de pagos a proveedores — el front tiene `supplierPaymentsService.ts`
- **Observado:** `404 page not found` — endpoint no implementado en Go API. La sección de pagos a proveedores del front quedará con pantalla en blanco o error.
- **Estado:** abierto

---

### GOQA-027
- **Grupo:** Grupo 8 — Nómina & Órdenes de Arreglo
- **Flujo ID:** F-141, F-143
- **Severidad:** mayor
- **Endpoint:** POST /api/v1/payrolls, POST /api/v1/service-orders
- **Esperado:** `{"data": <objeto>}` — `payrollService.createPayroll()` y `serviceOrderService.createServiceOrder()` leen `response.data.data`
- **Observado:** Response es el objeto directo sin wrapper `data`. Ambos métodos retornan `undefined`. El formulario de creación no recibe la entidad creada.
- **Estado:** abierto

---

### GOQA-028
- **Grupo:** Grupo 8 — Órdenes de Arreglo
- **Flujo ID:** F-143
- **Severidad:** mayor
- **Endpoint:** POST/GET /api/v1/service-orders
- **Esperado:** Campo `problem_description` — interfaz TypeScript `ServiceOrder` define `problem_description: string`
- **Observado:** El Go API devuelve el campo como `description` (JSON tag distinto al nombre del campo del front). `serviceOrder.problem_description` → `undefined`. Tarjetas y tablas no mostrarán la descripción del problema.
- **Estado:** abierto

---

### GOQA-029
- **Grupo:** Grupo 8 — Transferencias de Caja
- **Flujo ID:** F-145, F-146
- **Severidad:** bloqueante
- **Endpoint:** POST /api/v1/cash-transfers, POST /api/v1/cash-transfers/:id/approve
- **Esperado:** Shape `CashTransfer`: `{transfer_number, origin_type, origin_description, destination_type, destination_description, amount, reason, requested_by, approved_by, status}`; además `createCashTransfer()` y `approveCashTransfer()` leen `response.data.data`
- **Observado:** (1) Sin wrapper `{data:}` → ambos métodos retornan `undefined`. (2) Shape radicalmente diferente: `from_account` (string combinado) vs `origin_type`+`origin_description`; `to_account` vs `destination_type`+`destination_description`; `concept` vs `reason`; `created_by_user` vs `requested_by`; sin `approved_by`. El componente de transferencias mostrará todos los campos como `undefined`.
- **Estado:** abierto

---

### GOQA-030
- **Grupo:** Grupo 9 — Dashboard
- **Flujo ID:** F-160
- **Severidad:** mayor
- **Endpoint:** GET /api/v1/dashboard/summary
- **Esperado:** `metrics: {monthly_sales: number, monthly_sales_change: number|null, monthly_patients: number, monthly_patients_change: number|null, lab_orders_total: number, lab_orders_pending: number, pending_balance: number, pending_balance_count: number}`
- **Observado:** Las métricas son objetos anidados: `{monthly_sales: {total:0, count:7}, monthly_patients: {count:1}, lab_orders: {total:2, pending:1}, pending_balance: {total:0}}`. Faltan `monthly_sales_change`, `monthly_patients_change`, `pending_balance_count`. El dashboard mostrará `NaN` o `undefined` en todas las tarjetas de KPIs.
- **Estado:** abierto

---

### GOQA-031
- **Grupo:** Grupo 9 — Notificaciones
- **Flujo ID:** F-161
- **Severidad:** mayor
- **Endpoint:** GET /api/v1/admin/notifications
- **Esperado:** `{data[], counts: {all, unread, archived}, meta: {current_page, last_page, per_page, total}}` — `adminNotificationService.list()` lee `body.counts` y `body.meta`
- **Observado:** `{data[], total, page, per_page}` — sin `meta` ni `counts`. Front usa fallbacks `counts={all:0, unread:0, archived:0}` y `meta={current_page:1, last_page:1}`. Badge de no leídas siempre 0; filtros por tab sin conteos.
- **Estado:** abierto

---

### GOQA-032
- **Grupo:** Grupo 9 — Notificaciones
- **Flujo ID:** F-162, F-163
- **Severidad:** bloqueante
- **Endpoint:** GET /api/v1/admin/notifications/summary, PATCH /api/v1/admin/notifications/:id/read
- **Esperado:** `{"data": {unread: N, archived: N, inbox: N}}` — `getSummary()` y `markRead()` leen `res.data.data`
- **Observado:** `/summary` retorna `{unread:0, total:0, archived:0}` sin wrapper `data`. `getSummary()` retorna `undefined` → badge del header siempre 0. Key `total` en vez de `inbox`. `/notifications/:id/read` probablemente igual (sin wrapper).
- **Estado:** abierto

---

### GOQA-033
- **Grupo:** Grupo 9 — Notificaciones
- **Flujo ID:** F-164
- **Severidad:** menor
- **Endpoint:** PATCH /api/v1/admin/notifications/read-all
- **Esperado:** `{"data": {"updated": N}}` — `markAllRead()` hace `res.data.data.updated as number`
- **Observado:** `{"message": "Todas las notificaciones han sido marcadas como leídas."}` — sin wrapper `{data:{updated:N}}`. `markAllRead()` retorna `undefined`. Funcionalidad OK pero el front no puede confirmar el conteo.
- **Estado:** abierto

---

### GOQA-034
- **Grupo:** Grupo 9 — Reportes de Actividad Diaria
- **Flujo ID:** F-165, F-166, F-167
- **Severidad:** bloqueante
- **Endpoint:** POST/GET /api/v1/daily-activity-reports, POST /api/v1/daily-activity-reports/quick-attention
- **Esperado:** El front envía `{customer_attention: {...}, operations: {...}, social_media: {...}}` (anidado) y espera `DailyActivityReport` con esa misma estructura. `normalizeDailyActivityReport()` procesa `{atencion: {preguntas: {...}}, operaciones: {...}, redes_sociales: {...}}`
- **Observado:** Go API usa estructura completamente plana: `{preguntas_hombre, preguntas_mujeres, cotizaciones_hombre, ..., publicaciones_facebook, ...}`. (1) POST desde front enviará objetos anidados → API los ignora, todos los campos en 0. (2) `normalizeDailyActivityReport()` no puede deserializar la respuesta plana → pantalla siempre vacía. (3) Campos de social_media distintos: front usa `publicaciones_fb` pero API devuelve `publicaciones_facebook`.
- **Estado:** abierto

---

### GOQA-035
- **Grupo:** Grupo 9 — Reportes de Actividad Diaria
- **Flujo ID:** F-166
- **Severidad:** menor
- **Endpoint:** GET /api/v1/daily-activity-reports
- **Esperado:** Paginado con `current_page` y `last_page` (patrón estándar del proyecto)
- **Observado:** Usa `page` en vez de `current_page` y no incluye `last_page`. Los servicios que consuman esta lista no pueden navegar a páginas adicionales.
- **Estado:** abierto

---

## Historial de turnos QA

| Turno | Fecha | Grupos cubiertos | Flujos ✅ | Flujos ❌ | Agente |
|---|---|---|---|---|---|
| — | — | — | 0 | 0 | — |
| QA-B | 2026-04-18 | Grupo 2 (F-020→F-030) | 8 | 0 | sub-agente-B |
| QA-A | 2026-04-18 | Grupo 1 (F-001→F-012), Grupo 10 (SH-001,SH-002,SH-008) | 9 | 1 | sub-agente-A |
| QA-D | 2026-04-18 | Grupo 4 (F-060→F-070), Grupo 6 (F-100→F-109) | 12 | 4 | sub-agente-D |
| QA-C | 2026-04-18 | Grupo 5 (F-080→F-089) | 4 | 5 | sub-agente-C |
| QA-E | 2026-04-18 | Grupo 3 (F-040→F-046), Grupo 7 (F-120→F-127) | 10 | 1 | sub-agente-E |
| QA-F | 2026-04-18 | Grupo 8 (F-140→F-148), Grupo 9 (F-160→F-167) | 3 | 1 | sub-agente-F |
| QA-01 | 2026-04-18 | Grupos 1-10 (todos) | 46 | 13 | orquestador-autonomo |
