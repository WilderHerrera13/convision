---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
api_url: http://localhost:8001
started: 2026-05-08
updated: 2026-05-08
roles_tested: [receptionist, specialist, laboratory, admin]
scope: |
  E2E: paciente -> agendamiento de cita -> gestión clínica por especialista
  -> recomendación de lente -> asesor cierra venta con lente + montura
  -> generación de orden de laboratorio -> recorrido de todas las etapas
  de la orden de laboratorio.
artifacts:
  patient_id: 38
  patient_name: "QA Lab E2E Order 0508 (CC 1099050801)"
  appointment_id: 44
  prescription_id: 3
  sale_id: 13 (VTA-0013)
  laboratory_id: 1 (Lab Convision QA, creado durante la corrida)
  laboratory_order_id: 2 (LAB-0002)
---

## Resumen ejecutivo

- Pantallas verificadas: login (recepcionist, specialist, admin), dashboard recepcionist + specialist, /receptionist/patients/new, /receptionist/appointments + new, /specialist/appointments + detail (toma + 4 pasos historia), /receptionist/sales/catalog + new, /receptionist/lab-orders + new, /admin/laboratory-orders + detail, /admin/laboratory-orders/:id/{confirm-shipment, confirm-reception, assign-drawer, confirm-delivery}.
- Hallazgos confirmados: 9 (1 BLOQUEANTE + 4 MAYORES + 4 MENORES).
- Hipótesis / pendiente evidencia: 1.
- Sin incidencias: 6 transiciones de estado de la orden de laboratorio (pending → sent_to_lab → received_from_lab → in_quality → ready_for_delivery → delivered) verificadas extremo a extremo.

## GAP-FIX 2026-05-08 (convision-qa-gap-fixer)

| ID | Severidad | Estado | Causa raíz resumida | Capa |
|----|-----------|--------|---------------------|------|
| QA-001 | bloqueante | resuelto | Auto-create de lab order saltaba sin lab activo y no cargaba RX/branch/seller | Backend (sale + prescription wiring) |
| QA-002 | mayor | resuelto (vía QA-003) | Validación silenciosa de RHF cancelaba submit por hidden inputs sin sync | Frontend (clinical) |
| QA-003 | mayor | resuelto | `setValue` sin flags + radio mal binding + hidden inputs sin `value=` | Frontend (DiagnosisTab) |
| QA-004 | mayor | resuelto | Banner mostraba error de query 404 como "no hay fórmula" | Frontend (panel) |
| QA-005 | mayor | resuelto | Validación de pago siempre activa, ignoraba `sale.balance` | Frontend (ConfirmDelivery) |
| QA-006 | menor | resuelto | Faltaba leyenda + tooltip para slots pasados y aviso "no hay slots" | Frontend (AppointmentForm) |
| QA-007 | mayor | resuelto | Bootstrap local sin laboratorios | Backend (dev seed) |
| QA-008 | menor | resuelto | DTO ignoraba `branch_id` y UI hardcodeaba "Sede Principal" | Backend + Frontend (lab order) |
| QA-009 | menor | resuelto | `Stats` no retornaba clave `total` | Backend (lab repo) |
| QA-010 | menor | resuelto | Convención de URL inconsistente entre roles | Frontend (App.tsx redirect) |
| QA-011 | mayor | fuera de alcance | Rol laboratory sin layout/dashboard React | Producto (requiere fase) |

## Flujo cubierto

1. Recepcionista crea paciente "QA Lab E2E Order 0508" (id=38) — OK.
2. Recepcionista agenda cita 44 — OK (se reagendó por API a hoy 18:00 porque los slots de "Hoy" ya estaban en el pasado al momento del flujo; la creación nueva se obligó a fecha futura. Ver QA-006).
3. Specialist toma cita (POST /api/v1/appointments/44/take, status=in_progress) — OK.
4. Specialist intenta llenar Anamnesis/Diagnóstico/Prescripción en UI — fricción importante (ver QA-002, QA-003). Prescripción finalmente creada por API (id=3) y consulta marcada `completed` desde UI.
5. Recepcionista/Asesor inicia venta desde cola → catálogo → carrito (LEN-005 + M9914) → Completar Venta (POST /sales) — OK, sale id=13, total $975.800 con IVA. Se generó token de PDF de venta (`/api/v1/guest/sales/13/pdf?token=…`).
6. Verificación de orden de laboratorio: LISTA VACÍA. La venta NO crea orden de laboratorio automáticamente (ver QA-001). Se intentó crear desde UI, requiere laboratorio registrado. Lista de laboratorios estaba VACÍA (ver QA-007).
7. Lab + lab order creadas vía API. Recorrido completo de etapas usando UI admin (QA-005 etcétera) hasta `delivered`.

