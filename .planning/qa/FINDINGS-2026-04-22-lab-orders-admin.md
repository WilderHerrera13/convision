---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
started: 2026-04-22T19:00:00
updated: 2026-04-22T19:30:00
roles_tested: [admin]
scope: Flujo Órdenes de Laboratorio (admin) — comparado con 11 frames Figma
figma_file: dHBbcAQTlUSXGKnP6l76OS
figma_nodes:
  - 1981:2693  # Detalle — En proceso
  - 1981:2480  # Detalle — Pendiente
  - 2020:3701  # Lista con filtros activos
  - 1981:2906  # Detalle — Enviado a laboratorio
  - 1465:344   # Detalle — Listo para entregar (con Ítems)
  - 1452:397   # Lista — estado vacío (sin órdenes)
  - 1436:414   # Lista — vista canónica con 5 stat cards
  - 2020:4089  # Lista — sin resultados de filtro
  - 2392:3970  # Alertas por Retraso
  - 1981:3119  # Detalle — Entregado
  - 1981:3332  # Detalle — Cancelado
---

## Resumen ejecutivo

- Pantallas verificadas: 5 (`/admin/laboratory-orders`, `/admin/laboratory-orders/1`, `/admin/laboratory-orders/3`, `/admin/laboratory-orders/new`, `/admin/laboratory-orders/delay-alerts`)
- Hallazgos funcionales confirmados: 5
- Hallazgos UI/diseño confirmados: 1
- Hallazgos de idioma/copy confirmados: 1
- Hipótesis (pendiente evidencia): 1
- Sin incidencias: 14 rutas/features

### Hallazgos funcionales (resumen)

| ID | Severidad | Descripción breve |
|----|-----------|-------------------|
| QA-LAB-ADM-001 | mayor | Status badge `in_progress` sin traducir en lista, detalle y alertas |
| QA-LAB-ADM-002 | mayor | CTA del detalle muestra acción incorrecta cuando status es `in_progress` |
| QA-LAB-ADM-003 | mayor | Stats card "Total" siempre muestra 0 — API no retorna campo `total` |
| QA-LAB-ADM-004 | mayor | Filtro `?overdue=true` retorna órdenes sin `estimated_completion_date` (bug backend) |
| QA-LAB-ADM-005 | mayor | Stats cards de Alertas por Retraso siempre en 0 a pesar de 2 filas en tabla |
| QA-LAB-ADM-006 | menor | Botón "Descargar PDF" siempre deshabilitado (no implementado) |

### Hallazgos UI/diseño y idioma (resumen)

| ID | Severidad | Descripción breve |
|----|-----------|-------------------|
| QA-LAB-ADM-007 | mayor | `LABORATORY_ORDER_STATUS_LABELS` (constante legacy) tiene etiquetas incorrectas en español |
| QA-LAB-ADM-008 | menor | Indicador de días de retraso en rojo ausente en celda `# Orden` de Alertas (hipótesis) |

---

## Hallazgos (FAIL / GAP)

### QA-LAB-ADM-001
- Rol: admin
- URL: http://localhost:4300/admin/laboratory-orders, http://localhost:4300/admin/laboratory-orders/3, http://localhost:4300/admin/laboratory-orders/delay-alerts
- Categoría: idioma + funcional
- Severidad: mayor
- Pasos:
  1. Login como admin
  2. Navegar a `/admin/laboratory-orders`
  3. Observar la columna "Estado" de la fila LAB-0003
  4. Navegar al detalle `/admin/laboratory-orders/3`
  5. Observar el badge "Estado actual"
- Esperado: Badge muestra "En proceso" (texto en español, mapeado desde el status API)
- Observado: Badge muestra `in_progress` (valor raw del API, en inglés)
- Evidencia:
  - Snapshot lista: `cell "in_progress" [ref=e231]: generic [ref=e232]: in_progress`
  - Snapshot detalle: `generic [ref=e294]: in_progress`
  - Código: `LAB_ORDER_STATUS_LABELS` en `constants/laboratoryOrderStatus.ts` solo contiene clave `in_process`, no `in_progress`
  - Fallback en `LaboratoryOrders.tsx:494`: `LAB_ORDER_STATUS_LABELS[row.status] ?? row.status` → devuelve el raw si no existe la clave
  - API backend: `LaboratoryOrderStatusInProcess = "in_process"` (Go domain) — el test data tiene `in_progress` en BD (valor inválido según contrato)
