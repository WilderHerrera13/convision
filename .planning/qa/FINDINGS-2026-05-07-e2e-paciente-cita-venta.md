---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
api_url: http://localhost:8001
started: 2026-05-07
updated: 2026-05-07
roles_tested: [receptionist, specialist]
scope: E2E paciente -> cita -> gestion medico (prescripcion + recomendacion lente) -> asesor (cotizacion/venta lente + montura) -> cierre venta
---

# QA E2E — Paciente: agenda, consulta, recomendacion y venta

## Resumen ejecutivo

E2E del journey paciente → cita → consulta médica → recomendación de lente → venta. Se completaron las 3 etapas hasta la creación de venta `VTA-0008`, pero el flujo está atravesado por bugs críticos que rompen la trazabilidad clínico-comercial.

- Pantallas verificadas: 9 (login, dashboard recepcionista, /patients/new, /appointments/new, /select-branch specialist, /appointments, /appointments/:id (clinical record), /prescription-preview, /sales/new, /sales/catalog)
- Hallazgos confirmados: 14
- Hipótesis: 0
- Roles probados: receptionist, specialist
- Cita creada: ID 37 (mañana 9:00 AM con Specialist)
- Venta creada: VTA-0008 (paciente Laura QA E2E Patient — id 32)

Tres bugs son **bloqueantes**: QA-003 (mezcla de roles en lista de "especialistas"), QA-007 (`PUT /diagnosis` retorna 500 por columna `related_1_code` faltante), QA-012 (asesor no ve la recomendación del médico al iniciar la venta).

## Hallazgos (FAIL / GAP)

### QA-001
- Rol: receptionist
- URL: http://localhost:4300/receptionist/patients/new
- Severidad: mayor
- Pasos:
  1. Login receptionist y abrir "Registrar paciente".
  2. Click en campo "Fecha de nacimiento *".
  3. Observar el calendario emergente (react-day-picker).
- Esperado: para fecha de nacimiento, el DatePicker debe permitir saltar de año (selector de año/decada) o aceptar entrada por teclado tipo `dd/mm/yyyy`.
- Observado: solo hay flechas "Go to previous month / next month" y el header `mayo 2026` no es interactivo. Para una persona nacida en 1990 se requieren ~430 clicks. El input es `<button placeholder="DD/MM/AAAA">`, no `<input>`, y no acepta texto.
- Evidencia: dialog `[role="dialog"]` con sólo dos botones de navegación (`previous-month`, `next-month`) y celdas de día; el caption `mayo 2026` no es boton; ver fuente: el componente DatePicker custom envuelve react-day-picker sin `captionLayout="dropdown"`.
- Estado: confirmado
- Impacto: bloquea registro realista de pacientes adultos por UI; obliga a workarounds (carga vía API/Excel).

### QA-002
- Rol: receptionist
- URL: http://localhost:4300/receptionist/appointments (afecta layout global)
- Severidad: menor
- Pasos:
  1. Login `receptionist@convision.com`.
  2. Abrir cualquier vista (Citas, Pacientes, etc.).
  3. Inspeccionar consola del navegador.
- Esperado: el front no debería pedir endpoints prohibidos para el rol; o el back debe permitir lectura limitada de sucursales para mostrar el chip "Sede Norte" / botón "Cambiar sede".
- Observado: 3× `GET /api/v1/branches` → HTTP 403 Forbidden ensuciando consola en todas las vistas del receptionist (el sidebar muestra "Sede Norte" y botón "Cambiar sede").
- Evidencia: consola — `Failed to load resource: the server responded with a status of 403 (Forbidden) @ http://localhost:4300/api/v1/branches:0` (×3).
- Estado: confirmado

### QA-003
- Rol: receptionist
- URL: http://localhost:4300/receptionist/appointments/new (paso 2 - Especialista)
- Severidad: bloqueante
- Pasos:
  1. Login receptionist → "Nueva cita".
  2. Seleccionar paciente, ir al paso 2 "Seleccionar especialista".
