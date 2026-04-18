# Orquestador QA Autónomo — Go API (puerto 8001)

> **Instrucciones para el agente que ejecuta este prompt:**
> Eres un orquestador 100% autónomo. Ejecutas todo sin preguntar al usuario.
> Solo te detienes cuando terminas todos los grupos o encuentras un bloqueante crítico del servidor.
> Usas sub-agentes (`Task`) para paralelizar grupos independientes.
> Al final produces un resumen ejecutivo y actualizas `QA-FLOWS.md`.

---

## PASO 0 — Verificar servidor (obligatorio, no spawnear nada antes)

```bash
curl -s http://localhost:8001/health | jq .status
```

- Si responde `"ok"` → continuar al PASO 1.
- Si falla → ejecutar y reintentar:
  ```bash
  pkill -f "/tmp/convision-api" 2>/dev/null; sleep 1
  cd /Users/wilderherrera/Desktop/convision/convision-api-golang
  /tmp/convision-api > /tmp/api.log 2>&1 &
  sleep 3
  curl -s http://localhost:8001/health | jq .status
  ```
- Si sigue fallando → intentar rebuild:
  ```bash
  cd /Users/wilderherrera/Desktop/convision/convision-api-golang
  go build -o /tmp/convision-api ./cmd/api/ && /tmp/convision-api > /tmp/api.log 2>&1 &
  sleep 3 && curl -s http://localhost:8001/health | jq .status
  ```
- Si falla tres veces → detenerse y reportar el error del log: `tail -20 /tmp/api.log`

---

## PASO 1 — Obtener tokens (ejecutar en terminal, NO spawnear sub-agente)

```bash
TOKEN_ADMIN=$(curl -s -X POST http://localhost:8001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@convision.com","password":"password"}' | jq -r '.access_token')
echo "ADMIN: ${TOKEN_ADMIN:0:20}..."

TOKEN_SPEC=$(curl -s -X POST http://localhost:8001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"abermudez@convision.com","password":"password"}' | jq -r '.access_token')
echo "SPEC: ${TOKEN_SPEC:0:20}..."

TOKEN_REC=$(curl -s -X POST http://localhost:8001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"vcastillo@convision.com","password":"password"}' | jq -r '.access_token')
echo "REC: ${TOKEN_REC:0:20}..."
```

Si cualquier token es `null` → reportar qué usuario no existe y continuar solo con los tokens disponibles.

---

## PASO 2 — Wave 1: Grupos críticos en PARALELO (spawnear simultáneamente)

Spawnear estos dos sub-agentes **al mismo tiempo**. No esperar a que uno termine para lanzar el otro.

### Sub-agente A — Grupo 1 + Grupo 10 (Auth, Shape)

