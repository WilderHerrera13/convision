---
status: complete
app: convision-front
api: convision-api
base_url: http://localhost:4300
started: 2026-04-14T10:00:00-05:00
updated: 2026-04-14T10:15:00-05:00
roles_tested:
  - admin
  - receptionist
roles_skipped:
  - specialist
dates:
  - 2026-04-14
scope:
  - cierre de caja
  - totales reales
  - conciliacion
---

## Resumen ejecutivo

- Pantallas verificadas: 4
- Hallazgos confirmados: 1
- Hipótesis / pendiente evidencia: 0
- Bloqueos: 0
- Sin incidencias relevantes: admin detalle de cierre con guardado de totales reales, tarjetas resumen y tabla de conciliación; receptionist detalle sin inputs admin ni tabla de conciliación; API `GET /api/v1/cash-register-closes/1` con shape segregado por rol
- Nota de alcance: `specialist` se omite porque el mapa de exploración no expone rutas de caja para ese rol

## Hallazgos

### QA-001
- Rol: receptionist
- URL: http://localhost:4300/receptionist/cash-close-detail/1
- Severidad: menor
- Pasos:
  1. Abrir un cierre enviado desde recepción.
  2. Entrar al detalle `receptionist/cash-close-detail/1`.
  3. Revisar la tarjeta superior y el copy informativo debajo del total declarado.
- Esperado: la vista de recepción no debe exponer elementos ni copy relacionados con la conciliación administrativa o los totales reales; el mensaje debe ser neutro para el rol o no mostrarse.
- Observado: aunque recepción no ve inputs admin ni tabla de conciliación, la tarjeta superior sigue mostrando el texto `Los totales reales que registre el administrador se comparan con esta declaración en la sección de conciliación (solo visible para admin).`
- Evidencia: UI en `http://localhost:4300/receptionist/cash-close-detail/1` con sesión `Recepción`; API del mismo cierre para receptionist no incluye `reconciliation` ni `total_actual_amount`, por lo que el copy visible queda desalineado con el contenido permitido.
- Estado: confirmado

## OK (sin incidencias)

| Rol | Ruta / evidencia | Notas |
|-----|------|--------|
| admin | `/admin/cash-closes` | La vista carga correctamente. Sin datos iniciales, muestra estado vacío sin error visible. |
| admin | `/admin/cash-closes/1` | Se renderiza el bloque `Totales reales (manual / contabilidad)` con inputs por medio de pago y acciones de aprobación. |
| admin | `/admin/cash-closes/1` | Guardado exitoso de totales reales desde UI. Evidencia: `PUT /api/v1/cash-register-closes/1/admin-actuals` responde `200`, aparece `Último registro`, tarjetas resumen (`Total declarado`, `Total real`, `Diferencia`) y tabla `Conciliación por medio de pago` con filas. |
| admin | `GET /api/v1/cash-register-closes/1` | El JSON incluye `total_actual_amount: 6000` y `reconciliation` con `advisor_total: 7000`, `admin_total: 6000`, `variance_total: 1000`. |
| receptionist | `/receptionist/cash-close-detail/1` | No se renderizan inputs admin, botón `Guardar totales reales`, tarjetas de conciliación ni tabla `Conciliación por medio de pago`. |
| receptionist | `GET /api/v1/cash-register-closes/1` | El JSON omite `reconciliation` y `total_actual_amount`; la segregación de datos sensibles por rol funciona correctamente. |

## Handoff al agente de corrección

- Recomendado: usar la regla `convision-qa-gap-fixer` para cerrar `QA-001` con parche mínimo sobre la vista de detalle compartida entre admin y recepción.
- Alternativa ligera: usar `convision-qa-fixer`.
- Sugerencia de instrucción: `Tomar .planning/qa/FINDINGS-cierre-caja-2026-04-14.md y cerrar QA-001 sin alterar el contrato API por rol.`
---
status: complete
app: convision-front
api: convision-api
base_url: http://localhost:4300
started: 2026-04-14T10:00:00-05:00
updated: 2026-04-14T10:15:00-05:00
roles_tested:
  - admin
  - receptionist
roles_skipped:
  - specialist
dates:
  - 2026-04-14
scope:
  - cierre de caja
  - totales reales
  - conciliacion
---

## Resumen ejecutivo

