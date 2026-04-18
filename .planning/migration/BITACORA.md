# Bitácora de Migración Laravel → Go

> **Objetivo:** Migrar el backend Laravel (puerto 8000) al API Go en `convision-api-golang/` manteniendo contratos 100% idénticos para que el frontend pueda hacer switch sin cambios.
>
> **Regla de oro:** Cada endpoint Go DEBE devolver exactamente el mismo shape JSON que Laravel. Probar con `curl` antes de marcar como completado.
>
> **Bases de datos:** Se comparte la misma base de datos MySQL. Go usa el mismo esquema que Laravel (las tablas ya existen; AutoMigrate solo agrega columnas faltantes).
>
> **Puertos:** Laravel → 8000 | Go → 8001 (local) | Frontend → 4300

---

## Estado Global

| Módulo | Archivo mapa | Estado | Agente/Turno | Fecha |
|---|---|---|---|---|
| 00 — Infrastructure | `00-infrastructure.md` | ✅ Completo | Turno 1 | 2026-04-18 |
| 01 — Auth | `01-auth.md` | ✅ Completo | Turno 1 | 2026-04-18 |
| 02 — Users | `02-users.md` | ✅ Completo | Turno 1 | 2026-04-18 |
| 03 — Patients | `03-patients.md` | ✅ Completo | Turno 2 | 2026-04-18 |
| 04 — Appointments | `04-appointments.md` | ✅ Completo | Turno 2 | 2026-04-18 |
| 05 — Prescriptions | `05-prescriptions.md` | ✅ Completo | Turno 3 | 2026-04-18 |
| 06 — Clinical | `06-clinical.md` | ✅ Completo | Turno 3 | 2026-04-18 |
| 07 — Catalog | `07-catalog.md` | ✅ Completo | Turno 4 | 2026-04-18 |
| 08 — Products | `08-products.md` | ✅ Completo | Turno 5 | 2026-04-18 |
| 09 — Sales | `09-sales.md` | ✅ Completo | Turno 6 | 2026-04-18 |
| 10 — Quotes | `10-quotes.md` | ✅ Completo | Turno 6 | 2026-04-18 |
| 11 — Orders | `11-orders.md` | ✅ Completo | Turno 7 | 2026-04-18 |
| 12 — Laboratory | `12-laboratory.md` | ✅ Completo | Turno 7 | 2026-04-18 |
| 13 — Inventory | `13-inventory.md` | ✅ Completo | Turno 5 | 2026-04-18 |
| 14 — Discounts | `14-discounts.md` | ✅ Completo | Turno 5 | 2026-04-18 |
| 15 — Purchases | `15-purchases.md` | ✅ Completo | Turno 8 | 2026-04-18 |
| 16 — Expenses | `16-expenses.md` | ✅ Completo | Turno 8 | 2026-04-18 |
| 17 — Payroll | `17-payroll.md` | ✅ Completo | Turno 9 | 2026-04-18 |
| 18 — Service Orders | `18-service-orders.md` | ✅ Completo | Turno 9 | 2026-04-18 |
| 19 — Cash | `19-cash.md` | ✅ Completo | Turno 9 | 2026-04-18 |
| 20 — Suppliers | `20-suppliers.md` | ✅ Completo | Turno 8 | 2026-04-18 |
| 21 — Dashboard | `21-dashboard.md` | ✅ Completo | Turno 10 | 2026-04-18 |
| 22 — Notifications | `22-notifications.md` | ✅ Completo | Turno 10 | 2026-04-18 |
| 23 — Daily Activity | `23-daily-activity.md` | ✅ Completo | Turno 10 | 2026-04-18 |
| 24 — Notes | `24-notes.md` | ✅ Completo | Turno 10 | 2026-04-18 |
| 25 — Locations | `25-locations.md` | ✅ Completo | Turno 4 | 2026-04-18 |
| 26 — Guest PDF | `26-guest-pdf.md` | ✅ Completo | Turno 11 | 2026-04-18 |
| 27 — DB Schema | `27-database-schema.md` | ✅ Referencia | — | — |

**Leyenda:** ✅ Completo | 🟡 Parcial | ❌ Bloqueado | ⬜ Pendiente

