---
status: gap-fix-applied
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
api_url: http://localhost:8001
started: 2026-05-08T16:25:00-05:00
updated: 2026-05-08T18:30:00-05:00
roles_tested: [receptionist, specialist, laboratory]
scenario: E2E paciente → cita → médico recomienda lente → asesor cierra venta (re-verificación post-fixes 2026-05-08)
gap_fix:
  agent: convision-qa-gap-fixer
  date: 2026-05-08
  resolved: [QA-V2-001, QA-V2-002, QA-V2-003, QA-V2-004, QA-V2-005, QA-V2-006, QA-V2-007]
  pending_manual_qa: [QA-V2-006]
---

# QA E2E v2 — Flujo Paciente / Cita / Recomendación / Venta

Re-ejecución end-to-end del escenario solicitado por el usuario:

1. Paciente llega → recepción crea/consulta paciente.
2. Recepción agenda cita.
3. Especialista gestiona la cita y emite recomendación de lente.
4. Asesor (recepción) ve la recomendación y cierra la venta (lente + montura), respetando la regla **asesor sin fórmula clínica**.

> **Política confirmada (memoria de proyecto):** el asesor (`receptionist`) **no debe ver** la fórmula clínica (esférico/cilindro/eje/AVcc/adición/DP). Solo debe ver la **recomendación** textual (tipo de lente · material · uso · tratamientos). Cualquier filtración constituye hallazgo bloqueante.

## Resumen ejecutivo

E2E ejecutado de extremo a extremo en una sesión con el backend Go reiniciado y el front Vite en `:4300`.

Datos generados:

- Paciente **#37** (Camila Andrea Restrepo QA0508v2) creado por la UI (vía workaround — ver QA-V2-003).
- Cita **#43** agendada en **Sede Centro** (`branch_id=3`) para el lunes **11 de mayo 2026 09:00**, con `specialist@convision.com`.
- Historia clínica **#17** + Prescripción **#12** completadas y firmadas (`signed_at = 2026-05-08T16:29:54-05:00`). Receta: OD `-1.50/-0.75 × 90° AV 20/20 DP32`, OI `-1.25/-0.50 × 85° AV 20/20 DP32`. Lente: Monofocal · Policarbonato · Permanente · Antirreflejo + Filtro luz azul.
- Venta **#12** cerrada por $714.000 (Subtotal $600.000 + IVA 19% = $114.000) con LEN-002 (Monofocal Policarbonato Antirreflejo · $240.000) + montura M9914 MAORI ($360.000). PDF de cliente generado automáticamente como guest URL (`/api/v1/guest/sales/12/pdf?token=…`).

Hallazgos: **7** abiertos (4 confirmados, 3 hipótesis/observaciones de UX). Los más impactantes:

- **QA-V2-001 (mayor)** — Las "RECOMENDADOS SEGÚN LA PRESCRIPCIÓN" en `/sales/new` no respetan el `lens_type` recetado: el doctor pide Monofocal Policarbonato Antirreflejo (LEN-002 existe en catálogo y lo cumple exactamente) pero el sistema sugiere Progresivo, Bifocal y Monofocal CR-39. LEN-002 no aparece. Resultado: el asesor pierde la sugerencia útil y debe ir manualmente al catálogo a buscar.
- **QA-V2-002 (menor)** — Esas mismas cards de "Recomendados" no son clicables; pintan precio y descripción pero no agregan al carrito. El usuario debe ir al catálogo para añadir.
- **QA-V2-006 (mayor)** — `laboratory@convision.com` (rol en API + seed local) es enviado a `/unauthorized` por el front; no existe ruta `/laboratory/*` montada. Esto efectivamente bloquea el módulo "Órdenes de laboratorio" para ese rol.

Privacidad **respetada** ✓:

- En `/receptionist/sales/new?appointment_id=43`: aparece banner "RECOMENDACIÓN DEL MÉDICO" con `Monofocal · Policarbonato · Uso permanente` + tratamientos `Antirreflejo, Filtro luz azul`. **Cero filtración** de esférico/cilindro/eje/AVcc/DP.
- API: `GET /api/v1/appointments/43/clinical-record` con token de receptionist → **403 forbidden**. `GET /api/v1/appointments/43` devuelve `prescription: null` para receptionist.