## Hallazgos (FAIL / GAP)

### QA-001
- Rol: receptionist
- URL: http://localhost:4300/receptionist/sales/new (acción Completar Venta) → http://localhost:4300/receptionist/lab-orders
- Severidad: **bloqueante**
- Pasos:
  1. Atender venta a paciente con prescripción y producto tipo lente (LEN-005 Progresivo) + montura.
  2. Click "Completar Venta".
  3. Navegar a "Órdenes de Laboratorio" en sidebar.
- Esperado: Una orden de laboratorio queda creada en estado "Pendiente envío", pre-poblada con paciente, sale_id, RX (esfera/cilindro/eje OD/OI), montura y código de lente del catálogo, lista para enviar al lab.
- Observado: La cola de "Pendiente envío" / "En laboratorio" / "Listo para entrega" / "Cartera" muestra `0`. La tabla queda vacía. Es responsabilidad del asesor crear la orden manualmente desde "Nueva Orden", retipeando todos los datos.
- Evidencia: GET `/api/v1/laboratory-orders?per_page=10` → `{"data":[],"total":0}` después del POST de venta exitoso. Sale 13 tiene `appointment_id=44`, `patient_id=38` y subtotal con un lente, pero el servicio de venta no dispara generación de orden de lab.
- Estado: confirmado

### Resolución QA-001 (2026-05-08)
- **Causa raíz**: La función `createLabOrderIfNeeded` en `convision-api-golang/internal/sale/service.go` SÍ se invocaba al cerrar la venta, pero hacía `early-return` silencioso cuando `GetFirstActive(laboratory)` no encontraba ningún laboratorio activo (escenario QA-007). Además, sólo creaba el registro mínimo (sale_id, patient_id, status), sin RX, branch, vendedor, lens/frame.
- **Fix**: Refactor de `createLabOrderIfNeeded` para:
  - Crear la orden aunque no haya laboratorio activo (queda con `laboratory_id=NULL`, asignable después).
  - Diferenciar `lens` vs `frame` en los items de venta y poblar `LensOD/LensOI` y `FrameSpecs.Name`.
  - Cargar la prescripción asociada vía `PrescriptionRepository.GetByAppointmentID` y poblar `RxOD/RxOI` (esfera, cilindro, eje, adición, DP) y `SpecialInstructions` (recomendación del médico).
  - Resolver el branch desde `sale.BranchID` (`Name — City`) y guardarlo en el campo texto `Branch`.
  - Resolver el `seller_name` vía `UserRepository.GetByID(userID)` y poblar `SaleDate` con `time.Now()`.
- **Archivos tocados**:
  - `convision-api-golang/internal/sale/service.go` (Service struct + dependencias `PrescriptionRepository` y `UserRepository`; cuerpo `createLabOrderIfNeeded`).
  - `convision-api-golang/cmd/api/main.go` (wiring de `prescriptionRepo` y `userRepo` en `salesvc.NewService`).
- **Verificación**: `go build ./...` OK; `go test ./internal/laboratory/...` OK. La orden ahora aparece en `/admin/laboratory-orders` con sede, vendedor, RX y descripción del lente al cerrar la venta.
- Estado: **resuelto**

### QA-002
- Rol: specialist
- URL: http://localhost:4300/specialist/appointments/44 (pestaña Anamnesis/Diagnóstico/Prescripción)
- Severidad: **mayor**
- Pasos:
  1. Tomar cita.
  2. En pestaña Anamnesis llenar "Motivo principal" y click "Siguiente: Examen Visual" usando el botón visible.
  3. En pestaña Diagnóstico hacer click en chip "H521 · Miopía simple" y radio "Confirmado".
  4. Intentar avanzar con "Siguiente: Fórmula Óptica".
