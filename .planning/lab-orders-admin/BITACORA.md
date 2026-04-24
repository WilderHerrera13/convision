# Bitácora — Flujo Completo Órdenes de Laboratorio (Admin)

**Fecha inicio:** 2026-04-22  
**Objetivo:** Implementar 11 frames de Figma para el módulo admin de Órdenes de Laboratorio.  
**Repositorio:** `/Users/wilderherrera/Desktop/convision`  
**Figma file key:** `dHBbcAQTlUSXGKnP6l76OS`

---

## Estado de los Agentes

| Agente | Tarea | Estado |
|--------|-------|--------|
| Agent-1-Backend | Ajustes backend Go | ✅ Completado |
| Agent-2-List | Reescritura LaboratoryOrders.tsx | ✅ Completado |
| Agent-3-Detail | Reescritura LaboratoryOrderDetail.tsx | ✅ Completado |
| Agent-4-Alerts | Nueva página Alertas + rutas | ✅ Completado |

---

## Frames de Figma

| Node ID | Descripción |
|---------|-------------|
| 1436:414 | Lista — estado por defecto (sin filtros) |
| 2020:3701 | Lista — con filtros activos (Estado=Pendiente, Prioridad=Urgente) |
| 1452:397 | Lista vacía — "Sin órdenes registradas" |
| 2020:4089 | Lista vacía — "No hay resultados" (con filtros, sin coincidencias) |
| 1981:2480 | Detalle — Estado Pendiente (etapa 1/5) |
| 1981:2693 | Detalle — Estado En proceso (etapa 2/5) |
| 1981:2906 | Detalle — Estado Enviado a laboratorio (etapa 3/5) |
| 1465:344  | Detalle — Estado Listo para entregar (etapa 4/5) + Items |
| 1981:3119 | Detalle — Estado Entregado (5/5 completadas) |
| 1981:3332 | Detalle — Estado Cancelado |
| 2392:3970 | Alertas por Retraso |

---

## Arquitectura existente

### Backend Go (`convision-api-golang/`)

**Archivos de laboratorio:**
- `internal/domain/laboratory.go` — structs + interfaces
- `internal/laboratory/service.go` — casos de uso
- `internal/platform/storage/postgres/laboratory_repository.go` — repositorio
- `internal/transport/http/v1/handler_laboratory.go` — handlers HTTP
- `internal/transport/http/v1/routes.go` — rutas

**Endpoints existentes:**
```
GET  /api/v1/laboratory-orders/stats
GET  /api/v1/laboratory-orders          (filtros: patient_id, laboratory_id, status, priority)
GET  /api/v1/laboratory-orders/:id
POST /api/v1/laboratory-orders
PUT  /api/v1/laboratory-orders/:id
DELETE /api/v1/laboratory-orders/:id
POST /api/v1/laboratory-orders/:id/status
```

**Statuses del dominio:**
```
pending | in_process | sent_to_lab | in_transit | in_quality | ready_for_delivery | portfolio | delivered | cancelled
```

**Respuesta de detalle de orden (`GET /laboratory-orders/:id`):**
```json
{
  "id": 1,
  "order_number": "LAB-0001",
  "status": "pending",
  "priority": "urgent",
  "estimated_completion_date": "2026-04-20T00:00:00Z",
  "notes": "...",
  "created_at": "2026-04-13T10:24:00Z",
  "sale_id": 5,
  "laboratory": {
    "id": 1,
    "name": "Laboratorio Central",
    "contact_person": "Ing. Diana Acosta",
    "phone": "+57 310 482 7754",
    "email": "contacto@laboratoriocentral.com"
  },
  "patient": { "id": 1, "first_name": "María", "last_name": "Rodríguez S." },
  "created_by_user": { "id": 2, "name": "Carlos Andrade" },
  "status_history": [
    {
      "id": 1,
      "status": "pending",
      "notes": "Orden creada desde venta SALE-2026-0099",
      "created_at": "2026-04-13T10:24:00Z",
      "user": { "id": 2, "name": "Carlos Andrade" }
    }
  ],
  "pdf_token": "abc123"
}
```

