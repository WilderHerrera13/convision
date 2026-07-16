# Tipos de Documento — Facturación Electrónica

> Qué documentos electrónicos debe emitir una óptica / clínica visual en Colombia.
> Para leyenda de confianza (✅🟡🔵) ver `BITACORA.md`.

---

## Resumen de tipos y prioridad de implementación

| Tipo | Obligatorio para óptica retail | Obligatorio si factura a aseguradoras | Prioridad |
|---|---|---|---|
| Factura Electrónica de Venta (FEV) | ✅ Sí | ✅ Sí | 1 — Fase 1 |
| Nota Crédito (NC) | ✅ Sí (devoluciones/descuentos) | ✅ Sí | 1 — Fase 1 |
| Nota Débito (ND) | ✅ Sí (ajustes) | ✅ Sí | 1 — Fase 1 |
| Documento Equivalente POS (tiquete electrónico) | 🟡 Parcialmente (ver §3) | No aplica | 2 — Fase 1b |
| FEV en Salud + RIPS (Res. 2275/2023) | No si solo retail | ✅ Obligatorio | 3 — Fase 2 |
| Documento Soporte (compras a no obligados) | 🔵 Según proveedores | No aplica | 4 — Fase 2 |
| Nómina Electrónica (Res. 000013/2021) | 🔵 Según nómina | No aplica | 5 — Módulo separado |

---

## 1. Factura Electrónica de Venta (FEV)

✅ Es el documento principal. Se emite cuando:
- Se vende al cliente final (lentes, monturas, accesorios).
- Se presta un servicio de optometría o salud visual.
- El comprador identifica su NIT/documento y exige factura.

### 1.1 Campos obligatorios (Art. 617 E.T. + Anexo Técnico v1.9)

🔵 Lista de campos mínimos en el XML UBL:

```
- UBLVersionID: "UBL 2.1"                        ← literal exacto, DIAN rechaza cualquier variante
- ID: consecutivo autorizado
- IssueDate + IssueTime
- InvoiceTypeCode: "01" (factura venta)
- DocumentCurrencyCode: "COP"
- AccountingSupplierParty: NIT, razón social, dirección, email
- AccountingCustomerParty: NIT o 222222222222, nombre/razón social, email
- InvoiceLines: cada línea con ID, cantidad, precio unitario, descripción, UNSPSC o código interno
- TaxTotal: por cada tarifa de IVA (0%, 19%) o por exclusión
- LegalMonetaryTotal: subtotal, IVA, descuentos, total
- CUFE en UBLExtensions → QRCode
- UBLExtensions → DianExtensions → InvoiceControl (claves numeración + software)
- UBLExtensions → DianExtensions → SoftwareSecurityCode (hash SHA-384 del software)
- UBLExtensions → DianExtensions → AuthorizationProvider: NIT DIAN = 800197268-4
```

### 1.2 "Consumidor final"

✅ Si el comprador no suministra datos:
- `AccountingCustomerParty/ID = 222222222222`
- Nombre = "consumidor final" (o nombre informal si se conoce)
- ⚠️ Este tipo de documento (sin identificación del comprador) NO puede usarse como soporte de
  costos/deducciones por el cliente — solo es válido como documento de gasto no sustentado.

---

## 2. Nota Crédito (NC) y Nota Débito (ND)

### Nota Crédito — cuándo emitirla

🔵 Se emite para:
- Devoluciones de productos.
- Descuentos post-factura.
- Anulación parcial o total de una FEV.
- Corrección de datos de una FEV.

✅ La NC referencia la FEV original mediante el campo `BillingReference/InvoiceDocumentReference`.
El código de identificación para la NC es `"91"`.

### Nota Débito — cuándo emitirla

🔵 Se emite para:
- Ajustes al alza sobre una FEV existente (mayor valor).
- Intereses de mora, recargos.

Código de identificación: `"92"`.

### CUDE (en lugar de CUFE)