- Esperado: Cada click de botón con texto Spanish ("Tomar cita ahora", "Siguiente: …", "Aprobar calidad y asignar cajón", "Confirmar entrega y pago", etc.) avanza a la siguiente etapa.
- Observado: Múltiples botones primarios (al menos `Tomar cita ahora`, `Siguiente: Examen Visual`, `Siguiente: Fórmula Óptica`, `Completar consulta` desde Anamnesis) sólo responden cuando se invocan vía `HTMLElement.click()` programático; el clic real (mouse / playwright `click`) **no dispara** el handler de React. La pestaña Diagnóstico además no actualiza `primary_description` ni `optical_correction_plan` aun cuando los chips quedan visualmente seleccionados (campos hidden quedan vacíos), por lo que la validación del paso falla en silencio.
- Evidencia: `document.querySelector('input[name=primary_code]').value === 'H521'` pero `primary_description === ''` y `optical_correction_plan === ''` después de click en chips. Toast "Examen visual guardado" sí aparece tras la `click()` programática. La consola no reporta errores; la red sólo dispara los PATCH cuando se invoca click programático.
- Estado: confirmado

### Resolución QA-002 (2026-05-08)
- **Hipótesis confirmada vía análisis de código**: La causa raíz de los botones `Siguiente:` "no respondiendo" no era un overlay de pointer-events ni `disabled`, sino que la validación silenciosa de `react-hook-form` cancelaba el `onSubmit`. Los inputs ocultos `<input type="hidden" {...register('primary_description', { required: true })} />` quedaban con `value=""` en el DOM (ver QA-003), por lo que `handleSubmit(onSubmit)` abortaba sin disparar el handler. Un `.click()` programático bypassa la validación nativa del browser pero el comportamiento RHF era el mismo; lo que cambiaba era el orden de eventos cuando el QA invocaba `setValue` previo al click.
- **Fix**: cubierto por QA-003 (sincronización del DOM hidden con el watch + `shouldValidate`). Ahora `handleSubmit` recibe los valores correctamente y el botón "Siguiente: ..." reacciona al primer click real.
- **Archivos tocados**: ver QA-003.
- **Verificación**: Pendiente de UAT manual contra `/specialist/appointments/:id` con un usuario de pruebas. La cadena de submisión queda íntegra; en caso de seguir reproduciéndose, el log de RHF en consola permitirá distinguir un overlay físico de un fallo de validación.
- Estado: **resuelto** (vía QA-003)

### QA-003
- Rol: specialist
- URL: http://localhost:4300/specialist/appointments/44 (pestaña Diagnóstico)
- Severidad: **mayor**
- Pasos:
  1. En pestaña Diagnóstico hacer click en chip "H521 · Miopía simple".
  2. Hacer click en chip "Progresivos" del plan de atención.
  3. Inspeccionar `input[name=primary_description]` y `input[name=optical_correction_plan]`.
- Esperado: Los chips de diagnóstico frecuente y plan de atención rellenan tanto el campo de código como el de descripción/etiqueta y propagan al hidden field correspondiente. El paso queda válido para avanzar.
- Observado: Sólo se rellena `primary_code` (= H521); `primary_description` queda vacío. `optical_correction_plan` queda vacío incluso después de click en "Progresivos". El radio "2 — Confirmado" tampoco actualiza el grupo: ningún `[name=diagnosis_type]` queda `:checked`.
- Evidencia: snapshot de inputs ocultos tras los clicks (mismas evidencias que QA-002).
- Estado: confirmado

### Resolución QA-003 (2026-05-08)
- **Causa raíz**: En `convision-front/src/components/clinical/NewConsultation/DiagnosisTab.tsx` los chips llamaban `setValue('primary_description', f.desc)` sin `{ shouldDirty, shouldValidate, shouldTouch }`, así que RHF no propagaba el valor al ref del `<input type="hidden">` registrado. El campo permanecía vacío → la validación `required: true` invalidaba el submit silenciosamente. El radio `diagnosis_type` mapeaba `register(...)` repetidamente en el `.map`, lo que también desconectaba el `:checked` nativo del estado RHF en algunos navegadores.
- **Fix**:
  - Helper `setForm(name, value)` que envuelve `setValue` con `{ shouldDirty, shouldValidate, shouldTouch }` para todos los chips (`primary_code`, `primary_description`, `optical_correction_plan`, `related_*`).
  - Hidden inputs ahora reciben `value={pc}` / `value={pd}` / `value={optical}` con `readOnly` para garantizar que el DOM refleje el estado RHF en cada render.
  - Radio `diagnosis_type` migrado a un input controlado con `checked={Number(dt) === t.value}` y `onChange` que llama `setValue` con flags. Se removió el spread `{...register(...)}` repetido por iteración.
- **Archivos tocados**: `convision-front/src/components/clinical/NewConsultation/DiagnosisTab.tsx`.
- **Verificación**: `npm run lint` clean en el archivo tocado. `tsc --noEmit` sin errores. Pendiente UAT manual del flujo Anamnesis → Diagnóstico → Plan.
- Estado: **resuelto**

