# Bitácora: Flujo Órdenes de Laboratorio — Recepcionista

**Fecha inicio:** 2026-04-22  
**Estado general:** ✅ Completado  
**Orquestador:** Claude (claude-sonnet-4-6)

---

## Resumen del flujo (8 frames Figma)

| Frame | Nombre | Ruta frontend |
|---|---|---|
| 1843-1166 | Listado de Órdenes de Laboratorio | `/receptionist/lab-orders` |
| 1919-2668 | Nueva Orden de Laboratorio | `/receptionist/lab-orders/new` |
| 1960-2812 | Detalle de Orden de Laboratorio | `/receptionist/lab-orders/:id` |
| 1844-1551 | Confirmar Envío a Laboratorio | `/receptionist/lab-orders/:id/confirm-shipment` |
| 2390-3962 | Confirmar Recepción del Laboratorio | `/receptionist/lab-orders/:id/confirm-reception` |
| 1845-1632 | Asignar Cajón y Notificar Cliente | `/receptionist/lab-orders/:id/assign-drawer` |
| 1846-1713 | Confirmar Entrega y Pago (Tab Pago) | `/receptionist/lab-orders/:id/confirm-delivery` |
| 1980-2397 | Confirmar Entrega y Pago (Tab Entrega) | (misma ruta, tab 2) |

---

## Status Machine

```
pending → sent_to_lab → in_transit → in_quality → ready_for_delivery → delivered
                                                                      ↘ portfolio
                                              (cualquier estado) → cancelled
```

### Mapeo status → badge

| Status | Label ES | Badge color |
|---|---|---|
| `pending` | Pendiente | amber `#fff6e3 / #b57218` |
| `sent_to_lab` | Enviado a laboratorio | amber |
| `in_transit` | En tránsito | cyan `#e8f4f8 / #0e7490` |
| `in_quality` | En calidad | indigo `#eef2ff / #4338ca` |
| `ready_for_delivery` | Listo para entregar | green `#ebf5ef / #228b52` |
| `portfolio` | Cartera | red `#fff0f0 / #b82626` |
| `delivered` | Entregado | gray/slate |
| `cancelled` | Cancelado | destructive |

---

## Agent 1: Backend ✅ / ❌

**Objetivo:** Modificar backend Go para soportar el flujo de recepcionista.

**Archivos a modificar:**
- `convision-api-golang/internal/domain/laboratory.go`
  - Agregar `in_transit`, `in_quality`, `portfolio` al enum de status
  - Agregar campo `DrawerNumber *string \`json:"drawer_number"\``
- `convision-api-golang/internal/laboratory/service.go`
  - Actualizar validación de status en `UpdateOrderStatusInput`
- `convision-api-golang/internal/transport/http/v1/routes.go`
  - `POST /api/v1/laboratory-orders` → agregar `domain.RoleReceptionist`
  - `POST /api/v1/laboratory-orders/:id/status` → agregar `domain.RoleReceptionist`
- `convision-api-golang/internal/platform/storage/postgres/laboratory_repository.go`
  - Asegurar que `drawer_number` se guarda en updates

**Estado:** ✅ Completado

---

## Agent 2: Frontend — LabOrders (Lista) + NewLabOrder

**Objetivo:** Crear las dos primeras páginas del flujo.

**Archivos a crear:**
- `convision-front/src/pages/receptionist/LabOrders.tsx`
  - 4 metric cards: Total, Pendientes, En proceso, Listos para entregar
  - Tabla: #Orden, Paciente, Laboratorio, Estado (badge), Fecha estimada, Acciones
  - Buscador + filtros por estado
  - Botón "Nueva Orden" → `/receptionist/lab-orders/new`
- `convision-front/src/pages/receptionist/NewLabOrder.tsx`
  - Form sections: Datos del paciente (ClientSearch), Laboratorio (select), Datos de la orden (lente OD/OI, esfera, cilindro, eje, adición, DIP, fecha estimada), Notas
  - Submit → POST /api/v1/laboratory-orders → redirect a detail

**Estado:** ✅ Completado

---

## Agent 3: Frontend — LabOrderDetail + ConfirmShipment

**Objetivo:** Detalle de orden con tracking y formulario de envío.

**Archivos a crear:**
- `convision-front/src/pages/receptionist/LabOrderDetail.tsx`
  - Header: #Orden, badge status, prioridad, fecha estimada, botones de acción contextual
  - Card izquierda: datos del lente (OD/OI specs)
  - Card derecha: sidebar con acciones según status
  - Timeline de historial de status (StatusHistory)
  - PDF download button