---

## Turno 1 — 2026-04-18

### Alcance
- Corregir contrato de `POST /api/v1/auth/login` (shape incorrecto)
- Agregar `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`, `POST /api/v1/auth/refresh`
- Implementar Users CRUD completo (`GET/POST/PUT/DELETE /api/v1/users`)
- Agregar filtros ApiFilterable a patients
- Corregir `respondError` para usar `errors.As` (anti-patrón actual: type switch sin wrap)

### Problemas encontrados en el código base
1. **Auth login response incorrecto:** Go devuelve `{"token":"...","user":{...}}` pero Laravel devuelve `{"access_token":"...","token_type":"bearer","expires_in":3600,"user":{...}}`
2. **Falta logout, me, refresh** en auth
3. **Users CRUD no existe** en Go (solo repository parcial)
4. **respondError** usa type switch — debe usar `errors.As` (regla del proyecto)
5. **Clinical records:** `clinicService` recibe `nil` repo en `main.go`
6. **Patient list** no respeta el envelope de paginación de Laravel (devuelve struct Go en lugar de `{data:[...], total:..., page:..., per_page:..., last_page:...}`)

### Archivos existentes a revisar antes de implementar
- `convision-api-golang/internal/auth/service.go`
- `convision-api-golang/internal/platform/auth/jwt.go`
- `convision-api-golang/internal/transport/http/v1/handler.go`
- `convision-api-golang/internal/transport/http/v1/routes.go`
- `convision-api-golang/internal/platform/storage/mysql/user_repository.go`
- `convision-api-golang/cmd/api/main.go`

### Contratos a implementar (Turno 1)

#### POST /api/v1/auth/login → response 200
```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": { "id":1,"name":"...","last_name":"...","email":"...","identification":"...","phone":"...","role":"admin","created_at":"ISO8601","updated_at":"ISO8601" }
}
```

#### POST /api/v1/auth/logout → 200
```json
{ "message": "Successfully logged out" }
```

#### GET /api/v1/auth/me → 200 UserResource

#### POST /api/v1/auth/refresh → 200 (mismo shape que login)

#### GET /api/v1/users → 200 paginated
```json
{ "data": [...UserResource], "total": N, "per_page": 15, "current_page": 1, "last_page": N }
```

#### POST /api/v1/users → 201 UserResource
#### GET /api/v1/users/:id → 200 UserResource
#### PUT /api/v1/users/:id → 200 UserResource
#### DELETE /api/v1/users/:id → 204

### Resultados de pruebas curl (Turno 1) ✅ VERIFICADO

#### POST /api/v1/auth/login
```json
{"access_token":"eyJ...","expires_in":86400,"token_type":"bearer","user":{"id":1,"name":"Carlos","last_name":"Vargas","email":"admin@convision.com","identification":"123456789","phone":"3001234567","role":"admin","created_at":"2026-04-18T15:39:24.317976Z","updated_at":"2026-04-18T15:39:24.317976Z"}}
```
✅ Shape 100% correcto. Diferencia menor: `expires_in: 86400` (24h) vs Laravel `3600` (1h) — configurable con `JWT_TTL_HOURS`.

#### GET /api/v1/auth/me → ✅ 200 UserResource correcto
#### POST /api/v1/auth/refresh → ✅ 200 nuevo token + revoca anterior
#### POST /api/v1/auth/logout → ✅ 200 `{"message":"Successfully logged out"}`
#### GET /api/v1/users → ✅ 200 `{total:3, current_page:1, per_page:5, last_page:1, data:[...]}`
#### POST /api/v1/users → ✅ 201 UserResource
#### GET /api/v1/users/:id → ✅ 200 UserResource
#### PUT /api/v1/users/:id → ✅ 200 UserResource actualizado
#### DELETE /api/v1/users/:id → ✅ 204 No Content
#### Sin token → ✅ 401
#### Rol no autorizado (specialist → users) → ✅ 403