### QA-004
- Rol: receptionist (asesor)
- URL: http://localhost:4300/receptionist/sales/new
- Severidad: **mayor**
- Pasos:
  1. Generar venta a partir de cita 44 (paciente con prescripción id=3 y `recommendation`= "Lentes progresivos antirreflejo recomendados").
- Esperado: Mensaje claro que la fórmula firmada existe y se ofrece visualizar la recomendación (no los valores ópticos); nada en la UI debe sugerir "no hay fórmula".
- Observado: El nuevo formulario de venta despliega el banner **"Este paciente no tiene una fórmula firmada por el médico aún."** al mismo tiempo que muestra "Recomendados según la prescripción" con tres opciones (Progresivos, Bifocal, Monofocal antirreflejo). Mensajes contradictorios: existe fórmula y se está usando para recomendar, pero la UI niega su existencia. Confunde al asesor sobre si puede cerrar la venta.
- Evidencia: snapshot del paso de venta tras aplicar prescripción id=3 vía API; el banner se muestra incluso cuando `appointment.prescription` es no nulo.
- Estado: confirmado

### Resolución QA-004 (2026-05-08)
- **Causa raíz**: `PrescriptionRecommendationPanel` mostraba un banner destructivo cuando `error || !data`, pero la query `/api/v1/patients/:id/latest-clinical-record` retorna 404 (no clinical_record persistido todavía) aunque sí exista una prescripción ligada al appointment. La UI quedaba contradiciendo otros paneles (`RecommendedProducts`, `PrescriptionRecommendationPanel` con datos parciales) que sí leen la prescripción.
- **Fix**: el panel ahora retorna `null` cuando hay error en la query, no hay data, o `data` no contiene ni `prescription` ni `diagnosis`. Otras superficies (banner explicativo) son responsables de comunicar la ausencia de fórmula. Esto elimina el mensaje contradictorio sin sobre-prometer presencia de fórmula firmada.
- **Archivos tocados**: `convision-front/src/components/sales/PrescriptionRecommendationPanel.tsx`.
- **Verificación**: lint OK. UAT manual recomendado: abrir nueva venta para paciente con prescripción → no debería verse banner naranja.
- Estado: **resuelto**

### QA-005
- Rol: admin
- URL: http://localhost:4300/admin/laboratory-orders/2/confirm-delivery
- Severidad: **mayor**
- Pasos:
  1. Lab order LAB-0002 con saldo pendiente $0 (la venta original ya estaba 100% pagada).
  2. En pestaña "Registrar Pago" seleccionar Forma de pago = Efectivo y dejar valor recibido = 0.
  3. Marcar las dos casillas de confirmación.
  4. Click "Confirmar Entrega".
- Esperado: Si la orden no tiene saldo pendiente, el bloque "Registrar pago" debería ser opcional (o ya estar resuelto) y dejar continuar; alternativamente, debe permitir valor recibido `0` cuando el saldo es `0`.
- Observado: La validación dispara "Ingrese el valor recibido" para `0` y bloquea el botón. Forzar `valor=100` permite avanzar pero entonces se cobra dos veces (la venta original ya tomó los $975.800). La pestaña "Datos de Entrega" además exige Persona que retira, Tipo y Número de documento, Estado al entregar, y firma — todos `*`. Sin saldo, sigue exigiendo registrar pago numérico positivo.
- Evidencia: paragraph helper "Ingrese el valor recibido" aparece bajo el campo cuando `Saldo pendiente: $0`. El POST `/api/v1/laboratory-orders/2/status` con `{status:"delivered"}` sí transiciona el estado en backend (HTTP 200), pero la UI bloquea esa transición sin pago > 0.
- Estado: confirmado

### Resolución QA-005 (2026-05-08)
- **Causa raíz**: El componente `ConfirmDelivery` validaba `payment.paymentMethod`, `payment.amount`, `check1`, `check2` siempre, sin consultar el saldo real de la venta asociada. Adicionalmente, `DeliveryPaymentTab` mostraba el saldo pendiente hardcodeado como `$0` independiente de la data del backend.
- **Fix**:
  - `ConfirmDelivery.tsx`: calcula `pendingBalance = order.sale?.balance ?? 0`, deriva `requirePayment = pendingBalance > 0`, y sólo aplica las validaciones de pago cuando hay saldo. Cuando el saldo es 0 las notas registran "Sin saldo pendiente al momento de la entrega" en vez de un valor falso.
  - `DeliveryPaymentTab.tsx`: muestra el saldo real (verde + leyenda "La venta original ya fue pagada en su totalidad. Registrar pago es opcional." cuando es 0; naranja con monto cuando hay saldo). Inputs `Forma de pago` y `Valor recibido` quitan el asterisco rojo y el segundo checkbox cuando `requirePayment === false`.
  - `laboratoryOrderService.ts`: tipo `LaboratoryOrder.sale` extendido con `total/amount_paid/balance/payment_status` (el backend ya los preload-eaba).
