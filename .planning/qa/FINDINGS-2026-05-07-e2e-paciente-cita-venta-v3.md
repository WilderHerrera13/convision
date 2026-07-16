---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
api_url: http://localhost:8001
started: 2026-05-07T19:31:00-05:00
updated: 2026-05-07T19:45:00-05:00
roles_tested: [receptionist, specialist]
scenario: "E2E paciente-cita-venta: paciente llega → recepción agenda cita → médico gestiona cita y recomienda lente → asesor cierra la venta con lente + montura"
sede_de_trabajo: "Sede Centro (id=3, Cali)"
artefactos_creados:
  - "Paciente #33 — QA Paciente E2E Cita Venta — CC QA1778200522"
  - "Cita #38 — specialist_id=9 (huérfana, ver QA-009)"
  - "Cita #39 — specialist_id=2 (specialist@convision.com)"
  - "Clinical Record #13 — appointment 39, status=signed"
  - "Prescription #8 — progresivo · policarbonato · permanente · antirreflejo + filtro_luz_azul"
  - "Venta — NO se pudo cerrar (ver QA-006/QA-007/QA-008)"
---

# QA E2E — Paciente → Cita → Prescripción → Venta (2026-05-07)

## Resumen ejecutivo

- Pantallas verificadas: login, select-branch, recepcionista dashboard, /receptionist/patients/new, /receptionist/appointments/{id}, /receptionist/sales/new, /specialist/dashboard, /specialist/appointments/{id} (consulta), /specialist/appointments/{id}/prescription-preview, dialog "Seleccionar Lentes".
- Hallazgos confirmados: 13 (4 bloqueantes/críticos, 5 mayores, 4 menores)
- Hipótesis / sin evidencia clara: 2
- Conclusión: **el flujo E2E del escenario no se puede completar end-to-end por la UI** sin intervención manual / API. Los puntos de fricción más graves son:
  1. **El asesor no recibe la prescripción del especialista** en el diálogo "Seleccionar Lentes" ni en /receptionist/sales/new — pierde el contexto clínico (QA-001, bloqueante).
  2. **La cita queda en `in_progress` después de firmar la fórmula** — el asesor no la ve en "Cola de ventas" hasta que alguien la marca completed manualmente (QA-002, bloqueante).
  3. **GET /api/v1/prescriptions devuelve error SQL 42P01** (`missing FROM-clause entry for table "prescriptions"`) — bug de backend; la lista global de fórmulas está rota (QA-003, bloqueante).
  4. **/receptionist/sales/new?appointmentId=39 no precarga paciente, prescripción ni lentes** — la venta arranca de cero (QA-004, mayor).
- Adicional: la automatización detectó **regresión en clicks de la SPA** (varios componentes ignoran clicks externos sintéticos pero responden a invocación directa del fiber) — afecta tests automatizados; ver QA-013.

> **Nota:** Las pruebas se ejecutaron tras `make build && ./bin/convision-api` (Go reiniciado). El front estaba ya en :4300 (`vite`).

## Hallazgos (FAIL / GAP)

