# QA Findings — Flujo de citas por sede
**Fecha:** 2026-04-29  
**Alcance:** Creación de sede → asociación de médicos → creación de citas → ejecución → validación admin por sede  
**Entornos:** Frontend `http://localhost:4300` · Backend Go `http://localhost:8001`  
**Roles testados:** admin, specialist, receptionist

---

## HALLAZGOS

---

### QA-SEDE-001 — BLOQUEANTE

**ID:** QA-SEDE-001  
**Rol:** admin, specialist, receptionist  
**URL:** `http://localhost:8001/api/v1/appointments` (todos los métodos)  
**Título:** `prescriptions.appointment_id` no existe — todas las llamadas de citas devuelven 500

**Severidad:** bloqueante

**Pasos:**
1. Iniciar sesión como admin.
2. Navegar a cualquier página de citas (`/admin/appointments`, `/receptionist/appointments`).
3. Observar que la tabla aparece vacía aunque en la BD hay registros.
4. Confirmar via `curl`:
   ```bash
   curl http://localhost:8001/api/v1/appointments?branch_id=0 \
     -H "Authorization: Bearer <token>" \
     -H "X-Branch-ID: 1"
   ```

**Esperado:** El API devuelve la lista paginada de citas con sus relaciones.

**Observado:**
```json
{ "message": "ERROR: column prescriptions.appointment_id does not exist (SQLSTATE 42703)" }
```
La tabla en el frontend queda vacía sin error visible para el usuario.

**Causa raíz (evidencia en código):**  
`convision-api-golang/internal/platform/storage/postgres/appointment_repository.go` → método `withRelations`:
```go
func (r *AppointmentRepository) withRelations(q *gorm.DB) *gorm.DB {
    return q.
        Preload("Branch").
        Preload("Patient").
        Preload("Specialist").
        Preload("Receptionist").
        Preload("TakenBy").
        Preload("Prescription")   // ← PROBLEMA
}
```
`domain.Appointment.Prescription` tiene `gorm:"foreignKey:AppointmentID"`. GORM genera:
```sql
SELECT * FROM "prescriptions" WHERE "appointment_id" IN (...)
```
Pero la tabla `prescriptions` en PostgreSQL usa `clinical_record_id` (no `appointment_id`) porque las recetas fueron migradas para ser hijas de `clinical_records`, no de `appointments`.

**Impacto:**
- `GET /appointments` → 500 (lista vacía en UI)
- `POST /appointments` → cita SE GUARDA en BD pero el API retorna 500 (la UI muestra error aunque el registro existe → posible duplicación)
- `GET /appointments/:id` → 500
- Toda la gestión de citas está bloqueada

**Fix sugerido:** Eliminar `Preload("Prescription")` de `withRelations`. Las prescripciones se acceden a través de `clinical_records`, no directamente desde `appointments`. La relación `Appointment.Prescription *Prescription` con `gorm:"foreignKey:AppointmentID"` en `domain/appointment.go` también debe revisarse o eliminarse.

**Estado:** confirmado

---

### QA-SEDE-002 — MAYOR

**ID:** QA-SEDE-002  
**Rol:** receptionist, admin  
**URL:** `http://localhost:4300/receptionist/appointments/new`  
**Título:** Sin selector de sede en el formulario de creación de citas

**Severidad:** mayor

**Pasos:**
1. Iniciar sesión como receptionist.
2. Ir a Citas → "Nueva cita".
3. Recorrer todos los pasos del wizard (4 pasos).

**Esperado:** El wizard incluye un selector explícito de sede/sucursal donde se realizará la cita.

**Observado:** El wizard tiene 4 pasos: `Paciente → Especialista → Fecha y hora → Resumen`. Ninguno incluye selector de sede. La sede se hereda implícitamente del header `X-Branch-ID` configurado en localStorage (sede seleccionada globalmente).

**Impacto:**
- Un recepcionista no puede crear una cita en una sede diferente a la que tiene seleccionada globalmente.
- No hay indicador visual de en qué sede se creará la cita.
- El resumen (paso 4) no muestra la sede seleccionada.

**Estado:** confirmado

---

### QA-SEDE-003 — MAYOR

