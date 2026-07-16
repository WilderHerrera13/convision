# 00 — Bitácora (Logbook): Facturación Electrónica DIAN

> A chronological, decision-oriented record so this initiative can be resumed later with full
> context. If you're returning to this after weeks or months, **read this file top to bottom** —
> it tells you what we set out to do, what we decided, what we found, what's still uncertain, and
> the exact next step.

---

## 1. Objective

Add **DIAN electronic invoicing (facturación electrónica)** to Convision so the clinic can legally
issue tax documents in Colombia, covering both:

- **Optical retail** (gafas, monturas, lentes, lentes de contacto — mixed IVA treatment), and
- **Health services** (optometry/ophthalmology consultations — IVA-excluded, and possibly billed to EPS/insurers).

**Chosen path for this research:** **self-authorization as _software propio_** — Convision itself
becomes a DIAN-habilitado electronic biller connecting directly to DIAN web services, rather than
routing through a third-party *proveedor tecnológico*.

---

## 2. Scope confirmed with the requester (2026-07-03)

The requester (acting owner) answered scoping questions as follows:

| Question | Answer |
|---|---|
| Integration model | **Self-authorize with DIAN** (software propio) |
| Document types | **All:** Factura electrónica de venta, Documento equivalente POS, Salud (RIPS + FEV), Documento soporte / nómina |
| Business model | **Optometry health services + Retail product sales** |

Persona requested: **senior Colombian contador** with DIAN + tax-law expertise, translating
regulation into engineering requirements.

---

## 3. Decision log

### D-1 — Research the software-propio path (as requested), but flag build-vs-buy
- **Decision:** Answer the software-propio question in full.
- **Caveat raised:** As a matter of professional advice, a **proveedor tecnológico** is the lower-risk
  default for a clinic. Software propio means owning DIAN conformance **forever** (every Anexo Técnico
  version bump, RADIAN changes, and a *separate* MinSalud health platform).
- **Status:** OPEN — leadership must make the final build-vs-buy call before any code. See
  [05-IMPLEMENTATION-GUIDE.md § Build vs. buy].

### D-2 — Persist everything as a research dossier under `.planning/research/`
- **Decision:** Create `.planning/research/electronic-invoicing-dian/` with a logbook + reference docs,
  rather than leaving the findings only in chat.
- **Rationale:** This is a large, long-horizon initiative; context must survive session resets and
  team handoffs. This matches the project's GSD `.planning/` workflow (research → phase → plan).
- **Naming:** English directory/filenames per the repo's Golden Rule (English-only identifiers/paths);
  Spanish is kept only for domain terms and quoted regulation. The file is titled "Bitácora" per the
  requester's wording but named `00-LOGBOOK.md`.

### D-3 — Build to Resolución 000165 de 2023 + Anexo Técnico FEV v1.9
- **Decision:** Target the **current** framework: Res. 000165/2023, Anexo FEV **v1.9** (in force
  since 1 May 2024), read together with amending resolutions. Do **not** build to the older
  Res. 000042/2020 or SHA-1-era specs.
- **Status:** ✅ VERIFIED against DIAN normograma + official annex PDF.

### D-4 — Health sector targets Resolución 2275 de 2023 (not 1036 de 2022)
- **Decision:** If billing EPS/prepagadas/ARL, build the RIPS + FEV en salud flow to **Res. 2275/2023**
  and MinSalud's *mecanismo único de validación* (returns a **CUV**).
- **Note/conflict:** One source states 2275/2023 repeals 1036/2022; another (felcowiki) did not list
  repeals explicitly. Either way **2275 is the current consolidated health-sector resolution** — build
  to it. Flagged for reconfirmation.
- **Status:** 🟡 PLAUSIBLE — RE-CONFIRM exact derogations + RIPS JSON schema.