```text
### QA-001
- Rol: receptionist (asesor)
- URL: http://localhost:4300/receptionist/appointments/39 → diálogo "Seleccionar Lentes" + http://localhost:4300/receptionist/sales/new?appointmentId=39
- Severidad: bloqueante
- Pasos:
  1. Como recepcionista, abrir cita 39 (paciente con prescripción firmada por el especialista — progresivo/policarbonato/permanente + AR + luz azul).
  2. Pulsar "Seleccionar Lentes".
  3. Observar el diálogo: lista catálogos planos sin la receta del especialista visible.
  4. Continuar a /receptionist/sales/new?appointmentId=39: tampoco aparece la fórmula.
- Esperado: el asesor ve resumen de la prescripción (Tipo: progresivo, Material: policarbonato, Tratamientos: AR + luz azul, esférico/cilindro/eje OD/OI, adición, DP) y un filtro automático de inventario de lentes que cumpla esas especificaciones.
- Observado: el diálogo lista monturas y lentes mezclados, columnas "Tipo:", "Material:" y "Tratamiento:" vacías; no hay panel con la receta del especialista. La página /receptionist/sales/new tampoco la muestra.
- Evidencia: snapshot del dialog (43 productos visibles, todos con campos Tipo/Material/Tratamiento vacíos); /api/v1/appointments/39 → `prescription: null` aunque la fórmula está en `clinical_record.prescription` (id=8).
- Estado: confirmado
- Impacto: rompe la promesa del flujo "el asesor sabe qué tipo de lentes ofrecer".

### QA-002
- Rol: specialist + receptionist
- URL: /specialist/appointments/{id}/prescription-preview → /receptionist/dashboard
- Severidad: bloqueante
- Pasos:
  1. Como especialista, completar formula y pulsar "Firmar y emitir →" en /specialist/appointments/39/prescription-preview.
  2. En el diálogo, marcar checkbox y "Firmar y completar".
  3. La SPA navega a /specialist/appointments y muestra toast "Fórmula óptica guardada".
  4. Como recepcionista, abrir el dashboard.
- Esperado: la cita aparece en "Cola de ventas" como "Lista".
- Observado: appointment.status = `in_progress`, no aparece en cola. Solo aparece después de que un agente externo ejecute `PUT /api/v1/appointments/39 status=completed`. La acción "Firmar y emitir" no transiciona la cita.
- Evidencia:
  - `GET /api/v1/appointments/39` → `"status":"in_progress"` justo tras firmar.
  - Toast "Fórmula óptica guardada" sin mensaje de cierre de cita.
- Estado: confirmado

### QA-003
- Rol: receptionist (afecta a todos)
- URL: GET http://localhost:8001/api/v1/prescriptions?per_page=5 (Auth + X-Branch-Id: 3)
- Severidad: bloqueante (regresión backend)
- Pasos:
  1. `curl -H "Authorization: Bearer $TOKEN" -H "X-Branch-Id: 3" 'http://localhost:8001/api/v1/prescriptions?per_page=5'`
- Esperado: lista paginada de prescripciones de la sede.
- Observado: 500 / `{"message":"ERROR: missing FROM-clause entry for table \"prescriptions\" (SQLSTATE 42P01)"}`
- Evidencia: respuesta literal del endpoint.
- Estado: confirmado
- Hipótesis sobre causa: un join referencia `prescriptions` sin un `FROM prescriptions` (probable error en repositorio Go/Gorm). Verificar `internal/platform/storage/postgres/prescription_repository.go` o servicio.

### QA-004
- Rol: receptionist (asesor)
- URL: http://localhost:4300/receptionist/sales/new?appointmentId=39
- Severidad: mayor
- Pasos:
  1. En cola de ventas, "Iniciar venta" (que abre /receptionist/appointments/39 en modo asesor).
  2. Pulsar "Seleccionar Lentes" → agregar MAORI FH2208 → en algún punto el diálogo se cierra y termina en /receptionist/appointments/39.
  3. Navegar manualmente a /receptionist/sales/new?appointmentId=39.
- Esperado:
  - Cliente pre-cargado (paciente 33).
  - Lente seleccionado en "Seleccionar Lentes" agregado al carrito.
  - Resumen de la prescripción del especialista visible.
- Observado:
  - Campo "Cliente" vacío, hay que buscar manualmente.
  - Resumen de Compra: "No hay productos agregados" (la montura del paso anterior se perdió).
  - Sin referencia a la cita 39 ni a la fórmula.
- Estado: confirmado

### QA-005
- Rol: receptionist (asesor)
- URL: diálogo "Seleccionar Lentes para la Venta" en /receptionist/appointments/39
- Severidad: mayor (UX / nomenclatura)
- Pasos:
  1. Abrir el diálogo.
- Esperado: si el título dice "Lentes", el contenido debe ser lentes oftálmicos (con tipo, material, tratamiento, esfera/cilindro). Las monturas deberían tener un selector aparte.
- Observado: el catálogo mezcla monturas (MAORI, BOY LAN, NEWLOOK, etc.) bajo el título "Lentes Disponibles". Las columnas "Tipo:", "Material:", "Tratamiento:" están vacías para todos los registros visibles.
- Estado: confirmado

### QA-006
- Rol: specialist
- URL: GET /api/v1/appointments/39
- Severidad: mayor
- Pasos:
  1. Tras firmar prescripción (clinical_record_id=13, prescription_id=8 vía /clinical-record).
  2. `GET /api/v1/appointments/39` con cualquier rol.
- Esperado: el campo `prescription` del payload de cita refleja la fórmula firmada.
- Observado: `prescription: null` en la cita aunque existe `clinical_record_id` y `prescription_id` válidos. Solo `GET /api/v1/appointments/{id}/clinical-record` lo expone, y solo a especialistas.
- Estado: confirmado

### QA-007
- Rol: receptionist
- URL: GET /api/v1/appointments/39/clinical-record
- Severidad: mayor (RBAC vs flujo de venta)
- Pasos:
  1. `curl` con token recepcionista + X-Branch-Id: 3.
- Esperado: el asesor puede leer al menos el resumen de la prescripción para preparar la venta.
- Observado: `403 forbidden: insufficient permissions`. Combinado con QA-006 implica que el asesor no tiene ningún canal API para conocer la receta.
- Estado: confirmado

### QA-008
- Rol: specialist
- URL: agenda /specialist/dashboard, GET /api/v1/appointments con specialist_id=2
- Severidad: mayor
- Pasos:
  1. Crear dos citas en Sede Centro: una con specialist_id=9 (abermudez) y otra con specialist_id=2 (specialist@convision.com).
  2. Login como specialist@convision.com → Sede Centro.
  3. Revisar "Tu agenda de hoy".
- Esperado: ver solo la cita asignada a specialist_id=2.
- Observado: el especialista 2 ve ambas citas (la de specialist 9 también). No hay filtro por `specialist_id` en la agenda del dashboard.
- Estado: confirmado

### QA-009
- Rol: admin / receptionist
- URL: POST /api/v1/appointments con specialist_id=9 (abermudez@convision.com)
- Severidad: mayor (cita huérfana)
- Pasos:
  1. Asignar una cita al especialista cuyo email es `abermudez@convision.com` (id=9).
  2. Intentar login con ese usuario.
- Esperado: o no se permite asignarle citas si no tiene sede, o se le permite iniciar sesión.
- Observado:
  - `POST /auth/login abermudez@convision.com password` → `401 "No tienes ninguna sede asignada..."` (correcto desde una perspectiva).
  - PERO se le pueden asignar citas que él jamás podrá atender.
- Estado: confirmado
- Sugerencia: validar al crear cita que el `specialist_id` tenga al menos una sede activa coincidente con el `branch_id` del appointment.

### QA-010
- Rol: receptionist
- URL: PUT /api/v1/appointments/38 con `specialist_id=2`
- Severidad: mayor (silently ignored field)
- Pasos:
  1. `PUT /api/v1/appointments/38 {... specialist_id: 2 ...}`.
- Esperado: actualiza el specialist_id o devuelve error 422.
- Observado: status 200, body devuelve `specialist_id: 9` (campo ignorado silenciosamente). No hay forma de reasignar especialista.
- Estado: confirmado

### QA-011
- Rol: receptionist
- URL: POST /api/v1/patients (con `identification_type: "CC"`) y POST /api/v1/appointments (con `consultation_type: "first_consult"`)
- Severidad: menor (silent drop)
- Pasos:
  1. `POST /patients` body con `identification_type: "CC"`.
  2. `POST /appointments` body con `consultation_type: "first_consult"`.
- Esperado: el campo se persiste o el endpoint responde 422.
- Observado: 200 OK; el campo regresa `null`. Validador o mapper ignora el campo.
- Estado: confirmado

### QA-012
- Rol: cualquiera con front
- URL: agenda dashboard vs /specialist/appointments/{id}
- Severidad: menor (TZ inconsistente)
- Pasos:
  1. Crear cita scheduled_at = `2026-05-07T23:00:00Z` (UTC, equivale a 18:00 -05:00 Bogotá).
  2. Comparar el rendering entre dashboard y detalle.
- Esperado: misma hora en todas las vistas.
- Observado:
  - Dashboard recepcionista/especialista: "11:00 PM" (parece UTC).
  - Detalle de cita / consulta: "Jueves, 7 may · 6:00 PM" (parece local UTC-5).
- Estado: confirmado
- Notas: el sandbox del MCP probablemente usa UTC; aún así el front debería normalizar (o forzar TZ Bogotá).

### QA-013
- Rol: tester (regresión automatización)
- URL: /select-branch, /receptionist/dashboard, /receptionist/patients/new, modal "Firmar fórmula óptica"
- Severidad: mayor (afecta tests automatizados)
- Pasos:
  1. Lanzar Playwright contra /select-branch, intentar `click()` en una tarjeta de sede.
- Esperado: el handler `onClick` del botón actualiza estado React y habilita "Continuar".
- Observado:
  - El click vía Playwright (eventos sintéticos del MCP de navegador) NO dispara el handler onClick/onPointerUp del componente. El estado React no cambia.
  - Si se invoca el `props.onClick` directamente vía React fiber, sí funciona.
  - Patrón se repite en: tarjetas sede, "Continuar", "Registrar paciente" (dashboard recepción), "Iniciar venta", checkbox del modal "Firmar fórmula óptica" (la primera vez), "Tomar cita ahora".
- Hipótesis: la combinación `onClick` + `onPointerUp` en `SelectBranchPage.tsx` (e.g. ambas en el mismo botón) y posiblemente `pointer-events` o un overlay invisible captura los eventos antes que React, o el evento falla por una capa Radix con `data-state` que requiere un patrón Pointer específico.
- Estado: confirmado en select-branch; **hipótesis** en otras páginas (mismo síntoma, no inspeccioné cada componente).
- Recomendación: revisar `SelectBranchPage.tsx:209-274` (botón con `onClick + onPointerUp + onKeyDown` simultáneamente) y eliminar la duplicación; posiblemente migrar todos los botones a un único handler.

### QA-014
- Rol: receptionist
- URL: /receptionist/appointments/39 (detalle)
- Severidad: menor (TZ off-by-one)
- Pasos:
  1. Crear paciente con `birth_date: 1990-05-07`.
  2. Abrir detalle de cita.
- Esperado: "Nacimiento: 07/05/1990".
- Observado: "Nacimiento: 06/05/1990".
- Estado: confirmado
- Hipótesis: parsing de fecha sin TZ asume UTC y `toLocaleDateString` lo desplaza un día.

### QA-015
- Rol: cualquiera
- URL: dialog "Firmar fórmula óptica" en /specialist/appointments/{id}/prescription-preview
- Severidad: menor (a11y warning)
- Pasos:
  1. Abrir el modal.
- Esperado: sin warnings de accesibilidad.
- Observado: warning `Missing 'Description' or 'aria-describedby={undefined}' for {DialogContent}` (Radix UI).
- Estado: confirmado

### QA-016
- Rol: admin
- URL: GET /api/v1/users?role=specialist&branch_id=3
- Severidad: menor (filtros ignorados)
- Pasos:
  1. `GET /api/v1/users?role=specialist` → devuelve usuarios de cualquier rol (admin, receptionist, laboratory, specialist).
  2. `GET /api/v1/users?role=specialist&branch_id=3` → idéntico, ignora el filtro.
- Esperado: aplicar los filtros.
- Observado: ambos params son ignorados; el front no puede usar este endpoint para listar especialistas por sede.
- Estado: confirmado
- Notas: existe `/api/v1/specialists` que sí devuelve sólo `role_type=specialist` pero los `branch_assignments` vienen `null`.

### QA-017
- Rol: tester
- URL: HMR
- Severidad: hipótesis (regresión de DX, no de producto)
- Pasos:
  1. Durante la sesión, la consola registró: `[hmr] Failed to reload /src/pages/admin/CashCloses.tsx` con 500.
- Estado: hipótesis — puede ser archivo modificado en disco mientras el dev server estaba abierto. Sin reproducción dirigida.
```

