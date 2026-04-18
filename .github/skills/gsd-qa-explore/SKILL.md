---
name: gsd-qa-explore
description: Exploración QA funcional con navegador (Convision) — hallazgos estructurados para agente corrector
argument-hint: "[admin|specialist|receptionist] [nota de alcance opcional]"
allowed-tools: Read, Bash, AskUserQuestion, Task
---

<objective>
Ejecutar exploración QA **en navegador** sobre Convision (login por rol, sidebar + rutas del mapa), documentar fallos/gaps con evidencia y producir un archivo **FINDINGS** listo para el agente corrector (regla `convision-qa-fixer`).

No sustituye `/gsd-verify-work`: ese flujo es UAT conversacional por fase; este es smoke/exploración autónoma con MCP de navegador.
</objective>

<test_users>
Contraseña común (seed local): **`password`**. Canónico: `docs/CREDENCIALES_PRUEBA_ROLES.md`.

**Genéricos (`UsersTableSeeder`):** `admin@convision.com`, `specialist@convision.com`, `receptionist@convision.com`.

**Demo (`DemoStaffSeeder`):** `cvargas@convision.com` (admin); `abermudez@convision.com`, `storres@convision.com`, `dmontoya@convision.com` (specialist); `vcastillo@convision.com`, `jnieto@convision.com` (receptionist); `hquintero@convision.com` (laboratory — el front puede mandar a `/unauthorized`).

**API JWT:** `POST http://localhost:8000/api/v1/auth/login` body `{"email":"…","password":"password"}`.
</test_users>

<execution_context>
@/Users/wilderherrera/Desktop/convision/.codex/get-shit-done/workflows/qa-explore.md
@/Users/wilderherrera/Desktop/convision/docs/QA_MAPA_EXPLORACION.md
@/Users/wilderherrera/Desktop/convision/docs/CREDENCIALES_PRUEBA_ROLES.md
@/Users/wilderherrera/Desktop/convision/.cursor/rules/convision-qa-explorer.mdc
@/Users/wilderherrera/Desktop/convision/.codex/get-shit-done/templates/QA-FINDINGS.md
</execution_context>

<context>
Argumentos: $ARGUMENTS
- Vacío → los tres roles estándar (admin, specialist, receptionist).
- Un rol → solo ese rol (`admin`, `specialist`, `receptionist`).
- Texto extra → nota de alcance (priorizar módulos mencionados).
</context>

<process>
Ejecutar el workflow `qa-explore.md` de principio a fin, respetando prerequisitos, lectura obligatoria y plantilla de salida.
</process>