**Prompt exacto para el Task:**
```
Eres un agente QA del API Go de Convision (http://localhost:8001). Ejecuta sin pausas.

ARCHIVOS A LEER PRIMERO:
- /Users/wilderherrera/Desktop/convision/.planning/qa-golang/QA-FLOWS.md (secciones Grupo 1 y Grupo 10)
- /Users/wilderherrera/Desktop/convision/convision-front/src/services/auth.ts
- /Users/wilderherrera/Desktop/convision/convision-front/src/services/userService.ts

CREDENCIALES:
- admin: admin@convision.com / password
- receptionist: vcastillo@convision.com / password
- API: http://localhost:8001

TAREA — ejecutar en orden, sin saltarse ningún paso:

1. LOGIN ADMIN: POST /api/v1/auth/login → verificar que la respuesta tiene: access_token, token_type, expires_in, user.{id,name,email,role,active}
2. LOGIN INVÁLIDO: POST /api/v1/auth/login con password="wrong" → verificar HTTP 401
3. REFRESH: POST /api/v1/auth/refresh con Bearer <token_admin> → verificar HTTP 200 con nuevo access_token
4. ME: GET /api/v1/auth/me con Bearer <token_admin> → verificar user.id, user.email, user.role="admin"
5. LOGOUT: POST /api/v1/auth/logout con Bearer <token_admin> → verificar HTTP 200 o 204
6. SIN TOKEN: GET /api/v1/users → verificar HTTP 401
7. ROL INCORRECTO: GET /api/v1/users con token receptionist → verificar HTTP 403
8. LISTAR USUARIOS: GET /api/v1/users con token admin → verificar shape: {data:[], total, current_page, per_page, last_page}
9. CREAR USUARIO: POST /api/v1/users con token admin, body {name:"QA Test",last_name:"User",email:"qa_test_<timestamp>@test.com",password:"password",password_confirmation:"password",role:"receptionist",identification:"999000<timestamp>",phone:"3001234567"} → verificar HTTP 201 con id
10. ACTUALIZAR USUARIO: PUT /api/v1/users/<id_creado> con token admin, body {name:"QA Updated"} → verificar HTTP 200
11. ELIMINAR USUARIO: DELETE /api/v1/users/<id_creado> con token admin → verificar HTTP 204
12. SHAPE LOGIN: verificar que el response del paso 1 tiene exactamente los campos que lee auth.ts (comparar campo por campo)
13. SHAPE PAGINACIÓN: verificar que la lista de usuarios tiene data[], total, current_page, per_page, last_page (no items[], count, page)
14. SHAPE ERROR 401: verificar que tiene message o error (no ambos mezclados)
15. SHAPE ERROR 403: verificar formato consistente

Para cada paso:
- Ejecutar el curl real
- Verificar el resultado
- Actualizar QA-FLOWS.md cambiando ⬜ a ✅/🟡/❌ en la fila correspondiente
- Si falla: crear hallazgo GOQA-XXX en la sección "Hallazgos acumulados" de QA-FLOWS.md

Formato hallazgo en QA-FLOWS.md:
### GOQA-001
- **Grupo:** Grupo 1 — Auth & Usuarios
- **Flujo ID:** F-001
- **Severidad:** bloqueante | mayor | menor
- **Endpoint:** POST /api/v1/auth/login
- **Esperado:** {access_token, token_type, expires_in, user}
- **Observado:** (JSON real recibido)
- **Estado:** abierto

Al terminar, agregar fila en "Historial de turnos QA":
| QA-A | 2026-04-18 | Grupo 1, Grupo 10 | <N ok> | <N fail> | sub-agente-A |

REPORTE FINAL (devolver al orquestador):
- Flujos ✅: N
- Flujos ❌: N  
- Flujos 🟡: N
- Hallazgos creados: [GOQA-001, ...]
- Bloquea conexión con front: SI/NO
```

### Sub-agente B — Grupo 2 (Pacientes & Citas)

**Prompt exacto para el Task:**
```
Eres un agente QA del API Go de Convision (http://localhost:8001). Ejecuta sin pausas.

ARCHIVOS A LEER PRIMERO:
- /Users/wilderherrera/Desktop/convision/.planning/qa-golang/QA-FLOWS.md (sección Grupo 2)
- /Users/wilderherrera/Desktop/convision/convision-front/src/services/patientService.ts
- /Users/wilderherrera/Desktop/convision/convision-front/src/services/appointmentsService.ts
- /Users/wilderherrera/Desktop/convision/laravel_map/03-patients.md
- /Users/wilderherrera/Desktop/convision/laravel_map/04-appointments.md

CREDENCIALES:
- admin: admin@convision.com / password
- receptionist: vcastillo@convision.com / password
- API: http://localhost:8001

TAREA — ejecutar flujos F-020 a F-030 en orden:

FLUJOS PACIENTES:
F-020: GET /api/v1/patients con token admin → verificar shape paginado {data:[], total, current_page, per_page, last_page}, verificar que cada paciente tiene: id, name, last_name, identification, email, phone
F-021: POST /api/v1/patients con token receptionist, body {name:"Paciente",last_name:"QA",identification:"12345678",email:"pqa@test.com",phone:"3001234567",birth_date:"1990-01-01",gender:"M"} → verificar HTTP 201 con id
F-022: GET /api/v1/patients/<id> → verificar mismo shape que F-020 (paciente individual)
F-023: PUT /api/v1/patients/<id> con token receptionist, body {name:"Paciente Actualizado"} → verificar HTTP 200
F-024: DELETE /api/v1/patients/<id> con token admin → verificar HTTP 204
F-025: GET /api/v1/patients?s_f=["name"]&s_v=["Paciente"] → verificar que filtra resultados correctamente

FLUJOS CITAS:
F-026: GET /api/v1/appointments con token admin → verificar shape paginado, cada cita tiene: id, patient_id, specialist_id, scheduled_at, status
F-027: POST /api/v1/appointments con token receptionist, buscar primero un patient_id válido y un specialist_id válido (GET /api/v1/users?role=specialist), body {patient_id:<id>, specialist_id:<id>, scheduled_at:"2026-05-01T10:00:00Z", status:"scheduled", notes:"QA test"} → verificar HTTP 201
F-028: PUT /api/v1/appointments/<id> con body {status:"confirmed"} → verificar HTTP 200 con status actualizado
F-029: DELETE /api/v1/appointments/<id> → verificar HTTP 204
F-030: GET /api/v1/patients/<patient_id>/appointments → verificar lista de citas del paciente

Para cada flujo: actualizar QA-FLOWS.md (⬜→✅/🟡/❌), crear GOQA-XXX si hay bug.

REPORTE FINAL:
- Flujos ✅: N / Flujos ❌: N / Flujos 🟡: N
- Hallazgos: [lista]
- Bloquea conexión con front: SI/NO
```

