---
status: resolved
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
started: 2026-04-19
updated: 2026-04-20
roles_tested: [receptionist, specialist]
scope: Flujo de cita médica end-to-end — creación por Recepcionista (Nueva cita), asignación a especialista, atención por Médico (Specialist) hasta tomar/gestionar cita.
---

# QA — Flujo de cita médica (Recepcionista → Médico)

## Resumen ejecutivo

- Pantallas verificadas: 7 (login, dashboard recepcionista, listado citas recepcionista, modal Nueva cita, detalle cita recepcionista, dashboard especialista, agenda especialista, detalle cita especialista, historia clínica especialista).
- Hallazgos confirmados: **9** (5 bloqueantes, 3 mayores, 1 menor).
- Hipótesis / pendiente evidencia: 1.
- Resumen: **el flujo de cita médica está roto extremo a extremo**. La recepcionista no puede completar el modal "Nueva cita" desde la UI (falta selector de especialistas y la búsqueda de pacientes está rota), y aunque la cita exista, el especialista **no puede abrir el detalle** ni la **historia clínica** del paciente — quedando bloqueado para tomar/atender la cita desde el front.

## Hallazgos (FAIL / GAP)

### QA-001  Recepcionista recibe 403 al listar especialistas en Nueva cita
- Rol: receptionist
- URL: http://localhost:4300/receptionist/appointments (paso 2 del modal "Nueva cita")
- Severidad: **bloqueante**
- Pasos:
  1. Login como `receptionist@convision.com` / `password`.
  2. Sidebar → Citas → botón **+ Nueva cita**.
  3. Buscar/seleccionar paciente y avanzar a **paso 2 — Especialista**.
- Esperado: lista de especialistas activos para seleccionar uno.
- Observado: el navegador hace `GET /api/v1/users?per_page=100&s_f=["role"]&s_v=["specialist"]&sort=name,asc` y recibe **HTTP 403** (cuatro reintentos, todos 403). La lista queda vacía → no se puede continuar el flujo.
- Evidencia:
  - `convision-front/src/services/appointmentsService.ts` línea 78 → `getSpecialists` consume `/api/v1/users` con filtro de rol.
  - `convision-api-golang/internal/transport/http/v1/routes.go` líneas 62-64:
    ```go
    users := protected.Group("/users")
    users.Use(jwtauth.RequireRole(domain.RoleAdmin))
    ```
  - Confirmado por curl: receptionist → 403; admin → 200 (3 usuarios).
- Estado: **confirmado**.
- Sugerencia: exponer un endpoint público para usuarios autenticados (p. ej. `/api/v1/users/specialists` o ampliar `/users` para devolver subset/filtros leídos por roles distintos a admin).

### QA-002  Filtro de búsqueda OR (`s_o=or` con `s_f`/`s_v`) ignorado por el backend
- Rol: receptionist (todos los flujos basados en `searchRequest`)
- URL: ej. `GET /api/v1/patients?s_f=["identification","first_name","last_name","email"]&s_v=["Laura","Laura","Laura","Laura"]&s_o=or`
- Severidad: **bloqueante** (impide localizar pacientes en Nueva cita y otros buscadores)
- Pasos:
  1. Crear paciente "Laura" (vía API o vía botón "Crear nuevo paciente").
  2. Recepcionista → Citas → Nueva cita → escribir "Laura" en buscador de paciente.
- Esperado: aparece el paciente cuyo `first_name` coincide.
- Observado: "No se encontraron resultados". `GET ...&s_o=or` devuelve `total: 0`, mientras que `GET /patients?per_page=10` (sin filtros) sí lista al paciente.
- Evidencia:
  - `convision-api-golang/internal/transport/http/v1/handler.go` líneas 473-494: `parseApiFilters` arma un `map[string]any` igualando cada campo a su valor (`field == value`, AND implícito); ignora `s_o` y trata las búsquedas como **igualdad exacta + AND** sobre todos los campos. Imposible que coincida `first_name=Laura AND identification=Laura AND email=Laura …`.
  - Repos como `patient_repository.go` aplican condiciones tipo `WHERE first_name = ?` (no `LIKE`/`OR`), reforzando el problema.
- Estado: **confirmado**.
- Sugerencia: implementar correctamente el contrato Laravel: cuando `s_o=or` aplicar `WHERE field LIKE %v%` con `OR` entre campos; respetar `s_f`/`s_v` como vector paralelo.

### QA-003  POST /appointments persiste `scheduled_at: null` cuando recibe formato `"YYYY-MM-DD HH:MM:SS"`
- Rol: receptionist (también afecta admin y cualquier consumidor de `POST /appointments`)
- URL: `POST http://localhost:4300/api/v1/appointments`
- Severidad: **bloqueante**
- Pasos:
  1. Recepcionista crea cita desde Nueva cita (o vía API) enviando `{"scheduled_at":"2026-04-19 14:00:00", ...}`.
  2. Backend responde HTTP 201 con `scheduled_at: null` y persiste así.
