---
status: complete
app: convision-front
api: convision-api
base_url: http://localhost:4300
started: 2026-04-17T15:40:00Z
updated: 2026-04-17T15:55:00Z
roles_tested: [receptionist, admin]
scope: "Flujo de Cierre de Caja end-to-end: creación y envío desde Recepción → gestión/aprobación en Admin → vista de Calendario de Cierres por asesora. Se sembraron 3 recepcionistas nuevas y 32 cierres pasados (aprobados / enviados / borradores) para estresar el módulo de calendario."
---

## Contexto de la corrida

- **Entornos:** front `http://localhost:4300` (200), API `http://localhost:8000/api/v1` (login JWT 200). DB `convision` en contenedor `convision-mysql`.
- **Seeder auxiliar ejecutado:** `convision-api/storage/app/qa-seed.php` (creado en esta sesión; puede eliminarse después de QA).
- **Recepcionistas activas tras sembrado (role=`receptionist`):**
  - `#8 receptionist@convision.com` — seed base, sin cierres sembrados.
  - `#10 mgomez@convision.com` — **María Gómez** — 10 aprobados + 1 enviado (últimos 18 días).
  - `#12 lramirez@convision.com` — **Laura Ramírez** — 9 aprobados + 2 enviados.
  - `#13 dortiz@convision.com` — **Daniela Ortiz** — 7 aprobados + 1 enviado + 2 borradores (uno es hoy, 17/04).
- **Contraseña común:** `password`.
- **Datos sembrados:** 32 cierres entre 2026-03-30 y 2026-04-17 con pagos por medio, denominaciones y `actual_payments` (para forzar variaciones de ±1.500 a ±5.000 como conciliaciones administrativas).

## Resumen ejecutivo

- Pantallas verificadas por navegador (MCP): `/login`, `/receptionist/cash-closes`, `/receptionist/cash-close-history`, `/receptionist/cash-close-detail/:id`, `/admin/cash-closes` (ambas pestañas), `/admin/cash-closes/advisor/:userId` (calendario), diálogo de **Aprobar cierre**.
- **Hallazgos confirmados (FAIL/GAP):** **9** (2 bloqueantes, 4 mayores, 3 menores/sugerencia).
- **Hipótesis pendientes:** 0 — todo se reprodujo en navegador o con `curl` directo.
- Hallazgos previos reabiertos: **QA-CC-002** (botón Exportar sin handler, ahora en dos páginas) y **QA-CC-003** (back-button «Cierres de Caja» en detalle recep) reproducidos hoy con UI.

## Hallazgos (FAIL / GAP)

### QA-CCC-001 (BLOQUEANTE)
- Rol: **receptionist** (y cualquiera con historial de cierres)
- URL: `http://localhost:4300/receptionist/cash-closes` / API `GET /api/v1/cash-register-closes?close_date=YYYY-MM-DD`
- Severidad: **bloqueante**
- Pasos:
  1. Sembrar o tener múltiples cierres en distintos días para un mismo usuario (ej. Daniela Ortiz: aprobados en 31/03, 04/04, 11/04, 13/04…, borrador hoy 17/04).
  2. Entrar como recepcionista a **Cierre de Caja** (`/receptionist/cash-closes`).
  3. El frontend dispara `GET /api/v1/cash-register-closes?close_date=2026-04-17`.
