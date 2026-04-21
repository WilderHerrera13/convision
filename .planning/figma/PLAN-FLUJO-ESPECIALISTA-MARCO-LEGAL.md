# Plan — Flujo de Atención al Paciente (Especialista) alineado al Marco Legal Colombiano

> Objetivo: cerrar todos los gaps detectados entre el flujo actual del Figma `📅 05 · Citas` (page `20:6`) y el marco legal vigente para ópticas en Colombia (Res. 1995/1999, Ley 372/1997, Ley 650/2001, Ley 1581/2012, Res. 2275/2023, Res. 1888/2025, Res. 1442/2024, Decreto 1030/2007, Res. 740/2024 + Circular 0044/2025).
>
> Alcance: pantallas, campos, validaciones y artefactos generados (RIPS JSON, fórmula óptica firmada, MIPRES, FEV).
>
> No-objetivo de este plan: implementación frontend/backend, migraciones de BD. Solo diseño Figma + contrato de datos.

---

## 0. Estado base post-reorganización (referencia)

```
PAGE 📅 05 · Citas
├── A · Recepcionista — Crear Nueva Cita        (Y=0)    → existente
├── B · Especialista — Atender Cita 1ª vez      (Y=900)
│   ├── B.1 Agenda y toma de cita               (Y=1000) → existente
│   └── B.2 Historia Clínica en curso           (Y=2060) → existente, INCOMPLETA
└── C · Especialista — Atender Cita de Control  (Y=3060) → existente, COMPLETO Y CON MARCO LEGAL VISIBLE
```

Las nuevas secciones D-H se agregarán como filas adicionales dentro de la misma page (decisión confirmada), o en pages hermanas cuando el rol y el contexto lo justifiquen.

---

## 1. Priorización (3 olas)

### Ola 1 — Bloqueantes legales (impiden cumplir norma o facturar)

| # | Gap | Norma | Sección destino |
|---|-----|-------|-----------------|
| 1 | Consentimiento informado tratamiento datos sensibles | Ley 1581/2012, Decreto 1377/2013, Ley 1751/2015 | A.0 (Recepción) |
| 2 | Verificación ADRES + cálculo copago/cuota moderadora 2026 | Res. 1036/2022, normas EPS | A (Recepción) |
| 3 | Captura completa 14 campos demográficos RIPS | Res. 2275/2023 + Res. 1995/1999 | A (formulario Paciente) |
| 4 | Anamnesis estructurada en 4 bloques obligatorios | Res. 1995/1999 | B.2 (HC) |
| 5 | Examen visual completo (todos los datos obligatorios) | Res. 1995/1999, ejercicio profesional | B.2 (HC) |
| 6 | Diagnóstico CIE-10 estructurado (1 principal + 3 relacionados + tipo) | Res. 2275/2023 + Res. 1442/2024 | B.2 (HC) |
| 7 | Fórmula óptica como documento legal firmado | Ley 650/2001 Art.24, Decreto 825/1954 | B.2 (HC) y C (Control) |
| 8 | Generación RIPS JSON + MUV + CUV | Res. 2275/2023, Res. 558/2024, Res. 1884/2024 | E (Cierre/Facturación) |
| 9 | MIPRES — prescripciones no PBS y PBS ambulatorio (dic-2025) | Res. 740/2024 + Circular 0044/2025 | F (MIPRES) |

### Ola 2 — Importantes (calidad, trazabilidad, escalabilidad)

| # | Gap | Norma |
|---|-----|-------|
| 10 | Trazabilidad de auditoría por acceso a HC | Ley 1581/2012, Ley 1751/2015 |
| 11 | Remisión a oftalmología | Ley 372/1997 (alcance optómetra) |
| 12 | Configuración tipo de establecimiento (con/sin consultorio) | Decreto 1030/2007, Res. 3100/2019 |
| 13 | Pre-consulta automatizada (AR/K/NCT/retinografía) | Práctica clínica |
| 14 | Toma de medidas para laboratorio | Decreto 1030/2007 |
| 15 | Verificación post-laboratorio NTC 5145 / ISO 8980 | NTC 5145 |
| 16 | Vigencia de prescripción visible y validada | Decreto 2200/2005 |
| 17 | Codificación dual CIE-10 / CIE-11 | Res. 1442/2024 |
| 18 | Mapeo a HL7 FHIR (estructura de datos) | Res. 1888/2025, Ley 2015/2020 |

### Ola 3 — Diferenciación fiscal en facturación

| # | Gap | Norma |
|---|-----|-------|
| 19 | Discriminación IVA: lentes excluidos / monturas gravadas 19% | Art. 424 ET, Concepto DIAN 627/2024 |

---

## 2. Pantallas nuevas (specs por ola)

Para cada pantalla nueva: rol, sección destino, ubicación X/Y propuesta dentro de page `20:6` (para mantener todo en una page, decisión del usuario), y ajustes a pantallas existentes.

### Ola 1

#### 1.1 — Consentimiento Informado (A.0)

