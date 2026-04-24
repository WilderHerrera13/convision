# Bitácora: Flujo Órdenes de Laboratorio — Especialista (Quality Review)

**Fecha inicio:** 2026-04-22  
**Estado global:** ✅ COMPLETO — LISTO PARA QA  
**Archivo de contexto:** `.planning/LAB_ORDERS_SPECIALIST.md`

---

## Objetivo

Implementar el flujo completo de revisión de calidad para el especialista. Las órdenes llegan desde laboratorio con `status=in_quality` y el especialista puede:
- **Aprobar** → cambia status a `ready_for_delivery`
- **Retornar** → cambia status a `sent_to_lab` con notas de defecto

---

## Inventario de Pantallas Figma

Archivo: `dHBbcAQTlUSXGKnP6l76OS`

| Node | Pantalla | Estado en bitácora |
|------|----------|--------------------|
| 1884:1975 | Lista con datos (7 órdenes) | ✅ implementado |
| 2001:3003 | Empty state (sin órdenes) | ✅ implementado |
| 2001:3523 | Lista con filtros aplicados | ✅ implementado |
| 1885:2249 | Detalle — Tab "Datos del lente" | ✅ implementado |
| 2001:3808 | Loading state | ✅ implementado |
| 2001:3722 | Detalle — Validación error | ✅ implementado |
| 2001:3202 | Detalle — Tab "Decisión de calidad" | ✅ implementado |
| 2001:3288 | Modal Confirmar Aprobación | ✅ implementado |
| 1886:2306 | Modal Confirmar Retorno | ✅ implementado |
| 1887:2362 | Lista post-Aprobación (toast verde) | ✅ implementado |
| 2001:3324 | Lista post-Retorno (toast ámbar) | ✅ implementado |

---

## Arquitectura de Implementación

### Rutas

```
/specialist/laboratory-orders        → QualityReview.tsx (lista)
/specialist/laboratory-orders/:id    → QualityReviewDetail.tsx (detalle)
```

### Archivos a crear

1. `convision-front/src/pages/specialist/QualityReview.tsx`
2. `convision-front/src/pages/specialist/QualityReviewDetail.tsx`

### Archivos a modificar

1. `convision-front/src/App.tsx` — agregar rutas specialist lab orders
2. (AdminLayout.tsx ya tiene el nav item — NO modificar)

---

## API Contract

### Listar órdenes

```
GET /api/v1/laboratory-orders?status=in_quality&page=1&per_page=20
Authorization: Bearer <token>

Response: {
  data: LaboratoryOrder[],
  total: number,
  page: number,
  per_page: number
}
```

### Obtener detalle

```
GET /api/v1/laboratory-orders/:id
Authorization: Bearer <token>
```

### Actualizar status (APROBAR)

```
POST /api/v1/laboratory-orders/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{ "status": "ready_for_delivery", "notes": "Lentes aprobados, calidad correcta" }
```

### Actualizar status (RETORNAR)

```
POST /api/v1/laboratory-orders/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{ "status": "sent_to_lab", "notes": "Defecto: rayado en lente derecho" }
```

---

## Tipos TypeScript (de laboratoryOrderService.ts)

```typescript
interface LaboratoryOrder {
  id: number;
  order_number: string;
  order_id: number;
  sale_id: number;
  laboratory_id: number;
  patient_id: number;
  status: string;
  priority: string;
  estimated_completion_date: string;
  completion_date: string;
  notes: string;
  drawer_number: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  laboratory?: { id: number; name: string; };
  patient?: { id: number; first_name: string; last_name: string; };
  created_by_user?: { id: number; name: string; };
  status_history?: StatusHistoryEntry[];
}

interface StatusHistoryEntry {
  id: number;
  laboratory_order_id: number;
  status: string;
  notes: string;
  changed_by: number;
  created_at: string;
  user?: { id: number; name: string; };
}

// Funciones disponibles en laboratoryOrderService.ts:
// getLaboratoryOrders(params: LaboratoryOrderFilterParams): Promise<PaginatedResponse<LaboratoryOrder>>
// getLaboratoryOrder(id: number): Promise<LaboratoryOrder>
// updateLaboratoryOrderStatus(id: number, data: UpdateStatusInput): Promise<LaboratoryOrder>
```

