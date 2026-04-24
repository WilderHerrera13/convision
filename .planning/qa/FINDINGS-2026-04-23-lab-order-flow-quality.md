---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
started: 2026-04-23T13:04:00-05:00
updated: 2026-04-23T18:00:00-05:00
roles_tested: [admin, receptionist, specialist]
scope: Flujo completo orden de laboratorio — estados + flujo de calidad del especialista
fixed_by: convision-qa-gap-fixer (2026-04-23)
---

## Resumen ejecutivo

- Pantallas verificadas: 8
- Hallazgos funcionales confirmados: 3
- Hallazgos UI/diseño confirmados: 2
- Hallazgos de copy/ux confirmados: 2
- Hipótesis / pendiente evidencia: 1
- Sin incidencias: lista de órdenes admin, lista de revisión especialista, formulario nueva orden, aprobación calidad (flujo normal)

---

## Hallazgos (FAIL / GAP)

### QA-LAB-001
- Rol: receptionist
- URL: http://localhost:4300/receptionist/lab-orders/:id/confirm-reception
- Categoría: **funcional**
- Severidad: **bloqueante**
- Pasos:
  1. Crear una nueva orden de laboratorio (admin) → queda en `pending`
  2. Avanzar a `in_process` con el botón "Enviar a laboratorio"
  3. Avanzar a `sent_to_lab` con el botón "Registrar envío"
  4. Desde la vista del recepcionista, abrir la orden en `sent_to_lab`
  5. Hacer clic en "Confirmar Recepción" → navega a `/confirm-reception`
  6. Rellenar formulario y confirmar
- Esperado: La orden debería pasar por los estados intermedios del flujo del negocio: `sent_to_lab → in_transit → received_from_lab → in_quality`. El recepcionista debería confirmar primero que el laboratorio recibió el paquete (`in_transit`), luego cuando el laboratorio lo devuelve, confirmar la recepción en sede (`received_from_lab`), y solo entonces enviar a calidad (`in_quality`).
- Observado: `ConfirmReception.tsx` llama directamente `status: 'in_quality'` saltando `in_transit` y `received_from_lab`. La orden va de `sent_to_lab` a `in_quality` en un solo paso.
- Evidencia: Código en `convision-front/src/pages/receptionist/ConfirmReception.tsx` línea 62: `await laboratoryOrderService.updateLaboratoryOrderStatus(Number(id), { status: 'in_quality', notes })`. También visible en el historial de LAB-0006 y LAB-0005.
- Estado: **confirmado** → **resuelto** (2026-04-23)
- Fix: `ConfirmReception.tsx` `status: 'received_from_lab'` (era `in_quality`). `LabOrderSidebar.tsx` separado en casos `sent_to_lab`, `in_transit`, `received_from_lab`; `received_from_lab` tiene botón directo "Enviar a control de calidad" → `in_quality`. El flujo del negocio tiene 3 etapas entre envío y calidad: (1) la orden física viaja al lab — `sent_to_lab`; (2) el lab la recibe y la fabrica, el mensajero recoge — `in_transit`; (3) llega a la sede — `received_from_lab`; (4) el recepcionista la entrega al especialista — `in_quality`. El formulario `ConfirmReception` fusiona las etapas 2-4 en una sola acción. Los estados `in_transit` y `received_from_lab` existen en el dominio pero el flujo del recepcionista no los usa.

**Impacto:** El historial de la imagen compartida (LAB-0005) muestra exactamente este salto: `pending → in_quality` sin los estados intermedios, lo que genera confusión operacional y pérdida de trazabilidad.

---

### QA-LAB-002
- Rol: specialist
- URL: http://localhost:4300/specialist/laboratory-orders/:id
- Categoría: **funcional** + **copy**
- Severidad: **mayor**
- Pasos:
  1. Abrir una orden en estado `in_quality` en la vista del especialista (tab "Decisión de calidad")
  2. Seleccionar "Retornar al laboratorio"
  3. El campo "Observaciones" muestra placeholder `Describa el resultado...` pero al escribir, el texto inicia con "undefined"
  4. Al confirmar, el modal de retorno muestra en el textarea `undefinedTexto que escribió el usuario`
  5. El historial de la orden muestra la nota con "undefined" al inicio: `[Rayado o daño físico] undefinedLentes con rayado...`