---

## PASO 3 — Wave 2: Grupos de negocio en PARALELO (lanzar cuando Wave 1 termine)

Esperar reportes de ambos sub-agentes de Wave 1, luego lanzar simultáneamente:

### Sub-agente C — Grupo 5 (Ventas & Cotizaciones)

**Prompt exacto para el Task:**
```
Eres un agente QA del API Go de Convision (http://localhost:8001). Ejecuta sin pausas.

ARCHIVOS A LEER PRIMERO:
- /Users/wilderherrera/Desktop/convision/.planning/qa-golang/QA-FLOWS.md (sección Grupo 5)
- /Users/wilderherrera/Desktop/convision/convision-front/src/services/saleService.ts
- /Users/wilderherrera/Desktop/convision/convision-front/src/services/quoteService.ts
- /Users/wilderherrera/Desktop/convision/laravel_map/09-sales.md
- /Users/wilderherrera/Desktop/convision/laravel_map/10-quotes.md

CREDENCIALES: admin@convision.com / password → API http://localhost:8001

SETUP PREVIO: necesitas IDs de datos existentes. Ejecutar:
- PATIENT_ID=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/patients | jq -r '.data[0].id // empty')
- PRODUCT_ID=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/products | jq -r '.data[0].id // empty')
Si no hay datos, crear mínimos necesarios primero.

FLUJOS VENTAS (F-080 a F-084):
F-080: GET /api/v1/sales → verificar {data[], total, current_page, per_page, last_page}
F-081: POST /api/v1/sales con body {patient_id, items:[{product_id, quantity:1, unit_price:100}], payment_method:"cash", total:100} → verificar HTTP 201, campos: id, total, status, items[], pdf_token, guest_pdf_url
F-082: GET /api/v1/sales/<id> → verificar shape completo igual al que lee saleService.ts
F-083: GET /api/v1/sales/<id>/pdf-token → verificar {pdf_token, guest_pdf_url}
F-084: GET /api/v1/guest/sales/<id>/pdf?token=<pdf_token> → verificar HTTP 200 Content-Type: application/pdf
       GET /api/v1/guest/sales/<id>/pdf?token=INVALID → verificar HTTP 403 {"error":"El enlace ha expirado o no es válido."}

FLUJOS COTIZACIONES (F-085 a F-089):
F-085: GET /api/v1/quotes → verificar paginado
F-086: POST /api/v1/quotes con body {patient_id, items:[{product_id, quantity:1, unit_price:100}], notes:"QA test"} → verificar HTTP 201 con pdf_token
F-087: POST /api/v1/quotes/<id>/convert → verificar que crea una venta y devuelve sale.id
F-088: GET /api/v1/guest/quotes/<id>/pdf?token=<pdf_token> → verificar HTTP 200 application/pdf
F-089: verificar que saleService.ts no usa campos que no existen en el response (comparar keys del JSON vs accesos en el .ts)

Para cada flujo: actualizar QA-FLOWS.md, crear GOQA-XXX si hay bug.

REPORTE FINAL: flujos ✅/❌/🟡, hallazgos, bloquea front: SI/NO
```