- Rol: Recepcionista (con paciente presente — captura biométrica/firma)
- Posición sugerida en page: nueva fila de variantes dentro de A, X libre
- Estado: pantalla nueva
- Campos:
  - Tipo de tratamiento: HC + datos clínicos sensibles + comunicaciones + facturación
  - Declaración Ley 1581/2012 con check explícito "Entiendo que no estoy obligado a autorizar el tratamiento de datos sensibles"
  - Lista enumerada de datos sensibles a tratar (no genérica): identificación, datos clínicos oculares, antecedentes familiares, prescripciones, fórmula óptica, exámenes complementarios
  - Finalidades: prestación servicio, generación RIPS para EPS, facturación DIAN, MIPRES si aplica, archivo legal 15 años
  - Terceros con acceso: EPS, DIAN, INVIMA, autoridad judicial bajo orden, profesionales del equipo de salud
  - Derechos ARCO + Habeas Data + canal de revocación
  - Retención: prueba de aceptación con timestamp, IP, user-agent, hash del documento
  - Firma: opciones — manuscrita (canvas), token email/SMS con OTP, firma digital cert. ANC
  - Botón "Acepto y firmo" + "Acepto sin firma digital (firma manuscrita en kiosco)"
  - PDF resultante archivado y referenciado en HC
- Ajustes en flujo A: insertar este paso entre "Registrar Paciente (QuickCreate)" y "Cita Agendada (Success)"
- Estados: vacío, aceptado, rechazado/cerrado, ya firmado (renovación tras 5 años o cambio de finalidad)

#### 1.2 — Verificación ADRES + cálculo de pagos (A)

- Rol: Recepcionista
- Estado: pantalla nueva o modal sobre Paso 4 Confirmación
- Campos mostrados (lectura):
  - Estado de afiliación EPS: ACTIVO / SUSPENDIDO / NO AFILIADO
  - Régimen: contributivo / subsidiado / excepcional / particular
  - EPS / EAPB con código entidad
  - Categoría salarial (si contributivo) → cálculo cuota moderadora 2026
  - Nivel SISBEN (si subsidiado) → exención de copago
  - Plan de beneficios: PBS / no-PBS aplicable
- Campos calculados:
  - Cuota moderadora consulta paramédica (rango ~$4.500 a ~$47.700 COP 2024 — actualizar a tarifa 2026)
  - Copago si aplica
  - Si particular: tarifa pactada
- Acción: bloquear creación de cita si afiliación NO ACTIVA salvo override "particular"
- Estados: cargando, ok, error API, sin datos
- Integración futura: API ADRES (mock primero)

#### 1.3 — Formulario completo de Paciente (A)

- Rol: Recepcionista
- Estado: ampliar pantalla existente `Nueva Cita — Registrar Paciente (QuickCreate)` (`600:80`) y/o crear `Paciente · Registro completo` separado
- Campos demográficos RIPS obligatorios (mapeo directo al JSON):
  - `tipoDocumentoIdentificacion` — select [CC, TI, RC, PA, CE, CD, SC, PT, PE, AS, MS]
  - `numDocumentoIdentificacion` — text 1-20
  - `primerApellido`, `segundoApellido` — text 1-60 c/u
  - `primerNombre`, `segundoNombre` — text 1-60 c/u
  - `fechaNacimiento` — date AAAA-MM-DD
  - `codSexo` — select [H, M, I]
  - `estadoCivil` — select tabla SISPRO
  - `ocupacion` — select tabla SISPRO (CIUO-08)
  - `direccionDomicilio` — text
  - `telefonoDomicilio` — text
  - `codMunicipioResidencia` — autocomplete DANE 5 dígitos
  - `codZonaTerritorial` — radio [01 Rural, 02 Urbana]
  - `codPaisResidencia`, `codPaisOrigen` — select SISPRO (default 170 Colombia)
  - `codEntidadAseguradora` — select EPS/EAPB 6 chars
  - `tipoUsuario` — select [01 Cotizante, 02 Beneficiario, 03 Otro, 04 Subsidiado]
  - `nombreAcompanante`, `telefonoAcompanante` — text (obligatorio HC, mínimo en pediatría/discapacidad)
- UX: distribuir en 3 tabs — Identificación / Residencia y contacto / Aseguramiento
- Validaciones:
  - tipoDoc + numDoc únicos compuestos
  - Si edad < 18 → exigir TI o RC + acompañante obligatorio
  - codMunicipio debe existir en tabla DANE vigente
  - codEntidadAseguradora debe estar activa en tabla SISPRO

#### 1.4 — Anamnesis estructurada (B.2)

- Rol: Especialista
- Estado: ampliar pantalla `HC · En curso — Anamnesis` (`2226:1416`)
- Estructura en 5 secciones (acordeón o tabs internos):
  1. **Motivo de consulta y enfermedad actual**
     - Motivo en palabras del paciente (textarea)
     - Inicio (date) / duración / evolución (select)
     - Síntomas asociados (chips)
  2. **Antecedentes personales sistémicos** (obligatorio Res. 1995)
     - Diabetes (Sí/No, año dx, control HbA1c) → CIE-10 E10/E11
     - Hipertensión (Sí/No, año, medicación) → CIE-10 I10
     - Alergias (texto + tipo medicamento/ambiental)
     - Medicamentos actuales (autocomplete CUM INVIMA)
     - Enfermedades autoinmunes / oncológicas / neurológicas
  3. **Antecedentes oculares**
     - Cirugías previas (tipo, fecha, ojo)
     - Uso actual de lentes (sí/no, antigüedad fórmula, tipo: monofocal/bifocal/progresivo, satisfacción)
     - Trauma ocular previo
     - Patologías oculares previas (CIE-10 lookup)
  4. **Antecedentes familiares oftálmicos**
     - Glaucoma (parentesco, edad dx)
     - Diabetes
     - Miopía alta
     - Degeneración macular
     - Cataratas
     - Estrabismo
     - Otros
  5. **Antecedentes farmacológicos relevantes**
     - Corticoides sistémicos (riesgo glaucoma/catarata)
     - Antihistamínicos
     - Antihipertensivos
     - Hidroxicloroquina (riesgo retinopatía)
     - Tamsulosina/alfa-bloqueantes (síndrome iris flácido si cirugía catarata)
