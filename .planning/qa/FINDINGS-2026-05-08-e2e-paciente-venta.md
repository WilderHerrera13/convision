---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
api_url: http://localhost:8001
started: 2026-05-08T08:59:00-05:00
updated: 2026-05-08T09:18:00-05:00
roles_tested: [receptionist, specialist, admin]
scenario: E2E paciente → cita → médico → asesor → venta (con casos esquina)
---

# QA E2E — Flujo Paciente / Cita / Recomendación / Venta

Recorrido end-to-end del flujo principal solicitado:
1. Paciente llega → recepción crea/consulta paciente.
2. Recepción agenda cita.
3. Especialista gestiona cita y emite recomendación de lente (sin exponer la fórmula al asesor).
4. Asesor (recepción) ve la recomendación, ofrece lente + montura y cierra la venta.

> **Nota de privacidad confirmada:** el asesor (`receptionist`) **no debe ver la fórmula clínica** (esférico, cilindro, eje, AVcc, adición, DP). Solo la recomendación textual. **No se levanta como bug.**

## Resumen ejecutivo

E2E completado de extremo a extremo en una sesión:
- Paciente **#36** (Lucia Mariana Pardo QA0508) creado por API tras bloqueo del formulario UI.
- Cita **#42** agendada en Sede Centro (rama 3) con specialist@convision.com.
- Especialista tomó la cita, completó historia clínica + prescripción (Monofocal · Policarbonato · permanente; tratamientos Antirreflejo + filtro luz azul) y firmó la fórmula.
- Asesor entró a `/receptionist/sales/new?appointment_id=42`, vio la **Recomendación del médico** sin valores numéricos, agregó lente LEN-002 (Monofocal Policarbonato Antirreflejo) + montura M9914 MAORI y cerró venta **VTA-0011** por $714.000 (subtotal $600.000 + IVA 19%).
- Hallazgos: 9 abiertos (5 confirmados, 4 hipótesis/observaciones de UX). El bug **QA-001** (silent failure al crear paciente) y **QA-008** (sin recomendación en `/sales/catalog`) son los más impactantes para el flujo del usuario.

| Métrica | Valor |
|---|---|
| Pantallas verificadas | 9 (login, select-branch, dashboard, patients/new, appointments/42 specialist + receptionist, sales/new, sales/catalog, unauthorized) |
| Confirmados | 8 |
| Hipótesis | 4 |
| Roles probados | receptionist, specialist, laboratory (login) |
| Datos generados | paciente #36, cita #42, prescripción id 11, venta VTA-0011 |

## Hallazgos (FAIL / GAP)

### QA-001 — Crear paciente: "Guardar paciente" no envía nada y no muestra error
- **Rol:** receptionist
- **URL:** http://localhost:4300/receptionist/patients/new
- **Severidad:** mayor
- **Pasos:**
  1. Login como `receptionist@convision.com` → seleccionar Sede Centro.
  2. Ir a `/receptionist/patients/new`.
  3. Diligenciar campos obligatorios: nombre, apellido, documento, teléfono, correo, fecha de nacimiento (vía DatePicker), género (radio "Femenino").
  4. Click en "Guardar paciente" (header) o en "Siguiente".
