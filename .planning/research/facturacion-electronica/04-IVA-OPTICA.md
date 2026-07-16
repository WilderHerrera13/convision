# Reglas IVA y Retenciones — Sector Óptica y Salud Visual (Colombia)

> Este es el documento más crítico para una óptica porque la clasificación incorrecta genera
> sanciones DIAN. Leer completo antes de implementar el motor de líneas de factura.
> Para leyenda de confianza (✅🟡🔵) ver `BITACORA.md`.

---

## 1. Principio fundamental — exclusión ≠ exención ≠ gravado

🔵 En Colombia, estos tres estados fiscales tienen consecuencias contables y de facturación distintas:

| Estado | Significado | En la factura UBL |
|---|---|---|
| **Excluido** | El hecho generador del IVA no se configura (Art. 424 / 476 E.T.) | `TaxCategory/Percent = 0`, `TaxScheme/ID = "ZZ"` (no-taxable) o la codificación equivalente según Anexo v1.9 |
| **Exento** | El hecho generador se configura pero la tarifa es 0% (bienes de la canasta básica, Art. 477 E.T.) | `TaxCategory/Percent = 0`, `TaxScheme/ID = "IVA"`, tarifa especial "excluido" |
| **Gravado** | Se aplica la tarifa general (19%) u otras especiales | `TaxCategory/Percent = 19`, `TaxScheme/ID = "01"` |

⚠️ **Un sistema que marca todos los productos ópticos como "excluidos" tiene un error grave.**
Las gafas armadas y las monturas son **gravadas al 19%**.

---

## 2. Tabla maestra de productos y servicios de una óptica

✅ Basada en Art. 424 E.T. (bienes excluidos) + Concepto DIAN 005341 (int. 627) de 2024 +
Art. 476 E.T. numeral 1 (servicios de salud excluidos):

| Producto / Servicio | Subpartida arancelaria | Tratamiento IVA | Base legal |
|---|---|---|---|
| **Lentes de contacto** | 90.01.30.00.00 | ✅ **EXCLUIDO** — no se cobra IVA | Art. 424 E.T. |
| **Lentes de vidrio para gafas** (sin montar) | 90.01.40.00.00 | ✅ **EXCLUIDO** — no se cobra IVA | Art. 424 E.T. |
| **Lentes de otras materias para gafas** (sin montar) | 90.01.50.00.00 | ✅ **EXCLUIDO** — no se cobra IVA | Art. 424 E.T. |
| **Gafas oftalmológicas completas** (con lente + montura armadas) | 90.04 | ✅ **GRAVADO 19%** | Concepto DIAN 005341/2024 |
| **Monturas / armazones para gafas** | 90.03 | ✅ **GRAVADO 19%** | Concepto DIAN 005341/2024 + regla general |
| **Gafas de sol** | 90.04 | 🔵 **GRAVADO 19%** | Regla general — no en lista de excluidos |
| **Solución para lentes de contacto** | — | 🔵 Probablemente gravado 19% | Regla general — confirmar subpartida |
| **Estuches, cintas, accesorios** | — | 🔵 **GRAVADO 19%** | Regla general |
| **Servicio de consulta optométrica** | — | ✅ **EXCLUIDO** — no se cobra IVA | Art. 476 numeral 1 E.T. |
| **Servicio de adaptación de lentes** | — | ✅ **EXCLUIDO** | Art. 476 numeral 1 E.T. |
| **Examen visual / campimetría / topografía** | — | ✅ **EXCLUIDO** | Art. 476 numeral 1 E.T. |
| **Taller / laboratorio óptico** (tallado de lentes) | — | 🔵 **EXCLUIDO** (servicio de salud) | Art. 476 numeral 1 — confirmar con contador |

### 2.1 La trampa del lente-montura: por qué las gafas armadas sí pagan IVA

✅ El Concepto DIAN 005341 (interno 627) de julio 31, 2024 es explícito:

> "Gafas oftalmológicas no están excluidas de IVA"

La lógica: el Art. 424 excluye los **lentes sin montar** (las subpartidas 90.01.xx son solo el elemento
óptico). Una vez que el lente se incorpora a una montura y se vende como un bien completo (gafas),
la subpartida aplicable cambia a 90.04 (gafas y monturas), que **no** está en la lista de excluidos.

**Implicación práctica para el sistema:**
- Si vendes **solo el lente** → excluido.
- Si vendes **el paquete lente + montura** (gafas terminadas) → gravado 19%.
- El catálogo de productos de Convision necesita un campo `iva_treatment` a nivel de SKU.

---

## 3. Art. 476 E.T. — servicios de salud visual excluidos de IVA

✅ Art. 476 numeral 1 (texto vigente, modificado por Ley 2277 de 2022):

> "Los servicios médicos, odontológicos, hospitalarios, clínicos y de laboratorio, para la salud
> humana."

⚠️ **Nota legal importante**: el texto del Art. 476 numeral 1 **NO menciona explícitamente
"optometría"**. La cobertura de los servicios de optometría bajo esta exclusión se establece a
través de **doctrina DIAN** (Oficios y Conceptos) y la reglamentación del sector salud, que
interpreta que los servicios de optometría son "servicios para la salud humana" en el sentido del
numeral 1.

🔵 Criterio DIAN para que aplique la exclusión del numeral 1:
1. El servicio debe estar directamente dirigido a la salud humana (no a selección de personal,
   entrenamiento, etc.).
2. El profesional debe estar debidamente inscrito y autorizado por la entidad de control.
3. El servicio de optometría cumple ambos criterios cuando se presta como atención visual al paciente.

