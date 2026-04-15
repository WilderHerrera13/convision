# Credenciales de prueba por rol (Convision)

Solo para **desarrollo y demos locales**. Los usuarios se crean con `php artisan migrate --seed` (o `migrate:fresh --seed`) en `convision-api/`.

**Contraseña común en seeders:** `password`

---

## Usuarios genéricos por rol

| Rol (API)     | Correo                     | Contraseña | Notas                          |
|---------------|----------------------------|------------|--------------------------------|
| **admin**     | `admin@convision.com`      | `password` | `UsersTableSeeder`             |
| **specialist**| `specialist@convision.com` | `password` | `UsersTableSeeder`             |
| **receptionist** | `receptionist@convision.com` | `password` | `UsersTableSeeder`          |

---

## Personal demo (`DemoStaffSeeder`)

Misma contraseña: **`password`**

| Rol            | Correo                    | Nombre (referencia)        |
|----------------|---------------------------|----------------------------|
| **admin**      | `cvargas@convision.com`   | Claudia Patricia Vargas    |
| **specialist** | `abermudez@convision.com` | Andrés Felipe Bermúdez     |
| **specialist** | `storres@convision.com`   | Sandra Milena Torres       |
| **specialist** | `dmontoya@convision.com`  | Diego Alejandro Montoya    |
| **receptionist** | `vcastillo@convision.com` | Valentina Castillo       |
| **receptionist** | `jnieto@convision.com`  | Julián Camilo Nieto        |
| **laboratory** | `hquintero@convision.com` | Hernán Darío Quintero      |

---

## Login API devuelve 401 con estas credenciales

Suele indicar que **no hay filas en `users`** (por ejemplo `php artisan migrate` sin `--seed`). En `convision-api/`:

```bash
php artisan convision:ensure-dev-users
```

(o `php artisan db:seed --class=Database\\Seeders\\UsersTableSeeder`).

---

## Login API (JWT)

Backend por defecto: `http://localhost:8000`

```bash
curl --location 'http://localhost:8000/api/v1/auth/login' \
  --header 'Content-Type: application/json' \
  --data-raw '{"email":"admin@convision.com","password":"password"}'
```

---

## Frontend

App por defecto: `http://localhost:4300/login` (Vite; puerto en `convision-front/vite.config.ts`) — inicia sesión con cualquier correo de las tablas y `password`.

---

**No uses estas credenciales en producción.** Si cambias los seeders, actualiza este documento.
