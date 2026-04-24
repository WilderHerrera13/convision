---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
started: 2026-04-22T23:00:00
updated: 2026-04-22T23:30:00
roles_tested: [admin, specialist]
scope: Validación completa del flujo de estados de orden de laboratorio + flujo de calidad del especialista
orders_tested: [LAB-0005 (id:5)]
---

# QA FINDINGS — Flujo Completo Orden de Laboratorio + Calidad Especialista

## Resumen ejecutivo

Se validó el ciclo de vida completo de LAB-0005 a través de todos los estados del flujo principal, con foco especial en el flujo de revisión de calidad del especialista.

- **Estados verificados (en orden):** `pending` → `in_process` → `sent_to_lab` → `in_transit` → `received_from_lab` → `in_quality` → `ready_for_delivery` → `delivered`
- **Flujo de retorno verificado:** especialista retornó desde `in_quality` → `sent_to_lab` con nota de defecto
- **Flujo de aprobación verificado:** especialista aprobó desde `in_quality` → `ready_for_delivery`
- **Hallazgos bloqueantes:** 0
- **Hallazgos funcionales mayores:** 1 (GAP-002)
- **Hallazgos UX/diseño:** 2 (GAP-001, GAP-003)
- **Sin incidencias:** transiciones de estado via botones de acción primaria, panel PRÓXIMA ACCIÓN por estado, badge de estado, timeline de trazabilidad, panel ESTADO FINAL en `delivered`

---

## Estados verificados — OK

| Estado | URL admin | Botón acción primaria | Resultado |
|--------|-----------|----------------------|-----------|
| `pending` | `/admin/laboratory-orders/:id` | "Enviar a laboratorio" → `in_process` | ✓ OK |
| `in_process` | `/admin/laboratory-orders/:id` | "Registrar envío" → `sent_to_lab` | ✓ OK |
| `sent_to_lab` | `/admin/laboratory-orders/:id` | "Marcar en tránsito" → `in_transit` | ✓ OK |
| `in_transit` | `/admin/laboratory-orders/:id` | "Marcar como recibido" → `received_from_lab` | ✓ OK |
| `received_from_lab` | `/admin/laboratory-orders/:id` | "Enviar a calidad" → `in_quality` | ✓ OK |
| `in_quality` (admin) | `/admin/laboratory-orders/:id` | Botón deshabilitado "Esperando al especialista" | ✓ OK |
| `in_quality` (specialist) | `/specialist/laboratory-orders/:id` | Decisión aprobar → `ready_for_delivery` | ✓ OK (vía API) |
| `in_quality` (specialist) | `/specialist/laboratory-orders/:id` | Decisión retornar → `sent_to_lab` con nota | ✓ OK (vía API) |
| `ready_for_delivery` | `/admin/laboratory-orders/:id` | "Marcar como entregada" → `delivered` | ✓ OK |
| `delivered` | `/admin/laboratory-orders/:id` | "Descargar comprobante" + toast sin pdf_token | ✓ OK |

---

## Hallazgos (GAP)

### GAP-001
- **Categoría:** ux
- **Severidad:** sugerencia
- **Rol:** admin
- **URL:** `/admin/laboratory-orders/:id` (estado: `delivered`)
- **Descripción:** El estado `delivered` se trata como estado terminal en la UI — no existe una transición primaria hacia `closed`. El `ACTION_CONFIG` no define entrada para `delivered → closed`. Para cerrar una orden completamente hay que usar el modal "Actualizar estado" (escape hatch manual).
- **Esperado:** Si `closed` es un estado parte del ciclo de vida normal (auditoría, cierre financiero), debería existir un botón "Cerrar orden" en el panel ESTADO FINAL de `delivered`.
- **Observado:** Panel ESTADO FINAL muestra solo "Descargar comprobante". No hay camino hacia `closed` en el flujo primario.
- **Evidencia:** `ACTION_CONFIG` en `LaboratoryOrderDetail.tsx:80` — `delivered` no tiene `nextStatus`. `isTerminal` check en línea 474 confirma `delivered || cancelled` como estados finales.
- **Nota:** `closed` SÍ es accesible vía el modal "Actualizar estado" (muestra todos los estados del backend). Si este es el diseño intencional para cierre administrativo/manual, no es un bug — es una decisión de diseño a confirmar con producto.
- **Estado:** pendiente confirmación de producto

---

### GAP-002
- **Categoría:** funcional
- **Severidad:** mayor
- **Rol:** admin
- **URL:** `/admin/laboratory-orders/:id` (estado: `closed`)
- **Descripción:** Si una orden llega al estado `closed` (vía "Actualizar estado" manual), el panel PRÓXIMA ACCIÓN muestra incorrectamente el mensaje y botón del estado `pending` ("Verificar y enviar al laboratorio / Confirma datos y envíala al laboratorio").
- **Causa raíz:** Línea 473 de `LaboratoryOrderDetail.tsx`:
  ```ts
  const config = ACTION_CONFIG[order.status] ?? ACTION_CONFIG['pending'];
  ```
  `closed` no está en `ACTION_CONFIG`, por lo que cae en el fallback de `pending`.
