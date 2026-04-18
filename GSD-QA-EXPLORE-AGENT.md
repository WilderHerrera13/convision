# gsd-qa-explore — Agente de exploración QA con navegador

## ¿Qué es?

`gsd-qa-explore` es un agente autónomo de QA funcional que controla un navegador real via MCP para recorrer la aplicación SPA, detectar fallos y gaps, y producir un archivo estructurado `FINDINGS-YYYY-MM-DD.md` listo para que otro agente de corrección lo consuma.

**No es UAT conversacional** (eso es `gsd-verify-work`). Este agente actúa solo, sin preguntas al humano durante la exploración.

---

## Cuándo usarlo

- Smoke test rápido después de mergear ramas.
- Encontrar regresiones antes de un release.
- Alimentar al agente corrector (`gsd-qa-fixer` / `gsd-qa-gap-fixer`) con hallazgos concretos.
- Validar permisos de rol (sidebar, rutas, redirecciones).

---

## Sintaxis de invocación

```
/gsd-qa-explore [rol] [nota de alcance]
```

| Argumento | Comportamiento |
|-----------|---------------|
| (vacío) | Prueba los tres roles: `admin`, `specialist`, `receptionist` |
| `admin` / `specialist` / `receptionist` | Solo ese rol |
| Texto adicional (ej. `"solo módulo facturas"`) | Nota de alcance; el agente prioriza esas secciones |

---

## Prerrequisitos

| Recurso | Valor esperado |
|---------|---------------|
| Front SPA | `http://localhost:4300` (ajustar a tu proyecto) |
| API backend | `http://localhost:8000` |
| MCP de navegador | `cursor-ide-browser` activo en la sesión |
| Datos | Entorno local con seeders; no usar datos reales ni hacer destructivos |

Si la URL base cambia, actualizar en el archivo de workflow del proyecto.

---

## Archivos clave del agente

| Archivo | Propósito |
|---------|-----------|
| `.codex/skills/gsd-qa-explore/SKILL.md` | Punto de entrada del skill; mapea argumentos y lanza el workflow |
| `.codex/get-shit-done/workflows/qa-explore.md` | Workflow completo paso a paso |
| `.codex/get-shit-done/templates/QA-FINDINGS.md` | Plantilla de salida estructurada |
| `.cursor/rules/convision-qa-explorer.mdc` | Regla de conducta del agente (límites, credenciales, formato) |
| `docs/QA_MAPA_EXPLORACION.md` | Mapa de rutas, menú en español y URLs sin enlace en sidebar |
| `docs/CREDENCIALES_PRUEBA_ROLES.md` | Usuarios seed y contraseñas por rol |

---

## Flujo de ejecución (paso a paso)

### 1. Bootstrap
- Crea `.planning/qa/` si no existe.
- Determina nombre de archivo de salida: `.planning/qa/FINDINGS-YYYY-MM-DD.md`.
- Inicializa el documento con la plantilla (`QA-FINDINGS.md`): frontmatter + secciones vacías.

### 2. Por cada rol en el alcance

```
→ Abrir http://[base]/login
→ Ingresar correo + contraseña del rol
→ Verificar redirección al dashboard esperado
→ Si login falla → registrar hallazgo con evidencia y continuar al siguiente rol
→ Recorrer cada ítem del sidebar (clic en botones de menú en español)
→ En cada pantalla:
    - Esperar carga completa
    - Revisar errores visibles, pantallas en blanco, toasts de error
    - Opcional: revisar consola y red si hay fallo sospechoso
→ Recorrer rutas del mapa que no están en el menú lateral
→ Cerrar sesión o limpiar estado antes del siguiente rol
```

### 3. Reglas de iteración
- Máximo **1 reintento** por pantalla con snapshot fresco si la interacción falla.
- Máximo **4 intentos** en la misma vista; si sigue bloqueado → documentar `bloqueado por automatización`.
- Un hallazgo se marca **confirmado** solo con evidencia concreta; sin evidencia → **hipótesis**.

### 4. Finalización
- Completa las secciones: Resumen ejecutivo, Hallazgos (FAIL/GAP), OK (sin incidencias).
- Escribe sección **Handoff** con IDs de hallazgos para el agente corrector.
- Opcional: si hay IDs críticos, propone agregarlos como todos via `/gsd-add-todo`.