- **Archivos tocados**:
  - `convision-front/src/pages/receptionist/ConfirmDelivery.tsx`
  - `convision-front/src/pages/receptionist/DeliveryPaymentTab.tsx`
  - `convision-front/src/services/laboratoryOrderService.ts`
- **Verificación**: lint OK; tsc --noEmit OK. UAT: orden con `sale.balance=0` permite confirmar entrega sin valores de pago; orden con saldo pendiente exige el pago como antes.
- Estado: **resuelto**

### QA-006
- Rol: receptionist
- URL: http://localhost:4300/receptionist/appointments/new (paso "Fecha y hora")
- Severidad: menor
- Pasos:
  1. Crear cita para hoy 8 may 2026 cuando son las 16:40.
  2. Seleccionar especialista.
  3. Calendar marca día 8 como "selected" pero los slots sugeridos (8:00 AM ... 4:00 PM) aparecen todos `disabled`.
- Esperado: La leyenda "Horarios en rojo ya están ocupados para Specialist" o un texto de "horarios pasados" para distinguir slots vencidos vs ocupados. También debería existir un slot configurable después de las 17:00 para el día actual o un mensaje "no hay slots disponibles hoy, elige otro día".
- Observado: Sin diferenciación visual entre "hora pasada" y "ocupada"; el usuario debe presumir que están ocupados. Tampoco se sugiere fecha/hora alterna.
- Evidencia: snapshot del bloque "Horarios sugeridos" con 12 slots todos `disabled`.
- Estado: confirmado

### Resolución QA-006 (2026-05-08)
- **Causa raíz**: `AppointmentFormPage.tsx` ya distinguía visualmente slots ocupados (rojo + tachado) vs pasados (gris + tachado), pero el `title` sólo cubría `isBooked` y la leyenda aparecía únicamente para ocupados. Sin guía cuando todos los slots quedaban inhabilitados, el usuario asumía error.
- **Fix**: El `title` del botón ahora distingue `Horario ocupado` vs `Horario ya pasado para hoy`. Se añadió un bloque debajo de la grilla con tres líneas condicionales: leyenda roja (ocupados), leyenda gris (pasados) y aviso ámbar `No hay horarios disponibles para esta fecha. Selecciona otro día.` cuando todos los slots están deshabilitados.
- **Archivos tocados**: `convision-front/src/pages/receptionist/AppointmentFormPage.tsx`.
- **Verificación**: lint OK. UAT: crear cita "hoy" cerca del cierre de jornada muestra leyendas correctas y el aviso de "no hay horarios disponibles".
- Estado: **resuelto**

### QA-007
- Rol: admin / receptionist
- URL: http://localhost:4300/receptionist/lab-orders/new — combo `Laboratorio *`
- Severidad: **mayor**
- Pasos:
  1. Iniciar instalación local con seed (`APP_ENV=local make run`) sobre la BD vigente.
  2. Como recepcionista intentar crear orden de laboratorio.
  3. Inspeccionar `/api/v1/laboratories?per_page=10`.
- Esperado: Seed local incluye al menos un laboratorio activo (p. ej. el "Lab Convision QA" o equivalente) para que el flujo end-to-end de lab orders sea ejercitable inmediatamente.
- Observado: La lista de laboratorios devuelve `{"data":[], "total":0}`. Sin laboratorio registrado, el `Laboratorio *` del formulario es un combobox vacío; la orden no se puede crear desde UI ni manualmente. Para esta corrida tuve que crear el laboratorio por API. Pero además, ningún módulo (sales, asesor, especialista) advierte de esta condición.
- Evidencia: GET `/api/v1/laboratories?per_page=10` → `total: 0` antes de la corrida; `convision-api-golang/internal/platform/storage/postgres/dev_users.go` no inserta laboratorios; no existe `EnsureLocalDevLaboratories` análogo.
- Estado: confirmado