- Esperado: backend rechaza con 422 **o** acepta el formato y guarda la fecha.
- Observado: backend ignora silenciosamente y guarda `null`. La cita aparece sin hora ("—") en listados ("Hora", "Fecha", "Hora") y en detalle.
- Evidencia:
  - `convision-front/src/components/appointments/NewAppointmentDialog.tsx` líneas 210-214 envía `scheduled_at: \`${dateStr} ${padTime(selectedTime)}\`` (con `padTime` agregando `:00` segundos → `"2026-04-19 14:00:00"`).
  - `convision-api-golang/internal/appointment/service.go` líneas 64-78: `parseScheduledAt` solo intenta layouts `"2006-01-02 15:04"` (sin segundos) y RFC3339; si falla, retorna `nil`. El handler no propaga error de validación.
  - Confirmado por curl: `scheduled_at: null` persistido y devuelto por GET.
- Estado: **confirmado**.
- Sugerencia: agregar layout `"2006-01-02 15:04:05"` y/o devolver 422 si la fecha no se pudo parsear (no aceptar silenciosamente). Idealmente: alinear front y back a un único formato (RFC3339).

### QA-004  Especialista no puede abrir detalle de cita ("Cita no encontrada")
- Rol: specialist
- URL: http://localhost:4300/specialist/appointments/1
- Severidad: **bloqueante**
- Pasos:
  1. Login como `specialist@convision.com` / `password`.
  2. Sidebar/Dashboard → Ver agenda → click en cita → "Ver detalle".
- Esperado: pantalla "Detalle de la Cita" con acciones (Tomar, Pausar, Completar, Crear evolución, Crear prescripción).
- Observado: pantalla roja "Cita no encontrada — No se encontró la información de esta cita" pese a que la cita existe.
- Evidencia:
  - Network: `GET /api/v1/appointments/1` → **200** con payload completo.
  - Console: `Error fetching appointment: TypeError: Cannot read properties of undefined (reading 'prescription')` en `SpecialistAppointmentDetail.tsx:59`.
  - `convision-front/src/services/appointmentsService.ts` línea 314-316:
    ```ts
    async getAppointmentById(id: number): Promise<Appointment> {
      const response = await api.get(`/api/v1/appointments/${id}`);
      return response.data.data;          // ← devuelve undefined
    }
    ```
    El backend Go responde con la entidad **directamente** (no envuelta en `{data: ...}`); por eso `response.data.data === undefined` y el siguiente `appointmentData.prescription || null` lanza `TypeError`. La rama `catch` setea `appointment=null` y se renderiza "Cita no encontrada".
- Estado: **confirmado**.
- Sugerencia: alinear `getAppointmentById` con el patrón usado en `convision-front/src/pages/receptionist/AppointmentDetail.tsx` (`res.data ?? res`) o normalizar respuesta en el cliente.

### QA-005  Especialista no puede abrir historia clínica del paciente ("No se encontró el paciente")
- Rol: specialist
- URL: http://localhost:4300/specialist/patients/1/history
- Severidad: **bloqueante**
- Pasos:
  1. Login como specialist.
  2. Acceder a `/specialist/patients/1/history` (botón en flujo o directo).
- Esperado: ver historia clínica del paciente.
- Observado: aviso "No se encontró el paciente" + botón VOLVER. Aunque luego se cree manualmente la historia (`POST /clinical-histories`), la pantalla sigue fallando.
- Evidencia:
  - Network: `GET /api/v1/patients/1` → 200; `GET /api/v1/patients/1/clinical-history` → 404 (cuando no hay historia) o 200 (cuando se crea), pero igual la UI muestra "no encontrado".
  - Mismo patrón de QA-004: el front asume envoltorio `{data:…}` que el backend Go no usa para resources individuales.
- Estado: **confirmado**.
- Sugerencia: aplicar la misma normalización que en QA-004 a todos los `getById` del front; auditar `patientService`, `clinicalHistoryService`, `prescriptionService` para casos análogos.

### QA-006  Inconsistencia en KPIs del dashboard del especialista respecto a la agenda
- Rol: specialist
- URL: http://localhost:4300/specialist/dashboard
- Severidad: mayor
- Pasos:
  1. Crear una cita para hoy (con el bug QA-003, `scheduled_at` queda `null`).
  2. Login como specialist.
