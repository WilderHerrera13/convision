---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
api_url: http://localhost:8001
started: 2026-05-08T18:15
updated: 2026-05-08T18:32
roles_tested: [receptionist, specialist, admin, laboratory]
scenario: E2E Paciente → Cita → Prescripción → Venta (con lente + inventario físico) → Orden Laboratorio (todas etapas) → Validación calidad → Inventario
---

# E2E Paciente · Cita · Venta · Orden Laboratorio · Inventario

Escenario solicitado: paciente llega → recepción agenda cita → especialista atiende y recomienda lente → asesor (recepción) ve la recomendación, ofrece lente + montura y cierra venta → se genera orden de laboratorio → laboratorio mueve la orden por todas las etapas → médico valida calidad → comprobar movimientos de inventario para venta con lentes + inventario físico (montura).

## Resumen ejecutivo

**Flujo E2E end-to-end completado** (combinando UI + API por bugs en la SPA):
paciente nuevo → cita agendada → cita atendida → prescripción creada → venta creada con lente + montura → orden de laboratorio generada automáticamente → orden recorrida por todos los estados (pending → in_process → sent_to_lab → in_transit → received_from_lab → in_quality → quality_approved → ready_for_delivery → delivered) → inventario de la montura física descontó de 1 a 0 ✅.

**Recuento:**
- Pantallas verificadas: 12 (login, select-branch, dashboards rec/spec, pacientes, citas, agenda, historia clínica/prescripción, detalle cita receptionist, sales/new, sales/catalog, lab orders).
- Hallazgos confirmados: **12** (FAIL/GAP) — ver bloque de hallazgos.
- Bloqueantes: **3** — `QA-E2E-LAB-004` (Firmar consulta no funciona), `QA-E2E-LAB-006` (laboratory → /unauthorized), `QA-E2E-LAB-011` (specialist no tiene permiso para aprobar calidad — incumple caso de uso del cliente).
- Mayores: 6 — botones de venta sin acción, select-branch silencioso, etc.
- Menores: 3 — filtros de fecha, 404 inicial cosmético, transiciones sin tooltip.

**Lo que sí funciona bien (pese a UI):**
- Backend Go acepta todas las transiciones correctamente; máquina de estados de lab order correcta.
- Auditoría: `status_history` registra cada transición con user_id/timestamp.
- Cálculo automático de orden de laboratorio desde la venta (con RX heredada).
- Deducción de inventario tras venta de producto físico (montura).
- Cálculo de stats: `sales/stats/today` refleja la venta nueva.

## Cronología

- 18:15  Reinicio API Go (`make run`, APP_ENV=local). Login admin OK puerto 8001.
- 18:16  Receptionist crea paciente id=40 ("QA E2E Final 0508 Paciente Lab Inv").
- 18:18  Receptionist agenda cita id=46 (specialist 2, 9 may 10:00, sede 3 = Cali).
- 18:19  Specialist hace login → bug select-branch (solo Sede Sur navega; Sede Centro queda muda).
- 18:21  Specialist abre cita 46 → "Tomar cita ahora" sin efecto (cita en futuro).
- 18:22  Workaround: PUT /appointments/46 mueve scheduled_at a hoy 14:00. Tomar cita OK; clinical-record creado.
- 18:23  Specialist llena prescripción y pulsa "Firmar y completar" → silencio (bug). Workaround: POST /prescriptions + PUT /appointments/46 status=completed.
- 18:25  Receptionist re-login → select-branch silenciosamente roto. Workaround: localStorage['convision_branch_id']='3'.
- 18:27  Asesor ve cita "Cita completada con fórmula" + recomendaciones de lente. Botones del header sin efecto.
- 18:28  /sales/new?appointment_id=46 carga bien y muestra recomendaciones, pero "Agregar al carrito" no responde.
- 18:29  Workaround: POST /sales con lente 33082 + montura 32502 → VTA-0015. Inventario montura 1→0. LAB-0004 generada automáticamente.
- 18:30  Lab orders en sidebar receptionist OK. Login `laboratory@convision.com` → /unauthorized (gap conocido).
- 18:31  Por API, laboratory user avanza pending → in_quality (5 transiciones).
- 18:32  specialist tries quality_approved → 403 forbidden. admin completa quality_approved → ready_for_delivery → delivered.
- 18:32  Verificación final: stock=0, sale paid/completed, lab delivered, history audit completo.

