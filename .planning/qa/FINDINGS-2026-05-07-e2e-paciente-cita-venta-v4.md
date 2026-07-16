---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
api_url: http://localhost:8001
started: 2026-05-07
updated: 2026-05-07
roles_tested: [receptionist, specialist]
scope: end-to-end paciente → cita → consulta médica → recomendación lente → venta con montura
---

## Resumen ejecutivo

- **Pantallas verificadas:** 12 (login, select-branch, dashboards, patients/new, appointments list+new, specialist clinical-record 4 pasos, prescription-preview, sales/new, sales/catalog, sales summary, /unauthorized).
- **Hallazgos confirmados FAIL/GAP:** 7 confirmados + 1 hipótesis.
- **Sin incidencias listadas en la sección OK.**

**Recorrido feliz reproducido:**
1. Receptionist registró la paciente Lucia QA EndToEnd 0507 (CC 9050507701) → patient_id=34.
2. Receptionist agendó cita en Sede Norte para Specialist el 2026-05-08 10:30 AM → cita 40.
3. Specialist tomó la cita, completó las 4 fases clínicas y firmó la fórmula óptica.
4. Receptionist creó venta VTA-0009 con un lente (L991) + una montura (M6036) por $2.915.500.

A pesar de que el flujo completó, hay **gaps estructurales** entre los tres roles (TZ, vinculación cita↔venta, descubribilidad de la prescripción para el asesor) que detallo abajo.

---

## Hallazgos (FAIL / GAP)

### QA-001 — Cita guardada en horario equivocado (zona horaria)
- Rol: receptionist (creación) / specialist y receptionist (visualización)
- URL: http://localhost:4300/receptionist/appointments/new (creación) y http://localhost:4300/receptionist/appointments/40 (lectura)
- Severidad: **bloqueante** (impacto operativo: el paciente y el especialista verán hora distinta a la pactada)
- Pasos:
  1. Como receptionist, agendar cita seleccionando 2026-05-08, especialista Specialist, slot **10:30 AM**.
  2. Confirmar y observar la cita creada en la lista de citas.
  3. Como specialist, abrir `/specialist/appointments/40`.
- Esperado: la cita se muestra a las **10:30 AM** en ambos lados.
- Observado: la cita se guarda como `scheduled_at: "2026-05-08T10:30:00.000000Z"` (UTC) y se renderiza como **5:30 AM** local (UTC-5 Bogotá). Misma hora errada en `/receptionist/appointments` (sección "Citas de mañana") y en `/specialist/appointments/40`.
- Evidencia:
  - Request POST `/api/v1/appointments` body: `{"specialist_id":2,"patient_id":34,"scheduled_at":"2026-05-08 09:00",…}` — el front envía datetime sin TZ.
  - Response: `scheduled_at: "2026-05-08T10:30:00.000000Z"` — back interpreta el string naive como UTC en vez de America/Bogota.
  - Listado: "5:30 AM Lucia QA EndToEnd 0507 Specialist Sede Norte".
- Estado: **confirmado**.
- Nota técnica para el fixer: el bug se replica en `birth_date` (request body de venta muestra `birth_date:"1990-05-14T19:00:00-05:00"` cuando el front envió 1990-05-15) y en `payment_date` (`2026-05-07` request → `2026-05-06T19:00:00-05:00` stored). El parser de fechas naive en backend Go debe asumir TZ del cliente o exigir ISO con offset.

---

### QA-002 — Slots ya ocupados se muestran como disponibles en el calendario
- Rol: receptionist
- URL: http://localhost:4300/receptionist/appointments/new
- Severidad: **mayor**
- Pasos:
  1. Crear cita para `Specialist` el 2026-05-08 10:30 AM (éxito).
  2. Volver a `/receptionist/appointments/new` y repetir el wizard con el mismo especialista y fecha.
  3. Observar que 10:30 AM aparece habilitado y no marcado en rojo (la UI dice "Horarios en rojo ya están ocupados para Specialist", pero ninguno se muestra rojo).
  4. Seleccionar 9:00 AM (también pintado disponible) y enviar.
- Esperado: el slot ocupado debería deshabilitarse o pintarse rojo según copy.
- Observado: front no marca rojo; backend rechaza con 422 `{"message":"validation failed on scheduled_at: el especialista ya tiene una cita programada en ese horario"}`. El usuario sólo se entera al hacer submit.
- Evidencia: requests `[GET] /api/v1/appointments/available-slots?specialist_id=2&date=2026-05-08 → 200` (no devuelve marcaje de ocupados, o el front no lo aplica). POST devuelve 422.
- Estado: **confirmado**.

---

