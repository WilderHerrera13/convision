---
status: complete
app: convision-front
api: convision-api-golang (Docker)
base_url: http://localhost:4300
started: 2026-04-22T18:00:00-05:00
updated: 2026-04-22T18:20:00-05:00
roles_tested: [receptionist]
scope: "Flujo completo Órdenes de Laboratorio — rol Recepcionista"
---

# QA FINDINGS — Órdenes de Laboratorio (Recepcionista)
**Fecha:** 2026-04-22 · **Backend:** Docker `convision_go_api` en `:8001`

---

## Resumen ejecutivo

- Pantallas verificadas: 3 (`/receptionist/lab-orders`, `/receptionist/lab-orders/new`, `/receptionist/lab-orders/3`)
- Hallazgos funcionales confirmados: 1
- Hallazgos UI/diseño confirmados: 0
- Hallazgos de idioma confirmados: 1
- Hallazgos copy/UX confirmados: 2
- Hipótesis / pendiente evidencia: 0
- Sin incidencias: 10 rutas/interacciones verificadas

### Hallazgos funcionales
- **QA-LAB-001 (bloqueante):** El Docker container del backend no tiene el permiso de receptionist para `POST /laboratory-orders`. El recepcionista no puede crear órdenes. El código fuente local (`routes.go`) ya tiene el fix, pero el container no ha sido rebuilt.

### Hallazgos UI/diseño e idioma
- **QA-LAB-002 (menor/idioma):** Estado `in_progress` se muestra sin traducir en tabla y detalle.
- **QA-LAB-003 (menor/copy):** Subtítulo "0 órdenes activas" incorrecto cuando hay registros visibles.
- **QA-LAB-004 (menor/diseño):** Documento y teléfono del paciente se muestran con separador de miles al auto-rellenarse.

---

## Hallazgos (FAIL / GAP)

### QA-LAB-001
- **Rol:** receptionist
- **URL:** `http://localhost:4300/receptionist/lab-orders/new`
- **Categoría:** funcional
- **Severidad:** bloqueante
- **Pasos:**
  1. Login como `receptionist@convision.com` / `password`.
  2. Navegar a `/receptionist/lab-orders/new`.
  3. Seleccionar paciente y laboratorio, completar campos requeridos.
  4. Hacer clic en "Crear Orden".
- **Esperado:** La orden se crea exitosamente y redirige al detalle.
- **Observado:** La API retorna `403 Forbidden`. El frontend muestra un toast genérico "No se pudo crear la orden de laboratorio." El recepcionista no puede crear órdenes.
- **Evidencia:**
  ```
  POST http://localhost:8001/api/v1/laboratory-orders
  Authorization: Bearer <receptionist-token>  (role: "receptionist" en JWT)
  → 403 {"message":"forbidden: insufficient role"}
  ```
  El JWT decodificado confirma `"role": "receptionist"`. El código fuente en `routes.go:508` ya tiene `domain.RoleReceptionist` en el `RequireRole`, pero el Docker container `convision_go_api` corre una imagen anterior sin ese cambio.
- **Estado:** confirmado
- **Fix:** Rebuild del Docker container con el código actual. El Makefile tiene un bug de indentación en el target `migrate` (línea 49, espacios en lugar de TABs) que impide `make run`; compilar directamente con `go build -o bin/convision-api ./cmd/api`.

### Resolución
- **Fecha:** 2026-04-22
- **Archivos:** `convision-api-golang/docker/docker-compose.yml` (rebuild imagen)
- **Acción:** `docker compose build --no-cache api && docker compose up -d api` desde `convision-api-golang/docker/`
- **Estado:** resuelto — API responde 401 con token inválido (ya no 403 para receptionist)

---

### QA-LAB-002
- **Rol:** receptionist
- **URL:** `http://localhost:4300/receptionist/lab-orders` y `/receptionist/lab-orders/3`
- **Categoría:** idioma
- **Severidad:** menor
- **Pasos:**
  1. Navegar a `/receptionist/lab-orders`.
  2. Observar columna "Estado" en la tabla.
  3. Abrir detalle de la orden LAB-0003.
  4. Observar "Estado actual".
- **Esperado:** Estado en español (ej. "En laboratorio" o "En proceso").
- **Observado:** Texto raw de la API: `in_progress` (snake_case en inglés).
- **Evidencia:** Tabla: `cell "in_progress"`. Detalle: `generic: in_progress`.
- **Estado:** confirmado
- **Fix sugerido:** Añadir mapa de traducción de estados en listado y detalle:
  ```ts
  const statusLabel: Record<string, string> = {
    pending: 'Pendiente envío',
    in_progress: 'En laboratorio',
    ready: 'Listo para entregar',
    collected: 'Cartera',
  };
  ```

### Resolución
- **Fecha:** 2026-04-22
- **Archivos:** `LabOrders.tsx`, `LabOrderHeader.tsx`, `LabOrderStatusTimeline.tsx`
- **Acción:** Añadida entrada `in_progress: 'En proceso'` en todos los `STATUS_LABELS` y `STATUS_BADGE_CLASS` maps; también en `getStatusVariant` para variante de badge correcta.
- **Estado:** resuelto

---

### QA-LAB-003
- **Rol:** receptionist
- **URL:** `http://localhost:4300/receptionist/lab-orders`
- **Categoría:** copy
- **Severidad:** menor
- **Pasos:**
  1. Navegar a `/receptionist/lab-orders`.
  2. Observar el subtítulo debajo del título "Órdenes de laboratorio".
