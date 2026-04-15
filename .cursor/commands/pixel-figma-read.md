# /pixel-figma-read — Lectura experta de Figma (FTC + MCP + Convision)

Usa **`@pixel-figma-design-agent`** enfocado en **leer e interpretar** el archivo (estructura, tokens, intención de implementación), no solo en editar.

## Orden obligatorio

1. **Si la tarea incluye pasar diseño a código React/shadcn:** MCP **shadcn-studio** → **`get-ftc-instructions`** primero; sigue cada paso. Doc: [shadcn/studio MCP](https://shadcnstudio.com/docs/getting-started/shadcn-studio-mcp-server). Comando hermano: **`/ftc`**.
2. **Figma MCP** (`user-Figma`), en este orden según necesidad:
   - **`get_metadata`** — estructura y geometría (`node-id` de la URL).
   - **`get_design_context`** — screenshot + referencia de código + descripciones de componentes.
   - **`get_variable_defs`** — variables/tokens del nodo.
   - **`get_screenshot`** — refuerzo visual si hace falta.
   - **`get_context_for_code_connect`** / **`get_code_connect_map`** — si aplica Code Connect.
   - **`search_design_system`** — buscar en el DS del archivo.
3. **Convision:** `fileKey` **`dHBbcAQTlUSXGKnP6l76OS`**, ancla DS en **`33:2`**:  
   `https://www.figma.com/design/dHBbcAQTlUSXGKnP6l76OS/Convision?node-id=33-2`  
   Primary por rol (Recepción / Especialista / Admin) según regla Pixel.

**Implementación** objetivo: **`convision-front`** (Vite + React; no `next/image` salvo que el proyecto lo use).

Pega **después** el contexto: URL con `node-id`, y si es FTC, qué pantalla o bloque vas a construir.

**Regla:** `.cursor/rules/pixel-figma-design-agent.mdc` (sección *Experto en lectura de Figma*).