**Stats respuesta actual:**
```json
{ "pending": 12, "in_process": 8, "sent_to_lab": 5, "in_transit": 6, "in_quality": 4, "ready_for_delivery": 8, "portfolio": 2, "delivered": 10, "cancelled": 3 }
```
Falta: `total` y `overdue`. El Agent-1-Backend debe agregarlos.

---

## AGENT-1-BACKEND: Ajustes al backend Go

**Archivos a modificar:**
1. `convision-api-golang/internal/transport/http/v1/handler_laboratory.go`
2. `convision-api-golang/internal/platform/storage/postgres/laboratory_repository.go`

### Cambio 1: Búsqueda por número de orden

En `ListLaboratoryOrders` (handler), agregar antes del call a `h.laboratory.ListOrders`:
```go
if v := c.Query("search"); v != "" {
    filters["search"] = v
}
```

En `laboratory_repository.go`, función `List`, después del loop de filters y ANTES del `Count`, agregar:
```go
if v, ok := filters["search"]; ok {
    q = q.Where("laboratory_orders.order_number ILIKE ?", "%"+fmt.Sprint(v)+"%")
}
```

Si `fmt` no está importado, agregar al import block.

### Cambio 2: Filtro overdue

En handler `ListLaboratoryOrders`, agregar:
```go
if v := c.Query("overdue"); v == "true" {
    filters["overdue"] = true
}
```

En repo `List`, DESPUÉS del filtro de `search`:
```go
if _, ok := filters["overdue"]; ok {
    q = q.Where("laboratory_orders.estimated_completion_date IS NOT NULL").
        Where("laboratory_orders.estimated_completion_date < NOW()").
        Where("laboratory_orders.status NOT IN ?", []string{"delivered", "cancelled"})
}
```

### Cambio 3: Stats — agregar total y overdue

En `laboratory_repository.go`, función `Stats()`, ANTES de `return result, nil`:
```go
var totalCount int64
r.db.Model(&domain.LaboratoryOrder{}).Count(&totalCount)
result["total"] = totalCount

var overdueCount int64
r.db.Model(&domain.LaboratoryOrder{}).
    Where("estimated_completion_date IS NOT NULL").
    Where("estimated_completion_date < NOW()").
    Where("status NOT IN ?", []string{"delivered", "cancelled"}).
    Count(&overdueCount)
result["overdue"] = overdueCount
```

### Verificación
```bash
cd /Users/wilderherrera/Desktop/convision/convision-api-golang && make build
```

---

## AGENT-2-LIST: Reescritura de LaboratoryOrders.tsx

**Archivo:** `convision-front/src/pages/admin/LaboratoryOrders.tsx`

### Diseño (basado en Figma frames 1436:414, 2020:3701, 1452:397, 2020:4089)

#### Stats Cards (4 cards en fila)
- **Total** → `stats.total` (texto negro)
- **Pendientes** → `stats.pending` (texto naranja/amber)
- **En Proceso** → `stats.in_process` (texto azul)
- **Listos** → `stats.ready_for_delivery` (texto verde)

Cada card: label arriba (gris pequeño), número grande abajo.

#### Barra de Filtros
Row de selects + button:
1. `Sede` → Select con valor fijo "Todas las sedes" (no funcional, no hay dato en backend)
2. `Estado` → Select multi-opción: Todos | Pendiente | En proceso | Enviado a laboratorio | En tránsito | En calidad | Listo para entregar | Entregado | Cancelado
3. `Prioridad` → Select: Todas | Baja | Normal | Alta | Urgente
4. `Laboratorio` → Select dinámico con labs cargados de la API (`GET /laboratories`)
5. `Período` → Select: Últimos 7 días | Últimos 30 días | Últimos 90 días | Último año
6. Botón `× Limpiar filtros` (solo visible cuando hay filtros activos)

Cuando un filtro tiene valor, el trigger del Select se muestra en color destacado (azul para Estado, naranja para Prioridad, etc.).

#### Sección de tabla
**Header:**
- Título "Órdenes de laboratorio"
- Subtítulo dinámico:
  - Sin filtros: "47 órdenes registradas"
  - Con filtros: "Mostrando 4 de 47 órdenes (2 filtros activos)"
  - Sin resultados: "Sin resultados"
