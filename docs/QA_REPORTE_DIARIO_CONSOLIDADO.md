# QA — Reporte Diario: Consolidado Admin, Auditoría y Registro Rápido

**Sprint:** Daily Report v2  
**Fecha:** 2026-05-04  
**URL local:** `http://localhost:4300`  
**Credenciales:**

| Rol | Email | Contraseña |
|---|---|---|
| Admin | admin@convision.com | password |
| Recepcionista | receptionist@convision.com | password |

---

## TC-1 · Vista Consolidada Admin (`/admin/daily-reports` → pestaña "Consolidado")

### 1.1 Carga y estado inicial

**TC-1.1 — Carga automática sin acción del usuario**
- Precondición: existen reportes del día actual
- Pasos: iniciar sesión como admin → navegar a `/admin/daily-reports` → clic en pestaña "Consolidado"
- Esperado: los datos cargan automáticamente con Sede = "Todas", Asesor = "Todos", rango = hoy. No se requiere ninguna acción adicional

**TC-1.2 — Contador de reportes**
- Pasos: verificar el texto junto a los filtros
- Esperado: muestra texto tipo "3 reportes consolidados" que refleja exactamente cuántos reportes coinciden con los filtros activos

**TC-1.3 — KPI cards visibles**
- Esperado: aparecen 4 tarjetas: Atenciones del día, Operaciones totales, Interacciones redes, Bonos entregados. Sus valores son la suma de los reportes del filtro

**TC-1.4 — Sección Recepciones de dinero**
- Precondición: al menos un reporte del rango tiene recepciones registradas
- Esperado: la sección "Recepciones de dinero" aparece con los montos sumados correctamente

**TC-1.5 — Sin reportes: estado vacío**
- Pasos: seleccionar rango de fechas futuro sin reportes
- Esperado: se muestra estado vacío ("Sin reportes"). No hay error de consola ni sección en blanco

---

### 1.2 Pestaña "Reportes por asesor"

**TC-1.6 — Tabla paginada independiente**
- Pasos: clic en pestaña "Reportes por asesor"
- Esperado: aparece tabla con sus propios filtros de sede, asesor y rango. Los filtros no están ligados a los del consolidado

**TC-1.7 — Click en fila navega al detalle**
- Pasos: clic en cualquier fila de la tabla
- Esperado: navega a `/admin/daily-reports/:id` con el detalle del reporte

---

## TC-2 · Filtros Consolidado: Sede · Asesor · Rango de fechas

### 2.1 Filtro por Sede

**TC-2.1 — Seleccionar una sede específica**
- Pasos: cambiar el selector de sede a una sede concreta
- Esperado: el consolidado muestra solo datos de asesores de esa sede; el selector de asesor se resetea a "Todos"

**TC-2.2 — Dropdown de asesores se filtra por sede**
- Pasos: seleccionar una sede
- Esperado: el dropdown de asesores lista únicamente los asesores de esa sede, no los de otras

**TC-2.3 — Volver a "Todas las sedes"**
- Pasos: con una sede seleccionada, volver a "Todas"
- Esperado: el dropdown de asesores muestra todos los asesores; datos se recalculan con todos los reportes

**TC-2.4 — Sede sin reportes en el rango**
- Pasos: seleccionar una sede que no tiene reportes en el rango activo
- Esperado: estado vacío ("Sin reportes"), sin error

**TC-2.5 — Clínica con una sola sede**
- Pasos: acceder con cuenta que tiene una única sede configurada
- Esperado: selector de sede es de solo lectura o muestra la sede fija; el filtro aplica automáticamente

---

### 2.2 Filtro por Asesor

**TC-2.6 — Seleccionar asesor específico**
- Pasos: (Sede = "Todas") elegir un asesor del dropdown
- Esperado: el consolidado muestra únicamente los reportes de ese asesor; métricas = sus datos individuales

**TC-2.7 — Asesor se resetea al cambiar sede**
- Pasos: seleccionar asesor "Juan" de "Sede Norte" → cambiar sede a "Sede Sur"
- Esperado: el selector de asesor vuelve a "Todos" automáticamente

**TC-2.8 — Asesor sin reportes en el rango**
- Pasos: seleccionar asesor que no reportó en el rango activo
- Esperado: estado vacío, sin errores ni crash

---

### 2.3 Filtro por Rango de fechas