- `convision-front/src/pages/receptionist/ConfirmShipment.tsx`
  - Resumen de la orden (readonly)
  - Form: guía de envío, número de guía, empresa mensajería, notas
  - Acción: cambia status a `sent_to_lab`

**Estado:** ✅ Completado

---

## Agent 4: Frontend — ConfirmReception + AssignDrawer

**Objetivo:** Recepción en clínica y asignación de cajón físico.

**Archivos a crear:**
- `convision-front/src/pages/receptionist/ConfirmReception.tsx`
  - Resumen de orden (readonly)
  - Form: fecha recepción, condición del paquete, notas
  - Acción: cambia status a `in_quality` o `ready_for_delivery`
- `convision-front/src/pages/receptionist/AssignDrawer.tsx`
  - Tab 1 "Asignar Cajón": grid 3x4 de 12 cajones (libre/ocupado), select cajón
  - Tab 2 "Notificar Cliente": mensaje WhatsApp/email preview, botón enviar
  - Acción: guarda `drawer_number`, cambia status a `ready_for_delivery`

**Estado:** ✅ Completado

---

## Agent 5: Frontend — ConfirmDelivery

**Objetivo:** Confirmación de entrega y registro de pago.

**Archivos a crear:**
- `convision-front/src/pages/receptionist/ConfirmDelivery.tsx`
  - Tab "Registrar Pago": método pago, monto, comprobante, descuentos aplicados, confirmaciones (checkboxes)
  - Tab "Datos de Entrega": quién recoge (nombre, documento), fecha/hora entrega, observaciones, firma (área)
  - Acción: cambia status a `delivered`

**Estado:** ✅ Completado

---

## Agent 6: Routes Integration

**Objetivo:** Conectar todas las páginas en App.tsx + sidebar.

**Archivos a modificar:**
- `convision-front/src/App.tsx`
  - Agregar 7 rutas bajo `/receptionist/`:
    - `/receptionist/lab-orders` → `<LabOrders />`
    - `/receptionist/lab-orders/new` → `<NewLabOrder />`
    - `/receptionist/lab-orders/:id` → `<LabOrderDetail />`
    - `/receptionist/lab-orders/:id/confirm-shipment` → `<ConfirmShipment />`
    - `/receptionist/lab-orders/:id/confirm-reception` → `<ConfirmReception />`
    - `/receptionist/lab-orders/:id/assign-drawer` → `<AssignDrawer />`
    - `/receptionist/lab-orders/:id/confirm-delivery` → `<ConfirmDelivery />`
- Sidebar recepcionista: verificar si existe ítem "Órdenes de Laboratorio"

**Estado:** ✅ Completado

---

## Convenciones a respetar

- **Color primario recepcionista:** `#8753ef` (purple)
- **Botones primarios:** `bg-[#8753ef] hover:bg-[#7040d6] text-white`
- **Todos los strings UI en español**
- **Todos los identifiers de código en inglés**
- **Componentes ≤ 200 líneas** — extraer hooks/sub-componentes si es necesario
- **API calls** solo a través de `laboratoryOrderService.ts` (ya existe)
- **React Query** para fetching, **React Hook Form + Zod** para forms
- **shadcn/ui** para todos los componentes base (Button, Card, Badge, Table, Input, Select, Tabs, Dialog)
- **EntityTable / DataTable** para tablas — no construir tablas custom

---

## Gap Analysis Figma vs Implementación (2026-04-22)

### LabOrders.tsx — Gaps
- Tarjetas métricas con labels incorrectos: "Total/Pendientes/En proceso/Listos" → deben ser "Pendiente envío/En laboratorio/Listo para entrega/Cartera"
- Tarjetas NO son clickables para filtrar la tabla
- Tabla no tiene columna "Sede"
- Falta subtítulo "Gestione y registre las órdenes de sus clientes"
- Falta nota "Toca una métrica para filtrar la tabla por ese estado"
- Search placeholder incorrecto: debe ser "Buscar por # o paciente..."
- La tabla muestra "# Orden" sin fecha debajo

### NewLabOrder.tsx — Gaps
- Falta sección "Gestión comercial" (Fecha de venta, Orden de pedido, Vendedor, Sede)
- Falta sidebar panel derecho "Sobre esta orden" + "Flujo de estados"
- Falta campos "Código del producto", "Tipo de lente", "Descripción del pedido"
- Layout debe ser 2 columnas: form principal + sidebar derecho
- Botones Cancelar/Crear Orden deben ir en el topbar (PageLayout actions), no al final del form
- Footer: "Campos marcados con * son obligatorios"

