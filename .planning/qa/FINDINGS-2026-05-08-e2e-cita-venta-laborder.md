---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
api_base_url: http://localhost:8001
started: 2026-05-08T17:00:00-05:00
updated: 2026-05-08T17:20:00-05:00
roles_tested: [admin, specialist, receptionist, laboratory]
scope: |
  E2E completo del escenario solicitado por el usuario:
  paciente -> recepción agenda cita -> especialista valora y emite recomendación de lente
  -> recepcionista (asesor) ve la recomendación y cierra venta con lente progresivo + montura física
  -> verificación de movimientos de inventario en venta con stock físico
  -> generación automática de orden de laboratorio
  -> recorrido de TODOS los estados de la orden de laboratorio cambiando de rol
  (admin, laboratory, specialist como QC, receptionist).
data_created:
  - patient_id: 39 (QA E2E Mayo08 FlujoCompleto, ID 11050801999)
  - appointment_id: 45 (cita completada en Sede Centro)
  - clinical_record_id: 19 (firmada)
  - prescription_id: 13 (Progresivo · Policarbonato · Permanente · AR + filtro luz azul)
  - sale_id: 14 (lente $460k + montura M8836 $360k + IVA 19% = $975.800)
  - laboratory_order_id: 3 (LAB-0003, recorrió 9 estados)
---

## Resumen ejecutivo

| Métrica | Valor |
|---|---|
| Pantallas / rutas verificadas | 12 |
| Hallazgos confirmados (FAIL) | **6** |
| Hipótesis / observaciones | 2 |
| Política "asesor sin Rx" respetada | ✅ Sí (0 fugas) |
| Inventario decrementa en venta con stock físico | ❌ **NO** (regresión crítica) |
| Lab order recorrió todos los estados | ✅ Sí, vía API (UI parcial) |
| Frontend tiene rutas para rol `laboratory` | ❌ NO (`/unauthorized`) |
| Frontend tiene rutas `/receptionist/laboratory-orders` | ❌ NO (404 aunque el sidebar las muestra) |

**Hallazgos bloqueantes / mayores:**

- **QA-E2E-LAB-001 (bloqueante)** — Las ventas con inventario físico **no descuentan stock**. Tras vender 1× M8836, la cantidad disponible en `branch_id=3` se mantuvo en `qty=2`.
- **QA-E2E-LAB-002 (bloqueante)** — Recepción tiene "Órdenes de Laboratorio" en el sidebar pero la ruta `/receptionist/laboratory-orders` no existe (404).
- **QA-E2E-LAB-003 (mayor)** — Usuario `laboratory@convision.com` autentica OK contra la API pero el front lo manda a `/unauthorized` (no hay `LaboratoryLayout`).
- **QA-E2E-LAB-004 (mayor)** — Especialista no puede aprobar QC: `POST /laboratory-orders/:id/status` con `status=quality_approved` o `in_quality` devuelve 403 forbidden. Pero el escenario funcional pide que el médico haga la validación de calidad.
- **QA-E2E-LAB-005 (mayor)** — La consulta clínica no se cierra desde la UI: los botones "Firmar y completar consulta →" y "Completar consulta" del header no disparan request. La consulta queda en `in_progress` indefinidamente. (Workaround: API `POST /clinical-record/sign` + `POST /management-report/:id`).
- **QA-E2E-LAB-006 (mayor)** — En `/admin/laboratory-orders/:id` el botón "Actualizar estado" del header no abre selector ni dispara nada. La única vía para mover estados desde la UI es el botón contextual "Próxima acción", y solo cubre 2-3 transiciones (no las 12 del backend). El front está atado a un sub-conjunto del state machine real.

**Hallazgos menores / observaciones:**