### Sub-agente D — Grupo 6 + Grupo 4 (Órdenes, Lab, Catálogo)

**Prompt exacto para el Task:**
```
Eres un agente QA del API Go de Convision (http://localhost:8001). Ejecuta sin pausas.

ARCHIVOS A LEER:
- /Users/wilderherrera/Desktop/convision/.planning/qa-golang/QA-FLOWS.md (Grupos 4 y 6)
- /Users/wilderherrera/Desktop/convision/convision-front/src/services/orderService.ts
- /Users/wilderherrera/Desktop/convision/convision-front/src/services/laboratoryOrderService.ts
- /Users/wilderherrera/Desktop/convision/convision-front/src/services/laboratoryService.ts
- /Users/wilderherrera/Desktop/convision/convision-front/src/services/lensService.ts
- /Users/wilderherrera/Desktop/convision/convision-front/src/services/catalogService.ts

CREDENCIALES: admin@convision.com / password → API http://localhost:8001

GRUPO 4 — CATÁLOGO (F-060 a F-070):
F-060: GET /api/v1/categories → verificar paginado con id, name
F-061: POST /api/v1/categories con {name:"Categoría QA", description:"test"} → 201
F-062: GET /api/v1/brands → verificar paginado con id, name
F-063: POST /api/v1/brands con {name:"Marca QA"} → 201
F-064: GET /api/v1/products → verificar {data[], total, current_page} con campos: id, name, price, category_id, brand_id
F-065: POST /api/v1/products con {name:"Lente QA", price:150.00, category_id:<id>, brand_id:<id>, stock:10} → 201
F-066: PUT /api/v1/products/<id> con {name:"Lente QA Actualizado"} → 200
F-067: GET /api/v1/inventory → verificar shape esperado por inventoryService.ts
F-068: POST /api/v1/inventory/adjust → verificar que ajusta stock
F-069: GET /api/v1/discounts → verificar paginado
F-070: GET /api/v1/discounts/best?lens_id=<id> → verificar que devuelve discount_percentage o null

GRUPO 6 — ÓRDENES & LAB (F-100 a F-109):
F-100: GET /api/v1/orders → verificar {data[], total}, cada orden tiene: id, order_number, status, items[]
F-101: POST /api/v1/orders → crear orden con patient_id + items, verificar HTTP 201 con pdf_token, lab_pdf_token
F-102: GET /api/v1/orders/<id> → verificar shape completo que usa orderService.ts
F-103: PUT /api/v1/orders/<id> con {status:"processing"} → verificar HTTP 200
F-104: GET /api/v1/guest/orders/<id>/pdf?token=<pdf_token> → verificar HTTP 200 application/pdf
F-105: GET /api/v1/laboratories → verificar paginado con id, name, status
F-106: POST /api/v1/laboratory-orders → crear orden lab con order_id + laboratory_id, verificar HTTP 201
F-107: GET /api/v1/laboratory-orders → verificar paginado
F-108: PUT /api/v1/laboratory-orders/<id> con {status:"in_progress"} → verificar HTTP 200
F-109: GET /api/v1/guest/laboratory-orders/<id>/pdf?token=<pdf_token> → verificar HTTP 200

Para cada flujo: actualizar QA-FLOWS.md, crear GOQA-XXX si hay bug.

REPORTE FINAL: flujos ✅/❌/🟡, hallazgos, bloquea front: SI/NO
```

---

## PASO 4 — Wave 3: Grupos secundarios en PARALELO

Lanzar cuando Wave 2 termine:

### Sub-agente E — Grupo 3 + Grupo 7 (Prescripciones, Compras)

