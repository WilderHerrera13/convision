---
status: complete
app: convision-front
api: convision-api-golang
front_base_url: http://localhost:4300
api_base_url: http://localhost:8001
started: 2026-05-08T17:42:00-05:00
updated: 2026-05-08T17:55:00-05:00
roles_tested: [admin, specialist, receptionist, laboratory]
scope: |
  E2E del flujo de orden de laboratorio + RBAC + movimientos de inventario.
  Continúa el FINDINGS-2026-05-08.md (flujo paciente→venta cerrado por
  GAP-FIX). En este run me apoyé en datos pre-existentes (paciente 39, venta
  VTA-0014, lab order LAB-0003) para mapear el state machine y validar RBAC,
  porque la creación de un E2E nuevo desde cero excedía la sesión.
---

# QA E2E lab-orders + inventory — Convision — 2026-05-08

## Escenario probado

1. Receptionist agenda cita y crea venta con lente + montura.
2. Specialist firma prescripción y luego revisa calidad.
3. Sistema genera orden de laboratorio automáticamente.
4. Laboratory recorre estados de la orden.
5. Specialist hace control de calidad (QA approval / retorno).
6. Admin / RBAC: cada rol con sus permisos correctos.
7. Inventario: confirmar deducción de stock por venta de producto físico.

## Resumen ejecutivo

- **9 hallazgos** registrados en este run (todos sobre el ciclo de la orden de laboratorio + RBAC + inventario). Distribución: **6 confirmados**, **3 hipótesis / pendiente evidencia adicional**.
- **State machine de la orden de laboratorio mapeado**: 10 estados (`pending`, `in_process`, `sent_to_lab`, `in_transit`, `received_from_lab`, `returned_to_lab`, `in_quality`, `quality_approved`, `ready_for_delivery`, `delivered`, `cancelled`, `portfolio`). Hoy **todas** las transiciones se modelan con un único endpoint `POST /api/v1/laboratory-orders/:id/status` sin reglas de transición.
- **Bloqueante de producto:** la pantalla "Revisión de Calidad" del especialista (`/specialist/laboratory-orders/:id`) **no funciona end-to-end**. El POST que dispara “Aprobar calidad” / “Retornar” devuelve 403 porque el rol `specialist` no tiene `laboratory_orders:edit`. La UI ni siquiera muestra toast de error.
- **Bug RBAC inverso:** `receptionist` tiene `laboratory_orders:edit` y puede mover cualquier orden por API a cualquier estado (incluso revertir desde `delivered` → `in_process`). El front oculta el botón pero el back lo permite — pivoteo posible vía curl/manipulación.
- **Diseño frágil:** la asignación de "médico a cargo" de la revisión QA se modela con un *string tag* `[uid:N]` dentro de la columna `notes` del status_history, no con una FK explícita. El front lee y filtra con `LIKE '%[uid:%s]%'`. Cualquier persona puede inyectar el tag en una nota.
- **Inventario:** la venta VTA-0014 (8-mayo 17:13) NO decrementó el inventario de la montura M8836 (producto 32535, `tracks_stock=true`, qty 2 → sigue en 2). La venta es 13 minutos *anterior* al commit `a392a00 fix(QA-E2E-LAB-001): deduct stock when branch has no default warehouse`, así que el bug histórico está confirmado pero el fix no quedó verificado en runtime — hace falta una venta nueva post-fix para validar.

### Pantallas verificadas

| Rol | Ruta | Estado |
|-----|------|--------|
| laboratory | `/laboratory/lab-orders` | OK |
| laboratory | `/laboratory/lab-orders/3` | OK detalle, pero ver QA-LAB-001 |
| laboratory | acción "Ver detalle" / "Editar" en lista | **403** (QA-LAB-001) |
| laboratory | "Nueva Orden" | **403** redirect a `/unauthorized` |
| specialist | `/specialist/laboratory-orders` | OK lista (filtrada por `assigned_uid`) |
| specialist | `/specialist/laboratory-orders/3` | UI carga, pero acciones rotas (QA-LAB-002) |
| receptionist | `/receptionist/lab-orders` | OK lista |
| receptionist | `/receptionist/lab-orders/3` | OK detalle (sin botones de cambio de estado, correcto) |