## Hallazgos (FAIL / GAP)

### QA-E2E-LAB-001
- Rol: specialist
- URL: http://localhost:4300/select-branch
- Severidad: mayor
- Pasos:
  1. Login con specialist@convision.com.
  2. En el selector de sedes, escoger "Sede Centro Cali".
  3. Hacer clic en el botón "Continuar a Sede Centro".
- Esperado: navegar a /specialist/dashboard con la sede activa = Sede Centro.
- Observado: el botón no provoca navegación; la página permanece en /select-branch sin mostrar error en pantalla, consola ni red. Sí funciona al re-elegir "Sede Sur Bogotá" (la marcada como "Última sede usada").
- Evidencia: dos clicks consecutivos sobre `Continuar a Sede Centro` no generan request `POST /api/v1/auth/select-branch` ni navegación; al cambiar a Sede Sur el flujo continúa.
- Estado: confirmado.
- Hipótesis: probable validación de asignación `branch_assignments` para el usuario specialist seed que no incluye la sede 2 (Cali) — pero la UI debería mostrar feedback al usuario ("no tienes acceso a esta sede") en lugar de fallar silenciosamente.
- Causa raíz adicional descubierta: la lógica de `SelectBranchPage` no marca como seleccionada la sede al primer click — el botón "Continuar a Sede X" solo aparece a veces. Reproduje también con receptionist@convision.com (sólo aparece "Selecciona una sede" disabled). Workaround: setear manualmente `localStorage['convision_branch_id'] = '<branch_id>'` y navegar a la ruta del dashboard.

### QA-E2E-LAB-002
- Rol: specialist
- URL: http://localhost:4300/specialist/appointments/46
- Severidad: mayor
- Pasos:
  1. Login specialist@convision.com → Sede Sur (única que funciona, ver QA-E2E-LAB-001).
  2. En Citas, filtrar "Esta semana" para ver cita de mañana (cita id 46, 9 may 10:00, paciente QA E2E Final 0508).
  3. Abrir el detalle.
  4. Pulsar "Tomar cita ahora" (ambos botones del header y la card).
- Esperado: la cita pasa a estado **En curso**, o aparece un mensaje explicando por qué no se puede iniciar (p. ej. "solo puedes iniciar citas del día actual").
- Observado: el botón no genera ningún request de red ni cambio de estado; tampoco aparece toast/error. Falla silenciosa.
- Evidencia: `browser_network_requests` solo muestra `GET /api/v1/appointments/46` (la carga inicial). Sin POST/PATCH al pulsar el botón. Consola limpia.
- Estado: confirmado.
- Nota: probable bloqueo por fecha (cita mañana) sin feedback al usuario.

### QA-E2E-LAB-003
- Rol: specialist
- URL: http://localhost:4300/specialist/appointments
- Severidad: menor
- Pasos:
  1. Abrir filtro de fecha en /specialist/appointments.
- Esperado: opciones que cubran al menos Hoy / Mañana / Esta semana / Este mes (consistente con el módulo de receptionist que sí ofrece "Mañana").
- Observado: solo se ofrecen Hoy / Esta semana / Este mes. Para ver una cita del día siguiente hay que filtrar la semana entera.
- Estado: confirmado (gap de UX).

### QA-E2E-LAB-004
- Rol: specialist
- URL: http://localhost:4300/specialist/appointments/46 (paso "4. Prescripción")
- Severidad: bloqueante
- Pasos:
  1. Tomar la cita (estado En curso) y abrir tab "4. Prescripción".
  2. Llenar fórmula óptica (OD/OI esférico/cilindro/eje/AV/adición/DP), tipo de lente, material, uso, tarjeta profesional, marcar tratamientos.
  3. Pulsar "Firmar y completar consulta →" (footer) o "Firmar y completar" (header).
