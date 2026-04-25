# Phase 11: Specialist Appointment & Clinical History Flow
## Context & Requirements

**Date**: 2026-04-24  
**Source**: 17 Figma designs + marco_legal.md + existing Go backend audit  
**Plans**: 8

---

## 1. Executive Summary

Phase 11 implements the complete specialist appointment workflow from agenda view through clinical record closure. It covers two clinical archetypes: (a) **Nueva Consulta** (4-step tabbed form) and (b) **Seguimiento/Control** (4-step tabbed form). All screens must be pixel-perfect Figma matches. The Go backend needs new domain entities, service methods, HTTP handlers, and unit tests.

---

## 2. Figma Screen Inventory (17 screens)

### Agenda Screens
| Node | Name | Description |
|------|------|-------------|
| 2112:517 | Esp Citas Agenda sin citas | Empty state with KPI cards (citas hoy/en curso/completadas) |
| 2111:459 | Esp Citas Agenda con filtros | List with date picker, patient search, status filter chips |
| 2115:655 | Appointment list (large) | Row cards with status chips, patient name, time, type badge |

### Appointment Detail Screens
| Node | Name | Description |
|------|------|-------------|
| 2138:1031 | Esp Citas Detalle · Programada | Scheduled appt detail — "Tomar cita" primary button |
| 2251:1416 | Seg Detalle Cita Control | Control appt detail — "Iniciar control" button |
| 2181:1057 | Esp Citas Detalle · En curso · Tab Resumen | Active appt with tabs: Resumen / HC / Anotaciones / Evolución / Prescripción / Notas internas + live timer |
| 2150:1044 | Modal Cita en Progreso (conflicto) | Conflict modal: "Pausar y tomar esta" / "Ir a mi cita activa" |

### New Consultation Form (4 steps)
| Node | Step | Name |
|------|------|------|
| 2226:1416 | 1 | HC En curso · Anamnesis |
| 2227:1472 | 2 | HC En curso · Examen Visual |
| 2228:1528 | 3 | HC En curso · Diagnóstico y Plan |
| 2228:1678 | 4 | HC En curso · Prescripción y Cierre |
| 2314:2136 | 4b | HC En curso · Fórmula Óptica Preview + Firma |

### Follow-up / Control Form (4 steps)
| Node | Step | Name |
|------|------|------|
| 2273:2001 | 1 | Seguimiento · Anamnesis de Control |
| 2253:1472 | 1b | Seg · En curso — Revisión HC (HC review variant) |
| 2273:2149 | 2 | Seguimiento · Examen Comparativo |
| 2267:1752 | 3 | Seguimiento · Evolución Diagnóstica |
| 2267:1920 | 4 | Seguimiento · Actualizar Fórmula y Cierre |

---

## 3. Design Token Reference

| Token | Value |
|-------|-------|
| Brand green (primary) | `#0f8f64` |
| Green light bg | `#e5f6ef` |
| Green light border | `#effcf5` |
| Text primary | `#0f0f12` / `#121215` |
| Text muted | `#7d7d87` |
| Text placeholder | `#b4b5bc` |
| Divider | `#e5e5e9` / `#f0f0f2` |
| Danger | `#b82626` |
| Warning bg | `#fff6e3` |
| Warning border | `#f0e0b0` |
| Warning text | `#b57218` |
| Info bg | `#eff1ff` |
| Info border | `#3a71f7` |
| Sidebar bg | `#fcfcfd` |
| Page bg | `#f5f5f6` |

---

## 4. UI Layout Pattern

All specialist screens share the same layout:
- **Sidebar** (240px): Logo + Nav (CLÍNICA: Pacientes, Citas | GESTIÓN: Informe de Gestión, Órdenes de Lab.) + SedeBlock + UserFooter
- **Topbar** (60px): Breadcrumb + appointment title + status chip + action buttons (Pausar / Completar)
- **Content** (flex row): FormCard (780px) + AsidePanel (332px)
- **FooterBar** (64px): Legal note (Res. 1995/1999, CUPS code)

The **AsidePanel** shows:
- Patient avatar + name + status badge
- Fórmula vigente (highlighted in green, with warning if expiring)
- DX activo (CIE-10 code + description)
- Paso actual (step X de 4)
- Marco legal (Res. 1995/1999, CUPS, Ley 650/2001)
- Tip card (green border: context guidance for current step)