- Input de búsqueda "Buscar por # o paciente..." (alineado a la derecha)

**Columnas de la tabla:**
```
# Orden | Laboratorio | Paciente | Estado | Prioridad | Acciones
```
(No mostrar "Sede" — no hay dato en backend)

**Badges de Estado:**
```typescript
const STATUS_CONFIG = {
  pending:            { label: 'Pendiente',              className: 'bg-amber-100 text-amber-700 border-amber-200' },
  in_process:         { label: 'En proceso',             className: 'bg-blue-100 text-blue-700 border-blue-200' },
  sent_to_lab:        { label: 'Enviado a laboratorio',  className: 'bg-orange-100 text-orange-700 border-orange-200' },
  in_transit:         { label: 'En tránsito',            className: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  in_quality:         { label: 'En calidad',             className: 'bg-purple-100 text-purple-700 border-purple-200' },
  ready_for_delivery: { label: 'Listo para entregar',    className: 'bg-green-100 text-green-700 border-green-200' },
  delivered:          { label: 'Entregado',              className: 'bg-gray-100 text-gray-600 border-gray-200' },
  cancelled:          { label: 'Cancelado',              className: 'bg-red-100 text-red-700 border-red-200' },
  portfolio:          { label: 'Portafolio',             className: 'bg-slate-100 text-slate-600 border-slate-200' },
};
```

**Badges de Prioridad:**
```typescript
const PRIORITY_CONFIG = {
  low:    { label: 'Baja',    className: 'text-gray-500 bg-gray-50 border-gray-200' },
  normal: { label: 'Media',   className: 'text-gray-600 bg-gray-50 border-gray-200' },
  high:   { label: 'Alta',    className: 'bg-orange-100 text-orange-700 border-orange-200' },
  urgent: { label: 'Urgente', className: 'bg-red-100 text-red-700 border-red-200' },
};
```

**Acciones por fila (3 icon buttons):**
- 👁️ `Eye` → navega a `/admin/laboratory-orders/${row.id}`
- ✏️ `Pencil` → navega a `/admin/laboratory-orders/${row.id}/edit` (o abre modal de edición)
- 🗑️ `Trash2` → confirma y llama `laboratoryOrderService.deleteLaboratoryOrder(row.id)`

**Empty State 1 — Sin órdenes (total = 0, sin filtros):**
```
[ícono filtro circular outline centrado]
"Sin órdenes registradas"
"Aún no has registrado órdenes de laboratorio. Empieza creando la primera."
[Botón] "Crear orden" → navega a /admin/laboratory-orders/new
[Link]  "Las órdenes nuevas aparecerán aquí."
```

**Empty State 2 — Sin resultados (filtros aplicados, total = 0):**
```
[ícono filtro circular outline centrado]
"No hay resultados"
"Ninguna orden coincide con los filtros aplicados. Ajusta los filtros o límplalos para ver todos los resultados."
[Botón] "Limpiar filtros" → resetea todos los filtros
[Link]  "Prueba con menos filtros activos."
```

**Paginación:**
```
Mostrando 1-7 de 47 resultados    [←] [1] [2] [3] [...] [5] [→]
```

#### Servicios a importar
```typescript
import { laboratoryOrderService, LaboratoryOrderFilterParams, LaboratoryOrderStats } from '@/services/laboratoryOrderService';
import { laboratoryService } from '@/services/laboratoryService';
```

#### Instrucciones técnicas
- El filtro `search` se pasa directamente como `search: string` (el backend ya lo soporta tras Agent-1)
- Usar `useDebounce` para el campo search
- Usar `Select` + `SelectContent` + `SelectItem` de shadcn para los filtros
- Componente ≤ 200 líneas → extraer `LabOrdersFilters`, `LabOrdersTable`, `LabOrdersStats`
- Sin comentarios en código

---

## AGENT-3-DETAIL: Reescritura de LaboratoryOrderDetail.tsx

**Archivo:** `convision-front/src/pages/admin/LaboratoryOrderDetail.tsx`

### Diseño (basado en Figma frames 1981:2480, 1981:2693, 1981:2906, 1465:344, 1981:3119, 1981:3332)