### LabOrderDetail.tsx — Gaps
- Header debe mostrar: # Orden grande, badge estado, tiempo en proceso, fecha estimada, prioridad
- Sección "Datos del lente": falta Identificación, Teléfono, Sede destino, Tipo de lente, Material, Graduación
- StatusTimeline usa Table en lugar de visual timeline con dots y badges de colores
- Sidebar debe tener: "Próxima acción" (con texto contextual), botones de acción según status, "Contacto del laboratorio", "Sobre el PDF"
- Múltiples botones de acción en sidebar (no solo uno): ej. "Confirmar entrega y pago", "Notificar cliente nuevamente", "Marcar como cartera"

### ConfirmShipment.tsx — Gaps
- Layout debe ser 2 columnas: form card (izquierda) + sidebar (derecha)
- Falta DatePicker para "Fecha de envío *"
- Falta campo "Sede destino" en resumen
- Sidebar derecho: "Checklist de envío" (3 bullets), "Al confirmar el envío" (info card morado)
- Botones en topbar format (no dentro del form)
- Footer: "Campos marcados con * son obligatorios"

### ConfirmReception.tsx — Gaps
- Layout debe ser 2 columnas: form card (izquierda) + sidebar (derecha)
- Campo "Recibido por *" falta
- Campo "Estado del lente al recibir *" debe ser un select (Recibido conforme, etc.)
- Campo "Guía de retorno / mensajero" falta
- Sidebar: "Checklist de recepción" (4 bullets), "Al confirmar la recepción" info card
- Footer: "Campos marcados con * son obligatorios"