The **FormCard** has:
- TabBar (4 tabs, active tab = white bg + green underline, completed = dot indicator)
- FormBody (scrollable content)
- Navigation buttons (Anterior / Siguiente or Firmar)

---

## 5. Appointment Lifecycle (State Machine)

```
scheduled ─────────────────────────────────────────────────────► cancelled
    │
    │ POST /appointments/:id/take  (specialist clicks "Tomar cita")
    ▼
in_progress ──► paused ──► in_progress  (specialist clicks Pausar / Reanudar)
    │
    │ POST /appointments/:id/complete  (specialist signs + clicks "Completar consulta")
    ▼
completed
```

**Conflict rule**: A specialist can only have ONE appointment `in_progress` at a time. If they try to take a second, the conflict modal appears with options: "Pausar y tomar esta" or "Ir a mi cita activa".

**Timer**: The frontend tracks elapsed time from when the appointment was taken (local state or server-set `started_at` field).

---

## 6. Data Models Needed

### 6.1 New Domain Entities

#### ClinicalRecord (Historia Clínica)
Umbrella record linking one appointment to all clinical sub-entities.

```go
type ClinicalRecord struct {
    ID            uint       `gorm:"primaryKey;autoIncrement"`
    ClinicID      uint       `gorm:"not null;index"`
    AppointmentID uint       `gorm:"uniqueIndex;not null"`
    PatientID     uint       `gorm:"not null;index"`
    SpecialistID  uint       `gorm:"not null;index"`
    RecordType    string     `gorm:"type:varchar(20);not null"` // "new_consultation" | "follow_up"
    Status        string     `gorm:"type:varchar(20);not null"` // "in_progress" | "completed" | "signed"
    SignedAt       *time.Time
    SignedByID    *uint
    CUPS          string     `gorm:"type:varchar(10)"`  // 890205 | 890307
    CreatedAt     time.Time
    UpdatedAt     time.Time
    DeletedAt     *time.Time
    // Associations
    Appointment *Appointment `gorm:"foreignKey:AppointmentID"`
    Patient     *Patient     `gorm:"foreignKey:PatientID"`
    Specialist  *User        `gorm:"foreignKey:SpecialistID"`
    Anamnesis   *Anamnesis   `gorm:"foreignKey:ClinicalRecordID"`
    VisualExam  *VisualExam  `gorm:"foreignKey:ClinicalRecordID"`
    Diagnosis   *ClinicalDiagnosis  `gorm:"foreignKey:ClinicalRecordID"`
    Prescription *ClinicalPrescription `gorm:"foreignKey:ClinicalRecordID"`
}
```

#### Anamnesis (Step 1 — New Consultation)
```go
type Anamnesis struct {
    ID                   uint   `gorm:"primaryKey;autoIncrement"`
    ClinicID             uint   `gorm:"not null;index"`
    ClinicalRecordID     uint   `gorm:"uniqueIndex;not null"`
    ReasonForVisit       string `gorm:"type:text;not null"`           // motivo consulta
    // Antecedentes sistémicos
    SystemicBackground   string `gorm:"type:text"`                    // JSON array of conditions
    // Antecedentes oculares
    OcularBackground     string `gorm:"type:text"`                    // JSON array
    // Antecedentes familiares
    FamilyBackground     string `gorm:"type:text"`                    // JSON array
    // Antecedentes farmacológicos
    PharmacologicalBackground string `gorm:"type:text"`               // free text
    // Corrección óptica en uso
    CurrentCorrectionType string `gorm:"type:varchar(50)"`            // gafas_vl / gafas_vp / progresivos / lc / ninguna
    CurrentCorrectionTime string `gorm:"type:varchar(100)"`           // tiempo de uso
    CreatedAt time.Time
    UpdatedAt time.Time
}
```

