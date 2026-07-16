# 02 — Technical Specification (software propio)

> Everything the software must generate, sign, transmit, and certify to operate as a DIAN-habilitado
> *software propio* biller. This is the "what to build" contract. Source of truth is **Anexo Técnico
> FEV v1.9**; this file distills it for engineers.

Confidence legend: ✅ verified · 🟡 re-confirm · 🔵 accountant's knowledge · ⚠️ pitfall/open.

---

## 1. The five capabilities a software-propio biller must implement

**🟡 (DIAN "Conocimientos requeridos VP-FACE"):**

1. **Construct UBL 2.1 XML** for factura de venta, nota débito, and nota crédito per the Anexo Técnico.
2. **Compute the CUFE / CUDE** correctly per document type.
3. **Apply the advanced digital signature (firma digital)**.
4. **Transmit to DIAN** for validation over the web services.
5. **Deliver to the buyer only after DIAN validates** (validación previa).

Everything below expands these five.

---

## 2. Habilitación (certification) process

**🟡 Registration + enablement flow (DIAN portal):**

### Phase A — Registration
1. Access the **"Habilitación"** portal and generate an access token.
2. Formalize registration ("Registrar").
3. Select **operation mode**: one of
   - **Software gratuito** (DIAN's free tool),
   - **Software propio** (self-built — **our path**),
   - **Proveedor Tecnológico** (third party).
4. The system **auto-generates test numbering ranges** for the set de pruebas.

### Phase B — Set de pruebas (the certification test)
- **✅ You must successfully transmit a test set of:**
  - **2 Facturas**
  - **1 Nota débito**
  - **1 Nota crédito**
- Sent via the **`SendTestSetAsync`** web-service method, in the **habilitación** environment, using
  the DIAN-assigned test ranges.
- On success the mode is accepted and the biller state becomes **"Habilitado"**; on failure it's
  **"Rechazado"** with a **"Reiniciar"** option to resubmit. 🟡

### Phase C — Go live (producción)
1. Enter the **"Facturando Electrónicamente" / "Facturación"** (producción) portal, generate token.
2. Select the electronic-invoicing **start date** (updates the RUT on that date).
3. **Request producción numbering ranges via MUISCA.**
4. Associate the numbering ranges in the producción portal.
5. Associate **contingencia ranges** directly in the invoicing software.

> **🔵 Prerequisites you can't skip:** a **certificado de firma digital** (see §5) issued to the
> company's NIT by an **ONAC-accredited entidad de certificación digital** (e.g., Certicámara, Andes
> SCD, GSE), and the RUT with the correct *responsabilidad* for electronic invoicing.

---

## 3. Document format — UBL 2.1 XML

- **✅ All documents are UBL 2.1 XML** (Universal Business Language 2.1), profiled by the Anexo Técnico
  with DIAN-specific extensions (`UBLExtensions`) that carry the CUFE/CUDE, software provider info,
  authorization/numbering metadata, QR, and the digital signature.
- Distinct UBL document types:
  - **Invoice** → Factura Electrónica de Venta.
  - **CreditNote** → Nota Crédito.
  - **DebitNote** → Nota Débito.
  - **ApplicationResponse** → used for DIAN's validation result **and** for RADIAN events (acuse/
    aceptación/rechazo/reclamo).
- Numeric/format conventions are strict (decimals, rounding, code lists). The Anexo Técnico ships the
  **code lists (catálogos)**: tax schemes, unit measures, municipality codes, document types, etc.
  These must be embedded as reference data. 🟡

> **⚠️ The XML is the legal document.** The PDF (representación gráfica) is only a human rendering. All
> validation, storage, and archival is of the **XML (inside the container ZIP)**.

---

## 4. CUFE / CUDE — the fingerprint (highest-risk algorithm)

**✅ Fully verified against Anexo FEV v1.9 (pp. 655–657).** Get this byte-exact or DIAN rejects the doc.

### CUFE (Código Único de Factura Electrónica) — for facturas

```
CUFE = SHA-384( NumFac + FecFac + HorFac + ValFac
              + CodImp1 + ValImp1      # IVA
              + CodImp2 + ValImp2      # INC (impuesto al consumo)
              + CodImp3 + ValImp3      # ICA
              + ValTot + NitOFE + NumAdq + ClTec + TipoAmbiente )
```
where `+` is **string concatenation** (no separators).