- Esperado: El campo de observaciones inicia vacío (`""`); lo que el usuario escribe se guarda limpio.
- Observado: El estado `observations` en `QualityReviewDetail.tsx` se inicializa con el valor default de `useState('')` pero la función `onObservationsChange` en `ReturnModal` actualiza el estado del componente padre usando `setObservations` — sin embargo el textarea del modal recibe directamente `value: observations` que ya tiene el texto de la pantalla anterior. Al abrirse el modal, el value es el texto que ya tenía el textarea principal. El problema real es que el `observations` pasado al modal contiene `"undefined"` concatenado porque en `ReturnModal` se hace `value={observations}` y este prop llega como la string "undefined" desde el estado inicial del componente.
- Evidencia: Screenshot `page-2026-04-23T13-13-13-420Z.png`. En el snapshot del navegador, el textarea tiene `value: undefinedLentes con rayado en area central. Retornar para correcion.`. En el historial de admin, la nota guarda `[Rayado o daño físico] undefinedLentes con rayado en area central. Retornar para correcion.`
- Estado: **confirmado** → **resuelto** (2026-04-23)
- Fix: `QualityReviewDetail.tsx` — añadido estado separado `returnObservations` (`useState('')`) para el `ReturnModal`. El modal ya no comparte el estado `observations` del `DecisionPanel`. `returnObservations` se resetea a `''` cada vez que el modal de retorno se abre. el estado `observations` se inicializa con `useState('')`. El textarea en la pantalla principal recibe `value={observations}`. Al hacer `browser_fill`, el valor anterior es `undefined` (cuando el campo aún no ha sido tocado, el valor del ref puede ser `undefined` en vez de `""`). Posiblemente el `useState('')` no es el problema sino que hay una condición de race o el texto se inizializa como `undefined` antes de que el estado se hidrate. Revisar si hay un `defaultValue` o prop inicial que envía `undefined`.

---

### QA-LAB-003
- Rol: admin
- URL: http://localhost:4300/admin/laboratory-orders/:id
- Categoría: **funcional** (lógica de estados)
- Severidad: **mayor**
- Pasos:
  1. Crear orden nueva → `pending`
  2. Hacer clic en "Enviar a laboratorio" (botón del ACTION_CONFIG para `pending`)
- Esperado: La orden debería ir a `sent_to_lab` directamente o el botón debería llevar a un formulario de envío.
- Observado: La orden pasa a `in_process` (no a `sent_to_lab`). Luego hay un segundo botón "Registrar envío" que lleva a `sent_to_lab`. El flujo tiene 2 pasos para llegar al laboratorio desde admin, pero la UI del recepcionista en `LabOrderSidebar` para estado `pending` tiene un solo botón que va a `/confirm-shipment` que sí pone `sent_to_lab` directamente. Hay inconsistencia entre admin y recepcionista: para el admin hay un estado intermedio `in_process`, para el recepcionista no.
- Evidencia: `ACTION_CONFIG` en `LaboratoryOrderDetail.tsx`: `pending → in_process → sent_to_lab`. `LabOrderSidebar.tsx` para `pending`: va a `/confirm-shipment` que pone `sent_to_lab`. El `LAB_ORDER_MAIN_FLOW` incluye `crm_registered` entre `pending` y `in_process` pero el ACTION_CONFIG salta `crm_registered`.
- Estado: **confirmado** → **resuelto** (2026-04-23)
- Fix: `LaboratoryOrderDetail.tsx` `ACTION_CONFIG.pending.nextStatus` cambiado de `'in_process'` a `'sent_to_lab'`. Título y descripción actualizados. La entrada `in_process` se conserva para órdenes ya en ese estado.
- Rol: admin / receptionist
- URL: http://localhost:4300/receptionist/lab-orders/:id (accedida con sesión de admin)
- Categoría: **funcional** (permisos cross-role)
- Severidad: **menor**
- Pasos:
  1. Login como admin
  2. Navegar directamente a `/receptionist/lab-orders/6`
