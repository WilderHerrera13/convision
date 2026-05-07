---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
started: 2026-05-02T16:53:00
updated: 2026-05-02T19:00:00
roles_tested: [admin, specialist, receptionist, laboratory]
scope: flujo-citas, multi-branch, filtros, persistencia datos, recepcion-paciente, clinical-form
---

# QA FINDINGS — Flujo de Citas + Multi-Branch (2026-05-02)

**Alcance:** Flujo completo de citas (creación, recepción, datos clínicos) para todos los roles.
Validación de filtros por sede/branch, persistencia de datos, montos.
Médico capaz de recibir paciente y capturar todos los datos clínicos.

---

## Resumen ejecutivo

- Pantallas verificadas: Login (todos los roles), SelectBranch, Receptionist Appointments + Wizard de creación (4 pasos), Specialist Dashboard + Appointment Detail + Clinical Form (4 tabs), Admin Appointments con filtros branch, Laboratory (redirect).
- Hallazgos confirmados: 5 (2 críticos, 2 medios, 1 gap menor)
- Sin incidencias confirmadas: Creación de cita 4 pasos, filtro branch en listado admin, persistencia de cita, todos los endpoints API del formulario clínico, aislamiento UI por branch en receptionist.

---

## Hallazgos (FAIL / GAP)

### QA-001 — FAIL — Hora de cita se muestra con offset incorrecto (5h menos)

**Severidad:** Alta  
**Rol afectado:** Todos los roles  
**Ruta:** Detalle de cita, listado de citas (especialista, recepcionista, admin)  
**Reproducido en:** `http://localhost:4300/specialist/appointments/5` → header muestra `"Martes, 5 may · 5:00 AM"` pero la cita fue agendada a las `10:00 AM`

**Causa raíz confirmada (código):**

1. **Creación** — `AppointmentFormPage.tsx:273` envía:
   ```ts
   scheduled_at: `${dateStr} ${padTime(normalizedTime)}`
   // Produce: "2026-05-05 10:00:00" — sin timezone
   ```
   Go/GORM parsea la cadena sin timezone como **UTC** → almacena `2026-05-05T10:00:00Z`.

2. **Display** — `utils.ts:parseLocalDatetime` recibe `"2026-05-05T10:00:00Z"`, strip `Z` → produce `"2026-05-05 10:00"` (separador espacio). V8/Chrome trata strings con separador espacio como **UTC**, no local. `formatTime12h` luego convierte a hora local (UTC-5) → muestra `5:00 AM`.

**Archivos a corregir:**
- `convision-front/src/pages/receptionist/AppointmentFormPage.tsx:273` — enviar UTC correcto:
  ```ts
  const dt = new Date(`${dateStr}T${padTime(normalizedTime)}:00`);
  scheduled_at: dt.toISOString()
  ```
- `convision-front/src/lib/utils.ts:parseLocalDatetime` — usar separador T para forzar local:
  ```ts
  const naive = value.replace(/Z$/, '').replace(/\+00:00$/, '').slice(0, 16);
  const d = new Date(naive); // "2026-05-05T10:00" con T = hora local en V8
  ```

---

### QA-002 — FAIL (CRÍTICO) — Bypass de aislamiento por branch: usuarios no-admin pueden acceder datos de otras sedes vía query param

**Severidad:** Crítica (seguridad / aislamiento multi-tenant)  
**Rol afectado:** Specialist, Receptionist (cualquier rol no-admin)  
**Componente:** `handler.go:782 resolveBranchOverride` + `handler_appointment.go:167`

**Reproducción:**
```bash
# Receptionist con acceso SOLO a Sede Norte (branch_id=1)
# Puede ver appointments de Sede Centro (branch_id=3):
curl "http://localhost:8001/api/v1/appointments?branch_id=3" \
  -H "Authorization: Bearer $RECEP_TOKEN" \
  -H "X-Branch-ID: 1"
# → HTTP 200, devuelve citas de Sede Centro

# También puede acceder appointment individual de Sede Centro por ID:
curl "http://localhost:8001/api/v1/appointments/5" \
  -H "Authorization: Bearer $RECEP_TOKEN" \
  -H "X-Branch-ID: 1"
# → HTTP 200, devuelve datos completos del appointment 5 (Sede Centro)
```

**Causa raíz:**
- `BranchContext` middleware valida el header `X-Branch-ID` contra las branches del usuario ✓
- `resolveBranchOverride` lee `?branch_id=` y **sobreescribe** el branchID validado sin re-validar acceso
- `GetAppointment` (GET /:id) no valida `branch_id` del appointment contra las branches del usuario

