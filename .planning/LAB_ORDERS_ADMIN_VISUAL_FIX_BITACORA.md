# Bitácora: Fix Visual Admin Laboratory Orders Flow
**Fecha:** 2026-04-22  
**Estado:** EN PROGRESO  
**Tarea:** Ajustar vistas ya creadas para que coincidan pixel-perfect con el diseño de Figma

---

## Figma Frames (fileKey: dHBbcAQTlUSXGKnP6l76OS)

| Frame | Node ID | Descripción |
|-------|---------|-------------|
| Lista principal | 1981-2693 | LaboratoryOrders - tabla principal |
| Lista filtros | 1981-2480 | LaboratoryOrders - barra de filtros |
| Delay Alerts | 2020-3701 | LaboratoryOrderDelayAlerts |
| Detalle header | 1981-2906 | LaboratoryOrderDetail - header |
| Detalle tracking | 1465-344 | LaboratoryOrderDetail - tracking card |
| Detalle sidebar | 1452-397 | LaboratoryOrderDetail - sidebar cards |
| Detalle items | 1436-414 | LaboratoryOrderDetail - items card |
| Stats cards | 2020-4089 | Stats cards layout |
| Delay stats | 2392-3970 | Delay alert stats cards |
| Detalle estados | 1981-3119 | Detail estados/timeline |
| Detalle completo | 1981-3332 | Detail completo |

---

## Design Tokens Extraídos del Figma

### Stats Cards (LaboratoryOrders)
- Total: valor color `#0f0f12`
- Pendientes: valor color `#b57218`, badge bg `#fff6e3`
- En tránsito: valor color `#0e7490`, badge bg `#e8f4f8`
- En calidad: valor color `#4338ca`, badge bg `#eef2ff`
- Listos: valor color `#228b52`, badge bg `#e5f6ef`

### Stats Cards (DelayAlerts) — 3 tarjetas grandes (350px aprox)
- Con retraso: valor `#b82626`, label negro
- Críticos >5d: valor `#b82626`, label negro  
- Días promedio: valor `#b57218`, label negro

### Status Badges
```
pending        → bg:#fff6e3  text:#b57218
in_process     → bg:#eff1ff  text:#3a71f7
sent_to_lab    → bg:#fff6e3  text:#b57218
in_transit     → bg:#e8f4f8  text:#0e7490
in_quality     → bg:#eef2ff  text:#4338ca
ready_for_delivery → bg:#e5f6ef  text:#228b52
delivered      → bg:#ebf5ef  text:#228b52
cancelled      → bg:#ffeeed  text:#b82626
portfolio      → bg:#f1f2f6  text:#5d5d67
```

### Priority Badges
```
urgente → bg:#ffeeed  text:#b82626
alta    → bg:#fff6e3  text:#b57218
media   → bg:#f1f2f6  text:#5d5d67
baja    → bg:#f1f2f6  text:#5d5d67
```

### LaboratoryOrderDetail Colors
- Progress bar fill: `#0f8f64`
- Timeline completed: green check circle (`#0f8f64`)
- Timeline current: pulsing green indicator
- Timeline pending: gray empty circle
- Current step highlight: bg `#f7fcf9`, border `#cfeddf`
- Duration badge completed: bg `#f5f5f6`
- Duration badge current: bg `white`, border `#cfeddf`, green clock icon
- Tip card: bg `#eff1ff`, border `#3a71f7`, blue diamond icon, blue text
- Items card background: white, border gray

---

## Archivos a Modificar

### Agent 1: LaboratoryOrders.tsx
**Archivo:** `convision-front/src/pages/admin/LaboratoryOrders.tsx`

**Cambios requeridos:**
1. **5 Stats Cards** (no 4): Total | Pendientes | En tránsito | En calidad | Listos
   - Cada card: ícono a la derecha, número grande, label debajo
   - Colors per tokens arriba
2. **Columna "Sede"** en tabla: entre "Paciente" y "Estado", ~116px
3. **Filtros adicionales**: "Sede" (200px) + "Periodo" (200px) en FilterBar
4. **Todos los badges** de estado y prioridad con colores exactos del Figma
5. **Filtros con 2 líneas**: label arriba pequeño, valor seleccionado debajo

