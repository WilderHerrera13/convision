---
status: complete
app: convision-front
api: convision-api
base_url: http://localhost:4300
started: 2026-04-16T19:10:00Z
updated: 2026-04-16T19:20:00Z
roles_tested: [receptionist, admin]
scope: "Flujo cierre de caja: recepción (borrador → envío) → admin (lista, detalle, conciliación/aprobación). Sin MCP navegador en sesión: evidencia API + código."
---

## Resumen ejecutivo

- **MCP navegador:** no disponible en esta sesión Cursor (no hay herramientas `browser_*`). No hay snapshots UI; la exploración se apoyó en **código**, **rutas** (`App.tsx`, `AdminLayout.tsx`) y **API local** (`http://localhost:8000`).
- **Front:** `GET http://localhost:4300/login` → **200** (servicio arriba).
- **Hallazgos confirmados (FAIL/GAP):** **1** crítico de negocio/datos (**QA-CC-001**). **1** menor de producto/UI (**QA-CC-002**).
- **Hipótesis / pendiente:** **QA-CC-003** (UX copy); validar en navegador cuando haya MCP.
- **Seguridad API:** `POST …/approve` como recepcionista → **403** (middleware `role:admin` en `routes/api.php`); coherente con el diseño.

## Hallazgos (FAIL / GAP)

### QA-CC-001
- Rol: receptionist → impacto **admin** (conciliación y totales)
- URL: `http://localhost:4300/receptionist/cash-closes` (flujo) / API `POST /api/v1/cash-register-closes`, `POST …/submit`
- Severidad: **mayor** (totales y conciliación administrativa incorrectos en un caso soportado por API)
- Pasos:
  1. Crear cierre con todos los `payment_methods` en cero y `denominations` con subtotal > 0 (arqueo solo billetes/monedas).
  2. Enviar el cierre (`submit`).
  3. Consultar el recurso: `total_counted` y, como admin, `reconciliation.totals.advisor_total` derivados de `total_counted`.
- Esperado: El total declarado por el asesor refleja **medios de pago + efectivo físico** (o al menos no queda en cero si el arqueo aporta valor), para que administración vea el mismo monto que habilitó el envío.
- Observado: `CashRegisterCloseService::recalculateTotals` solo suma filas de `CashRegisterClosePayment`; **no** suma subtotales de `CashCountDenomination`. Tras envío válido (validación `submit` sí exige `denomTotal` o pagos), `total_counted` permanece **0** mientras hay `denominations` con `subtotal` > 0.
- Evidencia (API local, 2026-04-16):
  - Crear: `POST /api/v1/cash-register-closes` con `denominations: [{"denomination":1000,"quantity":5}]` y pagos en cero → respuesta incluye `"denominations":[{"…","subtotal":"5000.00"}]` y `"total_counted":"0.00"`.
  - Tras `POST /api/v1/cash-register-closes/5/submit` → `"status":"submitted"`, `"total_counted":"0.00"`.
  - Código: `recalculateTotals` en `convision-api/app/Services/CashRegisterCloseService.php` (solo suma pagos); `CashRegisterCloseResource` usa `(float) $this->total_counted` como `advisor_total` para admin.
- Estado: **confirmado**

### QA-CC-002
- Rol: admin
- URL: `http://localhost:4300/admin/cash-closes`
- Severidad: **menor** (descubribilidad / expectativa de funcionalidad)
- Pasos:
  1. Ingresar a **Cierres de Caja** como administrador.
  2. Pulsar el botón **Exportar** en la cabecera de la página.
- Esperado: Descarga de archivo, navegación a export, o mensaje de “próximamente” si no está implementado.
- Observado: En `convision-front/src/pages/admin/CashCloses.tsx`, el `Button` **Exportar** (icono `Download`) no tiene `onClick` ni `asChild`/enlace; es un control **inerte**.
- Evidencia: Inspección estática del componente (~líneas 303–311).
- Estado: **confirmado** (comportamiento por ausencia de handler)

### QA-CC-003
- Rol: receptionist
- URL: `http://localhost:4300/receptionist/cash-close-detail/:id` (comparte `AdminCashCloseDetail`)
- Severidad: **sugerencia** / **menor** (copy)
- Pasos:
  1. Abrir detalle de cierre desde **Historial Cierres**.
  2. Observar el botón superior izquierdo de retorno.
- Esperado: Etiqueta alineada con el destino (p. ej. “Historial de cierres” si regresa a `/receptionist/cash-close-history`).
- Observado: El texto del botón es fijo **«Cierres de Caja»** mientras `navigate` en recepcionista va a `/receptionist/cash-close-history` (`CashCloseDetail.tsx`).
- Evidencia: Código `onClick` + literal del botón en `convision-front/src/pages/admin/CashCloseDetail.tsx`.
- Estado: **hipótesis** de confusión UX (pendiente validación con usuario real / snapshot)

---

## OK (sin incidencias) — alcance verificado sin navegador

| Área | Verificación |
|------|----------------|
| Rutas front | `App.tsx`: recepción `cash-closes`, `cash-close-history`, `cash-close-detail/:id`; admin `cash-closes`, `cash-closes/:id`, `cash-closes/advisor/:userId`; detalle compartido con flag `isAdmin`. |
| API permisos | `approve` / `return` / `admin-actuals` / `advisors-pending` con `middleware('role:admin')`; recepcionista **403** en `approve` probado por curl. |
| Política | `CashRegisterClosePolicy`: `view` admin o dueño; `update` solo borrador y dueño. |
| Submit vacío | Tests en `CashRegisterCloseControllerTest`: envío rechazado si todo cero; permitido con solo denominaciones (coherente con bug QA-CC-001). |

---

## Limitaciones de esta corrida

- No se ejecutó recorrido con **snapshot de UI** (login, stepper, modales) por ausencia de MCP navegador.
- **Especialista:** el mapa QA no incluye cierre de caja en menú specialist; no se consideró parte del flujo “recepción → admin” salvo nota arriba.
- Intento de crear segundo cierre el mismo día para el mismo usuario puede responder **500** por `unique(['user_id','close_date'])` — no clasificado como hallazgo sin ver cuerpo de error frente a 422 esperable.

---

## Handoff al agente de corrección

- Reglas sugeridas: **`convision-qa-gap-fixer`** (cambio de modelo/totales + UX) o **`convision-qa-fixer`** (solo botón Exportar).
- Cerrar en orden sugerido: **QA-CC-001** (servicio y/o recurso y UI de totales), **QA-CC-002** (wire handler o ocultar botón), **QA-CC-003** (copy condicional por rol o ruta).
- Comando sugerido: «Con `@convision-qa-gap-fixer`, cerrar **QA-CC-001** … usando `.planning/qa/FINDINGS-2026-04-16-cash-close-flow.md`.»
