# Mapa para exploración QA (Convision)

Referencia para agentes que navegan la SPA en `http://localhost:4300` con el backend en `http://localhost:8000`.

**GSD:** en Codex/Claude Code con Get Shit Done instalado, puedes invocar el skill **`$gsd-qa-explore`** (workflow `qa-explore.md`) para generar `.planning/qa/FINDINGS-*.md` siguiendo este mapa.

Credenciales: ver [CREDENCIALES_PRUEBA_ROLES.md](./CREDENCIALES_PRUEBA_ROLES.md) (contraseña seed: `password`).

---

## Login

- URL: `/login`
- Campos: correo (`email`) y contraseña (`password`); botón **Ingresar**.
- Tras login, redirección según rol: `admin` → `/admin/dashboard`, `specialist` → `/specialist/dashboard`, `receptionist` → `/receptionist/dashboard`.
- Cualquier otro rol reconocido por API pero no contemplado en front → `/unauthorized` (ver gap abajo).

---

## Roles soportados en el router (front)

| Rol API        | Prefijo rutas   | Notas |
|----------------|-----------------|--------|
| `admin`        | `/admin/...`    | Acceso completo al menú admin. |
| `specialist`   | `/specialist/...` | También puede entrar admin en rutas donde `allowedRoles` incluye admin (p. ej. specialist comparte layout). |
| `receptionist` | `/receptionist/...` | Admin también puede usar estas rutas donde esté permitido. |

**Gap conocido:** el seeder documenta usuario **laboratory** (`hquintero@convision.com`). El front solo redirige `admin` / `specialist` / `receptionist` en login; un rol `laboratory` acabaría en `/unauthorized`. Registrar como hallazgo de producto si aplica.

---

## Navegación lateral (etiquetas en español)

Fuente: `convision-front/src/layouts/AdminLayout.tsx`.

### Admin (`/admin`)

- Dashboard → `/admin/dashboard`
- **CLÍNICA:** Pacientes, Citas
- **COMERCIAL:** Ventas, Cotizaciones, Órdenes de Laboratorio, Órdenes de Arreglo, Descuentos
- **ADMINISTRACIÓN:** Compras, Inventario, Nómina, Gastos, Traslados, Pagos Proveedores, Cierres de Caja, Reportes Diarios
- **GESTIÓN:** Usuarios, Proveedores, Laboratorios

### Recepción (`/receptionist`)

- Dashboard
- **CLÍNICA:** Pacientes, Citas
- **COMERCIAL:** Ventas, Cotizaciones, Órdenes, Descuentos
- **CAJA:** Cierre de Caja, Historial Cierres, Reporte Diario, Historial Reportes

### Especialista (`/specialist`)

- Dashboard
- **CLÍNICA:** Citas

---

## Rutas útiles que no aparecen en el menú lateral

Explorar manualmente (o por URL) además del sidebar:

| Área | Ruta ejemplo | Notas |
|------|----------------|------|
| Admin | `/admin/laboratory-status` | Estado laboratorio; no está en `adminNav`. |
| Admin | `/admin/purchases`, `/admin/purchases/new`, `/admin/purchases/:id`, `.../edit` | Compras detalle/edición. |
| Admin | `/admin/quotes/new`, `/admin/quotes/:id` | Cotizaciones. |
| Admin | `/admin/sales/:id` | Detalle venta. |
| Admin | `/admin/laboratory-orders/new`, `/admin/laboratory-orders/:id` | Órdenes laboratorio. |
| Admin | `/admin/service-orders/new`, `/admin/service-orders/:id`, `.../edit` | Órdenes arreglo. |
| Admin | `/admin/payrolls/new`, `/admin/payrolls/calculate`, `/admin/payrolls/:id` | Nómina. |
| Admin | `/admin/supplier-payments/:id` | Detalle pago proveedor. |
| Admin | `/admin/cash-transfers/new` | Nuevo traslado. |
| Admin | `/admin/appointments/:id` | Detalle cita (comparte vista specialist). |
| Admin | `/admin/prescriptions/create` | Crear prescripción. |
| Admin | `/admin/patients/:patientId/history` | Historia clínica. |
| Recepción | `/receptionist/patients/new` | Nuevo paciente. |
| Recepción | `/receptionist/sales/new`, `/receptionist/sales/catalog`, `/receptionist/sales/:id` | Ventas. |
| Recepción | `/receptionist/quotes/new`, `/receptionist/quotes/:id` | Cotizaciones. |
| Recepción | `/receptionist/appointments/:id` | Detalle cita recepción. |
| Recepción | `/receptionist/cash-close-detail/:id` | Detalle cierre (reutiliza componente admin). |
| Especialista | `/specialist/appointments/:id`, `/specialist/prescriptions/create`, `/specialist/patients/:patientId/history` | Flujo clínico. |
| Global autenticado | `/catalog`, `/profile`, `/settings` | Definidas en `App.tsx` sin prefijo de rol. |

---

## Comprobaciones mínimas sugeridas por iteración

1. **Login** por cada rol (admin, specialist, receptionist).
2. **403 / unauthorized:** intentar abrir URL de otro rol sin permiso (donde el router lo permita) y documentar comportamiento.
3. **Listados:** tabla carga, paginación, filtros si existen, estado vacío.
4. **Acciones destructivas:** no ejecutar en producción; en local preferir “cancelar” en diálogos.
5. **Red y consola:** tras cada pantalla, revisar errores 4xx/5xx y mensajes en consola.
6. **Datos:** si la lista está vacía, marcar “sin datos para validar flujo completo” en lugar de “OK”.

---

## Plantilla de hallazgo (para el agente de corrección)

Copiar por cada ítem:

```text
ID: QA-###
Rol: admin | specialist | receptionist
URL: https://...
Título breve:
Severidad: bloqueante | mayor | menor | sugerencia
Pasos:
1. ...
2. ...
Esperado:
Observado:
Evidencia: (texto error UI / status HTTP / fragmento consola)
Estado: confirmado | hipótesis
```

Archivo de salida recomendado: `docs/QA_HALLAZGOS_<fecha>.md` o `.planning/qa/FINDINGS.md`.
