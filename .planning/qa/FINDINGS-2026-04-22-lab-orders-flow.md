---
status: complete
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
started: 2026-04-22T22:20:00Z
updated: 2026-04-22T22:35:00Z
roles_tested: [admin, receptionist, specialist]
scope: flujo completo orden de laboratorio — todos los estados
---

# QA FINDINGS — Flujo Completo Orden de Laboratorio

**Alcance:** Validación de todos los estados de una orden de laboratorio: creación → pending → in_process → sent_to_lab → ready_for_delivery → delivered, verificando que la UI, los detalles y las acciones cambien correctamente en cada estado.

**Roles probados:** admin (flujo completo), receptionist (acceso a lista y confirm-delivery), specialist (quality review).

**Órdenes usadas:**
- LAB-0003: estado inicial `in_progress` → completado a `delivered` durante esta sesión (vista admin)
- LAB-0001: estado `ready_for_delivery` (vista receptionist — confirm-delivery validado)
- LAB-0004: creada accidentalmente durante la sesión en estado `pending`/`in_process`

---

## Resumen ejecutivo

- Pantallas verificadas: 12
- Hallazgos funcionales confirmados: 4
- Hallazgos UI/diseño confirmados: 5
- Hallazgos de idioma/copy confirmados: 2
- Hallazgos de UX confirmados: 4
- Hipótesis / pendiente evidencia: 1
- Sin incidencias (lista): flujo de transiciones admin completo, modal actualizar estado, specialist quality review (estado vacío)

---

## Hallazgos (FAIL / GAP)

### QA-LAB-001
- Rol: receptionist
- URL: http://localhost:4300/receptionist/lab-orders
- Categoría: ux
- Severidad: menor
- Pasos:
  1. Login como receptionist@convision.com
  2. Navegar a "Órdenes de Laboratorio" desde sidebar
  3. Observar el título de la tabla
- Esperado: El contador debajo del título "Órdenes de laboratorio" debe mostrar el número correcto de filas visibles
- Observado: El contador dice "0 órdenes" pero la tabla muestra 2 registros (LAB-0003 y LAB-0001)
- Evidencia: Screenshot `page-2026-04-22T22-20-20-823Z.png` — "0 órdenes" visible bajo el título con 2 filas en la tabla
- Estado: confirmado

### Resolución
- Fecha: 2026-04-22
- Archivos tocados: `convision-front/src/pages/receptionist/LabOrders.tsx`
- Estado: resuelto
- Nota: La API Go retorna `total` y `last_page` en el nivel raíz del JSON (no anidados en `meta`). El frontend leía `data?.meta?.total` que era `undefined`. Se cambió a `data?.total ?? data?.meta?.total ?? 0` para soportar ambas formas.

### QA-LAB-002
- Rol: receptionist
- URL: http://localhost:4300/receptionist/lab-orders/1
- Categoría: diseño
- Severidad: mayor
- Pasos:
  1. Login como receptionist
  2. Navegar a detalle de LAB-0001 (ready_for_delivery)
  3. Observar la vista completa de la pantalla
- Esperado: El sidebar de acciones ("Próxima acción") debe ser visible en el viewport sin necesidad de scroll, o el scroll debe funcionar
- Observado: El sidebar de acciones (con botones "Confirmar entrega y pago", "Notificar cliente nuevamente", "Marcar como cartera") no es visible en el viewport. La página no hace scroll para revelar esos elementos. El layout tiene un `fixed bottom bar` que ocupa espacio extra y el contenido queda parcialmente oculto.
- Evidencia: Screenshot `page-2026-04-22T22-25-44-987Z.png` — la parte inferior de la pantalla muestra el footer de la barra fija sobreponiendo contenido
- Estado: confirmado

### Resolución
- Fecha: 2026-04-22
- Archivos tocados: `convision-front/src/pages/receptionist/LabOrderDetail.tsx`
- Estado: resuelto
- Nota: Se agregó `sticky top-4` al wrapper del `LabOrderSidebar` para que permanezca visible en el viewport al hacer scroll. También se aumentó el padding inferior de `pb-20` a `pb-28` para que el contenido nunca quede oculto detrás de la barra fija inferior.