- Esperado: el endpoint devuelve **solo** el cierre (o ninguno) cuya `close_date = 2026-04-17`; si no existe cierre para hoy, la UI debe abrir un formulario nuevo en modo **borrador**.
- Observado: el endpoint **ignora** el parámetro `close_date` y devuelve la lista paginada de **todos** los cierres del usuario (11 en el caso de María, 10 en Daniela). El front toma `items[0]` (cierre más antiguo por el orden default) y lo hidrata como si fuera el cierre del día seleccionado. Dependiendo del status de ese primer cierre la UI entra a **modo lectura** y bloquea el formulario (`"Cierre aprobado — solo lectura"` o similar).
- Impacto: **un asesor con historial aprobado nunca puede crear o editar un cierre nuevo desde la UI** (siempre ve «aprobado»). Para Daniela, su propio borrador de hoy es inaccesible vía la página.
- Evidencia:
  - Navegador: al loguearse como `mgomez@convision.com` o `dortiz@convision.com` el panel inferior muestra «Cierre aprobado — solo lectura» con denominaciones de un cierre de marzo, aun cuando el date-picker marca **17/04/2026**.
  - Network: `GET /api/v1/cash-register-closes?close_date=2026-04-17` → 200 con 11 items (none match). Luego el front pide `GET /api/v1/cash-register-closes/8` (close de `2026-03-30` aprobado) y lo pinta como «hoy».
  - `curl` cruzado: `?close_date=2026-04-10` devuelve los mismos 11 items que `?close_date=2026-04-17` y que sin filtro (baseline 11). Filtro totalmente inerte.
  - Código: `CashRegisterCloseController@index` (`convision-api/app/Http/Controllers/Api/V1/CashRegisterCloseController.php` L29) usa `->apiFilter($request)` (`App/Traits/ApiFilterable.php`) que solo mapea `s_f`/`s_v`, `status`, o `*_id`. **No maneja `close_date` como campo directo**, así que el query string se descarta silenciosamente.
  - Consumidor: `convision-front/src/hooks/useCashClose.ts` L68 asume que `list({close_date})` ya viene filtrado y toma `items[0]`.
- Estado: **confirmado**

### Resolución (QA-CCC-001)

- **Fecha:** 2026-04-17
- **Estado:** resuelto
- **Archivos:** `convision-api/app/Http/Controllers/Api/V1/CashRegisterCloseController.php` (`index`: `whereDate` por `close_date` para todos los roles; en admin además `user_id`, `date_from`, `date_to`; orden por `close_date`/`id` descendente si no hay `sort`); `convision-api/tests/Feature/Api/V1/CashRegisterCloseControllerTest.php` (`test_index_filters_by_close_date_for_receptionist`).
- **Hecho:** `GET /api/v1/cash-register-closes?close_date=YYYY-MM-DD` devuelve solo cierres de ese día (0 o 1 por usuario por restricción única), alineado con `useCashClose` que usa `items[0]`.

### QA-CCC-002 (BLOQUEANTE)
- Rol: **admin**
- URL: `http://localhost:4300/admin/cash-closes/advisor/:userId` / API `POST /api/v1/cash-register-closes/:id/approve`
- Severidad: **bloqueante** (riesgo de conciliación contable)
- Pasos:
  1. Como admin abrir el calendario de cualquier asesora (ej. Daniela Ortiz `/admin/cash-closes/advisor/13`).
  2. Localizar un día con badge «Pendiente» cuyo cierre **nunca** tuvo conciliación administrativa (actual_payments no ingresado).
  3. Pulsar **Aprobar** en la columna del día → confirmar en el `ConfirmDialog`.
  4. Refrescar / revisar DB.