- Esperado: la lista debe contener solo usuarios con rol `specialist`.
- Observado: lista mezcla receptionists (`Receptionist`, `Recepcionista1`–`Recepcionista4`) y laboratory (`Laboratory`/`hquintero`), todos etiquetados como "Especialista". El usuario podría agendar una cita médica con un asesor o laboratorista.
- Evidencia: snapshot del paso 2; usuarios visibles: Carlos, Specialist, Receptionist (rol receptionist), Second, Recepcionista1-4, Andres, Sandra, Laboratory. Endpoint backing: presumiblemente lista de usuarios sin filtrar por rol = specialist.
- Estado: confirmado
- Nota: integridad clínica — afecta historia clínica/prescripción si se agenda con rol equivocado.

### QA-004
- Rol: specialist (también admin si no tiene sede preseleccionada)
- URL: http://localhost:4300/select-branch
- Severidad: menor (potencial mayor en automatización/QA)
- Pasos:
  1. Login `specialist@convision.com`.
  2. Click sobre la tarjeta "Sede Norte" (o cualquier sede).
- Esperado: la sede seleccionada se marca visualmente y se habilita el botón "Selecciona una sede" → "Continuar".
- Observado: con un clic estándar (`click`) la tarjeta no se selecciona — el botón submit permanece deshabilitado. La selección sólo se activa con eventos pointer (`pointerdown`/`pointerup`). Posible falta de `onClick` o un manejador atado solo a `onPointerDown`.
- Evidencia: con eventos `PointerEvent` la clase del card pasa de `border` a `border-2`; con clicks normales no cambia.
- Estado: confirmado (reproducible con DevTools)
- Impacto: usuarios reales con clic normal del mouse pueden quedar bloqueados (depende del navegador). Reproducir con teclado/touch para confirmar alcance.

### QA-005
- Rol: recepcionista vs specialist (cross-role)
- URL: http://localhost:4300/specialist/appointments?period=week vs /receptionist/appointments
- Severidad: mayor
- Pasos:
  1. Como receptionist agendar cita "Laura QA E2E Patient" para mañana 9:00 AM con specialist `Specialist`.
  2. Como specialist (Sede Norte) abrir `/specialist/appointments` filtro "Esta semana".
- Esperado: la hora mostrada al especialista es la misma que vio el receptionist (9:00 AM).
- Observado: receptionist muestra `9:00 AM`; specialist muestra `04:00` (sin AM/PM). Diferencia ~5h ≈ offset Bogotá→UTC. Indica que una pantalla está mostrando UTC sin convertir a hora local del usuario.
- Evidencia:
  - Receptionist row: `9:00 AMLaura QA E2E PatientSpecialistSede NorteConsulta de optometría — primera vez…Pendiente`
  - Specialist row: `Mañana04:00Laura QA E2E Patient1099887766—Pendiente`
- Estado: confirmado
- Nota: bug crítico de UX — el médico verá hora distinta del paciente; afecta puntualidad y reportes.

### QA-006
- Rol: specialist
- URL: http://localhost:4300/specialist/appointments
- Severidad: menor
- Pasos:
  1. Receptionist crea cita con notas "Consulta de optometría — primera vez. Refiere visión borrosa de cerca." en el campo "Motivo de la consulta, observaciones".
  2. Specialist abre la lista de citas.
- Esperado: el especialista ve el motivo registrado por el recepcionista.
- Observado: columna "Motivo" muestra `—` (vacío). El especialista no ve el motivo/notas que ingresó el recepcionista.
- Evidencia: specialist row con `—` en Motivo; receptionist row con texto completo.
- Estado: confirmado (probable: el front consulta `motive` pero la cita guarda `notes`).