| Field | Meaning |
|---|---|
| `NumFac` | Invoice number (prefix + consecutive), = UBL `cbc:ID` |
| `FecFac` | Issue date `YYYY-MM-DD` |
| `HorFac` | Issue time `HH:MM:SS-05:00` (with timezone) |
| `ValFac` | Sum of line extension amounts (subtotal before taxes) |
| `CodImp1/2/3` | **Fixed tax codes: `01` = IVA, `04` = INC, `03` = ICA** |
| `ValImp1/2/3` | Total amount per that tax (0.00 if none) |
| `ValTot` | Grand total payable |
| `NitOFE` | Issuer NIT (Obligado a Facturar Electrónicamente) |
| `NumAdq` | Acquirer's document number |
| `ClTec` | **Clave técnica** — a DIAN-provided secret tied to the numbering resolution (**producción only**; test uses the assigned test value) |
| `TipoAmbiente` | **`1` = producción, `2` = habilitación/pruebas** |

### Formatting rules (⚠️ the usual failure points)
- **Money:** decimal **point**, **exactly 2 decimals, truncated** (not rounded up), **no thousands
  separators**. e.g. `119000.00`.
- **NIT / document numbers:** **no dots, no hyphens, no verification digit (DV)**.
- **Algorithm:** **SHA-384**, treated as a one-way hash; output as lowercase hex.
- **⚠️ Do NOT** use SHA-1 (that was the deprecated 2016 Res. 000019 scheme with a different field set).

### CUDE (Código Único de Documento Electrónico) — for notas crédito/débito & others
- **✅ Analogous SHA-384 algorithm** with the document-type-specific field set (uses `ClTec`/software
  PIN as specified per document type). Implement per the Anexo Técnico's CUDE section. 🟡 (confirm exact
  field order for each note type).

---

## 5. Digital signature (firma digital)

- **✅ Required** on every document, applied **"al momento de la generación"**, per DIAN's official
  **política de firma** (Res. 000165, Art. 11 num. 14). Guarantees authenticity, integrity,
  non-repudiation.
- **✅ Format: XAdES** (XML Advanced Electronic Signatures), referencing the DIAN signature policy via
  the `xades:SignaturePolicyIdentifier` element, embedded in the UBL `UBLExtensions`.
- **🟡 Profile details to re-confirm** against the annex + política de firma document:
  - Likely **XAdES-EPES** (policy-explicit) per **ETSI TS 101 903**.
  - Full **certificate chain embedding**.
  - Signature algorithm over `SignedInfo`: **RSAwithSHA256** (SHA-384/512 also accepted). 🟡
  - Canonicalization + digest per the policy.