- AsidePanel: alertas automáticas si hay banderas rojas (corticoides + sospecha glaucoma, etc.)

#### 1.5 — Examen visual completo (B.2)

- Rol: Especialista
- Estado: ampliar pantalla `HC · En curso — Examen Visual` (`2227:1472`)
- Distribuir en 5 sub-secciones por tabs internos o acordeón:
  1. **Agudeza visual** — tabla 4×4 (OD/OI × s/c y c/c × lejos/cerca)
     - Notación Snellen (20/X) lejos
     - Notación Jaeger (J1-J20) cerca
     - AV con agujero estenopeico (cuando AV < 20/40)
  2. **Refracción objetiva** — retinoscopía y/o autorefractometría
     - Por ojo: SPH / CYL / AXIS (pasos 0.25D, cilindro negativo)
     - Método (radio: retinoscopía / AR / ambos)
  3. **Refracción subjetiva final**
     - Por ojo: SPH / CYL / AXIS / ADD
     - AV alcanzada
     - Aceptación del paciente (chips: confortable / regular / molesta)
  4. **Datos complementarios**
     - **Queratometría**: K1 (D, °) y K2 (D, °) por ojo
     - **PIO**: valor mmHg, método (Goldmann / aplanación / NCT / iCare), hora de toma (importante por ritmo circadiano)
     - **Biomicroscopía**: por ojo, secciones párpados / conjuntiva / córnea / cámara anterior / iris / cristalino / vítreo anterior — cada uno con dropdown "normal" + textarea hallazgos
     - **Fondo de ojo**: papila (color, bordes, C/D), vasos retinianos, mácula (reflejo foveal, edema, drusen), retina periférica
     - **Motilidad ocular**: ducciones, versiones, Hirschberg, cover test lejos/cerca con magnitud en dioptrías prismáticas, cover alternante
  5. **Pruebas complementarias** (según indicación)
     - Test de color (Ishihara) — pasados/fallados
     - Campimetría
     - Sensibilidad al contraste
     - Test de Schirmer / BUT (ojo seco)
     - OCT
     - Gonioscopia
     - Topografía corneal
     - Paquimetría
- Cada sub-sección debe ser plegable y guardarse parcialmente
- Validación: AV y refracción subjetiva son obligatorios para cerrar examen

#### 1.6 — Diagnóstico CIE-10 estructurado (B.2 y C)

- Rol: Especialista
- Estado: ampliar pantalla `HC · En curso — Diagnóstico y Plan` (`2228:1528`)
- Componentes:
  - Selector CIE-10 con búsqueda por código y descripción (autocomplete contra tabla SISPRO vigente, formato 4 chars sin punto)
  - Marca de **Diagnóstico Principal** (1 obligatorio)
  - Hasta 3 **Diagnósticos Relacionados** (opcionales)
  - Por cada dx: **Tipo** [1=impresión / 2=confirmado / 3=recurrente]
  - Plan terapéutico por dx (textarea)
  - Educación al paciente (chips comunes + libre)
  - Recomendaciones de higiene visual
  - Próximo control sugerido (date + razón)
- Columna paralela CIE-11 (oculta detrás de toggle, lectura por ahora) — preparación Res. 1442/2024
- Diagnósticos frecuentes a precargar como sugeridos:
  - H520 hipermetropía / H521 miopía / H522 astigmatismo / H523 anisometropía / H524 presbicia
  - H400-H409 glaucoma
  - H100-H109 conjuntivitis
  - H041 ojo seco
  - Z010 examen rutina
- AsidePanel: marco legal visible (Res. 1995/1999, transición CIE-10→CIE-11 Res. 1442/2024)

#### 1.7 — Fórmula óptica como documento legal firmado (B.2 y C)

- Rol: Especialista
- Estado: pantalla nueva `HC · Fórmula Óptica (preview + firma)` insertada antes de "Prescripción y Cierre"
- Layout: vista previa estilo PDF imprimible + panel de firma a la derecha
- Contenido obligatorio del documento (Ley 650/2001 Art.24 + Decreto 825/1954):
  - **Encabezado institucional**: logo, razón social, NIT, dirección consultorio, teléfono, REPS
  - **Identificación profesional**: nombre completo, número tarjeta profesional (FEDOPTO/CTNPO), especialidad, firma digital o espacio firma manuscrita, sello
  - **Identificación paciente**: nombre completo, tipo + número documento, número de HC, edad
  - **Fecha de prescripción** DD/MM/AAAA + hora
  - **Prescripción óptica** (idioma español obligatorio):
    ```
    OD: SPH ±X.XX  CYL ±X.XX  × EJE XXX°  ADD +X.XX
    OI: SPH ±X.XX  CYL ±X.XX  × EJE XXX°  ADD +X.XX
    DP (binocular): XX mm
    DNP: OD XX mm / OI XX mm
    ```
  - **Campos opcionales recomendados**: prisma (monto + base BI/BO/BU/BD), tipo lente (monofocal/bifocal FT-28/FT-35/progresivo freeform/ocupacional), material (CR-39/policarbonato/Trivex/alto índice), tratamientos (AR/luz azul/fotocromático/polarizado/endurecido/hidrofóbico), uso (permanente/lectura/computador), altura de montaje (progresivos)
  - **AV alcanzada** con la corrección final
  - **Vigencia** (Decreto 2200/2005) — default 12 meses, configurable 6-12 meses, alerta visual cuando vence
  - **Pie**: "Documento de carácter legal — Ley 650/2001 — Decreto 825/1954"