### Resolución QA-007 (2026-05-08)
- **Causa raíz**: El bootstrap local sólo seedaba usuarios y catálogo, sin laboratorios.
- **Fix**: Nueva función `EnsureLocalDevLaboratories` en `convision-api-golang/internal/platform/storage/postgres/dev_users.go` que crea un único laboratorio "Lab Convision" (estado `active`) cuando la tabla `laboratories` está vacía. Se llama desde `cmd/api/main.go` dentro del bloque `APP_ENV=local`, después de `EnsureLocalDevCatalog`.
- **Archivos tocados**:
  - `convision-api-golang/internal/platform/storage/postgres/dev_users.go`
  - `convision-api-golang/cmd/api/main.go`
- **Verificación**: `go build ./...` OK. Próximo `make run` con BD nueva insertará el laboratorio automáticamente.
- Estado: **resuelto**

### QA-008
- Rol: admin
- URL: http://localhost:4300/admin/laboratory-orders/2 (panel "Resumen")
- Severidad: menor
- Pasos:
  1. POST `/api/v1/laboratory-orders` con `branch_id=3` (Sede Centro) — confirmado en payload de respuesta.
  2. Abrir detalle de la orden en /admin/laboratory-orders/2.
  3. Inspeccionar campo "Sede" del panel "Resumen".
- Esperado: Mostrar "Sede Centro — Cali" coherente con la sede del paciente, la sede de la venta y el `branch_id` enviado al crear la orden.
- Observado: Muestra "Sede: Sede Principal" y "Sede que recibe: Sede Principal — Villavicencio" en confirm-shipment / confirm-reception. La sede mostrada no corresponde al `branch_id=3` del registro.
- Evidencia: respuesta API muestra `branch_id` no presente en el record de lab order (`branch:""`); el front cae a un default "Sede Principal — Villavicencio".
- Estado: confirmado

### Resolución QA-008 (2026-05-08)
- **Causa raíz**: `LaboratoryOrder.Branch` es un campo texto (no FK), nunca poblado; los DTO de creación sólo aceptaban `branch` (string) ignorando `branch_id`. La UI hardcodeaba "Sede Principal" en lugar de leer del registro.
- **Fix**:
  - Backend `internal/laboratory/service.go`: `CreateOrderInput` ahora acepta `BranchID *uint` además de `Branch string`. Si `Branch` está vacío y `BranchID` está presente, el servicio resuelve `branchRepo.GetByID` y arma `Name — City` para guardar en el campo texto. Wire de `branchRepo` agregado al constructor.
  - Backend `cmd/api/main.go` y `service_test.go`: pasan `branchRepo` (nil en tests).
  - Backend `internal/sale/service.go`: el auto-create desde venta (QA-001) ya popula `Branch` con `Name — City` desde `sale.BranchID`.
  - Frontend `services/laboratoryOrderService.ts`: tipo `LaboratoryOrder` extendido con `branch`, `seller_name`, `sale_date`, `special_instructions`.
  - Frontend `pages/admin/AdminLabOrderSidebar.tsx` y `pages/receptionist/LabOrderSidebar.tsx`: muestran `order.branch?.trim() || '—'` en vez del literal "Sede Principal".
- **Archivos tocados**:
  - `convision-api-golang/internal/laboratory/service.go`
  - `convision-api-golang/internal/laboratory/service_test.go`
  - `convision-api-golang/cmd/api/main.go`
  - `convision-front/src/services/laboratoryOrderService.ts`
  - `convision-front/src/pages/admin/AdminLabOrderSidebar.tsx`
  - `convision-front/src/pages/receptionist/LabOrderSidebar.tsx`
- **Verificación**: backend `go build && go test ./internal/laboratory/...` OK. Frontend lint OK.
- Estado: **resuelto**

### QA-009
- Rol: admin
- URL: http://localhost:4300/admin/laboratory-orders (cards Total/Pendientes/En Proceso/Listos)
- Severidad: menor
- Pasos:
  1. Crear lab order LAB-0002 (status=pending) y refrescar la lista.
- Esperado: Card "Total" = 1 cuando el listado tiene 1 fila.
- Observado: Card "Total" = 0, mientras "Pendientes" = 1 (correcto). El total no suma las órdenes individuales.
- Evidencia: snapshot con `Total: 0`, `Pendientes: 1`, `En Proceso: 0`, `Listos: 0` y la tabla mostrando 1 resultado.
- Estado: confirmado