- Causa raíz doble: (a) datos de prueba contaminados con `in_progress` en vez de `in_process`; (b) el mapa de labels admin no tiene alias de fallback para valores desconocidos
- Estado: confirmado

### QA-LAB-ADM-002
- Rol: admin
- URL: http://localhost:4300/admin/laboratory-orders/3
- Categoría: funcional + ux
- Severidad: mayor
- Pasos:
  1. Login como admin
  2. Navegar a `/admin/laboratory-orders/3` (LAB-0003, status DB = `in_progress`)
  3. Observar el panel "Próxima acción"
- Esperado (según Figma 1981:2693 — estado "En proceso"): Panel muestra "Despachar al laboratorio externo" con botón "Registrar envío"
- Observado: Panel muestra "Verificar y enviar a laboratorio" con botón "Enviar a laboratorio" (acción de estado Pendiente)
- Evidencia:
  - Snapshot detalle: `paragraph [ref=e377]: Verificar y enviar a laboratorio`, `button "Enviar a laboratorio"`
  - Código `LaboratoryOrderDetail.tsx:411`: `const config = ACTION_CONFIG[order.status] ?? ACTION_CONFIG['pending']`
  - `ACTION_CONFIG` no tiene clave `in_progress`, fallback a `pending`
- Estado: confirmado

### QA-LAB-ADM-003
- Rol: admin
- URL: http://localhost:4300/admin/laboratory-orders
- Categoría: funcional
- Severidad: mayor
- Pasos:
  1. Login como admin
  2. Navegar a `/admin/laboratory-orders`
  3. Observar las 5 stat cards; comparar con el total de filas en la tabla
- Esperado (Figma 1436:414): Card "Total" muestra la suma de todas las órdenes (2 en entorno de prueba)
- Observado: Card "Total" muestra 0; card "Listos" muestra 1; hay 2 órdenes en la tabla
- Evidencia:
  - Snapshot: `paragraph [ref=e166]: "0"` (Total), `paragraph [ref=e178]: "1"` (Listos)
  - API response: `GET /api/v1/laboratory-orders/stats` → `{"cancelled":0,"in_process":0,...,"ready_for_delivery":1,...}` — **sin campo `total`**
  - Código `LaboratoryOrders.tsx:49`: `{ key: 'total', label: 'Total', value: stats?.total ?? 0 }` — `stats.total` es `undefined` → fallback a 0
  - Backend Go: endpoint `/stats` no incluye suma global en la respuesta
- Estado: confirmado

### QA-LAB-ADM-004
- Rol: admin
- URL: http://localhost:4300/admin/laboratory-orders/delay-alerts (API: GET /api/v1/laboratory-orders?overdue=true)
- Categoría: funcional
- Severidad: mayor
- Pasos:
  1. Login como admin
  2. Navegar a `/admin/laboratory-orders/delay-alerts`
  3. Observar que la tabla muestra 2 filas, ambas con "Entrega estimada" = null
- Esperado: El filtro `?overdue=true` retorna únicamente órdenes con `estimated_completion_date IS NOT NULL AND estimated_completion_date < NOW()`; con datos de prueba (sin fechas estimadas) debería devolver 0 resultados
- Observado: `GET /api/v1/laboratory-orders?overdue=true` retorna 2 órdenes con `estimated_completion_date: null`
- Evidencia:
  - Respuesta API (shell): `id=3 status=in_progress est=None`, `id=1 status=ready_for_delivery est=None`, `total=2`
  - Repositorio Go `laboratory_repository.go:182-186`: el WHERE clause parece correcto pero el COUNT y el Find devuelven filas con `estimated_completion_date = null`; posible bug en construcción de la query GORM
- Estado: confirmado

### QA-LAB-ADM-005
- Rol: admin
- URL: http://localhost:4300/admin/laboratory-orders/delay-alerts
- Categoría: funcional
- Severidad: mayor
- Pasos:
  1. Login como admin
  2. Navegar a `/admin/laboratory-orders/delay-alerts`
  3. Observar stats cards y subtítulo de la tabla