- Pantallas verificadas: 4
- Hallazgos confirmados: 1
- Hipótesis / pendiente evidencia: 0
- Bloqueos: 0
- Sin incidencias relevantes: admin detalle de cierre con guardado de totales reales, tarjetas resumen y tabla de conciliación; receptionist detalle sin inputs admin ni tabla de conciliación; API `GET /api/v1/cash-register-closes/1` con shape segregado por rol
- Nota de alcance: `specialist` se omite porque el mapa de exploración no expone rutas de caja para ese rol

## Hallazgos

### QA-001
- Rol: receptionist
- URL: http://localhost:4300/receptionist/cash-close-detail/1
- Severidad: menor
- Pasos:
  1. Abrir un cierre enviado desde recepción.
  2. Entrar al detalle `receptionist/cash-close-detail/1`.
  3. Revisar la tarjeta superior y el copy informativo debajo del total declarado.
- Esperado: la vista de recepción no debe exponer elementos ni copy relacionados con la conciliación administrativa o los totales reales; el mensaje debe ser neutro para el rol o no mostrarse.
- Observado: aunque recepción no ve inputs admin ni tabla de conciliación, la tarjeta superior sigue mostrando el texto `Los totales reales que registre el administrador se comparan con esta declaración en la sección de conciliación (solo visible para admin).`
- Evidencia: UI en `http://localhost:4300/receptionist/cash-close-detail/1` con sesión `Recepción`; API del mismo cierre para receptionist no incluye `reconciliation` ni `total_actual_amount`, por lo que el copy visible queda desalineado con el contenido permitido.
- Estado: confirmado

## OK (sin incidencias)

| Rol | Ruta / evidencia | Notas |
|-----|------|--------|
| admin | `/admin/cash-closes` | La vista carga correctamente. Sin datos iniciales, muestra estado vacío sin error visible. |
| admin | `/admin/cash-closes/1` | Se renderiza el bloque `Totales reales (manual / contabilidad)` con inputs por medio de pago y acciones de aprobación. |
| admin | `/admin/cash-closes/1` | Guardado exitoso de totales reales desde UI. Evidencia: `PUT /api/v1/cash-register-closes/1/admin-actuals` responde `200`, aparece `Último registro`, tarjetas resumen (`Total declarado`, `Total real`, `Diferencia`) y tabla `Conciliación por medio de pago` con filas. |
| admin | `GET /api/v1/cash-register-closes/1` | El JSON incluye `total_actual_amount: 6000` y `reconciliation` con `advisor_total: 7000`, `admin_total: 6000`, `variance_total: 1000`. |
| receptionist | `/receptionist/cash-close-detail/1` | No se renderizan inputs admin, botón `Guardar totales reales`, tarjetas de conciliación ni tabla `Conciliación por medio de pago`. |
| receptionist | `GET /api/v1/cash-register-closes/1` | El JSON omite `reconciliation` y `total_actual_amount`; la segregación de datos sensibles por rol funciona correctamente. |

## Handoff al agente de corrección

- Recomendado: usar la regla `convision-qa-gap-fixer` para cerrar `QA-001` con parche mínimo sobre la vista de detalle compartida entre admin y recepción.
- Alternativa ligera: usar `convision-qa-fixer`.
- Sugerencia de instrucción: `Tomar .planning/qa/FINDINGS-cierre-caja-2026-04-14.md y cerrar QA-001 sin alterar el contrato API por rol.`
---
status: complete
app: convision-front
api: convision-api
base_url: http://localhost:4300
api_url: http://localhost:8000
started: 2026-04-14
updated: 2026-04-14T20:00:00Z
roles_tested: [receptionist, admin]
scope: cierre de caja
notes: "QA-CC-005 (401 sin usuarios en BD) mitigable con seed / convision:ensure-dev-users. Sesión E2E post-seed documentada abajo."
---

# QA cierre de caja — FINDINGS

Sesión con **cursor-ide-browser**. Front en **puerto 4300** (según solicitud; el repo documenta 4200 por defecto).

## Resumen ejecutivo

| Métrica | Valor |
|---------|--------|
| Pantallas tocadas | 5 rutas |
| Hallazgos confirmados | 2 |
| Sugerencias / negocio | 2 |
| Bloqueados | 0 |

---

