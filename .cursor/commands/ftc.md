# /ftc — shadcn/studio Figma to Code
Per [shadcn/studio MCP docs](https://shadcnstudio.com/docs/getting-started/shadcn-studio-mcp-server): call the **shadcn-studio** MCP tool **`get-ftc-instructions`** first and **follow every step** (Figma MCP + block install + page build).
**Figma MCP** must be enabled; keep Pro/Free block **instance names unchanged** in Figma.
Project: **`convision-front`** (Vite + React — use `<img>` / project patterns, not `next/image`).

**Convision (DS + tokens en Figma):** combine with **`@pixel-figma-design-agent`** — read **`33:2`** (`fileKey` `dHBbcAQTlUSXGKnP6l76OS`) via Figma MCP (`get_metadata` / `get_design_context` / **`get_variable_defs`**) so implementation matches the design system; primary buttons by role (Recepción / Especialista / Admin) per Pixel rules. Full read stack: **`/pixel-figma-read`**.

Use the user's message after this command for frame selection context or extra instructions (e.g. "selected frame in Figma").