### D-5 — DISCOVERY: an in-progress implementation already exists (2026-07-03)
- **Finding:** During documentation we discovered a **dedicated microservice
  `convision-invoicing-api/`** already scaffolded at the repo root (Go 1.25, port 8002, own DB
  `convision_invoicing`), plus a `convision-api-golang/internal/invoicingclient` HTTP client and an
  `emitInvoiceAsync` hook in the Sale service. It was created **the same day** (2026-07-03).
- **Impact on decision D-1 (build vs. buy):** the code has **already chosen a hybrid, pluggable design**
  — `DIAN_TRANSMISSION_MODE` selects `direct` (software propio SOAP), `factus` (proveedor tecnológico
  REST), or `none` (contingency-only). So the architecture keeps *both* options open; the operational
  build-vs-buy choice becomes a **config flag + which integration to finish**, not a rewrite. This is a
  good decision and de-risks D-1.
- **Consequence:** this dossier is **not greenfield planning** — it is (a) the compliance/spec reference
  and (b) a state-of-the-build + gap register. See [06-CURRENT-BUILD-STATE.md].
- **Status:** ✅ recorded. The earlier "no code written yet" note is **superseded** by this entry.

---

## 4. Research method & timeline

| Date | Activity | Tool | Outcome |
|---|---|---|---|
| 2026-07-03 | Scoped the question with the requester | AskUserQuestion | 3 scoping answers (§2) |
| 2026-07-03 | Deep-research workflow launched (5 angles: framework, self-auth/cert, doc types-salud/POS, sector IVA, implementation) | `deep-research` workflow | Scope + 5 searches + 23 sources fetched + 107 claims extracted |
| 2026-07-03 | Run #1 aborted mid-verify | — | Background agents killed by a session interrupt; cache preserved |
| 2026-07-03 | Run #2 resumed from cache | Workflow resume | **8 findings verified** (3-0/2-0); verify phase then hit **session rate limit** (Bogotá) → 17 claims left unverified (errored, **not refuted**) |
| 2026-07-03 | Run #3 resumed (after account switch) | Workflow resume | 6 core claims re-verified with **verbatim quotes**; verify hit rate limit **again**; synthesis skipped |
| 2026-07-03 | Direct primary-source fetches to close gaps | WebFetch/WebSearch | Confirmed: habilitación steps + set de pruebas, IVA optical (Concepto 5341/2024), salud Res. 2275, Art. 476 optometría |
| 2026-07-03 | Documentation written | — | This dossier (files 00–06) |

**Key data locations (this session):**
- Workflow scripts/transcripts: `.../97aa2f81-.../subagents/workflows/wf_2de71d91-0a9/`
- Per-agent journal (all raw claims): `journal.jsonl` in that dir.
- Run outputs: `/private/tmp/claude-501/.../tasks/wvcs7s2zg.output` and `.../wkh8z8zoc.output`.
- Cached PDF (Conocimientos VP-FACE, binary): `.../tool-results/webfetch-1783092753504-7ptqmt.pdf`

---

## 5. What is VERIFIED vs. what still needs confirmation

### ✅ Verified (primary source, high confidence)
- Governing norm & annex versions (Res. 000165/2023; FEV v1.9; DEE v1.0). — [01]
- Validación previa model ("Documento validado por la Dian", electronic container). — [02]
- **CUFE algorithm** — SHA-384 over the exact 15-field string, with formatting rules. — [02]
- Firma digital required at generation, XAdES + política de firma (Art. 11 num. 14). — [02]
- Numbering: prefix ≤4 alphanumeric, from DIAN's numbering service (Art. 11 num. 4); ranges via MUISCA. — [02]
- SOAP surface: `IWcfDianCustomerServices` + method list; UBL 2.1. — [02]
- QR ≥2cm on every page + exact field list + validation URL. — [02]
- Habilitación **set de pruebas = 2 facturas + 1 nota débito + 1 nota crédito**. — [02]
- IVA optical: lenses excluded (90.01.30/40/50), **gafas completas + monturas taxed 19%** (Concepto 5341/2024). — [04]
- Health services excluded incl. **optometría explicitly** (Art. 476 num. 1). — [04]

