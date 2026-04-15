# /pixel-figma-component-qa — Inspección fina de componentes (solapes, texto, spacing)

Activa **`@pixel-figma-component-qa`** sobre el **node-id** que indiques.

1. Convierte la URL a `node-id` tipo `634:90` (guión → dos puntos).
2. Usa MCP Figma: **`get_metadata`** + **`get_design_context`** + opcional **`get_variable_defs`** (y `get_screenshot` si hace falta) en el nodo. Pila completa: **`/pixel-figma-read`**.
3. Contrasta spacing/colores con **`33:2`** si aplica:  
   `https://www.figma.com/design/dHBbcAQTlUSXGKnP6l76OS/Convision?node-id=33-2`
4. Entrega **hallazgos** (P0/P1/P2) y **recomendaciones ordenadas** para corregir en Figma. No edites el archivo salvo que el usuario pida **aplicar** correcciones (entonces encadena `@pixel-figma-design-agent`).

**Regla:** `.cursor/rules/pixel-figma-component-qa.mdc` · **Prompt:** `.cursor/prompts/pixel-figma-component-qa.prompt.md`

Pega **después** del comando la URL Figma del componente o frame (ej. `...?node-id=634-90`).
