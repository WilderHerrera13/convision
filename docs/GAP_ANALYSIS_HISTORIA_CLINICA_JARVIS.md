# Historia Clínica, Atención en Óptica y RIPS — Convision vs. Jarvis: Análisis de Brechas

> Conciliación del flujo de historia clínica, consulta de optometría, venta de lentes y reporte regulatorio RIPS/IHCE de Convision contra Jarvis/Proteger IPS, tomado como referencia de lógica de negocio (no de calidad de implementación). Objetivo: levantar brechas funcionales concretas, con `archivo:línea` verificado.
>
> **Fecha:** 2026-07-13 · **Alcance:** `convision-api-golang` + `convision-front` · **Fuentes de referencia:** `jarvis_optica/HISTORIA_CLINICA_Y_CONSULTA_OPTICA.md` + investigación dedicada de RIPS/IHCE en esta sesión.
>
> **Documento hermano:** [GAP_ANALYSIS_FACTURACION_JARVIS.md](GAP_ANALYSIS_FACTURACION_JARVIS.md)

> **Contexto de negocio (definición de producto):** Convision está pensado para **ópticas privadas**, no para una IPS con convenios EPS/ARL como Jarvis. Esto **no exime de RIPS** — corregido tras aclaración del negocio (2026-07-13): la obligación de generar RIPS depende de que la consulta de optometría es un servicio de salud prestado por un prestador habilitado (REPS) y reportable al sistema de información en salud (SISPRO), **sin importar si el pago es privado o vía EPS/ARL**. La normativa vigente (Resolución 2275/2023) exige el RIPS como JSON ligado a la Factura Electrónica de Venta (FEV) en salud — el mismo mecanismo B documentado en la sección 07 para Jarvis. La sección 07 se actualiza para reflejar esto como **brecha real**, no descartada.

---

## Resumen ejecutivo

El hallazgo más importante de este análisis **no es una brecha frente a Jarvis** — es una brecha interna: Convision tiene **tres generaciones sucesivas del mismo concepto de historia clínica coexistiendo en el código a la vez** (`ClinicalHistory`/`ClinicalEvolution` legacy MUI, `ClinicalRecord`/`ClinicalPrescription` activo, y `Prescription` plano legacy), y **el flujo de venta solo conoce al más viejo de los tres**. Esto significa que, en el camino real de uso hoy (especialista llena el formulario nuevo → firma → recepcionista vende el lente), **la fórmula clínica que el especialista efectivamente diligenció y firmó puede no llegar a la orden de laboratorio**, porque `sale/service.go` lee de la tabla vieja `appointment_prescriptions`, no de `ClinicalPrescription`. Jarvis, con toda su fragmentación en ~35 CRUDs, al menos comparte un único registro de fórmula (`T10formulas`) entre consulta y venta — Convision, con una arquitectura más moderna, introdujo una desconexión que Jarvis no tiene.

