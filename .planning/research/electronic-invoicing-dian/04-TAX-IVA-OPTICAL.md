# 04 — Sector Tax Rules: IVA on Optical Goods & Health Services

> The tax logic that makes an optical clinic's invoicing *correct*, not just *valid*. Getting this
> wrong is the most common and most audited error for opticas. **This section needs a practicing
> contador's final sign-off** — it is researched but tax application is fact-specific.

Confidence legend: ✅ verified · 🟡 re-confirm · 🔵 accountant's knowledge · ⚠️ pitfall/open.

---

## 1. The core trap (read this first)

An optical clinic sells three tax-distinct things, and they **do not share** one tax treatment:

1. **Bare optical lenses** → **excluido de IVA** (no IVA). ✅
2. **Complete/assembled eyeglasses (gafas oftalmológicas) and frames (monturas)** → **gravado 19%**. ✅
3. **Optometry / eye-health services (consulta)** → **excluido de IVA** (as a health service). ✅

> **⚠️ You cannot flag "optical product = excluido."** The moment a lens becomes a **dispensed pair of
> prescription eyeglasses**, DIAN treats it as a **taxed** good. Tax classification must be **per SKU /
> per line item**, not per category.

---

## 2. Goods — IVA per Estatuto Tributario Art. 424 + Concepto DIAN 5341/2024

**✅ Source: Concepto DIAN 005341 (int 627) de 2024** — 31 Jul 2024, published 6 Aug 2024. Verbatim:

> *"Las gafas oftalmológicas no están excluidas del impuesto sobre las ventas (IVA), en los términos
> del artículo 424 del Estatuto Tributario."*
>
> *"Este tratamiento no se hace extensivo a bienes como las gafas de cualquier tipo denominadas
> monturas … las cuales se encuentran gravadas con el impuesto sobre las ventas a la tarifa general."*

| Item | IVA treatment | Subpartida arancelaria | Basis |
|---|---|---|---|
| **Lentes de contacto** | ✅ **Excluido** | 90.01.30.00.00 | Art. 424 E.T. |
| **Lentes de vidrio para gafas** | ✅ **Excluido** | 90.01.40.00.00 | Art. 424 E.T. |
| **Lentes de otras materias para gafas** | ✅ **Excluido** | 90.01.50.00.00 | Art. 424 E.T. |
| **Artículos ortopédicos** (correctly classified) | ✅ **Excluido** | partida 90.21 | Art. 424 E.T. |
| **Gafas oftalmológicas (completas/armadas)** | ✅ **Gravado 19%** | — | Concepto 5341/2024 |
| **Monturas (frames)** | ✅ **Gravado 19%** | — | Concepto 5341/2024 |
| Accessories (estuches, líquidos, cadenas, etc.) | 🔵 **Gravado 19%** (general rule) | — | confirm per SKU |

> **🔵 Practical rule for the catalog:** only the **bare lens as a standalone product** rides the
> exclusion. A sale that assembles lens + montura into *gafas* is a **taxed** good. If you sell the lens
> separately (patient brings their own frame), that lens line can be excluido — **document the SKU
> boundary with the contador**.

---

## 3. Services — IVA per Estatuto Tributario Art. 476 num. 1

**✅ Health services are excluidos de IVA**, and this **explicitly includes optometría**:

- **Art. 476 num. 1 E.T.** excludes *servicios médicos, odontológicos, hospitalarios, clínicos y de
  laboratorio para la salud humana*.
- **✅ Doctrine (DIAN + jurisprudence):** the exclusion covers health services **even when not rendered
  by a médico** — **optometría, fonoaudiología y fisioterapia are named examples**. The test is whether
  the service is *aimed at caring for human health*, regardless of who provides it or the source of
  funds.
- **⚠️ Limit:** services by health professionals that are **not** health-directed (e.g., corporate
  training, industrial selection) are **not** excluded.

**→ For Convision:** the **consulta de optometría / examen visual** is **excluido de IVA**. The invoice
line still exists (the service must be invoiced) but carries **no IVA**.

---

## 4. Mapping to invoice line items (engineering rule)

Each product/service in the catalog needs an explicit **tax classification** that the invoice builder
maps into the UBL `TaxTotal` / `TaxSubtotal`:

| Classification | UBL / CUFE effect | Example Convision items |
|---|---|---|
| **Gravado 19%** | IVA line at 19%; contributes to `ValImp1` (CodImp `01`) | gafas completas, monturas, accesorios |
| **Excluido** | No IVA; line flagged excluido (tax scheme, 0 amount, exclusion reason) | consulta optometría, lente de contacto, lente suelto |
| **Exento (0%)** | 🔵 rare for optics; IVA at 0% with right to devolución — likely N/A | — |

> **⚠️ Excluido ≠ Exento ≠ 0%.** They are legally different (exento gives IVA-credit rights; excluido
> does not). Model them as distinct enum values, not a single "no IVA" flag. Confirm exact UBL tax
> scheme codes for each from the Anexo Técnico catálogos.

---

## 5. Retenciones (withholdings) — depends on the buyer, needs contador

**🔵 Not fully researched — must be validated with the contador.** Applicability is **buyer- and
context-dependent**, not a fixed per-product value:

| Withholding | When it typically applies | Modeling note |
|---|---|---|
| **Retención en la fuente (renta)** | Buyer is an *agente retenedor* (many companies, gran contribuyente) buying from Convision | Rate depends on concept (compras vs. servicios) |
| **ReteIVA** | Buyer is a *responsable de IVA* + retenedor, on the IVA portion of gravado lines | % of the IVA amount |
| **ReteICA** | Municipal; depends on the city and the activity code (CIIU) | Rate set by each municipio |

- **🔵** For **retail sales to end consumers/patients** (the common case), **these retentions usually do
  NOT apply** — they mainly arise on **B2B / insurer** invoices.
- **🔵** Convision's own **RUT responsabilidades** determine whether the clinic is itself an
  autorretenedor or subject to particular regimes. **Pull the actual RUT and map it with the contador.**

---

## 6. What to hand the contador (checklist)

- [ ] SKU-level tax classification for the **entire optical catalog** (gravado / excluido / exento).
- [ ] Confirm the **lens-vs-assembled-gafas** boundary and how mixed sales are itemized.
- [ ] Confirm **optometría** and any other health services as excluido, and any that are **not**.
- [ ] The **retenciones matrix** by buyer type (consumidor final, empresa, EPS/insurer, gran contribuyente).
- [ ] Convision's **RUT responsabilidades** → self-withholding + regime.
- [ ] Current-year **UVT** value (for the POS 5-UVT threshold) and any minimum-thresholds for retentions.
- [ ] Municipal **ICA** rate(s) for the clinic's location(s) and activity code.

→ Next: [05-IMPLEMENTATION-GUIDE.md](05-IMPLEMENTATION-GUIDE.md)