---

## Formato del archivo FINDINGS

### Frontmatter

```yaml
---
status: in_progress | complete
app: [nombre-front]
api: [nombre-api]
base_url: http://localhost:4300
started: 2026-04-17T10:00:00
updated: 2026-04-17T11:30:00
roles_tested: [admin, specialist, receptionist]
---
```

### Resumen ejecutivo

```
- Pantallas verificadas: N
- Hallazgos confirmados: N
- Hipótesis / pendiente evidencia: N
- Sin incidencias: [lista de rutas]
```

### Bloque por hallazgo (FAIL / GAP)

```
### QA-001
- Rol: admin
- URL: http://localhost:4300/admin/cash-closes
- Severidad: bloqueante | mayor | menor | sugerencia
- Pasos:
  1. Login como admin
  2. Navegar al módulo X
  3. Hacer clic en Y
- Esperado: Que muestre tabla con datos
- Observado: Pantalla en blanco, sin spinner ni mensaje de error
- Evidencia: (mensaje UI / HTTP 500 / error en consola)
- Estado: confirmado | hipótesis
```

### Tabla OK

```
| Rol          | Ruta                    | Notas                        |
|--------------|-------------------------|------------------------------|
| admin        | /admin/dashboard        | Carga sin errores de consola |
| receptionist | /receptionist/dashboard | Carga, tabla con datos OK    |
```

### Sección Handoff

```
**Para corrección ligera:** regla `convision-qa-fixer` — incluir ruta de este FINDINGS + IDs.
**Para corrección profunda:** regla `convision-qa-gap-fixer`.

IDs a resolver: QA-001, QA-003, QA-007
Comando sugerido: "Con @convision-qa-gap-fixer, cerrar QA-001, QA-003, QA-007 usando FINDINGS-2026-04-17.md como fuente."
```

---

## Conducta del agente (límites)

- **Solo lectura en repo:** no modifica código, no hace commits.
- Snapshot fresco de navegador **después de cada acción** que cambie el estado de la página.
- No afirmar "todo OK" sin listar explícitamente las rutas comprobadas.
- No asumir herramientas de navegador específicas; usa las realmente disponibles en la sesión (ej. `cursor-ide-browser`).
- Si el entorno no está levantado (API/front no responde), reportar y detener.

---

## Usuarios de prueba (adaptar a tu proyecto)

Contraseña común por defecto en seed local: `password`.

| Rol | Email de ejemplo |
|-----|-----------------|
| admin | `admin@tuapp.com` |
| specialist / operador | `specialist@tuapp.com` |
| receptionist / cajero | `receptionist@tuapp.com` |

Mantener la fuente canónica de credenciales en `docs/CREDENCIALES_PRUEBA_ROLES.md` del proyecto (o equivalente).

Login vía API para verificaciones programáticas:
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@tuapp.com","password":"password"}'
```

---

## Cómo adaptar a otro proyecto

1. **Copiar los archivos clave** listados en la tabla de arriba a `.codex/` y `.cursor/rules/` del nuevo repo.
2. **Actualizar URLs base** en `qa-explore.md` (front y API).
3. **Reemplazar credenciales** en la regla `.mdc` y en `docs/CREDENCIALES_PRUEBA_ROLES.md`.
4. **Crear o adaptar `docs/QA_MAPA_EXPLORACION.md`** con las rutas, roles y menú del nuevo proyecto.
5. **Ajustar roles** en el SKILL.md si el proyecto usa nombres distintos (ej. `manager`, `cashier`, `operator`).
6. El formato de `FINDINGS` y la lógica del agente son agnósticos del dominio; no requieren cambios.

---

## Anti-patrones conocidos

| Anti-patrón | Por qué evitarlo |
|-------------|-----------------|
| Afirmar "sin errores" sin listar rutas | Produce falsa confianza; el reporte pierde valor |
| Mezclar múltiples bugs en un solo ID | El agente corrector no puede operar atómicamente |
| Editar código durante la exploración | Este agente es read-only; los fixes van al agente corrector |
| Reutilizar screenshots viejos para coordenadas de clic | El DOM cambia; siempre snapshot fresco antes de interactuar |
| Más de 4 intentos ciegos en la misma vista | Documentar como bloqueado y seguir; no ciclar indefinidamente |
