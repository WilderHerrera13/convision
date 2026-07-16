# 01 — Regulatory Framework & Legal Basis

> The legal scaffolding you must build to. Read this to understand *why* the technical requirements
> in [02-TECHNICAL-SPEC.md](02-TECHNICAL-SPEC.md) exist and which norm to cite when a rule is questioned.

Confidence legend: ✅ verified · 🟡 re-confirm · 🔵 accountant's knowledge · ⚠️ pitfall/open.

---

## 1. The governing regulation

**✅ Resolución DIAN 000165 del 1 de noviembre de 2023** is the current governing regulation for the
*Sistema de Facturación Electrónica* in Colombia.

- Published in **Diario Oficial 52.567 (2 Nov 2023)**.
- It **replaced Resolución 000042 de 2020** (the previous consolidated rule).
- It adopts, as **"parte integral de la presente resolución"** (i.e., legally binding, same force as the
  articles themselves), the two technical annexes below.

### Binding technical annexes

| Annex | Version | In force since | Governs |
|---|---|---|---|
| **✅ Anexo Técnico de Factura Electrónica de Venta** | **v1.9** (753 pp.) | **1 May 2024** | XML/UBL structure, CUFE/CUDE, firma, QR, web services, set de pruebas |
| **🟡 Anexo Técnico de Documento Equivalente Electrónico** | **v1.0** | per Res. 000165 | Migration of POS tickets & other documentos equivalentes to electronic form |

> **⚠️ Version discipline.** Build to **FEV v1.9**. Ignore anything referencing SHA-1, the 2019 pilot,
> or Res. 000042/2020 — those are superseded. No FEV v2.0 was published as of this research (2026);
> re-confirm on DIAN's *documentación técnica* page before build, since a version bump forces rework.

---

## 2. Amending resolutions (read 000165 *as amended*)

**✅ Res. 000165/2023 has been amended but NOT replaced** by a series of later resolutions. They changed
articles, deadlines, and scope — **not** the core technical annex (CUFE, UBL, firma remain stable):

| Resolution | Note |
|---|---|
| Res. **000008 de 2024** | Amendment to 000165 |
| Res. **000119 de 2024** | Amendment to 000165 |
| Res. **000189 de 2024** | Amendment to 000165 |
| Res. **000202 de 31 de marzo de 2025** | Most recent amendment captured; partial modification of 000165 |
| Res. **000227 de 2025** | Amendment to 000165 |

> **⚠️ Implementation note.** Always work from the **consolidated text** (000165 + all amendments), not
> from 000165 alone. The DIAN *normograma* compiled version is the authoritative merged text — see
> [06-SOURCES-AND-VERIFICATION.md](06-SOURCES-AND-VERIFICATION.md).

---

## 3. The legal chain (top to bottom)

```
Ley / Estatuto Tributario
   └─ Art. 616-1 E.T.  → mandates the sistema de facturación + the "validación previa" model
   └─ Art. 617 / 618   → mandatory content of an invoice; buyer's duty to demand it
   └─ Art. 615         → duty to invoice
        └─ Decreto 1625 de 2016 (Decreto Único Reglamentario en materia tributaria)
             └─ Resolución DIAN 000165 de 2023  → operationalizes the system
                  └─ Anexo Técnico FEV v1.9      → the machine-level spec you implement
```

- **🔵 Art. 616-1 E.T.** is the statutory anchor: it establishes that electronic invoicing operates
  under **validación previa** (DIAN validates before the document is validly issued).
- **🔵 Art. 617/618 E.T.** define the mandatory human-readable content (issuer/acquirer identity,
  numbering, date, description, tax breakdown, etc.) that the *representación gráfica* must show.

---

## 4. Who is obligated to invoice electronically

- **🔵 Rule of thumb:** essentially all *responsables de IVA*, *responsables del impuesto al consumo*,
  and formally-constituted businesses/professionals that sell goods or services must issue **factura
  electrónica de venta**. The universe of obligated parties has been progressively expanded until it is
  effectively near-universal for formal commerce.
- **🔵 Convision's clinics** — selling optical goods (gravados/excluidos) **and** health services — are
  squarely **obligated**. There is no realistic "we don't have to invoice electronically" exit.
- **🔵 Remaining exceptions** (narrow, and to confirm against the current consolidated text): certain
  *no responsables de IVA* / very small operators under specific thresholds, some public/simplified
  regimes, and specific enumerated activities. **These almost certainly do not apply to Convision** and
  should not shape the build.

> **⚠️ Even IVA-excluded sales must be invoiced.** "Excluido de IVA" (e.g., an optometry consultation
> or a bare lens) means **no IVA is charged on the line** — it does **not** mean "no invoice." The
> factura electrónica is still mandatory; the line simply carries a 0% / excluido tax classification.
> This is the single most common conceptual error for health-adjacent businesses.

---

## 5. Health-sector overlay (only if billing insurers)

- **🟡 Resolución 2275 de 2023 (MinSalud, 28 Dic 2023)** is the current consolidated rule for
  **RIPS as mandatory support of the Factura Electrónica de Venta en salud (FEV en salud)**.
- It introduces a **second, health-specific validation** on top of DIAN's (see
  [03-DOCUMENT-TYPES.md § Health sector](03-DOCUMENT-TYPES.md)).
- Phased obligation dates were set/modified by **Res. 1884 de 2024**: Group 1 (alta complejidad)
  1 Feb 2025 · Group 2 (mediana) 1 Abr 2025 · Group 3 (baja/independientes) 1 Jun 2025. 🟡
- **The original brief mentioned Res. 1036 de 2022** — that is the *older* rule; **build to 2275/2023**.

---

## 6. Why the model shapes the whole architecture — "validación previa"

**✅ Colombia is a pre-validation (validación previa) country.** The sequence is legally fixed:

```
generate → sign → transmit to DIAN → DIAN validates → THEN deliver to buyer
```

The invoice is **not validly *expedida*** until DIAN returns its validation document containing the
literal value **"Documento validado por la Dian"** (Res. 000165, Art. 11 numeral 7). Both the signed
XML and DIAN's validation response travel together inside an **electronic container (ZIP)**.

**Consequence for engineering:** you cannot "issue then sync later" as the happy path. The DIAN round
trip is on the critical path of completing a sale — which is exactly why a robust **contingencia** mode
is legally provided and operationally essential (see [02-TECHNICAL-SPEC.md § Contingencia]).

---

## 7. Quick-reference: norms to cite

| Topic | Cite |
|---|---|
| System, obligation, validación previa | Art. 616-1 E.T. |
| Invoice mandatory content | Arts. 617 / 618 E.T. |
| Duty to invoice | Art. 615 E.T. |
| Operational rules + annexes | Resolución DIAN 000165 de 2023 (as amended) |
| Machine spec | Anexo Técnico FEV v1.9 |
| IVA-excluded goods (lenses) | Art. 424 E.T. |
| IVA-excluded services (health, incl. optometría) | Art. 476 num. 1 E.T. |
| Optical goods IVA doctrine | Concepto DIAN 005341 (int 627) de 2024 |
| Health FEV + RIPS | Resolución 2275 de 2023 (MinSalud); Res. 1884 de 2024 (deadlines) |
| Nómina electrónica | Resolución DIAN 000013 de 2021 |

→ Next: [02-TECHNICAL-SPEC.md](02-TECHNICAL-SPEC.md)