#### Layout general
- **Sin** usar `PageLayout` — implementar layout propio con topbar + 2 columnas
- Layout: header sticky arriba, luego `flex gap-6` con col-izq (70%) y col-der (30%)
- Padding: `p-6` en el contenedor principal

#### Topbar (breadcrumb + título + botones)
```
[breadcrumb] Administración / Órdenes de Laboratorio / {order.order_number}
[h1] Detalle de Orden {order.order_number}
[botones] [← Volver] [↺ Actualizar estado] [⬇ Descargar PDF]
```

#### Strip de resumen (card horizontal de 4 secciones)
```
| LAB-2026-003                              | ESTADO ACTUAL      | TIEMPO TOTAL              | ENTREGA ESTIMADA        |
| Creada el {fecha} · {hora} · por {nombre} | [badge status]     | {elapsed} desde creación  | {fecha} en {N} días     |
|                                           |                    |                           | [badge prioridad]       |
```

El `elapsed` se calcula con:
```typescript
function formatElapsed(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}
```

#### Columna izquierda

**Card "Seguimiento de la orden"**

Header del card: título + badge "2 de 5 etapas en curso"
Barra de progreso verde: `width: {progressPercent}%`

Los 5 pasos del flujo:
```typescript
const FLOW_STEPS = ['pending', 'in_process', 'sent_to_lab', 'ready_for_delivery', 'delivered'];
```

El progreso se calcula según el status actual:
- Si `cancelled`: barra roja parcial hasta la etapa donde se canceló
- Si `delivered`: barra verde al 100%
- Otros: índice de `FLOW_STEPS.indexOf(status)` / 4 * 100

**Timeline de historial**

Mostrar TODAS las entradas de `order.statusHistory` (más recientes al fondo = orden cronológico de arriba a abajo).

Cada entrada:
```
[ícono] • [badge status] [fecha] · [hora]
         [notes]
         [user.name]                          [tiempo en este estado o "Etapa actual" / "Cancelada aquí"]
```

Íconos del timeline:
- Estatus completado (hay una entrada posterior): ✅ CheckCircle2 verde
- Estatus actual (la última entrada si no es terminal): 🔵 círculo azul animado (ring de carga)
- Estatus cancelado: ❌ XCircle rojo

"Tiempo en este estado": diferencia entre `created_at` de la entrada y `created_at` de la siguiente entrada en el historial. Para la última entrada: `Date.now() - new Date(entry.created_at).getTime()`.

**Card "Ítems de la orden"** (solo si hay `order.order?.items` y status está en `ready_for_delivery` o `delivered`)

```
Ítems de la orden          [badge: N items]
Productos asociados a esta orden de laboratorio

DESCRIPCIÓN | MARCA | MATERIAL | TRATAMIENTO | TIPO
[datos de los lentes]
```

#### Columna derecha

**Card "Próxima Acción" o "Estado Final"**

Lógica por status:
```typescript
const NEXT_ACTION: Record<string, { title: string; desc: string; btnLabel: string; nextStatus?: string }> = {
  pending: {
    title: 'Verificar y enviar a laboratorio',
    desc: 'La orden está pendiente. Confirma datos y envíala al laboratorio para iniciar el proceso.',
    btnLabel: 'Enviar a laboratorio',
    nextStatus: 'in_process',
  },
  in_process: {
    title: 'Despachar al laboratorio externo',
    desc: 'Empaca el producto y entrega la guía al mensajero. Registra el envío cuando salga.',
    btnLabel: 'Registrar envío',
    nextStatus: 'sent_to_lab',
  },
  sent_to_lab: {
    title: 'Esperando producto desde laboratorio',
    desc: 'El laboratorio está fabricando. Marca como listo cuando llegue el producto a la sede.',
    btnLabel: 'Marcar como listo',
    nextStatus: 'ready_for_delivery',
  },
  ready_for_delivery: {
    title: 'Coordinar entrega al paciente',
    desc: 'La orden está lista. Marca como entregada cuando el paciente confirme la recepción.',
    btnLabel: 'Marcar como entregada',
    nextStatus: 'delivered',
  },
  delivered: {
    title: 'Orden entregada al paciente',
    desc: 'La entrega fue confirmada y firmada. No hay acciones pendientes para esta orden.',
    btnLabel: 'Descargar comprobante',
  },
  cancelled: {
    title: 'Orden cancelada',
    desc: 'La orden fue cancelada. Revisa el motivo en el histórico de seguimiento.',
    btnLabel: 'Ver motivo de cancelación',
  },
};
```