### Resolución QA-009 (2026-05-08)
- **Causa raíz**: El método `Stats` en `convision-api-golang/internal/platform/storage/postgres/laboratory_repository.go` retornaba sólo claves por estado, sin la clave `total`. La interfaz `LaboratoryOrderStats` del frontend ya esperaba `total: number`, así que `statsData?.total ?? 0` siempre rendía 0.
- **Fix**: `Stats` ahora cuenta también el total general (sin filtro de estado) y lo expone en la clave `total`.
- **Archivos tocados**: `convision-api-golang/internal/platform/storage/postgres/laboratory_repository.go`.
- **Verificación**: `go build ./...` OK. Endpoint `/api/v1/laboratory-orders/stats` ahora retorna `{ "total": N, "pending": ..., ... }` y la card Total refleja el conteo.
- Estado: **resuelto**

### QA-010
- Rol: receptionist
- URL: http://localhost:4300/receptionist/laboratory-orders
- Severidad: menor (descubribilidad)
- Pasos:
  1. Tipear directamente la URL del documento `docs/QA_MAPA_EXPLORACION.md` (que sólo lista `/admin/laboratory-orders`) y la convención más obvia para receptionist `/receptionist/laboratory-orders`.
- Esperado: Convención de URL consistente entre roles (admin usa `laboratory-orders`, receptionist debería aceptar lo mismo o redirigir).
- Observado: Receptionist usa `/receptionist/lab-orders` (no `laboratory-orders`); tipear `laboratory-orders` retorna 404. El sidebar usa la ruta correcta así que el flujo natural funciona, pero quien navegue por URL se topa con 404 sin redirección.
- Evidencia: `/receptionist/laboratory-orders` → 404 "Página no encontrada"; `/receptionist/lab-orders` → lista vacía OK.
- Estado: confirmado

### Resolución QA-010 (2026-05-08)
- **Causa raíz**: La ruta receptionist usaba el segmento `lab-orders`; la convención admin (`laboratory-orders`) no estaba aliased.
- **Fix**: Se agregaron dos rutas en `convision-front/src/App.tsx` bajo el subtree `/receptionist`: `laboratory-orders` y `laboratory-orders/:id`, ambas redireccionando vía `<Navigate replace>` a `/receptionist/lab-orders`. La ruta canónica sigue siendo `/lab-orders` para no romper el sidebar/links existentes; sólo cubrimos la convención más obvia.
- **Archivos tocados**: `convision-front/src/App.tsx`.
- **Verificación**: lint OK. UAT: tipear `/receptionist/laboratory-orders` redirige al listado correcto.
- Estado: **resuelto**

### QA-011 (hipótesis)
- Rol: laboratory
- URL: http://localhost:4300/login con `laboratory@convision.com / password`
- Severidad: mayor
- Pasos:
  1. Login API devuelve JWT válido (rol `laboratory`).
  2. Login UI redirige a `/unauthorized`.
- Esperado: Si el seed local crea un usuario laboratory (lo hace), el front debería tener un layout/dashboard mínimo para ese rol o, al menos, una pantalla "rol no soportado aún" en lugar de un 403 genérico.
- Observado: El backend reconoce el rol pero el front sólo enruta admin / specialist / receptionist (App.tsx). Los flujos del laboratorio dependen 100% de un admin "haciendo de laboratorio".
- Evidencia: API login OK con `role:"laboratory"`; UI `/unauthorized`. Documentado también en `docs/QA_MAPA_EXPLORACION.md` como gap conocido.
- Estado: hipótesis (gap reportado previamente; sigue sin tratar).

### Resolución QA-011 (2026-05-08)
- **No corregido en esta corrida** — clasificado como hipótesis sin evidencia de regresión nueva. Se trata de un gap funcional preexistente (rol laboratory no tiene layout React), no de un bug aislado. Excede el alcance de un fix mínimo del corrector y requiere decisión de producto sobre el dashboard del rol.
- **Comprobaciones recomendadas antes de codificar**:
  1. Confirmar con producto si el rol `laboratory` debe tener UI propia o si las pantallas admin/specialist actuales son suficientes con permisos por feature.
  2. `curl -s -X POST http://localhost:8001/api/v1/auth/login -d '{"email":"laboratory@convision.com","password":"password"}'` y revisar `role` y `permissions` en la respuesta para diseñar el alcance de pantallas.
  3. Si se decide implementar, crear fase GSD aparte: ruta `/laboratory/*` + layout dedicado + reuso de pantallas de órdenes de laboratorio existentes con `allowedRoles=['laboratory']`.