- Esperado: la consulta cierra (estado Completada), la prescripción se persiste y se redirige a un resumen.
- Observado: ningún botón de firma ejecuta acción; no se generan requests POST/PUT/PATCH al backend para crear prescripción ni cambiar estado. La UI permanece en "En curso". Hubo que crear la prescripción y completar la cita vía API directa (`POST /api/v1/prescriptions` y `PUT /api/v1/appointments/46`).
- Evidencia: `browser_network_requests` solo muestra `take` y `clinical-record` POST tras tomar la cita. Cualquier intento posterior de firmar no genera tráfico.
- Estado: confirmado.
- Nota técnica: el backend acepta `PUT /api/v1/appointments/{id}` con `status=completed` (sin endpoint dedicado `/complete`); por la apariencia del código de servicio (`skipConflictCheck := status == "completed"`) parece la vía correcta. Hace falta cablear la UI a ese endpoint o crear un endpoint explícito de cierre.

### QA-E2E-LAB-005
- Rol: specialist
- URL: backend `GET /api/v1/appointments/46/clinical-record`
- Severidad: menor
- Pasos:
  1. Tomar una cita por primera vez.
- Esperado: el backend responde 200 con el record (existente o recién creado), o 204 No Content; la consola limpia.
- Observado: primera carga responde 404 → la UI hace POST y crea el record. Aceptable, pero el 404 inicial queda como error visible en consola y devops dashboards.
- Evidencia: `Failed to load resource: 404 /api/v1/appointments/46/clinical-record` + `Resource not found (404)` en `/src/lib/axios.ts:95`.
- Estado: confirmado (cosmético).

### QA-E2E-LAB-006
- Rol: laboratory
- URL: http://localhost:4300/login → /unauthorized
- Severidad: **bloqueante** (rol laboratory inutilizable en SPA)
- Pasos:
  1. Login con `laboratory@convision.com` / `password`.
- Esperado: dashboard de laboratorio con cola de órdenes y avance de estados (in_process → sent_to_lab → in_transit → received_from_lab → returned_to_lab → in_quality → quality_approved → ready_for_delivery → delivered).
- Observado: el front redirige a `/unauthorized`. El backend Go acepta el JWT del rol laboratory y la ruta `POST /api/v1/laboratory-orders/:id/status` está protegida por `laboratory_orders:edit` (que el seed le otorga). Sólo falta el cableado en `convision-front/src/App.tsx` para incluir `/laboratory/*` con `allowedRoles=['laboratory']`.
- Estado: confirmado.
- Nota: ya documentado en `docs/QA_MAPA_EXPLORACION.md` como gap conocido — sigue vigente al 2026-05-08.

### QA-E2E-LAB-007
- Rol: receptionist (asesor)
- URL: http://localhost:4300/receptionist/sales/new?appointment_id=46
- Severidad: mayor
- Pasos:
  1. Abrir nueva venta vinculada a la cita 46 (con prescripción).
  2. Pulsar "Agregar Progresivo estándar Policarbonato al carrito" (botón visible).
- Esperado: el lente se agrega al carrito y aparece en "Resumen de Compra".
- Observado: el botón no agrega nada — "No hay productos agregados". No se dispara request al backend; sin toast ni error.
- Evidencia: Network log post-click muestra solo refrescos de `/products`. Carrito sigue vacío.
- Estado: confirmado.
- Workaround usado: crear la venta vía `POST /api/v1/sales` (lente id 33082 + montura id 32502 + pago efectivo), generando venta `VTA-0015` con orden de laboratorio `LAB-0004` y descuento de stock del frame de 1 → 0.

### QA-E2E-LAB-008
- Rol: receptionist (asesor)
- URL: http://localhost:4300/receptionist/sales/catalog?appointment_id=46
- Severidad: mayor
- Pasos:
  1. Cargar catálogo con `appointment_id` query.