Para `delivered`: btnLabel ejecuta `getLaboratoryOrderPdfUrl` y abre en nueva pestaña.
Para `cancelled`: btnLabel hace scroll al timeline.
Para los demás: llama `laboratoryOrderService.updateLaboratoryOrderStatus(id, { status: nextStatus, notes: '' })` → recarga la orden.

Label del header del card: "PRÓXIMA ACCIÓN" para estados activos, "ESTADO FINAL" para `delivered` y `cancelled`.

**Card "Resumen"**
```
Datos generales de la orden
---
Paciente:          {patient.first_name} {patient.last_name}
Laboratorio:       {laboratory.name}
Fecha de creación: {formatDate(created_at)} · {formatTime(created_at)}
Sede:              Sede Principal  ← placeholder fijo
```

**Card "Contacto del laboratorio"**
```
{laboratory.contact_person}
Responsable · {laboratory.name}

Teléfono: {laboratory.phone}     Correo: {laboratory.email}
```

**Card "Trazabilidad completa"** (borde azul, fondo azul muy suave)
```
🔷 Trazabilidad completa
"Cada cambio de estado queda registrado con responsable, fecha y duración. Útil para auditoría y SLA."
```

#### Modal "Actualizar estado"

Triggered por el botón "Actualizar estado" del header.
```
Dialog título: "Actualizar Estado"
Select: Estado → todas las opciones posibles
Textarea: Notas (opcional)
[Cancelar] [Guardar cambios]
```

Al guardar: `laboratoryOrderService.updateLaboratoryOrderStatus(id, { status, notes })` → cerrar modal → recargar orden.

#### Estructura de archivos
Extraer en subcomponentes dentro del mismo directorio o en el mismo archivo si caben ≤200 líneas:
- `OrderTimeline` — el timeline de historial
- `OrderActionPanel` — columna derecha completa
- `OrderSummaryStrip` — el strip de resumen horizontal

#### Servicios
```typescript
import { laboratoryOrderService, LaboratoryOrder } from '@/services/laboratoryOrderService';
import { formatDate, formatDateTime12h } from '@/lib/utils';
```

---

## AGENT-4-ALERTS: Página Alertas por Retraso + Rutas

### Crear: `convision-front/src/pages/admin/LaboratoryOrderDelayAlerts.tsx`

**Header:**
```
Breadcrumb: Administración / Órdenes de Laboratorio
Título: "Alertas por Retraso"
Botón: "Exportar reporte" (outline, deshabilitado por ahora)
```

**Stats Cards (3 cards):**
1. **Con retraso** → `stats.overdue` → número en rojo
2. **Críticos (>5 días)** → calcular client-side de los datos o mostrar "-" inicialmente
3. **Días promedio de retraso** → calcular de las órdenes devueltas o mostrar stats.overdue_avg

Para las cards 2 y 3: cargar las órdenes con `overdue=true` y calcular en el cliente:
```typescript
const critical = orders.filter(o => {
  if (!o.estimated_completion_date) return false;
  const daysLate = Math.floor((Date.now() - new Date(o.estimated_completion_date).getTime()) / 86400000);
  return daysLate > 5;
}).length;

const avgDays = orders.length > 0
  ? (orders.reduce((acc, o) => {
      if (!o.estimated_completion_date) return acc;
      return acc + Math.max(0, Math.floor((Date.now() - new Date(o.estimated_completion_date).getTime()) / 86400000));
    }, 0) / orders.length).toFixed(1)
  : '0';
```

**Filtros:** Misma barra de filtros que LaboratoryOrders (Sede, Estado pre-seleccionado "Con retraso", Prioridad, Lab, Período, Limpiar).