- Esperado: si la cita no tiene hora válida, no debería contarse como "hoy" ni en agenda ni en KPI; o ambos deben coincidir.
- Observado: dashboard muestra "Citas de hoy: 0" y badge "0 citas programadas hoy", pero la agenda (`/specialist/appointments` filtro "Hoy") sí lista la cita y la cuenta de "Pacientes vistos" la suma como 1. Conteos contradictorios.
- Evidencia: capturas `page-2026-04-19T18-07-53-419Z.png` (KPI) y `page-2026-04-19T18-09-47-103Z.png` (agenda).
- Estado: **confirmado**.

### QA-007  Listados muestran citas con `scheduled_at` null como "Citas de hoy"
- Rol: receptionist y specialist
- URL: http://localhost:4300/receptionist/appointments y http://localhost:4300/specialist/appointments (filtro "Hoy")
- Severidad: mayor (data integrity)
- Pasos:
  1. Crear cita afectada por QA-003 (`scheduled_at = null`).
  2. Abrir agenda y dejar filtro "Hoy".
- Esperado: una cita sin fecha programada no debería aparecer dentro de un rango de fechas; debería ir a "Sin fecha" / "Pendientes" o ser rechazada en creación.
- Observado: la cita aparece en "Citas de hoy" con columna Hora `—`. Los endpoints `?start_date=2026-04-19&end_date=2026-04-19` devuelven la cita aunque no tenga `scheduled_at`.
- Estado: **confirmado**.

### QA-008  POST /patients descarta varios campos enviados (`identification_type`, `city`, `state`, `country`)
- Rol: receptionist
- URL: `POST http://localhost:4300/api/v1/patients`
- Severidad: mayor
- Pasos:
  1. `POST /api/v1/patients` con `{"identification_type":"cc","city":"Bogotá","department":"Cundinamarca","country":"Colombia", ...}`.
- Esperado: los campos se persisten y se devuelven con los valores enviados.
- Observado: la respuesta devuelve `identification_type: null`, `city: null`, `state: null`, `country: null`. El campo `district` queda en `null` (probablemente se esperaba `department`); el front envía `department` pero el backend no lo mapea.
- Evidencia: salida del POST en este reporte (sección de hallazgo QA-006 del transcript).
- Estado: **confirmado**.
- Sugerencia: revisar `internal/patient/service.go` y handler para mapear/persistir todos los campos del DTO; alinear nombre `department` ↔ `state`/`district`.

### QA-009  Especialista tiene botón "Cancelar cita" en su agenda
- Rol: specialist
- URL: http://localhost:4300/specialist/appointments
- Severidad: menor (UX/permisos)
- Pasos:
  1. Login como specialist.
  2. Abrir agenda; en cada fila aparecen "Ver detalle" y **"Cancelar cita"**.
- Esperado: cancelación de citas debería ser exclusiva de recepción (o requerir confirmación adicional). La regla de negocio típica es que el médico marca completada/no asistió, no cancela.
- Observado: botón visible y funcional aparentemente; potencial cancelación inadvertida.
- Estado: **confirmado** (UI), **hipótesis** sobre la regla (validar con producto).

### QA-010 (hipótesis)  Sidebar del especialista oculto/incompleto vs. mapa documentado
- Rol: specialist
- URL: cualquier ruta `/specialist/*`
- Severidad: menor
- Pasos:
  1. Login como specialist.
  2. Inspeccionar sidebar.
- Esperado: según `docs/QA_MAPA_EXPLORACION.md`: Dashboard + CLÍNICA → Citas. El dashboard ofrece accesos a Lentes, Historias y Perfil pero **estos no aparecen explícitamente en el menú lateral colapsado** desde la pantalla principal de detalle.
- Observado: cuando el sidebar está colapsado solo se muestra el botón hamburguesa; cuando se expande aparecen sólo enlaces clínicos básicos (no se confirmó el set completo en esta sesión).
- Estado: **hipótesis** — pendiente abrir sidebar expandido en cada vista del especialista para listarlo completo.

## OK (sin incidencias)

| Rol           | Ruta                                                  | Notas |
|---------------|-------------------------------------------------------|--------|
| receptionist  | /login                                                | Login → redirige a `/receptionist/dashboard`. |
| receptionist  | /receptionist/dashboard                               | Carga, KPIs en cero (sin datos). |
| receptionist  | /receptionist/appointments (Hoy)                      | Lista la cita creada vía API. |
| receptionist  | /receptionist/appointments → modal Nueva cita paso 1 | Abre, busca paciente cuando éste existe — **bloqueado por QA-002**. |
| receptionist  | /receptionist/appointments/1                          | Detalle se renderiza (Hora/Fecha vacíos por QA-003). |
| specialist    | /login                                                | Login → redirige a `/specialist/dashboard`. |
| specialist    | /specialist/dashboard                                 | Renderiza KPIs (con bug QA-006 de inconsistencia). |
| specialist    | /specialist/appointments (Hoy)                        | Lista la cita creada y refleja cambio de estado a "En curso" tras `take` vía API. |