**TC-2.9 — Preset "Hoy"**
- Pasos: clic en preset "Hoy"
- Esperado: dateFrom = dateTo = fecha actual; datos se recargan con reportes del día

**TC-2.10 — Preset "Esta semana"**
- Pasos: clic en preset "Esta semana"
- Esperado: rango cubre la semana actual; el consolidado suma todos los reportes del rango

**TC-2.11 — Rango personalizado**
- Pasos: seleccionar dateFrom = mayo 1, dateTo = mayo 7
- Esperado: el consolidado suma todos los reportes de ese rango para los filtros de sede/asesor activos

**TC-2.12 — Rango de un solo día pasado**
- Pasos: dateFrom = dateTo = mayo 1
- Esperado: muestra solo los reportes del 1 de mayo; métricas correctas para ese día

**TC-2.13 — Rango sin reportes**
- Pasos: seleccionar fechas futuras (ej. diciembre 2030)
- Esperado: estado vacío, sin error

---

### 2.4 Combinaciones de filtros

**TC-2.14 — Sede + Asesor + Rango**
- Pasos: Sede = "Sede Norte", Asesor = "Juan", rango = mayo 1–7
- Esperado: muestra solo los reportes de Juan en Sede Norte entre mayo 1 y 7; suma correcta

**TC-2.15 — Todas las sedes + Todos los asesores + Rango**
- Pasos: Sede = "Todas", Asesor = "Todos", rango = esta semana
- Esperado: suma absolutamente todos los reportes de todas las sedes de la semana

**TC-2.16 — Verificación cruzada con pestaña "Reportes por asesor"**
- Pasos: en "Consolidado" filtrar Sede Norte + mayo 1–7; anotar N reportes del contador. Ir a "Reportes por asesor" y aplicar los mismos filtros
- Esperado: la tabla lista exactamente N reportes; la suma manual de sus campos coincide con las métricas del consolidado

**TC-2.17 — Cambio de filtro dispara nueva petición**
- Pasos: abrir DevTools → Network → cambiar cualquier filtro
- Esperado: se lanza una nueva petición GET con los parámetros actualizados

---

## TC-3 · Historial de cambios en detalle de reporte (`/admin/daily-reports/:id`)

**TC-3.1 — Registro al crear**
- Pasos: receptionist crea un nuevo reporte diario → admin abre el detalle
- Esperado: historial muestra "Reporte creado" con el nombre del asesor y timestamp correcto

**TC-3.2 — Registro al editar**
- Pasos: admin edita un campo del reporte y guarda
- Esperado: nueva entrada "Reporte editado" aparece en el historial con el nombre del admin

**TC-3.3 — Registro al cerrar**
- Pasos: asesor cierra su reporte → admin abre el detalle
- Esperado: entrada "Reporte cerrado" con nombre del asesor y hora

**TC-3.4 — Registro al reabrir**
- Pasos: admin reabre el reporte
- Esperado: entrada "Reporte reabierto" con nombre del admin y hora

**TC-3.5 — Orden cronológico**
- Pasos: realizar crear → editar → cerrar → reabrir en secuencia
- Esperado: el historial muestra las 4 entradas en orden cronológico ascendente

**TC-3.6 — Historial solo visible para admin**
- Pasos: iniciar sesión como receptionist → navegar al historial de su reporte (`/receptionist/daily-report-history/:id`)
- Esperado: la sección "Historial de cambios" NO aparece

**TC-3.7 — Reporte sin historial (reporte antiguo)**
- Pasos: abrir detalle de un reporte creado antes de esta funcionalidad
- Esperado: la sección de historial no se renderiza; no aparece vacía ni con error

---

## TC-4 · Admin edita reporte de un asesor (trazabilidad admin → receptionist)

**TC-4.1 — Admin puede editar reporte de cualquier asesor**
- Precondición: existe reporte pendiente de un asesor
- Pasos: admin abre `/admin/daily-reports/:id` → modifica un campo → guarda
- Esperado: los cambios se guardan; el reporte sigue perteneciendo al asesor original

**TC-4.2 — Admin puede editar reporte cerrado**
- Pasos: admin abre un reporte con estado "Cerrado" → edita un campo → guarda
- Esperado: el reporte se actualiza (admin no está bloqueado por el estado cerrado)