- **Esperado:** El estado `closed` debería mostrar un mensaje de estado final (ej: "Orden cerrada" con descripción de cierre), NO el mensaje de `pending`.
- **Impacto:** Cualquier orden en `closed` muestra datos inconsistentes. El botón "Enviar a laboratorio" aparecería activo y llamaría `updateLaboratoryOrderStatus` para avanzar a `in_process`.
- **Fix sugerido:** Agregar entrada en `ACTION_CONFIG`:
  ```ts
  closed: {
    title: 'Orden cerrada',
    desc: 'La orden fue cerrada administrativamente.',
    btnLabel: 'Cerrada',
  },
  ```
  Y agregar `'closed'` al check `isTerminal`.
- **Estado:** abierto

---

### GAP-003
- **Categoría:** diseño
- **Severidad:** menor
- **Rol:** admin
- **URL:** `/admin/laboratory-orders/:id` (estado: `delivered`)
- **Descripción:** El contador de etapas muestra "10 de 10 etapas completadas" cuando la orden está en `delivered`, pero `LAB_ORDER_MAIN_FLOW` define 10 estados con `closed` como el décimo. Si `delivered` es el noveno estado y `closed` el décimo, el contador debería mostrar "9 de 10" en `delivered`.
- **Observado:** Badge "10 de 10 etapas completadas" en estado `delivered`. El estado `closed` NO aparece como "pendiente" en el timeline cuando la orden está en `delivered`.
- **Esperado:** Consistencia entre la definición de `LAB_ORDER_MAIN_FLOW` (10 estados incluyendo `closed`) y el contador. O bien remover `closed` del flow principal si no es parte del ciclo primario.
- **Evidencia:** Screenshot `lab-0005-delivered.png` — badge "10 de 10 etapas completadas". `LAB_ORDER_MAIN_FLOW` en `laboratoryOrderStatus.ts:100` incluye `closed` como última etapa.
- **Estado:** abierto

---

## Hallazgos de infraestructura de testing

### INFO-001
- **Categoría:** infra
- **Severidad:** info (no es bug de la app)
- **Descripción:** El contenedor Docker `convision_go_api` requiere rebuild manual cuando se modifica el binario Go. Durante esta sesión, el contenedor ejecutaba un binario antiguo que no incluía `received_from_lab` en el validador `oneof` del campo `Status`, causando errores 422. El rebuild con `docker compose build api && docker compose up -d api` resolvió el problema.
- **Acción recomendada:** Documentar proceso de rebuild en `convision-api-golang/docker/README.md` o agregar healthcheck de versión al startup del contenedor.

### INFO-002
- **Categoría:** infra / testing
- **Severidad:** info (no es bug de la app)
- **Descripción:** El MCP de Playwright (`browser_click`) no dispara handlers de React en ciertas condiciones (eventos sintéticos `isTrusted=false`). Workaround: `browser_evaluate` con `element.click()`. Este patrón afecta la automatización QA pero NO la experiencia del usuario en navegador real.
- **Impacto en QA:** El flujo de tabs Radix UI en `QualityReviewDetail.tsx` (tab "Decisión de calidad") no pudo ser activado vía Playwright. El flujo de aprobación/retorno se verificó vía API directa. La sesión QA anterior (`FINDINGS-2026-04-22-lab-quality-flow.md`) confirmó visualmente que el tab funciona en navegador.

---

## Resumen por dimensión

### Funcional
1. Todas las transiciones de estado del flujo primario funcionan vía botón de acción en el panel PRÓXIMA ACCIÓN ✓
2. El panel PRÓXIMA ACCIÓN muestra título, descripción y botón correcto para cada estado ✓
3. El estado `in_quality` muestra botón deshabilitado "Esperando al especialista" correctamente ✓
4. El estado `delivered` muestra panel "ESTADO FINAL" con mensaje correcto ✓
5. **GAP-002 (mayor):** Estado `closed` muestra mensaje de `pending` si se llega vía override manual

### UX/Diseño
6. Badge de estado actualiza correctamente en cada transición ✓
7. Timeline muestra historial completo con timestamps, duración en estado, y notas ✓
8. Barra de progreso verde avanza visualmente con cada estado ✓
9. **GAP-001 (sugerencia):** No hay transición primaria `delivered → closed`
10. **GAP-003 (menor):** Contador "10 de 10 etapas completadas" en `delivered` es inconsistente con `LAB_ORDER_MAIN_FLOW`

### Calidad del especialista
11. Lista QualityReview filtra correctamente órdenes en `in_quality` ✓
12. Flujo de aprobación (approve → `ready_for_delivery`) funciona ✓
13. Flujo de retorno (return → `sent_to_lab` con nota de defecto) funciona ✓
14. Validación del formulario de decisión (textarea requerido) funciona ✓

---

## Handoff al agente de corrección

Priorizar **GAP-002** por ser funcional/mayor:

- **GAP-002:** Agregar `closed` a `ACTION_CONFIG` en `LaboratoryOrderDetail.tsx` y al check `isTerminal`. El fallback a `ACTION_CONFIG['pending']` es incorrecto para órdenes cerradas.
- **GAP-003:** Revisar la lógica del contador de etapas — alinear la definición de "completado" con `LAB_ORDER_MAIN_FLOW` o remover `closed` del flujo principal si es solo administrativo.
- **GAP-001:** Confirmar con producto si `closed` debe tener un botón primario desde `delivered` o si el override manual es suficiente.