#### VisualExam (Step 2 — New Consultation)
```go
type VisualExam struct {
    ID               uint    `gorm:"primaryKey;autoIncrement"`
    ClinicID         uint    `gorm:"not null;index"`
    ClinicalRecordID uint    `gorm:"uniqueIndex;not null"`
    // Agudeza Visual sin corrección
    AVScOD           string  `gorm:"type:varchar(10)"`  // Snellen OD
    AVScOI           string  `gorm:"type:varchar(10)"`  // Snellen OI
    AVNearScOD       string  `gorm:"type:varchar(10)"`  // Jaeger OD
    AVNearScOI       string  `gorm:"type:varchar(10)"`  // Jaeger OI
    // Agudeza Visual con corrección
    AVCcOD           string  `gorm:"type:varchar(10)"`
    AVCcOI           string  `gorm:"type:varchar(10)"`
    AVNearCcOD       string  `gorm:"type:varchar(10)"`
    AVNearCcOI       string  `gorm:"type:varchar(10)"`
    // Refracción objetiva (autoref)
    AutorefSphOD     float64 `gorm:"type:decimal(5,2)"`
    AutorefCylOD     float64 `gorm:"type:decimal(5,2)"`
    AutorefAxisOD    int
    AutorefSphOI     float64 `gorm:"type:decimal(5,2)"`
    AutorefCylOI     float64 `gorm:"type:decimal(5,2)"`
    AutorefAxisOI    int
    // Refracción subjetiva
    SubjSphOD        float64 `gorm:"type:decimal(5,2)"`
    SubjCylOD        float64 `gorm:"type:decimal(5,2)"`
    SubjAxisOD       int
    SubjAVOD         string  `gorm:"type:varchar(10)"`
    SubjSphOI        float64 `gorm:"type:decimal(5,2)"`
    SubjCylOI        float64 `gorm:"type:decimal(5,2)"`
    SubjAxisOI       int
    SubjAVOI         string  `gorm:"type:varchar(10)"`
    Addition         float64 `gorm:"type:decimal(5,2)"`
    // Keratometría
    KeroK1OD         float64 `gorm:"type:decimal(5,2)"`
    KeroK2OD         float64 `gorm:"type:decimal(5,2)"`
    KeroAxisOD       int
    KeroK1OI         float64 `gorm:"type:decimal(5,2)"`
    KeroK2OI         float64 `gorm:"type:decimal(5,2)"`
    KeroAxisOI       int
    // PIO
    IOPMethod        string  `gorm:"type:varchar(30)"`  // goldman | air | icare
    IOPOD            float64 `gorm:"type:decimal(5,2)"`
    IOPOI            float64 `gorm:"type:decimal(5,2)"`
    // Biomicroscopía (segmento anterior) — free text per field
    BiomicCorneaOD   string  `gorm:"type:text"`
    BiomicCorneaOI   string  `gorm:"type:text"`
    BiomicLensOD     string  `gorm:"type:text"`
    BiomicLensOI     string  `gorm:"type:text"`
    BiomicConjOD     string  `gorm:"type:text"`
    BiomicConjOI     string  `gorm:"type:text"`
    BiomicAcOD       string  `gorm:"type:text"` // cámara anterior
    BiomicAcOI       string  `gorm:"type:text"`
    // Fondo de ojo (segmento posterior)
    FundusVitreousOD string  `gorm:"type:text"`
    FundusVitreousOI string  `gorm:"type:text"`
    FundusDiscOD     string  `gorm:"type:text"`
    FundusDiscOI     string  `gorm:"type:text"`
    FundusMaculaOD   string  `gorm:"type:text"`
    FundusMaculaOI   string  `gorm:"type:text"`
    FundusPeriphOD   string  `gorm:"type:text"`
    FundusPeriphOI   string  `gorm:"type:text"`
    // Motilidad ocular
    OcularMotility   string  `gorm:"type:text"`
    // Annotations (existing eye annotation paths/images from Appointment)
    Notes            string  `gorm:"type:text"`
    CreatedAt time.Time
    UpdatedAt time.Time
}
```