**TC-4.3 — Audit trail registra al admin como editor**
- Pasos: admin edita el reporte → ver "Historial de cambios"
- Esperado: entrada "Reporte editado" muestra el **nombre del admin**, no del asesor dueño

**TC-4.4 — Reabrir + editar: trazabilidad completa**
- Pasos: admin reabre un reporte cerrado → edita campos → cierra
- Esperado: historial muestra en orden: "Reporte reabierto", "Reporte editado", "Reporte cerrado", todas con el nombre del admin

**TC-4.5 — El asesor ve su reporte actualizado**
- Pasos: admin edita el reporte → asesor inicia sesión y navega a su historial
- Esperado: el asesor ve los valores actualizados; **no ve** el historial de cambios

**TC-4.6 — Receptionist no puede editar reporte cerrado**
- Pasos: receptionist abre su reporte con estado "Cerrado"
- Esperado: formulario en modo solo lectura; no hay botón de guardar activo

**TC-4.7 — Intento de editar reporte ajeno como receptionist (API)**
- Pasos: receptionist hace PUT al ID de un reporte de otro asesor (via Postman o curl con JWT de receptionist)
- Esperado: API retorna `403 Forbidden`

---

## TC-5 · Registro rápido de atención con fecha seleccionada

**TC-5.1 — Header del registro rápido muestra la fecha seleccionada**
- Pasos: en `/receptionist/daily-report` seleccionar "Mayo 1" en el date picker → clic en "Registro rápido de atención"
- Esperado: el header del modal/página muestra "Mayo 1" (no la fecha de hoy)

**TC-5.2 — Guardar en reporte de fecha pasada existente**
- Precondición: existe reporte del 1 de mayo para el asesor
- Pasos: seleccionar mayo 1 → guardar registro rápido
- Esperado: el campo se agrega al reporte del 1 de mayo; el reporte de hoy no se modifica

**TC-5.3 — Crear reporte nuevo en fecha sin reporte**
- Precondición: no existe reporte del 1 de mayo para el asesor
- Pasos: seleccionar mayo 1 → guardar registro rápido
- Esperado: se crea un nuevo reporte con fecha mayo 1; el campo queda registrado en ese reporte

**TC-5.4 — Registro rápido desde la fecha de hoy**
- Pasos: mantener fecha en "hoy" → usar registro rápido normalmente
- Esperado: funciona igual que antes, el registro queda en el reporte de hoy. Sin regresiones

**TC-5.5 — Toast de confirmación menciona la fecha correcta**
- Pasos: guardar registro rápido con fecha pasada seleccionada
- Esperado: el toast dice "Se actualizó el reporte del 2026-05-01" (o similar con la fecha seleccionada)

**TC-5.6 — Verificación cruzada: el campo aparece en el reporte correcto**
- Pasos: registrar "bonos_entregados" vía registro rápido para mayo 1 → seleccionar mayo 1 en el reporte diario
- Esperado: el campo "Bonos entregados" tiene el valor incrementado en el reporte del 1 de mayo

---

## TC-6 · Eliminación del banner de advertencia

**TC-6.1 — Banner NO aparece al seleccionar fecha pasada**
- Pasos: como receptionist, seleccionar cualquier fecha pasada en el date picker del reporte diario
- Esperado: **no aparece** el banner amarillo que antes decía "El Registro rápido de atención siempre registra para el día de hoy"

**TC-6.2 — Banner no aparece tampoco en la fecha actual**
- Pasos: mantener la fecha en hoy
- Esperado: tampoco aparece ningún banner amarillo (fue eliminado permanentemente)

---

## Resumen de cobertura

| # | Feature | TCs | Prioridad |
|---|---|---|---|
| 1 | Vista Consolidada Admin | TC-1.1 – TC-1.7 | Alta |
| 2 | Filtros Consolidado (sede · asesor · rango) | TC-2.1 – TC-2.17 | Alta |
| 3 | Historial de cambios (audit trail) | TC-3.1 – TC-3.7 | Alta |
| 4 | Admin edita reporte de asesor | TC-4.1 – TC-4.7 | Alta |
| 5 | Registro rápido con fecha seleccionada | TC-5.1 – TC-5.6 | Alta |
| 6 | Eliminación banner advertencia | TC-6.1 – TC-6.2 | Media |
| **Total** | | **44 casos** | |
