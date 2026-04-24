---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
started: 2026-04-22T17:23:00
updated: 2026-04-22T17:30:00
roles_tested: [specialist]
scope: Flujo de órdenes de laboratorio del especialista (QualityReview)
---

# QA FINDINGS — Órdenes de Lab. Especialista

## Resumen ejecutivo

- Pantallas verificadas: 3 (`/specialist/dashboard`, `/specialist/laboratory-orders`, `/specialist/laboratory-orders/1`)
- Hallazgos confirmados: 3
- Hipótesis / pendiente evidencia: 0
- Sin incidencias (ver sección OK): login, dashboard, UI del detalle, flujo Aprobar + modal, POST de actualización de estado

---

## Hallazgos (FAIL / GAP)

### QA-LAB-001

- **Rol:** specialist
- **URL:** `http://localhost:4300/specialist/laboratory-orders`
- **Severidad:** mayor
- **Pasos:**
  1. Login como `specialist@convision.com`.
  2. Navegar a `/specialist/laboratory-orders`.
  3. Observar la tabla de "Revisión de calidad".
  4. Consultar la API directamente con el mismo filtro.
- **Esperado:** La lista muestra solo órdenes con status `in_quality` (en el dominio Go: `LaboratoryOrderStatusInQuality`).
- **Observado:** La lista devuelve **todas** las órdenes sin filtrar por estado. Con la BD de prueba: LAB-0003 (`in_progress`) y LAB-0001 (`ready_for_delivery` tras la prueba).
- **Causa raíz:** El frontend envía `?s_f=["status"]&s_v=["in_quality"]` (formato JSON-array genérico), pero `ListLaboratoryOrders` en `handler_laboratory.go` lee solo `c.Query("status")` (param directo). El filtro nunca llega al repositorio.
  - Frontend: `convision-front/src/pages/specialist/QualityReview.tsx:127` → `status: 'in_quality'`
  - Backend: `convision-api-golang/internal/transport/http/v1/handler_laboratory.go:141` → `if v := c.Query("status"); v != ""`
  - El helper `parseApiFilters` existe en `handler.go:492` pero no se usa en este endpoint.
- **Evidencia:**
  ```
  GET /api/v1/laboratory-orders?s_f=["status"]&s_v=["in_quality"] → 200 OK
  Payload: [{id:3, status:"in_progress"}, {id:1, status:"ready_for_delivery"}]
  ```
- **Estado:** confirmado
- **Fix sugerido (opción A — mínima):** Que el frontend envíe `?status=in_quality` en lugar del formato `s_f`/`s_v`. Cambiar en `QualityReview.tsx` la construcción del query.
- **Fix sugerido (opción B — consistente):** Hacer que el handler llame a `parseApiFilters` y aplique el mapa de filtros resultante, igual que otros endpoints del backend.

### Resolución (2026-04-22)

- **Estado:** resuelto
- **Enfoque:** Opción A — `getLaboratoryOrders` envía `status`, `priority`, `laboratory_id` y `patient_id` como query params directos (`c.Query` en Go); `s_f`/`s_v` solo si queda filtro por `order_number` (búsqueda).
- **Archivos:** `convision-front/src/services/laboratoryOrderService.ts`

---

### QA-LAB-002

- **Rol:** specialist
- **URL:** `http://localhost:4300/specialist/laboratory-orders`
- **Severidad:** menor
- **Pasos:**
  1. Abrir la lista de "Revisión de calidad".
  2. Observar la columna "Estado" de cada fila.
  3. Abrir el detalle de cualquier orden y observar el badge de estado en el encabezado.
- **Esperado:** El estado mostrado en la lista coincide con el estado mostrado en el detalle.
- **Observado:** La lista muestra **siempre** "En revisión" (hardcoded en `StatusBadge`), mientras que el detalle muestra el label real del status API (ej. "En proceso" para `in_process`).
- **Evidencia:**
  - Lista: `StatusBadge` en `QualityReview.tsx:58` retorna siempre `<Badge>En revisión</Badge>`.
  - Detalle: `QualityReviewDetail.tsx:21` mapea `in_process → "En proceso"`.
  - LAB-0001 con `status: "in_process"` → lista dice "En revisión", detalle dice "En proceso".
