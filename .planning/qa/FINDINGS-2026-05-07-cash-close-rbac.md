---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
started: 2026-05-07T00:00:00Z
updated: 2026-05-07T14:00:00Z
roles_tested: [admin, receptionist, specialist]
scope: "Módulo Cierre de Caja — validación RBAC Phase 19 (API + código frontend)"
---

# QA FINDINGS — Cierre de Caja + RBAC (Phase 19)

## Contexto de la exploración

Phase 19 implementó sistema RBAC. Las rutas de cierre de caja quedaron en `routes.go` (líneas 762-775):

| Endpoint | Permiso requerido |
|---|---|
| GET/POST/PUT/DELETE/submit `/cash-register-closes` | `cash_close:view` OR `cash_close:create` |
| POST `/cash-register-closes/:id/approve` | `cash_close:approve` |
| POST `/cash-register-closes/:id/return` | `cash_close:approve` |
| PUT `/cash-register-closes/:id/admin-actuals` | `cash_close:approve` |
| GET `cash-register-closes-advisors-pending/calendar/consolidated` | `cash_close:view` |

Permisos seed (`000035_seed_rbac_data.up.sql`):
- **Admin**: `cash_close:view`, `cash_close:create`, `cash_close:approve`
- **Specialist**: `cash_close:view`, `cash_close:create`
- **Receptionist**: `cash_close:view`, `cash_close:create`
- **Laboratory**: SIN permisos de cierre de caja

---

## Resumen ejecutivo

- Pantallas/endpoints verificados: 15
- Hallazgos bloqueantes: **0**
- Hallazgos confirmados (menor/sugerencia): **2**
- Sin incidencias: **13 endpoints API**

---

## Hallazgos (FAIL / GAP)

### QA-001
- **Rol**: admin, specialist, receptionist (frontend)
- **Archivo**: `convision-front/src/pages/admin/CashCloseDetail.tsx:36`
- **Severidad**: menor
- **Título**: Botón "Aprobar" gated por `user.role === 'admin'` en lugar de permiso `cash_close:approve`
- **Pasos**:
  1. Abrir `CashCloseDetail.tsx` línea 36: `const isAdmin = user?.role === 'admin'`
  2. Línea 152: `{close.status === 'submitted' && isAdmin && (...)` — el botón Aprobar solo renderiza si `isAdmin`
  3. Si en el futuro se crea un rol personalizado con `cash_close:approve`, el botón NO se mostrará
- **Esperado**: `const canApprove = useHasPermission('cash_close:approve')` y la condición usa `canApprove`
- **Observado**: `const isAdmin = user?.role === 'admin'` — check de rol hard-coded, inconsistente con Phase 19 RBAC
- **Evidencia**: `CashCloseDetail.tsx:36` + `CashCloseDetail.tsx:152`; la API sí hace el check correcto (403 para no-admin que intenta approve)
- **Estado**: resuelto — `canApprove = useHasPermission('cash_close:approve')` reemplaza `isAdmin` en `showAdminReconciliation`, botón Aprobar (header y card), y copy descriptivo. `isAdmin` se retiene solo para lógica de navegación (URL de retorno y label del botón back).
- **Impacto actual**: bajo (solo admin tiene `cash_close:approve` en los roles seed, y solo admin accede a `/admin/cash-closes`); impacto futuro si se crean roles personalizados con `cash_close:approve`

---

### QA-002
- **Rol**: specialist
- **Archivo**: `convision-front/src/App.tsx`
- **Severidad**: menor
- **Título**: Specialist tiene `cash_close:view` y `cash_close:create` en el JWT pero no tiene ruta UI para cierres de caja
- **Pasos**:
  1. Login como specialist — JWT contiene `cash_close:create`, `cash_close:view`
  2. La ruta `/specialist` (App.tsx:690) tiene `allowedRoles=['specialist','admin']`
  3. No existe `/specialist/cash-closes` ni entrada en `specialistNav` (AdminLayout.tsx)
  4. La API acepta POST/GET en `/cash-register-closes` con token de specialist + branch correcto
