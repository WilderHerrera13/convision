# gsd-qa-fixer — Agente de corrección de hallazgos QA

## ¿Qué es?

`gsd-qa-fixer` es el agente que **implementa los fixes** a partir de los hallazgos producidos por `gsd-qa-explore`. Existen dos variantes:

| Variante | Cuándo usarla |
|----------|--------------|
| `convision-qa-fixer` | Tickets simples o bien acotados; fix rápido, una pantalla, un servicio |
| `convision-qa-gap-fixer` | Gaps complejos; requiere diagnóstico causal, múltiples capas (API + front), verificación estricta |

**No es el agente explorador.** No navega la app. No genera hallazgos. Recibe un archivo FINDINGS y cierra los tickets.

---

## Cuándo usarlo

- Después de `gsd-qa-explore` — consumir el FINDINGS generado.
- Para cerrar tickets QA-### específicos.
- Cuando el humano dice "arregla el hallazgo QA-007".

---

## Sintaxis de invocación

```
@convision-qa-fixer   [ruta/a/FINDINGS.md] [IDs a cerrar]
@convision-qa-gap-fixer [ruta/a/FINDINGS.md] [IDs a cerrar]
```

Ejemplo:
```
@convision-qa-gap-fixer cerrar QA-001, QA-003 usando .planning/qa/FINDINGS-2026-04-17.md
```

---

## Entrada requerida

El agente **no actúa sin evidencia**. Cada hallazgo que se le pase debe tener:

- `ID` (ej. QA-001)
- `Rol` afectado
- `URL` o ruta de la pantalla
- `Esperado` — comportamiento correcto
- `Observado` — comportamiento actual (bug)
- `Evidencia` — mensaje UI, HTTP status, error de consola
- `Severidad` — bloqueante | mayor | menor | sugerencia
- `Estado` — confirmado (preferible) | hipótesis

Si solo hay **hipótesis sin evidencia reproducible**: el agente devuelve 1–3 comprobaciones concretas (curl, lectura de archivo, flujo UI) para que el explorador confirme antes de codificar.

---

## Flujo de trabajo del agente

### Para cada ID (en orden de severidad)

```
1. Reexpresar el bug en una sola frase de efecto al usuario
2. Trazar el flujo de datos:
   pantalla → src/services/* → endpoint → controlador → servicio/modelo → respuesta → estado React
3. Formular hipótesis (máx. 2-3) y descartar con evidencia en código (Grep/Read)
4. Elegir la solución mínima que satisfaga "Esperado" sin romper otros roles/rutas
5. Definir "hecho": criterio observable (mensaje visible, HTTP status, test que pase)
6. Implementar
7. Verificar
8. Actualizar el archivo FINDINGS con estado de resolución
```

Si un hallazgo mezcla varios bugs → separar en sub-IDs y arreglar uno por iteración / commits atómicos.

---

## Jerarquía de fix (qué capa tocar)

| Síntoma | Capa correcta |
|---------|--------------|
| API acepta datos inválidos | Form Request + reglas de negocio en servicio |
| Sin feedback / mensaje genérico | Front toast + manejo de error en servicio + mensaje API |
| Pantalla vacía al cargar | Estado loading/error, query keys, guards de datos |
| Botones que desaparecen | Layout/scroll, `aria`, sticky footer, estado tras mutación |
| Incoherencia entre roles | Policies/roles en API + `allowedRoles` en rutas React |

---

## Reglas de arquitectura (adaptar a tu stack)

### Backend (Laravel — `convision-api/`)

- Validación en **Form Requests** (`app/Http/Requests/Api/V1/...`), no en controladores.
- Respuestas con **API Resources**; listados con `apiFilter($request)` y trait `ApiFilterable`.
- Lógica de negocio en **servicios/actions**; controladores delgados.
- Excepciones coherentes: **403/422** con mensajes que el front pueda mostrar.

### Frontend (React — `convision-front/`)

- Texto de UI en **español**.
- Tablas: `EntityTable` / `DataTable` según convención del repo.
- Llamadas HTTP en `src/services/`; componentes sin axios directo si ya existe servicio.
- **shadcn/ui** para UI; Tailwind para layout/espaciado.
- Componentes < 200 líneas; extraer hooks/subcomponentes si el cambio lo exige.