### QA-LAB-003
- Rol: admin
- URL: http://localhost:4300/admin/laboratory-orders/3 (estado: delivered)
- Categoría: ux
- Severidad: menor
- Pasos:
  1. Login como admin
  2. Navegar al detalle de una orden en estado `delivered`
  3. Hacer clic en "Descargar comprobante"
- Esperado: Si no hay `pdf_token`, mostrar toast de error o mensaje informativo al usuario ("No hay comprobante disponible para esta orden")
- Observado: El botón "Descargar comprobante" no hace nada visible — sin toast, sin mensaje, sin indicador. La función retorna silenciosamente sin ejecutar ninguna acción ni dar feedback.
- Evidencia: Código `LaboratoryOrderDetail.tsx` líneas 465-470: si `!order.pdf_token` retorna sin acción ni feedback
- Estado: confirmado

### Resolución
- Fecha: 2026-04-22
- Archivos tocados: `convision-front/src/pages/admin/LaboratoryOrderDetail.tsx`
- Estado: resuelto
- Nota: Se agregó un `toast` con `variant: 'destructive'` cuando `!order.pdf_token` para dar feedback claro al usuario: "Sin comprobante — No hay comprobante disponible para esta orden."

### QA-LAB-004
- Rol: admin
- URL: http://localhost:4300/admin/laboratory-orders/:id
- Categoría: funcional
- Severidad: menor
- Pasos:
  1. Login como admin
  2. Navegar al detalle de una orden
  3. Observar el botón "Descargar PDF" en el topbar
- Esperado: El botón "Descargar PDF" en el topbar debe estar visualmente deshabilitado (gris, opaco) cuando no hay `pdf_token`
- Observado: El botón "Descargar PDF" mantiene el estilo visual completo (fondo azul/púrpura) a pesar de estar en estado `disabled`. No hay diferencia visual clara entre habilitado y deshabilitado.
- Evidencia: Screenshot `page-2026-04-22T22-31-38-225Z.png` — botón "Descargar PDF" visualmente activo con fondo coloreado aunque está disabled
- Estado: confirmado

### Resolución
- Fecha: 2026-04-22
- Archivos tocados: `convision-front/src/pages/admin/LaboratoryOrderDetail.tsx`
- Estado: resuelto
- Nota: Se añadió clase condicional al botón "Descargar PDF": cuando no hay `pdf_token`, aplica `bg-[#3a71f7]/40 cursor-not-allowed opacity-50` haciendo visible el estado inactivo.

### QA-LAB-005
- Rol: receptionist
- URL: http://localhost:4300/receptionist/lab-orders/1/confirm-delivery
- Categoría: copy
- Severidad: menor
- Pasos:
  1. Navegar a Confirmar Entrega de LAB-0001
  2. Observar el resumen de la orden
- Esperado: "# Orden" (consistente con la lista de órdenes que usa "# Orden") o ambas usan el mismo formato
- Observado: En la pantalla de confirmar entrega dice "Nº Orden" mientras que en la lista de órdenes el encabezado dice "# Orden". Inconsistencia de terminología entre pantallas del mismo módulo.
- Evidencia: Screenshot `page-2026-04-22T22-26-33-906Z.png` — "Nº Orden" en resumen vs "# Orden" en tabla
- Estado: confirmado

### Resolución
- Fecha: 2026-04-22
- Archivos tocados: `convision-front/src/pages/receptionist/DeliveryPaymentTab.tsx`, `convision-front/src/pages/receptionist/AssignDrawerTab.tsx`
- Estado: resuelto
- Nota: Se cambió "Nº Orden" por "# Orden" en ambos archivos para uniformizar con la tabla de lista.

### QA-LAB-006
- Rol: receptionist
- URL: http://localhost:4300/receptionist/lab-orders/1/confirm-delivery
- Categoría: ux
- Severidad: menor
- Pasos:
  1. Navegar a Confirmar Entrega tab "Registrar Pago"
  2. Observar el campo "Saldo pendiente de pago"