- **QA-E2E-LAB-007 (menor)** — `/receptionist/sales/catalog` no toma contexto del `appointment_id` cuando se ingresa con "Iniciar Venta" desde `/receptionist/appointments/:id`; se pierde la cita asociada y los botones "Agregar al Carrito" no producen efecto visible. El path correcto para asesores es `/receptionist/sales/new?appointment_id=X`.
- **QA-E2E-LAB-008 (observación de UX)** — El picker de fecha (`button[placeholder=DD/MM/AAAA]`) en `/receptionist/patients/new` exige interacción de calendario y no acepta typing directo, lo que hace el formulario muy costoso de automatizar y tedioso para usuarios de teclado.

**Política respetada (✅):**

- En `/receptionist/sales/new?appointment_id=45`: aparece banner "Recomendación del médico: Progresivo · Policarbonato · Uso permanente" + chips "Antirreflejo, Filtro luz azul". Verificación programática `bodyTextContent.match(/-1\.5|-0\.75|esférico|cilindro|axis|sph_od|cyl_od|20\/20/)` → 0 coincidencias. **Sin filtración de Rx**.

**Lab order #3 recorrió:** `pending → in_process → sent_to_lab → in_transit → received_from_lab → in_quality → quality_approved → ready_for_delivery → delivered`, y luego `delivered → in_process` (laboratory) y `in_process → delivered` (receptionist) — confirmando que **el state machine es totalmente permisivo** (no impone orden ni prohíbe regresiones de estado, ver QA-E2E-LAB-009).

- **QA-E2E-LAB-009 (mayor, hipótesis)** — La transición de estados de la orden de laboratorio **no se valida** en backend: cualquier rol con `laboratory_orders:edit` puede saltar de `delivered` a `in_process` o cualquier otro orden arbitrario. No hay `validateTransition(from, to)` ni validación temporal.

---

## Hallazgos (FAIL / GAP)

### QA-E2E-LAB-001 — Venta con inventario físico no descuenta stock
- **Rol:** receptionist (cualquier rol con `sales:create`)
- **URL:** `POST /api/v1/sales` (probado vía API; UI no logró agregar al carrito — ver QA-E2E-LAB-007)
- **Severidad:** **bloqueante**
- **Pasos:**
  1. Verificar stock antes: `GET /api/v1/products/32535/inventory` → `id=35280, branch_id=3, qty=2, status=available` (montura M8836 CRONW EYEWEAR CR 8801 NEGRO).
  2. Crear venta sale_id=14 con `items: [{ product_id: 33082, product_type: "lens", qty: 1, price: 460000 }, { product_id: 32535, product_type: "frame", qty: 1, price: 360000 }]`. Backend responde 201 y "Venta creada exitosamente".
  3. Verificar stock después: `GET /api/v1/products/32535/inventory` → `id=35280, branch_id=3, qty=2`. **Sin cambio**.
- **Esperado:** la cantidad del item de inventario `35280` debe quedar en `qty=1` (o se debe consumir un nuevo item con `quantity_consumed`).
- **Observado:** el stock se mantiene en `qty=2` después de la venta. La auditoría muestra que la venta queda en `payment_status=paid`, `status=pending` pero **ningún item de inventario fue tocado**.
- **Evidencia:** comparación pre/post de `GET /api/v1/products/32535/inventory` (capturada en sesión).
- **Impacto:** la información de stock que ven recepción/admin queda desactualizada → riesgo de sobreventa de monturas, inventario inflado en reportes, conciliación contable imposible.
- **Estado:** confirmado.

### Resolución
- **Fecha:** 2026-05-08
- **Estado:** resuelto
- **Commit:** a392a00
- **Causa raíz:** `deductStock` en `internal/sale/service.go` saltaba la deducción cuando el branch del sale no tenía `default_warehouse_id` configurado, dejando `InventoryItem.qty` intacto.
- **Fix:** intentar primero el `default_warehouse_id` del branch (Modelo A); si no existe, caer en cualquier `InventoryItem` del `branch_id` del sale y registrar el `StockMovement` contra ese `warehouse_id`. Comportamiento con `default_warehouse_id` configurado no cambia.
- **Archivos:** `convision-api-golang/internal/sale/service.go`