## Hallazgos (FAIL / GAP / RIESGO)

### QA-CC-001

- **Rol:** receptionist (formulario cierre)
- **URL:** http://localhost:4300/receptionist/cash-closes
- **Severidad:** menor
- **Pasos:**
  1. Abrir Cierre de Caja con montos en 0 (pestaña Medios de Pago).
  2. Clic en **Enviar Cierre**.
- **Esperado:** Validación que impida envío vacío o mensaje claro de error; o confirmación explícita de éxito en UI.
- **Observado:** Peticiones `POST /api/v1/cash-register-closes` y `POST /api/v1/cash-register-closes/2/submit` respondieron **200**. En el snapshot de accesibilidad, tras el clic los spinbuttons y botones de acción **desaparecieron momentáneamente** del árbol (solo quedaron pestañas y encabezados); no quedó claro en el snapshot un toast/mensaje de éxito.
- **Evidencia:** `browser_network_requests`: `cash-register-closes` POST 200; `cash-register-closes/2/submit` POST 200.
- **Estado:** confirmado (API acepta cierre en cero; UX post-envío poco clara en snapshot a11y).

### QA-CC-002

- **Rol:** receptionist / admin
- **URL:** http://localhost:4300/receptionist/cash-close-detail/2 y http://localhost:4300/admin/cash-closes/2
- **Severidad:** menor
- **Pasos:**
  1. Navegar directamente al detalle por ID.
- **Esperado:** Indicador de carga perceptible (spinner/skeleton) o contenido estable sin “pantalla casi vacía”.
- **Observado:** Primer snapshot tras `navigate`: solo `region` Notifications (~1 nodo interactivo). Tras **~2–3 s** el contenido completo aparece (totales, secciones, acciones admin).
- **Evidencia:** Snapshots consecutivos misma URL antes/después de espera.
- **Estado:** confirmado.

### QA-CC-003 (sugerencia — negocio)

- **Rol:** receptionist
- **URL:** http://localhost:4300/receptionist/cash-closes
- **Severidad:** sugerencia
- **Texto:** Si el negocio no debe permitir cierre con totales 0, el backend ya aceptó el flujo en esta prueba; conviene alinear validación servidor + cliente.

### QA-CC-004 (sugerencia — UX)

- **Rol:** receptionist
- **URL:** http://localhost:4300/receptionist/cash-closes (pestaña **Conteo de Efectivo**)
- **Severidad:** sugerencia
- **Texto:** En el snapshot a11y, en esa pestaña no apareció **Enviar Cierre** (sí **Guardar borrador**); en **Resumen** aparecieron ambos. Puede ser scroll/layout; verificar que el botón de envío sea siempre alcanzable/obvio.

---

## OK (rutas verificadas en esta sesión)

| Rol | Ruta | Qué se comprobó |
|-----|------|------------------|
| receptionist | /receptionist/cash-closes | Título “Cierre de Caja”, pestañas Medios de Pago / Conteo de Efectivo / Resumen, spinbuttons, Resumen con totales $0, Guardar borrador / Enviar Cierre (según pestaña). |
| receptionist | /receptionist/cash-close-history | Título “Historial de Cierres”, filtros Desde/Hasta, columnas de tabla (Fecha, totales, estado, acciones), paginación “15 por página”, página 1. |
| receptionist | /receptionist/cash-close-detail/2 | Totales $0, encabezado Medios de Pago, breadcrumb “Cierres de Caja”. |
| admin | /admin/cash-closes | Listado accesible desde menú (snapshot parcial en a11y para filas). |
| admin | /admin/cash-closes/2 | Estado “Pendiente de Aprobación”, totales, **Aprobar Cierre** / **Devolver**, campo observaciones admin. |

**Coherencia recepción ↔ admin:** El cierre `id=2` creado/enviado desde recepción aparece en API (`status: submitted`) y en detalle admin como pendiente de aprobación.

---

## Notas de sesión

- La sesión inició ya autenticada como recepcionista; el login explícito se probó para **admin** (`admin@convision.com` / `password`) → redirección a `/admin/dashboard` OK.
- Abrir detalle desde **fila** del historial: no se automatizó clic en acción (botones de fila aparecieron deshabilitados en snapshot); el detalle se validó por URL con `id=2` obtenido de la API.

## Handoff