- Esperado: Stats cards "Con retraso" y "Críticos (>5 días)" muestran el número de órdenes atrasadas; debe ser coherente con el total de la tabla
- Observado: Stats muestran 0 / 0 / 0.0 días; tabla dice "2 órdenes superaron la fecha estimada"
- Evidencia:
  - Snapshot: `paragraph [ref=e167]: "0"`, `paragraph [ref=e170]: "0"`, `paragraph [ref=e173]: "0.0"`
  - Snapshot: tabla muestra 2 filas
  - El componente `LaboratoryOrderDelayAlerts.tsx` calcula las stats client-side usando `daysLate(o.estimated_completion_date)` — devuelve 0 si la fecha es null
  - Los datos de prueba no tienen `estimated_completion_date`, por eso los stats = 0 mientras la tabla sí tiene filas (bug QA-LAB-ADM-004 es la causa)
- Estado: confirmado

### QA-LAB-ADM-006
- Rol: admin
- URL: http://localhost:4300/admin/laboratory-orders/1, http://localhost:4300/admin/laboratory-orders/3
- Categoría: funcional + ux
- Severidad: menor
- Pasos:
  1. Navegar al detalle de cualquier orden
  2. Observar el botón "Descargar PDF" en el header
- Esperado (Figma 1465:344, 1981:2480, todos los estados): Botón "Descargar PDF" habilitado y clicable
- Observado: Botón siempre muestra atributo `disabled` — no es clicable en ningún estado
- Evidencia:
  - Snapshot LAB-0001: `button "Descargar PDF" [disabled]`
  - Snapshot LAB-0003: `button "Descargar PDF" [disabled]`
- Estado: confirmado

### QA-LAB-ADM-007
- Rol: specialist (afecta páginas del especialista, detectado en revisión de código)
- URL: /specialist/quality-review (vía `QualityReview.tsx`, `QualityReviewDetail.tsx`)
- Categoría: idioma + copy
- Severidad: mayor
- Descripción: La constante `LABORATORY_ORDER_STATUS_LABELS` en `constants/laboratoryOrderStatus.ts` tiene etiquetas en español incorrectas/incoherentes con el diseño:
  - `ready_for_delivery: 'Aprobado'` → debería ser **'Listo para entregar'**
  - `in_quality: 'En revisión'` → debería ser **'En calidad'**
  - `sent_to_lab: 'Retornado'` → debería ser **'Enviado a laboratorio'**
- Esperado: Etiquetas consistentes con `LAB_ORDER_STATUS_LABELS` (la constante correcta usada en admin) y con el Figma
- Observado: Constante legada con terminología diferente; usada en páginas de especialista (`QualityReview.tsx:63`, `QualityReviewDetail.tsx:38`)
- Evidencia:
  - `constants/laboratoryOrderStatus.ts:1-11`: `LABORATORY_ORDER_STATUS_LABELS` con labels incorrectos
  - `constants/laboratoryOrderStatus.ts:32-42`: `LAB_ORDER_STATUS_LABELS` con labels correctos
  - `QualityReview.tsx:30,63`: importa y usa `LABORATORY_ORDER_STATUS_LABELS` (la incorrecta)
- Estado: confirmado

### QA-LAB-ADM-008
- Rol: admin
- URL: http://localhost:4300/admin/laboratory-orders/delay-alerts
- Categoría: diseño
- Severidad: menor
- Descripción: En la columna `# Orden` de la tabla de Alertas por Retraso, el Figma (2392:3970) muestra bajo el número de orden una línea en rojo con la fecha estimada y los días de retraso (ej: "Est. 10/04/2026 · +10d"). En la implementación esta línea no aparece.
- Esperado (Figma 2392:3970): Celda `# Orden` con dos líneas: número de orden arriba + "Est. DATE · +Nd" en rojo abajo
- Observado: Celda `# Orden` con solo el número de orden (`LAB-0003`, `LAB-0001`), sin indicador de retraso
- Evidencia:
  - Snapshot delay alerts: `cell "LAB-0003" [ref=e217]: generic [ref=e219]: LAB-0003` (sin segunda línea)
  - Código `LaboratoryOrderDelayAlerts.tsx:446`: `{row.estimated_completion_date && (...)}` — el indicador existe pero está condicional a que haya fecha; test data no tiene fechas
- Estado: hipótesis (el código existe pero el test data no lo activa; requiere probar con dato que tenga `estimated_completion_date`)

---

## OK (sin incidencias)

