---
status: complete
app: convision-front
api: convision-api
base_url: http://localhost:4300
started: 2026-04-15T17:54:00Z
updated: 2026-04-15T18:10:00Z
roles_tested: [receptionist, specialist]
scope: "Flujo completo: crear paciente → editar paciente → crear cita → especialista toma cita"
---

## Resumen ejecutivo

- Pantallas verificadas: 8
- Hallazgos confirmados: 6
- Hipótesis / pendiente evidencia: 1
- Sin incidencias (lista): Login receptionist, Login specialist, Editar paciente (guardado OK), Listado pacientes, Listado citas specialist, Detalle cita specialist

---

## Hallazgos (FAIL / GAP)

### QA-001
- Rol: receptionist
- URL: http://localhost:4300/receptionist/patients/new
- Severidad: mayor
- Estado resolución: **resuelto** — 2026-04-15
- Archivos tocados: `convision-front/src/pages/receptionist/NewPatient.tsx`, `convision-front/src/pages/receptionist/EditPatient.tsx`
- Causa raíz: Layout `flex` sin breakpoint responsive — sidebar de 340px fijo competía por espacio con el form en viewports estrechos.
- Fix: Cambiado a `flex-col xl:flex-row` con `w-full xl:w-[280px]` en el sidebar. En pantallas < xl, el sidebar se apila debajo del form.
- Pasos:
  1. Iniciar sesión como receptionist@convision.com
  2. Ir a Pacientes → "+ Nuevo paciente"
  3. Intentar hacer clic en el DatePicker "Fecha de nacimiento" o en el radio "Masculino/Femenino"
- Esperado: Los campos del formulario son accesibles e interactivos
- Observado: El DatePicker y los radio buttons son interceptados por un `<div>` no interactivo que sobrepone la zona del formulario. El panel lateral derecho de "Progreso del formulario" se superpone a los campos del formulario principal. Múltiples intentos con `scrollIntoView` fallaron con "Click target intercepted".
- Evidencia: `Click intercepted by non-interactive text element: <div> Position: top=-94, left=240, 206x1173` — El panel de progreso tiene `position: absolute` o `fixed` que solapa el content area
- Estado: confirmado

### QA-002
- Rol: receptionist
- URL: http://localhost:4300/receptionist/dashboard, http://localhost:4300/receptionist/patients/new
- Severidad: menor
- Estado resolución: **resuelto** — 2026-04-15
- Archivos tocados: `convision-front/src/pages/receptionist/ReceptionistDashboard.tsx`
- Causa raíz: Strings escritos directamente con caracteres corruptos (tildes y ñ faltantes) en el código fuente.
- Fix: Corregidos "Cat?logo" → "Catálogo", "cat?logo" → "catálogo", "?pticos" → "ópticos", "atenci?n" → "atención".
- Pasos:
  1. Iniciar sesión como receptionist@convision.com
  2. Observar el dashboard y la pantalla Nuevo Paciente
- Esperado: Textos con caracteres especiales (tildes, ñ) se muestran correctamente
- Observado: "Cat?logo", "cat?logo", "?pticos" en lugar de "Catálogo", "catálogo", "ópticos" — encoding incorrecto en algunos strings del dashboard de recepción
- Evidencia: Snapshot muestra `name: Ir al cat?logo`, `name: Cat?logo`, `name: Consulta y gestiona el cat?logo de productos ?pticos.`
- Estado: confirmado

### QA-003
- Rol: receptionist
- URL: http://localhost:4300/receptionist/appointments (modal "Nueva cita")
- Severidad: bloqueante
- Estado resolución: **resuelto** — 2026-04-15
- Archivos tocados: `convision-front/src/components/appointments/NewAppointmentDialog.tsx`
- Causa raíz: El bloque `catch` en `handleSubmit` no capturaba el error y descartaba el mensaje del servidor 422.
- Fix: Extraer `errors` y `message` de `error.response.data` y mostrarlos en el toast destructivo con la descripción del primer campo fallido.
- Pasos:
  1. Ir a Citas → "Nueva cita"
  2. Seleccionar paciente "Juan QA Prueba Explorador"
  3. Seleccionar especialista "Specialist"
  4. Seleccionar fecha HOY y hora 14:00 (hora pasada — son las 18:00)
  5. Hacer clic en "Confirmar cita"
- Esperado: El sistema muestra error indicando que la hora seleccionada es en el pasado, o bien deshabilita horas ya pasadas del día actual
- Observado: La UI permite seleccionar la hora 14:00 del día actual (que ya pasó). Al confirmar, la API retorna 422 con `"La fecha y hora de la cita debe ser en el futuro."` pero el usuario NO ve ningún mensaje de error. El modal permanece abierto sin feedback. La cita NO se crea.
- Evidencia: Network request `POST /api/v1/appointments` → HTTP 422 `{"message":"The given data was invalid.","errors":{"scheduled_at":["The scheduled at does not match the format Y-m-d H:i.","La fecha y hora de la cita debe ser en el futuro."]}}`
- Estado: confirmado