## OK (sin incidencias)

| Rol | Ruta | Notas |
|-----|------|-------|
| receptionist | /login (con eventos sintéticos vía fiber) | autentica y entrega `branches[]`, JWT válido. |
| receptionist | /select-branch (con fiber) | una vez forzado el `onClick`, transita correctamente al dashboard de la sede elegida. |
| receptionist | /receptionist/dashboard | KPIs (Citas hoy, Listas para venta, Ventas del día), tabla "Cola de ventas" y agenda lateral renderizan correctamente. |
| receptionist | /receptionist/patients/new (formulario) | acepta nombre, apellido, doc, teléfono, email; el datepicker no abre con click MCP (ver QA-013) pero los demás campos funcionan. |
| specialist | /specialist/dashboard | tabla de agenda renderiza, conmuta de pendiente a en curso/completada. |
| specialist | /specialist/appointments/{id} (consulta, paso 1 al 4) | navegación Anamnesis → Examen → Diagnóstico → Prescripción funciona; auto-guardado documental. |
| specialist | /specialist/appointments/{id}/prescription-preview | composición de la fórmula, vista previa, validación de tarjeta profesional + checkbox de confirmación. |
| API | POST /api/v1/auth/login (admin/receptionist/specialist) | retorna JWT con `branches`, `feature_flags`, `permissions`. |
| API | POST /api/v1/patients | crea paciente y retorna ID (con caveats QA-011). |
| API | POST /api/v1/appointments | crea cita y la retorna con paciente y especialista expandidos (con caveats QA-009/QA-010/QA-011). |
| API | PUT /api/v1/appointments/{id} status=completed | acepta y persiste el estado correctamente. |
| API | clinical-record + prescription persistence | `internal/clinicalrecord` + repositorio Postgres almacena correctamente todos los campos óptricos (sph/cyl/axis/avcc/add/dp + treatments[] + lens_type/material/use). |

