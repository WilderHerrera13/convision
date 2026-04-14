# Fase 6 — Figma (`623:2`) y flujo FTC (`/ftc`)

**Propósito:** Ser la referencia canónica para implementación y para agentes que ejecuten **Figma MCP** + **shadcn/studio `/ftc`** antes de codificar pantallas del informe de gestión y registro rápido.

---

## Enlaces

| Recurso | URL |
|--------|-----|
| Archivo Convision | `https://www.figma.com/design/dHBbcAQTlUSXGKnP6l76OS/Convision` |
| Página / canvas (dev) | `https://www.figma.com/design/dHBbcAQTlUSXGKnP6l76OS/Convision?node-id=623-2&m=dev` |
| Design system (tokens, `Button/*`, `StepsBar`) | nodo `33:2` — `https://www.figma.com/design/dHBbcAQTlUSXGKnP6l76OS/Convision?node-id=33-2&m=dev` |

**`fileKey`:** `dHBbcAQTlUSXGKnP6l76OS`  
**`nodeId` página flujo:** `623:2`

---

## Mapa de frames (extraído vía `get_metadata` en `623:2`)

| ID | Nombre | Uso en producto |
|----|--------|-----------------|
| `399:286` | P3 · Recepcionista: Reporte Diario | Formulario día: topbar (fecha, estado, «Completa ▾», CTA registro rápido), secciones Atención / Operaciones / Redes, observaciones, Guardar |
| `634:90` | P3 · Recepcionista: Registro rápido — paso 1 | Wizard: grid de ítems (chips) |
| `698:177` | P4 · Registro — Paso 2 Perfil | Chips Hombre / Mujer / Niño |
| `698:234` | P5 · Registro — Paso 3 Observación | Textarea opcional, Finalizar |
| `732:369` | P6 · Admin: Informe por asesor (día + asesor) | Detalle solo lectura + filtros fecha / asesor / estado |
| `734:482` | P7 · Admin: Consolidado del día (todos los asesores) | Lista de reportes del día, filas con badge, Abrir → detalle; nota de sincronía de filtros |

**Sidebar:** instancias `Sidebar/Role=Recepcionista` y `Sidebar/Role=Admin` — ítem activo **«Reporte de gestión diario»** (y equivalente en admin para informes).

---

## Lectura técnica (sin código)

1. **`get_metadata`** sobre `623:2` — árbol completo, nombres de capas y IDs para `get_design_context` puntual.
2. **`get_design_context`** por **frame** (p. ej. `399:286`, `634:90`, …) — referencia visual + snippet (adaptar a Vite/React del repo, no Next).
3. **`get_screenshot`** — opcional, verificación pixel o handoff.
4. **Página `33:2`:** contrastar CTAs con tokens por rol (**Recepción = morado**, **Admin = azul**); no inventar hex.

Si `get_design_context` falla en el canvas completo, no depender de selección en Figma Desktop: usar siempre **nodos hijos** listados arriba.

---

## Flujo `/ftc` (shadcn/studio) — obligatorio para quien implemente UI

Documentación: [shadcn/studio MCP — Figma to Code](https://shadcnstudio.com/docs/getting-started/shadcn-studio-mcp-server).

### Prerrequisitos

1. Proyecto React con **shadcn/ui** (Convision: `convision-front`).
2. **Figma MCP** habilitado (lectura de diseño).
3. **shadcn/studio MCP** instalado según [onboarding](https://shadcnstudio.com/mcp/onboarding).
4. En el IDE: invocar primero la herramienta MCP **`get-ftc-instructions`** (paso indicado en el comando interno `/ftc` del proyecto) y seguir **cada** paso (bloques + construcción de página).

### Cómo se usa `/ftc` (resumen oficial)

- Convierte diseños en Figma que usan **instancias Pro/Free Blocks** de shadcn/studio en instalación de bloques vía CLI.
- **No renombrar** frames de bloques en Figma (el emparejamiento es por nombre de frame).
- **Limitación:** si el archivo Convision **no** usa esos bloques con nombres de librería, `/ftc` no instalará bloques automáticamente; en ese caso el flujo sigue siendo válido: **MCP Figma** para spec + **mapeo manual** a componentes existentes (`@/components/ui/*`, layout del proyecto).

### Convision (realista)

Las pantallas P3–P7 usan el **design system Convision** (Sidebar, StepsBar, etc.), no necesariamente bloques «hero» de marketing. Para esta fase:

1. Ejecutar **`get-ftc-instructions`** cuando el MCP studio esté activo (genera checklist: bloques, CLI, orden).
2. Usar **Figma MCP** para lista de textos, jerarquía y estados.
3. Implementar en **`convision-front`** con **shadcn/ui** del repo; imágenes: `<img>` o patrones existentes, **no** `next/image`.
4. Si en el futuro se enlazan frames con bloques shadcn/studio renombrados correctamente, `/ftc` puede acelerar secciones concretas; hasta entonces, **FTC + Figma = spec + instalación condicional de bloques**.

---

## Checklist antes de merge de UI (informe / registro / admin)

- [ ] Textos en **español** y coincidencia con labels del frame o tabla en este doc.
- [ ] **DatePicker** del proyecto para fechas.
- [ ] Tablas admin con **EntityTable** / DataTable centralizado.
- [ ] CTA primario acorde al **rol** (recepción morado, admin azul) vs `33:2`.
- [ ] Rutas y sidebar: **«Reporte de gestión diario»** visible y activo en la vista correspondiente.

---

*Última actualización: generado para `/gsd-plan-phase 6` con requisito de integrar lectura FTC + Figma.*