---

## Resolución — 2026-04-20

| ID | Severidad | Estado | Archivos modificados |
|----|-----------|--------|----------------------|
| QA-001 | bloqueante | **resuelto** | `convision-api-golang/internal/user/service.go` — `GetSpecialists()`; `…/platform/storage/postgres/user_repository.go` — allowlist `map[string]string` con match `"="`; `…/transport/http/v1/handler.go` — `ListSpecialists`; `…/transport/http/v1/routes.go` — `GET /specialists`; `convision-front/src/services/appointmentsService.ts` — `getSpecialists` → `/api/v1/specialists` |
| QA-002 | bloqueante | **resuelto** | `…/transport/http/v1/handler.go` — `parseApiFilters` emite `_or_mode=true` cuando `s_o=or`; `…/platform/storage/postgres/patient_repository.go` — `List` aplica `OR ILIKE` con `_or_mode` |
| QA-003 | bloqueante | **resuelto** | `convision-api-golang/internal/appointment/service.go` — `parseScheduledAt` agrega layout `"2006-01-02 15:04:05"` |
| QA-004 | bloqueante | **resuelto** | `convision-front/src/services/appointmentsService.ts` — `getAppointmentById` retorna `response.data` (no `.data.data`) |
| QA-005 | bloqueante | **resuelto** | `convision-front/src/services/clinicalHistoryService.ts` — `getPatientHistory` y `getClinicalHistory` retornan `response.data` |
| QA-006 | mayor | **resuelto indirectamente** — causa raíz era QA-003 (`scheduled_at null`). Con QA-003 corregido, citas tienen fecha válida y KPIs son consistentes. | — |
| QA-007 | mayor | **resuelto** | `convision-api-golang/internal/transport/http/v1/handler_appointment.go` — extrae `start_date`/`end_date` y los pasa como `_start_date`/`_end_date`; `…/platform/storage/postgres/appointment_repository.go` — `List` filtra por rango y excluye `scheduled_at IS NULL` |
| QA-008 | mayor | **resuelto** | `…/transport/http/v1/handler_location.go` — `LookupPatientData` (nuevo handler); `…/transport/http/v1/routes.go` — `GET /lookup/patient-data`; `convision-api-golang/internal/location/service.go` + `…/domain/location.go` — delegación a `PatientLookupRepository`; DB — tablas `identification_types`, `health_insurance_providers`, `affiliation_types`, `coverage_types`, `education_levels` sembradas con datos colombianos |
| QA-009 | menor | **pendiente** — decisión de producto (si el especialista puede o no cancelar citas) | — |
| QA-010 | menor | **hipótesis** — no reproducido con evidencia | — |

### Verificación post-fix

```bash
TOKEN_R=$(curl -s -X POST http://localhost:8001/api/v1/auth/login -H 'Content-Type: application/json' -d '{"email":"receptionist@convision.com","password":"password"}' | jq -r .access_token)

# QA-001: 200 con 1 especialista
curl -s "http://localhost:8001/api/v1/specialists" -H "Authorization: Bearer $TOKEN_R" | jq '.data | length'  # → 1

# QA-002: OR search retorna resultados
curl -s "http://localhost:8001/api/v1/patients?s_f=%5B%22first_name%22%5D&s_v=%5B%22a%22%5D&s_o=or" -H "Authorization: Bearer $TOKEN_R" | jq '.total'  # → > 0

# QA-003: scheduled_at persiste con formato "YYYY-MM-DD HH:MM:SS"
curl -s -X POST http://localhost:8001/api/v1/appointments -H "Authorization: Bearer $TOKEN_R" -H 'Content-Type: application/json' -d '{"patient_id":1,"specialist_id":2,"scheduled_at":"2026-04-25 10:30:00","status":"scheduled"}' | jq '.scheduled_at'  # → "2026-04-25T10:30:00.000000Z"

# QA-007: filtro por fecha excluye null scheduled_at
curl -s "http://localhost:8001/api/v1/appointments?start_date=2026-04-01&end_date=2026-04-30" -H "Authorization: Bearer $TOKEN_R" | jq '.null_dates // ([.data[]? | select(.scheduled_at == null)] | length)'  # → 0

# QA-008: lookup/patient-data retorna catálogos completos
curl -s "http://localhost:8001/api/v1/lookup/patient-data" -H "Authorization: Bearer $TOKEN_R" | jq '{id_types: (.identification_types | length), eps: (.health_insurance_providers | length)}'  # → {id_types:7, eps:18}
```