#### ClinicalDiagnosis (Step 3 — New Consultation)
```go
type ClinicalDiagnosis struct {
    ID                  uint   `gorm:"primaryKey;autoIncrement"`
    ClinicID            uint   `gorm:"not null;index"`
    ClinicalRecordID    uint   `gorm:"uniqueIndex;not null"`
    // Diagnóstico principal
    PrimaryCode         string `gorm:"type:varchar(10);not null"` // CIE-10 code e.g. "H521"
    PrimaryDescription  string `gorm:"type:varchar(200);not null"`
    DiagnosisType       int    `gorm:"not null"` // 1=impresión, 2=confirmado, 3=recurrente
    // Diagnósticos relacionados (up to 3)
    Related1Code        string `gorm:"type:varchar(10)"`
    Related1Desc        string `gorm:"type:varchar(200)"`
    Related2Code        string `gorm:"type:varchar(10)"`
    Related2Desc        string `gorm:"type:varchar(200)"`
    Related3Code        string `gorm:"type:varchar(10)"`
    Related3Desc        string `gorm:"type:varchar(200)"`
    // CIE-11 (future migration — Res. 1442/2024)
    CIE11Code           string `gorm:"type:varchar(20)"`
    // Plan de atención
    OpticalCorrectionPlan string `gorm:"type:varchar(50)"` // gafas_vl | gafas_vp | progresivos | bifocal | lc | sin_correccion
    PatientEducation    string `gorm:"type:text"`
    NextControlDate     *time.Time
    NextControlReason   string `gorm:"type:varchar(50)"` // rutina | seguimiento | urgente
    RequiresReferral    bool   `gorm:"not null;default:false"`
    // RIPS fields (Res. 2275/2023)
    CUPS                string `gorm:"type:varchar(10)"`
    CreatedAt time.Time
    UpdatedAt time.Time
}
```

#### ClinicalPrescription (Step 4 — New Consultation / Legal Document)
```go
type ClinicalPrescription struct {
    ID               uint       `gorm:"primaryKey;autoIncrement"`
    ClinicID         uint       `gorm:"not null;index"`
    ClinicalRecordID uint       `gorm:"uniqueIndex;not null"`
    // Fórmula óptica — OD
    SphOD            float64    `gorm:"type:decimal(5,2)"`
    CylOD            float64    `gorm:"type:decimal(5,2)"`
    AxisOD           int
    AVccOD           string     `gorm:"type:varchar(10)"`
    AddOD            float64    `gorm:"type:decimal(5,2)"`
    DPOD             float64    `gorm:"type:decimal(5,2)"`
    // Fórmula óptica — OI
    SphOI            float64    `gorm:"type:decimal(5,2)"`
    CylOI            float64    `gorm:"type:decimal(5,2)"`
    AxisOI           int
    AVccOI           string     `gorm:"type:varchar(10)"`
    AddOI            float64    `gorm:"type:decimal(5,2)"`
    DPOI             float64    `gorm:"type:decimal(5,2)"`
    // Lente & tratamientos
    LensType         string     `gorm:"type:varchar(50)"`  // monofocal | bifocal | progresivo | ocupacional
    LensMaterial     string     `gorm:"type:varchar(50)"`  // policarbonato | cr39 | trivex | etc
    LensUse          string     `gorm:"type:varchar(50)"`  // permanente | lectura | intermitente
    MountingHeight   float64    `gorm:"type:decimal(5,2)"` // mm
    Treatments       string     `gorm:"type:text"`         // JSON array: antirreflejo, fotocromatico, filtro_luz_azul, endurecido
    // Vigencia legal (Decreto 2200/2005: 6-12 months)
    ValidityMonths   int        `gorm:"not null;default:12"`
    ValidUntil       *time.Time
    // Firma digital (Ley 650/2001 Art. 24)
    SignedByID       *uint
    SignedAt         *time.Time
    ProfessionalTP   string     `gorm:"type:varchar(50)"` // tarjeta profesional CTNPO
    // RIPS
    CUPS             string     `gorm:"type:varchar(10)"`
    CreatedAt time.Time
    UpdatedAt time.Time
}
```