- **Esperado**: Si el specialist tiene permisos de caja, debería existir UI para usarlos (o los permisos deberían quitarse del seed del specialist)
- **Observado**: Permisos en JWT sin ruta de UI correspondiente; el specialist no puede llegar a `/admin/cash-closes` porque esa ruta requiere `allowedRoles=['admin']`
- **Evidencia**: seed `000035_seed_rbac_data.up.sql:42` asigna `cash_close:view/create` al Especialista; `App.tsx:690` no incluye cash-close en ruta specialist; `specialistNav` en `AdminLayout.tsx:102` no tiene entrada de cierres
- **Estado**: resuelto — Opción B aplicada: eliminadas las entradas `('cash_close','view')` y `('cash_close','create')` del seed de Especialista en `000035_seed_rbac_data.up.sql`. Creada migración `000037_remove_specialist_cash_close_perms.up.sql` para limpiar `role_permissions` en bases de datos ya aplicadas.
- **Opciones de resolución**:
  - a) Añadir `/specialist/cash-closes` y entrada en `specialistNav` (si el spec debe tener cierres)
  - b) Quitar `cash_close:view/create` del seed de Especialista si no es funcionalidad para ese rol

---

## OK (sin incidencias confirmados)

| Endpoint / Verificación | Admin | Receptionist | Specialist | Notas |
|---|---|---|---|---|
| GET /cash-register-closes | ✅ 200 | ✅ 200 | ✅ 200 | Con branch correcto |
| POST /cash-register-closes (crear) | ✅ 422* | ✅ 201 | ✅ 201 | *422=datos mínimos, acceso OK |
| PUT /cash-register-closes/:id | ✅ 200 | ✅ 200 (own) | N/A | |
| POST /cash-register-closes/:id/submit | ✅ 200 | ✅ 200 (own) | N/A | |
| POST /cash-register-closes/:id/approve | ✅ 200 | ❌ 403 ✅ | ❌ 403 ✅ | 403 esperado para no-approve |
| POST /cash-register-closes/:id/return | ✅ 404* | ❌ 403 ✅ | ❌ 403 ✅ | *404=no existe en estado draft |
| PUT /cash-register-closes/:id/admin-actuals | ✅ 422* | ❌ 403 ✅ | ❌ 403 ✅ | *422=validación 10 medios requeridos |
| DELETE /cash-register-closes/:id | N/A | ✅ 404* (cross-branch) | N/A | *404 correcto (sin leak info) |
| GET /cash-register-closes-advisors-pending | ✅ 200 | ✅ 200 | ✅ 200 | Todos con `cash_close:view` |
| GET /cash-register-closes-calendar | ✅ 422* | ✅ 422* | ✅ 422* | *422=falta param; acceso OK |
| GET /cash-register-closes-consolidated | ✅ 200 | ✅ 200 | ✅ 200 | |
| Sin autenticar → 401 | ✅ | — | — | |
| JWT permisos correctos | ✅ | ✅ | ✅ | Todos los permisos esperados en JWT |
| Flujo completo: crear→submit→approve | ✅ Admin aprueba cierre de receptionist | ✅ | — | Cierre #13 creado, submitted, approved |

### Verificaciones adicionales de integridad
- **Branch access control**: funcionando correctamente. Non-admin sin branch asignado → 403 "Sin acceso a esta sede"
- **Owner check service-level**: non-admin solo puede ver/editar sus propios cierres (403 "unauthorized: view cash register close" para cierres ajenos) ✅
- **Unauthenticated → 401**: confirmado ✅
- **Receptionist intenta aprobar cierre ajeno → 403 "forbidden: insufficient permissions"** ✅

---

## Handoff al agente de corrección

Para cerrar QA-001 y QA-002:

```
QA-001 FIX (CashCloseDetail.tsx):
  Reemplazar línea 36:
    const isAdmin = user?.role === 'admin';
  Por:
    const canApprove = useHasPermission('cash_close:approve');
  
  Y las condiciones que usan isAdmin para mostrar el botón Aprobar/sección admin:
    - línea 152: isAdmin → canApprove
    - línea 183: isAdmin para copy en texto → puede quedar o usar canApprove
    - showAdminReconciliation (buscar en el file) → si usa isAdmin, cambiar a canApprove
  
  Import necesario: import { useHasPermission } from '@/hooks/usePermission';

QA-002 FIX: Decisión de producto requerida antes de implementar:
  Opción A — Agregar UI para specialist:
    - Agregar /specialist/cash-closes a App.tsx (similar a /receptionist/cash-closes)
    - Agregar entrada en specialistNav en AdminLayout.tsx
  Opción B — Quitar permiso del seed:
    - Eliminar ('cash_close','view') y ('cash_close','create') del Especialista en 000035_seed_rbac_data.up.sql
    - Crear migración para limpiar role_permissions del role_id=2 en tabla role_permissions
```

Usar regla `convision-qa-fixer` con los IDs QA-001 y QA-002.