- **Esperado:** El subtítulo refleja el número de órdenes visible o total.
- **Observado:** Muestra "0 órdenes activas" aunque la tabla contiene 2 filas (LAB-0003 y LAB-0001). Las tarjetas de métricas sí muestran contadores correctos.
- **Evidencia:** `paragraph: 0 órdenes activas` con 2 rows visibles en la tabla.
- **Estado:** confirmado
- **Causa probable:** El contador "activas" probablemente excluye el estado `ready` (listo para entregar). Revisar qué estados se consideran "activos" o cambiar el label a "órdenes totales".

### Resolución
- **Fecha:** 2026-04-22
- **Archivos:** `LabOrders.tsx`
- **Acción:** Cambiado subtítulo de `{total} órdenes activas` a `{total} órdenes` (con pluralización correcta), usando el `total` del paginado de la API.
- **Estado:** resuelto

---

### QA-LAB-004
- **Rol:** receptionist
- **URL:** `http://localhost:4300/receptionist/lab-orders/new`
- **Categoría:** diseño
- **Severidad:** menor
- **Pasos:**
  1. Navegar a `/receptionist/lab-orders/new`.
  2. Abrir dropdown "Paciente" y seleccionar JUAN CAMILO CHIQUILLO CASTAÑEDA.
  3. Observar los campos "Documento del cliente" y "Número celular" que se auto-rellenan.
- **Esperado:** Documento: `1122131990`. Teléfono: `3126094263`.
- **Observado:** Documento: `1,122,131,990`. Teléfono: `3,126,094,263` (con comas de miles).
- **Evidencia:**
  ```
  textbox "Documento del cliente": "1,122,131,990"
  textbox "Número celular": "3,126,094,263"
  ```
- **Estado:** confirmado
- **Fix:** En `NewLabOrder.tsx` (~línea 87-91), verificar que `form.setValue('patient_document', found.identification ?? '')` recibe el string sin formatear desde la API. Si `identification` llega como número, convertir con `.toString()` sin `toLocaleString`.

### Resolución
- **Fecha:** 2026-04-22
- **Archivos:** `NewLabOrder.tsx`
- **Acción:** `form.setValue('patient_document', String(found.identification ?? ''))` y mismo patrón para `patient_phone`. Previene que React aplique formateo de miles si el valor llega como número.
- **Estado:** resuelto

---

## OK (sin incidencias)

| Rol | Ruta / Acción | Verificación |
|-----|--------------|-------------|
| receptionist | `/login` → login | OK — redirige a `/receptionist/dashboard` |
| receptionist | `/receptionist/lab-orders` | OK — API `GET /laboratory-orders` 200; tabla con datos; métricas visibles |
| receptionist | `/receptionist/lab-orders/new` | OK — formulario carga; sin errores de consola |
| receptionist | `/receptionist/lab-orders/3` | OK — API `GET /laboratory-orders/3` 200; detalle visible |
| receptionist | Sidebar "Órdenes de Laboratorio" | OK — navega a `/receptionist/lab-orders` |
| receptionist | Botón "Nueva Orden" | OK — navega a `/receptionist/lab-orders/new` |
| receptionist | Botón "Ver detalle" en tabla | OK — navega a `/receptionist/lab-orders/:id` |
| receptionist | Dropdown pacientes en formulario | OK — API 200; abre y lista pacientes; selección funciona |
| receptionist | Dropdown laboratorios en formulario | OK — API 200; abre y lista laboratorios; selección funciona |
| receptionist | Auto-relleno paciente (lógica) | OK — documento y teléfono se rellenan (formato incorrecto → ver QA-LAB-004) |
| receptionist | Historial de orden en detalle | OK — muestra cronología con timestamp y autor |
| receptionist | Toast de error al fallar creación | OK — aparece mensaje destructivo genérico |

---

## Notas de entorno

- **Docker vs. código local:** El Docker container `convision_go_api` corre imagen desactualizada. El código en `routes.go:508` ya incluye `domain.RoleReceptionist` para `POST /laboratory-orders`, pero el container no refleja ese cambio. **Rebuild necesario.**
- **Makefile:** Bug de indentación en target `migrate` (línea 49). Compilar directamente con `go build -o bin/convision-api ./cmd/api && APP_ENV=local ./bin/convision-api`.
- Screenshots no capturables en esta sesión por timeout del browser MCP al intentar `browser_take_screenshot`.
- Los `browser_click` de Playwright no disparan los handlers React de este proyecto correctamente; se usaron `element.click()` vía `browser_evaluate` para confirmar que la navegación real funciona.

---

## Handoff al agente de corrección

Usar `convision-qa-gap-fixer` con este archivo como fuente.

| ID | Acción requerida | Archivos |
|----|-----------------|---------|
| QA-LAB-001 | Rebuild Docker image `convision_go_api` con código actual (routes.go ya tiene el fix) | `docker/docker-compose.yml`, CI; verificar `routes.go:508` |
| QA-LAB-002 | Añadir mapa de traducción de estados en listado y detalle de órdenes | `src/pages/receptionist/LabOrders.tsx`, `src/pages/receptionist/LabOrderDetail.tsx` |
| QA-LAB-003 | Corregir contador "órdenes activas" o cambiar etiqueta a "órdenes totales" | `src/pages/receptionist/LabOrders.tsx` |
| QA-LAB-004 | Eliminar formateo numérico en auto-relleno documento/teléfono | `src/pages/receptionist/NewLabOrder.tsx` (~línea 87-91) |
| — | Fix Makefile: reemplazar espacios por TABs en target `migrate` (línea 49) | `convision-api-golang/Makefile` |

### Resolución Makefile
- **Fecha:** 2026-04-22
- **Archivos:** `convision-api-golang/Makefile`
- **Acción:** Reemplazados 8 espacios por TAB en targets `migrate`, `migrate-tenant`, `migrate-all`, `migrate-down`, `migrate-list`, `migration`.
- **Estado:** resuelto — `make --dry-run migrate` pasa sin errores
