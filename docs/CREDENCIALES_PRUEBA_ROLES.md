# Credenciales de prueba por rol (Convision)

Solo para **desarrollo y demos locales**. Los usuarios se crean automáticamente cuando el backend Go arranca con `APP_ENV=local` (vía `EnsureLocalDevUsers` en `convision-api-golang/internal/platform/storage/postgres/dev_users.go`).

> **Backend activo:** `convision-api-golang` (Go 1.22). El backend Laravel `convision-api/` está en proceso de retiro y sus seeders extra (`DemoStaffSeeder`, etc.) **ya no están disponibles** en el backend Go.

**Contraseña común:** `password`

---

## Usuarios disponibles en el backend Go

| Rol             | Correo                      | Contraseña | Nombre demo            |
|-----------------|-----------------------------|------------|------------------------|
| **admin**       | `admin@convision.com`       | `password` | Carlos Vargas          |
| **specialist**  | `specialist@convision.com`  | `password` | Specialist Demo        |
| **receptionist**| `receptionist@convision.com`| `password` | Receptionist Demo      |
| **laboratory**  | `laboratory@convision.com`  | `password` | Laboratory Demo        |

> Los usuarios extra del antiguo `DemoStaffSeeder` (`cvargas@`, `abermudez@`, `storres@`, `dmontoya@`, `vcastillo@`, `jnieto@`, `hquintero@`) **no se cargan** en `convision-api-golang` y el login con esos correos devuelve `401 Credenciales incorrectas`.

---

## Login API devuelve 401

Si los 4 usuarios genéricos también devuelven 401, el seed local no corrió. Comprueba que `APP_ENV=local` esté seteado y reinicia el API:

```bash
cd convision-api-golang
APP_ENV=local make run
```

`EnsureLocalDevUsers` se ejecuta una vez por arranque y crea los usuarios faltantes.

---

## Login API (JWT)

Backend Go por defecto: `http://localhost:8001`

```bash
curl --location 'http://localhost:8001/api/v1/auth/login' \
  --header 'Content-Type: application/json' \
  --data-raw '{"email":"admin@convision.com","password":"password"}'
```

---

## Frontend

App por defecto: `http://localhost:4300/login` (Vite; puerto en `convision-front/vite.config.ts`) — inicia sesión con cualquiera de los 4 correos y `password`.

---

**No uses estas credenciales en producción.** Si agregas usuarios al seed local, actualiza `dev_users.go` y este documento.
