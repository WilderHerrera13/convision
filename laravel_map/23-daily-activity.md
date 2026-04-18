# 23 — Daily Activity Reports (Informes de Actividad Diaria)

## Source files
- Controller: `app/Http/Controllers/Api/V1/DailyActivityReportController.php`
- Resources: `DailyActivityReportResource`, `DailyActivityReportCollection`

---

## Middleware: `auth:api`
## Authorization rules
- **GET /index** → all roles
- **GET /{id}** → admin sees any; non-admin can only see their own (`403` otherwise)
- **POST / PUT** → non-admin only (admin gets `403` from FormRequest)
- **POST /quick-attention** → non-admin only (`QuickAttentionDailyActivityReportRequest::authorize()` returns `false` for admin)
- **Editing restriction:** Non-admin can only edit reports where `report_date = today` and `user_id = auth()->id()`. Older reports are read-only for advisors/receptionists.

---

## Shifts
`morning`, `afternoon`, `full`

---

## Endpoints

### GET /api/v1/daily-activity-reports
**Filterable:** Yes. **Paginated:** Yes.
**Response 200:** Paginated DailyActivityReportResource collection

### GET /api/v1/daily-activity-reports/{id}
**Response 200:** DailyActivityReportResource

### POST /api/v1/daily-activity-reports
```json
{
  "report_date": "2024-05-31",          // required|date|date_format:Y-m-d
  "shift": "morning",                   // required|in:morning,afternoon,full

  // Atención (all nullable|integer|min:0)
  "preguntas_hombre": 10,
  "preguntas_mujeres": 15,
  "preguntas_ninos": 5,
  "cotizaciones_hombre": 3,
  "cotizaciones_mujeres": 7,
  "cotizaciones_ninos": 2,
  "consultas_efectivas_hombre": 2,
  "consultas_efectivas_mujeres": 5,
  "consultas_efectivas_ninos": 1,
  "consulta_venta_formula": 3,
  "consultas_no_efectivas": 4,

  // Operaciones (all nullable|integer|min:0 unless noted)
  "bonos_entregados": 2,
  "bonos_redimidos": 1,
  "sistecreditos_realizados": 0,
  "addi_realizados": 1,
  "control_seguimiento": 5,
  "seguimiento_garantias": 2,
  "ordenes": 3,
  "plan_separe": 1,
  "otras_ventas": 2,
  "entregas": 4,
  "sistecreditos_abonos": 0,
  "valor_ordenes": 750000.00,           // nullable|numeric|min:0

  // Redes Sociales (all nullable|integer|min:0)
  "publicaciones_facebook": 2,
  "publicaciones_instagram": 3,
  "publicaciones_whatsapp": 1,
  "publicaciones_compartidas_fb": 5,
  "tiktok_realizados": 1,
  "bonos_regalo_enviados": 3,
  "bonos_fidelizacion_enviados": 2,
  "mensajes_facebook": 10,
  "mensajes_instagram": 8,
  "mensajes_whatsapp": 25,
  "entregas_realizadas": 4,
  "etiquetas_clientes": 6,
  "cotizaciones_trabajo": 3,
  "ordenes_trabajo": 2,

  "observations": "string"              // nullable|max:2000
}
```
**Response 201:** DailyActivityReportResource

### PUT /api/v1/daily-activity-reports/{id}
Same body as store, optional.
**Response 200:** DailyActivityReportResource

### POST /api/v1/daily-activity-reports/quick-attention
**Roles allowed:** All non-admin roles (`QuickAttentionDailyActivityReportRequest::authorize()` blocks admin).

Finds or creates a report for the auth user on the given `report_date`/`shift`, then applies one of two operations:
- **Counter items** (`item` is a counter field) → increments the corresponding column by 1.
- **Amount items** (`item` is a money key) → accumulates the `amount` into `recepciones_dinero[item]` using `bcadd` (2 decimal precision).

Optional `note` is appended to `observations` prefixed with `[Registro rápido]`.

