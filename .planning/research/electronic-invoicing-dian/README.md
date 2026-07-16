# Facturación Electrónica DIAN — Research & Implementation Dossier

> **Purpose of this folder.** A self-contained, durable record of everything needed to implement
> DIAN electronic invoicing (*facturación electrónica*) in **Convision** as **software propio**
> (self-authorized biller), so the work can be picked up in the future with full context —
> without re-doing the research from scratch.
>
> **Audience.** The Convision engineering team (Go + React + PostgreSQL) plus whoever owns the
> accounting/tax sign-off (a Colombian *contador*).
>
> **Status as of 2026-07-03:** RESEARCH COMPLETE **and an in-progress implementation already exists.**
> A dedicated microservice **`convision-invoicing-api/`** (Go, port 8002) is scaffolded with a
> pluggable transmitter (software propio SOAP · Factus provider · contingency-only), CUFE, UBL builder,
> numbering, and contingency queue — and the main API already calls it best-effort after each sale.
> Several pieces are **explicitly stubbed or likely buggy** (firma XAdES, SOAP WS-Security, CUFE tax
> codes, monolith IVA classification). See [06-CURRENT-BUILD-STATE.md](06-CURRENT-BUILD-STATE.md).

---

## How to use this folder

Read in this order:

| # | File | What it answers |
|---|------|-----------------|
| 0 | [00-LOGBOOK.md](00-LOGBOOK.md) | **Bitácora** — why we're doing this, what was decided, how the research was done, what's verified vs. pending, and exactly where to resume. **Read this first.** |
| 1 | [01-REGULATORY-FRAMEWORK.md](01-REGULATORY-FRAMEWORK.md) | The legal basis: which DIAN resolutions/laws govern, who is obligated, effective dates. |
| 2 | [02-TECHNICAL-SPEC.md](02-TECHNICAL-SPEC.md) | The build spec: habilitación process, UBL 2.1, CUFE/CUDE algorithm, firma digital XAdES, numbering, validación previa, SOAP web services, QR, contingencia. |
| 3 | [03-DOCUMENT-TYPES.md](03-DOCUMENT-TYPES.md) | Each document to support: FEV, notas crédito/débito, documento equivalente POS, FEV en salud + RIPS/CUV, documento soporte, nómina electrónica. |
| 4 | [04-TAX-IVA-OPTICAL.md](04-TAX-IVA-OPTICAL.md) | Sector tax rules: IVA on optical goods vs. health services, and how to map them to invoice line items + retenciones. |
| 5 | [05-IMPLEMENTATION-GUIDE.md](05-IMPLEMENTATION-GUIDE.md) | The as-built architecture (the `convision-invoicing-api` service + how the monolith calls it), data model, phased roadmap, effort, pitfalls. |
| 6 | [06-CURRENT-BUILD-STATE.md](06-CURRENT-BUILD-STATE.md) | **What's already coded vs. stubbed vs. buggy** — file-by-file inventory + a prioritized gap/bug register. Read before touching code. |
| 7 | [07-SOURCES-AND-VERIFICATION.md](07-SOURCES-AND-VERIFICATION.md) | Every claim with its confidence level and primary source URL. The audit trail. |

---

## The one decision to make before writing any code

**Self-authorization ("software propio") vs. integrating a proveedor tecnológico.**

- You asked us to research **software propio** — this dossier answers that fully.
- But the professional recommendation is to **seriously weigh a proveedor tecnológico first**
  (Facture, Carvajal, The Factory HKA, Siigo, Alegra, etc.). The *build* is a one-time cost;
  *conformance* (every new Anexo Técnico version, RADIAN changes, the separate MinSalud health
  platform) is a permanent obligation you'd own forever.
- See [00-LOGBOOK.md § Decision log](00-LOGBOOK.md) and
  [05-IMPLEMENTATION-GUIDE.md § Build vs. buy](05-IMPLEMENTATION-GUIDE.md) for the full trade-off.

---

## Confidence legend (used throughout)

- ✅ **VERIFIED** — confirmed against a primary DIAN/MinSalud source (or adversarially fact-checked).
- 🟡 **PLAUSIBLE — RE-CONFIRM** — from a primary source but not independently double-checked; treat as strong lead, verify before building.
- 🔵 **ACCOUNTANT'S KNOWLEDGE** — domain input, not from this research run; validate with your contador.
- ⚠️ **PITFALL / OPEN QUESTION** — a known trap or an unresolved question.

---

## TL;DR for a returning reader

1. Governing norm: **Resolución DIAN 000165 de 2023** + **Anexo Técnico FEV v1.9** (in force since 1 May 2024). ✅
2. Path chosen for research: **software propio** under the **validación previa** model — **but the code
   already supports both** software propio (`direct`) and a proveedor tecnológico (`factus`). ✅
3. **A real service exists** (`convision-invoicing-api`, port 8002) with CUFE, UBL, numbering, contingency,
   and a pluggable transmitter; the monolith calls it after each sale. See [06](06-CURRENT-BUILD-STATE.md).
4. Hardest **remaining** items (currently stubbed/buggy): **firma XAdES-EPES** (skeleton only), **SOAP
   WS-Security** (missing), **CUFE tax codes + unasserted test**, **monolith IVA classification** (all "excluido"). ⚠️
5. Optical tax trap: bare **lentes are IVA-excluded**, but **gafas completas + monturas are taxed 19%**; **optometría services are excluded**. ✅
6. If you bill EPS/insurers: a **second integration to MinSalud** (RIPS JSON → CUV) under **Res. 2275/2023** — **not built yet**. 🟡
7. Realistic effort to finish: see [05](05-IMPLEMENTATION-GUIDE.md); the skeleton exists, the hard 20% (firma/SOAP-auth/certification) remains.
8. Where to resume: [00-LOGBOOK.md § Next actions](00-LOGBOOK.md).
