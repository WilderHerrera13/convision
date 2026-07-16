# Usuarios y credenciales de acceso (Convision)

Tipos de usuario (roles) del sistema y sus credenciales de acceso.

> **Solo para desarrollo y demos locales.** Los usuarios se crean automáticamente cuando el backend Go arranca con `APP_ENV=local` (vía `EnsureLocalDevUsers` en `convision-api-golang/internal/platform/storage/postgres/dev_users.go`). **No usar en producción.**

**Contraseña común para todos los usuarios:** `password`

---

## Usuarios por tipo (rol)

| Tipo de usuario (rol) | Correo                       | Contraseña | Nombre demo       |
|-----------------------|------------------------------|------------|-------------------|
| **Admin**             | `admin@convision.com`        | `password` | Carlos Vargas     |
| **Specialist**        | `specialist@convision.com`   | `password` | Specialist Demo   |
| **Receptionist**      | `receptionist@convision.com` | `password` | Receptionist Demo |
| **Laboratory**        | `laboratory@convision.com`   | `password` | Laboratory Demo   |

---

## Alcance de acceso por rol

| Rol              | Acceso |
|------------------|--------|
| **Admin**        | Sistema completo (configuración, usuarios, sucursales, reportes, inventario, todo el flujo clínico y de ventas). |
| **Specialist**   | Citas, prescripciones e historia clínica. |
| **Receptionist** | Pacientes, ventas, cotizaciones y citas. |
| **Laboratory**   | Órdenes de laboratorio. |

Constantes en código: `domain.RoleAdmin`, `domain.RoleSpecialist`, `domain.RoleReceptionist`, `domain.RoleLaboratory`.

---

## Cómo acceder

### Frontend (app web)

App por defecto: `http://localhost:4300/login` (Vite; puerto en `convision-front/vite.config.ts`).
Inicia sesión con cualquiera de los 4 correos y la contraseña `password`.

### API (JWT)

Backend Go por defecto: `http://localhost:8001`

```bash
curl --location 'http://localhost:8001/api/v1/auth/login' \
  --header 'Content-Type: application/json' \
  --data-raw '{"email":"admin@convision.com","password":"password"}'
```

Cambia el `email` por el del rol que quieras probar.

---

## Solución de problemas

Si el login devuelve `401 Credenciales incorrectas` para los 4 usuarios, el seed local no corrió.
Verifica que `APP_ENV=local` esté seteado y reinicia el API:

```bash
cd convision-api-golang
APP_ENV=local make run
```

`EnsureLocalDevUsers` se ejecuta una vez por arranque y crea los usuarios faltantes.

> Los usuarios del antiguo backend Laravel (`DemoStaffSeeder`: `cvargas@`, `abermudez@`, `storres@`, etc.) **no se cargan** en `convision-api-golang` y su login devuelve `401`.

---

**No uses estas credenciales en producción.** Si agregas usuarios al seed local, actualiza `dev_users.go` y este documento.