- Resolver UX/validación: **QA-CC-001**, **QA-CC-003**, **QA-CC-004** (front + opcional regla negocio API).
- Mejora carga: **QA-CC-002** (loading state / a11y).

---

## Resolución (implementación 2026-04-14)

### QA-CC-001 — resuelto

- Toasts **Sonner** + `useToast` al enviar con mensaje explícito; banner **Alert** cuando el cierre queda en estado `submitted` (enlace a historial).
- Archivos: `convision-front/src/hooks/useCashClose.ts`, `convision-front/src/pages/receptionist/CashRegisterClose.tsx`.

### QA-CC-002 — resuelto

- Pantalla de carga con **Skeleton** + `role="status"` / `sr-only` en `CashCloseDetail`.
- Archivo: `convision-front/src/pages/admin/CashCloseDetail.tsx`.

### QA-CC-003 — resuelto

- **Backend:** `CashRegisterCloseService::submit()` rechaza envío si `total_registered` y `total_counted` son ≤ 0 (`ValidationException` 422).
- **Front:** misma regla antes de llamar API + mensaje de error parseado desde `errors.submit`.
- Tests: `convision-api/tests/Feature/Api/V1/CashRegisterCloseControllerTest.php`.

### QA-CC-004 — resuelto

- Barra de acciones **sticky** inferior (Guardar / Enviar) compartida para todas las pestañas; eliminados duplicados dentro de cada `TabsContent`.
- **Layout:** contenedor `Outlet` con `flex-1 min-h-0` para que el scroll y el sticky funcionen en el área principal.
- Archivos: `CashRegisterClose.tsx`, `AdminLayout.tsx`.

---

## Reverificación funcional — sesión cursor-ide-browser (2026-04-14)

**Front:** `http://localhost:4300` · **API:** `http://localhost:8000` (según instrucción de la sesión).

### Resumen de esta sesión

| Métrica | Valor |
|--------|--------|
| Alcance módulo cierre de caja (recepción + admin) | **Bloqueado** — sin sesión válida |
| Pantallas del módulo abiertas con datos | 0 |
| Hallazgos nuevos confirmados | 1 (bloqueo de entorno / auth) |

### Hallazgos (FAIL / GAP)

```text
### QA-CC-005
- Rol: receptionist (intentado); aplica también admin
- URL: http://localhost:4300/login → POST vía proxy a /api/v1/auth/login
- Severidad: bloqueante (para completar QA E2E en este entorno; no atribuible al flujo UI del cierre hasta tener login OK)
- Pasos:
  1. Navegar a /login; snapshot con campos Usuario / Contraseña, botón Ingresar, region Notifications.
  2. Rellenar receptionist@convision.com / password y clic en Ingresar.
  3. Revisar red: POST http://localhost:4300/api/v1/auth/login → 401.
  4. Repetir con curl directo a API: admin@convision.com, receptionist@convision.com, vcastillo@convision.com — todos 401 con cuerpo {"error":"Unauthorized"}.
  5. Navegar a http://localhost:4300/receptionist/cash-closes sin sesión → redirección a /login (comportamiento esperado de ruta protegida).
- Esperado: 200 en login con credenciales de docs/CREDENCIALES_PRUEBA_ROLES.md y acceso a rutas del módulo.
- Observado: login API rechazado; permanencia en /login; imposible probar formularios, historial, detalle ni vista admin del cierre en esta ejecución.
- Evidencia: `browser_network_requests`: POST .../api/v1/auth/login statusCode 401; `curl` a http://localhost:8000/api/v1/auth/login misma respuesta.
- Estado: confirmado
- Desbloqueo sugerido: `php artisan migrate:fresh --seed` en convision-api (o verificar .env DB y usuarios), confirmar contraseña seed y que el front apunte al mismo backend.
```

```text
### QA-CC-006
- Rol: n/a (desarrollo)
- URL: http://localhost:4300/login (consola del navegador durante la sesión)
- Severidad: menor
- Pasos: Abrir consola mientras la app está en caliente con Vite.
- Esperado: Sin errores recurrentes de HMR que sugieran módulo roto.
- Observado: Mensaje debug `[hmr] Failed to reload .../CashRegisterClose.tsx` (posible error transitorio de sintaxis/import en caliente); también avisos habituales de React DevTools.
- Evidencia: `browser_console_messages` — entrada con método "debug" y texto Failed to reload ... CashRegisterClose.tsx.
- Estado: hipótesis (ruido de HMR; revalidar tras login OK y recarga completa)
```