### Agent 2: LaboratoryOrderDetail.tsx
**Archivo:** `convision-front/src/pages/admin/LaboratoryOrderDetail.tsx`

**Cambios requeridos:**
1. **TrackingHeader**: tarjeta blanca redondeada con 4 secciones divididas por líneas verticales
   - Sección 1: N° Orden + estado badge + prioridad badge
   - Sección 2: Paciente con avatar gris
   - Sección 3: Especialista con avatar
   - Sección 4: Fecha ingreso + fecha entrega estimada
2. **Layout**: 2 columnas — izquierda 760px (tracking) + derecha 368px (sidebar)
3. **Sidebar derecha** (4 cards):
   - Próxima Acción: 168px, cambia según estado
   - Resumen: 244px, incluye campo Sede
   - Contacto: 168px
   - Tip: 96px, bg `#eff1ff`, border `#3a71f7`, texto azul
4. **Progress bar**: fill verde `#0f8f64`
5. **Timeline**: completados=círculo verde con check, actual=pulsando, pendiente=círculo gris
   - Paso actual resaltado: bg `#f7fcf9`, border `#cfeddf`
6. **Items card**: aparece en estados ready_for_delivery/delivered/cancelled

### Agent 3: LaboratoryOrderDelayAlerts.tsx
**Archivo:** `convision-front/src/pages/admin/LaboratoryOrderDelayAlerts.tsx`

**Cambios requeridos:**
1. **3 Stats cards anchas** (~350px): Con retraso (rojo), Críticos >5d (rojo), Días promedio (naranja)
2. **Topbar**: título "Alertas por Retraso", botón "Exportar reporte" (no "Nueva Orden")
3. **Filas de tabla**: bg pinkish `#fffbfb`
4. **Columna # Orden**: 2da línea en rojo `#b82626`: "Est. DATE · +Nd" 
5. **Columna Sede**: igual que la lista principal

---

## Estado de los Agentes

| Agente | Archivo | Estado | Notas |
|--------|---------|--------|-------|
| Agent 1 | LaboratoryOrders.tsx | ✅ COMPLETADO | 5 stats cards (Total/Pendientes/En tránsito/En calidad/Listas) con colores Figma, columna Sede en tabla, filtros Sede+Periodo con formato 2 líneas, badges inline con colores exactos |
| Agent 2 | LaboratoryOrderDetail.tsx | ✅ COMPLETADO | TrackingHeader reemplazado por tarjeta blanca con 4 secciones (N°Orden+badges, Paciente avatar, Especialista avatar, Fechas); ProgressBarCard verde #0f8f64; TimelineCard con pasos completados (check verde), actual (ring pulsante #0f8f64 + bg #f7fcf9 border #cfeddf), pendientes (círculo gris); Sidebar 368px con NextActionCard (botón azul contextual), SummaryCard, ContactCard, TipCard (#eff1ff border #3a71f7 diamond ◆); ItemsCard condicional para ready_for_delivery/delivered/cancelled; layout flex-1 + w-[368px] shrink-0 |
| Agent 3 | LaboratoryOrderDelayAlerts.tsx | ✅ COMPLETADO | 3 stats cards anchas (flex-1) con colores Figma (#b82626 retraso/críticos, #b57218 promedio), filas tabla bg #fffbfb, columna # Orden con 2da línea rojo "Est. DATE · +Nd", columna Sede añadida, badges estado y prioridad con inline styles exactos del Figma, botón "Exportar reporte" con ícono Download, tabla sin usar shadcn Table (layout flex para control pixel-perfect) |

---

## Notas de Implementación

- **No romper funcionalidad existente**: solo cambios visuales + agregar columna Sede
- **TypeScript**: no introducir errores de tipo
- **Backend**: campo `sede` puede no existir aún en el tipo `LaboratoryOrder`, usar `order.sede ?? 'N/A'` como fallback
- **Usar /ftc en sub-agentes**: cada agente debe leer el contexto del Figma antes de implementar
- El archivo `laboratoryOrderService.ts` NO necesita cambios (ya está completo)
- Las rutas en `App.tsx` y `routes.go` NO necesitan cambios