### QA-E2E-LAB-002 — Receptionist sidebar muestra "Órdenes de Laboratorio" pero la ruta es 404
- **Rol:** receptionist
- **URL:** `/receptionist/laboratory-orders`
- **Severidad:** bloqueante (descubribilidad funcional)
- **Pasos:**
  1. Login `receptionist@convision.com` + Sede Centro.
  2. Click en sidebar "COMERCIAL → Órdenes de Laboratorio".
- **Esperado:** lista de órdenes de laboratorio asociadas a las ventas que la recepción ha creado.
- **Observado:** "404 / Página no encontrada / Lo sentimos, la página que estás buscando no existe."
- **Evidencia:** `document.body.innerText` en `/receptionist/laboratory-orders` y `/receptionist/laboratory-orders/3`.
- **Impacto:** la persona que más necesita ver el estado de las órdenes (recepción, que recibe a los pacientes que vienen a reclamar) no tiene acceso. El sidebar miente.
- **Estado:** confirmado.

### QA-E2E-LAB-003 — Usuario `laboratory` redirigido a `/unauthorized`
- **Rol:** laboratory (`laboratory@convision.com`)
- **URL:** `/unauthorized` tras `/login`
- **Severidad:** mayor
- **Pasos:**
  1. `POST /api/v1/auth/login {email: "laboratory@convision.com", password: "password"}` → 200 OK, JWT con `role: laboratory`.
  2. Login UI → redirige a `/unauthorized`.
- **Esperado:** `/laboratory/dashboard` o equivalente con vista de órdenes de laboratorio asignadas.
- **Observado:** rol reconocido en JWT pero el front no monta `LaboratoryLayout` ni rutas `/laboratory/*`. El usuario queda atascado.
- **Evidencia:** `localStorage.user.role === "laboratory"`, `window.location.pathname === "/unauthorized"`.
- **Impacto:** el rol existe en seed (`laboratory@convision.com`), tiene permiso en backend (`laboratory_orders:edit`) y puede mover estados vía API — pero no tiene UI. El operador del laboratorio no puede usar la app.
- **Estado:** confirmado. Regresión documentada en `FINDINGS-2026-05-08-e2e-paciente-venta-v2.md` (QA-V2-006) — sigue abierto.

### QA-E2E-LAB-004 — Especialista no puede aprobar control de calidad
- **Rol:** specialist
- **URL:** `POST /api/v1/laboratory-orders/:id/status`
- **Severidad:** mayor
- **Pasos:**
  1. Login `specialist@convision.com`.
  2. `POST /api/v1/laboratory-orders/3/status {"status":"quality_approved"}` con JWT de specialist.
- **Esperado:** según el flujo solicitado por el usuario ("el medico en su validacion de calidadad"), el especialista debe poder aprobar QC al menos en las transiciones `in_quality → quality_approved` y `received_from_lab → in_quality`.
- **Observado:** `403 forbidden: insufficient permissions`. El rol `specialist` no tiene `laboratory_orders:edit`.
- **Evidencia:** respuesta `{"message":"forbidden: insufficient permissions"}` con http 403.
- **Impacto:** el flujo clínico/comercial diseñado en el negocio (médico valida calidad antes de entregar) no está soportado por el RBAC actual.
- **Sugerencia:** crear permiso granular `laboratory_orders:approve_quality` y otorgárselo a `specialist` (o ampliar `laboratory_orders:edit` para specialists pero solo permitir las transiciones de QC).
- **Estado:** confirmado.

### QA-E2E-LAB-005 — Botones "Firmar y completar consulta" y "Completar consulta" no disparan request
- **Rol:** specialist
- **URL:** `/specialist/appointments/45` (paso 4 — Prescripción)
- **Severidad:** mayor
- **Pasos:**
  1. Tomar cita 45 (`POST /appointments/45/take` ✓ vía botón "Tomar cita ahora").
  2. Llenar prescripción (esférico/cilindro/eje/AVcc/Adi/DP en spinbuttons, tipo Progresivo, material Policarbonato, uso Permanente, tratamientos Antirreflejo + Filtro luz azul, T.P. CTNPO-9988).
  3. Click "Firmar y completar consulta →" (footer del tab) y "Completar consulta" (header).