---

## Design System — Especialista

- **Color primario:** `#0f8f64` (verde)
- **Botón primario:** `bg-[#0f8f64] hover:bg-[#0a7050] text-white`
- **Sidebar:** 240px (ya existe en AdminLayout)

### Status Badges

```tsx
// En revisión (in_quality)
<Badge className="bg-[#fff6e3] text-[#b57218]">En revisión</Badge>

// Aprobado (ready_for_delivery)
<Badge className="bg-[#ebf5ef] text-[#228b52]">Aprobado</Badge>

// Retornado (sent_to_lab)
<Badge className="bg-[#ffeeed] text-[#b82626]">Retornado</Badge>
```

---

## Sub-agentes Plan

### Sub-agente 1 — Lista QualityReview.tsx + rutas App.tsx

**Estado:** ✅ COMPLETO

**Tareas:**
1. Leer Figma nodes: `1884:1975`, `2001:3003`, `2001:3523`, `2001:3808`, `1887:2362`, `2001:3324`
2. Crear `convision-front/src/pages/specialist/QualityReview.tsx`
   - Estado loading (skeleton/spinner)
   - Estado empty (sin órdenes en revisión)
   - Estado datos (tabla con columnas: #, Paciente, Laboratorio, Notas, Estado, Acciones)
   - Filtros: búsqueda por texto, filtro por prioridad
   - Paginación
   - Toast de éxito post-aprobación y post-retorno (si viene con queryParam `?action=approved` / `?action=returned`)
3. Agregar rutas en `convision-front/src/App.tsx`

**Archivos a crear/modificar:**
- `convision-front/src/pages/specialist/QualityReview.tsx` (CREAR)
- `convision-front/src/App.tsx` (MODIFICAR — agregar rutas)

**Notas de Figma para la lista:**
- Header: "Revisión de calidad" con subtitle "Gestiona las órdenes de laboratorio que requieren revisión"
- Tabla con columnas: # Orden, Paciente, Laboratorio, Prioridad, Estado, Acciones
- Botón "Ver detalle" en acciones (redirige a `/specialist/laboratory-orders/:id`)
- Empty state: ícono inbox, texto "Sin órdenes pendientes de revisión"
- Loading: spinner centrado
- Filtros: input de búsqueda + select de prioridad (alta/normal/baja)

---

### Sub-agente 2 — Detalle QualityReviewDetail.tsx

**Estado:** ✅ COMPLETO

**Tareas:**
1. Leer Figma nodes: `1885:2249`, `2001:3722`, `2001:3202`
2. Crear `convision-front/src/pages/specialist/QualityReviewDetail.tsx`
   - Tab 1: "Datos del lente" — info de la orden, historial de status
   - Tab 2: "Decisión de calidad" — radio cards (Aprobar/Retornar), checklist validación, notas
   - Estado de error en validación (borders rojos, banner error)
3. **NO crear modales en este agente** — se crean en Sub-agente 3

**Archivos a crear:**
- `convision-front/src/pages/specialist/QualityReviewDetail.tsx` (CREAR)

**Notas de Figma para el detalle:**
- Topbar con botón "Volver" que regresa a `/specialist/laboratory-orders`
- Título: "Orden #[order_number]"
- Badge de status al lado del título
- Tab "Datos del lente": campos Order#, Paciente, Laboratorio, Notas/Producto, Prioridad, Fecha estimada
- Tab "Decisión de calidad": radio cards (verde=Aprobar, rojo=Retornar), campo de notas obligatorio, botón "Confirmar decisión"
- Error state: banner rojo + borders rojos en campos vacíos

---

### Sub-agente 3 — Modales + Integración final

**Estado:** ✅ COMPLETO

**Tareas:**
1. Leer Figma nodes: `2001:3288`, `1886:2306`
2. Integrar modales de confirmación en `QualityReviewDetail.tsx`:
   - Modal Aprobar: fondo verde, checkbox "Notificar al paciente", botón "Confirmar aprobación"
   - Modal Retornar: fondo rojo/danger, input tipo de defecto, textarea observaciones, botón "Confirmar retorno"
3. Wiring completo de API calls con React Query / service
4. Toast post-acción con mensaje apropiado
5. Verificar que rutas en App.tsx estén correctas

---

### Sub-agente 4 — QA y Lint

**Estado:** ✅ COMPLETO

**Tareas:**
1. `npm run lint` en `convision-front/` — sin errores en archivos nuevos ✅
2. TypeScript check (`npx tsc --noEmit`) — sin errores en archivos nuevos ✅
3. Auditoría manual completa del checklist — todo correcto ✅
4. Bitácora marcada como ✅ COMPLETO ✅

---

## Log de Cambios

| Fecha | Sub-agente | Acción | Estado |
|-------|------------|--------|--------|
| 2026-04-22 | Orquestador | Bitácora creada, investigación completada | ✅ |
| 2026-04-22 | Sub-agente 1 | QualityReview.tsx creado + rutas App.tsx actualizadas | ✅ |
| 2026-04-22 | Sub-agente 2 | QualityReviewDetail.tsx creado (tabs Datos/Decisión, validación, TODO modales) + App.tsx actualizado | ✅ |
| 2026-04-22 | Sub-agente 3 | ApproveModal.tsx + ReturnModal.tsx creados; QualityReviewDetail.tsx actualizado con useMutation, estados defectType/notifyPatient, handlers handleApproveConfirm/handleReturnConfirm, modales integrados | ✅ |
| 2026-04-22 | Sub-agente 4 | Auditoría QA completa: lint OK (0 errores en archivos nuevos), TypeScript OK (0 errores en archivos nuevos), checklist de routes/componentes/código validado sin problemas — implementación lista para pruebas | ✅ |

---

## Notas Importantes

1. **Backend 100% listo** — No modificar nada en `convision-api-golang/`
2. **AdminLayout.tsx** ya tiene el nav item en línea 110 — NO modificar
3. **laboratoryOrderService.ts** ya existe con todos los métodos necesarios
4. El status `in_quality` es lo que filtra las órdenes visibles para el especialista
5. RBAC en backend: specialist puede hacer `POST /:id/status` (verificado en routes.go)
6. Usar `useToast` de shadcn para los toasts post-acción
7. Componentes ≤ 200 líneas — extraer sub-componentes si es necesario
8. Todo texto UI en ESPAÑOL
9. Todo código (variables, funciones, tipos) en INGLÉS
10. **Sub-agente 1**: La ruta `/specialist/laboratory-orders/:id` está registrada en App.tsx temporalmente apuntando a `<QualityReview />` como placeholder — Sub-agente 2 debe reemplazarla con `<QualityReviewDetail />`. El import está pre-puesto como comentario TODO en App.tsx línea ~97.
11. **Sub-agente 1**: El toast de `action=approved/returned` usa `actionHandledRef` para evitar doble disparo (el hook `useEffect` con deps `[searchParams, setSearchParams, toast]` se ejecutaría al montar y al cambiar params).

---

## Cómo probar

1. Login como specialist@convision.com / password
2. Ir a "Órdenes de Lab." en el sidebar izquierdo
3. Verificar lista de órdenes con status "En revisión"
4. Click "Ver detalle" en cualquier orden
5. Revisar tab "Datos del lente"
6. Ir a tab "Decisión de calidad"
7. Seleccionar "Aprobar orden" → escribir observaciones → "Confirmar decisión" → verificar modal verde
8. Confirmar aprobación → verificar redirección a lista + toast verde
9. Repetir para "Retornar al laboratorio" → verificar modal rojo con select de defecto
10. Confirmar retorno → verificar redirección a lista + toast ámbar