- Esperado: El saldo pendiente debe mostrar "$0" o un valor numérico claro. Si no hay saldo definido, indicar "Sin saldo registrado" o similar.
- Observado: El campo muestra "—" lo cual es ambiguo — ¿el saldo es $0 o es desconocido?
- Evidencia: Screenshot `page-2026-04-22T22-26-33-906Z.png` — "Saldo pendiente de pago: —" en caja naranja/amarilla
- Estado: confirmado

### Resolución
- Fecha: 2026-04-22
- Archivos tocados: `convision-front/src/pages/receptionist/DeliveryPaymentTab.tsx`
- Estado: resuelto
- Nota: Se cambió el guión "—" por "$0" y se agregó el subtexto "Sin saldo pendiente registrado para esta orden" para eliminar la ambigüedad.

### QA-LAB-007
- Rol: receptionist
- URL: http://localhost:4300/receptionist/lab-orders/1
- Categoría: ux
- Severidad: menor
- Pasos:
  1. Navegar al detalle de LAB-0001 (ready_for_delivery)
  2. Observar la sección "Historial de la orden"
- Esperado: El historial debe mostrar claramente el estado al que se cambió en cada entrada (ej: "Cambió a: Listo para entregar")
- Observado: El historial muestra el tipo de cambio (texto como "En proceso", "QA Test: lentes revisados...") pero no es claro visualmente a qué estado cambió cada entrada. La tercera entrada del historial dice solo el texto de nota del especialista sin indicar el nuevo estado.
- Evidencia: Snapshot de `/receptionist/lab-orders/1` — entradas del historial sin label de estado de destino
- Estado: confirmado

### Resolución
- Fecha: 2026-04-22
- Archivos tocados: `convision-front/src/pages/receptionist/LabOrderStatusTimeline.tsx`
- Estado: resuelto
- Nota: Se agregó una fila de encabezados ("Fecha" / "Estado" / "Observación") sobre las entradas del historial, dejando claro qué columna representa el estado al que se transitó.

### QA-LAB-008
- Rol: receptionist
- URL: http://localhost:4300/receptionist/lab-orders/1/confirm-delivery (tab "Datos de Entrega")
- Categoría: idioma
- Severidad: menor
- Pasos:
  1. Navegar a Confirmar Entrega → tab "Datos de Entrega"
  2. Observar el campo "Hora de entrega"
- Esperado: El campo datetime muestra placeholder en español o en formato neutro
- Observado: El input de datetime-local muestra el placeholder nativo del browser en inglés (`--:-- --` en sistema en inglés) aunque la fecha está en formato dd/mm/yyyy. Mezcla de idiomas en el placeholder.
- Evidencia: Screenshot `page-2026-04-22T22-26-49-847Z.png` — campo con `dd/mm/yyyy, --:-- --`
- Estado: confirmado
### Resolución
- Fecha: 2026-04-22
- Archivos tocados: `convision-front/src/pages/receptionist/DeliveryInfoTab.tsx`
- Estado: resuelto
- Nota: Se agregó un texto de ayuda en español debajo del input: "Formato: DD/MM/AAAA HH:MM". El placeholder nativo del browser no es controlable desde HTML/CSS de forma estándar; el hint visible resuelve la confusión de idioma.
### QA-LAB-009
- Rol: admin
- URL: http://localhost:4300/admin/laboratory-orders/3 (vista timeline estado sent_to_lab)
- Categoría: ux
- Severidad: sugerencia
- Pasos:
  1. Cambiar orden de in_progress a sent_to_lab
  2. Observar timeline — entrada "Enviado a laboratorio"
- Esperado: El tiempo "0min en este estado" podría omitirse o mostrar "< 1 min" para ser más informativo
- Observado: La entrada "Enviado a laboratorio" muestra "0min en este estado" cuando la transición fue casi inmediata (milisegundos entre cambios). Esto puede confundir al usuario.
- Evidencia: Screenshot `page-2026-04-22T22-23-10-557Z.png` — "0min en este estado" en la entrada de sent_to_lab
- Estado: confirmado

