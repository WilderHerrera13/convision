---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
api_url: http://localhost:8001
started: 2026-05-07T15:03:00-05:00
updated: 2026-05-07T16:30:00-05:00
roles_tested: [receptionist, specialist]
scenario: End-to-end patient journey — agenda → médico (fórmula/lente) → venta montura + cierre
---

## Resumen ejecutivo

- Pantallas verificadas en navegador: **0** (subagentes browser-use no dejaron transcript utilizable; solo se validó stack local por API + código de referencia).
- Hallazgos confirmados (API): **4**
- Hipotesis / pendiente evidencia UI: **2**
- Flujo parcial verificado por API: cita existente → prescripción con campos correctos → venta vinculada (`sale_id`, `is_billed`).

## Contexto de prueba

- API: `http://localhost:8001`, JWT `receptionist@convision.com` / `specialist@convision.com`, contraseña `password`, cabecera `X-Branch-ID: 3` (Sede Centro; recepción no tiene sede 1).
- Cita de referencia: `GET /api/v1/appointments/30?branch_id=3` — paciente 30, `is_billed: true`, `sale_id: 7` tras crear venta de prueba en sesión anterior.

## Hallazgos (FAIL / GAP)

```text
### QA-E2E-001
- Rol: receptionist | specialist
- URL: http://localhost:8001/api/v1/prescriptions?per_page=5&branch_id=3
- Severidad: bloqueante
- Pasos:
  1. Login JWT con rol que tenga permisos de lectura.
  2. GET /api/v1/prescriptions con X-Branch-ID: 3 (y branch_id en query si aplica).
- Esperado: Lista paginada de prescripciones.
- Observado: Error SQL del servidor.
- Evidencia: HTTP 500 cuerpo `{"message":"ERROR: missing FROM-clause entry for table \"prescriptions\" (SQLSTATE 42P01)"}`
- Estado: confirmado
```

```text
### QA-E2E-002
- Rol: receptionist
- URL: http://localhost:8001/api/v1/patients/30/prescriptions
- Severidad: bloqueante
- Pasos:
  1. JWT recepción, X-Branch-ID: 3.
  2. GET /api/v1/patients/30/prescriptions
- Esperado: Historial de fórmulas del paciente para el asesor.
- Observado: internal server error.
- Evidencia: `{"message":"internal server error"}`
- Estado: confirmado
```

```text
### QA-E2E-003
- Rol: specialist (API)
- URL: http://localhost:8001/api/v1/prescriptions (POST)
- Severidad: mayor
- Pasos:
  1. POST cuerpo con campos tipo `od_sphere`, `oi_sphere` (nombres intuitivos OD/OI).
  2. GET /api/v1/prescriptions/:id del registro creado.
- Esperado: Rechazar JSON inválido o mapear OD/OI a columnas internas.
- Observado: 201/200 con registro creado pero **esferas/cilindros vacíos**; los valores no se persisten.
- Evidencia: Primer POST de sesión con `od_sphere`/`oi_sphere`; respuesta `right_sphere`/`left_sphere` en `""`.
- Estado: confirmado
- Nota: Con `right_sphere`, `left_sphere`, `right_cylinder`, etc. los valores sí se guardaron (prescripción id 2 en entorno probado).
```

```text
### QA-E2E-004
- Rol: receptionist
- URL: http://localhost:8001/api/v1/products/lenses/by-prescription (POST)
- Severidad: mayor (producto / integración)
- Pasos:
  1. Leer handler: el cuerpo esperado es JSON con `sphere_od`, `cylinder_od`, `addition_od`, `sphere_os`, `cylinder_os`, `addition_os` (floats), no `prescription_id`.
  2. POST `{"sphere_od":-1.0,"cylinder_od":-0.5,"sphere_os":-1.25,"cylinder_os":-0.75}` con X-Branch-ID: 3.
- Esperado: Lista de lentes candidatas o mensaje claro si no hay match.
- Observado: `{"data":[]}` sin explicación.
- Evidencia: Respuesta 200 con `data` vacío en datos locales (catálogo grande de productos/monturas existe; puede faltar stock de **lentes** que pasen el filtro o el filtro es demasiado estricto).
- Estado: hipótesis (falta confirmar si en BD hay lentes que deban matchear y no matchean vs catálogo solo monturas)
```

```text
### QA-E2E-005
- Rol: receptionist
- URL: http://localhost:8001/api/v1/sales (POST)
- Severidad: menor (DX / validación)
- Pasos:
  1. POST venta con cuerpo incompleto (sin `subtotal`/`tax`/`payments` estructurados).
- Esperado: 422 con detalle de campos obligatorios.
- Observado: `{"message":"internal server error"}` en payload de prueba inicial.
- Estado: confirmado (mejorar validación para no devolver 500)
```

## OK (sin incidencias) — verificado por API

| Rol | Ruta / acción | Notas |
|-----|----------------|--------|
| receptionist | GET /api/v1/appointments?branch_id=3 + X-Branch-ID: 3 | Lista con datos; sede requerida coherente con RBAC |
| receptionist | GET /api/v1/appointments/30 | Incluye paciente, especialista, `prescription` embebible |
| specialist | POST /api/v1/prescriptions con `right_*` / `left_*` | Persiste esferas/cilindros/ejes y texto recomendación |
| receptionist | POST /api/v1/sales con CreateInput completo | Venta VTA-0007; vínculo `appointment_id`; tras venta `is_billed: true`, `sale_id: 7` |
| receptionist | GET /api/v1/sales/7 | Detalle con ítems y pagos |

## Casos esquina (escenario alto nivel)

| Caso | Resultado observado |
|------|---------------------|
| Usuario sin sede en header / branch equivocado | `{"message":"Sede requerida"}` o `Sin acceso a esta sede` — esperado por diseño; documentar en UAT que E2E debe fijar sede (p. ej. 3) igual que el front. |
| Fórmula con nombres de campo equivocados (OD/OI vs right/left) | Crea fila “vacía” ópticamente — riesgo clínico-comercial alto. |
| Listado global de prescripciones | Roto por SQL — bloquea auditoría y posibles pantallas admin. |
| Historial prescripciones por paciente | 500 — asesor no puede listar fórmulas desde API de paciente. |
| Recomendación de lentes para venta | Contrato POST por graduación, no por `prescription_id`; si el front envía solo id de fórmula, hoy no alinea con backend sin capa intermedia. |
| Venta solo montura (`product_type: frame`) | Permitido en prueba; escenario real suele requerir par montura + lentes — validar reglas de negocio aparte. |

## Handoff al agente de correccion

- Usar regla `convision-qa-gap-fixer` o `convision-qa-fixer` con este archivo.
- Prioridad sugerida: **QA-E2E-001**, **QA-E2E-002**, **QA-E2E-003**, luego **QA-E2E-004** (contrato + resultados vacíos), **QA-E2E-005**.
- Comando sugerido: Con `@convision-qa-gap-fixer`, cerrar QA-E2E-001 … QA-E2E-005 usando `.planning/qa/FINDINGS-2026-05-07-e2e-patient-journey.md`.

## Nota sobre exploración en navegador

Los subagentes lanzados para recepción/especialista no produjeron salida estructurada en transcript (archivo de subagente con 0 líneas útiles en el workspace del proyecto). Recomendación: repetir E2E con MCP de navegador en IDE o Playwright (`qa-automation/tests/test_appointment_flow.py`) y adjuntar capturas a nuevos IDs QA-UI-###.