| Métrica | Valor |
|---|---|
| Pantallas/rutas verificadas | 11 |
| Hallazgos confirmados | 4 |
| Hipótesis / hallazgos UX | 3 |
| Roles probados | receptionist, specialist, laboratory |
| Datos creados | paciente #37, cita #43, clinical_record #17, prescription #12, sale #12 |

## Hallazgos (FAIL / GAP)

### QA-V2-001 — Recomendaciones de `/sales/new` no respetan el tipo de lente recetado
- **Rol:** receptionist
- **URL:** `http://localhost:4300/receptionist/sales/new?appointment_id=43`
- **Severidad:** mayor
- **Pasos:**
  1. Médico firma una prescripción con `lens_type=monofocal`, `lens_material=policarbonato`, `lens_use=permanente`, `treatments=[antirreflejo, filtro_luz_azul]` (cita #43).
  2. Asesor abre la venta `/receptionist/sales/new?appointment_id=43`.
  3. Observar el bloque "RECOMENDADOS SEGÚN LA PRESCRIPCIÓN".
- **Esperado:** el primer producto sugerido es **LEN-002 — Monofocal Policarbonato con Antirreflejo** ($240.000), porque coincide en tipo, material y al menos un tratamiento clave. Otros monofocales (LEN-001, LEN-003) podrían figurar como alternativas.
- **Observado:** las tres tarjetas son `LEN-005 Progresivo estándar Policarbonato` ($460.000), `LEN-004 Bifocal CR-39 FT28` ($320.000) y `LEN-003 Monofocal CR-39 con Filtro luz azul` ($220.000). Ninguna es monofocal **+** policarbonato. El producto perfecto (LEN-002) ni siquiera aparece.
- **Evidencia:** snapshot de `/sales/new?appointment_id=43`; catálogo `/receptionist/sales/catalog` muestra LEN-002 con descripción "Monofocal Policarbonato con Antirreflejo".
- **Impacto:** el asesor no obtiene una recomendación útil; debe ir al catálogo y elegir manualmente. Adicionalmente, si confía en la sugerencia, podría vender un Progresivo a un paciente con prescripción Monofocal — error clínico.
- **Estado:** resuelto (2026-05-08).

### Resolución QA-V2-001 (2026-05-08)
- **Causa raíz:** [`RecommendedProducts.tsx`](../../convision-front/src/components/sales/RecommendedProducts.tsx) llamaba a `lensService.searchLenses({ page: 1, perPage: 3 })` sin pasar nada relacionado con la prescripción del paciente. El componente nunca leía la fórmula firmada — siempre traía los primeros 3 lentes ordenados por `created_at,desc`, totalmente desacoplados de lo que el médico recetó.
- **Fix:** se agregó `useQuery` para `/api/v1/patients/${patientId}/latest-clinical-record` (mismo endpoint que ya consume [`PrescriptionRecommendationPanel.tsx`](../../convision-front/src/components/sales/PrescriptionRecommendationPanel.tsx)), se amplió el pool a `perPage: 20`, y se agregó `rankLensesByPrescription` que puntúa por:
  - `lens.type.name` ↔ `prescription.lens_type` (+100, descarte parcial si es otro tipo)
  - `lens.material.name` ↔ `prescription.lens_material` (+30)
  - cada `prescription.treatments[i]` reconocido en `lens.treatment.name` o `lens.description` (+10), con normalización Unicode/aliases (`antirreflejo` ⇔ `antireflejo`, `filtro_luz_azul` ⇔ `filtro_azul`, etc.).
  - Se ordena descendente y se devuelven los 3 primeros (con `score > 0` cuando los hay; si ninguno coincide, sigue mostrando los 3 mejor rankeados como fallback).
- **Archivos:** [`convision-front/src/components/sales/RecommendedProducts.tsx`](../../convision-front/src/components/sales/RecommendedProducts.tsx).
- **Cómo verificar (manual):** abrir `/receptionist/sales/new?appointment_id=43` con la fórmula firmada (Monofocal · Policarbonato · Antirreflejo + Filtro luz azul). El primer card debe ser **LEN-002 — Monofocal Policarbonato con Antirreflejo**; las alternativas deben seguir siendo monofocales.
- **Estado:** resuelto.

### QA-V2-002 — Tarjetas "Recomendados según la prescripción" no son clicables
- **Rol:** receptionist
- **URL:** `http://localhost:4300/receptionist/sales/new?appointment_id=43`
- **Severidad:** menor
- **Pasos:**
  1. Asesor abre `/sales/new?appointment_id=43` con la cita firmada.
  2. Click en cualquiera de las 3 tarjetas del bloque "RECOMENDADOS SEGÚN LA PRESCRIPCIÓN".
- **Esperado:** la tarjeta agrega el producto al carrito (o navega al detalle del producto).
- **Observado:** los contenedores son `<div>` sin handler. No agregan al carrito ni navegan. Solo se puede continuar haciendo "Explorar catálogo de productos".
- **Evidencia:** `Array.from(document.querySelectorAll('div')).filter(d => /Monofocal CR-39 con Filtro/.test(d.innerText) ...)` retorna `clickable:false` y `tag:"DIV"`.
- **Impacto:** UX engañosa — la sección parece accionable.
- **Estado:** resuelto (2026-05-08).

### Resolución QA-V2-002 (2026-05-08)
- **Causa raíz:** el contenedor de la card era un `<div>` y solo el botón circular `+` (24×24 px) abajo a la derecha disparaba `onAdd`. El usuario natural clica el cuerpo del card.
- **Fix:** `RecommendedCard` ahora es un `<button type="button">` completo. Toda la superficie es clicable, agrega `aria-label` ("Agregar … al carrito" / "… ya agregado"), estado `disabled` cuando `isAdded`, hover ring en `#8753ef`, y el icono `Plus`/`Check` queda como `<span aria-hidden>` decorativo.
- **Archivos:** [`convision-front/src/components/sales/RecommendedProducts.tsx`](../../convision-front/src/components/sales/RecommendedProducts.tsx).
- **Cómo verificar:** click en cualquier punto de un card recomendado → debe quedar agregado al carrito (icono cambia a check verde, fila aparece en `ProductList`). Card ya agregado queda no-clicable y con check verde.
- **Estado:** resuelto.

### QA-V2-003 — Mensaje de validación "Required" en inglés en el formulario de paciente
- **Rol:** receptionist
- **URL:** `http://localhost:4300/receptionist/patients/new`
- **Severidad:** menor (copy)
- **Pasos:**
  1. Llenar todos los campos obligatorios excepto **Género**.
  2. Click "Guardar paciente" o "Siguiente".
- **Esperado:** mensaje en español tipo "El género es obligatorio".
- **Observado:** mensaje literal `Required` en inglés debajo del radiogroup.
- **Evidencia:** `parentText: "Género * | Masculino | Femenino | Otro |  | Required"`.
- **Política violada:** `convision-front/CLAUDE.md` exige "All UI strings in **Spanish**".
- **Estado:** resuelto (2026-05-08).

### Resolución QA-V2-003 (2026-05-08)
- **Causa raíz:** el campo `gender` se declaraba como `z.enum(['male', 'female', 'other'])` sin opciones de error. Cuando el valor era `undefined`, Zod emite por defecto `"Required"` (en inglés), saltándose la convención del proyecto que exige UI en español (`convision-front/CLAUDE.md`).
- **Fix:** se agregaron `required_error` e `invalid_type_error` al `z.enum`:
  ```ts
  gender: z.enum(['male', 'female', 'other'], {
    required_error: 'El género es requerido',
    invalid_type_error: 'Selecciona un género válido',
  }),
  ```
- **Archivos:** [`convision-front/src/pages/receptionist/NewPatient.tsx`](../../convision-front/src/pages/receptionist/NewPatient.tsx) (línea ~71).
- **Cómo verificar:** abrir `/receptionist/patients/new`, llenar todo excepto Género, click "Guardar paciente" → el inline debe decir **"El género es requerido"** y el toast debe mostrar el mismo texto.
- **Estado:** resuelto.

### QA-V2-004 — Tab "Información personal" no resalta los errores cuando bloquea el guardado
- **Rol:** receptionist
- **URL:** `http://localhost:4300/receptionist/patients/new`
- **Severidad:** menor (UX)
- **Pasos:**
  1. Click "Guardar paciente" con campo Género faltante.
- **Esperado:** la pestaña "Información personal" debería mostrar un badge de error y/o aparecer un toast resumen ("Hay 1 campo sin completar"). El botón en el header debería disparar feedback visible además del inline.
- **Observado:** no se dispara request, solo aparece el inline "Required". Si el usuario hizo scroll fuera de la sección, no nota el error y se queda sin saber por qué no guarda.
- **Evidencia:** ningún POST a `/api/v1/patients` tras el primer click; consola sin errores; ningún toast en el `<region role="status">`.
- **Estado:** resuelto (2026-05-08).

### Resolución QA-V2-004 (2026-05-08)
- **Causa raíz:** `onSubmitError` ya conmutaba la pestaña con error y disparaba un toast `destructive`, pero (a) el toast usaba `role="alert"` y el QA buscaba `role="status"`, generando la sensación de "no pasa nada"; (b) las pestañas no tenían indicador visual del error; y (c) no había scroll automático al primer campo en falta.
- **Fix:** en [`convision-front/src/pages/receptionist/NewPatient.tsx`](../../convision-front/src/pages/receptionist/NewPatient.tsx):
  - se agregó `errorFields` + `stepHasErrors(key)` derivado de `STEP_REQUIRED_FIELDS`;
  - cada `<button>` de pestaña ahora pinta texto rojo + dot rojo (`size-1.5 rounded-full bg-red-500`) cuando su step tiene errores y no es la activa;
  - `onSubmitError` arma un summary `"Hay N campos sin completar. <primer mensaje>"` cuando hay >1 error y, vía `requestAnimationFrame`, hace `scrollIntoView({behavior:'smooth', block:'center'})` + `focus({preventScroll:true})` sobre el primer campo errante;
  - se agregó `id="gender" scroll-mt-24` al wrapper del `RadioGroup` para que el scroll-target funcione cuando el campo en falta es Género.
- **Archivos:** [`convision-front/src/pages/receptionist/NewPatient.tsx`](../../convision-front/src/pages/receptionist/NewPatient.tsx).
- **Cómo verificar:** intentar guardar con Género vacío → la pestaña "Información personal" muestra punto rojo y texto rojo, aparece toast "Faltan datos" con el resumen, y la página hace scroll automático al radiogroup de Género.
- **Estado:** resuelto.

### QA-V2-005 — `/receptionist/sales/catalog` sin appointment ni cliente permite construir carrito
- **Rol:** receptionist
- **URL:** `http://localhost:4300/receptionist/sales/catalog` (sin query params)
- **Severidad:** menor / sugerencia
- **Pasos:**
  1. Recepcionista loguea, va al catálogo directamente sin pasar por `/sales/new`.
  2. Click "Agregar al Carrito" en cualquier producto.
- **Esperado:** o bien el catálogo exige primero un cliente (modal/redirect), o se muestra un aviso permanente "Selecciona un cliente para asociar la venta".
- **Observado:** se permite agregar al carrito sin cliente; el indicador "Cliente: …" no aparece. La validación recién ocurre al final.
- **Evidencia:** snapshot del catálogo sin recuadro de cliente y carrito numerado.
- **Estado:** parcial — UX resuelto (2026-05-08); el bloqueo final lo aplica `useNewSale.submitSale` al validar `selectedPatient`.

### Resolución QA-V2-005 (2026-05-08)
- **Causa raíz:** el catálogo nunca avisaba al asesor que la venta no tenía cliente asociado (`saleData?.patientId == null`). El indicador "Cliente: …" en el topbar solo se renderizaba si había `patientName`, lo cual era invisible cuando faltaba.
- **Fix (UX, alcance acordado con el usuario — `parcial`):** banner amarillo persistente debajo del topbar cuando `!saleData?.patientId`, con texto **"Selecciona un cliente para asociar la venta. Sin cliente no podrás finalizar la compra."** y CTA **"Volver a Nueva Venta"** que navega a `/receptionist/sales/new`. El bloqueo duro del envío sigue residiendo en `NewSaleTopbar` (`isDisabled = !sale.selectedPatient`) — no se duplica la validación.
- **Archivos:** [`convision-front/src/pages/receptionist/SalesCatalog.tsx`](../../convision-front/src/pages/receptionist/SalesCatalog.tsx) (banner insertado entre topbar y body).
- **Cómo verificar:** ir directo a `/receptionist/sales/catalog` sin pasar por `/sales/new` → banner naranja visible inmediatamente, sin bloquear que el asesor pueda agregar productos al carrito.
- **Estado:** parcial (UX cubierto; investigar si conviene endurecer la guarda al inicio en una iteración futura — fuera de alcance acordado).

### QA-V2-006 — Rol `laboratory` válido en API queda bloqueado en `/unauthorized`
- **Rol:** laboratory (`laboratory@convision.com` / `password`)
- **URL:** `http://localhost:4300/login` → tras login → `http://localhost:4300/unauthorized`
- **Severidad:** mayor (gap funcional)
- **Pasos:**
  1. `POST /api/v1/auth/login` con `laboratory@convision.com/password` → 200 + JWT con `role: "laboratory"`.
  2. UI de login redirige a `/unauthorized` con texto "Acceso Denegado".
- **Esperado:** ya sea (a) un dashboard `/laboratory/dashboard` con módulo "Órdenes de Laboratorio", o (b) si el rol está descontinuado, dejar de crear el seed `EnsureLocalDevUsers` para evitar la inconsistencia.
- **Observado:** la sesión arranca con sidebar de admin completa por estado residual del navegador (cuando ya hay token previo) — vista altamente inconsistente; con login limpio el resultado es `/unauthorized`.
- **Evidencia:** `docs/QA_MAPA_EXPLORACION.md` ya documenta este gap; el archivo `convision-api-golang/internal/platform/storage/postgres/dev_users.go` sigue creando el usuario.
- **Impacto:** el rol "laboratory" del backend queda inalcanzable desde el front. Cualquier feature de laboratorio es inutilizable para usuarios no-admin.
- **Estado:** resuelto (2026-05-08) — pendiente regresión QA manual.

### Resolución QA-V2-006 (2026-05-08)
- **Decisión de producto (acordada con el usuario):** mantener el rol `laboratory` y montar `/laboratory/*` reutilizando las vistas admin de `laboratory-orders`.
- **Causa raíz:** el bloque `/laboratory/*` en [`App.tsx`](../../convision-front/src/App.tsx) solo exponía `lab-orders`, `lab-orders/:id` y `profile`, ambos importados desde la versión receptionist. El redirect post-login (`/laboratory/lab-orders`) sí existía, pero faltaba toda la cadena de gestión (notify-client, confirm-shipment/reception, assign-drawer, confirm-delivery, new, laboratory-status), lo que dejaba al rol funcionalmente bloqueado.
- **Fix:** en [`App.tsx`](../../convision-front/src/App.tsx) bajo `path: "/laboratory"` se reemplazaron los componentes `Receptionist*` por los admin existentes y se montaron las rutas:
  - `dashboard` → `Navigate to /laboratory/lab-orders`
  - `lab-orders` → `LaboratoryOrders` (admin)
  - `lab-orders/new` → `NewLaboratoryOrder`
  - `lab-orders/:id` → `LaboratoryOrderDetail`
  - `lab-orders/:id/notify-client` → `AdminNotifyClient`
  - `lab-orders/:id/confirm-shipment` → `ConfirmShipment basePath="/laboratory/lab-orders"`
  - `lab-orders/:id/confirm-reception` → `ConfirmReception basePath="/laboratory/lab-orders"`
  - `lab-orders/:id/assign-drawer` → `AssignDrawer basePath="/laboratory/lab-orders"`
  - `lab-orders/:id/confirm-delivery` → `ConfirmDelivery basePath="/laboratory/lab-orders"`
  - `laboratory-status` → `LaboratoryStatus`
  - `profile` → `Profile`
  - `index` → redirige a `/laboratory/lab-orders` (igual que antes).
  - El guard sigue siendo `BranchProtectedRoute allowedRoles={['laboratory', 'admin']}`. El usuario seed `laboratory@convision.com` ya recibe asignación de sede (`ensureDevUserBranchAssignmentIfNeeded` lo cubre), así que tras `/select-branch` el rol cae en `LaboratoryOrders` con el layout admin.
- **Archivos:** [`convision-front/src/App.tsx`](../../convision-front/src/App.tsx) (bloque `path: "/laboratory"`, sin nuevos imports — todos los componentes admin ya estaban importados arriba).
- **Cómo verificar (manual):**
  1. `POST /api/v1/auth/login` con `laboratory@convision.com / password`.
  2. UI redirige a `/select-branch` (porque el laboratory no tenía branch elegida en sesión); seleccionar la sede sembrada y continuar.
  3. Aterriza en `/laboratory/lab-orders` con el listado completo de órdenes y CTAs (Nueva orden, Estado, etc.).
  4. Probar abrir `/laboratory/lab-orders/:id`, `confirm-shipment`, `assign-drawer`, etc.
- **Estado:** resuelto a nivel de routing/rol; **pendiente QA manual** del recorrido completo (no se ejecutó browser-driver re-run en esta corrida porque el FINDINGS lo deja como handoff humano).

### QA-V2-007 — Especialista en la "CITA VINCULADA" se muestra como "Specialist" sin apellido
- **Rol:** receptionist
- **URL:** `http://localhost:4300/receptionist/sales/new?appointment_id=43`
- **Severidad:** sugerencia (copy)
- **Pasos:**
  1. Asesor abre venta vinculada a cita #43.
  2. Observar bloque "CITA VINCULADA".
- **Esperado:** "Dr. <Nombre> <Apellido>" (datos seed → "Specialist Demo" o equivalente con apellido).
- **Observado:** "#C-0043 · Dr. Specialist · 11 de may de 2026". Solo el nombre, sin apellido. Es feo y poco profesional para un comprobante visible al cliente.
- **Evidencia:** snapshot de `/sales/new`.
- **Estado:** resuelto (2026-05-08).

### Resolución QA-V2-007 (2026-05-08)
- **Causa raíz:** [`RecommendedProducts.tsx`](../../convision-front/src/components/sales/RecommendedProducts.tsx) leía `appointment.specialist?.name` y solo eso. El backend Go ya expone `last_name` en `UserResource` ([`handler.go`](../../convision-api-golang/internal/transport/http/v1/handler.go) líneas 58-89), por lo que el front estaba descartando el dato.
- **Fix:** se concatena `[specialist?.name, specialist?.last_name].filter(Boolean).join(' ')` y se renderiza `Dr. Specialist Demo` en el bloque "CITA VINCULADA". Si solo viene `name`, sigue mostrando solo el nombre (compatibilidad).
- **Archivos:** [`convision-front/src/components/sales/RecommendedProducts.tsx`](../../convision-front/src/components/sales/RecommendedProducts.tsx).
- **Cómo verificar:** `/receptionist/sales/new?appointment_id=43` → bloque CITA VINCULADA debe leer **"#C-0043 · Dr. Specialist Demo · 11 de may de 2026"**.
- **Estado:** resuelto.

## Resumen GAP-FIX (2026-05-08)

| ID | Severidad | Estado |
|----|-----------|--------|
| QA-V2-001 | mayor | resuelto |
| QA-V2-002 | menor | resuelto |
| QA-V2-003 | menor | resuelto |
| QA-V2-004 | menor | resuelto |
| QA-V2-005 | menor / sugerencia | parcial (UX cubierto; bloqueo final ya existía) |
| QA-V2-006 | mayor | resuelto — **pendiente QA manual** |
| QA-V2-007 | sugerencia | resuelto |

**Archivos tocados (4):**
- [`convision-front/src/components/sales/RecommendedProducts.tsx`](../../convision-front/src/components/sales/RecommendedProducts.tsx) — V2-001, V2-002, V2-007
- [`convision-front/src/pages/receptionist/NewPatient.tsx`](../../convision-front/src/pages/receptionist/NewPatient.tsx) — V2-003, V2-004
- [`convision-front/src/pages/receptionist/SalesCatalog.tsx`](../../convision-front/src/pages/receptionist/SalesCatalog.tsx) — V2-005
- [`convision-front/src/App.tsx`](../../convision-front/src/App.tsx) — V2-006

**Verificación realizada:**
- `npx eslint` sobre los 4 archivos: **0 nuevos errores**, solo 4 warnings pre-existentes en `NewPatient.tsx` (`react-hooks/exhaustive-deps` que ya estaban antes de esta corrida).
- Validación browser-driver: **NO se ejecutó** en esta corrida — el agente `convision-qa-gap-fixer` corrige y verifica estáticamente; la re-validación en navegador la realiza nuevamente `convision-qa-explorer` o el QA humano (especialmente importante para QA-V2-006 que requiere login con rol `laboratory`).

**Commits:** según pedido del usuario, no se generaron commits — los cambios quedan en el working tree para revisión manual de diffs.

## OK (sin incidencias)

Rutas y comportamientos validados en esta sesión:

| Rol | Ruta / Acción | Notas |
|-----|---------------|-------|
| receptionist | `/login` + `/select-branch` (Sede Centro) → `/receptionist/dashboard` | Login + selección de sede sin error. |
| receptionist | `/receptionist/patients/new` | Paciente #37 creado tras seleccionar género (POST `/api/v1/patients` → 201). Date picker funcional con selectores año/mes. |
| receptionist | `/receptionist/appointments/new` | Wizard 4 pasos OK; búsqueda de paciente, selección de especialista, calendario, slots. POST `/api/v1/appointments` → 201, cita #43. |
| receptionist | `/receptionist/appointments` | Lista; filtra por hoy + branch_id. |
| specialist | `/specialist/appointments/43` | Toma de cita (POST `/take` → 200), creación clínical record (POST → 201), prescripción (PUT → 200). |
| specialist | `/specialist/appointments/43/prescription-preview` | Vista previa correcta de la fórmula y firma con confirmación de TP CTNPO; POST `/sign` → 200. Cita pasa a `completed`. |
| receptionist | `/receptionist/sales/new?appointment_id=43` | Banner "RECOMENDACIÓN DEL MÉDICO" muestra solo tipo/material/uso/tratamientos. Sin filtración numérica. |
| receptionist | `/receptionist/sales/catalog?appointment_id=43` | Lista de 5 lentes (LEN-001..LEN-005) + monturas. Botón "Agregar al Carrito" sí responde aquí. |
| receptionist | `Completar Venta` | POST `/api/v1/sales` → 201 (sale #12). Subtotal $600.000 + IVA 19% = $714.000. PDF guest token generado en nueva pestaña. |
| backend | `GET /clinical-record` con token receptionist | 403 forbidden — privacidad clínica respetada. |
| backend | `GET /appointments/43` con token receptionist | `prescription: null` — privacidad clínica respetada. |
| laboratory | `/login` con seed `laboratory@convision.com` | Front redirige a `/unauthorized` (ver QA-V2-006); el comportamiento al menos es **determinista**. |

## Handoff al agente de corrección

**Recomendado:** usar `convision-qa-gap-fixer` con la lista priorizada:

1. **QA-V2-001** (mayor) — corregir el algoritmo de "RECOMENDADOS SEGÚN LA PRESCRIPCIÓN" en la página de Nueva Venta para que filtre por `lens_type === prescription.lens_type` y boostee coincidencias de `lens_material` + `treatments`. Buscar el componente/servicio en `convision-front/src/pages/receptionist/sales/` y el endpoint que devuelve recomendaciones (probablemente `lens-recommendation`).
2. **QA-V2-006** (mayor) — definir si el rol `laboratory` debe seguir vivo. Si sí, montar `/laboratory/dashboard` y rutas relacionadas en `App.tsx`; si no, retirar al usuario de `dev_users.go` y de `docs/CREDENCIALES_PRUEBA_ROLES.md`.
3. **QA-V2-002** (menor) — convertir las cards de "Recomendados" en `<button>` clicables que agreguen al carrito en un click.
4. **QA-V2-003** (menor) — traducir el mensaje Zod por defecto a español en el resolver del formulario de paciente (probablemente `convision-front/src/pages/receptionist/patients/PatientFormPage.tsx` o el schema asociado).
5. **QA-V2-004** (menor) — al fallar validación, hacer scroll hacia el primer error y/o pintar la pestaña "Información personal" con badge rojo + toast resumen ("Hay X campos sin completar").
6. **QA-V2-007** (sugerencia) — usar `name + ' ' + last_name` (o `full_name`) al renderizar el especialista en la "CITA VINCULADA".
7. **QA-V2-005** (hipótesis) — investigar si `/receptionist/sales/catalog` sin cliente se valida al final del flujo; si no, agregar guarda al inicio.

**Comando sugerido:**

> Con `@convision-qa-gap-fixer`, cerrar QA-V2-001…QA-V2-007 usando `.planning/qa/FINDINGS-2026-05-08-e2e-paciente-venta-v2.md` como fuente.