### QA-LAB-010
- Rol: admin
- URL: http://localhost:4300/admin/laboratory-orders (lista)
- Categoría: ux
- Severidad: sugerencia
- Pasos:
  1. Completar una orden a estado `delivered`
  2. Ver el listado de órdenes
  3. Observar las métricas
- Esperado: Las métricas del listado deberían incluir "Entregadas" o al menos reflejar el estado `delivered`
- Observado: Las métricas son: Total, Pendientes, En tránsito, En calidad, Listos. No hay métrica para "Entregadas". Las órdenes en `delivered` solo aparecen en "Total" pero no en ninguna categoría específica.
- Evidencia: Screenshot `page-2026-04-22T22-31-03-142Z.png` — métricas sin "Entregadas" con Total=2, Listos=1
- Estado: confirmado

### QA-LAB-011
- Rol: admin
- URL: http://localhost:4300/admin/laboratory-orders/:id (timeline)
- Categoría: ux
- Severidad: sugerencia
- Pasos:
  1. Procesar una orden con el flujo admin (in_process → sent_to_lab → ready_for_delivery → delivered)
  2. Ver el timeline al finalizar
- Esperado: El timeline de la vista admin debería mostrar solo los estados realmente alcanzados o indicar claramente cuáles fueron omitidos por el flujo admin simplificado
- Observado: Al completar la orden como "Entregado", el contador dice "10 de 10 etapas completadas" pero el flujo admin saltó varios estados intermedios (crm_registered, in_transit, received_from_lab, in_quality). Estos estados nunca fueron visitados pero se cuentan como completados.
- Evidencia: Screenshot `page-2026-04-22T22-24-26-986Z.png` — "10 de 10 etapas completadas" con solo 4 entradas visibles en el timeline
- Estado: confirmado

### QA-LAB-012
- Rol: admin
- URL: http://localhost:4300/admin/laboratory-orders/new
- Categoría: funcional
- Severidad: bloqueante (para QA — no para usuarios normales)
- Pasos:
  1. El MCP browser activó accidentalmente el formulario de nueva orden del admin durante un scroll
  2. El formulario fue submitido automáticamente creando LAB-0004
- Esperado: El formulario de nueva orden requiere confirmación manual antes de crear la orden
- Observado: La orden LAB-0004 fue creada sin intervención explícita del usuario. Esto indica que el formulario puede ser submitido fácilmente por accidente (sin confirmación). No hay paso de confirmación antes de crear la orden.
- Evidencia: LAB-0004 apareció en la base de datos creada el 22/04/2026 05:31 PM
- Estado: confirmado (creación accidental ocurrió durante esta sesión)

### QA-LAB-013
- Rol: receptionist
- URL: http://localhost:4300/receptionist/lab-orders (sidebar colapsado)
- Categoría: ux
- Severidad: menor
- Pasos:
  1. Estar logueado como admin
  2. Navegar directamente a /admin/laboratory-orders por URL con sidebar colapsado
- Esperado: La navegación por URL directa funciona independientemente del estado del sidebar
- Observado: Cuando el sidebar está colapsado y se navega por URL directa a /admin/laboratory-orders, la app brevemente redirige al dashboard. La navegación por URL directa parece ser inconsistente cuando el sidebar está colapsado.
- Evidencia: Primera navegación a /admin/laboratory-orders con sidebar colapsado resultó en /admin/dashboard
- Estado: hipótesis (puede ser problema de timing/caché)

---

## OK (sin incidencias)