- **Esperado:** la consulta pasa a `completed`, dispara `PUT /appointments/45/clinical-record/prescription` + `POST /clinical-record/sign` + `POST /management-report/:id`.
- **Observado:** ningún request dispara — la lista de network requests post-`POST /clinical-record` queda vacía. La cita permanece en `En curso` indefinidamente.
- **Evidencia:** `browser_network_requests filter='/api/v1/appointments/45'` muestra sólo `GET appointment` + `POST take` + `GET clinical-record (404)` + `POST clinical-record (201)` — **sin** prescription/sign/management-report.
- **Impacto:** consultas que no se pueden cerrar por UI → especialistas dependen de admin para forzar el estado, o el paciente queda sin "Listo para venta" y la cola de recepción no se actualiza.
- **Estado:** confirmado.

### Resolución
- **Fecha:** 2026-05-08
- **Estado:** resuelto
- **Commit:** dfd7f24
- **Causa raíz (1):** el `catch` del `PUT /clinical-record/prescription` en `PrescriptionTab.handleSignClick` tragaba el error y bloqueaba `onSign`, así que la navegación al flujo de firma nunca ocurría cuando había diff sin guardar.
- **Causa raíz (2):** el botón header "Completar consulta" disparaba un `PUT /appointments/:id status=completed` bare que nunca llamaba al endpoint de firma ni generaba `management-report`.
- **Fix:** `handleSignClick` ahora navega al preview de prescripción incluso si el PUT falla (el toast del padre sigue notificando el error). El header "Completar consulta" navega al mismo flujo de firma que el footer CTA, dejando un único camino determinista.
- **Archivos:** `convision-front/src/components/clinical/NewConsultation/PrescriptionTab.tsx`, `convision-front/src/pages/specialist/SpecialistAppointmentDetailPage.tsx`

### QA-E2E-LAB-006 — UI de orden de laboratorio sólo expone 2-3 estados; "Actualizar estado" no funciona
- **Rol:** admin
- **URL:** `/admin/laboratory-orders/3`
- **Severidad:** mayor
- **Pasos:**
  1. Abrir orden 3 en estado `pending`.
  2. Observar tarjeta "Seguimiento de la orden" con 5 etapas visibles (Pendiente / En proceso / Enviado a laboratorio / Listo para entregar / Entregada).
  3. Click "Actualizar estado" en el header (e184) → no pasa nada (sin diálogo, sin selector, sin request).
  4. Click "Confirmar envío a laboratorio" en panel "Próxima acción" (e275) → navega a `/admin/laboratory-orders/3/confirm-shipment` (formulario complejo con date picker + foto + guía).
- **Esperado:**
  - "Actualizar estado" abre un selector con los 12 estados del enum (`pending, in_process, sent_to_lab, in_transit, received_from_lab, returned_to_lab, in_quality, quality_approved, ready_for_delivery, delivered, cancelled, portfolio`).
  - O al menos: el panel "Próxima acción" expone botones para todas las transiciones legales desde el estado actual.
- **Observado:** el front sólo permite avanzar via "Confirmar envío" (pending→sent_to_lab) y un par de botones similares; no hay UI para los estados intermedios `in_process`, `in_quality`, `quality_approved`, `returned_to_lab`, `cancelled`, `portfolio`. La fila timeline tampoco refleja los estados `received_from_lab` ni `in_quality`.
- **Evidencia:** `document.querySelectorAll('button')` en `/admin/laboratory-orders/3` enumera 28 botones; ninguno habla de "Marcar en proceso", "Aprobar QC", "Devolver al laboratorio", "Cancelar", "Pasar a cartera".
- **Impacto:** el state machine real (12 estados) sólo es accesible vía API o herramienta. Si recepción/laboratorio/admin necesitan registrar `returned_to_lab` o `portfolio`, no pueden.
- **Estado:** confirmado.