## Casos esquina explorados

1. **Sede mismatch:** receptionist@convision.com solo tiene Sede Centro y Sede Norte; specialist@convision.com tiene Sede Sur (primary) + Centro + Norte. Si se cambia de Sede Centro a Sur por error, las citas creadas no son visibles. Probar con `Cambiar sede` desde sidebar (no probado a fondo, pero documentado).
2. **Especialista sin sede asignada:** abermudez@convision.com no puede iniciar sesión (`401`) pero la API permite asignarle citas (QA-009).
3. **Cita huérfana:** la cita 38 quedó con `specialist_id=9` y nunca podrá ser atendida desde la UI.
4. **Receta sin canal de descubrimiento al asesor:** la prescripción está en `clinical_record.prescription` pero no se expone en `appointment.prescription`, y el endpoint para leerla está bloqueado para recepción (QA-006/QA-007).
5. **Catálogo de monturas/lentes confuso:** "Seleccionar Lentes para la Venta" exhibe monturas con campos de lente vacíos (QA-005).
6. **Listado global de prescripciones roto:** `GET /api/v1/prescriptions` 500 (QA-003).
7. **Doble registro de hora:** dashboard usa UTC, detalle usa local (QA-012).
8. **Field drop silencioso:** `identification_type`, `consultation_type`, `specialist_id` (en PUT) ignorados sin error (QA-010/QA-011).
9. **Filtro de role/sede en /users no operativo:** el front que dependa de él para poblar dropdowns recibirá ruido (QA-016).
10. **Click handlers Radix/React 18 vs eventos MCP:** afecta automatización pero también podría reflejarse con tablets/lectores de pantalla — vale la pena revisar la duplicación de `onClick + onPointerUp` (QA-013).
11. **Receta con vigencia 12 meses (Decreto 2200/2005):** correctamente visualizada como "Válida hasta: 7 de mayo de 2027" — OK.
12. **CC del paciente:** "C.C. QA1778200522" se muestra sin `identification_type` poblado (QA-011 cascade); aún así renderiza "C.C." hardcoded.

