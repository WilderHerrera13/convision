# /convision-platform-to-figma — Inventario en código → Figma (DS Convision)

Activa el flujo **Puente plataforma → Figma**:

1. Aplica **`@convision-platform-to-figma`**: entiende funcionalidades reales en **`convision-front`** (rutas, páginas por rol, flujos) y tradúcelas a frames en Figma usando el DS del archivo Convision.
2. **Figma:** `fileKey` **`dHBbcAQTlUSXGKnP6l76OS`**; ancla visual en **`33:2`** (`⚙️ 00 · Componentes`):  
   `https://www.figma.com/design/dHBbcAQTlUSXGKnP6l76OS/Convision?node-id=33-2`  
   Usa la pila de lectura Pixel (**`/pixel-figma-read`**, `get_metadata` / `get_design_context` / `get_variable_defs`) antes de inventar estilos.
3. Entrega **inventario funcional** + **mapa pantalla/ruta/rol** + **URLs/node-ids Figma** + gaps código vs DS.
4. Si el usuario pide **pulido visual fuerte** o muchos retoques en canvas, encadena **`@pixel-figma-design-agent`** con tu brief; para cierre con auditor usa **`/pixel-figma-review`** según reglas del repo.

**Regla:** `.cursor/rules/convision-platform-to-figma.mdc` · **Prompt portable:** `.cursor/prompts/convision-platform-to-figma.prompt.md`

Usa el mensaje del usuario después del comando como **alcance** (módulo, rol, lista de rutas, o “panorama recepción/admin”).