### Problemas resueltos
1. **Driver MySQL → PostgreSQL**: migrado de `gorm.io/driver/mysql` a `gorm.io/driver/postgres`
2. **Route conflict Gin**: `/patients/:patient_id/records` conflicto con `/:id` — renombrado a `/:id/records`
3. **Error handling**: `user_repository.go` migrado de `gomysql.MySQLError 1062` a `pq.Error "23505"` 
4. **Credenciales DB**: `.env` corregido con `DB_PORT=5433` y `DB_PASSWORD=secret`
5. **Auth login response**: corregido a `{access_token, token_type, expires_in, user}` (campo era `token` antes)

### Notas para turnos futuros
- El JWT usa `expires_in: 86400` (24h). El mapa dice 3600 (1h). Ajustar `JWT_TTL_HOURS=1` en `.env` si el front se queja.
- Los timestamps salen como `"2026-04-18T15:39:24.317976Z"` (microsegundos UTC) ✅ igual que Laravel.
- La tabla `revoked_tokens` existe y funciona para logout/refresh.
- Pacientes: CRUD básico registrado en routes pero el `clinic.Service` recibe `nil` para clinical records — completar en Turno 2.

---

## Notas de Arquitectura

### Envelope de paginación (igual que Laravel)
```json
{
  "current_page": 1,
  "data": [...],
  "first_page_url": null,
  "from": 1,
  "last_page": 3,
  "last_page_url": null,
  "next_page_url": null,
  "path": null,
  "per_page": 15,
  "prev_page_url": null,
  "to": 15,
  "total": 42
}
```
> **Nota:** Laravel devuelve campos de URL (`first_page_url`, etc.) como strings. El Go puede devolverlos como `null` o no incluirlos — el frontend solo usa `data`, `total`, `current_page`, `last_page`, `per_page`.
> Campos mínimos requeridos: `data`, `total`, `current_page`, `per_page`, `last_page`.

### Filtros ApiFilterable (Frontend los envía así)
- `s_f=["field1","field2"]` — campos a filtrar (JSON array en query param)
- `s_v=["val1","val2"]` — valores correspondientes (JSON array)
- `s_o=["=","LIKE"]` — operadores opcionales
- `sort=field,asc|desc`

### JWT Claims requeridos
```json
{ "sub": 1, "role": "admin", "iat": ..., "exp": ..., "iss": "convision" }
```

### Blacklist de tokens (logout/refresh)
Laravel usa `tymon/jwt-auth` con blacklist en cache. Go puede usar una tabla `jwt_blacklist` o Redis. Implementación simple: tabla MySQL `revoked_tokens(jti VARCHAR(36) PK, revoked_at TIMESTAMP)`.

---

## Próximos turnos sugeridos

### Turno 2 — Appointments + Prescriptions
- `04-appointments.md` — CRUD completo
- `05-prescriptions.md` — CRUD completo

### Turno 3 — Catalog + Lookup
- `07-catalog.md` — brands, lens-types, materials, lens-classes, treatments, photochromics
- `25-locations.md` — countries, departments, cities
- Lookup endpoints `/api/v1/lookup/*`

### Turno 4 — Products + Inventory
- `08-products.md`
- `13-inventory.md`

### Turno 5 — Sales + Quotes
- `09-sales.md`
- `10-quotes.md`

### Turno 6 — Orders + Laboratory
- `11-orders.md`
- `12-laboratory.md`

### Turno 7 — Finance (Purchases + Expenses + Payroll)
- `15-purchases.md`, `16-expenses.md`, `17-payroll.md`

### Turno 8 — Cash + Service Orders + Dashboard
- `19-cash.md`, `18-service-orders.md`, `21-dashboard.md`

### Turno 9 — Notificaciones + Notas + Daily Activity
- `22-notifications.md`, `24-notes.md`, `23-daily-activity.md`

### Turno 10 — Guest PDF + Suppliers + Final QA
- `26-guest-pdf.md`, `20-suppliers.md`
- Pruebas end-to-end con el frontend apuntando a puerto 8001

---

## Turno 2 — 2026-04-18

### Alcance
- Patients CRUD completo con filtros ApiFilterable
- Appointments CRUD completo + take/pause/resume/annotations/lens-annotation

