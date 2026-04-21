# QA Hallazgos - Cierre de Caja

**Fecha:** 2026-04-19
**Módulo:** Cierres de Caja
**Roles explorados:** Recepcionista (`receptionist@convision.com`), Admin (`admin@convision.com`)

## Resultados de la Exploración

### Recepcionista
ID: QA-001
Rol: receptionist
URL: `http://localhost:4300/receptionist/cash-close-detail`
Título breve: Proceso de Cierre de Caja y Visualización de Historial
Severidad: sugerencia
Pasos:
1. Iniciar sesión como `receptionist@convision.com`.
2. Navegar a "CAJA" -> "Cierre de Caja".
3. Visualizar opciones de declaración (monedas/billetes y métodos de pago).
4. Navegar a "Historial Cierres".
5. Abrir el detalle de un cierre en estado "Borrador" y otro "Aprobado".
Esperado:
El formulario de cierre debe cargar los componentes de ingreso de dinero y métodos de pago. El historial debe mostrar los cierres previos correctamente. El detalle debe permitir retomar la edición de los borradores.
Observado:
El flujo funciona según lo esperado. Los formularios cargan correctamente, el historial lista cierres pasados con estados "Borrador" y "Aprobado", y la vista de detalle muestra la información precisa.
Evidencia: Subagent navigation snapshots (ej. visualización del resumen de cierre y estado Borrador/Aprobado).
Estado: confirmado

### Admin
ID: QA-002
Rol: admin
URL: `http://localhost:4300/admin/cash-closes`
Título breve: Listado y Revisión de Cierres de Caja
Severidad: sugerencia
Pasos:
1. Iniciar sesión como `admin@convision.com`.
2. Navegar a "ADMINISTRACIÓN" -> "Cierres de Caja".
3. Revisar el listado general y cambiar a la pestaña "Por asesor".
4. Abrir el detalle de un cierre aprobado mediante el icono de "ojo".
Esperado:
El admin debe ver un resumen global de los cierres (Cierres del Período, Pendientes de Revisión, Diferencia Acumulada). Las pestañas "Todos los cierres" y "Por asesor" deben funcionar y mostrar información agregada. El detalle del cierre debe ser accesible.
Observado:
La interfaz carga sin errores. La tabla "EntityTable" muestra cierres ("Receptionist Demo") con estado "Borrador" y "Aprobado". La diferencia marca "Sin cruzar". No se registraron errores de red ni de consola.
Evidencia: ![Admin Listado Cierres](/Users/wilderherrera/.gemini/antigravity/brain/139d3ea3-9571-4890-8a15-1b254ef06c49/.system_generated/click_feedback/click_feedback_1776611171310.png)
Estado: confirmado

### Hallazgo General (Admin / Recepcionista)
ID: QA-003
Rol: admin / receptionist
URL: Vista "Calendario de Cierres — Asesor"
Título breve: Nombre del asesor no se muestra en la vista de Calendario
Severidad: menor
Pasos:
1. Navegar a la vista de "Calendario de Cierres — Asesor" (por ejemplo, al filtrar o ver el historial por asesor).
Esperado:
Debe mostrarse el nombre real del asesor seleccionado junto a sus iniciales en el componente de perfil superior.
Observado:
El componente mostraba "?? Asesor Asesor" porque el chip de perfil usaba el fallback estático 'Asesor' antes de que llegara la respuesta de la API, y las iniciales del avatar retornaban '??' cuando `data` era undefined.
Evidencia: ![Nombre asesor faltante](/Users/wilderherrera/.gemini/antigravity/brain/tempmediaStorage/media__1776611230310.png)
Causa raíz: `CashCloseCalendar.tsx` usaba `advisorName = 'Asesor'` como fallback estático mientras `isLoading=true`, mostrando texto genérico en el chip de perfil durante la carga inicial.
Fix aplicado:
- Archivo: `convision-front/src/pages/admin/CashCloseCalendar.tsx`
- `advisorName` fallback cambiado de `'Asesor'` a `''`.
- Subtítulo de `PageLayout` ahora muestra `'Calendario de Cierres'` (sin guión) hasta que los datos llegan.
- El chip de perfil superior ahora muestra `<Skeleton>` (avatar circular + dos líneas de texto) mientras `isLoading && !data`, evitando el placeholder genérico.
Estado: **resuelto** — Lint ✅ (0 errores en archivo modificado)

### Hallazgo de Navegación (Admin)
ID: QA-004
Rol: admin
URL: `http://localhost:4300/admin/cash-closes` -> Calendario de Cierres
Título breve: Botón "Ojo" no abre el detalle directamente
Severidad: media (UX)
Pasos:
1. Ir a la vista general de "Cierres de Caja" (Todos los cierres).
2. Hacer clic en el icono "Ojo" en la columna de Acciones de un registro "Enviado".
Esperado: 
El sistema debería mostrar inmediatamente el detalle del cierre (mediante modal o enfocando el día exacto en el calendario).
Observado:
El sistema redirige a la vista de "Calendario de Cierres" genérica pero no selecciona automáticamente el día ni abre el detalle, forzando al usuario a buscar la fecha manualmente en el carrusel horizontal inferior.
Estado: por resolver

### Hallazgo Visual / Lógica (Admin)
ID: QA-005
Rol: admin
URL: Vista "Calendario de Cierres — Asesor"
Título breve: Resumen de cierres mezcla datos aprobados y pendientes
Severidad: alta
Pasos:
1. Enviar un nuevo reporte de cierre de caja (Ej. $1.300.000).
2. En la vista del Calendario del Asesor, revisar la tabla superior "Resumen de cierres aprobados".
Esperado: 
El total de la fecha actual debería concordar con el monto ingresado, o indicar claramente que está pendiente sin mezclar registros previos del mismo día si los hay.
Observado:
La tabla mostraba un valor antiguo ($460.000) para el mismo día ("19 abr") a pesar de que el cierre recién enviado pendiente era de $1.300.000. Esto genera inconsistencia y confusión financiera al hacer auditoría.
Estado: por resolver

### Hallazgo de Flujo (Admin)
ID: QA-006
Rol: admin
URL: Vista "Cierres de Caja" (Por asesor)
Título breve: Poca visibilidad de acción "Aprobar"
Severidad: menor
Pasos:
1. Ver el tablero "Por asesor".
2. Identificar el indicador "1 pendiente" y dar clic en "Revisar cierres".
Esperado: 
Dirigirse directamente a una vista de acción para auditar y aprobar el cierre.
Observado:
El usuario es dirigido al calendario mensual general, donde no es obvio dónde debe hacer clic para efectuar la revisión y aprobación. Falta un llamado a la acción (CTA) más fuerte.
Estado: por resolver

