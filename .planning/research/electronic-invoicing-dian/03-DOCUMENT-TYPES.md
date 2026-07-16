# 03 — Document Types to Implement

> Each DIAN document Convision may need to issue, with priority for an optical clinic. Not everything
> is needed at once — build in the order under "Suggested phasing" at the end.

Confidence legend: ✅ verified · 🟡 re-confirm · 🔵 accountant's knowledge · ⚠️ pitfall/open.

---

## 1. Factura Electrónica de Venta (FEV) — CORE, build first

- **✅ The baseline mandatory document** for every sale of goods/services.
- UBL `Invoice`; carries **CUFE**; full validación-previa flow (see [02-TECHNICAL-SPEC.md]).
- This is where the **optical vs. health IVA mapping** lives (see [04-TAX-IVA-OPTICAL.md]).

## 2. Notas Crédito / Notas Débito — CORE, build with FEV

- **✅ Nota Crédito** — reduces/annuls a prior FEV (returns, discounts, corrections, cancellations).
  UBL `CreditNote`; carries **CUDE**; must **reference the original invoice's CUFE**.
- **✅ Nota Débito** — increases the value of a prior FEV (additional charges, interest).
  UBL `DebitNote`; carries **CUDE**.
- **⚠️** You cannot "edit" a validated FEV. Corrections happen **only** via NC/ND — so these are not
  optional; they're part of the core issuance loop.

---

## 3. Documento Equivalente Electrónico — POS ticket (tiquete de máquina registradora)

- **🟡** The **tiquete POS** is a *documento equivalente*, now migrating to **electronic** form under the
  **Anexo Técnico de Documento Equivalente Electrónico v1.0** (adopted by Res. 000165/2023).
- **🔵/⚠️ The 5-UVT rule:** a POS ticket is valid only for low-value retail sales. When a single sale
  **exceeds ~5 UVT**, the buyer can (and for tax-credit purposes will) **require a full factura
  electrónica de venta** instead of a POS ticket.
  - UVT reference: **UVT 2025 = COP $49.799** → 5 UVT ≈ **$248.995**. **⚠️ Confirm the current-year UVT**
    (it is re-set annually) before hard-coding the threshold.
  - **Implication for Convision:** most optical sales (gafas, lentes) **exceed 5 UVT**, so the clinic
    will predominantly issue **full facturas**, not POS tickets. POS-equivalente is likely a **lower
    priority** than FEV for this business — validate against actual ticket sizes.
- **🟡** The documento equivalente electrónico also goes through DIAN validation (its own CUDE + annex).

---

## 4. Health sector — FEV en salud + RIPS + CUV (only if billing EPS/insurers)

**🟡 Governing rule: Resolución 2275 de 2023 (MinSalud).** This is the biggest single scope decision —
it roughly **doubles** the integration surface.

### 4.1 The two-tier validation
```
Build FEV en salud XML (UBL + health fields)  +  build RIPS (JSON)
        │
        ├─ (1) Transmit FEV XML → DIAN → validates → CUFE/CUDE + "Documento validado por la Dian"
        │
        └─ (2) Transmit DIAN-validated FEV + RIPS JSON → MinSalud "mecanismo único de validación"
                     → returns Código Único de Validación (CUV)
```
- **✅/🟡** Only after **both** validations is the health invoice complete; the **CUV** must accompany the
  radicación (submission) to the payer.
- **🟡 RIPS is now JSON** (not the old XML/TXT), per Res. 2275.

### 4.2 The four billing scenarios (build the ones you use)
| Scenario | RIPS? | When |
|---|---|---|
| **SS-Recaudo** | No | Co-pagos / cuotas moderadoras collected from the patient |
| **SS-CUFE / CUDE / POS / SNum** | Yes | References a prior document (uses `PrepaidPayment` node) |
| **SS-Reporte** | Yes | Direct EPS payment reporting |
| **SS-SinAporte** | Optional | Direct patient billing / independent providers |

### 4.3 Health-specific data (the ~11 extra fields)
- **🟡** provider code, payment modality, coverage/plan, contract/policy numbers, co-pagos, deductibles,
  shared payments, advances, and billing-period timestamps (`AA-MM-DD HH-MM-SS`).
- **🟡 Source of truth:** MinSalud states the **historia clínica y sus documentos son la fuente primaria
  del dato** for generating RIPS + FEV en salud — i.e., Convision's clinical records feed the RIPS.

### 4.4 Timeline (already in force)
- **🟡** Phased by **Res. 1884 de 2024**: Group 1 (alta complejidad) **1 Feb 2025**, Group 2 (mediana)
  **1 Abr 2025**, Group 3 (baja complejidad / independientes) **1 Jun 2025**. An optical clinic is most
  likely **Group 3** — already obligated if it bills the health system.

### 4.5 Tooling MinSalud offers
- **🟡** A **Client/Server** validator and an **API/Docker** validator (both v1.3.0) that run the RIPS
  validation modules; input is **XML AttachedDocument + JSON RIPS in the same folder, uncompressed**.
  A software-propio build would integrate the **API/Docker** option or replicate its calls.

> **⚠️ SCOPE GATE.** If Convision **only sells retail to end patients and does not invoice
> EPS/prepagadas/ARL**, this entire section is **out of scope** — a huge reduction. **Confirm the actual
> billing model first** (see [00-LOGBOOK.md § Next actions]).

---

## 5. Documento Soporte en adquisiciones a no obligados a facturar

- **🔵** When Convision **buys** goods/services from a supplier **not obligated to invoice** (e.g., an
  informal provider), the clinic must generate a **documento soporte electrónico** to support the
  deductible expense/cost.
- Has its own **CUDS** (código único) and annex. **🟡**
- **Priority:** needed for the clinic's **purchasing/expenses** side, not the sales counter. Build
  **after** the sales documents unless procurement compliance is urgent.

---

## 6. Nómina Electrónica (Documento Soporte de Pago de Nómina)

- **🔵 Resolución DIAN 000013 de 2021** governs *nómina electrónica* — the payroll support document.
- Independent of sales invoicing (payroll, not the POS). Typically handled by the **payroll/HR system
  or an accountant**, not the clinic's sales module.
- **Priority:** **lowest** for this initiative unless Convision also owns payroll. Often satisfied by
  the accounting provider rather than built in-house. Flag as a separate track.

---

## 7. Suggested phasing (by priority for an optical clinic)

| Phase | Documents | Rationale |
|---|---|---|
| **P1 (MVP)** | FEV + Nota Crédito + Nota Débito, habilitación, contingencia | Legally issue and correct sales — the non-negotiable core |
| **P2** | Documento equivalente POS (if ticket sizes warrant) | Only if many sales fall under 5 UVT |
| **P3** | FEV en salud + RIPS + CUV (**only if billing insurers**) | Second, MinSalud integration; large effort |
| **P4** | Documento soporte (purchases) | Expense-side compliance |
| **P5** | Nómina electrónica | Usually a separate/accounting track |

→ Next: [04-TAX-IVA-OPTICAL.md](04-TAX-IVA-OPTICAL.md)
