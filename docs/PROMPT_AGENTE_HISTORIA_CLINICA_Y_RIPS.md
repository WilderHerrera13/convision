# Prompt para agente fresco — Conciliar historia clínica, atención en óptica y RIPS

> Este documento es un prompt autocontenido, pensado para pegarse como instrucción inicial a un agente de Claude Code sin memoria de esta conversación. No asume que el agente conoce nada del análisis previo — todo lo que necesita saber está aquí o en los documentos referenciados.

---

## Misión

Convision es un sistema de gestión de clínicas de óptica (backend Go en `convision-api-golang/`, frontend React en `convision-front/`). Existen dos documentos de análisis de brechas que comparan su flujo de negocio contra un sistema de referencia en producción (Jarvis/Proteger IPS, un ERP/EHR colombiano):

- `docs/GAP_ANALYSIS_FACTURACION_JARVIS.md` — facturación, DIAN, cartera.
- `docs/GAP_ANALYSIS_HISTORIA_CLINICA_JARVIS.md` — historia clínica, consulta de optometría, venta de lentes y RIPS. **Este es tu documento principal.**

Tu misión: **leer `docs/GAP_ANALYSIS_HISTORIA_CLINICA_JARVIS.md` de principio a fin**, ajustar el código de Convision para cerrar las brechas ahí identificadas (en el orden de prioridad que el documento ya establece), y **verificar con un navegador real** que el flujo completo de atención al paciente — cita → consulta de optometría → historia clínica firmada → venta del lente → orden de laboratorio con la fórmula correcta → generación de RIPS — funciona de punta a punta.

No implementes nada que el documento no pida. No inventes alcance adicional.

---

## Lectura obligatoria, en este orden, antes de escribir una sola línea de código

1. `CLAUDE.md` (raíz del repo) — convenciones del proyecto. Presta especial atención a la "Golden Rule — English-Only Code" (identificadores/código en inglés, textos de UI en español) y a la sección de skills GSD disponibles en `.claude/skills/`.
2. `convision-api-golang/DEVELOPMENT_GUIDE.md` — arquitectura en 3 capas (domain/service/transport), plantillas de entity/service/repository/handler, RBAC, testing.
3. `convision-api-golang/DATABASE_GUIDE.md` — tipos correctos en Postgres, migraciones idempotentes, índices, RLS.
4. `docs/GAP_ANALYSIS_HISTORIA_CLINICA_JARVIS.md` — tu especificación de trabajo. Lee las 11 secciones y las recomendaciones priorizadas (P0/P1/P2) completas.
5. `docs/GAP_ANALYSIS_FACTURACION_JARVIS.md` — necesario porque la brecha de RIPS depende de la de facturación electrónica (ver sección "Alcance" más abajo).
6. `jarvis_optica/HISTORIA_CLINICA_Y_CONSULTA_OPTICA.md` — contexto adicional sobre cómo Jarvis modela la consulta de optometría (solo como referencia de lógica de negocio, no de calidad de código).
7. `.planning/STATE.md` y `.planning/ROADMAP.md` — antes de tocar código, confirma si ya hay una fase en curso que se solape con este trabajo. Si el proyecto usa el flujo GSD (`.claude/skills/gsd-*`), evalúa si conviene formalizar este trabajo como una fase nueva (`/gsd-add-phase`, `/gsd-plan-phase`) en vez de improvisar — usa tu criterio según cuánto se solape con fases existentes.

---

## Contexto de negocio que debes dar por cierto (no lo cuestiones, no lo redescubras)

- Convision es para **ópticas privadas**. Aun así, **RIPS sí aplica**: la obligación de reportar nace de que la consulta de optometría es un servicio de salud prestado por un proveedor habilitado (REPS), sin importar si el paciente paga de forma privada o vía EPS/ARL. No es opcional ni condicional al modelo de pago.
- La normativa vigente (Resolución 2275/2023) exige el RIPS como **JSON ligado a la Factura Electrónica de Venta (FEV) en salud** — no el formato legado de archivos plano (Resolución 3374/2000). No implementes el formato legado.
- Convision está construyendo su **propio** software de facturación electrónica (`convision-invoicing-api`, microservicio hermano) para no depender de proveedores externos (Siigo, Factus, etc.). El modo de transmisión DIAN objetivo es `direct` (conexión propia a la DIAN), no `factus` (proveedor tercero).

---

## ⚠️ Verificación regulatoria obligatoria antes de construir el JSON de RIPS

El documento de brechas describe la estructura de RIPS que usa Jarvis (`usuarios[]` → `servicios.consultas[]`) como referencia de qué campos existen, **pero Jarvis tiene bugs de cumplimiento documentados**: valores de causa/finalidad de consulta hardcodeados sin importar el motivo real, filtrado de diagnóstico a solo códigos CIE-10 que empiezan por `Z`, y fabricación de edad/nombre/documento del paciente cuando no encajan en el formato esperado. **No copies la implementación de Jarvis tal cual.**

