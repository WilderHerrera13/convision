# Flujo Especialista — Gestión de Cita Médica

**Contrato compartido para todos los subagentes Pixel.**
Cada subagente que diseñe en Figma debe leer este documento ANTES de actuar.

---

## Contexto del proyecto

- **Archivo Figma:** `dHBbcAQTlUSXGKnP6l76OS`
- **Page destino:** `📅 05 · Citas` — node-id `20:6`
- **Rol:** Especialista — color primario `#0F8F64`, bg acento `#E5F6EF`
- **Sidebar maestro a clonar:** `Sidebar/Role=Especialista` (`83:106`) — ya incluye SedeSwitcher embebido
- **Spec madre Pixel:** `/Users/wilderherrera/Desktop/convision/pixel.md` (lectura obligatoria antes de cualquier ejecución)

---

## Frames ya existentes en la page (NO TOCAR)

```
24:129   Lista de Citas (recepcionista)              x=0      y=0
585:80   Nueva Cita — Paso 1 · Paciente              x=1520   y=0
585:172  Nueva Cita — Paso 2 · Especialista          x=3040   y=0
585:269  Nueva Cita — Paso 3 · Fecha y Hora          x=4560   y=0
585:429  Nueva Cita — Paso 4 · Confirmación          x=6080   y=0
599:80   Estado vacío Paso 1                          x=7620   y=0
599:159  Buscando Paso 1                              x=9140   y=0
599:242  Sin resultados Paso 1                        x=10660  y=0
600:80   QuickCreate Paciente                         x=12180  y=0
600:159  Cita Agendada Success                        x=13700  y=0
604:80   QuickCreate Error                            x=15220  y=0
617:80   Mapa de Flujo NewAppointmentDialog           x=16660  y=0
```

Todos estos frames son del flujo **Recepcionista**. El nuevo flujo **Especialista** se ubica en una **fila nueva debajo**, comenzando en `y=1000`.

---

## Layout maestro del nuevo flujo Especialista

Todos los frames del flujo Especialista van en **fila horizontal**:
- `y = 1000` (constante)
- Ancho de cada frame: `1440px`
- Alto de cada frame: `938px` (estándar Pixel)
- Separación horizontal entre frames: `80px`

```
x=0      Agenda Hoy (lista de citas del especialista)
x=1520   Agenda Hoy — Empty (sin citas hoy)
x=3040   Agenda — Filtros aplicados
x=4560   Detalle Cita — scheduled (botón Tomar)
x=6080   Modal "Ya tienes cita en progreso" (overlay sobre detalle)
x=7600   Detalle Cita — in_progress (Tab Resumen)
x=9120   Detalle Cita — Tab Historia Clínica (readonly)
x=10640  Detalle Cita — Tab Anotaciones de ojos
x=12160  Crear Evolución (formulario SOAP)
x=13680  Crear Prescripción (formulario óptico)
x=15200  Cita Completada + Toast éxito
x=16720  Cita Pausada — banner Reanudar
x=18240  Reagendar Cita (modal o pantalla)
```

**Section labels:** un `SectionLabel/X` arriba de cada frame en `y=948` (52px sobre el frame), con el nombre del paso.

**Flow arrows:** entre cada par de frames consecutivos, una flecha `FlowArrow/N` centrada verticalmente en `y=1440` (mitad de los frames), con el nombre del trigger de transición.

---

## Identidad visual obligatoria

### Paleta del rol Especialista (verificada)

| Elemento | Valor |
|---|---|
| Primario | `#0F8F64` |
| Bg acento | `#E5F6EF` |
| Botón primario CTA | bg `#0F8F64`, texto `#FFFFFF Semi Bold 13px` |
| Wordmark "vision" en sidebar | `#0F8F64` |
| RoleBadge texto | `#0F8F64` |
| RoleBadge bg | `#E5F6EF` |
| NavItem activo bg | `#E5F6EF` |
| NavItem activo texto | `#0F8F64` |
| Avatar bg | `#E5F6EF` |
| Avatar iniciales | `#0F8F64` |
| Indicador de tab activo | barra `2px #0F8F64` |
| Card/Tip border | `#0F8F64` |
| Card/Tip bg | `#E5F6EF` |
| Card/Tip text | `#0F8F64` |

