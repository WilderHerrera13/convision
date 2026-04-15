# /pixel-figma-review — Pixel ejecutor + auditor Figma (pipeline)

Ejecuta el flujo **completo** de diseño en Figma para Convision:

1. **Fase ejecutor:** aplica `@pixel-figma-design-agent` — diseña o ajusta según la petición del usuario; usa MCP Figma; ancla tokens en **`33:2`** cuando el archivo sea Convision (`dHBbcAQTlUSXGKnP6l76OS`).
2. **Handoff obligatorio:** al terminar la ejecución, genera el **paquete de handoff** (objetivo, fileKey, URLs con `node-id`, cambios realizados, IDs de nodos, supuestos/deuda) y deja estado **Pendiente de auditoría**.
3. **Fase auditor:** aplica `@pixel-figma-design-auditor` — valida **en Figma** con MCP (`get_metadata`, `get_design_context` y si hace falta `get_screenshot`) los nodos entregados; contrasta con **`33:2`**; emite **Veredicto** (`APROBADO` | `APROBADO CON CONDICIONES` | `RECHAZADO`), hallazgos P0/P1/P2 y **correcciones ordenadas**.
4. **Si el veredicto no es APROBADO:** el ejecutor aplica las correcciones y el auditor **vuelve a validar** en el mismo hilo hasta `APROBADO` o condiciones aceptadas por el usuario.

## Valores fijos (no preguntar al usuario)

| Qué | Valor |
|-----|--------|
| Archivo Figma Convision | `fileKey=dHBbcAQTlUSXGKnP6l76OS` |
| Página componentes / tokens | nodo `33:2` |
| Tokens de rol (hex de referencia) | `Token/Recep` `51:155`, `Token/Espec.` `51:152`, `Token/Admin` `51:149`; `Button/Primary` `51:28` |
| Reglas Cursor | `@pixel-figma-design-agent`, `@pixel-figma-design-auditor` |

**Variable (viene en el mensaje del usuario tras el comando):** URL Figma con `node-id` del frame a editar/auditar, o instrucción equivalente (`search` + nombre de frame, lista de IDs). Sin eso, **no** escribas en el archivo: indica en una línea que falta el `node-id` o el alcance y termina (no pidas confirmación en bucle).

## Color primario de botones por rol (Convision — obligatorio)

En pantallas que representen **usuario logueado**, los botones **primarios** (CTA principal) deben usar el **color primario del rol**, no un genérico:

| Rol | Color primario (nombre) |
|-----|---------------------------|
| **Receptionist** | Morado / púrpura |
| **Specialist** | Verde |
| **Admin** | Azul |

**Tokens de referencia en Figma (`33:2`):** ejecutor y auditor deben contrastar el CTA contra los fills de **`Token/Recep`** (`51:155`), **`Token/Espec.`** (`51:152`) y **`Token/Admin`** (`51:149`) vía MCP (`get_design_context` en cada nodo). Esos rectángulos son la **fuente de verdad** del hex por rol.

**Regla explícita para el review:** el componente **`Button/Primary`** (`51:28`) puede verse **neutro** en el master; **no** se considera válido un CTA que solo instancie ese componente sin comprobar que el **fill del botón en el frame** coincide con el token del **rol de la pantalla**. Si no coincide → **P1** como mínimo (o **P0** si el error es sistemático en varios CTAs).

- Los **hex y estilos canónicos** están en la página de **componentes** del archivo Figma: nodo **`33:2`** (`⚙️ 00 · Componentes`). El ejecutor y el auditor deben **leerlos con MCP** (`get_design_context` / inspección sobre botones/variables de rol en esa página) y **no inventar** hex.
- Si el frame indica el rol (p. ej. sidebar `Role=Recepcionista` / especialista / admin), los **primary** deben coincidir con ese rol. Si falta coherencia rol ↔ color de CTA, el auditor puede marcar **P0/P1** según gravedad.

**Lectura Figma:** Pixel usa la pila **FTC + MCP** (`get-ftc-instructions` si hay implementación; `get_metadata`, `get_design_context`, `get_variable_defs`) — ver **`/pixel-figma-read`** y sección *Experto en lectura* en la regla del ejecutor.

**Reglas:** `.cursor/rules/pixel-figma-design-agent.mdc`, `.cursor/rules/pixel-figma-design-auditor.mdc`.

## Lecciones / anti‑patrones (no repetir)

Estas notas **complementan** el flujo anterior; no sustituyen la tabla de roles ni el anclaje a `33:2`.

- **`use_figma`:** En la Plugin API las páginas son tipo **`PAGE`** (no asumir `CANVAS`). `layoutSizingHorizontal` / `layoutSizingVertical` = **`FILL`** u otras reglas de auto‑layout **solo después** de `appendChild` al padre con auto‑layout; no aplicar `FILL` a nodos cuyo padre **no** sea auto‑layout.
- **Lectura de `33:2`:** Si `get_design_context` sobre la página completa falla (p. ej. capa no seleccionada en el entorno), usar **`get_metadata`** de `33:2` o **`get_design_context` en nodos hijos concretos** de la página Componentes (p. ej. botones publicados `Button/*`).
- **Clonar pantallas:** Revisar y **eliminar o justificar** controles heredados que no aplican al nuevo flujo (filtros, dropdowns de otro módulo). Ajustar **sidebar / ítem activo** al módulo real o documentar placeholder.
- **Flujos por pasos:** Evitar **tabs de pasos + todo el contenido visible** a la vez (redundancia). Preferir **un paso visible** + CTA “Continuar”, o dejar explícito en el handoff si es spec de varios estados en un solo frame. Para barras de pasos, usar el **componente publicado `StepsBar`** en la página Componentes (`33:2`), no recrear dots sueltos.
- **CTA primario y rol:** No usar por defecto verde genérico si el frame es **Recepcionista** (primario **morado** según DS). Confirmar contra `33:2` con MCP.
- **Controles sueltos vs DS:** Preferir **instancias** de `Button/*` y patrones de `33:2` antes que frames dibujados a mano.

Usa el mensaje del usuario **después** de este comando como tarea concreta (qué ajustar, restricciones) y la **única parte variable**: URL Figma con `node-id` o alcance explícito. Todo lo demás está en la tabla de valores fijos.