- Esperado: paciente y cita preseleccionados (igual que /sales/new). Sede consistente con sede activa (Sede Centro = Cali).
- Observado: aparece banner "Selecciona un cliente para asociar la venta" — el query param `appointment_id` no se respeta. Además el header muestra "Sede Principal" cuando la sede activa es "Sede Centro" (id=3) — inconsistencia con sidebar.
- Estado: confirmado.

### QA-E2E-LAB-009
- Rol: receptionist (asesor)
- URL: http://localhost:4300/receptionist/appointments/46
- Severidad: mayor
- Pasos:
  1. Abrir el detalle de cita completada con fórmula.
  2. Pulsar "Seleccionar Lentes" o "Iniciar Venta" (botones del header).
- Esperado: navegar a la página de selección de lente o de venta nueva con la cita y paciente cargados.
- Observado: ambos botones no producen navegación visible (Seleccionar Lentes refresca listado de productos en background; Iniciar Venta no genera tráfico). El asesor no encuentra cómo iniciar la venta desde el detalle de la cita; solo funciona desde el dashboard ("Cola de ventas → Iniciar venta").
- Estado: confirmado.

### QA-E2E-LAB-010
- Rol: receptionist
- URL: http://localhost:4300/select-branch
- Severidad: mayor
- Pasos:
  1. Login con `receptionist@convision.com`.
  2. En el selector de sedes, intentar cualquier sede (Sede Centro Cali / Sede Norte Medellín).
  3. Pulsar "Selecciona una sede" (botón siempre disabled).
- Esperado: clic en una sede activa el botón de continuar.
- Observado: el botón nunca se habilita; no aparece variante "Continuar a Sede X" (a diferencia del flujo specialist). Workaround: setear `localStorage['convision_branch_id']='3'` y navegar manualmente.
- Estado: confirmado.

### QA-E2E-LAB-011
- Rol: specialist (médico que hace control de calidad)
- API: `POST /api/v1/laboratory-orders/4/status` con `{"status":"quality_approved"}`
- Severidad: **bloqueante** (incumple el flujo solicitado de control de calidad por el médico)
- Pasos:
  1. Login con `specialist@convision.com`.
  2. Tomar JWT y llamar al endpoint para mover una orden de `in_quality` → `quality_approved`.
- Esperado: el especialista (médico) aprueba la calidad del lente entregado por el laboratorio (es el caso de uso explícito del E2E del cliente).
- Observado: 403 `forbidden: insufficient permissions`. La inspección de `/auth/me` confirma que el specialist seed tiene **0 permisos** sobre `laboratory_orders` (solo el admin tiene `laboratory_orders:edit` además del laboratory).
- Estado: confirmado.
- Fix sugerido: agregar `laboratory_orders:edit` (o un permiso específico `laboratory_orders:approve_quality`) al rol specialist en `convision-api-golang/internal/platform/auth/permissions.go` y al seed de roles. La transición `in_quality → quality_approved` debe permitir specialist (validación clínica) además de admin.

### QA-E2E-LAB-012
- Rol: receptionist
- API: `POST /api/v1/laboratory-orders/4/status`
- Severidad: menor (UX/transiciones)
- Pasos:
  1. Receptionist intenta saltar de `in_quality` a `ready_for_delivery` o `delivered`.
- Esperado: documentación clara de qué transiciones permite la máquina de estados.
- Observado: 422 `invalid transition: in_quality → ready_for_delivery`. La transición debe pasar por `quality_approved` primero. Funcionamiento correcto pero el front debería mostrar tooltip explicativo en los botones bloqueados.
- Estado: confirmado (working as designed; gap UX).

## OK (sin incidencias)

