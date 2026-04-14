# Phase 6 Context: Cash Register Close Module — Cierre de Caja

**Source:** Extracted from `dESARROLLO.xlsx` (Solicitud de Desarrollo de Software – Cierre de Caja); suplemento discuss-phase 2026-04-14 (PRD + Figma `623:2`).
**Phase goal:** Desarrollar el módulo completo de cierre de caja diario para asesores de la óptica, con control por medios de pago, conteo físico de efectivo por denominaciones, reporte de gestión diaria y revisión administrativa.

**Status:** Ready for planning (contexto revisado contra Figma; reconciliación Mañana/Tarde vs v1 abajo).

---

## Domain Understanding

### Medios de pago a registrar
El sistema maneja exactamente estos 10 medios de pago (extraídos del Excel):
1. Efectivo
2. Voucher
3. Bancolombia
4. Daviplata
5. Nequi
6. Addi
7. Sistecredito
8. Anticipo
9. Bono
10. Pago Sistecredito

Cada medio de pago tiene:
- **Valor registrado** (pulled desde ventas del sistema ó ingresado manualmente)
- **Valor contado** (ingresado manualmente por el asesor)
- **Diferencia** = Registrado − Contado (positivo = falta, negativo = sobra)

### Conteo de efectivo por denominaciones
Denominaciones colombianas:
- Billetes: $100.000, $50.000, $20.000, $10.000, $5.000, $2.000, $1.000
- Monedas: $500, $200, $100, $50

Para cada denominación: cantidad × valor = subtotal. El total suma todos los subtotales.

### Reporte diario del asesor
**Prioridad de diseño (2026-04-14):** la **UI v1** debe alinearse con Figma — canvas `623:2`, frames Reporte diario recepcionista `399:286`, wizard registro rápido `634:90` / `698:177` / `698:234`, admin detalle `732:369`, admin listado consolidado `734:482`. El Excel (`dESARROLLO.xlsx`) sigue siendo referencia de nombres y métricas; el desglose **Mañana/Tarde** y filas que no aparecen en Figma P3–P7 quedan en **backlog** salvo decisión explícita de ampliar alcance.

Métricas de gestión (del Excel "Reporte diario de atención a Clientes y Ventas") — también reflejadas en Figma por secciones:
- Preguntas (H/M/N)
- Cotizaciones (H/M/N)
- Entregas de Bonos
- Bonos redimidos
- Sistecreditos Realizados
- Addi Realizados
- Consultas Efectivas (H/M/N)
- Consulta "Venta Formula"
- Consultas No Efectivas
- Control de Seguimiento
- Seguimiento Garantías
- Órdenes
- Plan Separe
- Otras ventas
- Entregas
- Sistecreditos Abonos
- Valor de las órdenes

Con desglose por jornada en Excel: Mañana / Tarde / Total Día (**no requerido en v1 si no está en Figma P3–P7**; ver backlog).

Actividad en redes sociales:
- Publicaciones Subidas a Facebook/Instagram/Whatsapp
- Publicaciones Compartidas en Facebook
- TikToks Realizados
- Bonos Regalo Enviados / Bonos de Fidelización Enviados
- Mensajes Recibidos FB/Instagram/Whatsapp
- Entregas Realizadas
- Etiquetas realizadas por Clientes
- Cotizaciones (trabajo)
- Órdenes de trabajo

---

## Implementation Decisions

### Rol “asesor” vs modelo Convision (bloqueado)

- En lenguaje de negocio **“asesor”** = usuario con rol **`receptionist`** (Figma: Recepcionista / Recepción). No se introduce un rol nuevo salvo decisión de producto explícita documentada en PLAN.

### Reporte diario — producto v1 (discuss-phase 2026-04-14)