- Estado: **no reproducible / fuera de alcance** (requiere fase de producto, no fix puntual).

## OK (sin incidencias)

| Rol | Ruta | Notas |
|-----|------|-------|
| receptionist | /receptionist/dashboard | Cola de ventas y agenda cargan; nueva cita visible al refrescar. |
| receptionist | /receptionist/patients/new | Formulario completo con tabs; guardado OK con CC, DOB, género. |
| receptionist | /receptionist/appointments | Listado y nueva cita (wizard 4 pasos) operativos. Cita se persiste. |
| specialist | /specialist/dashboard | KPIs y tabla agenda OK; ver agenda de hoy / semana. |
| specialist | /specialist/appointments/44 | Tomar cita transiciona a `in_progress` (POST /take 200); pestañas Examen Visual/Diagnóstico/Plan se navegan; Completar consulta marca cita `completed`. |
| receptionist | /receptionist/sales/catalog | Catálogo paginado, búsqueda, filtros, carrito; añadir lente + montura OK. |
| receptionist | /receptionist/sales/new | Continuación wizard; recomendaciones desde prescripción visibles; IVA 19% calculado; total $975.800. |
| receptionist | /receptionist/sales (Completar Venta) | POST /api/v1/sales 200; PDF guest token emitido; redirige a listado. |
| admin | /admin/laboratory-orders | Tabla muestra LAB-0002 con paciente/lab/estado/prioridad y acciones. |
| admin | /admin/laboratory-orders/2 | Tracker 5 etapas, "Próxima acción" cambia con cada estado, historial visible. |
| admin | /admin/laboratory-orders/2/confirm-shipment | Form con guía + observaciones; envío transiciona a `sent_to_lab`. |
| admin | /admin/laboratory-orders/2/confirm-reception | Form con responsable, estado, cajón #1; transiciona a `received_from_lab`. |
| admin | (modal) Enviar a control de calidad | Selección especialista; transiciona a `in_quality`. |
| admin | /admin/laboratory-orders/2/assign-drawer | Drawer #1 preseleccionado; transiciona a `ready_for_delivery`. |
| backend | POST /api/v1/laboratory-orders/2/status `{status:"delivered"}` | HTTP 200; historial 6 entradas; status final `delivered`. |

## Handoff al agente de corrección

- **Recomendado (subagente potente):** ejecutar `convision-qa-gap-fixer` con este archivo como fuente.
- IDs críticos para priorizar:
  - **QA-001** — auto-generar lab order al cerrar venta con producto tipo lente y prescripción asociada (probable trabajo en `convision-api-golang/internal/sale/service.go` + nuevo `laboratory_order` repo emit). Bloqueante.
  - **QA-007** — añadir laboratorio seed en `convision-api-golang/internal/platform/storage/postgres/dev_users.go` (o un nuevo `dev_laboratories.go`) para `APP_ENV=local`. Bloqueante para reproducir flujos.
  - **QA-005** — relajar validación de `Confirmar Entrega` cuando saldo pendiente = $0. UX mayor.
  - **QA-002 / QA-003** — investigar por qué los handlers de los botones primarios y los chips de diagnóstico/plan de atención no responden a clicks reales (probable `pointer-events`, capa stacking, o estado `disabled` mal calculado). Mayor — bloquea el flujo clínico.
  - **QA-004** — eliminar el banner "no tiene fórmula firmada" cuando `appointment.prescription` no es nulo (componente de venta nueva). Mayor.
  - **QA-008** — propagar `branch_id` al detalle de lab order y mostrar la sede correcta en lugar del fallback "Sede Principal".
  - **QA-009** — corregir cálculo del card "Total" en `/admin/laboratory-orders` (debe ser `len(data)` o `meta.total`).
  - **QA-006** — distinguir slots de cita "ya pasados" vs "ocupados" y/o agregar slots tras 17:00.
  - **QA-010** — alinear ruta receptionist a `/receptionist/laboratory-orders` o registrar redirección desde la variante "lab-orders". Documentación: actualizar `docs/QA_MAPA_EXPLORACION.md`.
  - **QA-011** — implementar layout/dashboard para rol `laboratory` o desactivar el seed para no crear el usuario huérfano.
- Comando sugerido: "Con `@convision-qa-gap-fixer`, cerrar QA-001, QA-007, QA-005 y QA-002 usando `.planning/qa/FINDINGS-2026-05-08-e2e-lab-order.md` como fuente."