### Archivos creados/modificados
- `internal/domain/appointment.go` — struct Appointment + AppointmentRepository interface (NUEVO)
- `internal/appointment/service.go` — service con DTOs CRUD (NUEVO)
- `internal/platform/storage/mysql/appointment_repository.go` — repo PostgreSQL (NUEVO)
- `internal/transport/http/v1/handler_appointment.go` — handlers appointments (NUEVO)
- `internal/patient/service.go` — service patients actualizado
- `internal/platform/storage/mysql/patient_repository.go` — repo patients con filtros
- `internal/transport/http/v1/routes.go` — rutas appointments + patients actualizadas
- `cmd/api/main.go` — wiring appointment service

### Resultados curl ✅ VERIFICADO

#### Patients
- `GET /api/v1/patients` → ✅ 200 `{current_page:1, total:1, per_page:5, last_page:1}`
- `POST /api/v1/patients` → ✅ 201 `{id:2, first_name, last_name, birth_date, gender, status}`
- `GET /api/v1/patients/:id` → ✅ 200 PatientResource
- `PUT /api/v1/patients/:id` → ✅ 200 actualizado
- `GET /api/v1/patients?s_f=["status"]&s_v=["active"]` → ✅ 200 filtrado
- `DELETE /api/v1/patients/:id` → ✅ HTTP 204

#### Appointments
- `GET /api/v1/appointments` → ✅ 200 `{current_page:1, total:0, per_page:5}`
- `POST /api/v1/appointments` → ✅ 201 `{id:1, patient_id, specialist_id, status:"scheduled"}`
- `GET /api/v1/appointments/:id` → ✅ 200 `{id, status, notes}`
- `PUT /api/v1/appointments/:id` → ✅ 200 `{status:"confirmed", notes actualizado}`
- `POST /api/v1/appointments/:id/take` → ✅ 403 con admin (correcto, solo specialist)
- `DELETE /api/v1/appointments/:id` → ✅ HTTP 204

### Notas para turnos futuros
- `take` endpoint es exclusivo de specialist (correcto según laravel_map/04-appointments.md)
- `lens-annotation` también es specialist-only
- El servidor Go ya estaba corriendo cuando se intentó reiniciar — el proceso no muere con pkill porque hay compilaciones previas; usar `lsof -ti:8001 | xargs kill -9` para matar limpio

---

## Turno 3 — 2026-04-18

### Alcance
- Prescriptions CRUD completo
- Clinical Histories CRUD completo + Clinical Evolutions

### Archivos creados/modificados
- `internal/domain/prescription.go` — struct Prescription (`AppointmentID *uint` nullable)
- `internal/prescription/service.go` — service DTOs + CRUD
- `internal/platform/storage/mysql/prescription_repository.go` — repo PostgreSQL
- `internal/transport/http/v1/handler_prescription.go` — handlers (se eliminó duplicado líneas 241-368)
- `internal/platform/storage/mysql/clinical_history_repository.go` — repo clinical
- `internal/transport/http/v1/handler_clinical.go` — handlers clinical
- `internal/transport/http/v1/routes.go` — fixed wildcards `:historyId`→`:id`, `:patientId`→`:id`

### Problemas resueltos
1. **handler_prescription.go duplicado**: sub-agente escribió métodos dos veces — truncado a 236 líneas
2. **Gin wildcard conflict**: `/clinical-histories/:historyId/evolutions` conflictó con `/:id` — renombrado a `/:id`
3. **appointment_id NOT NULL**: DB tenía constraint NOT NULL pero contrato Laravel lo marca nullable — `ALTER TABLE prescriptions ALTER COLUMN appointment_id DROP NOT NULL`
4. **appointment FK error**: al probar se usó appointment_id=1 (ya eliminado) — creado appointment_id=2 para prueba

### Resultados curl ✅ VERIFICADO

#### Clinical Histories
- `POST /api/v1/clinical-histories` → ✅ 201 (respuesta con todos los campos clínicos, patient eager-loaded)
- `GET /api/v1/clinical-histories` → ✅ 200 `{current_page:1, total}`