- **🔵 Certificate:** X.509 (PKCS#12 `.p12`/`.pfx`) issued to the NIT by an **ONAC-accredited CA**.
  Track its **expiry** — an expired cert means you **cannot invoice**. Build renewal alerts.

> **⚠️ Go tooling note.** Go's stdlib has no XAdES. Plan to use/port an XML-DSig + XAdES library
> (e.g., `github.com/russellhaering/goxmldsig` as a base, extended for XAdES-EPES), or shell out to a
> vetted signer. This is a real build cost — budget for it. See [05-IMPLEMENTATION-GUIDE.md].

---

## 6. Numbering (resolución / rangos de numeración)

- **✅** Consecutive numbering with a **prefix of up to 4 alphanumeric characters**, plus the
  **authorization date and validity period**, obtained from **DIAN's electronic numbering service**
  (Res. 000165, Art. 11 num. 4; anchored to Art. 617 lit. d E.T.). Requested via **MUISCA**.
- The software must **persist and enforce** the active range: prefix, range start/end, current
  consecutive, authorization date, validity end.
- **⚠️** No document may be issued **outside an authorized, non-expired range**. Build:
  - a guard that blocks issuance when the range is exhausted or expired,
  - low-remaining alerts, and
  - separate ranges for **producción**, **habilitación/pruebas**, and **contingencia**.

---

## 7. Transmission — DIAN SOAP web services

- **✅ Interface:** `IWcfDianCustomerServices` (WCF/SOAP, WS-Security signed requests). **Not REST.**
- **✅ Methods (from Anexo FEV v1.9):**

| Method | Use |
|---|---|
| `SendBillSync` | Send one document **synchronously**; response carries the validation result. **Primary path for POS/retail** where you need the answer immediately. |
| `SendBillAsync` | Send a **batch (lote)**; poll later. |
| `SendTestSetAsync` | **Habilitación only** — submit the set de pruebas. |
| `GetStatus` / `GetStatusZip` | Query a document's validation status / retrieve the validated container. |
| `GetNumberingRange` | Retrieve authorized numbering ranges for the NIT. |
| `SendEventUpdateStatus` | Register **RADIAN events** (acuse de recibo, aceptación, rechazo, reclamo). |
| `GetXmlByDocumentKey` | Retrieve a validated XML by its CUFE/CUDE. |

- **🟡 Environments** (config-driven; re-confirm current URLs before build):
  - **Habilitación (test) WSDL:** `https://gtoa-webservices-input-test.azurewebsites.net/WcfDianCustomerServices.scs?wsdl` (captured this session).
  - **Producción:** the corresponding producción endpoint — **confirm on DIAN's documentación técnica page**.
- **✅ Validation URL** (used in the QR and for manual lookup):
  `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=<CUFE>`
  (habilitación uses the `-hab` host: `catalogo-vpfe-hab.dian.gov.co`). 🟡

> **⚠️ Go + SOAP.** Generate a client from the WSDL (`hooklift/gowsdl`) or hand-roll `encoding/xml`.
> Requests are **signed** (WS-Security) — the same certificate/XAdES machinery as the document signature.

---

## 8. Validación previa flow (the runtime contract)

```
Sale confirmed
  → build UBL 2.1 XML (with taxes, CUFE, numbering)
  → sign (XAdES)
  → SendBillSync → DIAN
       ├─ ACCEPTED  → store validated container (XML + "Documento validado por la Dian")
       │              → render representación gráfica (PDF + QR)
       │              → deliver to buyer (email/print)
       └─ REJECTED  → surface errors, correct, re-issue (new consecutive or same per rules)
  (if DIAN unreachable) → CONTINGENCIA path (§10)
```

- **✅** The document is only **validly expedida after DIAN validates**. Design the sale UX to account
  for the round trip (synchronous block vs. optimistic-with-contingencia).

---

## 9. RADIAN events (acuse de recibo & aceptación)

- **🟡** Post-issuance lifecycle events are registered via `SendEventUpdateStatus` as UBL
  `ApplicationResponse` documents: **acuse de recibo de la factura**, **recibo del bien/servicio**,
  **aceptación expresa** or **reclamo/rechazo**. These matter for **factura electrónica as a
  negotiable title (título valor)** in RADIAN.
- **Scope call:** for a clinic invoicing consumers/insurers, full RADIAN títulos-valor flows may be
  **out of scope for v1**; the *acuse* events may still be expected for B2B/insurer invoices. Confirm
  with the contador which events are mandatory for Convision's buyers.

---

## 10. Contingencia (mandatory resilience)

- **🔵/🟡** When DIAN's service is unavailable (or connectivity fails), the biller may issue under a
  **contingencia** procedure using **contingencia numbering ranges**, and must **transmit the held
  documents to DIAN within the regulation's window** once service returns.
- Build:
  - a **queue** (`invoice_contingency`) for documents awaiting transmission,
  - a distinct **contingencia numbering range**,
  - automatic **retry with backoff** + a manual "flush contingency" action,
  - clear status tracking so nothing is silently lost.
- **⚠️** Contingencia is not optional polish — a DIAN outage during business hours **will** happen, and
  without this the clinic literally cannot complete sales.

---

## 11. Representación gráfica (PDF) + QR

- **✅ QR code:** minimum **2 cm**, present on **every page**, encoding:
  `NumFac, FecFac, HorFac, NitFac, DocAdq, ValFac, ValIva, ValOtroIm, ValTolFac, CUFE` **plus** the
  validation URL `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=<CUFE>`.
  (Notas use **CUDE** in place of CUFE.)
- **🔵 The PDF must also show** the Art. 617 mandatory content: issuer name + NIT + regime, acquirer
  identity, invoice number, dates, line descriptions + quantities + unit prices, tax breakdown by rate,
  totals, payment means, the CUFE, the numbering-resolution reference, and the "Documento validado por
  la Dian" marker.

---

## 12. Build checklist (software propio, condensed)

- [ ] UBL 2.1 XML builder (Invoice / CreditNote / DebitNote) with catálogos embedded
- [ ] CUFE (SHA-384, 15-field) + CUDE generators with exact formatting
- [ ] XAdES firma (política de firma) + WS-Security request signing
- [ ] Numbering-range store + enforcement (prod / test / contingencia)
- [ ] SOAP client for all methods (§7), habilitación + producción configs
- [ ] Validación-previa orchestration (send → parse ApplicationResponse → gate delivery)
- [ ] Contingencia queue + retry + flush
- [ ] RADIAN event senders (as required)
- [ ] Representación gráfica (PDF + QR)
- [ ] Container (ZIP) build/store of signed XML + DIAN validation response
- [ ] Pass the set de pruebas (2 FV + 1 ND + 1 NC) in habilitación → "Habilitado"

→ Next: [03-DOCUMENT-TYPES.md](03-DOCUMENT-TYPES.md)
