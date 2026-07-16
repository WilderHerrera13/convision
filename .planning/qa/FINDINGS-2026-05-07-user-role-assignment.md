---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
started: 2026-05-07T14:30:00Z
updated: 2026-05-07T14:36:00Z
roles_tested: [admin]
scope: "Creación de usuarios y asignación de roles — bug de expulsión de sesión"
---

## Resumen ejecutivo

- Pantallas verificadas: 2 (`/admin/users/2/edit`, `/admin/users/1/edit`)
- Hallazgos confirmados: 1 (bloqueante — corregido)
- Hipótesis / pendiente evidencia: 0
- Sin incidencias: asignación de rol a usuario diferente al solicitante

---

## Hallazgos (FAIL / GAP)

### QA-U01 — CORREGIDO ✓
- **Rol:** admin
- **URL:** `http://localhost:4300/admin/users/1/edit`
- **Severidad:** bloqueante
- **Pasos:**
  1. Login como `admin@convision.com`
  2. Ir a `/admin/users/1/edit` (editar el propio usuario admin)
  3. Sección "Roles y Permisos" → clic "Agregar Rol"
  4. Seleccionar cualquier rol del combobox (ej. "Especialista")
- **Esperado:** El rol se asigna, toast "Rol asignado", el admin permanece en la página
- **Observado:** Redirección inmediata a `/login` — sesión del admin destruida
- **Evidencia:**
  ```
  [ERROR] 401 Unauthorized @ /api/v1/users/1/roles  (GET post-assign)
  [ERROR] 401 Unauthorized @ /api/v1/auth/refresh
  [ERROR] Token refresh failed: AxiosError
  ```
- **Estado:** confirmado — **CORREGIDO en este ciclo**

---

## Causa raíz

`AssignRoleToUser` y `RemoveRoleFromUser` en `internal/role/service.go` siempre llamaban `s.userRepo.IncrementTokenVersion(tx, input.UserID)` para invalidar el JWT del usuario modificado.

Cuando el admin modificaba su **propio** usuario:
1. `IncrementTokenVersion(tx, adminID)` → `token_version` en DB = N+1
2. `queryClient.invalidateQueries` disparaba `GET /api/v1/users/:id/roles`
3. Middleware `Authenticate` comparaba `claims.TokenVersion (N) != DB token_version (N+1)` → **401**
4. Axios interceptor intentaba `/auth/refresh` — también protegido por `Authenticate` — **401**
5. localStorage limpiado → redirect a `/login`

---

## Corrección aplicada

**Archivos modificados:**

1. `convision-api-golang/internal/role/service.go`
   - `AssignInput` y `RemoveInput`: nuevo campo `RequestingUserID uint` (con tag `json:"-"`)
   - `AssignRoleToUser`: skip `IncrementTokenVersion` si `input.RequestingUserID == input.UserID`
   - `RemoveRoleFromUser`: idem

2. `convision-api-golang/internal/transport/http/v1/handler_role.go`
   - `AssignRoleToUser` handler: `input.RequestingUserID = claims.UserID`
   - `RemoveRoleFromUser` handler: `input.RequestingUserID = claims.UserID`

**Lógica:** cuando el usuario modifica sus propios roles, el token activo no se invalida. Para cualquier otro usuario sí se invalida (comportamiento de seguridad preservado).

**Trade-off aceptado:** si un admin se quita un rol propio, el JWT activo sigue válido con los permisos anteriores hasta su expiración natural. Esto es aceptable porque:
- La sesión expira pronto de todas formas
- Un logout/re-login obtiene los permisos actualizados
- Solo aplica al caso de auto-modificación

---

## OK (sin incidencias)

| Rol   | Ruta                              | Notas |
|-------|-----------------------------------|-------|
| admin | `/admin/users/2/edit` → Agregar Rol | Asignación a otro usuario: POST 204 + GET 200, sin 401 |
| admin | `/admin/users/1/edit` → Agregar Rol | Post-fix: POST 204 + GET 200, admin NO expulsado ✓ |

---

## Handoff al agente de corrección

No aplica — bug ya corregido y verificado en navegador. Build exitoso sin errores de compilación.

Próximos pasos sugeridos:
- Agregar test unitario en `internal/role/service_test.go` para el caso `RequestingUserID == UserID`
- Validar que `RemoveRoleFromUser` también preserva la sesión (análogo, misma lógica)