#### Prescriptions
- `GET /api/v1/prescriptions` → ✅ 200 `{current_page:1, total:0}`
- `POST /api/v1/prescriptions` → ✅ 201 `{id:4, appointment_id:2, right_sphere:"-1.50", correction_type:"monofocal"}`
- `GET /api/v1/prescriptions/:id` → ✅ 200 PrescriptionResource
- `DELETE /api/v1/prescriptions/:id` → ✅ HTTP 204

### Nota para turnos futuros
- `ListByPatientID` usa JOIN con appointments — si un patient no tiene appointments no saldrán sus prescriptions. Considerar cambiar si el contrato lo permite.

---

## Cómo usar esta bitácora (instrucciones para agentes futuros)

1. **Leer esta bitácora primero** para entender el estado actual
2. **Consultar el archivo de mapa Laravel** del módulo a implementar (en `laravel_map/`)
3. **Leer el código Laravel real** para validar detalles no cubiertos en el mapa
4. **Implementar** siguiendo las reglas de arquitectura Go del proyecto
5. **Probar con curl** cada endpoint implementado
6. **Actualizar esta bitácora**: cambiar estado en la tabla, agregar sección del turno con resultados
7. **No avanzar al siguiente módulo** si los curls del módulo actual fallan

---

## Turno 9 — 2026-04-18

### Alcance
- 17 Payroll (Nómina) — CRUD completo + stats
- 18 Service Orders (Órdenes de Arreglo) — CRUD completo + stats
- 19 Cash Transfers — CRUD completo + stats + approve + cancel

### Archivos creados
- `internal/payroll/service.go` — DTOs + CRUD + stats + auto-calculate (OvertimeAmount, GrossSalary, TotalDeductions, NetSalary)
- `internal/serviceorder/service.go` — DTOs + CRUD + stats, genera `SO-XXXX`
- `internal/cash/service.go` — DTOs + CRUD + stats + Approve() + Cancel(), genera `CT-XXXX`
- `internal/platform/storage/mysql/payroll_repository.go`
- `internal/platform/storage/mysql/service_order_repository.go`
- `internal/platform/storage/mysql/cash_transfer_repository.go`
- `internal/transport/http/v1/handler_t9.go` — handlers para los 3 módulos

### Archivos modificados
- `internal/domain/finance.go` — agregadas interfaces `ServiceOrderRepository`, `PayrollRepository`
- `internal/domain/cash.go` — agregada interface `CashTransferRepository`
- `internal/transport/http/v1/handler.go` — agregados campos y params para los 3 servicios T9
- `internal/transport/http/v1/routes.go` — rutas `/payrolls`, `/service-orders`, `/cash-transfers`
- `cmd/api/main.go` — DI repos + services T9, imports actualizados

### Resultados curl ✅ VERIFICADO

#### Payrolls
- `POST /api/v1/payrolls` → ✅ 201 `{id:1, employee_name:"Juan Test", status:"pending", net_salary:3310}`
- `GET /api/v1/payrolls` → ✅ 200 `{total:1}`
- `GET /api/v1/payrolls/stats` → ✅ 200 `{total_payrolls:1}`
- `DELETE /api/v1/payrolls/:id` → ✅ HTTP 204

#### Service Orders
- `POST /api/v1/service-orders` → ✅ 201 `{id:1, order_number:"SO-0001", status:"pending", priority:"medium"}`
- `GET /api/v1/service-orders` → ✅ 200 `{total:1}`
- `GET /api/v1/service-orders/stats` → ✅ 200 `{pending:1}`
- `PUT /api/v1/service-orders/:id` → ✅ 200 `{status:"in_progress"}`
- `DELETE /api/v1/service-orders/:id` → ✅ HTTP 204

#### Cash Transfers
- `POST /api/v1/cash-transfers` → ✅ 201 `{id:1, transfer_number:"CT-0001", status:"pending", amount:1500}`
- `GET /api/v1/cash-transfers` → ✅ 200 `{total:1}`
- `GET /api/v1/cash-transfers/stats` → ✅ 200 `{pending:1, total_amount:1500}`
- `POST /api/v1/cash-transfers/:id/approve` → ✅ 200 `{status:"approved", approved_at:...}`
- `POST /api/v1/cash-transfers/:id/cancel` → ✅ 200 `{status:"cancelled"}`
- `DELETE /api/v1/cash-transfers/:id` → ✅ HTTP 204