✅ En la práctica: **la consulta optométrica y los servicios clínicos de la óptica no cobran IVA**.
Esta posición está respaldada por doctrina DIAN reiterada. Sin embargo, al ser una exclusión por
doctrina (no por texto expreso), se recomienda que el contador de la óptica confirme esta
clasificación al configurar los SKUs de servicio.

---

## 4. IVA en factura — codificación UBL

🟡 En el XML UBL 2.1 (Anexo Técnico v1.9), la estructura de impuestos por línea:

### Para bienes/servicios EXCLUIDOS:

```xml
<cac:TaxTotal>
  <cbc:TaxAmount currencyID="COP">0.00</cbc:TaxAmount>
  <cac:TaxSubtotal>
    <cbc:TaxableAmount currencyID="COP">100000.00</cbc:TaxableAmount>
    <cbc:TaxAmount currencyID="COP">0.00</cbc:TaxAmount>
    <cac:TaxCategory>
      <cbc:Percent>0.00</cbc:Percent>
      <cbc:TaxExemptionReasonCode>07</cbc:TaxExemptionReasonCode>
      <!-- 07 = Excluido -->
      <cac:TaxScheme>
        <cbc:ID>01</cbc:ID>
        <cbc:Name>IVA</cbc:Name>
      </cac:TaxScheme>
    </cac:TaxCategory>
  </cac:TaxSubtotal>
</cac:TaxTotal>
```

### Para bienes GRAVADOS al 19%:

```xml
<cac:TaxTotal>
  <cbc:TaxAmount currencyID="COP">19000.00</cbc:TaxAmount>
  <cac:TaxSubtotal>
    <cbc:TaxableAmount currencyID="COP">100000.00</cbc:TaxableAmount>
    <cbc:TaxAmount currencyID="COP">19000.00</cbc:TaxAmount>
    <cac:TaxCategory>
      <cbc:Percent>19.00</cbc:Percent>
      <cac:TaxScheme>
        <cbc:ID>01</cbc:ID>
        <cbc:Name>IVA</cbc:Name>
      </cac:TaxScheme>
    </cac:TaxCategory>
  </cac:TaxSubtotal>
</cac:TaxTotal>
```

⚠️ Los códigos exactos de `TaxExemptionReasonCode` y `TaxScheme/ID` para cada caso están definidos
en las tablas del Anexo Técnico v1.9. Implementar basado en esas tablas, no en este documento.

---

## 5. Retenciones — cuándo aplican en una óptica

🔵 Las retenciones dependen de la **naturaleza jurídica del comprador**, no solo del producto/servicio.
Para una óptica que vende al consumidor final (persona natural), **las retenciones NO aplican** en
la factura de venta. Aplican cuando:

| Situación | Retención |
|---|---|
| El comprador es **gran contribuyente** o **autorretenedor** | Retención en la fuente (reteFuente) puede aplicar |
| El comprador es responsable de IVA y el bien es gravado | ReteIVA (15% del IVA, es decir 15% × 19% = 2.85% sobre el precio) |
| El municipio exige ICA | ReteICA — tarifa varía por municipio |

**Para el flujo estándar de una óptica con clientes finales (personas naturales):**
- No hay reteFuente en la venta.
- No hay ReteIVA.
- No hay ReteICA.

**Cuando la óptica factura a EPS/ARL/prepagadas:**
- La entidad aseguradora **practica retenciones** al pagar. Esto no cambia la factura que emite
  la óptica, pero afecta el recaudo neto. El contador de la óptica debe configurar esto en contabilidad.

🔵 **Recomendación:** Para fase 1, no implementar retenciones automáticas en el motor de facturas.
Implementar el campo en el modelo de datos para que se pueda poblar, pero dejar la lógica de cálculo
para una fase posterior, revisada por un contador.

---

## 6. Checklist de clasificación de producto — antes de implementar el catálogo

Para cada SKU del catálogo de Convision, el contador debe validar:

- [ ] ¿Está en la lista de bienes excluidos del Art. 424 E.T.? (buscar subpartida arancelaria)
- [ ] ¿Es un servicio de salud cubierto por el Art. 476 numeral 1?
- [ ] ¿Si no está en ninguna de las dos listas → tarifa general 19%?
- [ ] Si es una gafa armada o montura → gravado 19% (Concepto DIAN 005341/2024)
- [ ] ¿El SKU se puede vender tanto como lente suelto (excluido) como como gafa armada (gravado)?
  → El sistema debe permitir que el mismo producto base tenga clasificación IVA diferente según
  cómo se registra la venta.

---

## 7. Resumen ejecutivo para ingeniería

El campo `iva_treatment` en cada producto/SKU debe ser una enumeración:

```go
type IvaTreatment string

const (
    IvaTreatmentExcluded IvaTreatment = "excluido"  // Art. 424 / 476 E.T. — no genera IVA
    IvaTreatmentExempt   IvaTreatment = "exento"    // Tarifa 0% con IVA configurado
    IvaTreatmentTaxed19  IvaTreatment = "gravado_19" // Tarifa general 19%
    IvaTreatmentTaxed5   IvaTreatment = "gravado_5"  // Tarifa reducida 5% si aplica
)
```

El motor de factura **nunca calcula IVA** a partir de reglas heurísticas de categoría. Siempre
lee el `iva_treatment` del SKU. El contador configura ese campo en el catálogo.

La asignación del tratamiento IVA es **responsabilidad del contador de la óptica**, no del sistema.
El sistema provee el campo y lo refleja correctamente en el XML — no más.