### QA-007
- Rol: specialist
- URL: `PUT /api/v1/appointments/{id}/clinical-record/diagnosis` (tab 3 Diagnóstico)
- Severidad: bloqueante
- Pasos:
  1. En historia clínica, completar Anamnesis y avanzar al paso 3 Diagnóstico.
  2. Seleccionar diagnóstico CIE-10 (ej. H524 Presbicia), tipo "Confirmado", plan "Gafas VP".
  3. Click "Siguiente: Fórmula Óptica".
- Esperado: el diagnóstico se guarda y se avanza a paso 4.
- Observado: API responde **HTTP 500**. Postgres devuelve `ERROR: column "related_1_code" of relation "diagnoses" does not exist (SQLSTATE 42703)`. El handler intenta `UPDATE diagnoses SET ... related_1_code=..., related_1_desc=..., related_2_code=..., related_2_desc=..., related_3_code=..., related_3_desc=...` pero la tabla no tiene esas columnas → migración pendiente.
- Evidencia (log API):
  ```
  ERROR: column "related_1_code" of relation "diagnoses" does not exist (SQLSTATE 42703)
  service.go:212 clinical_record: upsert diagnosis failed
  PUT /api/v1/appointments/37/clinical-record/diagnosis status:500
  ```
- Estado: confirmado
- Impacto: rompe TODO el flujo de consulta — el médico no puede guardar diagnóstico ni avanzar a Prescripción de forma persistente.
- Acción: agregar migración SQL para crear columnas `related_1_code`, `related_1_desc`, `related_2_code`, `related_2_desc`, `related_3_code`, `related_3_desc` en `diagnoses` (NULLABLE varchar). Ver `internal/platform/storage/postgres/clinical_record_repository.go:126`.

### QA-008
- Rol: specialist
- URL: http://localhost:4300/specialist/appointments/{id} (tab 3 Diagnóstico)
- Severidad: mayor
- Pasos:
  1. Reproducir QA-007.
- Esperado: si el `PUT diagnosis` devuelve 500, el front muestra error en UI.
- Observado: el front muestra toast verde "Diagnóstico guardado" aunque la respuesta sea 500. El usuario cree que se guardó pero no.
- Evidencia: toast `[role="status"]` con "Diagnóstico guardado" justo después de un response 500 en consola.
- Estado: confirmado
- Impacto: oculta fallos del backend — el médico no se entera y datos clínicos críticos se pierden silenciosamente.

### QA-009
- Rol: specialist
- URL: http://localhost:4300/specialist/appointments/{id}
- Severidad: mayor
- Pasos:
  1. Avanzar manualmente del paso 1 → 2 → 3 → 4 con "Siguiente".
  2. Volver a leer el indicador de paso lateral.
- Esperado: el paso actual permanece en el último avanzado (4 — Prescripción) hasta que el usuario navegue.
- Observado: tras un guardado/refetch automático del clinical-record, el paso visible regresa a "1 de 4 — Anamnesis" pese a que el botón de footer mostró brevemente "Firmar y completar consulta". El estado del wizard se pierde.
- Evidencia: tabs muestran "1. Anamnesis" como activa y panel renderiza la Anamnesis; sidebar dice `1 de 4 — Anamnesis`. El motivo previamente escrito sí persiste.
- Estado: confirmado (reproducido al menos una vez tras `Diagnóstico guardado`).

### QA-013
- Rol: receptionist
- URL: http://localhost:4300/receptionist/sales/catalog
- Severidad: menor
- Pasos:
  1. Login receptionist en Sede Norte → Nueva venta → Explorar catálogo.
- Esperado: el header del catálogo muestra la sede activa (Sede Norte).
- Observado: header dice "Sede Principal" pese a que la sesión y sidebar marcan "Sede Norte". Sugiere que el catálogo no consulta la sede activa o cae a un default.
- Estado: confirmado.

### QA-014
- Rol: receptionist
- URL: http://localhost:4300/receptionist/sales/catalog
- Severidad: menor
- Pasos:
  1. Abrir el catálogo.