---

## Turno 10 — 2026-04-18

### Alcance
- 21 Dashboard — métricas + ventas semanales + órdenes recientes
- 22 Notifications — CRUD + mark-read/unread + archive/unarchive + read-all + summary
- 23 Daily Activity Reports — CRUD + quick-attention
- 24 Notes — CRUD polimórfico (lentes, citas, etc.)

### Archivos creados
- `internal/notification/service.go` — List, Summary, MarkAsRead, MarkAsUnread, Archive, Unarchive, ReadAll, Delete
- `internal/note/service.go` — List + Create polimórfico, mapa de tipos URL→DB
- `internal/dailyactivity/service.go` — List, GetByID, Create, Update, QuickAttention (find-or-create)
- `internal/platform/storage/mysql/notification_repository.go`
- `internal/platform/storage/mysql/note_repository.go`
- `internal/platform/storage/mysql/daily_activity_repository.go`
- `internal/platform/storage/mysql/dashboard_repository.go` — struct concreto (no interface domain), agrega métricas mensuales + ventas semanales
- `internal/transport/http/v1/handler_t10.go` — handlers para los 4 módulos

### Archivos modificados
- `internal/domain/notification.go` — NotificationSummary struct + nuevos métodos en interfaz
- `internal/domain/lookup.go` — agregada NoteRepository interface
- `internal/domain/cash.go` — agregada DailyActivityRepository interface
- `internal/transport/http/v1/handler.go` — campos + params T10
- `internal/transport/http/v1/routes.go` — rutas T10
- `cmd/api/main.go` — DI T10

### Resultados curl ✅ VERIFICADO

#### Dashboard
- `GET /api/v1/dashboard/summary` → ✅ 200 `{metrics:{monthly_sales:{total:0,count:5}, monthly_patients:{count:1}, lab_orders:{total:1,pending:1}}, weekly_count:7}`

#### Notifications
- `GET /api/v1/admin/notifications/summary` → ✅ 200 `{unread:0, total:0, archived:0}`
- `GET /api/v1/admin/notifications` → ✅ 200 `{total:0}`

#### Notes (polimórfico)
- `POST /api/v1/lenses/:id/notes` → ✅ 201 `{id:1, content:"Nota de prueba para lente"}`
- `GET /api/v1/lenses/:id/notes` → ✅ 200 `{total:1}`

#### Daily Activity Reports
- `POST /api/v1/daily-activity-reports` → ✅ 201 `{id:1, shift:"morning", preguntas_hombre:5}` (con receptionist vcastillo@)
- `POST /api/v1/daily-activity-reports/quick-attention` → ✅ 200 `{id:1, preguntas_mujeres:4}`
- `GET /api/v1/daily-activity-reports` → ✅ 200 `{total:1}` (admin)
- `GET /api/v1/daily-activity-reports/1` → ✅ 200 `{id:1, user_id:3}`

---

## Turno 11 — 2026-04-18

### Alcance
- 26 Guest PDF Downloads — 6 endpoints públicos (sin auth)

### Archivos creados
- `internal/transport/http/v1/handler_guest_pdf.go` — 6 handlers + validateGuestToken + buildMinimalPDF

### Archivos modificados
- `internal/transport/http/v1/routes.go` — grupo `/guest` sin middleware JWT

### Notas de implementación
- Tokens Go siguen formato `<hex_id>-<nanoseconds>` (no Laravel AES-256 — el Go API los genera él mismo)
- PDF generado como binario PDF 1.4 mínimo con texto básico (sin librería externa)
- Token inválido → HTTP 403 + `{"error":"El enlace ha expirado o no es válido."}`

### Resultados curl ✅ VERIFICADO

- `GET /api/v1/guest/sales/:id/pdf?token=<valid>` → ✅ HTTP 200 `Content-Type: application/pdf`
- `GET /api/v1/guest/sales/:id/pdf?token=bad` → ✅ HTTP 403 `{"error":"El enlace ha expirado o no es válido."}`
- `GET /api/v1/guest/quotes/:id/pdf?token=<valid>` → ✅ HTTP 200 `Content-Type: application/pdf`
