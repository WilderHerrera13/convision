---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
started: 2026-04-22T22:28:00
updated: 2026-04-22T22:45:00
roles_tested: [admin, specialist]
scope: Flujo completo orden de laboratorio + flujo de calidad del especialista (QualityReview)
orders_tested: [LAB-0004 (id:4), LAB-0005 (id:5)]
---

# QA FINDINGS — Flujo Orden de Laboratorio + Calidad Especialista

## Resumen ejecutivo

- Pantallas verificadas: 8 (admin/laboratory-orders, admin/laboratory-orders/new, admin/laboratory-orders/:id, specialist/laboratory-orders, specialist/laboratory-orders/:id — tabs Datos del lente y Decisión de calidad)
- Hallazgos funcionales confirmados: 3
- Hallazgos UI/diseño confirmados: 4
- Hallazgos de idioma confirmados: 1
- Hipótesis / pendiente evidencia: 1
- Sin incidencias: Flujo de aprobación (approve), Flujo de retorno (return), Validación de formulario, Loading states, Empty states

---

## Hallazgos (FAIL / GAP)

### QA-001
- **Rol:** admin
- **URL:** http://localhost:4300/admin/laboratory-orders/:id
- **Categoría:** funcional
- **Severidad:** bloqueante
- **Pasos:**
  1. Crear una nueva orden de laboratorio (estado: pending)
  2. Abrir el detalle de la orden en vista admin
  3. Hacer clic en el botón "Enviar a laboratorio" → la orden pasa a `in_process`
  4. Hacer clic en el botón "Registrar envío" → la orden pasa a `sent_to_lab`
  5. Hacer clic en el botón "Marcar como listo" en el panel PRÓXIMA ACCIÓN
- **Esperado:** La orden avance de `sent_to_lab` → `in_transit` → `received_from_lab` → `in_quality`, permitiendo al especialista realizar la revisión de calidad
- **Observado:** La orden salta directamente de `sent_to_lab` a `ready_for_delivery`, **saltándose completamente los estados `in_transit`, `received_from_lab` e `in_quality`**. El especialista nunca puede realizar la revisión de calidad via este flujo normal.
- **Evidencia:** API confirmó: `pending → in_process → sent_to_lab → ready_for_delivery`. Historial sin `in_transit`, `received_from_lab` ni `in_quality`.
- **Estado:** resuelto — `ACTION_CONFIG` extendido con `in_transit`, `received_from_lab` e `in_quality`; `sent_to_lab.nextStatus` cambiado a `in_transit`

---

### QA-002
- **Rol:** admin
- **URL:** http://localhost:4300/admin/laboratory-orders/:id (estado: in_quality)
- **Categoría:** funcional
- **Severidad:** mayor
- **Pasos:**
  1. Forzar una orden al estado `in_quality` via API
  2. Abrir el detalle de la orden en vista admin
  3. Revisar el panel "PRÓXIMA ACCIÓN" y el botón de acción del toolbar
- **Esperado:** El panel PRÓXIMA ACCIÓN debería mostrar un mensaje indicando que la orden está en revisión de calidad por el especialista (ej: "Esperando revisión del especialista") y el botón del toolbar debería estar deshabilitado o mostrar info relevante.
- **Observado:** El panel PRÓXIMA ACCIÓN muestra "Verificar y enviar a laboratorio / La orden está pendiente. Confirma datos y envíala al laboratorio para iniciar el proceso." (el mensaje del estado `pending`, no del estado `in_quality`). El botón del toolbar muestra "Enviar a laboratorio" (también del estado `pending`).
- **Evidencia:** ARIA snapshot del admin detail con orden en `in_quality` muestra refs: `name: Verificar y enviar a laboratorio` y button `name: Enviar a laboratorio`.
- **Estado:** resuelto — `in_quality` agregado al `ACTION_CONFIG` con mensaje correcto y botón deshabilitado
- **Rol:** admin
- **URL:** http://localhost:4300/admin/laboratory-orders/new
- **Categoría:** funcional
- **Severidad:** mayor
- **Pasos:**
  1. Ir a crear nueva orden de laboratorio
  2. Seleccionar laboratorio
  3. Intentar seleccionar paciente del dropdown
- **Esperado:** Seleccionar un paciente del dropdown y permanecer en el formulario para completar los otros campos
- **Observado:** Al hacer clic en la opción de paciente del dropdown, la aplicación navega de regreso a `/admin/laboratory-orders` (lista), cancelando el formulario sin confirmación.
- **Evidencia:** Durante la navegación de QA, al abrir el selector de paciente y hacer clic en una opción, el ARIA snapshot cambió de URL `/admin/laboratory-orders/new` a `/admin/laboratory-orders` indicando navegación inesperada.
- **Estado:** resuelto — Botón Cancelar movido al área de acciones del formulario con `type="button"` explícito

---