✅ Las notas crédito/débito usan **CUDE** (Código Único de Documento Equivalente Electrónico) en lugar
del CUFE. El algoritmo SHA-384 es el mismo; cambia el campo de tipo de documento en la concatenación.

---

## 3. Documento Equivalente Electrónico (POS / Tiquete)

### 3.1 Estado actual — qué cambió con Res. 000165/2023

✅ La Res. 000165/2023 **eliminó el límite de 5 UVT** que existía para el tiquete POS bajo la
normativa anterior (Res. 000042/2020). El tiquete POS electrónico ya **no tiene restricción de valor**.

✅ La migración a tiquete equivalente **electrónico** fue escalonada:
- Grandes contribuyentes: desde el 3 de febrero de 2024.
- Declarantes de renta: desde el 1 de marzo de 2024.
- Demás obligados: fechas pendientes de resolución DIAN.

🟡 El Anexo Técnico de Documento Equivalente Electrónico v1.0 rige el POS electrónico.
El CUDE para el tiquete POS usa los mismos campos que el CUFE pero con código de tipo documento `"05"`.

### 3.2 Implicación para Convision

En el mostrador de óptica hay **dos escenarios**:

| Escenario | Documento a emitir |
|---|---|
| Cliente identificado exige factura | Factura Electrónica de Venta (FEV) |
| Venta rápida sin identificación del cliente | Tiquete POS electrónico (documento equivalente) |

🔵 Para el roadmap: implementar primero la FEV (obligatoria) y después el tiquete electrónico. En
el ínterin, mientras el tiquete electrónico no esté implementado, todas las ventas van como FEV
con "consumidor final / 222222222222". Esto es legalmente válido aunque menos eficiente.

---

## 4. Factura Electrónica de Venta en Salud + RIPS (Res. 2275/2023)

> **Solo aplica si Convision factura a EPS, prepagadas, ARL o seguros.** Si solo se factura
> directamente al paciente (retail), este módulo no es necesario en fase 1.

### 4.1 Marco normativo — ACTUALIZACIÓN CRÍTICA (julio 2026)

⚠️ **La Resolución 2275/2023 fue derogada por la Resolución 948 de 2026.**

✅ **Resolución MinSalud 948 del 14 de mayo de 2026** es la norma vigente que regula el RIPS
como soporte de la FEV en salud. Deroga completamente:
- Res. 2275 de 2023
- Res. 558 de 2024
- Res. 1884 de 2024

⚠️ Cualquier documentación que cite Res. 2275/2023 o Res. 1036/2022 está desactualizada.
La implementación debe basarse en **Res. 948/2026**.

### 4.2 Modelo de validación dos niveles (sin cambios en la arquitectura)

✅ La arquitectura central del sistema NO cambió con Res. 948/2026:

```
Nivel 1 — DIAN:
    FEV XML (firmado) → DIAN → ApplicationResponse (CUFE validado)

Nivel 2 — MinSalud (Mecanismo Único de Validación — MUV):
    DIAN-validated FEV XML + RIPS JSON
        → MUV del Ministerio de Salud
        → CUV (Código Único de Validación)

La factura NO puede radicarse ante el pagador (EPS/ARL) sin CUV.
Plazo para radicar: máximo 22 días hábiles desde la expedición de la FEV.
```

✅ El RIPS sigue siendo en formato **JSON** (no archivos planos .txt).
El FEV sigue siendo en formato **XML UBL Anexo Técnico 1.9 de DIAN**.

### 4.3 Novedades de la Resolución 948 de 2026

✅ Cambios materiales respecto al régimen anterior:

| Novedad | Descripción |
|---|---|
| **CUCON** (Código Único de Contrato) | Cadena SHA-256 de 64 caracteres generada automáticamente por SIIFA al registrar el contrato. **Ninguna factura puede radicarse sin CUCON**, salvo excepciones (urgencias sin contrato, tutelas, SOAT). |
| Documentos Técnicos fuera del texto normativo | Los antiguos Anexos Técnicos 1 y 2 ahora son "Documentos Técnicos" publicados en el micrositio SISPRO — actualizables sin necesidad de nueva resolución. **El software debe monitorear SISPRO** activamente. |
| Nuevas reglas desde 1-jun-2026 | 14 reglas pasaron de "Notificación" a "Rechazo" en el MUV. Errores que antes eran avisos ahora bloquean el CUV. |
| Ajustes estructurales desde 1-jul-2026 | Cambios técnicos de software ya exigibles (julio 2026 ya está activo). |
| Exclusiones explícitas | Centros de reconocimiento de conductores, cirugía estética, medicina alternativa sin financiación pública: RIPS no obligatorio (solo FEV DIAN). |

✅ Flujo operativo actualizado:
```
(i)  Generar FEV con validación previa DIAN → obtener CUFE
(ii) Generar RIPS JSON (con CUCON del contrato)
(iii) Validar localmente el conjunto XML+JSON
(iv) Transmitir al MUV (Ministerio) → obtener CUV
(v)  Radicar ante el pagador (ERP) dentro de 22 días hábiles con el CUV
```

### 4.4 Plazos y estado de implementación (julio 2026)

✅ El sistema ya está en operación completa para los tres grupos:
- Alta complejidad: desde oct-2024
- Mediana complejidad: desde feb-2025
- Baja complejidad, profesionales independientes, PTS: desde abr-2025

✅ Las reglas de severidad de rechazo y los ajustes estructurales de julio 2026 **ya son exigibles
a la fecha de esta investigación** (jul-2026).

### 4.5 Códigos de operación DIAN para salud

🟡 La FEV en salud usa códigos de operación específicos:
- `SS-CUFE`: para facturas estándar tipo `01` o tipo `04`
- `SS-CUDE`: para notas crédito/débito asociadas a FEV en salud

### 4.6 Recurso técnico oficial

✅ El micrositio oficial con Documentos Técnicos, validadores y actualizaciones:
https://www.sispro.gov.co/central-financiamiento/Pages/facturacion-electronica.aspx

---

## 5. Documento Soporte en Adquisiciones a No Obligados

🔵 Se emite cuando Convision **compra** a un proveedor que no está obligado a facturar
(pequeños artesanos, personas naturales del régimen simplificado, etc.).

Rige la Resolución DIAN 000167 del 30 de diciembre de 2021.

Relevante para la óptica si:
- Compra monturas artesanales a artesanos no obligados a facturar.
- Paga honorarios a personas naturales sin RUT completo.

**Prioridad:** Fase 3 o posterior. No bloquea el flujo principal de ventas.

---

## 6. Nómina Electrónica

🔵 Rige la Resolución DIAN 000013 del 11 de febrero de 2021.
Es un módulo completamente independiente de la facturación de ventas.
Aplica cuando Convision (o las ópticas clientes) tienen empleados vinculados laboralmente.

**Prioridad:** Módulo separado, fuera del alcance de la fase de facturación de ventas.

---

## 7. Matriz de decisión de documento por tipo de transacción (óptica)

| Transacción | Documento |
|---|---|
| Venta de lentes/monturas al paciente — con sus datos | FEV (FV-01) |
| Venta rápida — sin datos del cliente | Tiquete POS electrónico (o FEV con 222...) |
| Devolución de producto | Nota Crédito (NC) referenciando la FEV |
| Ajuste de precio al alza post-venta | Nota Débito (ND) |
| Servicio de optometría al paciente directo | FEV (servicio excluido IVA, Art. 476) |
| Servicio de optometría facturado a EPS/ARL | FEV en Salud + RIPS JSON + CUCON → CUV (Res. 948/2026) |
| Compra a proveedor no obligado a facturar | Documento Soporte |
| Liquidación de nómina empleados | Nómina Electrónica |