### QA-003 — Receptionist no puede iniciar la venta desde el detalle de la cita
- Rol: receptionist
- URL: http://localhost:4300/receptionist/appointments/40
- Severidad: **mayor** (rompe descubribilidad del flujo "consulta → venta")
- Pasos:
  1. Specialist firma fórmula óptica para la cita 40.
  2. Receptionist abre `/receptionist/appointments/40`.
- Esperado: ver la prescripción/recomendación de lente y un CTA tipo "Crear venta" o "Procesar venta".
- Observado: la pantalla muestra solo "Detalles de Cita" con datos básicos. **No hay botón para crear venta, ni vínculo a la prescripción, ni indicación de lente recomendado**. El asesor debe abrir manualmente `/receptionist/sales/new` y empezar de cero.
- Evidencia: snapshot de la página → solo botones de sidebar y un único contenedor "Detalles de Cita" sin acciones.
- Estado: **confirmado**.

---

### QA-004 — La venta no queda vinculada a la cita ni a la prescripción
- Rol: receptionist
- URL: http://localhost:4300/receptionist/sales/new (con paciente Lucia QA preseleccionado)
- Severidad: **mayor** (afecta trazabilidad y reportería)
- Pasos:
  1. Tras consulta firmada, crear venta con un lente y una montura para el mismo paciente.
  2. Inspeccionar el payload `POST /api/v1/sales`.
- Esperado: la venta debe portar `appointment_id` y/o `prescription_id` para cerrar el ciclo y permitir reportes "ventas-por-consulta".
- Observado: payload incluye `"appointment_id": null` y no hay campo de prescripción. La cita queda con `is_billed:false / sale_id:null` aún tras la venta.
- Evidencia: request body 508 `{"patient_id":34,"order_id":null,"appointment_id":null,…}`; response 201 `sale.appointment_id: null`.
- Estado: **confirmado**.

---

### QA-005 — Asesor no tiene "Lentes recomendados" basados en la prescripción
- Rol: receptionist
- URL: http://localhost:4300/receptionist/sales/catalog
- Severidad: **mayor** (es justamente el high-level scenario pedido: "el asesor sabe qué tipo de lentes ofrecer")
- Pasos:
  1. Receptionist con paciente seleccionado abre el catálogo de productos.
- Esperado: filtros o sección "recomendados para esta prescripción" (Monofocal/Policarbonato/Antirreflejo + filtro luz azul, según fórmula firmada por el specialist).
- Observado: catálogo genérico sin filtro por tipo/material/uso de la prescripción. El asesor debe buscar manualmente "monofocal" y elegir uno de 12+ resultados sin saber cuál cumple la receta. La búsqueda "lente" solo devuelve accesorios de lentes de contacto, lo que confunde.
- Estado: **confirmado**.

---

### QA-006 — Tipo de lente seleccionado no se guarda en la prescripción (hipótesis)
- Rol: specialist
- URL: http://localhost:4300/specialist/appointments/40 (paso 4. Prescripción)
- Severidad: **mayor**
- Pasos:
  1. En el formulario de fórmula óptica, escoger **Tipo de lente: Monofocal**, **Material: Policarbonato**, **Uso: Permanente** mediante los `<select>`.
  2. Observar el payload `PUT /clinical-record/prescription` y la vista preview.
- Esperado: la prescripción muestra "TIPO DE LENTE: Monofocal" y guarda los campos correspondientes.
- Observado: en el preview la sección **"TIPO DE LENTE"** queda como `—` y el request envió `"lens_type":"","lens_material":"","lens_use":""`. Los selects no se asocian al estado.
- Evidencia: request `503 PUT /api/v1/appointments/40/clinical-record/prescription` body `{"lens_type":"","lens_material":"",…}`; preview "Tipo de lente: —".
- Estado: **hipótesis** (la automatización seteó el `value` del `<select>` con la etiqueta visible; si las opciones tienen `value` interno distinto, podría ser artefacto del test). Verificar con interacción humana en UI: si al elegir "Monofocal" desde el dropdown el preview sigue mostrando `—`, el bug es real.

---

### QA-007 — Tratamientos se imprimen en bruto con guion bajo
- Rol: specialist (también visible al paciente al imprimir el PDF)
- URL: http://localhost:4300/specialist/appointments/40/prescription-preview
- Severidad: **menor**
- Pasos:
  1. En la prescripción seleccionar tratamientos "Antirreflejo" y "Filtro luz azul".
  2. Abrir vista previa.
- Esperado: "Antirreflejo, Filtro luz azul".
- Observado: "antirreflejo, filtro_luz_azul" — se muestra el slug interno con underscore.
- Estado: **confirmado**.

---