#### FollowUp (Seguimiento/Control — 4 steps combined)
```go
type FollowUp struct {
    ID               uint       `gorm:"primaryKey;autoIncrement"`
    ClinicID         uint       `gorm:"not null;index"`
    ClinicalRecordID uint       `gorm:"uniqueIndex;not null"`
    // Step 1: Anamnesis Control
    ControlReason        string `gorm:"type:text;not null"`
    CorrectionSatisfaction string `gorm:"type:varchar(20)"` // muy_buena | buena | regular | mala
    SubjectiveChanges    string `gorm:"type:text"`
    NewMedications       string `gorm:"type:text"`
    SystemicChanges      string `gorm:"type:text"`
    CorrectionUsage      string `gorm:"type:varchar(50)"`
    DailyUsageHours      string `gorm:"type:varchar(20)"`
    ObsBeforeExam        string `gorm:"type:text"`
    // Step 2: Examen Comparativo (reuses VisualExam fields — stored in linked VisualExam entity)
    // Step 3: Evolución Diagnóstica
    DiagnosticEvolution  string `gorm:"type:varchar(20)"` // estable | progresa | mejora | remite
    EvolutionDescription string `gorm:"type:text"`
    // New diagnosis (only if real pathology change)
    NewDiagCode          string `gorm:"type:varchar(10)"`
    NewDiagDesc          string `gorm:"type:varchar(200)"`
    // Continuity plan
    OpticalDecision      string `gorm:"type:varchar(30)"` // mantener | actualizar | suspender
    NextControlDate      *time.Time
    NextControlInterval  string `gorm:"type:varchar(50)"`
    PatientEducation     string `gorm:"type:text"`
    // Step 4: Actualizar Fórmula y Cierre
    FormulaDecision      string `gorm:"type:varchar(20)"` // mantener | actualizar
    NewValidityMonths    int    `gorm:"not null;default:12"`
    NewValidUntil        *time.Time
    // Firma
    SignedByID           *uint
    SignedAt             *time.Time
    ProfessionalTP       string `gorm:"type:varchar(50)"`
    // RIPS
    CUPS                 string `gorm:"type:varchar(10)"` // 890307
    CreatedAt time.Time
    UpdatedAt time.Time
}
```

### 6.2 Appointment Entity Changes Needed
Add to existing `Appointment`:
- `StartedAt *time.Time` — when specialist clicked "Tomar cita"
- `CompletedAt *time.Time` — when specialist signed and completed
- Already has: `Status`, `TakenByID`, `ConsultationType`

### 6.3 DB Migrations Required
```
NNN_create_clinical_records.up.sql
NNN_create_anamnesis.up.sql
NNN_create_visual_exams.up.sql
NNN_create_clinical_diagnoses.up.sql
NNN_create_clinical_prescriptions.up.sql
NNN_create_follow_ups.up.sql
NNN_add_started_at_completed_at_to_appointments.up.sql
```

All tables must have:
- `clinic_id` as second column (multi-clinic isolation)
- `deleted_at TIMESTAMPTZ NULL` (soft delete for clinical data — 15 years Res. 839/2017)
- `set_updated_at` trigger
- Partial index on `clinic_id, deleted_at IS NULL` for list queries

---

## 7. API Endpoints Required

### Appointment Lifecycle
```
POST /api/v1/appointments/:id/take          → status: in_progress, sets started_at
POST /api/v1/appointments/:id/pause         → status: paused
POST /api/v1/appointments/:id/resume        → status: in_progress
POST /api/v1/appointments/:id/complete      → status: completed, sets completed_at
GET  /api/v1/appointments/active            → returns the specialist's current in_progress appointment
```

### Specialist Agenda
```
GET  /api/v1/appointments?date=&status=&patient_search=   → specialist's own appointments
```

### New Consultation — Clinical Record Steps
```
POST /api/v1/appointments/:id/clinical-record              → create clinical record (type=new_consultation)
PUT  /api/v1/appointments/:id/clinical-record/anamnesis    → upsert anamnesis
PUT  /api/v1/appointments/:id/clinical-record/visual-exam  → upsert visual exam
PUT  /api/v1/appointments/:id/clinical-record/diagnosis    → upsert diagnosis
PUT  /api/v1/appointments/:id/clinical-record/prescription → upsert prescription
POST /api/v1/appointments/:id/clinical-record/sign         → sign + complete (sets signed_at)
GET  /api/v1/appointments/:id/clinical-record              → get full clinical record with all steps
```

### Follow-up — Clinical Record Steps
```
POST /api/v1/appointments/:id/clinical-record              → create clinical record (type=follow_up)
PUT  /api/v1/appointments/:id/clinical-record/follow-up/anamnesis    → upsert follow-up anamnesis
PUT  /api/v1/appointments/:id/clinical-record/visual-exam            → reuse visual exam endpoint
PUT  /api/v1/appointments/:id/clinical-record/follow-up/evolution    → upsert diagnostic evolution
PUT  /api/v1/appointments/:id/clinical-record/follow-up/formula      → upsert formula decision
POST /api/v1/appointments/:id/clinical-record/sign                   → sign + complete
```