**Prompt exacto para el Task:**
```
Eres un agente QA del API Go de Convision (http://localhost:8001). Ejecuta sin pausas.

ARCHIVOS A LEER:
- /Users/wilderherrera/Desktop/convision/.planning/qa-golang/QA-FLOWS.md (Grupos 3 y 7)
- /Users/wilderherrera/Desktop/convision/convision-front/src/services/prescriptionService.ts
- /Users/wilderherrera/Desktop/convision/convision-front/src/services/clinicalHistoryService.ts
- /Users/wilderherrera/Desktop/convision/convision-front/src/services/purchaseService.ts
- /Users/wilderherrera/Desktop/convision/convision-front/src/services/supplierService.ts

CREDENCIALES: admin@convision.com / password → API http://localhost:8001

GRUPO 3 — PRESCRIPCIONES & HISTORIA CLÍNICA (F-040 a F-046):
F-040: POST /api/v1/prescriptions con patient_id + datos de lentes → verificar HTTP 201
F-041: GET /api/v1/patients/<id>/prescriptions → verificar lista de prescripciones
F-042: GET /api/v1/prescriptions/<id> → verificar shape que usa prescriptionService.ts
F-043: POST /api/v1/clinical-histories → verificar HTTP 201
F-044: GET /api/v1/patients/<id>/clinical-history → verificar shape
F-045: POST /api/v1/clinical-histories/<id>/evolutions → verificar HTTP 201
F-046: GET /api/v1/guest/clinical-histories/<id>/pdf?token=<token> → verificar HTTP 200 o 403 correcto

GRUPO 7 — COMPRAS & PROVEEDORES (F-120 a F-127):
F-120: GET /api/v1/suppliers → verificar paginado con id, name, email, phone
F-121: POST /api/v1/suppliers con {name:"Proveedor QA", email:"prov@qa.com", phone:"555-0001"} → 201
F-122: GET /api/v1/purchases → verificar paginado
F-123: POST /api/v1/purchases con {supplier_id, items:[{product_id, quantity:5, unit_price:80}]} → 201
F-124: POST /api/v1/purchases/<id>/receive → verificar que actualiza estado y stock
F-125: GET /api/v1/expenses → verificar paginado
F-126: POST /api/v1/expenses con {description:"Gasto QA", amount:500, category:"utilities"} → 201
F-127: GET /api/v1/supplier-payments → verificar paginado (o 404 si no existe el endpoint)

Actualizar QA-FLOWS.md. REPORTE FINAL: flujos ✅/❌/🟡, hallazgos.
```

### Sub-agente F — Grupo 8 + Grupo 9 (Nómina, Caja, Dashboard)