## Hallazgos (FAIL / GAP)

### QA-LAB-001
- Rol: laboratory
- URL: `http://localhost:4300/laboratory/lab-orders` (botones de acción de cada fila)
- Severidad: mayor
- Pasos:
  1. Login como `laboratory@convision.com` / `password`.
  2. En la tabla de Órdenes de Laboratorio, click en "Ver detalle" o "Editar" de cualquier fila.
- Esperado: navegar al detalle / edición usando una ruta scope `/laboratory/...`.
- Observado: los íconos enrutan a `/admin/laboratory-orders/:id` (ruta admin), por lo que el ProtectedRoute responde **403 / redirect a `/unauthorized`**. El detalle real está disponible en `/laboratory/lab-orders/:id` (escribiéndolo a mano funciona).
- Evidencia: `await page.goto('/laboratory/lab-orders'); click 'Ver detalle' → window.location.href = '/admin/laboratory-orders/3' → '/unauthorized'`. También aplica al click en "Editar". El botón "Nueva Orden" idéntico.
- Estado: confirmado.

### QA-LAB-002
- Rol: specialist
- URL: `http://localhost:4300/specialist/laboratory-orders/3`
- Severidad: **bloqueante**
- Pasos:
  1. Mover una orden a estado `in_quality` con notas `Médico asignado: Specialist Demo [uid:2]` (por algún admin).
  2. Login como `specialist@convision.com`, ir a `/specialist/laboratory-orders/3`.
  3. Llenar "Observaciones del especialista", marcar el checkbox de confirmación, click en "Aprobar calidad" → "Confirmar aprobación".
- Esperado: la orden pasa a `quality_approved` y se redirige a la lista con toast de éxito.
- Observado: `POST /api/v1/laboratory-orders/3/status` devuelve **403 Forbidden**. El handler RBAC requiere `laboratory_orders:edit` y el seed RBAC (`db/migrations/platform/000035_seed_rbac_data.up.sql`) **NO** se lo asigna al rol `specialist` (solo le concede `laboratory_orders:view`). Resultado: el flujo principal del médico está roto. Adicionalmente, el `onError` del `useMutation` debería disparar `toast({ title: 'Error al actualizar el estado' })` pero en pruebas no aparece visiblemente; el modal queda abierto sin feedback.
- Evidencia: respuesta `{"message":"forbidden: insufficient permissions"}`; consola del navegador `Failed to load resource: 403`. Vía API directa con specialist token, mismo 403. Vía admin token, 200.
- Estado: confirmado.

### QA-LAB-003
- Rol: receptionist
- URL: `POST /api/v1/laboratory-orders/:id/status`
- Severidad: mayor (RBAC inverso)
- Pasos:
  1. Tomar el JWT de `receptionist@convision.com`.
  2. `curl -X POST http://localhost:8001/api/v1/laboratory-orders/3/status -H "Authorization: Bearer $RECEP" -d '{"status":"in_process"}'`.
- Esperado: 403 Forbidden — recepción no debería arbitrariamente mover una orden de laboratorio a cualquier estado (especialmente revertir desde un estado terminal como `delivered`).
- Observado: HTTP **200**. Recepción tiene `laboratory_orders:edit` por seed (ver `000035_seed_rbac_data.up.sql`). En el historial real de LAB-0003 hay una transición *delivered → in_process → delivered* hecha por Receptionist Demo + Laboratory Demo, lo cual confirma que la regresión de estados terminales es viable.
- Evidencia: response 200 con la orden y nuevo `status_history` apuntando al user_id=3 (receptionist). En el FINDINGS previo (QA-E2E-LAB-006) ya se diseñó la UI de cambio de estado pero el back no protegió la ruta correctamente.
- Estado: confirmado.