### OK (solo rutas verificadas en esta sesión)

| Rol | Ruta | Qué se comprobó |
|-----|------|------------------|
| (sin sesión) | http://localhost:4300/login | Formulario de acceso en español, textos Bienvenido / credenciales, botón Ingresar, región de notificaciones. |
| (sin sesión) | http://localhost:4300/receptionist/cash-closes | Redirección a `/login` (protección de ruta). |

**No verificadas en esta sesión** (bloqueadas por QA-CC-005): `/receptionist/cash-close-history`, `/receptionist/cash-close-detail/:id`, `/admin/cash-closes`, `/admin/cash-closes/:id`, ni flujo completo de cierre/validaciones.

### Notas

- Los hallazgos **QA-CC-001 … QA-CC-004** y la sección **Resolución** corresponden a una sesión previa documentada en este mismo archivo; **no fueron re-ejecutados** en esta reverificación por el bloqueo de autenticación.
- Mapa de exploración general: `docs/QA_MAPA_EXPLORACION.md`; credenciales esperadas: `docs/CREDENCIALES_PRUEBA_ROLES.md`.

---

## QA funcional E2E — sesión cursor-ide-browser (2026-04-14, auth OK)

**Front:** `http://localhost:4300` · **API:** `http://localhost:8000`. Metodología: snapshot → acción → snapshot; red y consola ante anomalías.

### Resumen de esta sesión

| Métrica | Valor |
|--------|--------|
| Rutas obligatorias cubiertas | Sí (recepción + admin) |
| Hallazgos nuevos | 1 (a11y) |
| Bloqueos | Ninguno (tras datos mínimos: borradores creados en UI) |

### Hallazgos (FAIL / GAP)

```text
### QA-CC-007
- Rol: receptionist
- URL: http://localhost:4300/receptionist/cash-close-history
- Severidad: menor
- Pasos:
  1. Con al menos un cierre en lista, abrir snapshot de accesibilidad.
  2. Localizar el botón de acción de la fila (detalle).
- Esperado: Nombre o `aria-label` descriptivo (p. ej. «Ver detalle») para lectores de pantalla y automatización.
- Observado: El botón de la fila aparece como `role: button` **sin `name`** en el árbol a11y; en admin el mismo listado sí expone botones **«Ver detalle»**.
- Evidencia: Snapshot con `ref: e23` (button sin name) antes de navegar a `/receptionist/cash-close-detail/4`.
- Estado: confirmado
```

### Resolución (QA-CC-007)

- **Fecha:** 2026-04-14
- **Causa:** Botón de acción solo con ícono, sin nombre accesible.
- **Cambio:** `aria-label="Ver detalle"`, `type="button"` y `onClick` con `stopPropagation()` alineados con `convision-front/src/pages/admin/CashCloses.tsx`.
- **Archivos:** `convision-front/src/pages/receptionist/CashRegisterHistory.tsx`
- **Estado fix:** resuelto

### OK (rutas realmente verificadas en esta sesión)

| Rol | Ruta | Qué se comprobó |
|-----|------|------------------|
| receptionist | /login → /receptionist/dashboard | Login `receptionist@convision.com` / `password`, redirección OK. |
| receptionist | /receptionist/cash-closes | Título «Cierre de Caja», pestañas Medios de Pago / Conteo de Efectivo / Resumen; spinbuttons; **Guardar borrador** y **Enviar Cierre** visibles en Medios de Pago y en Conteo (coherencia sticky). |
| receptionist | /receptionist/cash-closes | Clic **Enviar Cierre** con totales en 0: **no** apareció `POST .../submit` en red de la pestaña (validación cliente; región Sonner/notificaciones presente tras la acción). |
| receptionist | /receptionist/cash-closes | Clic **Guardar borrador**: `POST /api/v1/cash-register-closes` **200** (borrador creado). |
| receptionist | /receptionist/cash-close-history | Filtros Desde/Hasta (DatePicker), combo «15 por página», columnas y paginación; al menos una fila tras crear borrador. |
| receptionist | /receptionist/cash-close-detail/4 | Apertura **desde la UI** (botón fila); mensaje de carga «Cargando datos del cierre de caja…» en a11y; luego totales $0, breadcrumb «Cierres de Caja», sección Medios de Pago. |
| receptionist | /receptionist/cash-close-detail/1 | Id inexistente: mensaje accesible **«Cierre no encontrado.»**; red `GET .../cash-register-closes/1` → **404**. |
| admin | /login → /admin/dashboard | Login `admin@convision.com` / `password` OK. |
| admin | /admin/cash-closes | Listado con filtros fecha; **dos** filas (borradores admin id 3 y recepción id 4); botones **«Ver detalle»** nombrados en a11y; `GET .../cash-register-closes` **200**. |
| admin | /admin/cash-closes/3 | Detalle vía UI; estado de carga en a11y; contenido con totales y «Medios de Pago». |

