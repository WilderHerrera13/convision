---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
started: 2026-04-24T21:51:00
updated: 2026-04-24T22:00:00
roles_tested: [admin, receptionist]
scope: "Flujo de órdenes de laboratorio con cargue de evidencias"
---

# QA FINDINGS — Órdenes de Laboratorio + Cargue de Evidencias
**Fecha:** 2026-04-24
**Alcance:** Flujo completo de órdenes de laboratorio desde listado admin hasta cargue de evidencias en recepcionista (ConfirmShipment + ConfirmReception).

---

## Resumen ejecutivo

- Pantallas verificadas: 8
- Hallazgos funcionales confirmados: 3
- Hallazgos UI/diseño confirmados: 1
- Hallazgos UX confirmados: 2
- Hipótesis / pendiente evidencia: 0
- **Flujo de evidencias: FUNCIONAL** — API upload/get OK, proxy /uploads correcto, thumbnails cargan, límite 4 fotos por etapa respetado.

### Hallazgos funcionales
- QA-EV-001: Texto "undefined" literal en el timeline del detalle de orden (variable JS no resuelta)
- QA-EV-002: Dropdown "Actualizar estado" tiene estados duplicados y estados de CRM/ventas mezclados
- QA-EV-004: Sin guardia de estado en páginas confirm-shipment / confirm-reception (accesibles desde cualquier estado)

### Hallazgos UI/diseño
- QA-EV-005: Paginación muestra "0–0 de N resultados" en listado de órdenes del recepcionista

### Hallazgos UX
- QA-EV-003: Botones de acción directa en el detalle ejecutan cambio de estado sin confirmación
- QA-EV-006: "Descargar PDF" siempre deshabilitado (sin PDF token) — sin mensaje explicativo

---

## Hallazgos (FAIL / GAP)

### QA-EV-001
- **Rol:** admin
- **URL:** http://localhost:4300/admin/laboratory-orders/6
- **Categoría:** funcional / copy
- **Severidad:** mayor
- **Pasos:**
  1. Ir a detalle de LAB-0006.
  2. Revisar la etapa "Enviado a laboratorio" del timeline (la que tiene estado de retorno por defecto).
- **Esperado:** Nota legible como "[Rayado o daño físico] Lentes con rayado en area central. Retornar para correcion."
- **Observado:** `"[Rayado o daño físico] undefinedLentes con rayado en area central. Retornar para correcion."` — la palabra `undefined` aparece literal en la UI. Además "correcion" tiene falta de ortografía (debería ser "corrección").
- **Evidencia:** Screenshot `.planning/qa/screenshots/lab-0006-undefined-bug.png`; texto extraído del snapshot: `paragraph: "[Rayado o daño físico] undefinedLentes con rayado en area central. Retornar para correcion."`
- **Estado:** confirmado
- **Causa probable:** En el componente que renderiza la nota del timeline, se concatena `${tipoDefecto}${descripcion}` sin espacio ni separador, y si `tipoDefecto` es undefined (campo no completado o no mapeado), JS lo convierte a la cadena `"undefined"`.

---

### QA-EV-002
- **Rol:** admin
- **URL:** http://localhost:4300/admin/laboratory-orders/6
- **Categoría:** funcional
- **Severidad:** mayor
- **Pasos:**
  1. Ir al detalle de cualquier orden de laboratorio.
  2. Hacer clic en "Actualizar estado".
  3. Abrir el dropdown de Estado.
- **Esperado:** Lista de estados propios del flujo de laboratorio (Pendiente, En proceso, Enviado a laboratorio, En tránsito, Recibido del laboratorio, En calidad, Listo para entregar, Entregado, Cerrado, Cancelado).
- **Observado:**
  - "En proceso" aparece **dos veces** (duplicado).
  - Aparecen estados ajenos al flujo de laboratorio: "Registro CRM", "Portafolio", "En cartera", "Seguimiento / Escalamiento" — probablemente estados de otro módulo (ventas/CRM) mezclados en la lista.
- **Evidencia:** Screenshot `.planning/qa/screenshots/lab-estado-dropdown.png`; estados visibles en snapshot: `Pendiente, Registro CRM, En proceso, En proceso, Enviado a laboratorio, En tránsito, Recibido del laboratorio, En calidad, Listo para entregar, Portafolio, Entregado, En cartera, Seguimiento / Escalamiento, Cerrado, Cancelado`
- **Estado:** confirmado

---

### QA-EV-003
- **Rol:** admin
- **URL:** http://localhost:4300/admin/laboratory-orders/6
- **Categoría:** ux
- **Severidad:** menor
- **Pasos:**
  1. Ir al detalle de una orden.
  2. Ver el panel "PRÓXIMA ACCIÓN".
  3. Hacer clic en "Confirmar recepción en sede" (o "Confirmar llegada a sede").
- **Esperado:** Modal de confirmación pidiendo al usuario que verifique la acción antes de ejecutarla.
- **Observado:** La acción se ejecuta inmediatamente sin diálogo de confirmación. El estado cambia en el acto y el toast aparece después. No hay posibilidad de cancelar.
- **Evidencia:** Estado cambia de "Enviado a laboratorio" → "En tránsito" al hacer clic sin ningún intermedio.
- **Estado:** confirmado

---

### QA-EV-004
- **Rol:** receptionist
- **URL:** http://localhost:4300/receptionist/lab-orders/6/confirm-shipment (y /confirm-reception)
- **Categoría:** funcional
- **Severidad:** mayor
- **Pasos:**
  1. Como receptionist, navegar directamente a `/receptionist/lab-orders/6/confirm-shipment` cuando la orden está en estado "En calidad" (no en "Pendiente").
  2. Observar si la página bloquea el acceso o permite continuar.