| Rol | Ruta | Notas |
|-----|------|--------|
| admin | /login → /admin/dashboard | Redirección correcta tras login ✓ |
| admin | /admin/laboratory-orders | Carga tabla, filtros, paginación; sin error 4xx/5xx; consola sin errores |
| admin | /admin/laboratory-orders | 5 stat cards (Total, Pendientes, En tránsito, En calidad, Listos) — coincide Figma canónico 1436:414 |
| admin | /admin/laboratory-orders | Columnas: # Orden, Laboratorio, Paciente, Sede, Estado, Prioridad, Acciones — coincide Figma ✓ |
| admin | /admin/laboratory-orders | Status badge "Listo para entregar" (LAB-0001) muestra con color verde correcto ✓ |
| admin | /admin/laboratory-orders | Botón "+ Nueva Orden" presente y funcional ✓ |
| admin | /admin/laboratory-orders | Filtros: Sede, Estado, Prioridad, Laboratorio, Periodo — implementados ✓ |
| admin | /admin/laboratory-orders | Estado vacío "Sin órdenes registradas" con CTA "Crear orden" — implementado ✓ (Figma 1452:397) |
| admin | /admin/laboratory-orders | Estado "No hay resultados" al filtrar sin coincidencias — implementado ✓ (Figma 2020:4089) |
| admin | /admin/laboratory-orders/1 | LAB-0001 (ready_for_delivery): timeline 4 pasos, CTA "Marcar como entregada" — correcto ✓ (Figma 1465:344) |
| admin | /admin/laboratory-orders/1 | Resumen card: Paciente, Laboratorio, Fecha de creación, Sede ✓ |
| admin | /admin/laboratory-orders/1 | Contacto del laboratorio card ✓ |
| admin | /admin/laboratory-orders/1 | Tarjeta info "Trazabilidad completa" ✓ |
| admin | /admin/laboratory-orders/1 | Breadcrumb navegable: Administración / Órdenes de Laboratorio / LAB-0001 ✓ |
| admin | /admin/laboratory-orders/new | Carga el formulario sin errores; campos presentes incluyendo `estimated_completion_date` ✓ |
| admin | /admin/laboratory-orders/delay-alerts | Carga; título "Alertas por Retraso"; "Exportar reporte"; 3 stat cards; tabla — estructura correcta vs Figma 2392:3970 ✓ |
| admin | /admin/laboratory-orders/delay-alerts | Filtro Estado pre-cargado con "Con retraso" ✓ |

---

## Handoff al agente de corrección

Archivos clave afectados:

| ID | Archivo | Cambio sugerido |
|----|---------|-----------------|
| QA-LAB-ADM-001 | `convision-front/src/constants/laboratoryOrderStatus.ts` | Agregar alias `in_progress` en `LAB_ORDER_STATUS_LABELS`, `LAB_ORDER_STATUS_TOKENS` y `LabOrderStatus` type, OR limpiar datos de prueba en BD |
| QA-LAB-ADM-002 | `convision-front/src/pages/admin/LaboratoryOrderDetail.tsx` | Agregar `in_progress` como alias de `in_process` en `ACTION_CONFIG` |
| QA-LAB-ADM-003 | `convision-api-golang/internal/laboratory/service.go` (o handler) | El endpoint `/stats` debe incluir campo `total` sumando todos los estados |
| QA-LAB-ADM-004 | `convision-api-golang/internal/platform/storage/postgres/laboratory_repository.go` | Investigar por qué el filtro `overdue` no excluye registros con `estimated_completion_date IS NULL`; posible bug en chaining de GORM `q.Count()` → `r.withRelations(q).Find()` |
| QA-LAB-ADM-005 | Derivado de QA-LAB-ADM-004 | Se resuelve al fijar QA-LAB-ADM-004; stats calculan correctamente cuando el filtro funcione |
| QA-LAB-ADM-006 | `convision-front/src/pages/admin/LaboratoryOrderDetail.tsx` | Implementar función de descarga PDF o habilitar botón cuando `order.id` existe (pendiente de backend) |
| QA-LAB-ADM-007 | `convision-front/src/constants/laboratoryOrderStatus.ts` | Corregir etiquetas en `LABORATORY_ORDER_STATUS_LABELS`: `ready_for_delivery → 'Listo para entregar'`, `in_quality → 'En calidad'`, `sent_to_lab → 'Enviado a laboratorio'` |
| QA-LAB-ADM-008 | Test data / seed | Crear al menos una orden de prueba con `estimated_completion_date` pasada para validar el indicador rojo |

Recomendación: usar `@convision-qa-gap-fixer` con este archivo + IDs `QA-LAB-ADM-001, QA-LAB-ADM-002, QA-LAB-ADM-003, QA-LAB-ADM-007` como prioridad (mayor severidad y cambio de código puro).