En **RIPS/IHCE**, la comparación es asimétrica: Jarvis tiene tres mecanismos paralelos (uno legado en archivos plano, uno JSON vigente atado a facturación, y un prototipo FHIR nunca conectado a producción), mientras Convision no tiene ninguno. **Confirmado por el negocio: sí aplica.** Toda consulta de optometría es un servicio de salud reportable, sin importar si el pago es privado o vía EPS — la norma vigente exige el RIPS como JSON ligado a la Factura Electrónica de Venta en salud (mecanismo B de Jarvis). Esto ata la brecha de RIPS directamente a la de facturación electrónica: no se puede generar/enviar RIPS sin que `convision-invoicing-api` esté operativo en producción (ver `GAP_ANALYSIS_FACTURACION_JARVIS.md`, P0 #1).

**Cifras clave:**
- **3** modelos de historia clínica coexistiendo en el mismo backend, sin que el más nuevo haya reemplazado a los anteriores en la capa que importa (la venta).
- **0** conexión entre `ClinicalPrescription` (fórmula del flujo activo) y `LaboratoryOrder`/`Sale` — la venta lee de un modelo distinto y más viejo.
- **0** filtro de facturación en la "cola de ventas" del recepcionista — una cita ya facturada sigue apareciendo como pendiente.
- **0** catálogo CIE-10/CUPS real en Convision — diagnóstico y procedimiento son texto libre.
- **0** líneas de código de RIPS/FHIR/IHCE en el backend Go — gap total, sin siquiera el prototipo que tiene Jarvis.

| Módulo | Convision | Jarvis (referencia) | Brecha |
|---|---|---|---|
| Modelo de historia clínica | 3 generaciones coexistiendo, sin migración completa | Orden+paciente+examen, un solo eje | **Riesgo interno, no gap frente a Jarvis** |
| Consulta de optometría | Formulario estructurado rico (objetiva/subjetiva, queratometría, PIO, biomicroscopía) | Un solo bloque de refracción por ojo | Convision es superior en estructura |
| Diagnósticos / CIE-10 | Texto libre, sin catálogo | Catálogo real `t41cie10` | Brecha |
| Fórmula → venta | Desconectada: venta usa el modelo viejo, no el firmado | Un solo `T10formulas` compartido | **Brecha crítica** |
| Consulta → venta | Cola de ventas sin filtro de facturación | Reporte "consultas sin facturar" (detecta el síntoma) | Convision no detecta ni el síntoma |
| RIPS legado (archivo plano) | No existe | Funcional, manual | No es el formato vigente — no replicar |
| RIPS vigente (FEV-RIPS JSON) | No existe | Funcional, atado a factura | **Brecha real y aplica** — depende de facturación electrónica operativa |
| IHCE/FHIR | No existe | Prototipo nunca conectado (`exit;` corta el envío real) | No es prioritario — ni en Jarvis funciona hoy |
| Catálogos regulatorios | Tipo doc./afiliación/cobertura/EPS sí existen | CIE10 real, CUPS como array PHP | Parcial en ambos lados |
| Historial longitudinal de fórmula | Solo el último registro firmado | Se puede reconstruir desde `T10formulas`/`T42optometrias` por orden | Brecha |
| Rol especialista (RBAC) | Sistema de permisos por BD, con residuos de checks hardcodeados | Permisos ad-hoc dispersos, sin validar en varios flujos | Convision es superior pero no 100% migrado |

---

## 01 · Historia clínica / expediente clínico — tres modelos paralelos

**Veredicto:** riesgo arquitectónico propio, no heredado de la comparación con Jarvis.

Convision tiene tres implementaciones vivas del mismo concepto:

| # | Modelo | Tablas | Paquete | Frontend | Estado |
|---|---|---|---|---|---|
| 1 | `ClinicalHistory` + `ClinicalEvolution` (SOAP), 1 por **paciente** | `clinical_histories`, `clinical_evolutions` | `internal/clinic/` | `pages/admin/ClinicalHistory.tsx` (Material UI) | Legacy, aún ruteado |
| 2 | `ClinicalRecord` (+ `Anamnesis`/`VisualExam`/`Diagnosis`/`ClinicalPrescription`), 1 por **cita** | `clinical_records`, `visual_exams`, `diagnoses`, `prescriptions` | `internal/clinicalrecord/` | `AppointmentClinicalForm.tsx` + `NewConsultation/*` (Tailwind/shadcn) | **Activo hoy** |
| 3 | `Prescription` plano, 1 por **cita** | `appointment_prescriptions` | `internal/prescription/` | `PrescriptionForm.tsx` | Legacy, pero **el único conectado a la venta** (ver sección 04) |

Evidencia de que (2) es el activo: `App.tsx:753` monta `ClinicalHistoryNewConsultationPage` para el especialista; `AppointmentClinicalForm.tsx:18` importa exclusivamente `clinicalRecordService`. El modelo (1) sigue con página propia en MUI (`ClinicalHistory.tsx:1-11`), y las migraciones muestran un rediseño de esquema abandonado a mitad de camino (`clinical_diagnoses`/`clinical_prescriptions` de `000009`/`000010` reemplazadas por `diagnoses`/`prescriptions` en `000014`/`000015`, probablemente huérfanas en BD).

**Jarvis (contraste):** fragmenta "hacia los lados" (~35 CRUDs unidos por relación de datos), pero todos escriben sobre el mismo eje `T22ordenes`+`T11pacientes`. Convision fragmenta "hacia atrás en el tiempo" — tres rediseños sucesivos donde el más nuevo no reemplazó a los anteriores en la capa que importa.

---

## 02 · Consulta de optometría / examen visual

**Veredicto:** Convision es superior en estructura de datos clínicos.

`Anamnesis` (`clinical_record.go:60-105`) captura antecedentes sistémicos con detalle (diabetes con año/HbA1c, hipertensión con medicación), antecedentes oculares, antecedentes familiares oftálmicos y banderas farmacológicas de riesgo ocular (corticoides, hidroxicloroquina, tamsulosina, antihistamínicos, amiodarona). `VisualExam` (`clinical_record.go:108-192`) separa refracción **objetiva vs. subjetiva** por ojo, y añade queratometría (K1/K2/eje), PIO (método+valor), biomicroscopía de segmento anterior y fondo de ojo por ojo, motilidad ocular — nada de esto aparece en el resumen de Jarvis leído (que solo modela un bloque de refracción por ojo en `T42optometrias`).

**Lo que falta frente a Jarvis:** un motor de habilitación secuencial de exámenes (`FuncionesExamenes::enableNextLevel`/`permitirVisualizacion`) — en Convision el orden Anamnesis→VisualExam→Diagnosis→Prescription es solo una convención de tabs en el frontend, sin validación de secuencia en el backend. Impacto probablemente bajo (Convision es monoespecialidad, no necesita orquestar múltiples tipos de examen por orden como Jarvis).

---

## 03 · Diagnósticos / CIE-10

**Veredicto:** brecha — campo existe, catálogo no.

`Diagnosis.PrimaryCode`/`PrimaryDescription` (`clinical_record.go:200-201`) son `VARCHAR(20)`/`TEXT` libres, sin FK a catálogo (`db/migrations/platform/000014_create_diagnoses.up.sql:11-12` solo tiene un `CHECK` sobre `diagnosis_type`). En frontend, `DiagnosisTab.tsx:32` define el CIE-10 como dos inputs de texto simples, sin autocomplete. `ReferralTab/CupsModal.tsx:44` trae el comentario literal `// Mock cups data based on the image` — confirma que ni el catálogo CUPS está conectado a datos reales.

**Jarvis, en contraste:** sí tiene un catálogo real, `t41cie10`/`App\T41cie10` — aunque con su propio problema grave (filtra los diagnósticos reportados a RIPS a solo códigos `Z%`, fabricando `'Z100'` por defecto, ver sección 07).

---

## 04 · Fórmula de lentes / prescripción → conexión con la venta

**Veredicto: brecha crítica, verificada en código.** Este es el hallazgo más importante de todo el documento.

Hay dos fórmulas desconectadas:
- **La nueva**, `ClinicalPrescription` (tabla `prescriptions`, dentro de `ClinicalRecord`) — la que llena el especialista en el flujo activo hoy.
- **La vieja**, `domain.Prescription` (tabla `appointment_prescriptions`, `internal/domain/prescription.go:11-45`) — modelo plano independiente, ligado solo a `AppointmentID`.

**Confirmado en esta sesión:** `sale/service.go` solo importa/usa `domain.PrescriptionRepository` (`sale/service.go:33,53,70`) y lo consulta en `createLabOrderIfNeeded` (línea 1247-1248: `s.prescriptionRepo.GetByAppointmentID(...)`). No hay ninguna referencia a `ClinicalRecordRepository` ni a `ClinicalPrescription` en todo el archivo `sale/service.go`.

**Consecuencia práctica:** si el paciente pasó por el flujo clínico nuevo y completo (Anamnesis → VisualExam → Diagnosis → `ClinicalPrescription` → firma), la orden de laboratorio generada al vender el lente **no llevará esa fórmula** — llevará lo que haya (o no haya) en `appointment_prescriptions` para esa cita, tabla que en el flujo actual del especialista normalmente **no se está poblando** (porque el especialista usa el formulario nuevo, no `PrescriptionForm.tsx`, que es el único que escribe en el modelo viejo). Es decir: hoy, en el camino normal de atención, la fórmula que realmente llega al laboratorio puede estar vacía o desactualizada, mientras la fórmula real firmada por el especialista queda "atrapada" en `ClinicalPrescription` sin salir de ahí.

**Jarvis (contraste):** pese a su fragmentación en ~35 CRUDs, comparte un único modelo de fórmula (`T10formulas`, `t10orden -> t22id`) entre la consulta de optometría y la venta — no tiene este problema específico.

---

## 05 · Flujo consulta → venta: ¿transaccional o separado?

**Veredicto:** procesos separados, con una reconciliación más débil que la de Jarvis.

Firmar la historia clínica sí es atómico con completar la cita (`handler_appointment_clinical_record.go:227-244`: `SignRecord` + `Appointment.status=completed` en una sola transacción). Pero de ahí a la venta no hay transacción ni bloqueo — la cita completada simplemente aparece en la "cola de ventas" del recepcionista.

**Gap confirmado:** `appointmentsService.ts:186-191` (`getReceptionistSalesQueueTable`) filtra únicamente por `status: 'completed'`. `AppointmentFilter` (`internal/domain/appointment.go:111-124`, verificado en esta sesión) **no tiene ningún campo `IsBilled`** — aunque el campo sí existe en `Appointment.IsBilled` (línea 61) y se setea correctamente en `updateAppointmentBilling` (`sale/service.go:1295-1324`), la API de listado no puede filtrar por él. Resultado: una cita ya facturada (`IsBilled=true`, `SaleID` seteado) sigue apareciendo en la cola de ventas mientras su `status` siga en `completed` — no hay depuración real de la cola.

**Comparación con Jarvis:** Jarvis tiene el mismo problema de fondo (procesos desincronizables), pero sí construyó el síntoma-detector (`InformesInventarioController::consultaspendientes`, reporte "Consultas sin Facturar"/"Consultas Efectivas"). Convision no tiene ni el detector — el gap es más grave en la práctica porque no es visible para nadie hoy.

**Lo que sí existe como reconciliación** es el "Informe de gestión" (`ConsultationType`: `effective|formula_sale|ineffective|follow_up|warranty_follow_up`, `appointment.go:22-30`) — mide *tipificación del especialista*, no *facturación*, así que no cubre este gap específico.

---

## 06 · Ciclo de vida de citas (appointments)

**Veredicto:** existe y está bien definido — sin equivalente directo en el análisis de Jarvis para comparar en detalle.

Flujo confirmado: crear (valida choque de horario) → especialista "toma" la cita (`in_progress`, con regla de **una cita activa por especialista** — `ErrAppointmentInProgress` si ya tiene otra en curso) → puede pausar/reanudar → llena `ClinicalRecord` → firma (transacción atómica que completa la cita) → aparece en cola de ventas → venta genera `Sale.AppointmentID` → `updateAppointmentBilling` marca `IsBilled`/`BilledAt`/`SaleID` (pero no cambia `Status`) → si incluye lente, genera `LaboratoryOrder` con la fórmula vieja (sección 04).

---

## 07 · RIPS / interoperabilidad de historia clínica electrónica (IHCE/FHIR)

**Veredicto: brecha real y aplica al negocio — corregido tras aclaración (2026-07-13).** Toda consulta de optometría prestada por un proveedor habilitado (REPS) debe reportarse como RIPS, sin importar si el paciente paga de forma privada o vía EPS/ARL — la obligación nace del servicio de salud prestado, no de la forma de pago. La normativa vigente (Resolución 2275/2023) exige el RIPS como **JSON ligado a la Factura Electrónica de Venta (FEV) en salud** — no el formato legado de archivos plano de la Resolución 3374/2000.

**Consecuencia de diseño importante:** esto ata la brecha de RIPS a la de facturación electrónica. No se puede generar/enviar un RIPS válido sin una factura electrónica DIAN real detrás (CUFE, XML firmado) — es decir, esta brecha **depende de que `convision-invoicing-api` esté operativo en producción** (ver `GAP_ANALYSIS_FACTURACION_JARVIS.md`, recomendación P0 #1). Construir RIPS antes de resolver eso sería construir sobre una base que aún no existe en firme.

En Jarvis, tres mecanismos paralelos de madurez muy distinta coexisten — solo uno (el JSON vigente) es el que vale la pena replicar.

**Lo que hace Jarvis (para calibrar qué replicar y qué no):**

| Mecanismo | Formato | Estado real |
|---|---|---|
| RIPS legado (Res. 3374/2000) | Archivos plano AC/AF/AP/US/CT en ZIP | Funcional, descarga manual, sin envío HTTP a ningún organismo |
| **FEV-RIPS (Res. 2275/2023)** | JSON estructurado, atado a la factura electrónica | **Funcional y vigente** — envío síncrono, 1 factura a la vez, contra un contenedor local oficial (`FEVRIPS APILOCAL`, imagen distribuida por el gobierno, no un SaaS comercial) |
| IHCE/FHIR (bundles `*RDA` de MinSalud) | Bundle FHIR (Patient/Condition/Encounter/etc.) | **Prototipo nunca conectado**: `FuncionesIHCE::enviarRdaPacienteDesdeExamen()` tiene un `exit;` que corta la ejecución *antes* de la llamada real de envío — todo el flujo de transmisión es código muerto inalcanzable, invocado únicamente desde un controlador de pruebas con un ID hardcodeado |

**Antipatrones confirmados en Jarvis a NO replicar** (más allá de los ya conocidos de facturación — secretos hardcodeados, TLS deshabilitado):
- **Fabricación de datos del paciente para encajar en el formato**: si la edad calculada es inválida se **inventa una edad aleatoria** `rand(18,59)`; si nombre/apellido no cumplen longitud mínima se rellenan con literales falsos (`'GGGGGGG'`/`'AAAAA'`); el documento se trunca y castea con `abs(floatval(...))`, arriesgando corromper documentos alfanuméricos. Esto es un riesgo de cumplimiento serio, no solo de calidad de código — el RIPS que llega al Ministerio puede no ser el dato real del paciente.
- **Filtrado de diagnóstico que reduce fidelidad clínica**: solo se reportan códigos CIE-10 que empiezan por `Z` (hallazgos/factores), cayendo a `'Z100'` por defecto si no hay ninguno — el diagnóstico real (si no es tipo Z) nunca llega al reporte.
- **Causa/finalidad de consulta siempre con el mismo código hardcodeado** (`causaMotivoAtencion='40'`, `finalidadTecnologiaSalud='13'` fijos, sin importar el motivo real de la atención).
- Sin trazabilidad histórica de envíos (el estado vive en 2 columnas de la propia factura, sin tabla de auditoría), sin reintentos automáticos, sin dashboard de cumplimiento.
- Endpoints de la API IHCE **sin autenticación ni RBAC** (`routes/api.php` bajo el grupo `api` sin `auth:api`) — si esa API estuviera expuesta, cualquiera podría consultar pacientes en el sistema nacional RNEC.

**Confirmado en esta sesión (gap total en Convision):** cero ocurrencias de RIPS/CUPS/IHCE/FHIR como lógica de negocio en `internal/` tras grep exhaustivo (los 3 falsos positivos que aparecieron fueron todos la subcadena `"rips"` dentro de la palabra `strips`, sin relación). Las únicas apariciones de "RIPS"/"CUPS" en Convision son **texto legal decorativo hardcodeado en la UI**, sin datos ni endpoint detrás — ej. `ClinicalAsidePanel.tsx:115` (`'RIPS Res. 2275/2023'`), `PrescriptionPreviewPage.tsx:79,119` (`'CUPS: 890205'`). Los campos `Cups` en `ClinicalRecord`/`Diagnosis`/`ClinicalPrescription` son `VARCHAR(20)` libres, sin catálogo ni exportador detrás.

**El mecanismo a replicar es el B (FEV-RIPS JSON contra el contenedor oficial del gobierno, `FEVRIPS APILOCAL`)** — coherente con la decisión de negocio ya tomada de no depender de proveedores externos de facturación (ver `GAP_ANALYSIS_FACTURACION_JARVIS.md`), porque ese contenedor es distribución oficial gratuita, no un SaaS comercial de terceros. El mecanismo C (IHCE/FHIR) sirve únicamente como plantilla de estructura de los perfiles `*RDA` de referencia, no como código a reutilizar — en Jarvis nunca llegó a producción (`exit;` corta el envío real). El mecanismo A (archivos plano) no es el formato vigente y no debe replicarse.

**Qué replicar de la estructura JSON de Jarvis (sección de referencia, `T57comprobantesventaController::json()`):** `usuarios[]` (datos del paciente) → `servicios.consultas[]` (con `codConsulta`, `codDiagnosticoPrincipal`, `finalidadTecnologiaSalud`, `causaMotivoAtencion`, `codServicio`, `vrServicio`, etc.) — para optometría probablemente no se necesiten `procedimientos`/`medicamentos`/`otrosServicios`/`urgencias`/`hospitalizacion` (Jarvis tampoco los arma). **Qué NO replicar:** los valores hardcodeados de `causaMotivoAtencion`/`finalidadTecnologiaSalud`/`codServicio` (deben derivarse del tipo real de consulta, no ser una constante fija), la fabricación de edad/nombre/documento cuando no calzan en el formato, y el filtrado de diagnóstico a solo códigos `Z%`.

---

## 08 · Catálogos regulatorios (CIE-10, CUPS, tipos de documento, DANE)

**Veredicto:** parcial en ambos lados, con huecos distintos.

Convision **sí tiene** catálogos administrativos reales en `internal/domain/lookup.go`: `IdentificationType` (tipo de documento), `AffiliationType`, `CoverageType`, `HealthInsuranceProvider` (EPS) — más ordenados que el `T01directorio` genérico de Jarvis (que reutiliza una sola tabla para muchos "tipos" distintos, resueltos por coincidencia de texto del nombre, frágil ante cambios de redacción).

**Verificado que `AffiliationType`/`CoverageType`/`HealthInsuranceProvider` sí están conectados** — son campos opcionales reales en el formulario de paciente (`patient/service.go:43-45,72-74`, `domain/patient.go:28-29,47-49`, con `Preload` en `patient_repository.go:27-28`), no vestigios muertos. Dado que RIPS sí aplica (sección 07 corregida), estos campos son además **insumo directo** para el RIPS: el JSON de Jarvis usa el tipo de usuario/afiliación del paciente (`usuarios[].tipoUsuario`) — Convision ya tiene de dónde sacar ese dato, solo falta conectarlo al armado del RIPS.

Convision **no tiene**: catálogo CIE-10 (sección 03), catálogo CUPS (sección 07 — en Jarvis tampoco es una tabla real, es un array PHP de 13.445 líneas sin validación cruzada), ni ningún código DANE (cero resultados en ambos backends para ese término, en el caso de Convision).

---

## 09 · Orden de laboratorio ↔ fórmula del paciente

**Veredicto:** híbrido desconectado — mismo problema de fondo que la sección 04.

`domain.LaboratoryOrder` (`internal/domain/laboratory.go:115-156`) lleva una copia **parcial** de la fórmula en `RxOD`/`RxOI` (solo 5 campos poblados: sphere/cylinder/axis/addition/DP), sourced exclusivamente del modelo `Prescription` viejo — y por separado `LensOD`/`LensOI`/`FrameSpecs`, poblados desde el ítem vendido (`SaleItem`), describiendo el producto comercial entregado, no la especificación óptica prescrita. Los campos ricos de `ClinicalPrescription` (`LensType`, `LensMaterial`, `MountingHeight`, `Treatments`) **nunca llegan** a la orden de laboratorio.

En lo operativo, `LaboratoryOrder` sí es más rico que Jarvis para seguimiento logístico: tiene su propio historial de estados (`LaboratoryOrderStatusEntry`) y evidencias fotográficas (`LaboratoryOrderEvidence`).

---

## 10 · Rol Specialist (RBAC)

**Veredicto:** Convision es superior, pero la migración a permisos por BD no está 100% completa.

El sistema migró de constantes Go (`domain.RoleAdmin`, etc.) a permisos respaldados por BD (`jwtauth.RequirePermission("recurso:accion")` en casi toda `routes.go`), pero persisten unos pocos chequeos directos de `RoleType == domain.RoleSpecialist` fuera de ese sistema (`handler.go:526`, `auth/service.go:267`, `laboratory/service.go:597`) — un híbrido, no una migración terminada. El especialista tiene acceso completo a `ClinicalRecord` (crear/ver/firmar), a su propio "informe de gestión", y a tomar/pausar/reanudar citas — sin acceso a inventario, compras, ni aprobaciones de caja.

**Jarvis (contraste):** permisos ad-hoc dispersos, con al menos dos flujos que no validan permisos en absoluto (`autorizarAutorizacion()`, `desanular()` de facturación) — Convision, incluso con su migración incompleta, está en mejor forma aquí.

---

## 11 · Historial longitudinal de agudeza visual / fórmula

**Veredicto:** brecha confirmada — solo se puede ver el registro más reciente, no la evolución en el tiempo.

`ClinicalRecordRepository` (`clinical_record.go:261-270`, verificado en esta sesión — interfaz completa citada) **no define ningún método de listado histórico**: solo `GetByAppointmentID`, `GetLatestSignedByPatientID` (trae un único registro con `ORDER BY updated_at DESC .First()`), `Create`, los `Upsert*` por sección, y `SignClinicalRecord`. El endpoint `patients/:id/latest-clinical-record` (`routes.go:183`) expone exactamente eso: el último, no una serie temporal.

Lo que existe como "historial paginado" apunta al modelo equivocado: `patients/:id/records` (`routes.go:182`) lista el modelo legacy `ClinicalHistory`/`ClinicalEvolution` (sección 01, modelo #1), no `ClinicalRecord`/`ClinicalPrescription` (el activo); `patients/:id/prescriptions` (`routes.go:180`) sí lista históricamente, pero del modelo `Prescription` viejo, no de `ClinicalPrescription`.

**Consecuencia:** hoy no hay forma, vía API, de ver para un paciente la evolución en el tiempo de su agudeza visual/refracción tal como se captura en el flujo clínico activo — solo el registro firmado más reciente. Reconstruir esa evolución hoy requiere consultar `clinical_records` directamente en base de datos.

**Jarvis (contraste):** aunque no tiene una vista dedicada de evolución, sí se puede reconstruir históricamente porque cada orden (`T22ordenes`) con su `T42optometrias`/`T10formulas` queda accesible por paciente sin ambigüedad de modelo.

---

## Recomendaciones priorizadas

Ordenadas por relación riesgo/esfuerzo, no por orden de aparición en el documento.

### P0 — Crítico

1. **Conectar `ClinicalPrescription` (fórmula firmada) a `createLabOrderIfNeeded` en `sale/service.go`.** Hoy la orden de laboratorio se arma con el modelo `Prescription` viejo, que en el flujo activo del especialista normalmente no se puebla. Cambiar la fuente de verdad a `ClinicalRecordRepository`/`ClinicalPrescription` (o hacer que ambos modelos escriban al mismo lugar) antes de que esto cause una entrega de lente con fórmula incorrecta o vacía en producción.
2. **Decidir el destino de los tres modelos de historia clínica.** Congelar (o eliminar) los caminos que escriben al modelo #1 (`ClinicalHistory`/MUI) y #3 (`Prescription` plano) si `ClinicalRecord`/`ClinicalPrescription` es efectivamente el flujo vigente — o, si ambos deben coexistir por alguna razón de negocio no evidente en el código, documentar explícitamente cuál es la fuente de verdad para cada consumidor (venta, reportes, exportación).
3. **Agregar filtro `IsBilled` a `AppointmentFilter` y usarlo en la cola de ventas del recepcionista.** El campo ya existe y se setea correctamente (`updateAppointmentBilling`) — falta exponerlo en la query. Sin esto, una cita ya facturada sigue apareciendo como pendiente indefinidamente.

### P0 — Crítico (continuación, RIPS depende de facturación electrónica)

4. **Secuenciar RIPS después de `convision-invoicing-api` en producción.** No iniciar la construcción de RIPS hasta que la facturación electrónica esté operativa (billing doc, P0 #1) — el JSON RIPS va ligado a la FEV real (CUFE + XML firmado). Mientras tanto, sí se puede avanzar en paralelo: catálogo CIE-10 real (punto 5) y el builder del JSON RIPS a partir de `ClinicalRecord`/`Diagnosis`/`Patient` (sin el paso de envío), dejándolo listo para conectar en cuanto la factura electrónica exista.
5. **Construir un catálogo CIE-10 real** (tabla propia con FK, no texto libre) — ahora es prerrequisito directo de RIPS, no solo mejora de calidad de datos.

### P1 — Importante

6. **Exponer un endpoint de historial de `ClinicalRecord`/`ClinicalPrescription` por paciente** (no solo "el último firmado") para permitir ver la evolución de la fórmula/agudeza visual en el tiempo — necesario tanto para seguimiento clínico como para cualquier futura auditoría.
7. **Terminar la migración de RBAC**: eliminar los chequeos directos de `RoleType == domain.RoleSpecialist` que quedan fuera del sistema de permisos por BD (`handler.go:526`, `auth/service.go:267`, `laboratory/service.go:597`).
8. **Construir catálogo CUPS real** para el/los código(s) de servicio de consulta de optometría — evitar el antipatrón de Jarvis (array PHP de 13k líneas sin validación cruzada); para optometría probablemente basta con un puñado de códigos reales, no un catálogo completo de 13k entradas.

### P2 — No urgente

9. **Llevar los campos ricos de `ClinicalPrescription` (`LensType`/`LensMaterial`/`MountingHeight`/`Treatments`) hasta `LaboratoryOrder`**, una vez resuelto el punto P0 #1 de la sección de fórmula↔venta — hoy el laboratorio solo ve una fórmula parcial (5 campos) más la descripción del ítem vendido, no la especificación óptica completa.

---

*Generado a partir de lectura directa de código (`convision-api-golang`, `convision-front`) y de investigación dedicada de `jarvis_optica/jarvis/` (historia clínica, consulta de optometría, RIPS/IHCE) en esta sesión.*

---

## Estado de implementación (2026-07-13, sesión de cierre de brechas)

> Sección añadida al ejecutar `docs/PROMPT_AGENTE_HISTORIA_CLINICA_Y_RIPS.md`. No modifica el análisis original de arriba — lo complementa con lo que se implementó, cómo se verificó, y qué queda abierto. Commits en `feat/marketing-promotions`: `65d9f06`, `d146d19`, `2aaf81a`, `7b0c36d`, `fe54081`, `9e4b124`.

### P0 #1 — Fórmula firmada → orden de laboratorio (commit `65d9f06`)

**Resuelto.** `sale.Service.createLabOrderIfNeeded` ya no lee del modelo `Prescription` viejo (`appointment_prescriptions`) como fuente primaria. `populateRxFromAppointment` ahora intenta primero `ClinicalRecordRepository.GetByAppointmentID` y solo usa `rec.ClinicalPrescription` si `SignedAt != nil`; si no hay registro firmado, cae de vuelta al modelo legacy (nunca deja la orden sin fórmula). Los 3 modelos de historia clínica **no se eliminaron** — decisión deliberada: no hay grep exhaustivo que confirme cero consumidores del modelo viejo en reportes/exportación, y el mandato explícito era "no borrar sin confirmación exhaustiva". Congelarlos/migrarlos queda como trabajo futuro, documentado aquí, no ejecutado.

**Verificado en esta sesión (vía API real contra servidor `go run ./cmd/api`, no solo unit tests):** paciente de prueba, especialista firma fórmula OD sph=-1.25/cyl=-0.50/eje=90/add=+2.00/dp=32, OI sph=-1.00/cyl=-0.25/eje=85/add=+2.00/dp=31.5 → recepcionista vende un lente asociado a esa cita → la orden de laboratorio generada (`LAB-0019`, ligada a `sale_id=38`) trae exactamente esos mismos 10 valores en `rx_od`/`rx_oi`. Comparación campo a campo, sin discrepancias.

### P0 #2 — Filtro `IsBilled` en cola de ventas (commit `d146d19`, complementado en `9e4b124`)

**Resuelto, con un segundo bug relacionado encontrado y corregido en esta sesión.** `AppointmentFilter.IsBilled` existe y `appointmentsService.ts` lo envía (`is_billed: 'false'`). Verificado: una cita `completed` con `is_billed=false` aparece en `GET /api/v1/appointments?status=completed&is_billed=false`; tras generar una venta pagada en el momento de creación, deja de aparecer.

Bug adicional descubierto probando el camino "venta creada sin pago, pagada después" (`AddPayment`): `updateAppointmentBilling` solo se invocaba dentro de `Create`, nunca dentro de `AddPayment` — una venta que nace `pending` y se termina de pagar después **nunca** marcaba `IsBilled=true`, dejando la cita atascada en la cola para siempre. Corregido en `9e4b124`: `AddPayment` ahora invoca el mismo helper. Verificado con una cita nueva (id 51): `is_billed=false` antes del pago → se agrega el pago (`payment_status` pasa a `paid`) → `is_billed=true` inmediatamente → la cita desaparece de la cola en la siguiente consulta.

### P0 #3 — Catálogo CIE-10 real (commit `2aaf81a`)

**Resuelto.** Tabla `icd10_codes` (migración `000023`, ~114 códigos del capítulo VII de la CIE-10 OMS + serie Z00, sin punto decimal para mantener la convención existente del frontend) con FK real desde `Diagnosis`. `DiagnosisTab.tsx` reemplazó el input de texto libre por `Icd10ComboboxField` (envuelve `SearchableCombobox`, cumpliendo la convención del proyecto). `clinicalrecord.Service.UpsertDiagnosis` valida los 4 códigos (principal + 3 relacionados) contra el catálogo antes de persistir.

**Verificado por navegador (Playwright, sesión anterior):** el chip rápido "H520" en la UI de diagnóstico pobló correctamente el nuevo combobox buscable.

### P0 #4 — RIPS JSON (Res. 2275/2023) (commit `7b0c36d`, bug crítico corregido en `9e4b124`)

**Resuelto — con dos bugs reales encontrados y corregidos solo durante la verificación end-to-end de esta sesión** (ninguno de los dos se detectó con los unit tests originales, que usaban mocks/fixtures que no reproducían el estado real de los datos):

1. **`sql: transaction has already been committed or rolled back`.** `BuildForAppointmentAsync` corría en una goroutine fire-and-forget (mismo patrón que `sale.Service.emitInvoiceAsync`) pero reutilizaba el `*gorm.DB` de la petición HTTP — que es una transacción abierta por el middleware `TenantSchema` y comprometida (`commit`) en el instante en que el handler retorna. Cero registros de RIPS se crearon nunca en la práctica hasta corregir esto. Solucionado replicando el patrón `ConnectionFactory` que ya usa `bulkimport.Service`: la función ahora recibe el *nombre del schema* del tenant, no un `*gorm.DB`, y abre su propia conexión de vida corta vía `postgresplatform.NewSchemaConnection`.
2. **Tipo de documento no reconocido.** El catálogo `identification_types` de Convision está sembrado con slugs descriptivos (`cedula_ciudadania`), no las abreviaturas oficiales que exige RIPS (`CC`). La validación fail-closed de `patientDocument()` rechazaba correctamente cualquier paciente real (comportamiento correcto — nunca fabricar un código), pero esto significaba que ningún RIPS se podía construir jamás para un paciente real. Corregido con `mapIdentificationTypeToTipoIdPISIS()`, que traduce el catálogo de slugs al catálogo oficial `TipoIdPISIS`, fallando (nunca fabricando) ante cualquier código no reconocido.

El esquema JSON (`internal/rips/schema.go`) se construyó a partir de investigación independiente de la Resolución 2275/2023 (no copiado de Jarvis) — objeto raíz sin envoltorio, `usuarios[].servicios` con los 7 arreglos fijos, catálogos oficiales (`TipoIdPISIS`, `RIPSTipoUsuarioVersion2`, `RIPSFinalidadConsultaVersion2`, `RIPSCausaExternaVersion2`, `RIPSTipoDiagnosticoPrincipalVersion2`) en vez de los valores hardcodeados/fabricados que tiene Jarvis. CUPS de optometría: `890207` (primera vez) / `890307` (control), derivado de si el paciente ya tiene un registro clínico firmado previo (`isFirstSignedVisit`).

Transmisión: modo local/mock vía `RIPS_TRANSMISSION_MODE` (env var, análogo a `DIAN_TRANSMISSION_MODE`) — `none` (default, solo registra), `local` (simula envío exitoso), `direct` (retorna error explícito de "no implementado", sin credenciales reales de gobierno). **No se intentó ni se intentará autenticación real ante DIAN/FEVRIPS** — está fuera del alcance de este trabajo y de las credenciales disponibles.

**Verificado end-to-end contra servidor real, con datos reales (no fabricados):** dos citas de un mismo paciente de prueba, firmadas con diagnóstico CIE-10 real (`H520`) → tras la corrección de los dos bugs de arriba, ambas produjeron una fila en `rips_records` con payload JSON completo. Inspección del payload confirmó: `numDocumentoIdentificacion` = identificación real del paciente, `tipoDocumentoIdentificacion` = "CC" (correctamente traducido desde el slug), `fechaNacimiento` = fecha de nacimiento real, `codSexo` correcto, `codDiagnosticoPrincipal` = "H520" (el código CIE-10 real diagnosticado, no un código de relleno tipo "Z00"), `numDocumentoIdentificacion` del profesional = identificación real del especialista que firmó — ninguno de los antipatrones de Jarvis (edad/nombre/documento fabricados, `causaMotivoAtencion`/`finalidadTecnologiaSalud` hardcodeados sin lógica, filtrado a solo diagnósticos "Z") está presente. La segunda cita (visita de control, no primera vez) correctamente generó `codConsulta="890307"` y `finalidadTecnologiaSalud="16"` (tratamiento) en vez de "890207"/"15" (diagnóstico) de la primera — confirma que `isFirstSignedVisit` funciona.

### P1 #6 — Historial longitudinal de `ClinicalRecord` (commit `fe54081`)

**Resuelto.** Nuevo endpoint `GET /api/v1/patients/:id/clinical-records?page=&per_page=` (`GetPatientClinicalRecordHistory` → `clinicalrecord.Service.ListHistoryForPatient`), paginado, más reciente primero — complementa (no reemplaza) `GetPatientLatestClinicalRecord`. Verificado con unit tests; no se verificó por navegador (no hay UI consumidora todavía — el mandato pedía el endpoint, no necesariamente la pantalla).

### P1 #7 — Migración completa de RBAC a permisos por BD

**No resuelto — fuera de alcance de esta sesión por prioridad explícita ("P1, solo si alcanza el tiempo").** Los 3 chequeos hardcodeados de `RoleType` siguen presentes y verificados en esta sesión (líneas exactas se movieron ligeramente por trabajo concurrente no relacionado en la misma rama):
- `internal/transport/http/v1/handler.go:534` — `u.RoleType == domain.RoleSpecialist || u.RoleType == domain.RoleReceptionist`
- `internal/auth/service.go:283` — `user.RoleType == domain.RoleAdmin`
- `internal/laboratory/service.go:597` — `specialist.RoleType != domain.RoleSpecialist && specialist.RoleType != domain.RoleAdmin`

No se tocaron: son válidos funcionalmente hoy (RBAC por BD ya cubre el resto de `routes.go`), y tocarlos sin las pruebas de regresión adecuadas para cada uno de los 3 flujos habría sido un riesgo no justificado dado el tiempo restante.

### P1 #8 — Catálogo CUPS real

**No resuelto.** Los códigos CUPS de consulta de optometría (`890207`/`890307`) están hardcodeados como constantes en `internal/rips/service.go`, no en un catálogo con tabla propia. Suficiente para el alcance actual (un puñado de códigos conocidos), pero no es un catálogo real con FK como el de CIE-10.

### P2 #9 — Campos ricos de `ClinicalPrescription` hasta `LaboratoryOrder`

**No resuelto.** `LaboratoryOrder.RxOD`/`RxOI` siguen limitados a los 5 campos (sphere/cylinder/axis/addition/DP) — `LensType`, `LensMaterial`, `MountingHeight`, `Treatments` de `ClinicalPrescription` no llegan a la orden. Explícitamente P2, no atacado.

### Resumen de cobertura

| Ítem | Prioridad | Estado |
|---|---|---|
| Fórmula firmada → orden de laboratorio | P0 | Resuelto y verificado E2E |
| Filtro `IsBilled` en cola de ventas | P0 | Resuelto y verificado E2E (incl. bug de `AddPayment`) |
| Catálogo CIE-10 real | P0 | Resuelto y verificado por navegador |
| RIPS JSON (Res. 2275/2023) | P0 | Resuelto y verificado E2E con datos reales |
| Historial longitudinal de `ClinicalRecord` | P1 | Resuelto (endpoint), sin UI |
| Migración RBAC completa | P1 | No resuelto (fuera de alcance) |
| Catálogo CUPS real | P1 | No resuelto |
| Campos ricos de fórmula → orden de laboratorio | P2 | No resuelto |
| Transmisión real DIAN/RIPS gubernamental | — | No resuelto — requiere credenciales no disponibles, explícitamente fuera de alcance |