## Comandos / artefactos para reproducir

```bash
# Reset Go backend
cd /Users/wilderherrera/Desktop/convision/convision-api-golang && make build && nohup ./bin/convision-api > /tmp/convision-api.log 2>&1 &

# Front Vite
# (asumido en :4300)

# Crear paciente
curl -s -X POST 'http://localhost:8001/api/v1/patients' \
  -H 'Authorization: Bearer <RECEP_TOKEN>' -H 'Content-Type: application/json' \
  -d '{"first_name":"QA Paciente","last_name":"E2E","email":"qa@x","phone":"3110000000","identification":"QA1","identification_type":"CC","birth_date":"1990-05-07","gender":"male","status":"active"}'

# Crear cita
curl -s -X POST 'http://localhost:8001/api/v1/appointments' \
  -H 'Authorization: Bearer <RECEP_TOKEN>' -H 'X-Branch-Id: 3' -H 'Content-Type: application/json' \
  -d '{"branch_id":3,"patient_id":33,"specialist_id":2,"scheduled_at":"2026-05-07T23:00:00Z","reason":"Revision","status":"scheduled"}'

# Reproducir SQL bug:
curl -s -H 'Authorization: Bearer <TOKEN>' -H 'X-Branch-Id: 3' 'http://localhost:8001/api/v1/prescriptions?per_page=5'
# → {"message":"ERROR: missing FROM-clause entry for table \"prescriptions\" (SQLSTATE 42P01)"}
```