- **Un reporte por `user_id` + `fecha` (día calendario)** en la zona horaria de la aplicación (definir en implementación; default razonable: `America/Bogota` si el negocio es CO).
- **Secciones y campos** como Figma: Atención al cliente (métricas con columnas Hombre / Mujer / Niño donde aplique), Operaciones (incl. monetario “Valor de las órdenes”), Redes sociales, **Observaciones** (texto).
- **Estados mínimos:** `borrador` · `pendiente` · `completa` (badges + filtro admin). Semántica recomendada para planificación:
  - **Borrador:** edición libre / autoguardado.
  - **Completa:** el usuario confirma cierre del reporte ese día (CTA tipo “Guardar reporte” / flujo explícito); validar campos obligatorios si se definen.
  - **Pendiente:** intermedio opcional (p. ej. enviado a revisión o incompleto según regla de negocio); quien redacte el **PLAN** debe fijar **una sola** interpretación para no duplicar conceptos con “borrador”.
- **Selector “Completa” en cabecera (Figma):** debe ser coherente con el estado real del recurso; sincronizar filtro de admin con el listado (nota de diseño en frame P7 `734:482`).

### Registro rápido de atención

- Flujo **en 3 pasos:** (1) tipo de ítem acotado a las filas de atención al cliente, (2) perfil hombre / mujer / niño, (3) observación opcional → **Finalizar**.
- Al finalizar: **incrementar** los contadores del reporte del día del usuario autenticado (crear reporte borrador si no existe, según regla acordada en PLAN).
- **Trazabilidad mínima:** registrar eventos o líneas de detalle — **decisión técnica** reservada al PLAN (event log vs tabla de líneas); debe permitir auditoría básica y coherencia con totales.

### Admin

- **Vista listado (Figma P7):** tabla/listado de reportes del **día seleccionado**, filtro por asesor, filas con estado y acción abrir detalle; **filtros de cabecera y de tarjeta sincronizados** (especificación en Figma).
- **Vista detalle (Figma P6):** mismo layout de métricas que el reporte del asesor, solo lectura, filtros fecha + asesor + estado.

### Referencias canónicas (downstream)

- Figma: archivo Convision, nodo página `623:2`; componentes DS página `33:2` (sin inventar hex en UI).
- Negocio: `dESARROLLO.xlsx` (raíz del repo) — cadenas del reporte diario.
- **UAT esperado:** crear/editar borrador; completar; admin ve listado y detalle; registro rápido actualiza totales; recepcionista no ve datos de otros; admin sí.

### Architecture

**Backend approach:**
- Nuevos modelos: `CashRegisterClose`, `CashRegisterClosePayment`, `CashCountDenomination`, `DailyActivityReport`
- El `CashRegisterClose` es el registro maestro: user_id + close_date + status
- Los medios de pago se guardan como filas en `cash_register_close_payments` (uno por medio)
- Las denominaciones en `cash_count_denominations` (una por denominación)
- El reporte diario es independiente: `daily_activity_reports` — **v1 Figma:** métricas por día sin desglose Mañana/Tarde en UI; el modelo puede usar JSON/columnas según PLAN (jornada Excel = backlog)
- No depende del modelo `PaymentMethod` existente — los medios de cierre son un enum fijo del dominio
- Sí referencia `User` para el asesor que realiza el cierre

**Status workflow:**
```
draft → submitted → reviewed/approved
```
- El asesor puede editar mientras esté en `draft`
- Al `submit`, el admin puede verlo
- El admin lo pasa a `approved` o lo devuelve con observación

**Rol de acceso:**
- Receptionist (asesor): crea y ve solo sus propios cierres
- Admin: ve todos los cierres, puede aprobar, ve reportes agregados

### Frontend approach

**Asesor — páginas:**
1. `/receptionist/cash-close` — Formulario de cierre del día (tabs):
   - Tab "Medios de Pago": tabla con 10 filas (un medio por fila), columnas: Valor Registrado / Valor Contado / Diferencia (calculado)
   - Tab "Conteo Efectivo": grilla de denominaciones con cantidad y subtotal
   - Tab "Resumen": totales, sobrante/faltante global, botón "Enviar cierre"
2. `/receptionist/cash-close/history` — Historial de cierres del asesor
3. `/receptionist/daily-report` (o ruta final alineada al menú **“Reporte de gestión diario”**) — Formulario **reporte diario v1** según Figma (secciones + observaciones); **sin columnas Mañana/Tarde en v1** salvo cambio de alcance
4. Ruta adicional **registro rápido de atención** — wizard 3 pasos (ruta dedicada o modal; decidir en PLAN según patrones existentes)
5. `/receptionist/daily-report/history` — Historial de reportes (si sigue siendo necesario respecto a v1)