### 🟡 Plausible — RE-CONFIRM before building
- Exact **XAdES profile** (EPES vs. BES, ETSI TS 101 903 version, cert-chain embedding, RSA-SHA256).
- Exact **current producción endpoint URLs / WSDLs** (test endpoint captured; prod to confirm).
- **Res. 2275/2023** exact derogations + **RIPS JSON schema** + CUV transmission sequence + current group deadlines.
- **5-UVT threshold** for documento equivalente POS (and the current-year UVT value).
- Whether an eventual **FEV v2.0** is on DIAN's roadmap.

### 🔵 Needs a contador's sign-off (not researched to completion)
- Full **retenciones** matrix (retefuente, ReteIVA, ReteICA) by buyer type + municipal ICA.
- Convision's own **responsabilidades tributarias** (per its RUT) driving which taxes/retentions apply.
- Whether the clinic actually **bills insurers** (decides if the whole salud/RIPS tier is in scope).

---

## 6. Known blockers encountered
- **DIAN research session rate limit** repeatedly cut the adversarial verification phase short
  (resets rolled from 1pm → 2:50pm Bogotá). The gaps above are due to this, **not** to any claim being
  refuted. To finish the automated verification, resume the workflow after the limit resets:
  ```
  Workflow({ scriptPath: ".../workflows/scripts/deep-research-wf_2de71d91-0a9.js",
             resumeFromRunId: "wf_2de71d91-0a9",
             args: "<the original research question — see 06-SOURCES-AND-VERIFICATION.md>" })
  ```
  (Cached agents replay instantly; only the failed verifiers + synthesis re-run. **Always pass `args`** —
  omitting it makes the script exit immediately.)

---

## 7. Next actions (resume here)

> The scaffold exists; the remaining work is the hard, compliance-critical 20%. Prioritized:

1. **[Eng — CHEAP, DO FIRST]** Harden the **CUFE**: (a) add a test that asserts the **exact DIAN
   published hash** for the official example vector (current test only checks length), and (b) confirm
   the middle tax code — code uses `02`, the verified DIAN spec is `01/04/03` (i.e. **`04` for INC**). — [06]
2. **[Eng — biggest technical item]** Replace the **firma** stub with real **XAdES-EPES** (C14N +
   SignaturePolicyIdentifier for DIAN's política de firma), and add **WS-Security** signing to the SOAP
   requests. Until then `direct` mode will be rejected by DIAN. — [02][06]
3. **[Eng]** Fix the **monolith IVA classification** (`ivaTreatmentForItem` returns "excluido" for
   everything) → drive per-SKU treatment from the catalog (gafas/monturas = gravado_19). — [04][06]
4. **[Eng]** Add a **contingency background worker** to auto-flush the queue (currently manual retry only). — [06]
5. **[Leadership]** Confirm the operational **build-vs-buy** stance: finish `direct` (software propio) or
   run on `factus` (proveedor tecnológico) now and finish `direct` later. Both are wired. — [05]
6. **[Business]** Confirm whether Convision **bills EPS/prepagadas/ARL** → decides if the salud/RIPS
   tier (a second MinSalud integration, **not yet built**) is in scope. — [03][04]
7. **[Contador]** Produce the definitive **IVA + retenciones matrix** per SKU/service and per buyer type. — [04]
8. **[Eng, if software propio]** Register the NIT in DIAN, obtain the firma cert + software ID/PIN, and
   pass the **set de pruebas** (2 FV + 1 ND + 1 NC) in habilitación. — [02]

---

## 8. Change log for this dossier
- **2026-07-03** — Dossier created (files 00–06) from deep-research runs + direct primary-source fetches.
  Verification partially blocked by rate limits; documented as 🟡 where applicable.