## Handoff al agente de corrección

Sugerido: regla `convision-qa-gap-fixer` (subagente potente) por la mezcla de bugs backend + frontend.

Tickets atómicos sugeridos en orden de impacto:
1. **QA-001 + QA-006 + QA-007** — exponer la prescripción al asesor: serializar `prescription` en `GET /api/v1/appointments/{id}` + permiso lectura para `receptionist`, y mostrar resumen en /receptionist/sales/new + diálogo Seleccionar Lentes.
2. **QA-002** — al firmar fórmula, transicionar `appointment.status` a `completed` automáticamente (servicio `prescriptionService.Sign` debería actualizar la cita en la misma transacción).
3. **QA-003** — corregir query SQL en `prescription_repository.go` (probable join sin alias; reproducible con un GET sin filtros).
4. **QA-004** — `/receptionist/sales/new?appointmentId=X` debe pre-cargar paciente, prescripción y agregar al carrito los lentes seleccionados en el diálogo previo.
5. **QA-005** — separar selectores de monturas vs lentes oftálmicos; popular columnas Tipo/Material/Tratamiento en monturas (o esconderlas).
6. **QA-008** — la agenda del especialista debe filtrar por `specialist_id` actual.
7. **QA-009 / QA-010 / QA-011** — validar y persistir o rechazar (no silent-drop) campos en POST/PUT de pacientes y citas; rechazar `specialist_id` sin sedes activas.
8. **QA-012 / QA-014** — normalizar TZ en frontend (forzar `America/Bogota`).
9. **QA-013** — eliminar duplicación `onClick + onPointerUp` en SelectBranchPage.tsx y revisar otros botones; los tests E2E con Playwright/MCP están bloqueados hasta entonces.
10. **QA-015** — añadir `aria-describedby` al `<DialogContent>` del modal de firma.
11. **QA-016** — implementar filtros `role` y `branch_id` en `GET /api/v1/users`.

Comando sugerido: `Con @convision-qa-gap-fixer, cerrar QA-001 a QA-016 usando .planning/qa/FINDINGS-2026-05-07-e2e-paciente-cita-venta-v3.md como fuente.`
