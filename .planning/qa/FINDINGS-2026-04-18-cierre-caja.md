---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
started: 2026-04-18T00:00:00Z
updated: 2026-04-18T20:25:00Z
roles_tested: [admin, specialist, receptionist]
scope: "Flujo de cierre de caja"
---

## Resumen ejecutivo

- Pantallas verificadas: 6
- Hallazgos confirmados: 3
- Hipotesis / pendiente evidencia: 0
- Sin incidencias (lista): dashboards por rol y control de acceso specialist -> cierre de caja

## Hallazgos (FAIL / GAP)

### QA-001
- Rol: admin
- URL: http://localhost:4300/admin/cash-closes
- Severidad: bloqueante
- Pasos: 1. Iniciar sesion como admin. 2. Ir a Cierres de Caja en el sidebar de Administracion. 3. Esperar carga del listado.
- Esperado: El listado debe cargar datos, o estado vacio funcional, usando un endpoint existente en backend Go.
- Observado: La vista muestra estructura de tabla en estado de carga y la peticion principal falla con 404 repetido.
- Evidencia: Network `GET /api/v1/cash-register-closes?page=1&per_page=10 => 404 Not Found` (4 veces); consola del navegador registra el mismo 404.
- Estado: **resuelto** — 2026-04-18: Implementado `GET /api/v1/cash-register-closes` en Go con repositorio, servicio y handler. Respuesta 200 con paginación `{current_page, last_page, total, data, meta}` confirmada.

### QA-002
- Rol: receptionist
- URL: http://localhost:4300/receptionist/cash-close-history
- Severidad: mayor
- Pasos: 1. Iniciar sesion como receptionist. 2. Ir a Historial Cierres en seccion Caja. 3. Esperar carga de la grilla.
- Esperado: Historial con registros o estado vacio coherente, sin errores HTTP.
- Observado: El historial queda en estado de carga y vuelve a pegar al mismo endpoint inexistente en Go.
- Evidencia: Network `GET /api/v1/cash-register-closes?page=1&per_page=10 => 404 Not Found` y `GET /api/v1/cash-register-closes?close_date=2026-04-18 => 404 Not Found`.
- Estado: **resuelto** — 2026-04-18: Mismo endpoint resuelto en QA-001. El receptor ve solo sus propios cierres (filtra por user_id en service). Filtros `date_from`, `date_to`, `close_date`, `status` y `user_id` validados con HTTP 200.

### QA-003
- Rol: specialist
- URL: http://localhost:4300/login
- Severidad: menor
- Pasos: 1. Ir a login. 2. Ingresar specialist@convision.com / password. 3. Enviar formulario.
- Esperado: Login exitoso con usuario generico documentado en credenciales de prueba.
- Observado: La UI devuelve alerta "Credenciales incorrectas" para el usuario generico; con usuario demo (abermudez@convision.com) si permite ingreso.
- Evidencia: Mensaje UI "Credenciales incorrectas" tras POST de login con specialist generico.
- Estado: **resuelto** — 2026-04-18: Creada funcion `EnsureLocalDevUsers` en `internal/platform/storage/postgres/dev_users.go` que siembra `specialist@convision.com / password` (rol specialist) al arrancar con `APP_ENV=local`. Login confirmado con HTTP 200 y token válido.

## OK (sin incidencias)

| Rol | Ruta | Notas |
|-----|------|-------|
| admin | /admin/dashboard | Login exitoso y dashboard renderizado correctamente |
| receptionist | /receptionist/dashboard | Login exitoso (usuario demo) y dashboard estable |
| receptionist | /receptionist/cash-closes | Formulario de cierre renderiza campos y acciones |
| specialist | /specialist/dashboard | Login exitoso (usuario demo) y sidebar acorde al rol |
| specialist | /receptionist/cash-closes | Redirige a /unauthorized (403) como control de acceso correcto |

## Handoff al agente de correccion

- Recomendado: convision-qa-fixer para cerrar QA-001 y QA-002 (alinear endpoints cash close del front con backend Go).
- Validar si QA-003 se resuelve agregando usuario specialist generico en seed de Go o actualizando documentacion de credenciales canonicas para Go.