**ID:** QA-SEDE-003  
**Rol:** admin, receptionist  
**URL:** `http://localhost:4300/admin/appointments` · `http://localhost:4300/receptionist/appointments`  
**Título:** Tabla de citas no tiene columna "Sede"

**Severidad:** mayor

**Pasos:**
1. Iniciar sesión como admin o receptionist.
2. Navegar a Citas.
3. Observar columnas de la tabla.

**Esperado:** La tabla muestra una columna "Sede" (o "Sucursal") que indica a qué sede pertenece cada cita, especialmente importante para el admin que gestiona múltiples sedes.

**Observado:** Columnas actuales: `Hora | Paciente | Especialista | Motivo | Estado`. No existe columna de sede. La API retorna `branch_id` y `branch { id, name, ... }` en cada cita, pero el frontend no lo renderiza.

**Estado:** confirmado

---

### QA-SEDE-004 — MAYOR

**ID:** QA-SEDE-004  
**Rol:** admin, receptionist, specialist  
**URL:** `http://localhost:4300/admin/appointments`  
**Título:** Fallo silencioso en tabla de citas — UI muestra estado vacío sin indicar error

**Severidad:** mayor

**Pasos:**
1. Iniciar sesión como admin.
2. Ir a Citas (`/admin/appointments`).
3. Observar que la tabla aparece vacía con mensaje "No hay citas para este período".
4. Verificar en red que el API retorna 500.

**Esperado:** Si el API falla (500), la UI debe mostrar un mensaje de error claro (toast o banner) indicando que no se pudo cargar la información.

**Observado:** La tabla muestra el estado vacío estándar ("No hay citas para este período") sin ningún indicador de error. El usuario no puede distinguir si hay datos o si hubo un fallo de red. Esto es agravado por QA-SEDE-001 (el API siempre falla).

**Estado:** confirmado

---

### QA-SEDE-005 — MENOR

**ID:** QA-SEDE-005  
**Rol:** admin, receptionist  
**URL:** `http://localhost:4300/admin/appointments`  
**Título:** Paginación incorrecta en Appointments.tsx — `meta.last_page[0]` siempre retorna undefined

**Severidad:** menor

**Pasos:**
1. Abrir `convision-front/src/pages/receptionist/Appointments.tsx`.
2. Ver líneas 110–113:
   ```tsx
   const totalPages = data?.meta?.last_page?.[0] ?? 1;
   const totalItems = data?.meta?.total?.[0] ?? 0;
   const fromItem = data?.meta?.from?.[0] ?? 0;
   const toItem = data?.meta?.to?.[0] ?? 0;
   ```

**Esperado:** `data.meta.last_page` es un `number`, y debe accederse directamente como tal. El footer debe mostrar el total real de resultados.

**Observado:** Se usa notación de array `[0]` para acceder a un número. `(5)[0]` en JS retorna `undefined`, por lo que:
- `totalPages` siempre es `1`
- `totalItems` siempre es `0`
- `fromItem` y `toItem` siempre son `0` (además `from`/`to` no existen en el response del backend Go)

El footer de paginación siempre muestra "Mostrando 0–0 de 0 resultados".

**Fix sugerido:**
```tsx
const totalPages = data?.meta?.last_page ?? 1;
const totalItems = data?.meta?.total ?? 0;
```

**Estado:** confirmado (código)

---

### QA-SEDE-006 — MENOR

**ID:** QA-SEDE-006  
**Rol:** specialist, receptionist  
**URL:** `/api/v1/appointments/:id/take` · `/api/v1/appointments/:id/pause` · etc.  
**Título:** `takeAppointment`, `pauseAppointment`, `resumeAppointment`, `completeAppointment`, `cancelAppointment` retornan `undefined`

**Severidad:** menor

**Pasos:**
1. Abrir `convision-front/src/services/appointmentsService.ts`.
2. Ver líneas 327–329, 332–334, 336–338, 341–346, 348–353.

**Esperado:** Cada función retorna el objeto `Appointment` actualizado del API.

**Observado:** Todas estas funciones usan `return response.data.data` pero el backend Go retorna el recurso directamente (sin wrapper `{data: ...}`). Por tanto el return value es siempre `undefined`. El `getAppointmentById` en la misma línea 357 ya tiene el fix correcto: `return response.data as Appointment`.