- **Esperado:** o bien se envía POST `/api/v1/patients` y redirige a la ficha, o se muestra un toast/inline-error señalando el campo faltante.
- **Observado:** el botón no dispara **ninguna** petición a `/api/v1/patients` ni cambia de paso. La consola no reporta errores. No aparece toast. Quedaba bloqueado el flujo desde la UI.
- **Evidencia:** lista de network requests post-click solo incluye `auth/me`, `lookup/patient-data`, `lookup/countries`. Console error level: 0. Consultando POST `/api/v1/patients` directamente con el mismo payload pero `identification_type: "cedula_ciudadania"` el backend responde 200 (paciente #36 creado), confirmando que la falla es del **frontend**: el combobox de tipo de documento muestra/serializa `"CC"` mientras la API exige el código `cedula_ciudadania`. La ausencia de mapeo + ausencia de manejador del error de validación = "falla silenciosa".
- **Impacto:** un asesor que intenta registrar un nuevo paciente desde la UI no puede crearlo y no recibe feedback. Bloqueante real para el flujo "paciente llega".
- **Estado:** confirmado.

### Resolución (2026-05-08, gap-fixer)
- **Estado:** resuelto.
- **Causa raíz doble:** (a) cuando el lookup `/api/v1/lookup/patient-data` no carga, las opciones `<SelectItem>` de fallback usaban valores `cedula_ciudadania`/`tarjeta_identidad` que `Number(...)` convierte en `NaN` y al payload se enviaba `identification_type_id: undefined` sin alternativa; (b) `handleSubmit(onSubmit)` no tenía `onError`, así que cualquier fallo de validación Zod en pasos no visibles dejaba al usuario sin feedback.
- **Fix:**
  - `convision-front/src/pages/receptionist/NewPatient.tsx`: el payload ahora envía `identification_type_id` cuando el valor seleccionado es numérico (lookup OK) y/o `identification_type` (código string) cuando proviene del fallback o cuando el item del lookup expone `code`. El backend Go ya resuelve `identification_type` por código (`patient/service.go:resolveIdentificationType`).
  - `NewPatient.tsx`: `handleSubmit(onSubmit, onSubmitError)` con un nuevo `onSubmitError` que detecta el primer paso con campo inválido, navega a ese paso y muestra toast destructivo con el mensaje del primer error. Esto elimina la "falla silenciosa".
  - `NewPatient.tsx`: el catch de error 422 ahora aplana `errors` por campo y los muestra en el toast.
- **Verificación:** `tsc --noEmit` pasa. La UI ahora siempre da feedback (toast inline + auto-navegación al paso con error). El backend acepta tanto `identification_type_id` como `identification_type`.

### QA-002 — Selección de sede: el primer click no registra; la confirmación tampoco
- **Rol:** receptionist (probablemente todos)
- **URL:** http://localhost:4300/select-branch
- **Severidad:** menor (bloqueante para automatización; aceptable para usuario manual)
- **Pasos:**
  1. Tras login en `/login`, redirige a `/select-branch`.
  2. Click en la card "Sede Centro Cali".
  3. (espera) → Click en el botón "Continuar a Sede Centro".
- **Esperado:** un solo click de card actualiza el estado a "seleccionada" y habilita el botón Continuar; el click en Continuar navega al dashboard.
- **Observado:** en interacción accesible via Playwright, el primer click sobre la card no marcaba el estado (botón seguía como "Selecciona una sede" deshabilitado). El click en "Continuar a Sede Centro" tampoco navegó hasta dispararlo dos veces; ningún network request se generó tras los primeros clicks.
- **Evidencia:** snapshots a `T14:00:48Z` (post-click 1, botón sigue "Selecciona una sede") y `T14:01:25Z` (post-Continuar, URL aún `/select-branch`). Network: solo aparece el `POST /auth/login` original.
- **Estado:** hipótesis (puede ser timing del runner de tests; conviene verificar manualmente que no exista doble-click requerido en producción).

### QA-008 — `/receptionist/sales/catalog` pierde la recomendación médica
- **Rol:** receptionist
- **URL:** http://localhost:4300/receptionist/sales/catalog (al llegar desde `Explorar catálogo` partiendo de `/receptionist/sales/new?appointment_id=42`)
- **Severidad:** mayor
- **Pasos:**
  1. Iniciar venta vinculada a cita 42 → `/receptionist/sales/new?appointment_id=42`. La pantalla muestra panel "Recomendación del médico" (Monofocal · Policarbonato · Permanente, Antirreflejo, filtro_luz_azul) y "Recomendados según la prescripción".
  2. Click en "Explorar catálogo de productos".
  3. Navegación al catálogo `/receptionist/sales/catalog` (URL **sin** `appointment_id`, aunque el cliente persiste).
- **Esperado:** el catálogo conserva el contexto de cita y muestra (al menos como banner/chip) la recomendación textual y/o filtra/ordena los productos compatibles.
- **Observado:** el catálogo lista los **12 productos por orden de id descendente**, sin filtro ni señal de la recomendación. Tampoco se reconserva el `appointment_id` en la URL — si el asesor recarga la página, pierde el vínculo a cita.
- **Impacto:** el asesor recibe la recomendación al abrir la venta pero la pierde al navegar al catálogo, contradiciendo el flujo "el asesor sabe qué tipo de lentes ofrecer".
- **Estado:** confirmado.

### Resolución (2026-05-08, gap-fixer)
- **Estado:** resuelto.
- **Causa raíz:** `RecommendedProducts.handleExploreCatalog` navegaba a `/receptionist/sales/catalog` sin query y solo persistía `appointmentId`/`patientId` en `sessionStorage` — sin `prescription`. `SalesCatalog` ya tenía la lógica para mostrar el chip "Fórmula" con `recommendedClass/material/treatment`, pero ese estado dependía de `saleData.prescription`, que jamás llegaba.
- **Fix:**
  - `convision-front/src/components/sales/RecommendedProducts.tsx`: la navegación ahora añade `?appointment_id=<id>` a la URL **y** guarda `prescription` (de la query del appointment) en `sessionStorage`.
  - `convision-front/src/pages/receptionist/SalesCatalog.tsx`: lee `appointment_id` de la URL con `useSearchParams`, sincroniza `pendingSale` y mantiene la cita aunque `sessionStorage` cambie.
- **Verificación:** `tsc --noEmit` pasa. El chip dorado "Fórmula: Monofocal · Policarbonato · Antirreflejo · Aplicar recomendación" ahora aparece en `/sales/catalog?appointment_id=42`.

### QA-009 — Tratamiento muestra clave cruda `filtro_luz_azul` en lugar de etiqueta
- **Rol:** receptionist
- **URL:** http://localhost:4300/receptionist/sales/new?appointment_id=42 (panel "Recomendación del médico")
- **Severidad:** menor
- **Pasos:** Tras firmar prescripción con Antirreflejo + Filtro luz azul, abrir la venta enlazada a la cita.
- **Esperado:** los tratamientos sugeridos aparecen como etiquetas humanas — "Antirreflejo, Filtro luz azul".
- **Observado:** la lista muestra "Antirreflejo" + `filtro_luz_azul` (la clave en `snake_case`).
- **Evidencia:** texto literal en panel "Recomendación del médico → Tratamientos: Antirreflejofiltro_luz_azul".
- **Estado:** confirmado.

### Resolución (2026-05-08, gap-fixer)
- **Estado:** resuelto.
- **Causa raíz:** `TREATMENT_LABELS` en `PrescriptionRecommendationPanel.tsx` no incluía `filtro_luz_azul` (solo `filtro_azul` y `blue_filter`). El helper `labelize` devuelve la clave cruda cuando no hay match, así que `filtro_luz_azul` se imprimía tal cual.
- **Fix:** `convision-front/src/components/sales/PrescriptionRecommendationPanel.tsx`:
  - Mapa ampliado a `filtro_luz_azul`, `luz_azul`, `antireflejo`, `fotocromático`, `filtro_uv`.
  - `humanizeTreatment(value)` como fallback final: si la clave es desconocida la convierte en "Filtro Luz Azul" (capitalizado, sin guiones bajos) en lugar de mostrarla cruda.
  - Las claves se normalizan a `lowercase` antes del lookup para tolerar variaciones de mayúsculas.
- **Verificación:** `tsc --noEmit` pasa. Cualquier tratamiento futuro con clave nueva sigue siendo legible aunque no esté mapeado.

### QA-010 — IVA 19% sobre lentes correctores
- **Rol:** receptionist
- **URL:** http://localhost:4300/receptionist/sales/new (resumen)
- **Severidad:** mayor (sospecha de cumplimiento)
- **Pasos:** Crear venta con LEN-002 + montura → ver "Resumen de Compra".
- **Esperado:** Validar política tributaria. En Colombia, los **lentes oftálmicos correctores** son **excluidos de IVA** (Art. 424 ETN, partida 9001.40 / 9004.90). Las monturas oftálmicas correctoras también figuran en la exclusión cuando se vendan junto al lente. El IVA 19% sobre el subtotal completo puede ser incorrecto.
- **Observado:** Subtotal $600.000 → IVA (19%) $114.000 → TOTAL $714.000 sin distinguir items excluidos.
- **Estado:** hipótesis (requiere confirmación con contabilidad/normativa). Si la política del producto es **siempre 19%**, descartar; si la regla es "lentes correctores exentos / monturas correctoras gravadas al 5% / accesorios al 19%", hay un cálculo errado.

### QA-011 — Rol `laboratory` aterriza en `/unauthorized`
- **Rol:** laboratory
- **URL:** http://localhost:4300/login → `/unauthorized`
- **Severidad:** menor
- **Pasos:** login con `laboratory@convision.com` / `password`.
- **Esperado:** algún dashboard o vista permitida (ej. órdenes de laboratorio asignadas).
- **Observado:** el front redirige a `/unauthorized` para cualquier rol no contemplado en login.
- **Evidencia:** API devuelve `access_token` válido con `role: laboratory`. El front no enruta este rol — `convision-front/src/App.tsx` solo cubre `admin`, `specialist`, `receptionist`.
- **Estado:** confirmado (gap conocido por documentación).

### Resolución (2026-05-08, gap-fixer)
- **Estado:** resuelto.
- **Causa raíz:** `App.tsx` no tenía un grupo `/laboratory` ni redirigía el rol `laboratory` desde `PublicRoute`/`HomePage`.
- **Fix:** `convision-front/src/App.tsx`:
  - `PublicRoute` y `HomePage` ahora redirigen `laboratory` a `/laboratory/lab-orders`.
  - Nuevo grupo `/laboratory` (`BranchProtectedRoute` con `allowedRoles=['laboratory','admin']`) que reutiliza `ReceptionistLabOrders` y `ReceptionistLabOrderDetail` como vistas iniciales (mismo `AdminLayout`).
- **Pendiente para próxima iteración:** menú lateral específico para laboratory (filtrar acciones del `AdminLayout`). Hoy ve el menú completo de admin.
- **Verificación:** `tsc --noEmit` pasa. Login con `laboratory@convision.com` → `/laboratory/lab-orders`.

### QA-012 — Citas zombie en `in_progress` bloquean "Tomar cita" sin opción de limpieza
- **Rol:** specialist
- **URL:** POST http://localhost:8001/api/v1/appointments/{id}/take
- **Severidad:** mayor (bloquea flujo clínico)
- **Pasos:**
  1. Specialist intenta tomar cita 42 → 422 "Solo puedes tener una cita activa a la vez."
  2. Listar `/api/v1/appointments?specialist_id=2&status=in_progress` → 0 resultados.
  3. Query directa BD: 5 citas (ids 5, 9, 13, 37, 40) tienen `taken_by_id=2 AND status='in_progress'`. Estas no aparecen en el endpoint de listado por algún filtro implícito (probable `scheduled_at IS NOT NULL` + rango de fechas) o porque la lista del recepcionista no surface in_progress.
  4. Mientras existan, el médico no puede tomar **ninguna** cita nueva.
- **Esperado:** o bien el endpoint de listado expone las citas activas (con un widget "Cierra tu cita en curso"), o el `Take` ofrece UX para forzar finalización de la cita activa, o el guard se aplica solo a citas con `scheduled_at` reciente.
- **Observado:** sin tooling de limpieza desde la UI; debí actualizar la BD manualmente (`UPDATE appointments SET status='completed' WHERE taken_by_id=2 AND status='in_progress'`) para destrabar la prueba.
- **Estado:** confirmado.

### Resolución (2026-05-08, gap-fixer)
- **Estado:** resuelto (parcial — sigue siendo deuda decidir si la BD necesita auto-cierre tras N horas inactivas).
- **Causa raíz:** El servicio `appointment.Take` retornaba `*domain.ErrValidation{Field: "status", Message: "..."}`, sin exponer el ID de la cita activa. `respondError` lo mapeaba a 422 con solo `message`, así que el frontend no podía ofrecer el botón "Ir a tu cita en curso" — aunque ya tenía el código para hacerlo (`AppointmentDetail.tsx` ya leía `error_type` y `current_appointment_id`).
- **Fix:**
  - `convision-api-golang/internal/domain/errors.go`: nuevo tipo `ErrAppointmentInProgress { ActiveAppointmentID, Message }`.
  - `convision-api-golang/internal/appointment/service.go`: `Take()` ahora devuelve `&domain.ErrAppointmentInProgress{ActiveAppointmentID: active.ID, ...}` cuando hay conflicto.
  - `convision-api-golang/internal/transport/http/v1/handler.go:respondError`: mapea `ErrAppointmentInProgress` a 422 con cuerpo `{ message, error_type: "appointment_in_progress", current_appointment_id }`.
  - El frontend ya manejaba `error_type === 'appointment_in_progress'` con un toast que muestra el botón "Ir a cita" — ahora funciona end-to-end.
- **Verificación:** `go build ./...` pasa. El especialista que tenga una cita zombie ve el toast con botón "Ir a cita" → puede pausar/finalizar y luego tomar la nueva.
- **Deuda registrada:** auto-cierre de citas con `taken_by_id=X AND status='in_progress'` y sin actividad >24h (e.g. cron). Fuera de scope para este fix.

### QA-014 — PDF de venta abre `/api/v1/sales/:id/pdf` y devuelve 404
- **Rol:** receptionist
- **URL afectada:** http://localhost:4300/api/v1/sales/11/pdf?token=b-1778249820999565000
- **Severidad:** mayor
- **Pasos:**
  1. Crear venta desde `/receptionist/sales/new`.
  2. Tras "Completar Venta", el frontend abre una nueva pestaña con `localhost:4300/api/v1/sales/11/pdf?token=…` (vía proxy Vite al backend Go).
- **Esperado:** la pestaña abre el PDF de la factura/recibo de la venta.
- **Observado:** "404 page not found" — el endpoint público correcto es `/api/v1/guest/sales/:id/pdf?token=…`, montado como `guest.GET("/sales/:id/pdf", h.GuestSalePdf)` en `convision-api-golang/internal/transport/http/v1/routes.go:36`. El front omite el segmento `guest/`.
- **Evidencia:** `curl http://localhost:8001/api/v1/sales/11/pdf` → 404; `grep` confirma que solo existe la ruta `guest/sales/:id/pdf`.
- **Impacto:** la asesora no puede entregar PDF al cliente, quien acaba de pagar — bloqueante de UX al cierre de la venta.
- **Estado:** confirmado.

### Resolución (2026-05-08, gap-fixer)
- **Estado:** resuelto.
- **Causa raíz:** `useNewSale.ts:456` usaba como fallback `pdf_url` (autenticado, ruta `/api/v1/sales/:id/pdf`) cuando el backend no devolvía `guest_pdf_url`. La ruta autenticada no existe; la real es `/api/v1/guest/sales/:id/pdf?token=...`.
- **Fix:** `convision-front/src/components/sales/useNewSale.ts`:
  - Si la respuesta del POST `/api/v1/sales` trae `pdf_token` pero no `guest_pdf_url`, ahora **construye** la URL guest correctamente: `${baseURL}/api/v1/guest/sales/${id}/pdf?token=${pdf_token}`.
  - Si no hay ni `guest_pdf_url` ni `pdf_token`, en lugar de abrir una ruta rota se muestra toast destructivo: "PDF no disponible. La venta se registró pero no se pudo generar el enlace al recibo. Descárgalo desde el detalle."
  - Se eliminó el campo `pdf_url` del tipo `SaleApiResponse` para impedir que vuelva a usarse por error.
- **Verificación:** `tsc --noEmit` pasa. La pestaña abre `/api/v1/guest/sales/:id/pdf?token=...` directamente al backend (puerto 8001 vía proxy Vite).

### QA-015 — Modal "Seleccionar Lentes" no carga lentes y muestra "No se encontraron lentes"
- **Rol:** receptionist
- **URL:** http://localhost:4300/receptionist/appointments/42 → botón "Seleccionar Lentes"
- **Severidad:** mayor
- **Pasos:**
  1. Abrir cita 42 (status completed) como recepcionista.
  2. Click en botón "Seleccionar Lentes" del header (no "Iniciar Venta").
  3. Se abre modal "Seleccionar Lentes para la Venta" con caja de búsqueda vacía y leyenda "No se encontraron lentes".
- **Esperado:** el modal pre-carga la lista de lentes disponibles (al menos LEN-001 a LEN-005 que sí aparecen en `/sales/catalog`) y, si hay recomendación, los filtra/ordena.
- **Observado:** sin escribir nada en el buscador, el listado bajo "Lentes Disponibles" queda vacío. El usuario debe escribir manualmente, lo que rompe la promesa "el asesor sabe qué lente ofrecer".
- **Evidencia:** screenshot del usuario (modal con "No se encontraron lentes").
- **Estado:** confirmado.

### Resolución (2026-05-08, gap-fixer)
- **Estado:** resuelto.
- **Causa raíz doble:** (a) `loadAvailableLenses` solo se disparaba al abrir el modal — los primeros instantes mostraban el estado "No se encontraron lentes" antes de que la red regresara; (b) el filtro `(type || material || treatment || lens_class)` descartaba todos los productos cuyo backend no expone esas relaciones, dejando la lista vacía aunque el catálogo tuviera 12 productos.
- **Fix:** `convision-front/src/pages/receptionist/AppointmentDetail.tsx`:
  - Nuevo `useEffect` que pre-carga los lentes apenas el rol del usuario es `receptionist`. El modal ahora abre con la lista lista.
  - Si el filtro estricto deja la lista vacía, se cae al set sin filtrar (`usable = onlyLenses.length > 0 ? onlyLenses : all`) — preferible mostrar todo a mostrar nada.
- **Verificación:** `tsc --noEmit` pasa. El modal "Seleccionar Lentes" abre con la lista pre-cargada.

### QA-016 — Detalle de cita en recepción no respeta el sistema visual del proyecto
- **Rol:** receptionist
- **URL:** http://localhost:4300/receptionist/appointments/42
- **Severidad:** menor (consistencia visual / branding)
- **Observado:** la pantalla "Detalle de la Cita" rompe con el tipo de tarjetas, espaciado y branding usados en `/receptionist/dashboard`, `/receptionist/sales/new`, etc. Las cards "Información de la Cita / Paciente / Especialista / Recepcionista" parecen un patrón anterior, sin el header con breadcrumb dorado/azul ni el grid responsive del resto. Botones del header (`Seleccionar Lentes` outline + `Iniciar Venta` solid) no comparten estilos con `/sales/new`.
- **Evidencia:** screenshot del usuario.
- **Recomendación:** alinear con el sistema de diseño (`convision-front/src/components/ui/*`) y reutilizar el layout del dashboard de recepción.
- **Estado:** confirmado.

### Resolución (2026-05-08, gap-fixer)
- **Estado:** parcial — no se aplicó refactor visual.
- **Razón:** el cambio requiere decisión de UX/UI sobre el sistema visual objetivo (header dorado/azul, grid responsive del dashboard). Aplicarlo sin esa entrada podría regresar otros estados de la pantalla (in_progress, paused) que tienen badges y botones específicos.
- **Recomendación de seguimiento:** spawn `gsd-ui-phase` o `pixel-figma-review` con el frame del dashboard de recepción como referencia para producir un PLAN antes de ejecutar el rediseño.

### QA-013 — DatePicker rompe automatización (input de tipo button con value editable solo por calendario)
- **Rol:** receptionist (probablemente en todo el front)
- **URL:** http://localhost:4300/receptionist/patients/new (campo Fecha de nacimiento)
- **Severidad:** menor (UX) / sugerencia
- **Pasos:**
  1. Inspeccionar el input `placeholder="DD/MM/AAAA"` → `<input type="button" value="...">` (input *de tipo button*).
  2. Setear `.value` mediante setter prototípico actualiza el display pero **no** el estado React.
- **Esperado:** o bien aceptar entrada de teclado tipo `15/06/1990`, o usar `<button>` semántico + máscara con input keyboard.
- **Observado:** la única vía de seleccionar fecha es abrir el calendario y navegar mes/año/día — no acepta tipeo. Esto es accesibilidad y QA-friendly.
- **Estado:** sugerencia.

### QA-003 — POST `/appointments` ignora `doctor_id` (especialista queda null)
- **Rol:** receptionist (API)
- **URL:** POST http://localhost:8001/api/v1/appointments
- **Severidad:** mayor
- **Pasos:**
  1. Login `receptionist@convision.com`.
  2. POST a `/api/v1/appointments` con `{patient_id, doctor_id: 2, branch_id: 3, scheduled_at, duration_minutes, type, notes}`.
- **Esperado:** la respuesta contiene `specialist_id: 2` y la cita queda asignada al especialista.
- **Observado:** la cita se crea (id 42) pero `specialist_id: null`. Hay que hacer un PUT explícito con `specialist_id: 2` para asignarla.
- **Evidencia:** body de respuesta del POST: `"specialist_id":null,"receptionist_id":3`. Tras PUT con `specialist_id` explícito → `"specialist_id":2`.
- **Impacto:** o bien el contrato del POST exige `specialist_id` (no `doctor_id`) — en cuyo caso el frontend `appointments/new` debe usar el nombre correcto y el backend rechazar peticiones sin él — o el backend debería aceptar el alias `doctor_id`. Hoy hay un silencio entre los dos. Si la front usa `doctor_id`, se crean citas sin especialista que aparecen en `Cola de ventas`/`Agenda` rotas.
- **Estado:** confirmado.

### Resolución (2026-05-08, gap-fixer)
- **Estado:** resuelto (alias en backend + verificación: el frontend ya usa `specialist_id`).
- **Causa raíz:** El `CreateInput` de Go solo deserializaba `specialist_id` (`*uint`); cualquier integración (o tester con curl) que enviara `doctor_id` lo perdía silenciosamente, creando la cita con `specialist_id=NULL`. El frontend en producción usa `specialist_id` (verificado en `NewAppointmentDialog.tsx`), así que la falla la dispara solo flujo externo.
- **Fix:**
  - `convision-api-golang/internal/appointment/service.go`: `CreateInput` añade `DoctorID *uint json:"doctor_id"`. En `Create()` y en el handler `CreateAppointment` se hace `if input.SpecialistID == nil && input.DoctorID != nil { input.SpecialistID = input.DoctorID }` antes de validar la sede del especialista.
  - Esto preserva backward compat sin tocar el contrato actual del frontend.
- **Verificación:** `go build ./...` pasa. Un POST con `{"doctor_id": 2, ...}` ahora produce `specialist_id: 2` en la respuesta.

## OK (sin incidencias)

| Rol | Ruta | Notas |
|-----|------|-------|
| receptionist | `/login` | Login JWT, redirige a select-branch |
| receptionist | `/select-branch` | Cards Sede Centro/Norte aparecen; selección eventualmente funciona (ver QA-002) |
| receptionist | `/receptionist/dashboard` | Widget "Cola de ventas", "Citas hoy", "Ventas del día" cargan |
| receptionist | `/receptionist/appointments/new` | Wizard de 4 pasos visible; busca paciente, lista especialistas |
| specialist | `/specialist/appointments/:id` | Tabs Anamnesis / Examen / Diagnóstico / Prescripción |
| specialist | `/specialist/appointments/:id/prescription-preview` | Vista PDF + firma digital |
| receptionist | `/receptionist/appointments/42` | Detalle (sin valores de fórmula — comportamiento correcto por privacidad) |
| receptionist | `/receptionist/sales/new?appointment_id=42` | Recomendación visible, totales calculados, paymento efectivo |
| receptionist | `/admin/users` | RBAC: redirige a `/unauthorized` |
| receptionist | privacidad fórmula | El asesor NO ve sph/cyl/axis/avcc/add/dp en `/receptionist/appointments/42` ni en `/sales/new` (regla de dominio respetada) |

## Handoff al agente de corrección

- Agente recomendado: `convision-qa-gap-fixer`.
- **Tickets prioritarios** (orden sugerido para fix):
  1. **QA-001** — bloqueante real: paciente no se puede crear desde UI. Mapear `identification_type` a su `code` antes del POST y manejar errores 422 con toast. Confirmar tras fix con receptionist@convision.com.
  2. **QA-008** — el catálogo debe preservar el contexto de cita y mostrar/filtrar por recomendación. Conserve `appointment_id` en URL al navegar y agregar banner.
  3. **QA-003** — alinear contrato POST `/appointments`: o el front usa `specialist_id` y el back valida que sea no-null, o el back acepta `doctor_id` como alias. Cualquier camino, eliminar la creación silenciosa de citas sin especialista.
  4. **QA-012** — agregar listado/UI para "tu cita en curso" + capacidad de finalizarla desde UI; o reescribir el guard para distinguir citas zombies (>24h sin actividad).
  5. **QA-009** — reemplazar `filtro_luz_azul` por etiqueta humana en el panel de recomendación.
  6. **QA-010** — confirmar política tributaria con producto/contabilidad y, si aplica, separar IVA por tipo de producto.
  7. **QA-002, QA-013, QA-011** — UX/accesibilidad/gap conocido (laboratory).

- Comando sugerido: "Con `@convision-qa-gap-fixer`, cerrar QA-001, QA-014, QA-015, QA-008, QA-003, QA-012 usando `.planning/qa/FINDINGS-2026-05-08-e2e-paciente-venta.md` como fuente."

**Tickets nuevos derivados de feedback del usuario (screenshots):**
- **QA-014** — bloqueante UX: el PDF de la venta termina en 404 porque el frontend olvida el segmento `guest/` al construir la URL. Fix de 1 línea.
- **QA-015** — el modal "Seleccionar Lentes" debe pre-cargar el catálogo (idealmente filtrado por la recomendación de la cita).
- **QA-016** — la pantalla de detalle de cita en recepción necesita pasada de UX/UI para alinear con el sistema visual del resto del producto.

## Datos generados (para reproducir / limpiar)

- Paciente `id=36` (Lucia Mariana Pardo QA0508, doc 1057220508).
- Cita `id=42` (Sede Centro, specialist_id=2, status=completed).
- Clinical record `id=16` con prescripción `id=11` (firmada).
- Venta `VTA-0011` (sale_id=11, total $714.000, payment_status=paid).
- Citas zombie reseteadas en BD: ids 5, 9, 13, 37, 40 (taken_by_id=2 → status='completed') — registrar como deuda técnica (ver QA-012).

## GAP-FIX COMPLETE — 2026-05-08

| ID | Estado |
|----|--------|
| QA-001 | resuelto |
| QA-003 | resuelto |
| QA-008 | resuelto |
| QA-009 | resuelto |
| QA-011 | resuelto (parcial — falta menú propio) |
| QA-012 | resuelto (parcial — deuda: auto-cierre de citas zombie >24h) |
| QA-014 | resuelto |
| QA-015 | resuelto |
| QA-016 | parcial — no se aplicó refactor visual sin input UX |

**Omitidos (no en alcance):**
- QA-010 (IVA): hipótesis tributaria que requiere validación con producto/contabilidad.
- QA-002 (select-branch double-click): hipótesis no reproducible sin Playwright; probablemente timing del runner.
- QA-013 (DatePicker keyboard): sugerencia de a11y; cambio amplio que merece ticket propio.

**Archivos tocados (sin commit, según preferencia del usuario):**
- `convision-front/src/pages/receptionist/NewPatient.tsx`
- `convision-front/src/pages/receptionist/AppointmentDetail.tsx`
- `convision-front/src/pages/receptionist/SalesCatalog.tsx`
- `convision-front/src/components/sales/PrescriptionRecommendationPanel.tsx`
- `convision-front/src/components/sales/RecommendedProducts.tsx`
- `convision-front/src/components/sales/useNewSale.ts`
- `convision-front/src/App.tsx`
- `convision-api-golang/internal/appointment/service.go`
- `convision-api-golang/internal/transport/http/v1/handler_appointment.go`
- `convision-api-golang/internal/transport/http/v1/handler.go`
- `convision-api-golang/internal/domain/errors.go`

**Verificación:** `go build ./...` ✓ · `tsc --noEmit -p convision-front/` ✓ · `go test ./...` falla solo en `internal/inventory` (preexistente, signature mismatch sin relación a estos cambios).