- **Estado:** confirmado
- **Fix sugerido:** Usar el mapa de labels de `QualityReviewDetail.tsx` (o uno compartido) en el `StatusBadge` de la lista, pasando el status real de cada orden.

### Resolución (2026-04-22)

- **Estado:** resuelto
- **Archivos:** `convision-front/src/constants/laboratoryOrderStatus.ts`, `convision-front/src/pages/specialist/QualityReview.tsx`, `convision-front/src/pages/specialist/QualityReviewDetail.tsx`

---

### QA-LAB-003

- **Rol:** specialist
- **URL:** `http://localhost:4300/specialist/laboratory-orders/1`
- **Severidad:** menor
- **Pasos:**
  1. Estar en el detalle de una orden (`/specialist/laboratory-orders/:id`).
  2. Observar la red: el componente hace un segundo GET a `/api/v1/laboratory-orders/:id`.
- **Esperado:** Todas las peticiones autenticadas retornan 200.
- **Observado:** Un refetch en segundo plano retorna **401 Unauthorized**. El primer GET retorna 200, el segundo retorna 401.
- **Evidencia:**
  ```
  [GET] /api/v1/laboratory-orders/1 => 200 OK
  [GET] /api/v1/laboratory-orders/1 => 401 Unauthorized
  ```
  Consola: `Failed to load resource: 401 (Unauthorized)`
- **Estado:** confirmado
- **Impacto:** El usuario no es expulsado de la sesión (la acción POST posterior funciona con 200), pero el refetch fallido puede causar que el formulario muestre datos desactualizados o vacíos en algún escenario de carga lenta.
- **Fix sugerido:** Revisar si el interceptor de axios renueva el token antes del segundo fetch, o si hay una condición de carrera entre el `useEffect` y la expiración del token.

### Resolución (2026-04-22)

- **Estado:** resuelto (mitigación)
- **Causa tratada:** Carrera al renovar token — varias peticiones con 401 disparaban varios `POST /auth/refresh` en paralelo; se centralizó la renovación en una sola promesa compartida y los reintentos esperan el mismo `access_token`.
- **Archivos:** `convision-front/src/lib/axios.ts`, `convision-front/src/pages/specialist/QualityReviewDetail.tsx` (`staleTime: 60_000` para reducir refetches redundantes del detalle).

---

## OK (sin incidencias)

| Rol | Ruta | Notas |
|-----|------|--------|
| specialist | `/login` → `/specialist/dashboard` | Login exitoso, redirección correcta |
| specialist | `/specialist/dashboard` | Carga completa: KPIs, agenda del día, accesos rápidos |
| specialist | `/specialist/laboratory-orders` | Página carga, tabla visible, filtro por prioridad funcional |
| specialist | `/specialist/laboratory-orders/1` (tab Datos del lente) | Datos de orden, historial de estados renderizados |
| specialist | `/specialist/laboratory-orders/1` (tab Decisión de calidad) | Botones Aprobar/Retornar, textarea obligatoria, botón deshabilitado hasta selección — comportamiento correcto |
| specialist | Modal "Confirmar aprobación" | Mensaje claro, checkbox "Notificar al paciente" pre-checked, botones Cancelar/Confirmar |
| specialist | `POST /api/v1/laboratory-orders/1/status` | Retorna 200, estado actualizado correctamente a `ready_for_delivery` en base de datos |
| specialist | Navegación "Volver a órdenes" post-confirmación | Redirige correctamente a la lista |

---

## Nota: comportamiento del sidebar

Al hacer clic en "Órdenes de Lab." desde el dashboard, el `navigate()` de React Router se ejecuta pero la herramienta MCP no detecta el cambio de URL. Navegando directamente por URL, la ruta `/specialist/laboratory-orders` carga sin problema. Se trata de un artefacto de automatización (Playwright accessibility-tree click vs DOM click), no un bug de usuario real. **No se registra como hallazgo**.

---

## Handoff al agente de corrección

Invocar `convision-qa-fixer` con este archivo. IDs prioritarios:

| ID | Severidad | Acción |
|----|-----------|--------|
| **QA-LAB-001** | mayor | Fix filtro `s_f`/`s_v` → `status` directo en frontend, o usar `parseApiFilters` en backend |
| **QA-LAB-002** | menor | Usar status real en `StatusBadge` de la lista |
| **QA-LAB-003** | menor | Investigar 401 en refetch del detalle (interceptor/token) |