- Esperado: Redirección a `/unauthorized` o al dashboard de admin, ya que la ruta es del rol `receptionist`.
- Observado: La página carga correctamente con la UI del recepcionista. El admin puede acceder y ejecutar acciones del recepcionista.
- Evidencia: URL http://localhost:4300/receptionist/lab-orders/6 accesible con token de admin.
- Estado: **no reproducible** — El acceso de admin a rutas `/receptionist/...` es **intencional**: `App.tsx` línea 585 define `allowedRoles={['receptionist', 'admin']}` explícitamente.

---

### QA-LAB-005
- Rol: receptionist
- URL: http://localhost:4300/receptionist/lab-orders/:id/confirm-reception
- Categoría: **copy** + **ux**
- Severidad: **menor**
- Pasos:
  1. Abrir el formulario de confirmación de recepción
  2. Ver el panel informativo derecho "Al confirmar la recepción"
- Esperado: El texto debería explicar el flujo real (múltiples estados de tránsito antes de calidad).
- Observado: El texto dice "La orden pasa a **'En calidad'** automáticamente." — lo cual es incorrecto dado el bug QA-LAB-001 (actualmente sí pasa directamente a calidad, pero tampoco debería). Si el bug se corrige, este texto quedaría incorrecto también.
- Evidencia: Screenshot `page-2026-04-23T13-10-16-189Z.png`
- Estado: **confirmado** → **resuelto** (2026-04-23)
- Fix: Texto del panel lateral de `ConfirmReception.tsx` actualizado: "La orden queda como 'Recibida del laboratorio'. El recepcionista la enviará a control de calidad desde el detalle de la orden."
- Rol: receptionist
- URL: http://localhost:4300/receptionist/lab-orders/:id (sidebar derecho)
- Categoría: **copy**
- Severidad: **menor**
- Pasos:
  1. Abrir una orden en estado `sent_to_lab` o `in_transit`
  2. Ver el texto del sidebar: "La orden está en camino al laboratorio."
- Esperado: La orden ya fue enviada al laboratorio, no está "en camino". El texto debería ser "La orden fue enviada al laboratorio y está siendo fabricada."
- Observado: El texto dice "en camino al laboratorio" cuando ya llegó (estado `sent_to_lab` significa que fue enviado).
- Evidencia: `LabOrderSidebar.tsx` línea 64-66.
- Estado: **confirmado** → **resuelto** (2026-04-23)
- Fix: `LabOrderSidebar.tsx` — casos `sent_to_lab` e `in_transit` separados con copy correcto. `sent_to_lab`: "La orden fue enviada al laboratorio y está siendo fabricada."; `in_transit`: "El laboratorio ha enviado los lentes. El mensajero está en camino a sede."
- Rol: admin
- URL: http://localhost:4300/admin/laboratory-orders/:id
- Categoría: **ux**
- Severidad: **menor**
- Pasos: Cuando la orden está en `in_quality`, el botón de acción está deshabilitado con texto "Esperando al especialista" (sin `nextStatus`).
- Esperado: El usuario debería entender claramente qué está esperando.
- Observado: El botón muestra "Esperando al especialista" pero no hay ningún indicador de cuánto tiempo lleva en ese estado, ni un link a la vista del especialista para hacer seguimiento.
- Evidencia: `ACTION_CONFIG.in_quality.btnLabel = 'Esperando al especialista'`
- Estado: **hipótesis** (no implementado — UX improvement fuera del alcance del fix actual)

---

## OK (sin incidencias)