Antes de fijar el esquema JSON definitivo, **investiga de forma independiente la estructura oficial vigente de RIPS** (Resolución 2275/2023 del Ministerio de Salud de Colombia — busca el anexo técnico y/o el esquema JSON oficial publicado, ej. en el portal de MinSalud/SISPRO) usando tus herramientas de búsqueda web. Usa la estructura de Jarvis solo como punto de partida para entender la forma general (usuarios/servicios/consultas), no como fuente de verdad de nombres de campos o códigos válidos.

---

## Alcance del trabajo (en el orden del documento de brechas)

### Fase 1 — Conectar la fórmula clínica real a la venta (P0 crítico, sección 04 y 09 del gap doc)

Hoy `sale/service.go` arma la orden de laboratorio leyendo del modelo `Prescription` viejo (`internal/domain/prescription.go`, tabla `appointment_prescriptions`), que en el flujo activo del especialista normalmente **no se puebla** — porque el especialista usa el formulario nuevo (`ClinicalRecord`/`ClinicalPrescription`, tabla `prescriptions`). Corrige `createLabOrderIfNeeded` (y cualquier punto relacionado) para que lea la fórmula **firmada** desde `ClinicalRecordRepository`/`ClinicalPrescription`, no desde el modelo viejo. Decide (y documenta tu decisión) qué pasa con el modelo viejo: ¿se retira del flujo de venta, se mantiene como fallback, o se elimina? No elimines código sin confirmar primero (con grep exhaustivo) que no tiene otros consumidores activos.

Mientras resuelves esto, decide también qué hacer con los **tres modelos de historia clínica coexistentes** (`ClinicalHistory`/`ClinicalEvolution` legacy MUI, `ClinicalRecord`/`ClinicalPrescription` activo, `Prescription` plano legacy) — como mínimo, asegúrate de que la venta y cualquier endpoint de "historial del paciente" usen consistentemente el modelo activo.

### Fase 2 — Cola de ventas del recepcionista (P0, sección 05)

Agrega un campo `IsBilled *bool` (o similar) a `domain.AppointmentFilter` (`internal/domain/appointment.go`) y úsalo en la query de listado que alimenta la "cola de ventas" del recepcionista, de modo que una cita ya facturada (`Appointment.IsBilled=true`) deje de aparecer como pendiente.

### Fase 3 — Catálogo CIE-10 real (P0, ahora prerrequisito de RIPS — sección 03 y 08)

Crea una tabla/entidad de catálogo CIE-10 real (siguiendo `DATABASE_GUIDE.md`: migración idempotente, índices apropiados) y conecta `Diagnosis.PrimaryCode` a ella (por FK o por validación contra el catálogo, tu criterio según lo que sea menos disruptivo con los datos existentes). Reemplaza el input de texto libre en `DiagnosisTab.tsx` del frontend por un componente de búsqueda (recuerda la regla del proyecto: todo select/combobox de formulario usa `SearchableCombobox`, no el `Select` de shadcn — ver `.cursor/rules/searchable-dropdown.mdc`).

### Fase 4 — Construcción del RIPS (P0, sección 07 — depende de Fases 1 y 3)

Diseña e implementa un nuevo paquete (ej. `internal/rips/`) que arme el JSON de RIPS a partir de: `ClinicalRecord` firmado + `Diagnosis` (contra el catálogo CIE-10 real) + `Patient` (incluyendo `AffiliationType`/`CoverageType`/`HealthInsuranceProvider`, que ya existen y están conectados) + tipo de consulta real (no un valor fijo). Evita explícitamente los antipatrones de Jarvis (ver sección de verificación regulatoria arriba).