- Esperado: si solo se listan monturas, etiquetar como "Catálogo de Monturas". Si hay lentes oftálmicos, separarlos.
- Observado: título dice "Catálogo de Lentes" pero las tarjetas son monturas (códigos M99xx, marcas MAORI / BOY LAN / POLARIZED). No se ve distinción entre lente oftálmico y montura. El asesor que necesita un lente progresivo (según QA-012) no encontrará uno aquí.
- Estado: confirmado.

### QA-012
- Rol: receptionist (asesor)
- URL: http://localhost:4300/receptionist/sales/new
- Severidad: bloqueante (workflow)
- Pasos:
  1. Specialist firma fórmula óptica con tipo de lente "progresivo · policarbonato · permanente", H524 Presbicia, tratamiento "antirreflejo".
  2. Receptionist abre "Nueva Venta", busca y selecciona al paciente.
- Esperado: el asesor ve la prescripción/recomendación del médico (tipo de lente, material, tratamientos, diagnóstico) para guiar la elección de productos al paciente. Esto es exactamente el flujo descrito por el negocio: "el asesor sabe qué tipo de lentes ofrecer y la montura".
- Observado: al seleccionar al paciente sólo aparece nombre, ID, teléfono y correo. No hay panel de "Última fórmula", "Recomendación del médico", "Tipo de lente sugerido", ni botón "Aplicar fórmula". El asesor debe adivinar o llamar al médico.
- Evidencia: panel "Cliente *" sin sección de Rx; el catálogo se abre sin filtros pre-aplicados.
- Estado: confirmado
- Impacto: rompe el caso de uso end-to-end paciente → consulta → venta. Riesgo de error de criterio (vender lente equivocado), retrabajo y devoluciones.

### QA-011
- Rol: receptionist
- URL: http://localhost:4300/receptionist/sales/new
- Severidad: mayor
- Pasos:
  1. Login receptionist (TZ Bogotá), abrir "Nueva Venta".
- Esperado: el campo "Fecha *" se prellena con la fecha de hoy en hora local.
- Observado: el botón muestra `06/05/2026` cuando hoy es `07/05/2026` (jueves). El header de la página dice correctamente "Hoy · jueves 7 de mayo de 2026" pero la fecha del documento de venta queda 1 día atrás.
- Evidencia: `button "06/05/2026"` con texto en el DatePicker; `paragraph "Hoy · jueves 7 de mayo de 2026"`.
- Estado: confirmado
- Impacto: ventas registradas con fecha previa → afecta cierres de caja, RIPS y conciliación contable.

### QA-010
- Rol: specialist
- URL: http://localhost:4300/specialist/appointments/{id} (tabs Examen Visual, Diagnóstico, Prescripción)
- Severidad: menor
- Pasos:
  1. Estando en Anamnesis, hacer click en cualquier tab numérico (2/3/4).
- Esperado: la pestaña cambia y muestra su contenido (modo libre o modo guiado documentado).
- Observado: clic sobre las tabs 2/3/4 no activa el panel correspondiente; sólo el botón "Siguiente:" del footer avanza. La accesibilidad/UX sugiere que las tabs son interactivas (cursor pointer) pero no funcionan como navegación.
- Estado: confirmado.


## OK (sin incidencias)