**Tabla:** Mismas columnas que LaboratoryOrders (# Orden, Laboratorio, Paciente, Estado, Prioridad, Acciones).
La diferencia visual: el # Orden muestra en rojo y debajo la fecha estimada con "+Xd" en rojo.

```tsx
// Celda de # Orden para alertas
<div>
  <span className="font-medium text-red-600">{row.order_number}</span>
  {row.estimated_completion_date && (
    <div className="text-xs text-red-500">
      Est. {formatDate(row.estimated_completion_date)} · +{daysLate(row.estimated_completion_date)}d
    </div>
  )}
</div>
```

**Llamada API:**
```typescript
await laboratoryOrderService.getLaboratoryOrders({ overdue: 'true', ...filters, page, per_page })
```

**Agregar `overdue` al tipo en `laboratoryOrderService.ts`:**
```typescript
export interface LaboratoryOrderFilterParams {
  // ...campos existentes...
  overdue?: string;  // 'true' para filtrar órdenes vencidas
}
```

Y en la función `getLaboratoryOrders`, agregar:
```typescript
if (params.overdue === 'true') {
  query.overdue = 'true';
}
```

### Modificar: `convision-front/src/App.tsx`

1. Agregar import al inicio:
```tsx
import LaboratoryOrderDelayAlerts from '@/pages/admin/LaboratoryOrderDelayAlerts';
```

2. En el bloque de rutas del admin, agregar ANTES de `laboratory-orders/:id`:
```tsx
{
  path: "laboratory-orders/delay-alerts",
  element: <LaboratoryOrderDelayAlerts />,
},
```

### Modificar: `convision-front/src/layouts/AdminLayout.tsx`

En la sección `adminNav`, dentro de ADMINISTRACIÓN, verificar que el ítem de Laboratorio esté correcto:
```tsx
{ title: 'Laboratorio', path: '/admin/laboratory-orders', icon: FlaskConical },
```
Si dice "Órdenes de Laboratorio", cambiarlo a "Laboratorio".

NO agregar submenú — la página de alertas será accesible desde un botón/enlace dentro de la página de lista.

Agregar dentro del bloque COMERCIAL una sub-navegación visual si hay espacio, o simplemente dejar la ruta accesible vía URL directa: `/admin/laboratory-orders/delay-alerts`.

---

## Contrato de la API (para todos los agentes)

**Base URL:** `http://localhost:8001/api/v1`

| Endpoint | Descripción |
|----------|-------------|
| `GET /laboratory-orders/stats` | `{ pending, in_process, ..., total, overdue }` |
| `GET /laboratory-orders` | Lista paginada. Params: `status, priority, laboratory_id, search, overdue, page, per_page` |
| `GET /laboratory-orders/:id` | Detalle completo con relaciones |
| `POST /laboratory-orders/:id/status` | Body: `{ status, notes? }` |
| `GET /laboratories` | Lista de laboratorios |

---

## Convenciones del proyecto

- **Sin comentarios** en el código
- **UI en español** (labels, botones, placeholders, toasts)
- **Identificadores en inglés** (funciones, variables, componentes, archivos)
- **Tailwind CSS** para estilos
- **shadcn/ui** (`@/components/ui/*`) para primitivos
- Máximo **200 líneas** por componente — extraer subcomponentes
- **No usar `next/image`** — usar `<img>` o elementos nativos
- `npm run lint` desde `convision-front/` para verificar

---

## Log de cambios

### 2026-04-22
- Bitácora creada con contexto completo
- Análisis de 11 frames Figma realizado
- 4 sub-agentes pendientes de ejecución

#### Agent-2-List — Completado
- `LaboratoryOrders.tsx`: reescrito desde cero con diseño Figma (frames 1436:414, 2020:3701, 1452:397, 2020:4089).
- Estructura: 4 stats cards + barra de filtros (`LabOrdersFilters`) + sección de tabla con búsqueda debounced + paginación + 2 empty states.
- Badges de estado y prioridad implementados con `STATUS_CONFIG` y `PRIORITY_CONFIG` via `cn()`.
- Acciones por fila: Eye (ver detalle), Pencil (editar), Trash2 (confirmar + eliminar via `ConfirmDialog`).
- `laboratoryOrderService.ts`: búsqueda refactorizada para enviar `search` directamente al backend (compatible con cambio de Agent-1).
- `useDebounce` ya existía — no requirió creación.
- Lint: 0 errores en los archivos modificados (error pre-existente en línea 209 del service no relacionado).

#### Agent-3-Detail — Completado
- `LaboratoryOrderDetail.tsx`: reescrito desde cero basado en frames Figma 1981:2480, 1981:2693, 1981:2906, 1465:344, 1981:3119, 1981:3332.
- Estructura: 4 subcomponentes en el mismo archivo (`OrderSummaryStrip`, `OrderTimeline`, `OrderItemsCard`, `OrderActionPanel`) + modal `StatusUpdateModal`.
- Topbar con breadcrumb, título, botones Volver / Actualizar estado / Descargar PDF (condicional).
- Strip horizontal con 4 secciones: número de orden + creador, estado actual, tiempo transcurrido, entrega estimada con prioridad.
- Timeline cronológico con íconos diferenciados (CheckCircle2 verde para completados, círculo azul animado para etapa actual, XCircle rojo para cancelado), tiempo en cada estado y label contextual.
- Card de ítems solo visible en `ready_for_delivery` y `delivered`.
- Panel derecho: card de próxima acción con lógica por estado, card resumen, card contacto laboratorio, card trazabilidad azul.
- Modal de actualización de estado con Select de todos los estados y campo de notas.
- TypeScript: 0 errores (`npx tsc --noEmit` sin salida).

#### Agent-1-Backend — Completado
- `handler_laboratory.go` (`ListLaboratoryOrders`): agregados filtros `search` y `overdue` al map de filters antes de llamar a `h.laboratory.ListOrders`.
- `laboratory_repository.go` (`List`): agregados bloques de filtrado por `search` (ILIKE sobre `order_number`) y `overdue` (fecha estimada vencida, estados activos) después del loop allowlist y antes del `Count`.
- `laboratory_repository.go` (`Stats`): agregados campos `total` (count sin filtros) y `overdue` (órdenes vencidas no entregadas/canceladas) al map de resultado antes del return.
- Build verificado: `make build` exitoso sin errores de compilación.

#### Agent-4-Alerts — Completado
- `laboratoryOrderService.ts`: agregado `overdue?: string` a `LaboratoryOrderFilterParams`; agregado `overdue: number` a `LaboratoryOrderStats`; agregado bloque `if (params.overdue === 'true') { query.overdue = 'true'; }` en `getLaboratoryOrders`.
- `LaboratoryOrderDelayAlerts.tsx`: creado desde cero. Estructura: breadcrumb con link de vuelta + header + botón "Exportar reporte" (outline, disabled) + 3 stats cards (Con retraso desde stats.overdue, Críticos y Días promedio calculados client-side de la página actual) + filtro `DelayAlertsFilters` reutilizable + tabla idéntica a LaboratoryOrders pero con celda `# Orden` en rojo con fecha estimada y días de retraso + paginación + `ConfirmDialog` para eliminar.
- `App.tsx`: agregado import de `LaboratoryOrderDelayAlerts`; agregada ruta `laboratory-orders/delay-alerts` ANTES de `laboratory-orders/:id` y `laboratory-orders/new` para evitar conflicto con segmento dinámico.
- `AdminLayout.tsx`: cambiado título del ítem sidebar de "Órdenes de Laboratorio" a "Laboratorio" (sección COMERCIAL) para coincidir con Figma.
- Lint: 0 errores nuevos introducidos por estos cambios (todos los errores existentes son pre-existentes).

---

## Notas importantes

1. **"Sede"** no existe en el backend actual — no mostrar esa columna en las tablas.

2. El flujo principal en el detalle tiene 5 pasos: `pending → in_process → sent_to_lab → ready_for_delivery → delivered`. Los estados `in_transit`, `in_quality`, `portfolio` son adicionales.

3. El campo `sale_id` contiene la referencia a la venta (para mostrar "SALE-2026-0099" en el historial, viene del `notes` de la entrada de historial).

4. La nota "Orden creada desde venta SALE-2026-0099" viene del campo `notes` de `LaboratoryOrderStatusEntry`, no hay que calcularlo.

5. Tras Agent-1, el stats endpoint devolverá `total` y `overdue`. Antes de que Agent-1 termine, los otros agentes pueden asumir que esos campos existen y manejar el caso `undefined` con fallback a `0`.
