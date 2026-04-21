# Antigravity: GSD QA & Gap Fixer Prompts Asimilados

He asimilado la configuración de `.cursor/rules` y `.github/skills/gsd-qa-explore`, junto con la filosofía del framework **Get Shit Done (GSD)**. A partir de ahora, puedes pedirme que actúe bajo estos roles y seguiré estrictamente los siguientes comportamientos:

## 1. Agente QA Exploratorio (gsd-qa-explore)

**Cómo invocarme:** *"Ejecuta la exploración QA"* o *"Haz QA como [rol]"*

**Comportamiento asimilado:**
- Usaré mi herramienta de navegador (`browser_subagent`) para navegar la app (`http://localhost:4300`).
- **No modificaré código.** Solo observaré y reportaré.
- Utilizaré las credenciales de prueba establecidas (`admin@convision.com`, `specialist@convision.com`, etc. con contraseña `password`).
- Navegaré basándome en `docs/QA_MAPA_EXPLORACION.md`.
- Generaré un archivo de hallazgos estructurado (`FINDINGS`) detallando: URL, rol, pasos, esperado vs observado, evidencia (snapshots/logs) y si es un estado confirmado o hipótesis.

## 2. Agente Corrector de Gaps QA (convision-qa-gap-fixer)

**Cómo invocarme:** *"Arregla los FINDINGS"*, *"Cierra el gap QA-###"*

**Comportamiento asimilado:**
- **Diagnóstico causal:** Antes de tocar código, leeré el flujo completo (Frontend -> Axios Service -> Golang Backend API Endpoint -> Handler -> Service -> Repository/Model). Consideraré que la arquitectura corre sobre **Docker** (Frontend y Backend).
- **No codificaré hipótesis sin evidencia:** Si el reporte QA no es claro, te haré preguntas o ejecutaré comprobaciones (`curl`, revisar logs de Docker) para confirmar el bug antes de parchear a ciegas.
- **Arquitectura estricta:** 
  - Frontend: UI en español, componentes `< 200` líneas, uso de tablas centralizadas (`EntityTable`), Shadcn UI.
  - Backend: API en **Golang** (ya no es Laravel). Validaciones en Handlers/Middlewares, lógica en **Servicios**, acceso a datos en Repositorios.
- **Verificación obligatoria:** Ejecutaré tests correspondientes de Go (backend) o `npm run lint` (frontend) después de aplicar la solución.
- Actualizaré el estado del ticket en el documento `FINDINGS` a "resuelto" o "no reproducible".

## 3. Filosofía Get Shit Done (GSD)
- Cero "enterprise theater" (sin exceso de burocracia). 
- Foco en "Spec-driven development".
- Pequeñas iteraciones verificables.
- Trazabilidad y contextos aislados para evitar "context rot".

---
*Nota: No necesito comandos slash `/gsd` nativos en mi UI, simplemente pídeme ejecutar el flujo de QA o arreglar bugs y aplicaré exactamente estas reglas.*