- **Esperado:** Redirección o mensaje de error indicando que la orden no está en el estado correcto para esta operación.
- **Observado:** La página carga completamente y permite rellenar el formulario y ejecutar la transición de estado, ignorando el estado actual de la orden. Esto puede provocar transiciones de estado inválidas (p. ej. pasar de "En calidad" a "Enviado a laboratorio" desde el formulario de confirmación de envío).
- **Evidencia:** Orden LAB-0006 estaba en `in_quality`; la URL `/confirm-shipment` cargó sin error. Screenshot `.planning/qa/screenshots/confirm-shipment-evidence.png`.
- **Estado:** confirmado

---

### QA-EV-005
- **Rol:** receptionist
- **URL:** http://localhost:4300/receptionist/lab-orders
- **Categoría:** diseño / ux
- **Severidad:** menor
- **Pasos:**
  1. Iniciar sesión como receptionist.
  2. Ir a "Órdenes de Laboratorio".
  3. Ver el pie de la tabla.
- **Esperado:** "Mostrando 1–5 de 5 resultados"
- **Observado:** "Mostrando 0–0 de 5 resultados" — el rango de ítems mostrados está mal calculado (devuelve 0 en vez del índice correcto).
- **Evidencia:** Screenshot `.planning/qa/screenshots/receptionist-lab-orders-pagination-bug.png`
- **Estado:** confirmado

---

### QA-EV-006
- **Rol:** admin
- **URL:** http://localhost:4300/admin/laboratory-orders/6
- **Categoría:** ux
- **Severidad:** sugerencia
- **Pasos:**
  1. Ir al detalle de cualquier orden de laboratorio.
  2. Ver el botón "Descargar PDF" en la barra superior.
- **Esperado:** Botón disponible o, si no aplica, un tooltip/mensaje explicando por qué está deshabilitado.
- **Observado:** El botón "Descargar PDF" aparece siempre deshabilitado (atributo `disabled`) sin ningún mensaje que explique por qué ni cuándo se habilitará. El usuario no sabe si es un error o una funcionalidad pendiente.
- **Evidencia:** `button "Descargar PDF" [disabled]` — presente en todas las órdenes verificadas.
- **Estado:** confirmado

---

## OK (sin incidencias)

| Rol | Ruta | Notas |
|-----|------|--------|
| admin | /admin/laboratory-orders | Lista carga correctamente, filtros por estado/sede/laboratorio/prioridad funcionan visualmente, contador de estados correcto (5 total) |
| admin | /admin/laboratory-orders/6 | Página de detalle carga, timeline de seguimiento visible, panel de próxima acción correcto |
| admin | Modal "Actualizar estado" | Abre y cierra correctamente, "Guardar cambios" se habilita al seleccionar estado |
| receptionist | /receptionist/lab-orders | Lista carga con datos (excepto bug de paginación), menú sidebar en español correcto |
| receptionist | /receptionist/lab-orders/6/confirm-shipment | UI del formulario carga correctamente, EvidenceUploader visible, tabs Subir archivo / Cámara presentes |
| receptionist | /receptionist/lab-orders/6/confirm-reception | UI del formulario carga correctamente, pre-fill de "Recibido por" con nombre del usuario correcto |
| API | POST /api/v1/laboratory-orders/:id/evidence | Upload de imagen retorna 201 con `image_url` relativa correcta |
| API | GET /api/v1/laboratory-orders/:id/evidence?type=... | Retorna lista de evidencias filtrada por tipo de transición |
| Front | EvidenceUploader — persistencia | Evidencias subidas previamente se muestran al recargar la página ("Guardadas en esta etapa") con contador actualizado |
| Front | Proxy /uploads | Las imágenes servidas desde el backend Go son accesibles vía el proxy Vite en dev |
| Front | Login admin | Redirige a /admin/dashboard |
| Front | Login receptionist | Redirige a /receptionist/dashboard |

---

## Handoff al agente de corrección

**IDs para corregir:**
- `QA-EV-001` — Bug crítico de presentación: variable `undefined` en texto de nota de timeline. Buscar en el componente de renderizado de notas del timeline de laboratorio; probablemente en el componente que interpreta el campo de tipo de defecto. Prioridad: **mayor**.
- `QA-EV-002` — Lista de estados en dropdown mezcla módulos. Filtrar la lista de estados permitidos para órdenes de laboratorio en el componente del modal. Prioridad: **mayor**.
- `QA-EV-004` — Sin guardia de estado en rutas `/confirm-shipment` y `/confirm-reception`. Agregar validación en el componente (o en el hook que carga la orden) para redirigir si el estado no es el correcto. Prioridad: **mayor**.
- `QA-EV-005` — Paginación muestra 0–0. Bug en el componente de tabla del receptionist; revisar cálculo de `startIndex`/`endIndex`. Prioridad: **menor**.
- `QA-EV-003` — Agregar modal de confirmación antes de ejecutar acciones directas de cambio de estado. Prioridad: **menor**.
- `QA-EV-006` — Agregar tooltip al botón "Descargar PDF" deshabilitado explicando la condición. Prioridad: **sugerencia**.

Comando sugerido: `Con @convision-qa-gap-fixer, cerrar QA-EV-001 a QA-EV-005 usando .planning/qa/FINDINGS-2026-04-24-lab-evidence-flow.md como fuente.`