### QA-LAB-004
- Rol: cualquier usuario con `laboratory_orders:edit`
- URL: `POST /api/v1/laboratory-orders/:id/status`
- Severidad: mayor (state machine sin reglas)
- Pasos:
  1. Tomar una orden en estado `delivered`.
  2. Hacer POST status con `{"status":"in_process"}`.
- Esperado: la API debería rechazar la transición (no se puede salir de un estado terminal sin un flujo explícito de reapertura).
- Observado: la transición es aceptada con 200. El binding de `UpdateStatusInput.Status` solo valida `oneof=pending in_process sent_to_lab in_transit received_from_lab returned_to_lab in_quality quality_approved ready_for_delivery delivered cancelled portfolio`, sin validación de **transiciones permitidas** entre estados. Permite saltos arbitrarios como `pending → delivered` o `delivered → pending`, lo cual rompe la trazabilidad y los SLAs.
- Evidencia: ver historial de LAB-0003 con saltos `delivered → in_process → delivered` y nuestro test `delivered → in_process → delivered`. Código en `internal/laboratory/service.go:142`.
- Estado: confirmado.

### QA-LAB-005
- Rol: admin/sistema
- URL: `internal/platform/storage/postgres/laboratory_repository.go:211`
- Severidad: mayor (diseño)
- Pasos:
  1. Ver cómo se asigna a un médico para QA.
  2. Inspeccionar el query del listado QA del especialista.
- Esperado: relación FK `assigned_specialist_user_id` en `laboratory_orders` o tabla puente `laboratory_order_assignments` con índices y referencial integrity.
- Observado: el "asignado" se almacena como un texto `Médico asignado: Specialist Demo [uid:N]` dentro del campo `notes` del `laboratory_order_statuses` con `status='in_quality'`. El listado QA filtra con `notes LIKE '%[uid:N]%'`. Implicaciones:
  - Cualquier nota que contenga la cadena `[uid:N]` reasigna la orden, sin pasar por un endpoint dedicado ni auditoría adicional.
  - Solo el último registro de notas con `in_quality` cuenta — re-asignar a otro médico requiere otra transición a `in_quality` con tag.
  - Imposible mantener integridad referencial; si se elimina un usuario, no hay error y el tag queda huérfano.
  - El front muestra el tag en bruto en la pantalla del recepcionista: "MÉDICO A CARGO DE LA REVISIÓN: Specialist Demo [uid:2]" — leak técnico al usuario.
- Evidencia: snippet del repositorio, snippet del front (`/receptionist/lab-orders/3`).
- Estado: confirmado.

### QA-LAB-006
- Rol: receptionist (toda persona con `laboratory_orders:create`)
- URL: `POST /api/v1/laboratory-orders/:id/status` con notas que contengan `[uid:X]`
- Severidad: mayor (privacy + autorización)
- Pasos:
  1. Como `receptionist@convision.com`, hacer un POST status con notas `Médico asignado: Specialist Demo [uid:2]`.
- Esperado: solo un admin (o un endpoint específico de asignación con doble validación) debería poder asignar el médico responsable de QA.
- Observado: dado que receptionist tiene `laboratory_orders:edit`, puede setear la asignación directamente; el filtrado por `[uid:N]` solo mira la presencia del texto. No existe validación cruzada de que el `uid` corresponda a un usuario activo con rol `specialist`. Combinado con QA-LAB-003, recepción puede sortear el flujo y arrastrar al médico a su cola QA.
- Evidencia: ver QA-LAB-003 + QA-LAB-005.
- Estado: confirmado.

### QA-LAB-007
- Rol: receptionist
- URL: `http://localhost:4300/receptionist/lab-orders/3`
- Severidad: menor (UX/privacy)
- Pasos:
  1. Como receptionist, abrir el detalle de una orden en `in_quality`.