### RBAC
All clinical history endpoints: `RequireRole(domain.RoleSpecialist, domain.RoleAdmin)`
All agenda endpoints: `RequireRole(domain.RoleSpecialist, domain.RoleAdmin)`

---

## 8. Frontend Pages & Components

### New/Updated Pages
| Path | Component | Description |
|------|-----------|-------------|
| `/specialist/appointments` | `SpecialistAppointmentsPage` | Agenda with empty state + list |
| `/specialist/appointments/:id` | `SpecialistAppointmentDetailPage` | Detail with tabs + lifecycle buttons |
| `/specialist/appointments/:id/clinical-history` | `ClinicalHistoryNewConsultationPage` | 4-tab new consultation form |
| `/specialist/appointments/:id/follow-up` | `ClinicalHistoryFollowUpPage` | 4-tab follow-up form |

### Component Breakdown

#### Agenda
- `AppointmentAgendaEmpty` — KPI cards + empty state message
- `AppointmentAgendaList` — date filter + search + status chips + appointment rows
- `AppointmentCard` — single appointment row with status badge

#### Appointment Detail
- `AppointmentDetailTopbar` — breadcrumb + title + status chip + Pausar/Completar buttons
- `AppointmentDetailTabBar` — Resumen | Historia clínica | Anotaciones | Evolución | Prescripción | Notas internas
- `AppointmentDetailResumen` — motivo, notas, pasos de atención (checklist), acciones rápidas tiles
- `ActiveTimerBanner` — green banner showing patient name + elapsed timer
- `ConflictModal` — modal for "cita en progreso" conflict

#### Shared Clinical Form Components
- `ClinicalFormLayout` — sidebar + topbar + content layout wrapper
- `ClinicalAsidePanel` — patient card + fórmula vigente + DX activo + paso actual + tip card
- `ClinicalTabBar` — 4-tab bar with active underline + completion dots

#### New Consultation Tabs
- `AnamnesisTab` — motivo consulta + antecedentes (4 sections) + corrección actual
- `VisualExamTab` — AV table + refracción obj/subj + keratometría + PIO + segmento ant/post + motilidad
- `DiagnosisTab` — CIE-10 search + type radio + related diagnoses + RIPS preview + plan de atención
- `PrescriptionTab` — formula table (OD/OI) + lente type + tratamientos + firma block
- `PrescriptionPreviewModal` — legal document preview (matches node 2314:2136)

#### Follow-up Tabs
- `FollowUpAnamnesisTab` — motivo + satisfacción + cambios/síntomas + cumplimiento
- `ComparativeExamTab` — visual exam with previous values shown side-by-side in green
- `DiagnosticEvolutionTab` — active DX cards + evolution radio + description + new DX + continuity plan
- `UpdateFormulaTab` — decision radio (mantener/actualizar) + formula table + vigencia + RIPS + firma

---

## 9. Legal Compliance Requirements

### Resolución 1995/1999 (Historia Clínica Obligatoria)
- HC must be created for every consultation (mandatory)
- Must include: identification, anamnesis, examen físico, diagnóstico, plan de tratamiento
- Must be kept minimum 15 years (Res. 839/2017)
- Specialist's professional signature required for closure
- Soft delete only — never physical deletion

### Ley 650/2001 Art. 24 (Fórmula Óptica = Documento Legal)
- Fórmula óptica is a legal document signed by the optometrist
- Must include: patient name/ID, date, OD/OI values (SPH, CYL, AXIS, AV, ADD, DP), lens type, professional name + T.P. (Tarjeta Profesional CTNPO), clinic name
- Must be written in Spanish (Decreto 825/1954)

### Decreto 2200/2005 (Vigencia Prescripción)
- Prescription valid 6-12 months from signature date
- Default: 12 months
- System must calculate and store `valid_until` date

### RIPS — Res. 2275/2023
- CUPS code captured: 890205 (consulta optometría), 890307 (control optometría)
- CIE-10 diagnosis code stored with type (1=impresión, 2=confirmado, 3=recurrente)
- JSON RIPS generated on completion/signing (future export endpoint)