- Esperado: la aprobación debería **exigir** que el admin primero registre los valores reales (`actual_payments`) para ese cierre. Alternativamente, al aprobar sin actuals, la API debería responder 422 o autocopiar valores declarados = actuales y marcar un flag.
- Observado: la aprobación pasa a `status='approved'` dejando `total_actual_amount = NULL` y `admin_actuals_recorded_at = NULL`. El resumen de «cierres aprobados» del calendario incluye esa fila usando `cash_counted` (solo denominaciones) como **«Efectivo contado»** contra `total_counted` (todos los medios de pago) → produce una **diferencia ficticia enorme** (en la prueba: `+$ 536.527` sobre un cierre de `$ 674.527`) que se acumula como **«Sobra»** del periodo y altera el KPI «Diferencia Acumulada».
- Evidencia:
  - Navegador: click en **Aprobar** sobre «14 mar abr» (close #37 Daniela), dialog «¿Confirmas la aprobación… 14/04/2026?» → éxito. La fila entra a la tabla «Resumen de cierres aprobados» como fila #4: Total declarado `$ 674.527`, Efectivo contado `$ 138.000`, Diferencia `+$ 536.527` (verde). El TOTAL del periodo salta de `$1.801.085` a `$2.475.612` con `+$ 534.527` de sobra.
  - DB (post-aprobación): `cash_register_closes.id=37` → `status='approved', total_counted='674527.00', total_actual_amount=NULL, admin_actuals_recorded_at=NULL, approved_by=6`.
  - Código: `CashRegisterCloseController@approve` (L90+) no valida presencia de actuals; `CashRegisterClosePolicy` tampoco.
- Estado: **confirmado**

### Resolución (QA-CCC-002)

- **Fecha:** 2026-04-17
- **Estado:** resuelto
- **Archivos:** `convision-api/app/Http/Requests/Api/V1/CashRegisterClose/ApproveCashRegisterCloseRequest.php` (`withValidator`: si la acción del controlador es `approve` y el cierre no tiene `admin_actuals_recorded_at`, error de validación en `approve` con mensaje en español; no aplica a `returnToDraft` que comparte el mismo Form Request); `convision-api/tests/Feature/Api/V1/CashRegisterCloseControllerTest.php` (`test_admin_cannot_approve_submitted_close_without_admin_actuals`, `test_admin_can_approve_after_recording_actuals`).
- **Hecho:** `POST …/approve` responde **422** hasta que exista conciliación administrativa (`admin_actuals_recorded_at`); tras `PUT …/admin-actuals` la aprobación sigue respondiendo 200.

### QA-CCC-003 (MAYOR)
- Rol: **admin**
- URL: `http://localhost:4300/admin/cash-closes/advisor/:userId`
- Severidad: **mayor** (datos contables erróneos visibles al administrador)
- Pasos:
  1. Abrir calendario de un asesor con un cierre **enviado (submitted)** sin conciliación (ej. Daniela 14/04 antes de aprobar, o cualquier otro `submitted` con `admin_actuals_recorded_at=NULL`).
  2. Observar la fila **«Diferencia (cierre)»** de la matriz por columna-día y la columna **«Diferencia»** del Resumen.
- Esperado: para cierres sin conciliación, la celda debe mostrar `—` o «Pendiente conciliación» (no un número). Para borradores, tampoco debería pintarse un valor con semántica «sobra/falta».
- Observado: el servicio computa `variance = total_counted − actualTotal` donde `actualTotal` hace fallback a `denominations.sum('subtotal')` cuando `admin_actuals_recorded_at IS NULL` (ver `CashRegisterCloseController@formatCloseForCalendar` L258). Esto mezcla apples-vs-oranges: `total_counted` incluye TODOS los medios de pago (voucher, bancolombia, etc.) mientras que `denominations.sum` es solo efectivo físico. Resultado: para cualquier submitted/draft no conciliado, la columna «Diferencia» muestra un número exagerado (habitualmente cercano al total no-efectivo) y se colorea como si fuera sobrante/faltante real.
  - Ejemplos reales observados en el seed (calendario Daniela 10/04–23/04):
    - `14 abr (submitted)`: Diferencia = **+$ 536.527** (no real; es la suma de voucher + transferencias + sistecredito).
    - `16 abr (draft)` y `17 abr (draft)` muestran también valores de ~$ 286k–$ 400k en verde.
- Estado: **confirmado**

### Resolución (QA-CCC-003)

- **Fecha:** 2026-04-17
- **Estado:** resuelto
- **Archivos:** `convision-api/app/Http/Controllers/Api/V1/CashRegisterCloseController.php` (`formatCloseForCalendar` y `calendarForAdvisor`: sin `variance` ni total real de conciliación cuando `admin_actuals_recorded_at` es null; `approved_variance_total` y `approved_actual_total` en resumen suman solo valores no nulos; si no hay filas aprobadas los totales numéricos del pie siguen en 0; si hay filas pero todas sin conciliación, totales de diferencia y efectivo contado del pie son `null`); `convision-front/src/pages/admin/CashCloseCalendar.tsx` (`formatVariance` / `varianceTextClass` y celdas del resumen); `convision-front/src/services/cashRegisterCloseService.ts` (tipos `number | null`); `convision-api/tests/Feature/Api/V1/CashRegisterCloseControllerTest.php` (`test_calendar_close_variance_is_null_without_admin_actuals`).
- **Hecho:** Para cierres sin conciliación administrativa, la API devuelve `variance: null` y el front muestra «—» en gris neutro (sin semántica sobra/falta). El total `approved_variance_total` suma solo variances no nulas; si todas son `null`, el total es `null` (no se inventa 0 como suma reconciliada).

### QA-CCC-004 (MAYOR)
- Rol: **admin**
- URL: `http://localhost:4300/admin/cash-closes` (pestaña «Todos los cierres» y «Por asesor»)
- Severidad: **mayor** (KPI contradictorio)
- Pasos:
  1. Tener al menos un cierre en estado `submitted` o `draft` (en el seed: 4 pendientes — María 1, Laura 2, Daniela 1 + 2 draft).
  2. Entrar a `/admin/cash-closes`.
  3. Comparar el KPI **«Pendientes de Revisión»** con el contenido de la pestaña **«Por asesor»**.
- Esperado: «Pendientes de Revisión» debería contar las filas con `status IN ('submitted','draft')` visibles para admin (al menos `submitted`).
- Observado: el KPI muestra **0** mientras la pestaña «Por asesor» correctamente muestra «3 asesores con cierres pendientes hoy» y cada tarjeta indica 1–3 días pendientes (Daniela 3, Laura 2, María 1). Los números son inconsistentes.
- Evidencia: capturas de `/admin/cash-closes` con el KPI en `0` y las 3 tarjetas con badge «X días pendientes».
- Estado: **confirmado**

### Resolución (QA-CCC-004)

- **Fecha:** 2026-04-17
- **Estado:** resuelto
- **Archivos:** `convision-front/src/pages/admin/CashCloses.tsx` (`stats.pendingCount` en vista «Por asesor» ya suma `pending_count` de `filteredAdvisors`; primera tarjeta muestra «Asesores en vista» con su conteo para no contradecir la vista activa).
- **Hecho:** En «Por asesor» el KPI «Pendientes de Revisión» refleja el mismo total de pendientes que las tarjetas (`Σ pending_count`); la tarjeta previa «Cierres del Período» se renombra a «Asesores en vista» sólo en esta pestaña para que el contexto coincida.

### QA-CCC-005 (MAYOR)
- Rol: **admin**
- URL: `http://localhost:4300/admin/cash-closes/advisor/:userId`
- Severidad: **mayor** (UX de conciliación ambigua)
- Pasos:
  1. Abrir el calendario y localizar la tabla «Resumen de cierres aprobados».
  2. Comparar las columnas **«Diferencia»** y **«(−) Sobra (+) Falta»**.
- Esperado: dos columnas distintas deben aportar información distinta (p. ej. una contra el declarado y otra contra el arqueo en efectivo, o alguna con monto y otra con texto).
- Observado: ambas columnas renderizan **exactamente el mismo valor** y con el mismo colorcoding. El cálculo es `variance = advisor_total − actual_total`, es decir, negativo = sobra, positivo = falta. Eso es coherente con el header «(−) Sobra (+) Falta» pero la columna titulada «Diferencia» (sin signo) repite el mismo dato y además pinta verde/rojo con semántica ambigua: en el ejemplo, 13/04 muestra `-$2.000` en **rojo**, induciendo a pensar que hubo faltante cuando en realidad hubo **sobrante**.
- Evidencia: código `convision-front/src/pages/admin/CashCloseCalendar.tsx` L382–387: `<td>{formatVariance(day.variance)}</td>` aparece dos veces seguidas con idéntico arg y colorclass.
- Estado: **confirmado**

### Resolución (QA-CCC-005)

- **Fecha:** 2026-04-17
- **Estado:** resuelto
- **Archivos:** `convision-front/src/pages/admin/CashCloseCalendar.tsx` (`ApprovedResumePanel`: columnas de la tabla y del pie «TOTAL» colapsadas a una sola — `(−) Sobra (+) Falta`; `varianceTextClass` invierte la semántica: positivo=falta en rojo, negativo=sobra en verde).
- **Hecho:** Opción A aplicada. Ya no se duplica el mismo valor en dos columnas, y el color ahora coincide con el significado del header (sobrante=verde, faltante=rojo). Sin cambios en la API.

### QA-CCC-006 (MENOR)
- Rol: admin
- URL: `http://localhost:4300/admin/cash-closes` (pestaña «Por asesor»)
- Severidad: **menor** (typo visible)
- Pasos: abrir la pestaña «Por asesor»; leer el texto de conteo debajo de las tarjetas.
- Esperado: «3 asesores · 2 con más de 1 día pendiente».
- Observado: «3 asesore**\_**s · 2 con más de 1 día pendiente» — aparece un **espacio** entre «asesore» y «s», producto de una plantilla tipo `asesore{count !== 1 ? ' s' : ''}`.
- Estado: **confirmado**

### Resolución (QA-CCC-006)

- **Fecha:** 2026-04-17
- **Estado:** resuelto
- **Archivos:** `convision-front/src/pages/admin/CashCloses.tsx` (pie de «Por asesor»: `{len === 1 ? 'asesor' : 'asesores'}`).
- **Hecho:** Texto renderiza `N asesor(es) · …` sin espacio espurio.

### QA-CCC-007 (MENOR)
- Rol: admin
- URL: `http://localhost:4300/admin/cash-closes/advisor/:userId`
- Severidad: **menor** (a11y)
- Pasos: abrir el diálogo **«Aprobar cierre»** o **«Devolver cierre»**.
- Esperado: el `DialogContent` aporta un `aria-describedby` apuntando al texto descriptivo (Radix UI hint).
- Observado: consola muestra `Warning: Missing Description or aria-describedby={undefined} for {DialogContent}.` El componente `ConfirmDialog` no propaga una descripción accesible al content.
- Estado: **confirmado**

### Resolución (QA-CCC-007)

- **Fecha:** 2026-04-17
- **Estado:** resuelto
- **Archivos:** `convision-front/src/components/ui/ConfirmDialog.tsx` (`description` ahora se envuelve en `DialogDescription asChild` de shadcn/radix apuntando al `<p>` visible).
- **Hecho:** Radix detecta descripción accesible (`aria-describedby` vinculado al párrafo) y el warning desaparece al abrir Aprobar/Devolver.

### QA-CCC-008 (SUGERENCIA)
- Rol: admin
- URL: `http://localhost:4300/admin/cash-closes/advisor/:userId`
- Severidad: **sugerencia** (UX)
- Pasos: con la matriz visible, pulsar **«Ir a hoy»**.
- Esperado: el componente centra la columna de hoy y **reajusta** el rango `date_from/date_to` a `hoy−7 ... hoy+6` (como indica `handleGoToday` en `CashCloseCalendar.tsx` L169).
- Observado: la **scroll** al centro funciona (se mueve la matriz), pero el `state` `dateFrom/dateTo` permanece en el rango previo del usuario (p. ej. `10/04/2026 → 23/04/2026`) sin refetch del calendario. Esto es inocuo cuando hoy ya está en el rango; confuso cuando el usuario tenía un rango lejano.
- Estado: **confirmado** (se observó el scroll pero no el reset al rango canónico).

### Resolución (QA-CCC-008)

- **Fecha:** 2026-04-17
- **Estado:** resuelto
- **Archivos:** `convision-front/src/pages/admin/CashCloseCalendar.tsx` (`handleGoToday` ya reasigna `dateFrom = hoy − 7` y `dateTo = hoy + 6`; como el `queryKey` depende de ambos, `useQuery` refetch automáticamente el rango nuevo antes de centrar la columna).
- **Hecho:** «Ir a hoy» reinicia el rango canónico y vuelve a pedir el calendario aunque hoy quedara fuera del rango previo; el scroll se dispara tras el refetch.

### QA-CCC-009 (reapertura — ya reportado como QA-CC-002)
- Rol: admin
- URL: `http://localhost:4300/admin/cash-closes`, `http://localhost:4300/admin/cash-closes/advisor/:userId`
- Severidad: **menor** (descubribilidad)
- Pasos: pulsar **«Exportar»** en cualquiera de las dos vistas.
- Observado: el botón **sigue inerte**, sin `onClick`, sin toast ni navegación. Ya está presente en ambas vistas (lista admin y calendario por asesora).
- Evidencia: `convision-front/src/pages/admin/CashCloses.tsx` y `convision-front/src/pages/admin/CashCloseCalendar.tsx` L213–221 (`actions={<Button …>Exportar</Button>}` sin handler).
- Estado: **confirmado**

### Resolución (QA-CCC-009)

- **Fecha:** 2026-04-17
- **Estado:** parcial (placeholder)
- **Archivos:** `convision-front/src/pages/admin/CashCloses.tsx`, `convision-front/src/pages/admin/CashCloseCalendar.tsx` (ambos botones `Exportar` reciben el mismo `onClick` → `toast.info('Exportación disponible próximamente')`).
- **Hecho:** El botón deja de parecer roto: responde con toast informativo coherente en ambas pantallas. La exportación real queda pendiente como mejora futura.

### QA-CCC-010 (reapertura — ya reportado como QA-CC-003)
- Rol: receptionist
- URL: `http://localhost:4300/receptionist/cash-close-detail/:id`
- Severidad: **menor** (copy)
- Observado: el botón «Volver» del topbar muestra el literal **«Cierres de Caja»** aunque `navigate` va a `/receptionist/cash-close-history` (histórico).
- Estado: **confirmado** (reproducido con UI hoy).

### Resolución (QA-CCC-010)

- **Fecha:** 2026-04-17
- **Estado:** resuelto
- **Archivos:** `convision-front/src/pages/admin/CashCloseDetail.tsx` (label del back-button: `isAdmin ? 'Cierres de Caja' : 'Historial de cierres'`; el destino ya era coherente).
- **Hecho:** Para recepcionista el botón muestra «Historial de cierres» y navega a `/receptionist/cash-close-history`; admin mantiene «Cierres de Caja» hacia `/admin/cash-closes`.

---

## OK (sin incidencias) — alcance verificado con navegador

| Rol | Ruta | Notas |
|-----|------|-------|
| receptionist | `/login` | Login mgomez, dortiz y admin con password `password`, redirección correcta al dashboard de rol. |
| receptionist | `/receptionist/dashboard` | Carga widgets (citas, ventas, listas) sin error de consola. |
| receptionist | `/receptionist/cash-close-history` | Tabla de 11 cierres (mgomez) paginada; filtros fecha visibles; «Ver detalle» navega correctamente a `/receptionist/cash-close-detail/:id`. |
| receptionist | `/receptionist/cash-close-detail/:id` | Badge de estado correcto, totales por medio de pago correctos, tabla de denominaciones correcta. |
| admin | `/admin/cash-closes` · «Todos los cierres» | Tabla pagina 4 páginas con los 30 cierres; columna «Diferencia» coherente con signo por fila; KPI «Cierres del Período: 10 – Abril 2026» correcto para los aprobados del mes actual. |
| admin | `/admin/cash-closes` · «Por asesor» | Tarjetas por asesor con fechas pendientes correctas (3/1/2 días). |
| admin | `/admin/cash-closes/advisor/:userId` | Header con avatar, nombre, rol, rango de fechas, navegación `Volver` a listado. Matriz de días (header + status + acciones Aprobar/Devolver en submitted). |
| admin | Acción `POST …/approve` | Devuelve 200 y la fila pasa a `approved`. (La validación de actuals faltante está en QA-CCC-002.) |
| admin (seguridad) | `POST …/approve` como receptionist | (heredado de QA-CC-001) middleware `role:admin` → 403 esperado. |

---

## Limitaciones de esta corrida

- No se probó la pantalla de **«Valores reales»** (captura de actuals admin) que debería estar gateada en el flujo pre-aprobación. Si existe como paso separado (`AdminCashCloseActualsSection` parece existir en front), QA-CCC-002 debería verificar por qué no se bloquea la aprobación hasta completarla.
- No se probó exportación de reportes (la funcionalidad no está implementada — QA-CCC-009).
- No se probó el rol **laboratory** (fuera del alcance).
- Tests de backend afectados por QA-CCC-001: revisar `convision-api/tests/Feature/Api/V1/CashRegisterCloseControllerTest.php` — si hay test que asuma filtro por `close_date`, está desalineado del código actual.

---

## Handoff al agente de corrección

- **Recomendado:** `@convision-qa-gap-fixer` (cambios cruzados API + front + tests).
- **Cerrar en orden sugerido por impacto:**
  1. **QA-CCC-001** — Fix filtro `close_date` en `CashRegisterCloseController@index` (o soportarlo en `ApiFilterable`). Incluir test de integración que asegure 1-o-0 resultado.
  2. **QA-CCC-002** — Bloquear `approve` si `total_actual_amount` no fue registrado (422 con mensaje; o redirigir admin a pantalla de actuals).
  3. **QA-CCC-003** — En `formatCloseForCalendar`, no calcular `variance` para cierres sin conciliación: devolver `null` y que el front pinte `—`.
  4. **QA-CCC-004** — Incluir `submitted`/`draft` en `advisorsPending` o en el KPI «Pendientes de Revisión» (o cambiar el KPI a «Pendientes aprobados-solo»).
  5. **QA-CCC-005** — En `CashCloseCalendar.tsx`, decidir semántica distinta para «Diferencia» vs «(−) Sobra (+) Falta» o colapsar a una sola columna.
  6. **QA-CCC-006** — typo `asesore s` → `asesor(es)`.
  7. **QA-CCC-007** — Añadir `aria-describedby` al `DialogContent` dentro de `ConfirmDialog`.
  8. **QA-CCC-008** — En `handleGoToday`, además de scroll ajustar `dateFrom/dateTo` para forzar refetch si hoy queda fuera del rango actual.
  9. **QA-CCC-009** — Implementar o ocultar el botón **Exportar** en `CashCloses.tsx` y `CashCloseCalendar.tsx`.
  10. **QA-CCC-010** — En `CashCloseDetail.tsx`, etiquetar el back-button según el rol (`isAdmin ? 'Cierres de Caja' : 'Historial de cierres'`).

- **Comando sugerido:** «Con `@convision-qa-gap-fixer`, cerrar **QA-CCC-001** y **QA-CCC-002** usando `.planning/qa/FINDINGS-2026-04-17-cash-close-calendar.md` como fuente.»

---

## Apéndice: datos sembrados para reproducir

Script: `convision-api/storage/app/qa-seed.php` — crea (idempotente) las 3 recepcionistas demo y 32 cierres distribuidos en los últimos ~18 días. Ejecutar con:

```bash
docker exec convision-app php artisan tinker --execute="require storage_path('app/qa-seed.php');"
```

Usuarios creados:

| ID | Email | Nombre | Estado cierres |
|----|-------|--------|----------------|
| 10 | `mgomez@convision.com`  | María Gómez     | 10 approved, 1 submitted (16/04) |
| 12 | `lramirez@convision.com`| Laura Ramírez   | 9 approved, 2 submitted (15/04 y 16/04) |
| 13 | `dortiz@convision.com`  | Daniela Ortiz   | 7 approved, 1 submitted (14/04), 2 drafts (16/04 y hoy 17/04) |

Password común: `password`.
