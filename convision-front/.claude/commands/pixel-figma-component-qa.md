---
description: Inspección fina de componentes Figma — solapes, texto, spacing (QA fino; no edita Figma)
argument-hint: [URL Figma con node-id del componente o frame a inspeccionar]
---

# /pixel-figma-component-qa — QA fino de componentes Figma

Inspecciona en profundidad un nodo Figma para detectar **solapes, texto defectuoso, spacing incorrecto** y otras inconsistencias visuales. Reporta hallazgos ordenados. **No edita el archivo Figma** salvo que el usuario pida explícitamente aplicar correcciones.

---

## Flujo

### 1. Convertir URL a node-id

Si el argumento contiene `node-id=634-90`, convertir a `634:90` (guión → dos puntos).

### 2. Leer el nodo (pila completa)

| Paso | Herramienta MCP Figma | Para qué |
|------|----------------------|----------|
| 1 | **`get_metadata`** | Árbol, posiciones exactas, sizes. Detectar nodos fuera de bounds o mal alineados. |
| 2 | **`get_design_context`** | Screenshot + implementación + descripciones de capas. |
| 3 | **`get_variable_defs`** | Variables/tokens usados en el nodo. |
| 4 | **`get_screenshot`** | Si se necesita confirmación visual adicional. |

### 3. Contrastar con DS Convision (`33:2`)

Cuando el archivo sea Convision (`dHBbcAQTlUSXGKnP6l76OS`):

- Leer `33:2` con `get_design_context` o `get_metadata` para contrastar spacing/colores.
- URL: `https://www.figma.com/design/dHBbcAQTlUSXGKnP6l76OS/Convision?node-id=33-2`
- **Botones primarios por rol:**
  - `Token/Recep` (`51:155`) → Recepción = morado
  - `Token/Espec.` (`51:152`) → Especialista = verde
  - `Token/Admin` (`51:149`) → Admin = azul

### 4. Verificar

Revisar en el nodo:

| Área | Qué detectar |
|------|-------------|
| **Solapes** | Capas que se superponen incorrectamente; texto cortado |
| **Spacing** | Padding/gap no múltiplos de 4px; márgenes inconsistentes |
| **Tipografía** | Tamaños fuera de jerarquía (> 3 por pantalla); line-height roto |
| **Colores** | Hardcode vs variables del DS; color de rol correcto en CTAs |
| **Auto-layout** | Hijos con `FILL` sin padre auto-layout; nodos con posición absoluta que deberían ser layout |
| **Naming** | Frames genéricos `Frame 47`; naming no semántico |
| **Herencia de clones** | Controles de otra pantalla que no aplican |
| **Accesibilidad** | Contraste WCAG AA; áreas táctiles razonables |

### 5. Entregar hallazgos ordenados

```markdown
## QA — [nombre del nodo]

### Hallazgos
- **P0 (bloqueante):** ...
- **P1 (importante):** ...
- **P2 (nice):** ...

### Recomendaciones ordenadas
1. [Acción concreta] — capa/nodo ...
2. ...

### Para aplicar correcciones
Invocar `/pixel-figma-review` con las correcciones como instrucción + esta URL.
```

**Si no hay hallazgos graves:** igual reportar al menos un P2 o explicar en 2 líneas por qué el componente está limpio.

---

## Args

$ARGUMENTS