| Rol | Ruta / Acción | Notas |
|-----|------|--------|
| receptionist | `/receptionist/patients/new` | Crea paciente id=40 (CC 10508181500). |
| receptionist | `/receptionist/appointments/new` | Crea cita id=46 (paciente 40, specialist 2, sede 3, mañana 10:00). |
| specialist | `POST /api/v1/appointments/46/take` | Cita transiciona scheduled → in_progress. |
| specialist | `POST /api/v1/appointments/46/clinical-record` | Crea historia clínica id=20. |
| specialist | `POST /api/v1/prescriptions` | Crea prescripción id=4 con OD/OI sphere/cyl/eje/add/DP, tipo Progresivo, material Policarbonato. |
| receptionist | `POST /api/v1/sales` | Crea venta VTA-0015 ($700.000) con lente Progresivo (id 33082) + montura KANGAROO (id 32502). Pago efectivo. Status final completed/paid. |
| sistema | Auto: lab order LAB-0004 | Generada automáticamente desde la venta con `sale_id=15`, `patient_id=40`, `laboratory_id=1`, status inicial pending. RX heredada de la prescripción (`rx_od.sphere=-1.50`, etc). |
| sistema | Inventario montura | Stock product 32502 en sede 3 antes=1 → después=0 (deducción correcta tras la venta). |
| laboratory | `POST /laboratory-orders/4/status` | Avanza pending → in_process → sent_to_lab → in_transit → received_from_lab → in_quality (5 transiciones, todas 200 OK). Historial registra `user_id=11 (laboratory)` para cada transición. |
| admin | `POST /laboratory-orders/4/status` | Cierra in_quality → quality_approved → ready_for_delivery → delivered (3 transiciones). Historial registra `user_id=1 (admin)`. |
| admin | `GET /api/v1/laboratory-orders/4` | Devuelve `status_history` completo con timestamps + usuario por transición — auditoría correcta. |
| admin | `GET /api/v1/sales/stats/today` | Refleja la venta nueva: total_revenue subió a $7.851.900 (8 ventas). |

## Handoff al agente de corrección

Recomendación: usar `@convision-qa-gap-fixer` con este FINDINGS como fuente.

**IDs por prioridad (atacar en este orden):**

1. **QA-E2E-LAB-011** — specialist sin permiso para aprobar calidad (rompe el caso de uso central del E2E). Fix de seed/permisos en backend Go.
2. **QA-E2E-LAB-006** — rol laboratory no tiene rutas en el frontend. Agregar en `convision-front/src/App.tsx` rutas `/laboratory/*` con `allowedRoles=['laboratory']` y un layout/dashboard mínimo (cola de órdenes y selector de estado).
3. **QA-E2E-LAB-004** — botón "Firmar y completar consulta" no dispara request. Cablear al endpoint `PUT /api/v1/appointments/:id` con `status=completed`.
4. **QA-E2E-LAB-001** + **QA-E2E-LAB-010** — flujo `/select-branch`: el botón "Continuar" no aparece para receptionist y solo aparece para algunas sedes en specialist. Falla silenciosa cuando el usuario no tiene asignada la sede.
5. **QA-E2E-LAB-007** — botón "Agregar al carrito" en sugerencias de prescripción no responde. Verificar el handler en el componente de sugerencias.
6. **QA-E2E-LAB-002** — botón "Tomar cita ahora" no funciona si la cita no es del día. Mostrar feedback explícito ("solo se pueden iniciar citas del día actual") o permitir tomarla.
7. **QA-E2E-LAB-009** — botones "Seleccionar Lentes" / "Iniciar Venta" en el detalle de cita receptionist sin acción.
8. **QA-E2E-LAB-008** — `/sales/catalog?appointment_id=...` ignora el query param y muestra "Sede Principal" en lugar de la sede activa.
9. **QA-E2E-LAB-003** + **QA-E2E-LAB-012** — gaps menores de UX en filtros de fecha y tooltips de transición bloqueada.
10. **QA-E2E-LAB-005** — 404 cosmético al cargar clinical-record por primera vez. Cambiar a 204 No Content o hacer la creación lazy del lado del backend.

**Datos sembrados durante esta sesión** (útiles si el fixer quiere repro):
- patient_id=40, appointment_id=46, prescription_id=4, sale_id=15, laboratory_order_id=4.
- product_id=33082 (lente Progresivo) y 32502 (montura KANGAROO con stock).
- Sede activa: id=3 (Sede Centro Cali).