**Envío del RIPS — límite realista de esta tarea:** el RIPS debe ir ligado a una Factura Electrónica de Venta real (CUFE + XML firmado), que depende de que `convision-invoicing-api` esté operativo (ver `docs/GAP_ANALYSIS_FACTURACION_JARVIS.md`, P0 #1). Verifica el estado actual de ese microservicio en tu entorno:
- Si está corriendo y emitiendo facturas reales/de prueba localmente, conecta el flujo de RIPS a una factura real generada en tu prueba end-to-end.
- Si no está operativo en tu entorno, **no bloquees el resto del trabajo por eso**: implementa el builder del JSON y un cliente de envío con un modo configurable (`none`/local, análogo a `DIAN_TRANSMISSION_MODE` de `convision-invoicing-api`) que no intente contactar ningún endpoint gubernamental real. **No tienes credenciales reales de gobierno (FEVRIPS APILOCAL/DIAN) — no intentes autenticarte contra un ambiente real de producción o habilitación.** Deja el cliente de transmisión listo para conectarse cuando existan esas credenciales, y pruébalo en modo local/mock.

### Fase 5 (P1, si el tiempo lo permite) — Historial longitudinal e RBAC

- Expón un endpoint de historial de `ClinicalRecord`/`ClinicalPrescription` por paciente (no solo "el último firmado").
- Elimina los chequeos directos de `RoleType == domain.RoleSpecialist` que quedan fuera del sistema de permisos por BD (`handler.go:526`, `auth/service.go:267`, `laboratory/service.go:597` — verifica los números de línea actuales, pueden haber cambiado).

No es necesario llegar a la Fase 5 si las Fases 1-4 consumen todo el tiempo disponible — prioriza en ese orden.

---

## Lo que NO debes hacer

- No implementes el formato RIPS legado (archivos plano, Resolución 3374/2000).
- No intentes desplegar nada, tocar `deploy.sh`, infraestructura AWS, ni credenciales de producción.
- No intentes autenticarte contra endpoints reales del gobierno colombiano (DIAN, FEVRIPS) — no tienes credenciales y no debes inventarlas ni hardcodearlas.
- No elimines modelos/tablas legacy sin confirmar primero (grep exhaustivo) que no tienen otros consumidores.
- No hagas `git push`, no uses `--no-verify`, no fuerces nada — sigue el protocolo de seguridad de git estándar (commits atómicos, cada uno dejando el HEAD compilable).
- No agregues alcance no pedido por el documento de brechas (no es el momento de refactors generales ni features nuevas fuera de esta lista).

---

## Cómo probar — end to end con navegador

El proyecto tiene servidores de desarrollo:
```bash
# Backend (desde convision-api-golang/)
make docker-up   # si Postgres no está corriendo
make dev         # live-reload en :8001

# Frontend (desde convision-front/)
npm run dev      # puerto 4300, proxy /api -> backend
```

Credenciales de prueba (`convision-api-golang/README`/CLAUDE.md): `specialist@convision.com`, `receptionist@convision.com`, `admin@convision.com`, todas con password `password`.

Usa las herramientas de navegador (MCP Playwright conectado a tu sesión — busca las herramientas disponibles si no las ves de entrada) para recorrer, con un paciente de prueba creado por ti:

1. **Recepcionista** crea una cita para el paciente de prueba.
2. **Especialista** toma la cita, diligencia Anamnesis → Examen Visual → Diagnóstico (usando un código CIE-10 real del nuevo catálogo, no texto libre) → Fórmula (`ClinicalPrescription`) → firma.
3. Verifica (vía UI o API) que el registro clínico quedó persistido y firmado correctamente.
4. **Recepcionista** ve la cita en la cola de ventas (debe aparecer, porque aún no está facturada).
5. **Recepcionista** crea la venta incluyendo un lente, asociada a esa cita.
6. **Verifica el punto crítico de la Fase 1**: la orden de laboratorio generada debe llevar los valores de esfera/cilindro/eje/adición que el especialista **realmente firmó** en el paso 2 — no valores vacíos ni de un modelo viejo. Compara explícitamente los valores en ambos lados.
7. Verifica que la cita **ya no aparece** en la cola de ventas del recepcionista (Fase 2).
8. Verifica (vía endpoint admin o inspección de BD) que se generó un registro de RIPS para esa consulta, con datos reales del paciente y del diagnóstico — no valores por defecto ni fabricados.
9. Si implementaste el envío en modo local/mock, confirma que el estado queda reflejado correctamente (ej. "pendiente de envío real" o equivalente), sin errores silenciosos.

Documenta cada paso con capturas o descripciones concretas de lo observado — no reportes "funciona" sin evidencia.

---

## Entregables al terminar

1. Cambios de código (backend + frontend) siguiendo las capas y convenciones de `DEVELOPMENT_GUIDE.md`/`DATABASE_GUIDE.md`, con migraciones nuevas donde aplique.
2. Tests unitarios de los servicios nuevos/modificados (mocks de las interfaces `Repository`, patrón ya usado en el proyecto).
3. `make tidy && make lint && make test && make build` pasando en verde antes de dar por terminada cada fase.
4. Actualiza `docs/GAP_ANALYSIS_HISTORIA_CLINICA_JARVIS.md` marcando qué recomendaciones quedaron resueltas (agrega una sección "Estado de implementación" al final del documento, no reescribas el análisis original).
5. Un resumen final: qué se implementó, qué se probó por navegador con resultado observado, y qué queda abierto (ej. envío real a RIPS/DIAN, que depende de credenciales de gobierno que no tienes).

Usa `TodoWrite` para trackear tu propio progreso a través de las 5 fases — este es un trabajo grande, de varias horas, no una tarea de un solo paso.