### NavItem activo en cada pantalla del flujo

**Siempre marcar `Citas` como NavItem activo** en el Sidebar (todas las pantallas del flujo).

---

## Reglas duras heredadas de pixel.md (resumen accionable)

1. **Iconos:** solo Lucide desde Assets. Color default `#7D7D87`. Excepciones: color del rol cuando sea elemento de identidad activo, semánticos en estado.
2. **Sidebar:** `Sidebar/Role=Especialista` (`83:106`) clonado completo. Trae SedeSwitcher embebido. **Prohibido SedeSwitcher en Topbar.**
3. **Topbar:** alto `60px`, breadcrumb top `9px`, título top `27px`, botones a la derecha (Cancelar `Outline` + acción primaria `Primary` recoloreado a verde).
4. **Tabla:** clonar `Table/Frame` (`78:89`) y contextualizar — nunca tabla manual.
5. **Empty States:** clonar de catálogo (`EmptyState/Citas` `370:90`), reescribir copy.
6. **Modal:** clonar `Modal/Dialog` (`88:6`).
7. **Toasts:** clonar `Toast/Success` (`88:19`), `Toast/Error` (`88:24`).
8. **Sin emojis en canvas.** Iconos `[OK]`, `[ERROR]` solo en reportes de texto fuera de Figma.
9. **Multiplos de 4px** en todo espaciado.
10. **Botón primario** = fondo `#0F8F64` (color del rol). Nunca azul ni negro. `Button/Blue` (`51:30`) NO se usa aquí.
11. **Vistas de creación = pantalla completa.** Botones Cancelar + Primary van en el Topbar, no en footer. FormCard a la izquierda (780px), AsidePanel a la derecha (332px). Footer solo nota "Campos con * son obligatorios".

---

## Mapa del flujo (estados del backend Laravel)

Estados de `Appointment.status`: `scheduled` → `in_progress` → `completed`
                                                      ↓ (pausa)
                                                  `paused` → (resume) → `in_progress`
                                  → `cancelled`

### Acciones del Especialista (endpoints)

| Acción | Endpoint | Estado origen | Estado destino |
|---|---|---|---|
| Tomar cita | `POST /api/v1/appointments/{id}/take` | `scheduled` | `in_progress` |
| Pausar cita | `POST /api/v1/appointments/{id}/pause` | `in_progress` | `paused` |
| Reanudar cita | `POST /api/v1/appointments/{id}/resume` | `paused` | `in_progress` |
| Completar cita | `PATCH /api/v1/appointments/{id}` body `{status: "completed"}` | `in_progress` | `completed` |
| Reagendar | `POST /api/v1/appointments/{id}/reschedule` | cualquiera ≠ completed | `scheduled` |
| Crear evolución | `POST /api/v1/clinical-evolutions/from-appointment` | requiere `in_progress` o `paused` | — |
| Crear prescripción | `POST /api/v1/prescriptions` | `in_progress` y sin prescripción previa | — |

### Reglas de negocio críticas a reflejar en UI

1. **Un especialista no puede tener 2 citas en `in_progress` simultáneas.** Si intenta tomar una segunda → backend lanza `AppointmentInProgressException`. UI debe mostrar **Modal/Toast con CTA "Ir a cita en progreso #N"**.
2. **Solo el especialista que tomó la cita puede pausar/reanudar/completar.** UI debe ocultar/deshabilitar acciones para otros.
3. **Filtrado por defecto del listado:** especialista solo ve sus propias citas (`specialist_id = user.id`) con estados `scheduled`, `in_progress`/`paused` (suyas) y `completed`.
4. **Crear Evolución requiere Historia Clínica previa del paciente.** Si no existe → mostrar empty state con CTA "Crear historia clínica" (FUERA de alcance de esta tanda — solo poner el placeholder/banner informativo).

---

## Modelo de datos relevante (Laravel)