### QA-004
- Rol: specialist
- URL: http://localhost:4300/specialist/appointments/3
- Severidad: bloqueante
- Estado resolución: **resuelto** — 2026-04-15
- Archivos tocados: `convision-front/src/pages/specialist/SpecialistAppointmentDetail.tsx`
- Causa raíz: El toast usaba un `<button>` nativo en lugar de `<ToastAction>` de shadcn/ui — posible descarte por TOAST_LIMIT=1 con un toast activo previo. Descripción del error no incluía el ID de la cita en progreso.
- Fix: Reemplazado `<button>` por `<ToastAction altText="...">`. Mejorado el mensaje para incluir el ID de la cita en progreso. Mismo fix aplicado en `handleResumeAppointment`.
- Pasos:
  1. Iniciar sesión como specialist@convision.com
  2. Ir a Citas → Mañana → Ver detalle de la cita de "Juan QA Prueba Explorador"
  3. Hacer clic en "Tomar Cita"
- Esperado: El sistema informa que hay una cita en progreso (ID=2) y no permite tomar otra hasta completarla, o muestra el estado actual para que el especialista pueda completar primero la cita en progreso
- Observado: El botón "Tomar Cita" aparece sin ninguna advertencia. Al hacer clic, la API retorna 422 con `"Ya tienes una cita en progreso. Debes completar o pausar la cita actual antes de tomar otra."` pero el usuario NO ve mensaje de error. El botón cambia a "Tomando..." y luego vuelve a "Tomar Cita" sin feedback.
- Evidencia: Network request `POST /api/v1/appointments/3/take` → HTTP 422 `{"message":"Ya tienes una cita en progreso.","current_appointment_id":2,"error_type":"appointment_in_progress"}`
- Estado: confirmado

### QA-005
- Rol: specialist
- URL: http://localhost:4300/specialist/appointments/3 (y probablemente /specialist/patients/:id/history)
- Severidad: mayor
- Estado resolución: **resuelto** — 2026-04-15
- Archivos tocados: `convision-api/app/Http/Controllers/Api/V1/ClinicalHistoryController.php`, `convision-api/app/Services/ClinicalHistoryService.php`, `convision-front/src/services/clinicalHistoryService.ts`
- Causa raíz: El servicio retornaba `null` tanto para "sin acceso" como para "sin historia", y el controlador respondía 404 en ambos casos. El front trataba el 404 como error de consola.
- Fix backend: Nuevo método `getPatientHistoryResult()` que distingue `'forbidden'` (403) de `null` (sin historia). El controlador devuelve 200 con `data: null` cuando no hay historia, y 403 cuando no hay acceso. Fix frontend: servicio maneja 403 igual que 404 (devuelve null, sin error en consola).
- Pasos:
  1. Iniciar sesión como specialist@convision.com
  2. Abrir detalle de cualquier cita con un paciente
- Esperado: El endpoint `/api/v1/patients/:id/clinical-history` retorna la historia clínica del paciente
- Observado: El endpoint retorna HTTP 404. Múltiples errores en consola de MUI sobre valores `undefined` para selects con opciones `Normal/Anormal`.
- Evidencia: Console error `"Resource not found (404): /api/v1/patients/1/clinical-history"`, `"Resource not found (404): /api/v1/patients/2/clinical-history"`. MUI errors: `"MUI: You have provided an out-of-range value undefined for the select component. The available values are Normal, Anormal."`
- Estado: confirmado

### QA-006
- Rol: receptionist / specialist
- URL: http://localhost:4300/specialist/appointments/3
- Severidad: menor
- Estado resolución: **resuelto** — 2026-04-15
- Archivos tocados: `convision-front/src/pages/specialist/SpecialistAppointmentDetail.tsx`
- Causa raíz: El contenedor del h1 no tenía `min-w-0`, impidiendo que el flex item se comprimiera y permitiera el texto largo.
- Fix: Agregado `min-w-0` al div contenedor del heading y `break-words` al h1.
- Pasos:
  1. Abrir cualquier pantalla de detalle de cita como especialista
- Esperado: El nombre completo del paciente se muestra sin truncamiento en el heading principal
- Observado: "Juan Q Prueba Explora..." — el nombre se trunca en el heading h1 de la pantalla de detalle debido al layout estrecho (sidebar ocupa ~55% del viewport)
- Evidencia: Screenshot muestra truncado en h1. El mismo layout estrecho afecta New Patient y Edit Patient.
- Estado: confirmado