**Prompt exacto para el Task:**
```
Eres un agente QA del API Go de Convision (http://localhost:8001). Ejecuta sin pausas.

ARCHIVOS A LEER:
- /Users/wilderherrera/Desktop/convision/.planning/qa-golang/QA-FLOWS.md (Grupos 8 y 9)
- /Users/wilderherrera/Desktop/convision/convision-front/src/services/payrollService.ts
- /Users/wilderherrera/Desktop/convision/convision-front/src/services/cashTransferService.ts
- /Users/wilderherrera/Desktop/convision/convision-front/src/services/dashboardService.ts
- /Users/wilderherrera/Desktop/convision/convision-front/src/services/adminNotificationService.ts
- /Users/wilderherrera/Desktop/convision/convision-front/src/services/dailyActivityReportService.ts

CREDENCIALES: admin=admin@convision.com, receptionist=vcastillo@convision.com / password → API http://localhost:8001

GRUPO 8 — NÓMINA & CAJA (F-140 a F-148):
F-140: GET /api/v1/payrolls → verificar paginado
F-141: POST /api/v1/payrolls con {employee_name:"QA Empleado", base_salary:2500000, period:"2026-04"} → 201
F-142: GET /api/v1/service-orders → verificar paginado con order_number, status, priority
F-143: POST /api/v1/service-orders con {customer_name:"QA Client", description:"test repair", estimated_cost:150000} → 201
F-144: GET /api/v1/cash-transfers → verificar paginado
F-145: POST /api/v1/cash-transfers con {amount:100000, type:"income", description:"QA transfer"} → 201
F-146: POST /api/v1/cash-transfers/<id>/approve → verificar que cambia status a "approved"
F-147: POST /api/v1/cash-register/close → verificar HTTP 201 o 200 con resumen de caja (o 404 si endpoint no existe aún)
F-148: GET /api/v1/cash-register/history → verificar lista de cierres

GRUPO 9 — DASHBOARD & NOTIFICACIONES (F-160 a F-167):
F-160: GET /api/v1/dashboard/summary → verificar {metrics:{monthly_sales, monthly_patients, lab_orders, pending_balance}, weekly_count, recent_orders[]}
F-161: GET /api/v1/admin/notifications → verificar paginado
F-162: GET /api/v1/admin/notifications/summary → verificar {unread, total, archived}
F-163: PATCH /api/v1/admin/notifications/1/read → verificar HTTP 200 o 404 si no hay notificaciones
F-164: PATCH /api/v1/admin/notifications/read-all → verificar HTTP 200
F-165: POST /api/v1/daily-activity-reports con token receptionist, body {report_date:"2026-04-18", shift:"morning"} → verificar HTTP 201 (si ya existe el del día, puede devolver 409 o el existente)
F-166: GET /api/v1/daily-activity-reports con token admin → verificar paginado
F-167: POST /api/v1/daily-activity-reports/quick-attention con {report_date:"2026-04-18", shift:"morning", item:"preguntas", profile:"hombre"} → verificar HTTP 200 con contador incrementado

Actualizar QA-FLOWS.md. REPORTE FINAL: flujos ✅/❌/🟡, hallazgos.
```

---

## PASO 5 — Consolidar resultados (sin sub-agente, el orquestador lo hace)

Cuando todos los sub-agentes (A, B, C, D, E, F) hayan reportado:

1. Leer `QA-FLOWS.md` y contar totales reales de ✅/❌/🟡
2. Listar todos los `GOQA-XXX` creados
3. Determinar si los **grupos bloqueantes** (1 y 10) están 100% ✅
4. Actualizar la fila del historial en `QA-FLOWS.md`:
   ```
   | QA-01 | 2026-04-18 | Grupos 1-10 | <N> | <N> | orquestador-autonomo |
   ```

---

## PASO 6 — Decisión final automática

**Si grupos 1 + 10 están en ✅ (sin ❌):**
→ Actualizar `convision-front/.env.local` (crear si no existe):
```
VITE_API_URL=http://127.0.0.1:8001
```
→ Incluir en el reporte final: "✅ LISTO PARA CONECTAR CON EL FRONT — cambiar proxy a puerto 8001"

**Si hay ❌ en grupos 1 o 10:**
→ Incluir en el reporte: "❌ NO conectar con el front hasta resolver: [lista de GOQA bloqueantes]"
→ NO modificar nada en el frontend.

---

## REPORTE FINAL (imprimir al usuario cuando TODO esté completo)

```
╔══════════════════════════════════════════════════════╗
║           REPORTE QA — Go API Convision              ║
╠══════════════════════════════════════════════════════╣
║ Fecha:          2026-04-18                           ║
║ Flujos totales: 167                                  ║
║ ✅ Verificados: N                                    ║
║ 🟡 Parciales:  N                                    ║
║ ❌ Rotos:      N                                    ║
╠══════════════════════════════════════════════════════╣
║ HALLAZGOS CRÍTICOS (bloqueantes)                     ║
║   GOQA-XXX: descripción corta                        ║
╠══════════════════════════════════════════════════════╣
║ HALLAZGOS MENORES                                    ║
║   GOQA-XXX: descripción corta                        ║
╠══════════════════════════════════════════════════════╣
║ VEREDICTO FINAL                                      ║
║   ✅ LISTO PARA CONECTAR CON EL FRONT                ║
║     → Cambiar VITE_API_URL=http://localhost:8001     ║
║   — o —                                              ║
║   ❌ NO CONECTAR — resolver primero: GOQA-XXX, ...  ║
╚══════════════════════════════════════════════════════╝
```