**Coherencia recepción ↔ admin:** La API aplica `user_id` para no-admin (`CashRegisterCloseController@index`); el historial de recepción solo lista cierres del usuario autenticado. El admin ve **todos** los cierres (incluido el de recepcionista), coherente con el backend.

### Notas de sesión

- **QA-CC-005:** En este entorno el login funcionó (usuarios presentes en BD). Si reaparece 401, ver `docs/CREDENCIALES_PRUEBA_ROLES.md` y `php artisan convision:ensure-dev-users`.
- Consola: avisos de `ReceptionistDashboard` (0 citas completadas) y React DevTools; sin errores JS bloqueantes en flujos de cierre probados.
- Acciones admin **Aprobar Cierre** / **Devolver** no aparecieron en el snapshot a11y del detalle en estado **borrador** (id 3); no se validó flujo de aprobación en esta pasada.

---

## QA funcional — sesión cursor-ide-browser (2026-04-14, actualización 3)

**Front:** `http://localhost:4300` · **API:** `http://localhost:8000`. Metodología solicitada: snapshot → acción → snapshot; consola y red ante fallos o vacíos inesperados.

### Resumen de esta sesión

| Métrica | Valor |
|--------|--------|
| Rutas obligatorias (recepción + admin) | Cubiertas |
| Hallazgos (actualización 3) | 2 documentados → **2 resueltos en código** (QA-CC-008, QA-CC-009) |
| Bloqueados | 1 (E2E «Enviar Cierre» hasta confirmación, por alcance de automatización) |

### Hallazgos (FAIL / GAP)

```text
### QA-CC-008
- Rol: receptionist / admin
- URL: http://localhost:4300/receptionist/cash-close-detail/4 y http://localhost:4300/admin/cash-closes/3
- Severidad: mayor
- Pasos:
  1. Abrir detalle de un cierre con diferencia total $0 (totales registrado y contado iguales).
  2. Revisar la tarjeta «Diferencia» y el badge bajo el monto.
- Esperado: Cuando la diferencia es exactamente 0, la UI no debe indicar «sobra» ni «falta» de forma engañosa; etiqueta neutral (p. ej. «Cuadrado» / «Sin diferencia») u ocultar el badge.
- Observado: Con diferencia $0 sigue mostrándose el badge **«SOBRA»** (estilo verde), porque la condición es binaria `diff < 0 ? 'FALTA' : 'SOBRA'` sin tratar el cero.
- Evidencia: Captura de pantalla (detalle recepción, 14/04/2026): totales $0 y badge SOBRA; código `convision-front/src/pages/admin/CashCloseDetail.tsx` líneas 145-146 (`{diff < 0 ? 'FALTA' : 'SOBRA'}`).
- Estado: confirmado → **resuelto** (ver Resolución abajo)
```

```text
### QA-CC-009
- Rol: receptionist
- URL: http://localhost:4300/receptionist/cash-close-history
- Severidad: menor
- Pasos:
  1. Comparar la fecha mostrada en la columna «Fecha» del historial con `close_date` devuelto por `GET /api/v1/cash-register-closes` para el mismo registro.
- Esperado: La fecha en pantalla coincide con el día de negocio almacenado (misma zona horaria que el resto del sistema).
- Observado: En la captura de esta sesión la fila mostraba **13/04/2026** mientras la API para el cierre del usuario recepcionista devolvía `close_date: "2026-04-14"` (id 4). Puede deberse a `Date`/UTC en el formateo del listado.
- Evidencia: Screenshot historial recepción (columna Fecha); `curl` con JWT recepcionista: un ítem, id 4, `"2026-04-14"`.
- Estado: hipótesis → **resuelto** (causa: `new Date('yyyy-MM-dd')` en UTC; ver Resolución abajo)
```