**Admin — páginas:**
1. `/admin/cash-closes` — Tabla de todos los cierres (filtro por asesor, fecha, estado)
2. `/admin/cash-closes/:id` — Detalle completo: medios + denominaciones + diferencias + botón Aprobar
3. `/admin/daily-reports` — **Consolidado del día (P7)** + acceso a **detalle por asesor (P6)**; filtros sincronizados según Figma

**Componentes compartidos:**
- `CashPaymentMethodRow` — fila de un medio de pago con inputs y diferencia calculada
- `DenominationCountRow` — fila de denominación con input cantidad y subtotal calculado
- `CashCloseSummary` — tarjeta resumen con totales y flag sobrante/faltante

### UI decisions
- Formulario de cierre: usar shadcn/ui `Tabs` para separar Medios / Efectivo / Resumen
- Diferencias negativas (sobra) en verde, positivas (falta) en rojo
- Totales en tarjetas `Card` con `Badge` de estado
- Tabla de historial con `EntityTable`/`DataTable` siguiendo el patrón existente
- Todos los textos en **español**
- DatePicker para selección de fecha de cierre

---

## What's Already Available

- `PaymentMethod` model existe pero es para ventas; el cierre usa su propio enum fijo
- `User` model con roles (admin/receptionist/specialist) — se reutiliza directamente
- `ApiFilterable` trait — se añade a los nuevos modelos
- Patrón service/resource/request ya establecido — todos los nuevos controllers lo siguen
- `EntityTable` / `DataTable` en frontend — se usa para todas las tablas del módulo
- `DatePicker` component — se usa en selección de fecha
- React Query + axios interceptors — se usan para todos los calls API

---

## Out of Scope (This Phase)

- Exportación PDF del cierre (se puede agregar en siguiente milestone)
- Notificaciones push al admin cuando un asesor envía un cierre
- Integración automática con ventas del sistema (el valor registrado se ingresa manualmente por ahora)
- Dashboard con gráficos históricos de cierres

---

## Canonical references (planificación / implementación UI)

- `.planning/phases/06-cash-register-close-module-cierre-de-caja-diario-por-asesor/06-FIGMA-AND-FTC.md` — Mapa de frames Figma (`623:2`), URLs, IDs de nodos, flujo `/ftc` y checklist DS (`33:2`).
- `.planning/phases/06-cash-register-close-module-cierre-de-caja-diario-por-asesor/06-RESEARCH.md` — Investigación breve que incorpora Figma + FTC.

## Plans Breakdown

**Plan 06-01: Backend — Cierre de Caja**
- Migrations: `cash_register_closes`, `cash_register_close_payments`, `cash_count_denominations`
- Models + ApiFilterable + relationships
- Service: `CashRegisterCloseService` (lógica de conciliación, totales, diferencias)
- Controller: `CashRegisterCloseController` (index/show/store/update/submit/approve)
- Form Requests: Store, Update, Submit
- API Resources: `CashRegisterCloseResource`, `CashRegisterCloseCollection`
- Routes: auth-protected, role-gated

**Plan 06-02: Backend — Reporte Diario**
- Migration: `daily_activity_reports`
- Model: `DailyActivityReport` + ApiFilterable
- Service: `DailyActivityReportService`
- Controller: `DailyActivityReportController` (index/show/store/update)
- Form Requests + Resources
- Routes

**Plan 06-03: Frontend — Vistas Asesor (Receptionist)**
- `cashRegisterCloseService.ts` + `dailyActivityReportService.ts`
- Páginas: `CashClose.tsx`, `CashCloseHistory.tsx`, `DailyReport.tsx`, `DailyReportHistory.tsx`
- Componentes: `CashPaymentMethodRow`, `DenominationCountRow`, `CashCloseSummary`
- Rutas en `App.tsx`

**Plan 06-04: Frontend — Vistas Admin**
- Páginas: `CashCloses.tsx` (lista), `CashCloseDetail.tsx` (detalle + aprobar), `DailyReports.tsx`
- Rutas en `App.tsx`