### QA-004
- **Rol:** specialist
- **URL:** http://localhost:4300/specialist/laboratory-orders/:id (tab: Decisión de calidad)
- **Categoría:** diseño
- **Severidad:** menor
- **Pasos:**
  1. Abrir el detalle de una orden en calidad como especialista
  2. Ir al tab "Decisión de calidad"
  3. Seleccionar "Retornar al laboratorio"
  4. Hacer clic en "Confirmar decisión" para abrir el ReturnModal
  5. Abrir el dropdown de "Tipo de defecto"
- **Esperado:** El dropdown de opciones se despliega por encima del contenido del modal
- **Observado:** Las opciones del dropdown (Graduación incorrecta, Rayado o daño físico, etc.) se renderizan **detrás** del campo "Observaciones" del modal. El z-index del portal del Select component no supera el z-index del contenido del diálogo.
- **Evidencia:** Screenshot muestra las opciones del dropdown visibles pero parcialmente ocultas bajo el textarea del modal.
- **Estado:** resuelto — `SelectContent` en `ReturnModal` ahora usa `position="popper"` y `className="z-[200]"`
- **Rol:** admin
- **URL:** http://localhost:4300/admin/laboratory-orders/:id
- **Categoría:** diseño
- **Severidad:** sugerencia
- **Pasos:**
  1. Abrir cualquier orden en el admin detail
- **Esperado:** La badge de Prioridad debe estar claramente asociada visualmente a su label "Prioridad"
- **Observado:** En el card de estado superior (LAB-0004, Listo para entregar), la badge "Media" está posicionada en la esquina superior derecha del card, pero la etiqueta "Prioridad" aparece en la parte inferior derecha debajo de ella. Esta separación hace que no sea inmediatamente claro que "Media" es la prioridad. El badge flota visualmente sin conexión inmediata con su label.
- **Evidencia:** Screenshot de admin detail — la badge "Media" está arriba a la derecha y "Prioridad" está debajo a la derecha, sin una relación visual clara de proximidad.
- **Estado:** resuelto — Sección de prioridad rediseñada: label "PRIORIDAD" aparece arriba del badge, ambos centrados verticalmente en el mismo contenedor
- **Rol:** admin
- **URL:** http://localhost:4300/admin/dashboard
- **Categoría:** idioma
- **Severidad:** menor
- **Pasos:**
  1. Iniciar sesión como admin y abrir el dashboard
  2. Revisar la sección "Citas de hoy"
- **Esperado:** La fecha debería mostrarse completamente en español: "Miércoles, 22 de Abril de 2026"
- **Observado:** La fecha muestra: "**Wednesday**, 22 De Abril De 2026" — el nombre del día está en inglés ("Wednesday") en lugar de español ("Miércoles").
- **Evidencia:** Screenshot del dashboard muestra "Citas de hoy / Wednesday, 22 De Abril De 2026" con el día de la semana en inglés.
- **Estado:** resuelto — `{ locale: es }` agregado al `format()` en `AppointmentsSection.tsx` + import de `es` añadido
- **Rol:** admin / specialist
- **URL:** http://localhost:4300/specialist/laboratory-orders/:id (tab: Decisión de calidad)
- **Categoría:** ux
- **Severidad:** menor
- **Pasos:**
  1. Abrir detalle de orden en revisión de calidad
  2. Tab "Decisión de calidad"
  3. Hacer clic en "Confirmar decisión" → se abre el ApproveModal
  4. Hacer clic en "Confirmar aprobación" → la orden avanza y navega a la lista
- **Esperado:** Un toast/notificación visible confirmando "Orden aprobada exitosamente" al llegar a la lista
- **Observado:** El toast se dispara via `?action=approved` en la URL y el `useEffect` del componente `QualityReview`. En las pruebas el toast no fue visible en el screenshot (puede haber aparecido brevemente antes de ser capturado). Sin embargo, el flujo navega correctamente y la orden desaparece de la lista.
- **Evidencia:** El código en `QualityReview.tsx` implementa el toast correctamente vía searchParams. No se pudo confirmar visualmente en este QA.
- **Estado:** resuelto — `duration: 5000` agregado a ambos toasts (`approved` y `returned`) para garantizar visibilidad

---

### QA-008
- **Rol:** admin
- **URL:** http://localhost:4300/admin/laboratory-orders
- **Categoría:** diseño
- **Severidad:** sugerencia
- **Pasos:**
  1. Navegar a la lista de órdenes de laboratorio del admin
- **Esperado:** Los 5 cards de estadísticas (Total, Pendientes, En tránsito, En calidad, Listos) están en un layout grid uniforme
- **Observado:** Los 4 primeros cards están en un grid 2x2, pero el card "Listos" está solo en una fila de ancho parcial (~50%), dejando un espacio visual vacío a su lado. El layout se ve desbalanceado.
- **Evidencia:** Screenshot de la lista de admin — "Listos: 1" card ocupa solo la mitad izquierda de la última fila.
- **Estado:** resuelto — Grid cambiado a `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` para distribución balanceada