### AssignDrawer / AssignDrawerTab — Gaps
- Resumen debe mostrar: # Orden, Paciente, Laboratorio, "Aprobado por" con badge "Aprobado"
- Grid de 12 cajones (#1 a #12) con estado: Libre/Seleccionado/Ocupada por otra orden
- Leyenda de colores bajo el grid
- Sidebar derecho: "Contacto del cliente" (Nombre, Teléfono, Última llamada), "Próximo paso" info card
- Tab "Notificar Cliente": preview WhatsApp/llamada, botón enviar

### ConfirmDelivery.tsx — Gaps
- Resumen: Cajón asignado visible, Teléfono paciente
- Banner "Saldo pendiente de pago" (amber)
- Tab Pago: Forma de pago select (Efectivo/Transferencia/etc.), Valor recibido, 2 checkboxes de confirmación
- Tab Entrega: Persona que retira (Titular/Otra persona), Tipo documento, Nro documento, Hora entrega, Estado producto, 3 checkboxes "Confirmación y firma", área de firma del cliente
- Sidebar: estado actual badge, cajón, "Registrar entrega y cerrar orden" (verde), info card morado

### Debug logs en servicio
- `laboratoryOrderService.ts` tiene `console.log` debug que deben eliminarse

---

## Log de progreso

| Fecha | Agente | Acción |
|---|---|---|
| 2026-04-22 | Orquestador | Bitácora creada, investigación Figma completada |
| 2026-04-22 | Agent 1: Backend | Nuevos status `in_transit`, `in_quality`, `portfolio` añadidos al dominio y validación; campo `DrawerNumber` añadido a `LaboratoryOrder`; `RoleReceptionist` añadido a POST `/laboratory-orders` y POST `/laboratory-orders/:id/status`; `drawer_number` incluido en Updates del repositorio; build OK |
| 2026-04-22 | Agent 2 | LabOrders.tsx y NewLabOrder.tsx creados; tipos de servicio actualizados |
| 2026-04-22 | Agent 3 | LabOrderDetail.tsx y ConfirmShipment.tsx creados |
| 2026-04-22 | Agent 4 | ConfirmReception.tsx y AssignDrawer.tsx creados |
| 2026-04-22 | Agent 5 | ConfirmDelivery.tsx creado con 2 tabs (pago + entrega) |
| 2026-04-22 | Agent 6 | 7 rutas receptionist/lab-orders añadidas a App.tsx; sidebar actualizado |
| 2026-04-22 | Orquestador | Gap analysis completo — identificadas divergencias visuales en todas las pantallas vs Figma |
| 2026-04-22 | Agente FTC-1 | LabOrders.tsx: métricas clickables con labels Figma, columna Sede, hint text, badges colores custom, search placeholder correcto |
| 2026-04-22 | Agente FTC-2 | NewLabOrder.tsx reescrito 2-columnas + NewLabOrderSidebar.tsx: secciones Gestión comercial/Datos paciente/Datos orden/Detalles, sidebar "Sobre esta orden" + "Flujo de estados", botones en topbar, footer obligatorios |
| 2026-04-22 | Agente FTC-3 | LabOrderDetail.tsx reescrito + LabOrderHeader.tsx + LabOrderStatusTimeline.tsx + LabOrderSidebar.tsx: header con estado/tiempo/prioridad, timeline visual dots, sidebar 3 cards con acciones contextuales por status |
| 2026-04-22 | Agente FTC-4 | ConfirmShipment.tsx + ConfirmReception.tsx reescritos 2-columnas: TabBar, DatePicker, resumen readonly, sidebar checklist + info cards, botones en topbar, footer |
| 2026-04-22 | Agente FTC-5 | AssignDrawerTab.tsx (grid 12 cajones) + NotifyClientTab.tsx + AssignDrawer.tsx (layout 2-col) + DeliveryPaymentTab.tsx + DeliveryInfoTab.tsx + ConfirmDelivery.tsx reescritos |
| 2026-04-22 | Orquestador | Limpieza console.log debug + comentarios JSDoc de laboratoryOrderService.ts; build OK (0 errores); lint OK (0 errores) |
| 2026-04-22 | Orquestador | **LISTO PARA QA** — 8 pantallas del flujo de órdenes de laboratorio alineadas con Figma |
| 2026-04-22 | Agente 2 FTC | NewLabOrder.tsx reescrito con layout 2 columnas; sidebar extraído a NewLabOrderSidebar.tsx; secciones Gestión comercial, Datos del paciente, Datos de la orden y Detalles adicionales; botones en PageLayout actions; tab activo morado; footer obligatorios |
| 2026-04-22 | Agente 1 FTC | LabOrders.tsx reescrito: 4 tarjetas métricas clickables (Pendiente envío/En laboratorio/Listo para entrega/Cartera) con borde #8753ef y fondo #f1edff activo; columna Sede añadida; badges de estado como pills inline con colores custom; # Orden muestra fecha de creación debajo en texto muted; hint text bajo tarjetas; subtítulo en PageLayout; searchPlaceholder "Buscar por # o paciente..."; filtros estado y prioridad conservados |
| 2026-04-22 | Agente 3 FTC | LabOrderDetail.tsx reescrito como orquestador (<200 líneas); extraídos LabOrderHeader.tsx (banner estado/tiempo/entrega/prioridad), LabOrderStatusTimeline.tsx (timeline visual vertical con dots morados/grises y líneas conectoras), LabOrderSidebar.tsx (3 cards: Próxima acción contextual por status, Contacto laboratorio, Sobre el PDF con fondo #f1edff/borde #8753ef); grid Datos del lente con 2 filas de 4 columnas; botones multiestado en sidebar |
| 2026-04-22 | Agente 4 FTC | ConfirmShipment.tsx reescrito: layout 2 columnas, TabBar activo con indicador #8753ef h-[2px], sección Resumen readonly, DatePicker Fecha de envío *, Input Guía/número, Textarea Observaciones, sidebar Checklist 3 bullets + card info #f1edff, botones en PageLayout actions via form="shipment-form"; ConfirmReception.tsx reescrito: layout 2 columnas, TabBar activo, DatePicker Fecha de recepción * + Input Recibido por * (default=user.name), Select Estado del lente, Input Guía retorno, Textarea Observaciones, sidebar Checklist 4 bullets + card info, status→in_quality |
| 2026-04-22 | Agente 5 FTC | AssignDrawerTab.tsx reescrito: grid 6×2 (12 cajones), cada cajón muestra estado Libre/Seleccionado/Ocupado, leyenda bajo grid; resumen lente + badge Aprobado verde; carga allOrders para mapa ocupación; NotifyClientTab.tsx reescrito: datos paciente, textarea editable con mensaje pre-llenado, botón Enviar mensaje outline morado (solo UI); AssignDrawer.tsx reescrito: layout 2 columnas, sidebar 272px con cards Contacto+Próximo paso, topbar Cancelar+Marcar como Listo; ConfirmDelivery.tsx reescrito: extraído DeliveryPaymentTab.tsx (resumen orden, banner amber saldo, forma pago, valor, 2 checkboxes) y DeliveryInfoTab.tsx (persona retira, tipo doc, nro doc, datetime entrega, condición producto, 3 checkboxes, área firma), layout 2 columnas sidebar, submit→delivered→navega /receptionist/lab-orders |