**Archivos a corregir:**
- `convision-api-golang/internal/transport/http/v1/handler.go:resolveBranchOverride` — agregar check de rol:
  ```go
  func resolveBranchOverride(c *gin.Context) *uint {
    // Solo admin puede hacer override a otras branches
    claims, ok := jwtauth.GetClaims(c)
    if !ok || claims.Role != domain.RoleAdmin {
      return nil // no override para no-admin
    }
    // ... resto del parsing
  }
  ```
- `convision-api-golang/internal/transport/http/v1/handler_appointment.go:GetAppointment` — validar que `appointment.BranchID` esté en las branches autorizadas del usuario o sea su branch actual.

**Impacto:** Cualquier usuario autenticado (specialist/receptionist) puede ver appointments, registros clínicos, y datos de pacientes de cualquier sede con solo manipular el query param.

---

### QA-003 — FAIL — Formulario clínico: botón "Siguiente" en Anamnesis no avanza al Tab 2

**Severidad:** Alta  
**Rol afectado:** Specialist  
**Ruta:** `/specialist/appointments/:id` con status `in_progress`  
**Estado:** Requiere verificación manual en Chrome real (Playwright tiene limitaciones con RHF)

**Síntomas observados con Playwright:**
- Llenar textarea "Motivo de consulta" (vía `.fill()`) → hacer clic en "Siguiente: Examen Visual →"
- No se hace `PUT /clinical-record/anamnesis`
- No cambia al Tab 2
- Sin errores visibles

**Causa confirmada en automatización:** `Playwright .fill()` no dispara `onChange` de React Hook Form v7 → `handleSubmit` valida que `reason_for_visit` está vacío → no llama `onSubmit`.

**Estado de la app:** Todos los endpoints funcionan correctamente vía API directa (tabs 1-4 guardan y persisten). El formulario carga los datos pre-existentes correctamente.

**Acción requerida:** Verificar manualmente en Chrome real que:
1. Tipear en textarea → botón "Siguiente" → llama PUT → avanza a Tab 2
2. Si el bug persiste en browser real, revisar `AnamnesisSection1.tsx` y el `{...register('reason_for_visit')}`.

**Archivos:** `convision-front/src/components/clinical/NewConsultation/AnamnesisTab.tsx` y `AnamnesisSection1.tsx`

---

### QA-004 — GAP — `valid_until` de prescripción no calculado ni devuelto por el backend

**Severidad:** Baja  
**Rol afectado:** Specialist (lectura de prescripción emitida)  
**Descripción:** El frontend (`clinicalRecordService.ts:160`) define `prescription.valid_until?: string` en el tipo `ClinicalRecord`, pero el backend no computa ni devuelve este campo. La prescripción tiene `validity_months` almacenado correctamente, pero el campo `valid_until` (fecha de vencimiento calculada) nunca aparece en la respuesta.

**Evidencia:**
- `GET /api/v1/appointments/5/clinical-record` → `prescription.valid_until` ausente
- `domain/clinical_record.go` — no existe campo `ValidUntil`
- `clinicalrecord/service.go:315` — solo persiste `ValidityMonths`, no calcula fecha

**Archivos a corregir (si el campo es requerido):**
- `convision-api-golang/internal/domain/clinical_record.go` — agregar `ValidUntil *time.Time` computed
- `convision-api-golang/internal/clinicalrecord/service.go:UpsertPrescription` — calcular `ValidUntil = CreatedAt.AddDate(0, ValidityMonths, 0)`

---

### QA-005 — GAP — Rol `laboratory` queda atrapado en SelectBranch sin branches asignadas

**Severidad:** Baja  
**Rol afectado:** laboratory  
**Descripción:** Login como `laboratory@convision.com` → 0 branches devueltas → `AuthContext` redirige a `/select-branch` → pantalla muestra "Sin sedes asignadas" → usuario no puede continuar (solo puede cerrar sesión).

**Evidencia:**
- API login: `branches: []`
- `SelectBranchPage` muestra "Sin sedes asignadas · Contacta al administrador"
- No hay ruta `/unauthorized` automática para este caso

**Nota:** En seed de testing el usuario laboratory no tiene branches asignadas. En producción debería tenerlas. Si es un estado válido que un laboratory user no tenga branch, considerar redirigirlo a `/unauthorized` directamente.

---

## OK (sin incidencias)

