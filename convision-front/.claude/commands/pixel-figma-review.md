---
description: Pixel ejecutor + auditor Figma — pipeline completo (diseñar/ajustar → auditar → aprobar)
argument-hint: [URL Figma con node-id del frame a revisar/ajustar, o instrucción de diseño]
---

# /pixel-figma-review — Pipeline completo Pixel (ejecutor + auditor)

Ejecuta el flujo **completo** de diseño en Figma para Convision: **Fase A (ejecutor)** → handoff → **Fase B (auditor)**.

---

## Valores fijos (no preguntar al usuario)

| Qué | Valor |
|-----|-------|
| Archivo Figma Convision | `fileKey=dHBbcAQTlUSXGKnP6l76OS` |
| DS fuente de verdad | nodo `33:2` (`⚙️ 00 · Componentes`) |
| Token Recepción | `Token/Recep` `51:155` → primario **morado** |
| Token Especialista | `Token/Espec.` `51:152` → primario **verde** |
| Token Admin | `Token/Admin` `51:149` → primario **azul** |
| Botón primario master | `Button/Primary` `51:28` (puede ser neutro; aplicar color de rol igual) |

**Variable:** URL Figma con `node-id` del frame a editar/auditar. Sin eso, indicar en una línea que falta y terminar — no pedir confirmación en bucle.

---

## Fase A — Ejecutor (Pixel)

### A1. Entender

1. `get_metadata` con `node-id` exacto de la URL → árbol, página, dimensiones, frames vecinos.
2. `get_design_context` → screenshot + implementación + descripciones.
3. `get_variable_defs` → tokens/variables del nodo.
4. Si el archivo es Convision: `get_design_context` o `get_metadata` sobre `33:2` para alinear con DS.

### A2. Auditar tokens

Verificar que los colores/tipografía/radios del frame coincidan con `33:2`. Identificar hardcode o desvíos.

### A3. Planear

2–3 pasos concretos: qué tocar, qué clonar, coordenadas, bot primary correcto por rol.

### A4. Ejecutar en Figma

Usar `use_figma` en pasos pequeños. Reglas críticas:

- **`await figma.setCurrentPageAsync(page)`** antes de `appendChild` (no `figma.currentPage =`).
- No superponer frames: posicionar como `x = rightmost.x + rightmost.width + 80`.
- Páginas del documento son tipo **`PAGE`**, no `CANVAS`.
- `layoutSizingHorizontal/Vertical = FILL` **solo** después de `appendChild` si el padre tiene auto-layout.
- Al clonar: quitar controles heredados (filtros, dropdowns) que no apliquen al nuevo flujo.
- Wizards: no tabs de pasos + todo el contenido visible a la vez. Usar componente `StepsBar` de `33:2`.
- Botón primario: **respetar el color del rol** del frame, no asumir verde genérico.

### A5. Auto-revisar

`get_design_context` o `get_screenshot` del nodo modificado para verificar superposiciones y jerarquía.

### A6. El Crítico (autochequeo — no reemplaza al auditor)

Revisar honestamente:
1. ¿Tokens del DS vs valores inventados?
2. ¿CTA primario con el color de rol correcto?
3. ¿Controles heredados de clon que sobran?
4. ¿Jerarquía clara? ¿Estados vacío/error/carga?
5. ¿Espaciado base 4px?
6. ¿Nav/sidebar activo coherente con la pantalla?
7. ¿Badges de estado en banda de controles del topbar?

**Formato:**
- 🔴 **Crítico:** problema grave (al menos uno).
- 🟡 **Mejorable:** detalles que bajan calidad.
- 🟢 **OK pero vigilar:** riesgo futuro.

### A7. Handoff al auditor

Declarar estado: **Pendiente de auditoría**. Entregar paquete:

```
Objetivo: [1-3 frases]
fileKey: dHBbcAQTlUSXGKnP6l76OS
Nodos revisados: [URLs con node-id del resultado final]
Cambios realizados:
  - ...
IDs de nodos afectados: [si disponibles]
Supuestos / deuda: [hardcode, clones, excepciones]
```

---

## Fase B — Auditor (ejecutar en el mismo hilo tras el handoff)

Eres ahora el **auditor independiente**. Tienes el mismo contexto que el ejecutor pero **no confías** en su autoevaluación: debes ir a Figma y comprobar el resultado.

### B1. Validar en Figma

1. `get_metadata` de los `node-id` entregados → jerarquía, nombres, tamaños, posiciones.
2. `get_design_context` del nodo principal → screenshot, solapes, jerarquía visual, CTA.
3. `get_design_context` o `get_metadata` de `33:2` para contrastar con DS.
   - Fallback si falla la raíz: `get_metadata` de `33:2` o `get_design_context` en hijos concretos (botones, `StepsBar`).
4. `get_screenshot` si algo no cuadra.

### B2. Checklist obligatorio — primario por rol

1. Identificar el **rol de la pantalla** (sidebar `Role=…`, nombre del frame, anotación).
2. Llamar `get_design_context` sobre el token del rol en `33:2` (`51:155` / `51:152` / `51:149`).
3. En el nodo auditado, localizar el CTA primario y verificar que el fill coincide con el hex de referencia.
4. Discrepancia → hallazgo **P1** mínimo (P0 si afecta todos los CTAs del flujo).

### B3. Rúbrica de verificación

| Dimensión | Qué comprobar |
|-----------|--------------|
| Tokens / DS | Alineación con `33:2`; evitar paleta nueva sin justificación |
| Primary por rol | Recepción → morado, Especialista → verde, Admin → azul |
| Jerarquía | Título vs cuerpo vs caption; CTA claro |
| Layout | Márgenes, grid, sin solapes |
| Coherencia | Sidebar/nav activo vs pantalla real |
| Herencia de clones | Controles de otra pantalla que no aplican → P1 |
| Wizards | No tabs + todo el contenido; usar StepsBar cuando existe |
| Estados | Vacío/carga/error anotados o variantes |
| A11y | Contraste WCAG AA; targets razonables |
| Deuda | Hardcode declarado y acotado |

### B4. Veredicto obligatorio

```markdown
## Veredicto: APROBADO | APROBADO CON CONDICIONES | RECHAZADO

### Evidencia Figma
- Nodos revisados: ...
- Herramientas MCP usadas: get_metadata / get_design_context / ...

### Hallazgos
- **P0 (bloqueante):** ...
- **P1 (importante):** ...
- **P2 (nice):** ...

### Correcciones ordenadas (para el ejecutor)
1. [Acción concreta] — nodo/frame ...
2. ...
```

### B5. Si no es APROBADO

Si veredicto es **RECHAZADO** o **APROBADO CON CONDICIONES** con P0/P1: el ejecutor aplica las correcciones ordenadas y vuelve a pasar Fase B hasta **APROBADO** o condiciones aceptadas por el usuario.

---

## Args

$ARGUMENTS
