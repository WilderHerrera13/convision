---
name: "gsd-qa-explore"
description: "Exploración QA funcional + diseño con navegador (Convision) — hallazgos estructurados para agente corrector"
metadata:
  short-description: "Browser QA exploration (functional + UI/design) with structured FINDINGS output"
---

Siempre reinicia el golang antes de empezar las validaciones.

<codex_skill_adapter>
## A. Skill Invocation
- This skill is invoked by mentioning `$gsd-qa-explore`.
- Treat all user text after `$gsd-qa-explore` as `{{GSD_ARGS}}`.
- If no arguments are present, treat `{{GSD_ARGS}}` as empty.

## B. AskUserQuestion → request_user_input Mapping
GSD workflows use `AskUserQuestion` (Claude Code syntax). Translate to Codex `request_user_input`:

Parameter mapping:
- `header` → `header`
- `question` → `question`
- Options formatted as `"Label" — description` → `{label: "Label", description: "description"}`
- Generate `id` from header: lowercase, replace spaces with underscores

Batched calls:
- `AskUserQuestion([q1, q2])` → single `request_user_input` with multiple entries in `questions[]`

Multi-select workaround:
- Codex has no `multiSelect`. Use sequential single-selects, or present a numbered freeform list asking the user to enter comma-separated numbers.

Execute mode fallback:
- When `request_user_input` is rejected (Execute mode), present a plain-text numbered list and pick a reasonable default.

## C. Task() → spawn_agent Mapping
GSD workflows use `Task(...)` (Claude Code syntax). Translate to Codex collaboration tools:

Direct mapping:
- `Task(subagent_type="X", prompt="Y")` → `spawn_agent(agent_type="X", message="Y")`
- `Task(model="...")` → omit (Codex uses per-role config, not inline model selection)
- `fork_context: false` by default — GSD agents load their own context via `<files_to_read>` blocks

Parallel fan-out:
- Spawn multiple agents → collect agent IDs → `wait(ids)` for all to complete

Result parsing:
- Look for structured markers in agent output: `CHECKPOINT`, `PLAN COMPLETE`, `SUMMARY`, etc.
- `close_agent(id)` after collecting results from each agent
</codex_skill_adapter>

<cursor_adapter>
## Cursor execution notes
- Browser tools available via MCP server `cursor-ide-browser`.
- Use `browser_navigate`, `browser_snapshot`, `browser_take_screenshot`, `browser_mouse_click_xy`, `browser_fill`, `browser_type`, `browser_console_messages`, `browser_network_requests`.
- After EVERY action that changes the page, call `browser_snapshot` before next action.
- For screenshot-based coordinate clicks: capture fresh viewport screenshot immediately before `browser_mouse_click_xy`.
- Sub-agents: use `Task(subagent_type="browser-use", ...)` or run inline if context allows.
- Lock/unlock workflow: call `browser_lock({action:"lock"})` AFTER `browser_navigate`, BEFORE interactions; call `browser_lock({action:"unlock"})` when done.
</cursor_adapter>

<objective>
Ejecutar exploración QA **en navegador** sobre Convision con dos dimensiones:

1. **Funcional:** login por rol, sidebar + rutas del mapa, red/consola — detectar errores, pantallas rotas, flujos bloqueados.
2. **UI/Diseño:** revisión visual de cada pantalla — detectar problemas de diseño (espaciado, alineación, colores, tipografía, responsividad), textos en idioma incorrecto (inglés u otro idioma donde debería ser español), copy inconsistente, labels confusos, íconos incorrectos, estados vacíos sin mensaje, y cualquier anomalía visual.

Producir un archivo **FINDINGS** listo para el agente corrector (regla `convision-qa-fixer` o `convision-qa-gap-fixer`).

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
Argumentos: `{{GSD_ARGS}}`
- Vacío → los tres roles estándar (admin, specialist, receptionist).
- Un rol → solo ese rol (`admin`, `specialist`, `receptionist`).
- `design` → foco en problemas UI/diseño, cubrir todos los roles.
- Texto extra → nota de alcance (priorizar módulos mencionados).
</context>

<ui_design_checklist>
En cada pantalla visitada, además de la revisión funcional, inspeccionar:

**Idioma y copy:**
- Textos en inglés donde debería ser español (labels, placeholders, botones, tooltips, mensajes de error, títulos de columnas, estados vacíos, toasts).
- Mezcla de idiomas en la misma pantalla.
- Terminología inconsistente entre pantallas del mismo módulo.
- Mayúsculas/minúsculas inconsistentes en etiquetas.

**Diseño visual:**
- Alineación rota (elementos desalineados, overflow visible, scroll horizontal inesperado).
- Espaciado inconsistente (padding/margin que difiere visualmente del resto de la app).
- Colores fuera del sistema de diseño (botones con colores incorrectos, fondos, bordes).
- Tipografía: tamaños de fuente inconsistentes, pesos incorrectos.
- Íconos: ausentes donde se esperan, incorrectos para la acción, cortados.
- Truncamiento de texto sin tooltip o con overflow.

**Estados de la UI:**
- Estados vacíos sin mensaje descriptivo (listas vacías que muestran solo una tabla sin filas y sin explicación).
- Loading states ausentes (pantalla en blanco mientras carga).
- Mensajes de error genéricos sin contexto accionable.
- Formularios sin validación visual.

**Responsividad / layout:**
- Elementos que se rompen en viewports normales de desktop.
- Sidebars/headers que se superponen al contenido.
- Modales o drawers que no se centran correctamente.

**Accesibilidad básica:**
- Botones sin texto ni aria-label visible.
- Campos de formulario sin label.
- Colores de texto con contraste muy bajo.
</ui_design_checklist>

<findings_categories>
Usar categoría adicional en cada hallazgo:
- `funcional` — error de comportamiento, ruta rota, API 4xx/5xx.
- `idioma` — texto en idioma incorrecto o mezcla de idiomas.
- `diseño` — problema visual: layout, colores, tipografía, espaciado.
- `copy` — texto confuso, inconsistente o incorrecto (no idioma, sino redacción).
- `ux` — flujo confuso, estado vacío sin mensaje, feedback ausente.
- `accesibilidad` — contraste, labels ausentes, navegación por teclado.
</findings_categories>

<process>
Ejecutar el workflow `qa-explore.md` de principio a fin, respetando prerequisitos, lectura obligatoria y plantilla de salida, con las siguientes extensiones:

1. En cada pantalla del recorrido: aplicar el `<ui_design_checklist>` además de la revisión funcional.
2. Capturar screenshot cuando se encuentre un problema visual (`browser_take_screenshot`) y referenciar en el hallazgo.
3. Clasificar cada hallazgo con una de las categorías de `<findings_categories>`.
4. Si `{{GSD_ARGS}}` contiene "design" o "diseño": priorizar la revisión UI sobre la cobertura de rutas; ir pantalla por pantalla más despacio.
5. Al finalizar: sección de resumen separada para hallazgos funcionales vs. hallazgos UI/diseño.
</process>