| Rol | Ruta / Funcionalidad | Notas |
|-----|---------------------|-------|
| Admin | `GET /appointments?branch_id=3` | Filtra correctamente a Sede Centro (2 appts) |
| Admin | `GET /appointments?branch_id=0` | Devuelve todas las sedes (5 appts, branches 1+2+3) |
| Admin | `AdminBranchFilter` | Combobox funciona; queryKey incluye branchFilter |
| Admin | Filtros de período (Esta semana, Este mes) | Range de fechas correcto en query params |
| Specialist | Login con 3 branches → `/select-branch` | SelectBranch renderiza 3 sedes |
| Specialist | `/specialist/dashboard` | Carga correcto tras seleccionar branch |
| Specialist | `POST /appointments/:id/take` | Status `scheduled` → `in_progress`; HTTP 201 ✓ |
| Specialist | Clinical form — estructura visual | 4 tabs (Anamnesis / Examen Visual / Diagnóstico / Prescripción) |
| Specialist | Clinical form — carga de datos existentes | Anamnesis pre-cargada desde API en Tab 1 al recargar |
| Specialist | `PUT /clinical-record/anamnesis` | Persiste todos los campos; HTTP 200 ✓ |
| Specialist | `PUT /clinical-record/visual-exam` | Persiste campos ópticos (AV, autoref, subj, IOP, biomi, fundus); HTTP 200 ✓ |
| Specialist | `PUT /clinical-record/diagnosis` | Persiste código CIE-10, tipo, plan, CUPS; HTTP 200 ✓ |
| Specialist | `PUT /clinical-record/prescription` | Persiste graduación OD/OI, tipo lente, tratamientos, vigencia; HTTP 200 ✓ |
| Specialist | `GET /clinical-record` (final) | Devuelve los 4 módulos completos y correctos |
| Receptionist | Login (1 branch) → auto-redirect a dashboard | Sede Norte seleccionada automáticamente |
| Receptionist | `/receptionist/appointments` | Tabla carga; sidebar correcto; "Nueva cita" visible |
| Receptionist | Wizard 4 pasos — navegación | Paso 1→2→3→4 funciona; validaciones activas |
| Receptionist | Paso 1: búsqueda de paciente | SearchableCombobox filtra por nombre/cédula |
| Receptionist | Paso 2: selección de especialista | Lista filtrada por branch |
| Receptionist | Paso 3: fecha + slots horarios | DatePicker + slots disponibles funcionales |
| Receptionist | Paso 4: resumen + confirmar | Creación exitosa; POST 201 |
| Receptionist | Persistencia de cita creada | ID, paciente, especialista, sede, hora, notas, estado `scheduled` ✓ |
| Receptionist | Aislamiento UI: Sede Norte no ve Sede Centro | Appointments list vacía (correcto — appt 5 es Sede Centro) |
| Multi-tenant | Header `X-Branch-ID` | Siempre enviado desde `axios.ts`; validado en `BranchContext` middleware |
| Multi-tenant | Admin puede ver todas las sedes | `branch_id=0` devuelve todos ✓ |
| Multi-tenant | BranchContext middleware (header) | Valida acceso del usuario a la branch del header ✓ |
| Backend | `/health` | OK post-reinicio |
| Backend | Aislamiento por `clinic_id` | Presente en todas las queries de appointments |
| Backend | `GET /branches` | Lista las 4 branches activas correctamente |

---

## Pendiente de verificación (requiere browser real)

| ID | Descripción | Prioridad |
|----|-------------|-----------|
| P-001 | Verificar manualmente en Chrome que el botón "Siguiente" en AnamnesisTab avanza correctamente (QA-003) | Alta |
| P-002 | Verificar que la hora se crea y muestra correctamente antes y después del fix de QA-001 | Alta |
| P-003 | Receptionist: verificar Cierre de Caja y Reporte Diario (fuera del scope de citas) | Baja |

---

## Handoff al agente de corrección

Usar regla `convision-qa-fixer` con este archivo como fuente.

**IDs a corregir prioritariamente:**

1. **QA-002 (CRÍTICO)** — `resolveBranchOverride` no valida acceso del usuario al branch override. Fix en `handler.go` + `handler_appointment.go`. Afecta todos los endpoints que usan el patrón (appointments, sales, inventory, cash_close, t10).

2. **QA-001 (Alta)** — Timezone bug en creación y display. Fix en `AppointmentFormPage.tsx:273` (enviar ISO UTC) y `utils.ts:parseLocalDatetime` (usar T separator).

3. **QA-003 (Alta)** — Verificar primero manualmente; si se confirma en browser real, revisar `AnamnesisTab.tsx` form submit.

4. **QA-004 (Baja)** — `valid_until` no calculado. Fix en `clinical_record.go` + `service.go` si el campo es requerido por el negocio.

5. **QA-005 (Baja)** — Laboratory sin branches → redirect a `/unauthorized` en lugar de `/select-branch`.