> Al portar a otro proyecto: reemplaza estas reglas por las convenciones de tu stack (ej. NestJS + Vue, Django + Next.js, etc.).

---

## Verificación obligatoria (después de cada ID o grupo acotado)

| Check | Comando de referencia |
|-------|----------------------|
| Tipos / lint front | `npm run lint` (en el directorio front) |
| Tests backend | `php artisan test [archivo]` |
| Contrato API | `curl` contra el endpoint con token JWT |
| Manual mental | Describir en 2 frases cómo el usuario vería el arreglo |

**Si la verificación falla:** revertir el cambio del ID (`git checkout -- archivos`) y documentar en FINDINGS. No acumular parches rotos.

---

## Entregables del agente

1. **Código** con commits atómicos — un ID por commit si es posible.
2. **FINDINGS actualizado** — bajo cada ID, bloque:

```
### Resolución
- Fecha: YYYY-MM-DD
- Archivos tocados: [lista]
- Estado: resuelto | no reproducible | parcial
- Nota: [breve explicación]
```

3. Opcional: `.planning/qa/GAP-FIX-YYYY-MM-DD.md` con tabla resumen:

```
| ID     | Causa raíz                        | Archivos tocados         |
|--------|-----------------------------------|--------------------------|
| QA-001 | Query no filtraba por rol         | CashCloseService.php     |
| QA-003 | Toast no mostraba error de red    | cashRegisterCloseService.ts |
```

---

## Anti-patrones (prohibido)

- Arreglar solo el síntoma en UI cuando la API está mal (o viceversa) sin decisión explícita.
- Refactors masivos no pedidos.
- Ignorar otros roles que comparten la misma pantalla o endpoint.
- Asumir que el hallazgo QA tenía razón sin **leer** el código implicado.
- Mezclar inglés en copy visible al usuario.
- Re-explorar toda la app (eso es trabajo del agente explorador).

---

## Relación con otros agentes

```
gsd-qa-explore  →  produce FINDINGS  →  gsd-qa-fixer (ligero)
                                      →  gsd-qa-gap-fixer (profundo)
```

- El explorador **solo documenta**; nunca toca código.
- El fixer **solo implementa y verifica**; si necesita más contexto del bug, pide al explorador una corrida enfocada con URL y rol.
- Si el fixer necesita más contexto de arquitectura: lee `docs/QA_MAPA_EXPLORACION.md` y credenciales de `docs/CREDENCIALES_PRUEBA_ROLES.md`.

---

## Archivos clave (adaptar al proyecto destino)

| Archivo | Propósito |
|---------|-----------|
| `.cursor/rules/convision-qa-fixer.mdc` | Regla ligera de corrección |
| `.cursor/rules/convision-qa-gap-fixer.mdc` | Regla avanzada con diagnóstico causal |
| `.planning/qa/FINDINGS-*.md` | Hallazgos generados por el explorador |
| `docs/CREDENCIALES_PRUEBA_ROLES.md` | Usuarios seed para repro local |
| `docs/QA_MAPA_EXPLORACION.md` | Mapa de rutas y roles |

---

## Cómo adaptar a otro proyecto

1. **Copiar las dos reglas** `.mdc` a `.cursor/rules/` del nuevo repo y renombrar eliminando `convision-` (o con el nombre del nuevo proyecto).
2. **Actualizar las reglas de arquitectura** en el bloque correspondiente: stack backend, convenciones de front, patrones de servicios.
3. **Actualizar credenciales y URLs** de los curl de verificación.
4. El **protocolo de razonamiento** (trazar flujo, hipótesis, solución mínima, verificación) es agnóstico del dominio — no requiere cambios.
5. La **plantilla de resolución** en FINDINGS es universal — no requiere cambios.


https://tmg-dev.webflow.io/insights/why-integrated-planning-matters-before-retirement
https://tmg-dev.webflow.io/insights/why-coordinating-your-ti-benefits-deserves-careful-attention
https://tmg-dev.webflow.io/insights/faq-guide---coordinating-your-ti-benefits
https://tmg-dev.webflow.io/insights/waitlisted
https://tmg-dev.webflow.io/insights/why-college
https://tmg-dev.webflow.io/insights/comparing-financial-aid-awards
https://tmg-dev.webflow.io/insights/appealing-a-financial-aid-award