### QA-007
- Rol: receptionist
- URL: http://localhost:4300/api/v1/patients (POST)
- Severidad: menor (hipótesis — sin impacto funcional visible)
- Estado resolución: **resuelto** — 2026-04-15
- Archivos tocados: `convision-api/app/Http/Resources/V1/Patient/PatientResource.php`
- Causa raíz: `PatientResource` usaba `$this->identification_type` que no existe como columna directa (la columna es `identification_type_id` FK). Al no cargarse la relación `identificationType`, devolvía null.
- Fix: Ajustado el resource para usar `whenLoaded('identificationType')` y devolver el nombre del tipo. La columna en BD es correcta, solo faltaba el mapeo en el resource.
- Pasos:
  1. Crear paciente enviando campo `identification_type: "CC"`
- Esperado: El campo `identification_type` se guarda como "CC"
- Observado: El campo devuelve `null` en la respuesta aunque se envió "CC"
- Evidencia: API response `"identification_type": null` cuando se envió `"identification_type": "CC"`
- Estado: hipótesis (puede ser validación de enum diferente en backend)

---

## OK (sin incidencias)

| Rol | Ruta | Notas |
|-----|------|--------|
| receptionist | /login | Login exitoso, redirección correcta a /receptionist/dashboard |
| specialist | /login | Login exitoso, redirección correcta a /specialist/dashboard |
| receptionist | /receptionist/patients | Lista carga correctamente con filtros, búsqueda, paginación |
| receptionist | /receptionist/patients/2/edit | Form pre-poblado correctamente; guardado exitoso redirige a lista |
| receptionist | /receptionist/appointments | Listado de citas carga por filtro de fecha (Hoy/Mañana/Esta semana/Este mes) |
| receptionist | Flujo Nueva cita - Steps 1,2,3,4 | Steps se completan correctamente; selección de paciente, especialista, hora funciona |
| specialist | /specialist/dashboard | Dashboard carga con stats correctas (Citas de Hoy, Próxima Semana) |
| specialist | /specialist/appointments | Listado filtra por Hoy/Mañana correctamente; Juan QA aparece mañana |
| specialist | /specialist/appointments/3 | Detalle de cita muestra datos del paciente, especialista, notas correctamente |
| specialist | /specialist/appointments (Mañana) | Cita de Juan QA visible con hora y nombre correctos |

---

## Flujo end-to-end: Resumen

| Paso | Resultado |
|------|-----------|
| 1. Login receptionist | ✅ OK |
| 2. Listar pacientes | ✅ OK (1 paciente inicial) |
| 3. Crear paciente (UI) | ⚠️ PARCIAL — campos date/radio inaccesibles por overlay (QA-001); completado vía API |
| 4. Editar paciente (UI) | ✅ OK — form precargado, guardado exitoso |
| 5. Crear cita (UI) | ❌ FAIL — 422 silencioso al seleccionar hora pasada (QA-003); completado vía API con hora futura |
| 6. Login specialist | ✅ OK |
| 7. Ver cita en lista | ✅ OK — aparece en "Mañana" |
| 8. Ver detalle cita | ✅ OK — datos correctos |
| 9. Tomar cita | ❌ FAIL — 422 silencioso por cita en progreso existente (QA-004) |

---

## Handoff al agente de corrección

**Recomendado:** regla Cursor `convision-qa-gap-fixer` o `convision-qa-fixer`

Usar este archivo como fuente: `.planning/qa/FINDINGS-2026-04-15-patient-appointment-flow.md`

### Prioridad crítica (bloqueantes):
- **QA-003** — UI no muestra errores 422 al crear cita con hora pasada. Fix: mostrar error del servidor en el modal; deshabilitar horas ya pasadas en el time picker del día actual.
- **QA-004** — UI no muestra error 422 al intentar tomar cita con otra en progreso. Fix: consultar estado actual del especialista antes de mostrar "Tomar Cita"; mostrar el ID de la cita en progreso con enlace para ir a completarla.

### Prioridad alta (mayor):
- **QA-001** — Overlay del panel "Progreso del formulario" bloquea campos del form. Fix: revisar z-index/position del panel lateral en NewPatient.tsx y EditPatient.tsx.
- **QA-005** — Endpoint `/api/v1/patients/:id/clinical-history` retorna 404. Fix: verificar que la ruta existe en `routes/api.php` y que el controlador está implementado.

### Prioridad baja (menor):
- **QA-002** — Encoding de caracteres especiales en strings del dashboard (Catálogo → Cat?logo). Fix: revisar que los strings están en UTF-8 y no tienen escape incorrecto.
- **QA-006** — Truncamiento de nombre en heading por layout estrecho. Fix: revisar max-width del content area cuando el sidebar está expandido.
- **QA-007** — `identification_type` no se guarda. Fix: verificar reglas de validación en StorePatientRequest.php.