- Esperado: mostrar "Médico a cargo: **Specialist Demo**" sin exponer el id interno.
- Observado: la UI renderiza literal `Specialist Demo [uid:2]` (con el tag interno visible). Es un *information leak* y rompe la lectura natural.
- Evidencia: `document.querySelector('main').innerText` contiene `MÉDICO A CARGO DE LA REVISIÓN\n\nSpecialist Demo [uid:2]\n\nEspecialista asignado`.
- Estado: confirmado.

### QA-LAB-008
- Rol: backend / catálogo
- URL: `GET /api/v1/products` (response shape)
- Severidad: mayor (rompe filtros y descubrimiento)
- Pasos:
  1. `GET /api/v1/products?per_page=10` con cualquier token.
  2. Comparar con `GET /api/v1/products/:id` y con el embed `inventory[*].product`.
- Esperado: campos `tracks_stock`, `product_type`, `category` consistentes en lista y detalle.
- Observado: en el listado y en el detalle, los campos `tracks_stock` y `product_type` **no aparecen** (omitidos del JSON), aunque sí aparecen cuando el producto se anida en una respuesta de `/inventory`. Para el front esto significa que la única forma fiable de saber si un lente/montura tiene inventario físico es consultar `/inventory?product_id=…`. Adicionalmente:
  - El parámetro `per_page` es ignorado (siempre devuelve 15 sin importar el valor).
  - Los filtros `s_f` / `s_v` con `category.slug` no aplican (se obtiene la misma página que sin filtro).
  - La única `category` real en el sistema es `lens` (id=1, slug=lens). Las monturas como product_id 32535 tienen `category_id = null` y el `product_type` no se proyecta en el listado, así que el front depende de heurísticas (ver `SalesCatalog.tsx` en QA-006 del FINDINGS previo).
- Evidencia: respuestas curl, ver `tmp/products.json` durante el run.
- Estado: confirmado.

### QA-LAB-009
- Rol: sistema (sale → inventory)
- URL: `internal/sale/service.go:472` (deductStock)
- Severidad: bloqueante histórico (gap), pendiente verificación post-fix
- Pasos:
  1. Inspeccionar la venta VTA-0014 (created_at 2026-05-08 17:13) que vendió la montura `M8836` (producto 32535, `tracks_stock=true`).
  2. Comparar con `GET /inventory?product_id=32535` (qty actual = 2; updated_at = 2026-05-07 10:50, **antes** de la venta).
- Esperado: la venta de un producto con `tracks_stock=true` debe decrementar `inventory_items.quantity` y registrar un movimiento en kárdex.
- Observado: el inventario quedó intacto. La venta es **anterior** al commit `a392a00` ("fix QA-E2E-LAB-001: deduct stock when branch has no default warehouse"), así que el bug histórico está confirmado pero el fix no se verificó en runtime durante este run. **No** existen endpoints `/inventory-movements` ni `/stock-movements` para auditar movimientos (ambos retornan 404), así que la validación end-to-end requiere consultas SQL directas a la tabla de kárdex que sí escribe el código (`KardexEntry`).
- Evidencia: timestamps y diff de `quantity` arriba; commits `a392a00` y `dfd7f24` posteriores a la venta.
- Estado: hipótesis (gap histórico confirmado; el fix está deployado pero pendiente de smoke test con una venta nueva del flujo E2E).

## OK (sin incidencias)

| Rol | Ruta | Notas |
|-----|------|--------|
| laboratory | `/laboratory/lab-orders/:id` (vía URL directa) | Carga, muestra trazabilidad y "Actualizar Estado" con dropdown 10 estados |
| laboratory | `POST /api/v1/laboratory-orders/:id/status` | 200 con `laboratory_orders:edit` |
| receptionist | `/receptionist/lab-orders` | Lista, KPIs, filtros y detalle (sin botones de mutación, correcto a nivel UI) |
| specialist | `/specialist/laboratory-orders` | Lista filtrada por `assigned_uid` (visualización correcta cuando hay tag) |
| admin (vía API) | `POST /api/v1/laboratory-orders/:id/status` | 200, transiciones libres |

## Datos usados en este run