| Rol | Ruta | Notas |
|-----|------|--------|
| admin | /admin/laboratory-orders | Carga, estadísticas correctas, filtros funcionales |
| admin | /admin/laboratory-orders/new | Formulario completo, validación funciona, crea correctamente |
| admin | /admin/laboratory-orders/:id | Header de orden, timeline, ACTION_CONFIG funcionan |
| specialist | /specialist/laboratory-orders | Lista solo órdenes en `in_quality`, estado vacío correcto |
| specialist | /specialist/laboratory-orders/:id (tab "Datos del lente") | Muestra info correctamente |
| specialist | Flujo de aprobación | Al aprobar → `ready_for_delivery`, sale de la cola de calidad |
| specialist | Flujo de retorno al laboratorio | Al retornar → `sent_to_lab`, sale de la cola de calidad |
| receptionist | /receptionist/lab-orders/:id/confirm-reception (formulario) | Formulario con validación funciona, se puede seleccionar fecha y estado del lente |

---

## Resumen de hallazgos

### Hallazgos funcionales
| ID | Descripción | Severidad |
|----|-------------|-----------|
| QA-LAB-001 | ConfirmReception salta estados `in_transit` y `received_from_lab` → va directo de `sent_to_lab` a `in_quality` | bloqueante |
| QA-LAB-002 | Campo `observations` se inicializa con "undefined" en el ReturnModal del especialista | mayor |
| QA-LAB-003 | Flujo admin tiene estado `in_process` intermediario que no existe en el flujo del recepcionista — inconsistencia entre roles | mayor |
| QA-LAB-004 | Admin puede acceder a rutas `/receptionist/...` sin restricción | menor |

### Hallazgos UI/diseño y copy
| ID | Descripción | Severidad |
|----|-------------|-----------|
| QA-LAB-005 | Texto incorrecto en sidebar de recepción "pasa a En calidad automáticamente" | menor |
| QA-LAB-006 | Copy incorrecto "en camino al laboratorio" cuando ya fue enviado | menor |
| QA-LAB-007 | UX: no hay seguimiento visible cuando orden está en `in_quality` | sugerencia |

---

## Análisis del bug principal (QA-LAB-001)

El historial de la imagen compartida (LAB-0005) muestra la secuencia:
1. `Pendiente` → "Orden creada"
2. `En calidad` → "QA advance to in_quality" ← **salto incorrecto**
3. `Enviado a laboratorio` → retorno al lab por calidad
4. `En tránsito`
5. `Recibido del laboratorio` → "QA test advance"
6. `En calidad`
7. `Listo para entregar`
8. `Entregado`

El salto `pending → in_quality` en el historial de LAB-0005 fue posible porque el flujo del recepcionista en `ConfirmReception` envía directamente `in_quality`. En este caso específico, probablemente la orden fue creada y el recepcionista usó "Confirmar envío" (o se manipuló directamente el estado). El flujo correcto de negocio debería ser:

```
pending → in_process → sent_to_lab → in_transit → received_from_lab → in_quality → ready_for_delivery → delivered
```

**Corrección recomendada:**
- `ConfirmReception.tsx`: Cambiar `status: 'in_quality'` a `status: 'received_from_lab'`
- Agregar pantalla/paso `ConfirmDeliveryFromLab` para `received_from_lab → in_quality`
- O simplificado: dividir `ConfirmReception` en dos acciones: "Confirmar envío recibido por lab" (`in_transit`) y "Confirmar llegada a sede" (`received_from_lab → in_quality`)

---

## Handoff al agente de corrección

Usar regla `convision-qa-gap-fixer` con los siguientes IDs prioritarios:
1. **QA-LAB-001** — crítico: corregir flujo de estados en `ConfirmReception.tsx`
2. **QA-LAB-002** — mayor: corregir inicialización del estado `observations` en `QualityReviewDetail.tsx`
3. **QA-LAB-003** — mayor: alinear flujo admin/recepcionista para estados iniciales
4. **QA-LAB-005** y **QA-LAB-006** — menor: corregir copy en sidebar del recepcionista