### Bloqueado (alcance / herramienta)

```text
### QA-CC-BLOQ-001
- Rol: receptionist
- URL: http://localhost:4300/receptionist/cash-closes
- Motivo: No se completó en esta sesión el flujo **Enviar Cierre** hasta diálogo de confirmación y **POST submit** con montos > 0.
- Detalle: Tras validar **Enviar Cierre** con totales en 0, apareció toast de error coherente («No se puede enviar… al menos un valor mayor a cero»). Los intentos de rellenar spinbuttons vía MCP devolvieron **stale element reference** (re-renders frecuentes del formulario). **Guardar borrador** sí se probó: `PUT http://localhost:4300/api/v1/cash-register-closes/4` → **200**.
- Estado: bloqueado por automatización (no implica fallo del producto); revalidar manualmente o con prueba E2E estable.
```

### OK (solo rutas realmente verificadas en esta sesión)

| Rol | Ruta | Qué se comprobó |
|-----|------|------------------|
| receptionist | /login | Formulario; login `receptionist@convision.com` / `password` → `/receptionist/dashboard`. |
| receptionist | /receptionist/cash-closes | Pestañas Medios de Pago / Conteo de Efectivo / Resumen; `GET .../cash-register-closes?close_date=2026-04-14` **200**; **Enviar Cierre** con ceros → toast de validación (sin submit API); **Guardar borrador** → **PUT** `.../cash-register-closes/4` **200**. |
| receptionist | /receptionist/cash-close-history | Filtros fecha inicio/fin, orden por columnas, «15 por página», al menos una fila; `GET .../cash-register-closes?page=1&per_page=15` **200**; botón **«Ver detalle»** presente en snapshot a11y. |
| receptionist | /receptionist/cash-close-detail/4 | Navegación desde fila; estado de carga; `GET .../cash-register-closes/4` **200**; totales y sección Medios de Pago (tabla puede mostrar solo TOTALES si `payment_methods` viene vacío). |
| admin | /login | `admin@convision.com` / `password` → `/admin/dashboard`. |
| admin | /admin/cash-closes | Listado con 2 filas; filtros; `GET ...?page=1&per_page=10` **200**; coherente con API admin (más ítems que recepción por filtro `user_id`). |
| admin | /admin/cash-closes/3 | Detalle vía «Ver detalle»; `GET .../cash-register-closes/3` **200**. |

### Consola / red (notas)

- Consola: avisos de `ReceptionistDashboard` (0 citas completadas); en otras sesiones apareció `[hmr] Failed to reload ... CashRegisterClose.tsx` (entorno dev). Sin error JS bloqueante en los clics probados en cierre de caja.
- **Coherencia listados:** La API con usuario recepcionista devolvió **1** cierre; con admin **2** (ids 3 y 4). Comportamiento alineado con control de alcance por usuario en backend, no incidencia si el requisito de negocio es que recepción solo vea los propios.

### Resolución (implementación 2026-04-14)

#### QA-CC-008 — resuelto

- **Cambio:** Si `total_difference === 0`, tarjeta «Diferencia» con estilo neutro (fondo gris, texto muted) y badge **«Sin diferencia»**. Solo **FALTA** / **SOBRA** cuando la diferencia es distinta de cero.
- **Archivo:** `convision-front/src/pages/admin/CashCloseDetail.tsx`

#### QA-CC-009 — resuelto

- **Causa:** `format(new Date(item.close_date), …)` interpretaba la fecha solo como UTC medianoche, desplazando el día en zonas detrás de UTC.
- **Cambio:** Formato alineado con `CashCloses.tsx` y detalle: `new Date(\`${item.close_date}T12:00:00\`)`. Columna «Diferencia» en tabla: tono muted cuando el monto es $0.
- **Archivo:** `convision-front/src/pages/receptionist/CashRegisterHistory.tsx`

### Handoff

- Pendiente: completar E2E envío final y confirmación: **QA-CC-BLOQ-001** (manual o test automatizado).