- Paciente #39: `QA E2E Mayo08 FlujoCompleto` (ya existía).
- Cita #45 (ya existía, completed).
- Venta #14 / VTA-0014 (ya existía): lente seed LEN-005 + montura M8836 (32535).
- Lab order #3 / LAB-0003: paseada por todos los estados como evidencia del state machine. Quedó en `delivered` al final del run (revertida por admin).
- Lab order #2 / LAB-0002: completada en run previo (referencia).

## Handoff al agente de corrección

Recomendado: regla `convision-qa-gap-fixer` con este FINDINGS como fuente.

Comando sugerido:

```
Con @convision-qa-gap-fixer, cerrar QA-LAB-001 / QA-LAB-002 / QA-LAB-003 / QA-LAB-004 / QA-LAB-005 / QA-LAB-007 / QA-LAB-008 usando .planning/qa/FINDINGS-2026-05-08-lab-flow.md como fuente.
```

Prioridad sugerida:

1. **QA-LAB-002** — bloqueante, deja al especialista sin poder cerrar QA. Asignar `laboratory_orders:edit` (o crear `laboratory_orders:qa_approve`) al rol `specialist` en el seed `000035_seed_rbac_data.up.sql`. Adicionalmente, validar que `onError` del `useMutation` ya muestra el toast destructivo en `QualityReviewDetail.tsx`.
2. **QA-LAB-003** — quitar `laboratory_orders:edit` al rol `receptionist` o limitar el endpoint `POST /:id/status` a `laboratory_orders:manage` y dejar a recepción solo en `laboratory_orders:view`. Si la idea es que recepción pueda mover a `delivered` cuando entrega físicamente, hacer un endpoint dedicado `POST /:id/deliver` con permiso restringido a esa transición.
3. **QA-LAB-004** — implementar máquina de estados explícita (un mapa `from -> [allowed_to]`) en `internal/laboratory/service.go` y rechazar saltos inválidos con `domain.ErrValidation`.
4. **QA-LAB-001** — cambiar las rutas de los íconos del listado en el componente reutilizado (probablemente `LaboratoryOrders.tsx` admin) a paths relativos al rol activo, o duplicar el `LabOrdersTable` para laboratory con sus rutas correctas. Idem para "Nueva Orden".
5. **QA-LAB-005 / QA-LAB-006** — introducir columna `assigned_specialist_id INTEGER NULL REFERENCES users(id)` en `laboratory_orders`, dejar de parsear notas con LIKE y exponer un endpoint dedicado `POST /:id/assign` con permiso `laboratory_orders:manage`. Migración + backfill desde el último `[uid:N]`.
6. **QA-LAB-007** — sanitizar el render del nombre del médico asignado para no incluir el `[uid:N]` en el texto visible al usuario.
7. **QA-LAB-008** — proyectar `tracks_stock` y `product_type` en el listado/detalle de productos (Select explícito en `product_repository.go`), respetar `per_page`, y arreglar el filtro `s_f`/`s_v`.
8. **QA-LAB-009** — smoke test: crear una venta E2E nueva (post `a392a00`) con un producto físico de `tracks_stock=true` y verificar que `/inventory?product_id=…` baja en 1 y que existe un movimiento en `kardex_entries`. Si la verificación falla, investigar `findStockSource` para branch sin default_warehouse.

## Notas adicionales para el siguiente run

- El backend Go fue reiniciado al inicio (`APP_ENV=local make run`, port 8001). Frontend Vite ya estaba en 4300.
- Las acciones destructivas se evitaron — todas las transiciones de estado se hicieron sobre LAB-0003 (ya en `delivered`) y se devolvió a `delivered` al final.
- Para validar end-to-end inventario hace falta:
  1. Crear una cita.
  2. Firmar prescripción.
  3. Crear venta con un producto tracks_stock=true (montura, no los lentes seed que tienen tracks_stock=false).
  4. Comparar `GET /inventory?product_id=…` antes/después.
  5. Si hubiera endpoint público para kárdex (no lo hay hoy), revisarlo; mientras tanto, query SQL directa.