### Appointment (campos visibles en UI)
```
id, patient_id, specialist_id, taken_by_id, scheduled_at,
status, notes, reason, duration, payment_status, total_amount,
prescription (relación hasOne), clinicalEvolution (relación hasOne)
```

### Patient (campos a mostrar en panel lateral del detalle)
```
first_name, last_name, identification, identification_type,
email, phone, birth_date, gender, address, city, status
```

### Prescription (campos del formulario)
```
date, patient_name, professional, observation, recommendation,
correction_type, usage_type,
right_sphere, right_cylinder, right_axis, right_addition,
right_height, right_distance_p, right_visual_acuity_far, right_visual_acuity_near,
left_sphere, left_cylinder, left_axis, left_addition,
left_height, left_distance_p, left_visual_acuity_far, left_visual_acuity_near,
attachment, annotation_paths
```

### ClinicalEvolution (campos del formulario SOAP)
```
evolution_date (req), subjective (req), objective (req),
assessment (req), plan (req), recommendations (opcional)
```

---

## Componentes de catálogo a reutilizar (no crear desde cero)

| Componente | node-id | Uso en este flujo |
|---|---|---|
| `Sidebar/Role=Especialista` | `83:106` | Toda pantalla |
| `Table/Frame` | `78:89` | Listado de agenda |
| `Badge/En curso` | `51:8` | Status in_progress (recolorear texto a `#0F8F64` si pintado azul) |
| `Badge/Atendido` | `51:6` | Status completed |
| `Badge/Pendiente` | `51:10` | Status scheduled (sin tomar) |
| `Badge/Cancelado` | `51:12` | Status cancelled |
| `Button/Primary` (recolor verde) | `51:28` | CTA primario (Tomar, Completar, Guardar) |
| `Button/Outline` | `51:36` | Cancelar |
| `Button/Danger` | `51:40` | Pausar (variante) |
| `Button/Ghost` | `51:38` | Acciones inline |
| `Card/Metric` | `51:66` | Métricas en agenda (Hoy / En progreso / Completadas) |
| `Card/Content` | `51:70` | Bloques de info paciente |
| `Modal/Dialog` | `88:6` | Modal "Ya tienes cita en progreso" |
| `Toast/Success` | `88:19` | "Cita tomada", "Cita completada" |
| `Toast/Error` | `88:24` | Errores de acción |
| `EmptyState/Citas` | `370:90` | Agenda sin citas |
| `Input/Default`, `Input/Search`, `Input/Filled`, `Input/Focus` | `51:46/49/52/61` | Inputs de formulario |
| `FormField/Default/Focus/Error` | `89:17/21/25` | Wrappers label+input |
| `Dropdown/Trigger`, `Dropdown/Menu` | `51:111/119` | Selectores |
| `TabItem` (active/inactive/done) | `342:270/275/279` | Tabs del detalle de cita |
| `Tooltip/Default`, `Tooltip/Info` | `125:254/264` | Tooltips |

### Iconos Lucide (Assets) requeridos

`calendar-plus`, `play`, `pause`, `check`, `check-circle`, `eye`, `stethoscope`, `clipboard-list`, `file-text`, `history`, `move`, `x-circle`, `alert-circle`, `info`, `user`, `phone`, `mail`, `map-pin`, `cake` (cumpleaños), `building-2` (sede en switcher).

---

## Convenciones de naming de frames y elementos

- Frame de pantalla: `Esp · Citas — [Nombre del paso]` (ej. `Esp · Citas — Agenda Hoy`)
- SectionLabel: `SectionLabel/Esp/[X]` con el x del frame
- FlowArrow: `FlowArrow/Esp/[N] [trigger]` (ej. `FlowArrow/Esp/① Click 'Ver detalle'`)
- Tab activo: nombre `Tab/[Nombre]/active`
- Card: `Card/[Funcion]` (ej. `Card/InfoPaciente`, `Card/AccionesCita`)

---

## Checklist obligatorio que cada subagente verifica antes de cerrar su turno