### Ley 1581/2012 (Datos Sensibles)
- Clinical data classified as "datos sensibles"
- All clinic_id isolation maintained (no cross-clinic access)
- Audit trail via created_at/updated_at/deleted_at

### CIE-11 Readiness (Res. 1442/2024)
- `cie11_code` field stored in diagnosis (nullable, for future migration)
- Displayed in UI as "preparación migración" — disabled in current form but stored

---

## 10. Existing Go Backend State

### What Exists (partial)
- `domain/appointment.go` — Appointment entity with status fields, ConsultationType enum
- `appointment/service.go` — CreateInput, UpdateInput, ManagementReportInput, ListOutput
- `platform/storage/postgres/appointment_repository.go` — CRUD + ExistsByPatientAndDate
- `platform/storage/postgres/clinical_history_repository.go` — exists (unclear scope)
- `platform/storage/postgres/prescription_repository.go` — exists
- `transport/http/v1/handler_appointment.go` — basic CRUD handlers
- `domain/patient.go` — Patient entity

### What's Missing
- Domain entities: `ClinicalRecord`, `Anamnesis`, `VisualExam`, `ClinicalDiagnosis`, `ClinicalPrescription`, `FollowUp`
- Appointment status transition methods (take, pause, resume, complete, getActive)
- Service methods for all 8 clinical record sub-steps (2 archetypes × 4 steps)
- Sign/complete handler that validates all steps are filled
- Active appointment guard (conflict detection)
- DB migrations for all new tables
- Unit tests for all new service logic

### Files to Audit Before Writing
- `convision-api-golang/internal/platform/storage/postgres/clinical_history_repository.go`
- `convision-api-golang/internal/platform/storage/postgres/prescription_repository.go`
- `convision-api-golang/internal/transport/http/v1/handler_clinical.go`

---

## 11. Plan Breakdown

### Plan 11-01: Go Backend — Domain Models + DB Migrations
- Define domain entities: `ClinicalRecord`, `Anamnesis`, `VisualExam`, `ClinicalDiagnosis`, `ClinicalPrescription`, `FollowUp`
- Add `StartedAt *time.Time` and `CompletedAt *time.Time` to Appointment
- Define `ClinicalRecordRepository`, `AnamnesisRepository`, etc. interfaces
- Write SQL migrations for all new tables (with clinic_id, soft delete, triggers, indexes)
- Register in AutoMigrate (local only)

### Plan 11-02: Go Backend — Service Layer
- `appointment/service.go` additions: `TakeAppointment`, `PauseAppointment`, `ResumeAppointment`, `CompleteAppointment`, `GetActiveAppointment`
- New `clinicalrecord/service.go`: `CreateClinicalRecord`, `UpsertAnamnesis`, `UpsertVisualExam`, `UpsertDiagnosis`, `UpsertPrescription`, `SignAndComplete`
- New `followup/service.go`: `UpsertFollowUpAnamnesis`, `UpsertFollowUpEvolution`, `UpsertFollowUpFormula`, `SignAndCompleteFollowUp`
- Business rules: validate all steps filled before sign; validate specialist owns appointment; validate no other in_progress

### Plan 11-03: Go Backend — HTTP Handlers + Routes
- `handler_appointment.go` additions: TakeAppointment, PauseAppointment, ResumeAppointment, CompleteAppointment, GetActiveAppointment
- New `handler_clinical_record.go`: all clinical record CRUD + sign endpoints
- Routes with RBAC (`RequireRole(RoleSpecialist, RoleAdmin)`)
- Wire in `main.go`

### Plan 11-04: Go Backend — Unit Tests
- Tests for appointment status transitions (take/pause/resume/complete, conflict guard)
- Tests for clinical record creation + upsert per step
- Tests for sign validation (all steps required)
- Tests for follow-up flow
- All using mocked Repository interfaces

### Plan 11-05: Frontend — Specialist Agenda + Appointment Detail
- `SpecialistAppointmentsPage` — agenda list + empty state + KPI cards + date/status filter + search
- `SpecialistAppointmentDetailPage` — tab layout with:
  - Tab: Resumen (motivo, notas, pasos de atención, acciones rápidas, patient card, previous Rx, alerts)
  - Topbar with Pausar/Completar buttons + status chip
  - `ActiveTimerBanner`
  - `ConflictModal`