**Fix sugerido:**
```ts
// Cambiar en todos los métodos afectados:
return response.data.data;   // ❌
return response.data as Appointment;   // ✓
```

**Estado:** confirmado (código)

---

### QA-SEDE-007 — SUGERENCIA

**ID:** QA-SEDE-007  
**Rol:** receptionist  
**URL:** `http://localhost:4300/receptionist/appointments`  
**Título:** Recepcionista no puede filtrar citas por sede

**Severidad:** sugerencia

**Descripción:** El componente `AdminBranchFilter` solo se muestra cuando `isAdmin` es verdadero (línea 185 de `Appointments.tsx`). Para el rol receptionist, no hay filtro de sede. En una clínica multi-sede, un recepcionista podría necesitar ver solo las citas de su sede o de todas.

**Estado:** confirmado (código)

---

### QA-SEDE-008 — SUGERENCIA

**ID:** QA-SEDE-008  
**Rol:** receptionist, admin  
**URL:** `http://localhost:4300/receptionist/appointments/new` (paso 2)  
**Título:** Lista de especialistas en el wizard no filtra por sede asignada

**Severidad:** sugerencia

**Descripción:** En el paso 2 del wizard de creación de citas, se muestran TODOS los especialistas del sistema sin importar a qué sedes están asignados. En un sistema multi-sede, debería mostrar solo los especialistas disponibles en la sede donde se está agendando la cita.

**Estado:** hipótesis (no confirmado por código — requiere revisar la implementación del paso 2)

---

## ✅ OK / Sin incidencias

| Funcionalidad | URL/Endpoint | Notas |
|---|---|---|
| Login admin | `/login` | Redirige correctamente a `/admin/dashboard` |
| Login specialist | `/login` | Redirige correctamente a `/specialist/dashboard` |
| Login receptionist | `/login` | Redirige correctamente a `/receptionist/dashboard` |
| Creación de sedes | `/admin/sedes` | Formulario funcional, 3 sedes creadas correctamente |
| Lista de sedes | `GET /api/v1/branches` | Retorna las 4 sedes con datos correctos |
| Asociación médicos a sedes | `/admin/users/:id/edit` | Campo de sedes en formulario de usuario funciona |
| Filtro de sede en Daily Reports | `/admin/daily-reports` | AdminBranchFilter presente y funcional (4 sedes) |
| Filtro de sede en Informe Gestión | `/admin/specialist-reports` | AdminBranchFilter presente (sedes + especialistas) |
| Branch middleware admin exemption | Backend | Admin puede acceder a cualquier sede sin restricción |
| Appointments DB storage | BD PostgreSQL | Citas se guardan correctamente con `branch_id` correcto |

---

## Prioridad de corrección

| Prioridad | ID | Impacto |
|---|---|---|
| P0 | QA-SEDE-001 | Toda la gestión de citas está rota — sin este fix nada más funciona |
| P1 | QA-SEDE-002 | Flujo de agendamiento incompleto para multi-sede |
| P1 | QA-SEDE-003 | Sin visibilidad de sede en tabla de citas |
| P1 | QA-SEDE-004 | Error silencioso confunde al usuario |
| P2 | QA-SEDE-005 | Paginación siempre muestra 0 resultados |
| P2 | QA-SEDE-006 | Métodos de estado de cita retornan undefined |
| P3 | QA-SEDE-007 | Filtro de sede para recepcionista |
| P3 | QA-SEDE-008 | Especialistas no filtrados por sede en wizard |

---

## Archivos afectados (para el agente de corrección)

| Archivo | Hallazgo |
|---|---|
| `convision-api-golang/internal/platform/storage/postgres/appointment_repository.go` | QA-SEDE-001 — eliminar `Preload("Prescription")` de `withRelations` |
| `convision-api-golang/internal/domain/appointment.go` | QA-SEDE-001 — revisar campo `Prescription *Prescription` con FK `AppointmentID` |
| `convision-front/src/pages/receptionist/Appointments.tsx` | QA-SEDE-003, QA-SEDE-004, QA-SEDE-005, QA-SEDE-007 |
| `convision-front/src/services/appointmentsService.ts` | QA-SEDE-006 |
| `convision-front/src/pages/receptionist/appointments/NewAppointment.tsx` (o equivalente) | QA-SEDE-002 |