- Botones: Vista previa PDF / Firmar y emitir
- Firma:
  - Opción A: firma digital con certificado ANC del profesional
  - Opción B: firma manuscrita capturada en tablet
  - Genera hash + timestamp + sello cronológico
- Resultado: PDF inmutable archivado, referencia en HC, alimenta automáticamente la Orden de Trabajo de Dispensación (ver Ola 2 #14)

#### 1.8 — Cierre clínico + Generación RIPS + MUV (E nueva)

- Rol: Especialista (firma) + Sistema (envío) + Admin/Facturación (seguimiento)
- Estado: SECCIÓN E NUEVA — `E · Cierre clínico y RIPS/FEV` — al final del flujo HC y Control
- Pantallas:
  - **E.1 Resumen pre-cierre** (revisión final por el especialista)
    - Checklist: anamnesis ✓, examen ✓, diagnóstico ✓, fórmula firmada ✓, plan de tratamiento ✓
    - Vista del JSON RIPS que se generará (lectura, plegado por sección)
    - CUPS asignado: 890207 (1ª vez optometría) / 890307 (control optometría) / 890202 (1ª vez oftalmología) / 890302 (control oftalmología)
    - Diagnósticos CIE-10 incluidos
    - Procedimientos diagnósticos facturables independientes (tonometría 150101/150102/150103, campimetría 150201, oftalmoscopia 150301, biomicroscopía 150401, refracción 150501, topografía 150601, paquimetría 150701, OCT 150901, gonioscopia 151101)
    - Botón "Firmar y cerrar consulta"
  - **E.2 Estado de envío al MUV** (pantalla automática post-firma)
    - Estado: GENERANDO_RIPS / GENERANDO_FEV / ENVIANDO_MUV / VALIDANDO / CUV_RECIBIDO / RECHAZADO
    - JSON RIPS generado (vista expandible)
    - XML UBL 2.1 FEV con extensión sector salud (11 campos adicionales: codPrestador, modalidad pago, cobertura PBS, num contrato, copago, cuota moderadora, etc.)
    - CUV recibido (cuando aplique)
    - Errores de validación si rechazo (lista con código + descripción + campo)
  - **E.3 Cartera y radicación**
    - Plazo: 22 días hábiles desde expedición FEV para radicar ante ERP
    - Estado de radicación
    - Paquete final: FEV + RIPS + CUV + soportes
    - Botón "Radicar" → genera ZIP y abre flujo de envío a ERP
- Mapeo de campos RIPS obligatorios para `consultas`:
  - codPrestador C(12), fechaInicioAtencion C(16) "AAAA-MM-DD HH:MM", numAutorizacion C(0-30), codConsulta C(6), modalidadGrupoServicioTecSal C(2), grupoServicios C(2), codServicio C(4), finalidadTecnologiaSalud C(2), causaMotivoAtencion C(2), codDiagnosticoPrincipal C(4), codDiagnosticoRelacionado1-3 C(0-4), tipoDiagnosticoPrincipal C(1), tipoDocumentoIdentificacion (profesional) C(2), numDocumentoIdentificacion (profesional) C(4-12), vrServicio N(1-11) entero positivo, conceptoRecaudo C(2), valorPagoModerador N(0-11), consecutivo N(1-11)
- Reglas técnicas:
  - UTF-8
  - Property names case-sensitive
  - Valores monetarios enteros sin separadores ni decimales
  - Campos opcionales como `null` (sin comillas)
  - Fechas como string "AAAA-MM-DD HH:MM"
- AsidePanel con marco legal: Res. 2275/2023, Res. 558/2024, Res. 1884/2024, Res. 1036/2022 (validaciones MUV)

#### 1.9 — MIPRES (F nueva)

- Rol: Especialista (prescriptor) + Admin (seguimiento reportes)
- Estado: SECCIÓN F NUEVA — `F · MIPRES (no-PBS y PBS ambulatorio)` — fila independiente o accesible desde "Diagnóstico y Plan"
- Pantallas:
  - **F.1 ¿Requiere MIPRES?** (decisión guiada)
    - Checklist:
      - Medicamento oftálmico no PBS
      - Procedimiento diagnóstico no incluido en plan
      - Lente de contacto especial (queratocono, irregularidades corneales)
      - Dispositivo baja visión / ayudas visuales
      - Medicamento PBS ambulatorio (desde Circular 0044/dic-2025)
    - Si alguna marcada → continuar a F.2
  - **F.2 Prescripción MIPRES**
    - Tipo de tecnología: medicamento / procedimiento / dispositivo / servicio complementario / producto nutricional
    - Campos según tipo
    - Justificación clínica (textarea obligatorio)
    - Diagnóstico CIE-10 vinculado
    - Verificación ReTHUS del prescriptor (badge verde si activo)
    - Botón "Enviar a MIPRES"
  - **F.3 Estado de prescripciones MIPRES**
    - Lista con número MIPRES único asignado por la plataforma
    - Estado: pendiente entrega / entregado / no entregado
    - Fecha límite de entrega
- Marco legal en AsidePanel: Res. 740/2024, Res. 2622/2024, Res. 3951/2016, Circular 0044/dic-2025

### Ola 2

#### 2.10 — Trazabilidad de auditoría (Admin)

- Rol: Admin
- Estado: SECCIÓN G NUEVA — `G · Auditoría y Trazabilidad` (page nueva o en módulo Admin)
- Pantallas:
  - **G.1 Log de accesos a HC** — tabla con paciente, usuario que accedió, rol, acción (lectura/escritura/firma/exportación), timestamp, IP, módulo
  - **G.2 Log por paciente** — desde detalle de paciente, ver historial de accesos a su HC
  - **G.3 Reportes de cumplimiento** — exportar trazabilidad para Superintendencia de Salud / SIC

#### 2.11 — Remisión a oftalmología (B.2)

- Rol: Especialista (optómetra)
- Estado: pantalla nueva `HC · Remisión a Oftalmología`, accesible desde "Diagnóstico y Plan" cuando se detecta patología fuera del alcance
- Campos:
  - Resumen clínico (textarea, prefilled desde HC)
  - Diagnóstico presuntivo CIE-10
  - Motivo de remisión
  - Nivel de urgencia [Rutina / Prioritaria / Urgente / Emergencia]
  - Hallazgos relevantes (chips desde examen)
  - Médico/IPS de destino (autocomplete REPS)
  - Documentos adjuntos
- Genera PDF con firma del optómetra
- Notifica al paciente vía SMS/email con instrucciones

#### 2.12 — Configuración tipo de establecimiento

- Rol: Admin
- Estado: ajuste en módulo Configuración
- Toggle: "Óptica con consultorio" / "Óptica sin consultorio"
- Si "sin consultorio" → ocultar/deshabilitar:
  - Módulos clínicos (B, C, F)
  - Dispensación de lentes de contacto, prótesis oculares, ayudas baja visión
  - Captura de Certificado de Capacidad de Dispensación
- Si "con consultorio" → exigir REPS activo

#### 2.13 — Pre-consulta automatizada

- Rol: Auxiliar / Recepcionista clínica
- Estado: pantalla nueva `Pre-consulta` insertada en flujo B antes de "Detalle Programada"
- Captura previa al examen optómetra:
  - Autorefractometría OD/OI
  - Queratometría OD/OI
  - Tonometría no contacto OD/OI
  - Retinografía / topografía corneal (upload imagen)
- Datos pre-pueblan el examen del especialista

#### 2.14 — Toma de medidas para laboratorio

- Rol: Asesor de dispensación
- Estado: SECCIÓN H NUEVA — `H · Dispensación` (otra page recomendada en futuro)
- Pantallas mínimas para Ola 2:
  - **H.1 Selección de montura** (catálogo + filtros)
  - **H.2 Selección de lentes** (validación compatibilidad rango Rx vs material/índice)
  - **H.3 Toma de medidas**
    - DIP binocular (54-74mm adultos)
    - DNP OD / DNP OI
    - Altura pupilar
    - Distancia al vértice (12-14mm)
    - Ángulo pantoscópico (8-12°)
    - Curvatura de montura
  - **H.4 Generación pedido al laboratorio**
    - Auto-fill desde fórmula firmada (no transcripción manual — exigencia Decreto 1030/2007)
    - Datos paciente, prescripción completa, medidas, especificaciones producto, datos logísticos

#### 2.15 — Verificación post-laboratorio (NTC 5145)

- Rol: Asesor recepción laboratorio
- Estado: pantalla nueva en H
- Checklist con tolerancias automáticas:
  - Esfera ±0.12D hasta ±6.00D
  - Cilindro ±0.12D hasta ±2.00D
  - Eje ±2° (cilindros >2.50D) hasta ±14° (cilindros bajos)
  - Adición ±0.12D
- Captura lecturas del lensómetro/frontofocómetro
- Si falla → generar reclamación al laboratorio
- Si pasa → marcar listo para entrega + agendar control de adaptación 1-2 semanas

#### 2.16 — Vigencia de prescripción

- Rol: transversal
- Estado: ajuste en pantalla "Fórmula óptica" + AsidePanel paciente
- Campo `vigencia_meses` editable (default 12, mínimo 6)
- Cálculo `fecha_vencimiento = fecha_emision + vigencia_meses`
- Alerta visual amarilla 60 días antes / roja al vencer
- En "Detalle paciente" mostrar estado fórmula vigente / próxima a vencer / vencida

#### 2.17 — Codificación dual CIE-10 / CIE-11

- Rol: transversal
- Estado: ajuste en componente selector de diagnóstico
- Campo principal: CIE-10 (operativo)
- Campo paralelo oculto: CIE-11 (preparación migración Res. 1442/2024)
- Toggle de visualización en pantallas de diagnóstico

#### 2.18 — Mapeo HL7 FHIR

- Rol: Sistema (no UI directa, pero documentación de contrato de datos)
- Recursos a mapear:
  - `Patient` ← formulario completo paciente
  - `Encounter` ← cita + consulta
  - `Observation` ← cada dato del examen visual (AV, refracción, PIO, queratometría, etc.)
  - `DiagnosticReport` ← biomicroscopía + fondo de ojo + pruebas complementarias
  - `Condition` ← diagnósticos CIE-10
  - `MedicationRequest` ← prescripciones farmacológicas
  - `VisionPrescription` (recurso FHIR específico) ← fórmula óptica
- Documento técnico complementario en `.planning/api/HL7-FHIR-MAPPING.md` (futuro)

### Ola 3

#### 3.19 — Discriminación IVA en facturación

- Rol: Cajero / Admin facturación
- Estado: ajuste en módulo Facturación / POS
- Por cada ítem de venta marcar:
  - **Excluido IVA**: consulta optométrica/oftalmológica, lentes oftálmicos, lentes de contacto (Art. 424 ET)
  - **Gravado 19%**: monturas/armazones, accesorios no médicos (Concepto DIAN 627/2024)
- FEV electrónica UBL 2.1 debe discriminar por item con su tarifa
- CUFE + QR generados por DIAN
- Reporte de IVA mensual por categoría

---

## 3. Componentes nuevos para el sistema (catálogo Pixel)

A registrar en page `00 · Componentes` antes de construir las pantallas:

| Componente | Razón | Variantes |
|---|---|---|
| `FormField/Select-CIE10` | Lookup CIE-10 con autocomplete + tipo dx | default / focus / error / con-resultados |
| `FormField/Select-DANE` | Autocomplete municipios DANE | default / focus / error |
| `FormField/Select-CUM` | Medicamentos INVIMA | default / focus / error |
| `FormField/AVTable` | Tabla 4×4 agudeza visual OD/OI × s/c-c/c × lejos-cerca | vacía / parcial / completa |
| `FormField/RxRow` | Fila SPH/CYL/AXIS/ADD por ojo con steppers 0.25D | OD / OI |
| `Card/MarcoLegal` | Card AsidePanel con normativa aplicable | recepcion / clinico / facturacion / mipres |
| `Banner/Consentimiento` | Banner Ley 1581 con checks obligatorios | inicial / aceptado / rechazado / expirado |
| `Badge/CUV` | Badge estado CUV | pendiente / aprobado / rechazado |
| `Badge/MIPRES` | Badge estado MIPRES | pendiente / entregado / no-entregado |
| `Badge/Vigencia-Rx` | Badge fórmula óptica | vigente / proxima-vencer / vencida |
| `Modal/FirmaDigital` | Modal de firma con tabs (digital cert / manuscrita) | inicial / firmando / firmado / error |
| `Stepper/HC-Completa` | Stepper 7 pasos: Anamnesis→Examen→Diagnóstico→Fórmula→Firma→RIPS→Cierre | active per step |
| `Alert/MUV-Error` | Alert con código + descripción + campo en error MUV | warning / error |

---

## 4. Mapa de pantallas final esperado en page `📅 05 · Citas`

```
A · Recepcionista — Crear Nueva Cita                   Y=0
  Pasos 1-4 + variantes existentes
  + A.0 Consentimiento Informado                       (NUEVO)
  + A.5 Verificación ADRES + Pagos                     (NUEVO)
  + A.6 Paciente Registro Completo (RIPS-ready)        (AMPLIACIÓN)

B · Especialista — Atender Cita 1ª vez                 Y=900
  B.0 Pre-consulta automatizada                         (NUEVO Ola 2)
  B.1 Agenda y toma de cita                             (existente, ya reordenado)
  B.2 Historia Clínica en curso                         (Y=2060)
       Anamnesis estructurada 5 bloques                 (AMPLIACIÓN)
       Examen visual completo 5 sub-secciones           (AMPLIACIÓN)
       Diagnóstico CIE-10 estructurado                  (AMPLIACIÓN)
       Fórmula óptica firmada (preview + firma)         (NUEVO)
       Remisión a oftalmología                          (NUEVO Ola 2)
       Prescripción y Cierre clínico                    (existente)

C · Especialista — Atender Cita de Control             Y=3060
  6 pasos existentes (ya completos con marco legal)
  + Fórmula óptica firmada compartida con B.2          (NUEVO)

E · Cierre clínico + RIPS/FEV                          Y=4500 (NUEVO)
  E.1 Resumen pre-cierre
  E.2 Estado MUV / CUV
  E.3 Cartera y radicación

F · MIPRES                                             Y=5500 (NUEVO)
  F.1 Decisión guiada
  F.2 Prescripción MIPRES
  F.3 Estado prescripciones

G · Auditoría (page separada `09 · Auditoría`)         (NUEVO Ola 2)
H · Dispensación (page separada `08 · Dispensación`)   (NUEVO Ola 2)
```

---

## 5. Secuencia de ejecución sugerida

### Sprint 1 — Captura legal de base (semana 1-2)

- 1.1 Consentimiento Informado (A.0)
- 1.3 Formulario completo de Paciente (RIPS-ready)
- 1.2 Verificación ADRES (mock primero)
- Crear componentes `FormField/Select-DANE`, `Banner/Consentimiento`, `Card/MarcoLegal`

### Sprint 2 — HC clínica completa (semana 3-4)

- 1.4 Anamnesis estructurada
- 1.5 Examen visual completo
- 1.6 Diagnóstico CIE-10 estructurado
- Crear componentes `FormField/AVTable`, `FormField/RxRow`, `FormField/Select-CIE10`, `FormField/Select-CUM`

### Sprint 3 — Fórmula óptica legal (semana 5)

- 1.7 Fórmula óptica firmada (preview + firma)
- 2.16 Vigencia de prescripción
- Crear componentes `Modal/FirmaDigital`, `Badge/Vigencia-Rx`

### Sprint 4 — RIPS/FEV/MUV (semana 6-7)

- 1.8 Cierre clínico + RIPS + MUV (sección E)
- Crear componentes `Badge/CUV`, `Alert/MUV-Error`, `Stepper/HC-Completa`

### Sprint 5 — MIPRES (semana 8)

- 1.9 MIPRES (sección F)
- Crear componente `Badge/MIPRES`

### Sprint 6+ — Ola 2 y 3

- 2.11 Remisión a oftalmología
- 2.13 Pre-consulta
- 2.14 Toma de medidas + 2.15 Verificación post-laboratorio (page H)
- 2.10 Auditoría (page G)
- 2.12 Configuración establecimiento
- 2.17 CIE-11 paralelo
- 2.18 HL7 FHIR mapping (documento técnico)
- 3.19 Discriminación IVA

---

## 6. Dependencias y orden lógico

```
A.0 Consentimiento ──┐
A.1.3 Paciente RIPS ─┼──► A.5 ADRES ──► Cita creada
                     │
B.0 Pre-consulta ────┴──► B.1 Detalle ──► B.2 Anamnesis ──► Examen ──► Dx CIE-10
                                                                            │
                                                                            ▼
                                                  Fórmula óptica firmada (Ley 650)
                                                                            │
                                                                            ▼
                                                  ¿No-PBS? ──► F MIPRES
                                                                            │
                                                                            ▼
                                                            E.1 Resumen pre-cierre
                                                                            │
                                                                  Firma del profesional
                                                                            │
                                                                            ▼
                                                  E.2 Generación RIPS JSON + FEV XML
                                                                            │
                                                                            ▼
                                                          Envío MUV ──► CUV recibido
                                                                            │
                                                                            ▼
                                                  E.3 Radicación ERP (22 días hábiles)
                                                                            │
                                                                            ▼
                                                  H Dispensación (paralelo) → Entrega
```

---

## 7. Contratos de datos críticos

### 7.1 RIPS — usuario (paciente)

```json
{
  "tipoDocumentoIdentificacion": "CC",
  "numDocumentoIdentificacion": "1234567890",
  "tipoUsuario": "01",
  "fechaNacimiento": "1985-04-12",
  "codSexo": "M",
  "codPaisResidencia": "170",
  "codMunicipioResidencia": "11001",
  "codZonaTerritorialResidencia": "02",
  "incapacidad": "NO",
  "consecutivo": 1,
  "codPaisOrigen": "170"
}
```

### 7.2 RIPS — consulta optometría

```json
{
  "codPrestador": "110010000001",
  "fechaInicioAtencion": "2026-04-19 10:30",
  "numAutorizacion": null,
  "codConsulta": "890207",
  "modalidadGrupoServicioTecSal": "01",
  "grupoServicios": "02",
  "codServicio": "334",
  "finalidadTecnologiaSalud": "10",
  "causaMotivoAtencion": "38",
  "codDiagnosticoPrincipal": "H521",
  "codDiagnosticoRelacionado1": "H524",
  "codDiagnosticoRelacionado2": null,
  "codDiagnosticoRelacionado3": null,
  "tipoDiagnosticoPrincipal": "2",
  "tipoDocumentoIdentificacion": "CC",
  "numDocumentoIdentificacion": "52123456",
  "vrServicio": 45000,
  "conceptoRecaudo": "05",
  "valorPagoModerador": 4500,
  "numFEVPagoModerador": "FE12345",
  "consecutivo": 1
}
```

### 7.3 Fórmula óptica — modelo

```ts
type FormulaOptica = {
  numero: string;             // consecutivo institucional
  fechaEmision: string;       // ISO
  fechaVencimiento: string;   // ISO, default +12 meses
  paciente: { tipoDoc: string; numDoc: string; nombre: string; numHC: string; edad: number };
  profesional: {
    nombre: string;
    tarjeta: string;          // FEDOPTO/CTNPO
    especialidad: 'OPTOMETRA' | 'OFTALMOLOGO';
    rethus: string;
    firma: { tipo: 'digital' | 'manuscrita'; hash: string; timestamp: string };
    sello: string;
  };
  prescripcion: {
    OD: { sph: number; cyl: number; axis: number; add?: number; prisma?: { monto: number; base: 'BI'|'BO'|'BU'|'BD' }; av: string };
    OI: { sph: number; cyl: number; axis: number; add?: number; prisma?: { monto: number; base: 'BI'|'BO'|'BU'|'BD' }; av: string };
    dpBinocular: number;      // mm
    dnpOD: number;            // mm
    dnpOI: number;            // mm
  };
  recomendaciones: {
    tipoLente?: 'monofocal' | 'bifocal-FT28' | 'bifocal-FT35' | 'progresivo-freeform' | 'progresivo-estandar' | 'ocupacional';
    material?: 'CR-39' | 'policarbonato' | 'trivex' | 'alto-indice-160' | 'alto-indice-167' | 'alto-indice-174';
    indiceRefraccion?: number;
    tratamientos?: Array<'antirreflejo' | 'luz-azul' | 'fotocromatico' | 'polarizado' | 'endurecido' | 'hidrofobico'>;
    uso?: 'permanente' | 'lectura' | 'computador';
    alturaMontaje?: number;   // mm, progresivos
  };
  vigenciaMeses: number;      // default 12
  documentoLegal: {
    pdfHash: string;
    pdfUrl: string;
    normaReferencia: ['Ley 650/2001 Art.24', 'Decreto 825/1954'];
  };
};
```

---

## 8. Criterios de aceptación por gap

### Gap 1 (Consentimiento)
- [ ] Pantalla con declaración Ley 1581 + lista enumerada de datos sensibles
- [ ] Captura firma + timestamp + IP + hash documento
- [ ] PDF archivado y referenciado en HC
- [ ] No se puede crear cita sin consentimiento aceptado

### Gap 3 (Paciente RIPS)
- [ ] Los 14 campos demográficos obligatorios capturados
- [ ] Validaciones DANE, edad/acompañante, EPS activa
- [ ] El JSON de paciente generado pasa validación de estructura RIPS

### Gap 5 (Examen visual)
- [ ] AV en formato Snellen + Jaeger por OD/OI/lejos/cerca/sin y con corrección
- [ ] Refracción objetiva y subjetiva con SPH/CYL/AXIS/ADD
- [ ] PIO con método y hora obligatorios
- [ ] Biomicroscopía y fondo de ojo con secciones obligatorias evaluadas
- [ ] No se puede cerrar examen sin AV y refracción subjetiva

### Gap 7 (Fórmula óptica)
- [ ] PDF generado contiene los 11 elementos obligatorios Ley 650/2001
- [ ] Firma digital o manuscrita con sello cronológico
- [ ] Vigencia visible y validada
- [ ] Documento inmutable post-firma

### Gap 8 (RIPS/MUV)
- [ ] JSON RIPS válido vs schema Res. 2275/2023 (UTF-8, case-sensitive, tipos correctos)
- [ ] FEV XML UBL 2.1 con extensión sector salud
- [ ] CUV recibido y persistido
- [ ] Plazo 22 días hábiles para radicar visible y alertado

### Gap 9 (MIPRES)
- [ ] Decisión guiada por checklist
- [ ] Verificación ReTHUS del prescriptor
- [ ] Número MIPRES único persistido
- [ ] Estado de prescripción visible

---

## 9. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Tablas SISPRO (DANE, EPS, CUPS, CIE-10) no actualizadas | Alta | Alto | Importador automático contra `web.sispro.gov.co`, sello de versión por tabla |
| Cambios DIAN en estructura FEV salud | Media | Alto | Capa de adaptación XML con versión por contrato; alertas Resoluciones nuevas |
| Firma digital con cert. ANC requiere integración | Media | Medio | Fase 1 manuscrita con sello; fase 2 cert. digital |
| MUV rechaza por reglas no documentadas | Alta | Alto | Cola de reintentos + dashboard de errores frecuentes; convenio con asesor MUV |
| Migración CIE-10 → CIE-11 no fechada | Alta | Medio | Codificación dual desde día 1; toggle de visualización |
| INVIMA cambia clasificación de lentes | Baja | Medio | Tabla parametrizada de clasificación, no constantes en código |

---

## 10. Próximos pasos inmediatos

1. **Validar este plan con el cliente / equipo legal** — confirmar interpretaciones normativas (especialmente vigencias, tarifas 2026, MIPRES PBS).
2. **Decidir alcance de Sprint 1** — al menos los 3 ítems de Sprint 1 deberían estar antes de cualquier piloto con paciente real.
3. **Crear los componentes nuevos del catálogo** en page `00 · Componentes` antes de empezar pantallas (evita rework).
4. **Importar tablas SISPRO** (DANE, EPS, CUPS, CIE-10, CIUO-08) como referencia en Figma (chips de búsqueda) y como tablas reales en backend.
5. **Iniciar Sprint 1 en Figma** siguiendo Pixel: rol Recepcionista, color `#8753EF`, clonar componentes del catálogo.

---

## 11. Referencias normativas (resumen)

- Res. 1995/1999 — Historia Clínica
- Res. 839/2017 — Retención HC (15/30 años)
- Ley 2015/2020 — Historia Clínica Electrónica Interoperable
- Res. 866/2021 — Datos clínicos relevantes
- Res. 1888/2025 — HL7 FHIR + RDA
- Ley 372/1997 — Optometría
- Ley 650/2001 — Código Ética Optometría (Art. 24 fórmula)
- Ley 1164/2007 — ReTHUS
- Decreto 825/1954 — Idioma español prescripción
- Res. 3100/2019 + Res. 544/2023 — Habilitación REPS
- Decreto 1030/2007 — Reglamento técnico dispositivos médicos visuales
- Ley 1581/2012 + Decreto 1377/2013 — Datos personales / sensibles
- Ley 1751/2015 — Salud y confidencialidad HC
- Res. 2275/2023 — RIPS JSON + FEV salud
- Res. 558/2024 + Res. 1884/2024 — Cronograma MUV
- Res. 1036/2022 — Validaciones MUV
- Res. 1442/2024 — Transición CIE-11
- Decreto 4725/2005 — Registro Sanitario INVIMA dispositivos
- Res. 4396/2008 — Capacidad de Producción INVIMA
- Decreto 2200/2005 — Vigencia prescripción
- NTC 5145 / ISO 8980 — Tolerancias lentes oftálmicos
- Res. 740/2024 + Res. 2622/2024 + Circular 0044/dic-2025 — MIPRES
- Art. 424 Estatuto Tributario — Exclusión IVA lentes
- Concepto DIAN 627/2024 — Monturas gravadas 19% IVA