- Services: `appointmentService.takeAppointment`, `pauseAppointment`, `resumeAppointment`, `completeAppointment`

### Plan 11-06: Frontend — New Consultation Flow (4 tabs)
- `ClinicalHistoryNewConsultationPage` with `ClinicalFormLayout`
- Tab 1 `AnamnesisTab`: motivo consulta + 4 antecedente sections + corrección actual
- Tab 2 `VisualExamTab`: AV table (sc/cc × dist/near × OD/OI) + refracción (obj/subj) + keratometría + PIO + biomicroscopía (ant/post) + motilidad
- Tab 3 `DiagnosisTab`: CIE-10 search picker + type radios + related Dx + RIPS preview card + plan de atención (correction type, education, next visit, referral)
- Tab 4 `PrescriptionTab`: formula table (OD/OI: SPH/CYL/AXIS/AVcc/ADD/DP) + lens type/material/use + vigencia + treatments chips + firma block
- Auto-save on step change (PATCH per step endpoint)
- Navigation: Siguiente / Anterior buttons + "Firmar y completar consulta" on last tab

### Plan 11-07: Frontend — Follow-up/Control Flow (4 tabs)
- `ClinicalHistoryFollowUpPage` with same `ClinicalFormLayout`
- Tab 1 `FollowUpAnamnesisTab`: motivo control + satisfacción radio + cambios subjetivos + nuevos meds + cambios sistémicos + uso corrección + hours + obs
- Tab 2 `ComparativeExamTab`: same visual exam fields + previous visit values shown in green left column
- Tab 3 `DiagnosticEvolutionTab`: active DX cards (green border) + evolution radio (Estable/Progresa/Mejora/Remite) + description textarea + new DX toggle (CIE-10 + desc) + plan continuidad (mantener/actualizar/suspender corrección + próximo control date + interval + education)
- Tab 4 `UpdateFormulaTab`: decision radio (mantener/actualizar) + formula table (pre-filled from previous in green, editable if "actualizar") + vigencia display + RIPS auto card + firma block + "Firmar y cerrar control"
- AsidePanel shows: patient info + fórmula vigente (with expiry warning) + DX activo + paso actual + marco legal

### Plan 11-08: Frontend — Prescription Legal Document Preview + Digital Signature
- `PrescriptionPreviewModal` — styled legal document matching node 2314:2136:
  - Clinic header (logo + name + REPS number + address)
  - Patient: name, ID, age, date
  - Professional: name, T.P. CTNPO, specialty
  - OD/OI table (SPH, CYL, AXIS, AV, ADD, DP)
  - Lens type + material + treatments
  - Valid until date + CUPS code
  - Signature block (professional name + stamp + T.P.)
  - RIPS footer
- `DigitalSignatureModal` — confirmation modal before signing/closing consultation
- Service: `clinicalRecordService.signAndComplete(appointmentId)` → calls backend sign endpoint
- After sign: appointment status → completed, redirects to appointment list

---

## 12. Key Technical Decisions

1. **Clinical record per appointment**: One `ClinicalRecord` per appointment (not one per patient). Each consultation creates a new record.
2. **Upsert pattern for steps**: Each clinical step endpoint uses upsert (create if not exists, update if exists). Frontend auto-saves on tab change.
3. **Prescription pre-filled from visual exam**: When specialist reaches Prescription tab, OD/OI values are pre-filled from the subjective refraction values in VisualExam.
4. **Follow-up comparative exam**: The ComparativeExamTab shows the same VisualExam form but fetches the previous clinical record's VisualExam to display alongside (in green).
5. **Formula decision in follow-up**: If "mantener", the existing prescription values are copied and vigencia renewed. If "actualizar", the specialist edits the formula fields.
6. **RIPS auto-generation**: The backend computes RIPS JSON fields (CUPS, CIE-10, tipo) at sign time and stores them. A future endpoint will export RIPS JSON.
7. **Conflict detection**: Backend `TakeAppointment` handler checks if the specialist already has an `in_progress` appointment; returns 409 with the active appointment in the response body.
8. **Timer**: Frontend tracks elapsed time locally from the moment `TakeAppointment` succeeds. Backend stores `started_at` for audit/billing.