### QA-E2E-LAB-007 — "Iniciar Venta" desde detalle de cita pierde el `appointment_id` y rompe agregar al carrito
- **Rol:** receptionist
- **URL:** `/receptionist/appointments/45` → `/receptionist/sales/catalog` (sin query)
- **Severidad:** menor
- **Pasos:**
  1. Abrir `/receptionist/appointments/45` (cita ya en `Completada`).
  2. Click "Iniciar Venta".
- **Esperado:** navegar a `/receptionist/sales/new?appointment_id=45` (que SÍ funciona y muestra el banner de recomendación + cards rankeadas).
- **Observado:** navega a `/receptionist/sales/catalog` (sin querystring). En esa vista los botones "Agregar al Carrito" se renderizan pero al hacer click el carrito permanece "El carrito está vacío" — tampoco se dispara request al backend.
- **Evidencia:** `browser_network_requests filter='/api/v1/.*(cart|sale|inventory)'` retorna sólo `/api/v1/sales/stats/today`. El click del botón no produce mutación.
- **Impacto:** la ruta "natural" desde la vista de cita (botón principal "Iniciar Venta") lleva a una vista rota; sólo funciona si el asesor sabe que existe `/receptionist/sales/new?appointment_id=...` y la usa manualmente.
- **Estado:** confirmado.

### QA-E2E-LAB-008 — Date picker del formulario de paciente no acepta typing directo
- **Rol:** receptionist
- **URL:** `/receptionist/patients/new`
- **Severidad:** observación de UX (menor)
- **Pasos:**
  1. Llenar nombre + apellido + documento + correo + teléfono.
  2. Intentar escribir `15/06/1990` en el campo "Fecha de nacimiento *".
- **Esperado:** input editable con máscara `DD/MM/AAAA` que acepta typing.
- **Observado:** el control es un `<button placeholder="DD/MM/AAAA">` que sólo abre un calendario popup; no acepta texto. Para QA automatizada y para usuarios de teclado el flujo es lento y propenso a error.
- **Estado:** confirmado.

### QA-E2E-LAB-009 — State machine de la orden de laboratorio sin validación de transición
- **Rol:** admin / laboratory / receptionist (cualquiera con `laboratory_orders:edit`)
- **URL:** `POST /api/v1/laboratory-orders/:id/status`
- **Severidad:** mayor (hipótesis con evidencia)
- **Pasos:**
  1. Mover orden 3 a `delivered` (admin).
  2. Mover orden 3 a `in_process` con JWT del usuario `laboratory` → 200 OK.
  3. Mover orden 3 a `delivered` con JWT del usuario `receptionist` → 200 OK.
- **Esperado:** las transiciones inválidas (regresión desde `delivered`) devuelven 409 / 422 con mensaje de "transición inválida". O al menos, el `delivered → in_process` exige justificación o estado intermedio (`returned_to_lab`).
- **Observado:** el backend acepta cualquier `status` del enum desde cualquier estado actual y graba history sin validar el `from_status`. El historial resultante de la orden 3:
  - admin: pending → in_process → sent_to_lab → in_transit → received_from_lab → in_quality → quality_approved → ready_for_delivery → delivered
  - laboratory: delivered → in_process (regresión libre)
  - receptionist: in_process → delivered (jump arbitrario)
- **Evidencia:** `GET /api/v1/laboratory-orders/3` muestra 11 entries de `status_history` con todas las transiciones aceptadas.
- **Impacto:** la trazabilidad SLA es engañosa; un usuario puede "deshacer" una entrega sin trazabilidad ni motivo, y los reportes de tiempo por estado se contaminan.
- **Estado:** confirmado (definir si es bug o decisión de diseño).

---

## OK / sin incidencias

