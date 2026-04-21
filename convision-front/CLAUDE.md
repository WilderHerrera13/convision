# Convision Front — AI Instructions (shadcn / shadcn-studio)

This file is read automatically by Claude Code when working inside `convision-front/`.
It complements the root `CLAUDE.md` and the `pixel-figma-*` rules.

## Stack

- Vite + React 18 + TypeScript (NOT Next.js).
- Tailwind CSS with `cssVariables: true`, base color `slate`, prefix none.
- shadcn/ui v3 CLI with Pro registries from shadcn/studio.
- Aliases: `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, `@/hooks`.
- All UI strings in **Spanish**.

## shadcn / shadcn-studio install rules

Registries declared in `components.json`:

| Registry prefix    | What it installs                              |
| ------------------ | --------------------------------------------- |
| (none, default)    | Free shadcn/ui primitives (`button`, `card`…) |
| `@ss-components/`  | shadcn-studio Pro components                  |
| `@ss-themes/`      | shadcn-studio Pro themes                      |
| `@ss-blocks/`      | shadcn-studio Pro blocks (full sections)      |

Install commands (run from `convision-front/`):

```bash
npx shadcn@latest add button                       # free primitive
npx shadcn@latest add @ss-components/<name>        # Pro component
npx shadcn@latest add @ss-blocks/<name>            # Pro block
npx shadcn@latest add @ss-themes/<name>            # Pro theme
```

Credentials live in `convision-front/.env` (`EMAIL`, `LICENSE_KEY`) and are
substituted into the registry URLs by the shadcn CLI v3. **Never** echo, log,
or commit these values, and never pass them as CLI flags.

## Slash commands available

- `/ftc` — Figma → Code completo (Pixel ejecutor auto-contenido). Verifica MCPs, lee el frame con pila completa (`get_metadata` → `get_design_context` → `get_variable_defs`), ancla en DS `33:2`, identifica bloques Pro/Free, los instala via CLI, compone la página, corre lint, El Crítico y entrega handoff para auditor.
- `/pixel-figma-read` — Lectura experta de Figma sin editar. Pila completa MCP + anclaje `33:2` + recomendación de implementación.
- `/pixel-figma-review` — Pipeline ejecutor + auditor en un solo comando. Fase A: diseña/ajusta en Figma. Fase B: audita con MCP y emite veredicto `APROBADO / RECHAZADO`.
- `/pixel-figma-audit` — Solo la fase de auditor. Recibe el handoff del ejecutor, valida en Figma con MCP, emite veredicto con hallazgos P0/P1/P2 y correcciones ordenadas.
- `/pixel-figma-component-qa` — QA fino de un nodo: detecta solapes, spacing, tipografía, tokens incorrectos. No edita Figma; entrega hallazgos para que el ejecutor corrija.
- `/cui`, `/iui`, `/rui` — only available when the **shadcn-studio MCP server**
  is connected. If only the generic `shadcn` MCP is connected, fall back to
  manual `shadcn add` flow.

## Code quality rules (project-specific)

1. No comments in generated code (project convention).
2. Components ≤ 200 lines; split into subcomponents otherwise.
3. Use the existing primitives in `src/components/ui/` before installing duplicates.
4. Reuse design tokens from the Figma DS (file `dHBbcAQTlUSXGKnP6l76OS`,
   node `33:2`) — never hardcode `bg-blue-500` on a primary CTA.
   Apply role-based primary buttons (Recepción / Especialista / Admin) per
   the `pixel-figma-design-agent` rule.
5. Use `<img>` (NOT `next/image`). Vite-style imports for assets.
6. Run `npm run lint` after generation and report leftovers — do not commit
   until the user confirms the visual result.

## Hard guardrails for `/ftc`

- Verify Figma MCP is reachable (`mcp__figma__get_metadata`) before anything.
- Never rename Pro/Free block instances in Figma — match-by-name is exact.
- If the user has heavily customized a block in Figma, prefer the manual
  Figma-MCP-only flow (per shadcn-studio docs) instead of `/ftc`.
- Always read DS node `33:2` first when the target file is the Convision DS.