### QA-008 — DemoStaffSeeder no existe en el backend Go (gap docs ↔ entorno)
- Rol: cualquiera (docs prometen estos usuarios)
- URL: http://localhost:8001/api/v1/auth/login
- Severidad: **menor** (documentación desincronizada; no rompe el flujo real)
- Pasos: `curl -d '{"email":"<demo>@convision.com","password":"password"}' http://localhost:8001/api/v1/auth/login`.
- Esperado: 200 con token (según `docs/CREDENCIALES_PRUEBA_ROLES.md` y `.cursor/rules/convision-qa-explorer.mdc`).
- Observado: 401 "Credenciales incorrectas" para los 7 usuarios demo (`cvargas, abermudez, storres, dmontoya, vcastillo, jnieto, hquintero`). Solo los 3 genéricos (`admin@`, `specialist@`, `receptionist@`) responden 200.
- Evidencia: bucle de 7 logins, todos 401.
- Impacto adicional: el rol **laboratory** queda sin usuario seed real, así que el sidebar/login para laboratory **no se puede probar** en este entorno (la regla del mapa lo señala como gap conocido pero el seed Go ni siquiera carga el usuario).
- Estado: **confirmado**.

---

## OK (sin incidencias)

| Rol | Ruta | Notas |
|-----|------|-------|
| receptionist | `/login` | Login con `receptionist@convision.com / password` redirige a `/select-branch` y luego `/receptionist/dashboard`. |
| receptionist | `/select-branch` | Permite elegir Sede Norte/Centro/Sur/Occidente. |
| receptionist | `/receptionist/dashboard` | Renderiza Cola de ventas, Agenda, ventas del día sin errores en consola. |
| receptionist | `/receptionist/patients/new` | Wizard de 5 pasos guarda paciente correctamente con datos mínimos. |
| receptionist | `/receptionist/patients` | Paciente recién creado aparece. |
| receptionist | `/receptionist/appointments` | Filtros Hoy / Mañana / Esta semana / Este mes funcionan. |
| receptionist | `/receptionist/appointments/new` | Wizard 4 pasos crea cita (con la salvedad de QA-001/QA-002). |
| specialist | `/select-branch`, `/specialist/dashboard` | OK. |
| specialist | `/specialist/appointments/40` | Botones "Tomar cita ahora", "Pausar consulta", "Completar consulta" responden. |
| specialist | `/specialist/appointments/40` (4 pasos clínicos) | Anamnesis, Examen Visual, Diagnóstico (CIE-10), Prescripción se guardan vía PUT por sección. |
| specialist | `/specialist/appointments/40/prescription-preview` | Diálogo de firma con checkbox + tarjeta CTNPO funciona; firma persiste (POST `/clinical-record/sign` 200). |
| receptionist | `/receptionist/sales/catalog` | Búsqueda libre, paginación, agregar al carrito. |
| receptionist | `/receptionist/sales/new` | Crea venta, descarga PDF (token=9-...), redirige a `/receptionist/sales`. |
| cualquiera | `/admin/users` con receptionist | RBAC: redirige a `/unauthorized` correctamente. |

---

## Handoff al agente de corrección

Recomendado: **regla Cursor `convision-qa-gap-fixer`** (o agente Codex equivalente) — pasarle este archivo y los IDs.

**Prioridad sugerida:**
1. **QA-001** (TZ en `scheduled_at`, `payment_date`, `birth_date`) — corromper datos en producción es inadmisible. Es un bug transversal: revisar el parser/serializer en `convision-api-golang/internal/transport/http/v1` y los DTOs que aceptan strings de fecha naive.
2. **QA-003 + QA-004 + QA-005** se resuelven juntos: definir el flujo "Procesar venta desde cita" (CTA en detalle de cita → /sales/new precargado con prescription_id, appointment_id, recomendaciones de lente derivadas de `lens_type/lens_material/lens_use`).
3. **QA-006** verificar manualmente el binding del `<select>` de tipo/material/uso en el formulario de prescripción (`convision-front/src/components/clinical/AppointmentClinicalForm.tsx`).
4. **QA-002** front debe aplicar la respuesta de `/available-slots` para deshabilitar/pintar rojo en `convision-front/src/components/admin/...` o el componente del wizard.
5. **QA-007** trivial — mapa slug → etiqueta en español al pintar.
6. **QA-008** decidir: a) cargar `DemoStaffSeeder` en el backend Go, o b) actualizar `docs/CREDENCIALES_PRUEBA_ROLES.md` para listar solo los usuarios reales.

**Datos creados en la sesión (para reproducir o limpiar):**
- patient_id = 34 (Lucia QA EndToEnd 0507 / CC 9050507701).
- appointment_id = 40 (Specialist · Sede Norte · 2026-05-08, status `in_progress`, fórmula firmada).
- sale_id = 9 (`VTA-0009` · $2.915.500 · pagada efectivo · sin appointment_id).