**Counter items** (require `profile` when indicated):
| item | profile required | column modified |
|---|---|---|
| `preguntas` | yes (`hombre`/`mujer`/`nino`) | `preguntas_{hombre\|mujeres\|ninos}` |
| `cotizaciones` | yes | `cotizaciones_{hombre\|mujeres\|ninos}` |
| `consultas_efectivas` | yes | `consultas_efectivas_{hombre\|mujeres\|ninos}` |
| `consulta_venta_formula` | no | `consulta_venta_formula` |
| `consultas_no_efectivas` | no | `consultas_no_efectivas` |
| `bonos_entregados` | no | `bonos_entregados` |
| `bonos_redimidos` | no | `bonos_redimidos` |
| `sistecreditos_realizados` | no | `sistecreditos_realizados` |
| `addi_realizados` | no | `addi_realizados` |

**Amount items** (`amount` is required, `profile` is ignored):
`voucher`, `bancolombia`, `daviplata`, `nequi`, `addi_recibido`, `sistecredito_recibido`, `compras`, `anticipos_recibidos`, `anticipos_por_cru`, `bono_regalo_recibido`, `pago_sistecredito`

**Request body:**
```json
{
  "report_date": "2024-05-31",         // required|date_format:Y-m-d
  "shift": "morning",                   // required|in:morning,afternoon,full
  "item": "string",                     // required — one of the counter or amount items above
  "profile": "hombre | mujer | nino",  // required when item needs profile; ignored for amount items
  "amount": 50000.00,                   // required when item is an amount item|numeric|min:0.01
  "note": "string"                      // nullable|max:500 — appended to observations
}
```
**Response 200:** DailyActivityReportResource

---

## DailyActivityReportResource shape
```json
{
  "id": 1,
  "report_date": "2024-05-31",
  "shift": "morning | afternoon | full",
  "user": { "id": 1, "name": "string", "last_name": "string" },

  "atencion": {
    "preguntas": { "hombre": 10, "mujeres": 15, "ninos": 5 },
    "cotizaciones": { "hombre": 3, "mujeres": 7, "ninos": 2 },
    "consultas_efectivas": { "hombre": 2, "mujeres": 5, "ninos": 1 },
    "consulta_venta_formula": 3,
    "consultas_no_efectivas": 4
  },

  "operaciones": {
    "bonos_entregados": 2,
    "bonos_redimidos": 1,
    "sistecreditos_realizados": 0,
    "addi_realizados": 1,
    "control_seguimiento": 5,
    "seguimiento_garantias": 2,
    "ordenes": 3,
    "plan_separe": 1,
    "otras_ventas": 2,
    "entregas": 4,
    "sistecreditos_abonos": 0,
    "valor_ordenes": 750000.00
  },

  "redes_sociales": {
    "publicaciones_facebook": 2,
    "publicaciones_instagram": 3,
    "publicaciones_whatsapp": 1,
    "publicaciones_compartidas_fb": 5,
    "tiktok_realizados": 1,
    "bonos_regalo_enviados": 3,
    "bonos_fidelizacion_enviados": 2,
    "mensajes_facebook": 10,
    "mensajes_instagram": 8,
    "mensajes_whatsapp": 25,
    "entregas_realizadas": 4,
    "etiquetas_clientes": 6,
    "cotizaciones_trabajo": 3,
    "ordenes_trabajo": 2
  },

  "observations": "string",

  // recepciones_dinero: JSON column (stored as key→amount map).
  // Populated exclusively via POST /quick-attention with amount items.
  // Each key is one of the amount item names; value is accumulated total (string, 2 decimal places).
  "recepciones_dinero": {
    "efectivo": "150000.00",
    "voucher": "80000.00",
    "bancolombia": "0.00",
    "daviplata": "0.00",
    "nequi": "50000.00",
    "addi_recibido": "0.00",
    "sistecredito_recibido": "0.00",
    "compras": "0.00",
    "anticipos_recibidos": "0.00",
    "anticipos_por_cru": "0.00",
    "bono_regalo_recibido": "0.00",
    "pago_sistecredito": "0.00"
    // Only keys that have been incremented at least once will be present.
    // Missing keys imply 0.00.
  },

  "totales": {
    "total_preguntas": 30,
    "total_consultas_efectivas": 8
  },

  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```