| Rol | Ruta | Notas |
|-----|------|-------|
| receptionist | /receptionist/dashboard | Carga, KPIs visibles, "Cola de ventas" muestra estado vacío correcto. |
| receptionist | /receptionist/patients/new (steps 1) | Formulario crea paciente; toast "Paciente creado" tras submit. |
| receptionist | /receptionist/patients (lista) | Paciente recién creado aparece y es navegable. |
| receptionist | /receptionist/appointments/new step 1 (paciente) | Búsqueda por nombre devuelve coincidencia; paso 1 funcional. |
| receptionist | /receptionist/appointments/new step 3 (fecha/hora) | Slots de hoy correctamente deshabilitados por hora actual; mañana disponible. |
| receptionist | /receptionist/appointments | Cita aparece en filtro "Mañana" con paciente y especialista correctos. |
| specialist   | /specialist/appointments | Cita visible, conteo "Citas mañana: 1" correcto. |
| specialist   | /specialist/appointments/:id | "Tomar cita ahora" cambia estado a "En curso"; notas de recepción se muestran (campo `Notas de recepción`). |
| specialist   | /specialist/appointments/:id (paso 4 fórmula) | Inputs sph/cyl/axis/add/dp aceptan valores; selects funcionan; "Firmar y completar" persiste fórmula. |
| specialist   | /specialist/appointments/:id/prescription-preview | Documento legal renderiza paciente, fórmula, diagnóstico (H524 Presbicia), tipo de lente, tratamientos, vigencia. Diálogo de firma OK con TP `CTNPO-9999`. |
| receptionist | /receptionist/sales/new (cliente) | Búsqueda y selección de paciente OK. |
| receptionist | /receptionist/sales/catalog | Productos (monturas) cargan, paginación ok, "Agregar al Carrito" persiste, "Continuar Venta →" regresa a /sales/new con resumen. |
| receptionist | /receptionist/sales/new (resumen) | Cálculo IVA 19% correcto: 360.000 → 428.400. |
| receptionist | /receptionist/sales | "Completar Venta" crea VTA-0008 con toast de éxito y abre PDF en nueva pestaña. |

## Handoff al agente de correcciones

Recomendado: regla `convision-qa-gap-fixer` (Cursor) o subagente `convision-qa-gap-fixer` (Codex).

Atomic tickets, ordenados por severidad:

**Bloqueantes (impacto directo en el flujo E2E):**
- **QA-007** — Migración SQL faltante: agregar columnas `related_1_code/desc, related_2_code/desc, related_3_code/desc` a `diagnoses`. Archivo afectado: [convision-api-golang/internal/platform/storage/postgres/clinical_record_repository.go:126](convision-api-golang/internal/platform/storage/postgres/clinical_record_repository.go#L126). Crear migración en `convision-api-golang/db/migrations/platform/`.
- **QA-003** — Filtrar lista de "Seleccionar especialista" por rol `specialist`. Frontend [convision-front/src/](convision-front/src/) — la búsqueda incluye recepcionistas y laboratory.
- **QA-012** — Mostrar prescripción/última fórmula del paciente en `/sales/new` al seleccionar al cliente. Tip: `lens_type`, `material`, `treatments` y diagnóstico CIE-10 → panel "Recomendación del médico".

**Mayores:**
- **QA-005** — Revisar conversión TZ en `/specialist/appointments` (lista) — la columna `Hora` aparece en UTC.
- **QA-008** — Manejar response 500 en `PUT diagnosis` mostrando toast de error en lugar de "Diagnóstico guardado".
- **QA-011** — `Fecha *` por defecto en `/sales/new` debe usar fecha local del usuario (no `new Date().toISOString().slice(0,10)` con zona UTC).
- **QA-009** — Persistir paso activo del wizard de historia clínica tras refetch.
- **QA-001** — DatePicker para "Fecha de nacimiento" debe permitir selección de año/década.

**Menores:**
- QA-002 — Conceder al rol receptionist lectura de `/api/v1/branches` (o suprimir la llamada en su layout).
- QA-004 — Activar selección de sede en `/select-branch` con `onClick` (no solo pointer events).
- QA-006 — Mostrar el campo "Motivo/Notas" en la columna "Motivo" de `/specialist/appointments`.
- QA-010 — Hacer interactivos los tabs del wizard de historia clínica (libre navegación entre pasos completados).
- QA-013 — Header del catálogo debe mostrar la sede activa, no "Sede Principal".
- QA-014 — Renombrar "Catálogo de Lentes" si solo lista monturas; o separar lentes oftálmicos vs monturas.

Comando sugerido:
```
@convision-qa-gap-fixer cerrar QA-007 QA-003 QA-012 QA-005 QA-008 QA-011 usando .planning/qa/FINDINGS-2026-05-07-e2e-paciente-cita-venta.md como fuente
```