| Rol | Ruta | Notas |
|-----|------|--------|
| admin | /admin/laboratory-orders | Lista carga, filtros funcionales (Sede, Estado, Prioridad, Laboratorio, Periodo), búsqueda visible |
| admin | /admin/laboratory-orders/:id (pending) | Header, timeline, PRÓXIMA ACCIÓN y botón correcto para estado pending |
| admin | /admin/laboratory-orders/:id (in_process) | Botón "Registrar envío" correcto, timeline avanza |
| admin | /admin/laboratory-orders/:id (sent_to_lab) | "Marcar como listo" visible en PRÓXIMA ACCIÓN, timeline avanza |
| admin | /admin/laboratory-orders/:id (ready_for_delivery) | Estado correcto post-aprobación especialista, botón "Marcar como entregada" ✓ |
| specialist | /specialist/laboratory-orders | Lista de revisión de calidad carga, filtros de búsqueda y prioridad, empty state con ícono y texto descriptivo |
| specialist | /specialist/laboratory-orders/:id (Datos del lente) | Información de la orden visible correctamente, historial de estados funcional |
| specialist | /specialist/laboratory-orders/:id (Decisión de calidad) | Cards de decisión con iconos, selección visual (verde/rojo), textarea obligatorio, validación con mensajes de error |
| specialist | ApproveModal | Checkbox "Notificar al paciente" checked by default, loading state "Confirmando...", navegación post-aprobación ✓ |
| specialist | ReturnModal | Selector de tipo de defecto (5 opciones), campo observaciones pre-rellenado, loading state "Retornando...", estado final `sent_to_lab` con notas `[defecto] observaciones` ✓ |
| specialist | Validación form Decisión de calidad | Banner de error al enviar sin observaciones, borde rojo en textarea, mensaje de error bajo el campo ✓ |

---

## Resumen por dimensión

### Hallazgos funcionales
1. **QA-001 (bloqueante):** El botón "Marcar como listo" en estado `sent_to_lab` del admin salta la orden directamente a `ready_for_delivery`, omitiendo `in_transit`, `received_from_lab` e `in_quality`. El flujo de calidad del especialista **no es accesible** desde el flujo normal de la UI.
2. **QA-002 (mayor):** Vista admin de una orden en estado `in_quality` muestra incorrectamente el mensaje y botón del estado `pending` en el panel PRÓXIMA ACCIÓN.
3. **QA-003 (mayor):** En el formulario "Nueva Orden de Laboratorio", seleccionar un paciente del dropdown navega inesperadamente de vuelta a la lista.

### Hallazgos UI/diseño
4. **QA-004 (menor):** Dropdown "Tipo de defecto" en ReturnModal se renderiza con z-index incorrecto — las opciones aparecen detrás del textarea del modal.
5. **QA-005 (sugerencia):** Badge de prioridad en el card de estado del admin detail tiene separación visual confusa de su label "Prioridad".
6. **QA-006 (menor idioma):** El nombre del día de la semana en la sección "Citas de hoy" del dashboard aparece en inglés ("Wednesday") en lugar de español ("Miércoles").
7. **QA-008 (sugerencia):** Card de estadísticas "Listos" en la lista admin está solo en la última fila, creando un layout desbalanceado.

---

## Handoff al agente de corrección

Usar regla `convision-qa-gap-fixer` con este archivo como fuente.

**Prioridad alta (bloqueantes/mayores):**
- **QA-001:** Revisar `LaboratoryOrderDetail.tsx` (admin) — la lógica del botón "Marcar como listo" en el estado `sent_to_lab` debe avanzar a `received_from_lab` o `in_quality`, NO a `ready_for_delivery`.
- **QA-002:** Revisar la lógica del panel PRÓXIMA ACCIÓN en el detalle admin para que el estado `in_quality` muestre el mensaje correcto (no el de `pending`).
- **QA-003:** Investigar el formulario de nueva orden — el selector de Paciente usa `react-select` o similar y probablemente tiene un manejador de evento que propaga el click al fondo.

**Prioridad normal (menores):**
- **QA-004:** El `Select` dentro del `Dialog` (ReturnModal) necesita `modal` prop o ajuste de z-index/portal para que el dropdown flote correctamente sobre el contenido.
- **QA-006:** Verificar el locale en el `toLocaleDateString` o `date-fns` del componente de citas del dashboard — debe usar `'es-CO'` o `'es'`.

**Sugerencias:**
- **QA-005:** Rediseñar el layout del card de estado para mostrar la prioridad como campo inline con su label, no como badge flotante en la esquina.
- **QA-008:** El último card de estadísticas debería ocupar el ancho completo o ajustar a un grid de 3+2 o 5 en línea.
