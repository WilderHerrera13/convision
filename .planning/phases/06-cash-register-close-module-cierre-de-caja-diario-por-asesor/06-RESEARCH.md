# Phase 6 — RESEARCH.md

## RESEARCH COMPLETE

### Pregunta de investigación

¿Qué necesita el planificador y el implementador para alinear backend, frontend y diseño del **informe de gestión diario**, **registro rápido de atención** y **vistas admin**, incluyendo el flujo **Figma + `/ftc`**?

### Hallazgos

1. **Contexto de fase** (`.planning/phases/06-.../06-CONTEXT.md`) ya fija: asesor = `receptionist`, UI v1 según Figma `623:2`, estados borrador/pendiente/completa, registro rápido en 3 pasos, admin listado + detalle con filtros sincronizados.
2. **Figma:** El canvas `623:2` contiene frames explícitos mapeados en **`06-FIGMA-AND-FTC.md`** (IDs `399:286`, `634:90`, `698:177`, `698:234`, `732:369`, `734:482`). Extracción recomendada: `get_metadata(623:2)` + `get_design_context` por frame hijo.
3. **FTC (`/ftc`):** Según [documentación shadcn/studio](https://shadcnstudio.com/docs/getting-started/shadcn-studio-mcp-server), el flujo requiere Figma MCP + shadcn/studio MCP; el comando identifica **Pro/Free Blocks** por nombre de frame. El archivo Convision está basado en **componentes de producto** (Sidebar, StepsBar, DS `33:2`), por lo que **no se asume** instalación automática de bloques de marketing; igualmente hay que ejecutar **`get-ftc-instructions`** cuando el MCP studio esté disponible y usarlo para cualquier bloque emparejable; el resto es implementación manual contra el mismo spec Figma.
4. **Stack:** API Laravel en `convision-api`; SPA Vite React en `convision-front` — patrones existentes: Form Requests, Resources, `ApiFilterable`, servicios, `EntityTable`, `DatePicker`.
5. **Planes 06-03 / 06-04:** Deben referenciar `06-FIGMA-AND-FTC.md` y actualizar la pantalla de reporte diario para alinearse con Figma (sin depender solo de “jornada Mañana/Tarde” como en borradores antiguos del PLAN).

### Recomendación para PLAN.md

- Tratar **`06-FIGMA-AND-FTC.md`** como referencia obligatoria en tareas de frontend del informe y registro rápido.
- Añadir tarea explícita: **«Gate Figma + FTC»** antes de implementar UI de esas pantallas (lectura MCP + instrucciones FTC; implementación acorde).

### Validación (Nyquist)

Investigación orientada a planificación; la dimensión de verificación detallada se mantiene en `06-VERIFICATION.md` del proyecto si aplica.

---

*Generado para soporte de `/gsd-plan-phase 6`.*