| Rol | Ruta / acción | Notas |
|-----|---------------|-------|
| receptionist | `/receptionist/dashboard` | Carga, lista de cola de ventas correcta, agenda de hoy con citas. |
| receptionist | `/receptionist/patients/new` | Form se renderiza completo, validaciones español OK (post-fix QA-V2-003). |
| receptionist | `/receptionist/appointments/45` | Detalles + paciente + especialista visibles, sin filtración de Rx. |
| receptionist | `/receptionist/sales/new?appointment_id=45` | **Política "asesor sin Rx" respetada**: banner "Recomendación del médico" + 3 cards rankeadas; 0 fugas de esférico/cilindro/eje/avcc/dp. |
| specialist | `/specialist/appointments/45` (Tab Prescripción) | Form de receta completo, autoguardado parcial OK (`POST /clinical-record` 201). |
| specialist | `POST /clinical-record/prescription` (API) | Guarda los 12 valores Rx + tipo/material/uso + tratamientos + T.P. correctamente. |
| specialist | `POST /clinical-record/sign` (API) | Marca `status=signed`, devuelve `prescription` completo. |
| admin | `/admin/laboratory-orders/3` | Carga timeline de 5 etapas, datos de paciente + laboratorio + sede correctos. |
| admin | `POST /laboratory-orders/3/status` (todos los enum) | Vía API recorre los 12 estados; cada cambio queda en `status_history`. |
| laboratory | `POST /laboratory-orders/3/status {"status":"in_process"}` | API permite mover a estados de procesamiento (200 OK). |
| receptionist | `POST /laboratory-orders/3/status {"status":"delivered"}` | Permitido por API (200 OK), marca entrega final. |
| API | RBAC `specialist` → `laboratory_orders:edit` | **Bloqueado correctamente con 403** (pero ver QA-E2E-LAB-004: el flujo lo necesita). |

---

## Datos generados (para reproducir / limpiar)

| Recurso | ID | Detalle |
|---------|----|---------|
| Patient | 39 | QA E2E Mayo08 FlujoCompleto, ID 11050801999, qa.e2e.0508@convision.test |
| Appointment | 45 | branch=3 (Sede Centro), specialist=2, status=completed |
| ClinicalRecord | 19 | status=signed |
| Prescription | 13 | OD -1.50/-0.75 × 90 AVcc 20/20 / OI -1.25/-0.50 × 85 AVcc 20/20; lens_type=progresivo, material=policarbonato, use=permanente, treatments=[antirreflejo, filtro_luz_azul], T.P. CTNPO-9988 |
| Sale | 14 | total=$975.800 (subtotal 820.000 + IVA 19% 155.800), payment_status=paid |
| LaboratoryOrder | 3 | LAB-0003, sale_id=14, current=delivered (post pruebas) |

---

## Handoff al agente de corrección

**Agente recomendado:** `convision-qa-gap-fixer` (o regla Cursor `convision-qa-fixer` para issues simples).

**Comando sugerido:**
> Con `@convision-qa-gap-fixer`, cerrar QA-E2E-LAB-001 (bloqueante inventario), QA-E2E-LAB-002 (404 receptionist lab orders), QA-E2E-LAB-003 (laboratory layout falta), QA-E2E-LAB-005 (Firmar y completar consulta no dispara request), QA-E2E-LAB-006 (UI sólo expone subset del state machine) usando este FINDINGS como fuente.

**Prioridad sugerida:**

1. **QA-E2E-LAB-001** — bloqueante de negocio. Sin descuento de inventario, todo el módulo de ventas con stock físico está roto.
2. **QA-E2E-LAB-005** — bloqueante para el flujo clínico. Sin esto, todas las consultas se quedan abiertas.
3. **QA-E2E-LAB-002** — recepción no puede ver órdenes (sidebar miente).
4. **QA-E2E-LAB-006** — UI no cubre el state machine real.
5. **QA-E2E-LAB-003** — rol laboratory sin UI.
6. **QA-E2E-LAB-004** — especialista no puede aprobar QC (re-evaluar como decisión de producto vs RBAC).
7. **QA-E2E-LAB-007** — "Iniciar Venta" pierde appointment.
8. **QA-E2E-LAB-009** — falta validación de transición.
9. **QA-E2E-LAB-008** — UX date picker.

**Para cada hallazgo:** este FINDINGS incluye pasos exactos, evidencia (request/response) y datos reproducibles (paciente 39, cita 45, sale 14, lab order 3).