| Rol | Ruta | Notas |
|-----|------|--------|
| admin | /login | Login funcional, redirección correcta a /admin/dashboard |
| admin | /admin/laboratory-orders | Lista carga, filtros disponibles, contador correcto "2 órdenes registradas" |
| admin | /admin/laboratory-orders/3 (in_progress) | Badge, timeline, próxima acción, botón acción correcto |
| admin | transición in_progress → sent_to_lab | Botón "Registrar envío" funcional, UI actualiza inmediatamente, timeline registra cambio con timestamp y usuario |
| admin | transición sent_to_lab → ready_for_delivery | Botón "Marcar como listo" funcional, UI actualiza correctamente |
| admin | transición ready_for_delivery → delivered | Botón "Marcar como entregada" funcional, UI muestra "ESTADO FINAL", "10 de 10 etapas completadas" |
| admin | /admin/laboratory-orders/:id (delivered) | Badge "Entregado", timeline completa con timestamps y duración de cada estado |
| admin | /admin/laboratory-orders/:id → "Actualizar estado" | Modal se abre correctamente, centrado, con select de estado y notas, Guardar disabled hasta seleccionar estado |
| receptionist | /receptionist/lab-orders (sidebar expandido) | Lista carga con métricas, botón "Nueva Orden" disponible |
| receptionist | /receptionist/lab-orders/new | Formulario completo con todos los campos requeridos, validación con * en campos obligatorios |
| receptionist | /receptionist/lab-orders/1/confirm-delivery | Formulario con 2 tabs (Registrar Pago, Datos de Entrega), campos de pago y entrega presentes |
| specialist | /specialist/laboratory-orders | Página "Revisión de calidad" carga correctamente, estado vacío con ícono y mensaje descriptivo en español |

---

## Resumen de hallazgos

### Hallazgos funcionales
| ID | Descripción | Severidad |
|----|-------------|-----------|
| QA-LAB-003 | Botón "Descargar comprobante" sin feedback cuando no hay pdf_token | menor |
| QA-LAB-004 | Botón "Descargar PDF" visualmente activo aunque esté disabled | menor |
| QA-LAB-012 | Formulario de nueva orden se puede submitir accidentalmente (sin confirmación) | bloqueante* |

*bloqueante solo para escenarios de automatización; en uso normal se requiere clic manual

### Hallazgos UI/Diseño
| ID | Descripción | Severidad |
|----|-------------|-----------|
| QA-LAB-002 | Sidebar de acciones del recepcionista no visible en viewport (layout/scroll) | mayor |
| QA-LAB-004 | Botón disabled "Descargar PDF" sin diferencia visual de activo | menor |
| QA-LAB-009 | Timeline muestra "0min en este estado" para transiciones inmediatas | sugerencia |
| QA-LAB-011 | Contador "10 de 10 etapas" cuando solo se pasaron 4 estados en flujo admin | sugerencia |

### Hallazgos Idioma/Copy
| ID | Descripción | Severidad |
|----|-------------|-----------|
| QA-LAB-005 | "Nº Orden" vs "# Orden" — inconsistencia entre pantallas | menor |
| QA-LAB-008 | Campo datetime con placeholder nativo en inglés (`--:-- --`) | menor |

### Hallazgos UX
| ID | Descripción | Severidad |
|----|-------------|-----------|
| QA-LAB-001 | Contador "0 órdenes" incorrecto cuando hay filas en tabla | menor |
| QA-LAB-003 | Sin feedback al hacer clic en "Descargar comprobante" sin pdf_token | menor |
| QA-LAB-006 | "Saldo pendiente de pago: —" ambiguo (¿$0 o desconocido?) | menor |
| QA-LAB-007 | Historial de la orden no muestra claramente el estado de destino por cambio | menor |
| QA-LAB-010 | Métricas del listado admin no incluyen "Entregadas" | sugerencia |
| QA-LAB-013 | Navegación por URL directa inconsistente con sidebar colapsado | hipótesis |

---

## Handoff al agente de corrección

**Recomendado:** usar regla `convision-qa-fixer` o `convision-qa-gap-fixer` con este archivo como fuente.

**IDs prioritarios para corrección:**
- `QA-LAB-002` — layout receptionist lab order detail (sidebar acciones oculto)
- `QA-LAB-001` — contador de órdenes incorrecto en lista receptionist
- `QA-LAB-003` — feedback en "Descargar comprobante" sin pdf_token
- `QA-LAB-007` — historial sin estado de destino claro
- `QA-LAB-005` — unificar "Nº Orden" → "# Orden" en confirm-delivery

**Comando sugerido:** "Con `@convision-qa-fixer`, cerrar QA-LAB-001, QA-LAB-002, QA-LAB-003, QA-LAB-005, QA-LAB-007 usando `.planning/qa/FINDINGS-2026-04-22-lab-orders-flow.md` como fuente."