- [ ] Sidebar Especialista clonado, NavItem `Citas` activo, color `#0F8F64`
- [ ] SedeSwitcher visible en Sidebar (heredado), AUSENTE en Topbar
- [ ] Topbar 60px con breadcrumb `Citas / [Vista]`, título a la izquierda, botones a la derecha
- [ ] Botones primarios en verde `#0F8F64` (no azul, no negro)
- [ ] Tablas clonadas de `Table/Frame` (`78:89`), nunca manuales
- [ ] Datos de ejemplo coherentes con el dominio Convision (oftalmología): pacientes con apellidos hispanos, motivos como "Control anual", "Adaptación LC", "Revisión post-op", "Primera consulta"
- [ ] Sin emojis en capas de texto
- [ ] Iconos Lucide desde Assets, color `#7D7D87` por defecto, excepciones justificadas
- [ ] SectionLabel arriba del frame y FlowArrow hacia el siguiente paso
- [ ] No invadir el espacio de otros frames (separación 80px)
- [ ] Si es vista de creación: pantalla completa, FormCard 780 + AsidePanel 332, botones en Topbar, footer con nota legal

---

## Datos de ejemplo canónicos (usar consistentemente)

### Especialista logueado
- **Dr. Andrés Ramos** (iniciales `AR`), Optómetra, Sede Principal

### Pacientes (rotar entre estos en filas/detalles)
1. **Pedro Gómez Castro** — CC 1.024.567.890 — Tel 311 555 0123 — Motivo: Control anual
2. **Laura Vega Mora** — CC 1.087.234.512 — Tel 314 220 8877 — Motivo: Primera consulta
3. **Carlos Ruiz Bernal** — CC 79.456.213 — Tel 320 145 6620 — Motivo: Revisión graduación
4. **Sofía Herrera Díaz** — CC 1.020.876.345 — Tel 318 902 4411 — Motivo: Control post-op
5. **Andrés López Pinzón** — CC 1.144.567.890 — Tel 305 778 1230 — Motivo: Adaptación LC
6. **María Torres Quintero** — CC 52.123.987 — Tel 313 444 9090 — Motivo: Urgencia ojo seco

### Horarios canónicos del día
8:00 / 8:30 / 9:00 / 9:30 / 10:00 / 10:30 / 11:00 / 11:30 / 12:00 / 2:00 / 2:30 / 3:00 / 3:30 / 4:00 / 4:30 / 5:00 PM

### Sede
**Sede Principal** (Bogotá) — usar siempre como sede activa del especialista en el SedeSwitcher.

---

## Cómo trabajar (subagente Pixel)

1. **Leer pixel.md COMPLETO** (no escanear).
2. **Leer este documento COMPLETO.**
3. Llamar a `get_metadata` con `nodeId="20:6"` y `fileKey="dHBbcAQTlUSXGKnP6l76OS"` para mapear frames existentes y verificar que tu zona (`x` asignado, `y=1000`) está libre.
4. **Activar la page** con `setCurrentPageAsync('20:6')`.
5. Crear frame raíz con dimensiones `1440x938`, name `Esp · Citas — [paso]`, en `(x, 1000)`.
6. Clonar Sidebar Especialista (`83:106`) en `(0, 0)` dentro del frame.
7. Construir Topbar `1200x60` en `(240, 0)`.
8. Construir Content en `(240, 60)` con la composición específica del paso.
9. Aplicar contextualización post-clonado (titulos, datos, NavItem activo).
10. **PASO 5 de pixel.md**: verificar checklist completo. Si falla cualquier punto → corregir antes de cerrar.
11. Crear `SectionLabel/Esp/[x]` arriba del frame en `y=948`.
12. Reportar al orquestador con el formato del bloque "Reporte de cada tarea" en pixel.md.

---

## Glosario

- **SOAP**: estructura de evolución clínica (Subjetivo, Objetivo, Assessment/Evaluación, Plan).
- **Agudeza visual**: medida 20/20, 20/40, etc.
- **Refracción**: medida óptica del ojo (esfera, cilindro, eje).
- **Queratometría**: curvatura corneal (K).
- **LC**: Lentes de contacto.
- **OD/OI**: Ojo Derecho / Ojo Izquierdo (en formularios usar "Ojo derecho" / "Ojo izquierdo" en español, no abreviar).
